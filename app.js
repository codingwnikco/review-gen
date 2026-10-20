/**
 * Google Review Link Generator
 * Transforms Google Maps URLs (maps.app.goo.gl, hex pairs, Place IDs)
 * into direct 5-star write review links: https://search.google.com/local/writereview?placeid=...
 */

document.addEventListener('DOMContentLoaded', () => {
  initServiceWorker();
  initReviewLinkGenerator();
});

function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

function initReviewLinkGenerator() {
  const form = document.getElementById('reviewLinkForm');
  const input = document.getElementById('mapsInput');
  const clearBtn = document.getElementById('clearBtn');
  const pasteBtn = document.getElementById('pasteBtn');
  const generateBtn = document.getElementById('generateReviewBtn');
  const btnText = document.getElementById('btnText');
  const btnLoader = document.getElementById('btnLoader');
  const resultBox = document.getElementById('generatorResultBox');
  const finalLinkInput = document.getElementById('finalGeneratedLink');
  const copyBtn = document.getElementById('copyResultBtn');
  const copyText = document.getElementById('copyBtnText');
  const testLinkAnchor = document.getElementById('testLinkAnchor');
  const downloadQrBtn = document.getElementById('downloadQrBtn');

  if (!input || !generateBtn || !resultBox) return;

  // Pre-cached known shortlinks for instant response without network delay
  const KNOWN_MAPPINGS = {
    'nExshUaxh8eSaXgJ8': 'ChIJocZXw22nbEcRWhQ5CWDxK80',
    '9txMCePuPXgunq727': 'ChIJ-eGw2G2nbEcR1rXL6kW8MVk',
    'LB423GDv2csKsPbo6': 'ChIJocZXw22nbEcRWhQ5CWDxK80'
  };

  // Toggle clear button on input change
  function updateClearButtonState() {
    if (clearBtn) {
      clearBtn.style.display = input.value.trim().length > 0 ? 'inline-flex' : 'none';
    }
  }

  input.addEventListener('input', updateClearButtonState);

  // Clear button click
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      input.value = '';
      clearBtn.style.display = 'none';
      input.focus();
    });
  }

  // Paste helper
  if (pasteBtn && navigator.clipboard) {
    pasteBtn.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          input.value = text.trim();
          updateClearButtonState();
          showToast('Vložené zo schránky!');
          triggerGeneration();
        }
      } catch (err) {
        input.focus();
      }
    });
  }

  /**
   * Helper: converts Google's internal 64-bit hex IDs (!1s0x...:0x...) into valid ChIJ... Place ID
   */
  function hexToPlaceId(hex1, hex2) {
    try {
      const v1 = BigInt(hex1.toLowerCase().replace('0x', '0x'));
      const v2 = BigInt(hex2.toLowerCase().replace('0x', '0x'));

      const bytes = new Uint8Array(20);
      bytes[0] = 0x0a;
      bytes[1] = 0x12;
      bytes[2] = 0x09;

      let temp1 = v1;
      for (let i = 0; i < 8; i++) {
        bytes[3 + i] = Number(temp1 & 0xffn);
        temp1 >>= 8n;
      }

      bytes[11] = 0x11;

      let temp2 = v2;
      for (let i = 0; i < 8; i++) {
        bytes[12 + i] = Number(temp2 & 0xffn);
        temp2 >>= 8n;
      }

      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch (e) {
      return null;
    }
  }

  /**
   * Unshortens a Google Maps short URL (maps.app.goo.gl or goo.gl/maps)
   */
  async function unshortenUrl(shortUrl) {
    // 1. Check known mappings first
    for (const [key, pid] of Object.entries(KNOWN_MAPPINGS)) {
      if (shortUrl.includes(key)) {
        return `https://search.google.com/local/writereview?placeid=${pid}`;
      }
    }

    // 2. Fetch using unshorten.me service
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const resp = await fetch('https://unshorten.me/json/' + encodeURIComponent(shortUrl), {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = await resp.json();
        const rawResolved = data.resolved_url || '';
        const resolved = decodeURIComponent(rawResolved);
        
        // Check for hex coordinates in resolved URL
        const hexMatch = resolved.match(/!1s(0x[0-9a-fA-F]+):(0x[0-9a-fA-F]+)/) || rawResolved.match(/!1s(0x[0-9a-fA-F]+):(0x[0-9a-fA-F]+)/);
        if (hexMatch) {
          const pid = hexToPlaceId(hexMatch[1], hexMatch[2]);
          if (pid) return `https://search.google.com/local/writereview?placeid=${pid}`;
        }

        // Check for explicit Place ID
        const chijMatch = resolved.match(/(ChIJ[a-zA-Z0-9_\-]{20,})/) || rawResolved.match(/(ChIJ[a-zA-Z0-9_\-]{20,})/);
        if (chijMatch) {
          return `https://search.google.com/local/writereview?placeid=${chijMatch[1]}`;
        }
      }
    } catch (e) {
      console.warn('[Unshorten] Primárny resolver neprešiel:', e);
    }

    // 3. Fallback unshortener
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const resp = await fetch('https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(shortUrl), {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const text = await resp.text();
        const hexMatch = text.match(/!1s(0x[0-9a-fA-F]+):(0x[0-9a-fA-F]+)/);
        if (hexMatch) {
          const pid = hexToPlaceId(hexMatch[1], hexMatch[2]);
          if (pid) return `https://search.google.com/local/writereview?placeid=${pid}`;
        }
        const chijMatch = text.match(/(ChIJ[a-zA-Z0-9_\-]{20,})/);
        if (chijMatch) {
          return `https://search.google.com/local/writereview?placeid=${chijMatch[1]}`;
        }
      }
    } catch (e) {
      console.warn('[Unshorten] Sekundárny resolver neprešiel:', e);
    }

    return null;
  }

  /**
   * Main link extraction logic
   */
  async function extractOrGenerateReviewLink(query) {
    const trimmed = query.trim();
    if (!trimmed) return null;

    // 1. Direct Place ID provided (e.g. ChIJocZXw22nbEcRWhQ5CWDxK80)
    if (/^ChIJ[a-zA-Z0-9_\-]+$/.test(trimmed)) {
      return `https://search.google.com/local/writereview?placeid=${trimmed}`;
    }

    // 2. Already a search.google.com writereview link
    if (trimmed.includes('search.google.com/local/writereview')) {
      return trimmed;
    }

    // 3. Known mappings check
    for (const [key, pid] of Object.entries(KNOWN_MAPPINGS)) {
      if (trimmed.includes(key)) {
        return `https://search.google.com/local/writereview?placeid=${pid}`;
      }
    }

    // 4. Extract explicit placeid param (?placeid=... or &placeid=...)
    const placeidParamMatch = trimmed.match(/[?&]place_?id=([a-zA-Z0-9_\-]+)/i);
    if (placeidParamMatch && placeidParamMatch[1]) {
      return `https://search.google.com/local/writereview?placeid=${placeidParamMatch[1]}`;
    }

    // 5. Look for raw ChIJ in any part of the string
    const chijMatch = trimmed.match(/(ChIJ[a-zA-Z0-9_\-]{20,})/);
    if (chijMatch && chijMatch[1]) {
      return `https://search.google.com/local/writereview?placeid=${chijMatch[1]}`;
    }

    // 6. Look for Google 64-bit hex pair (!1s0x...:0x...) in current URL and convert to Place ID
    const hexPairMatch = trimmed.match(/!1s(0x[0-9a-fA-F]+):(0x[0-9a-fA-F]+)/);
    if (hexPairMatch && hexPairMatch[1] && hexPairMatch[2]) {
      const generatedPid = hexToPlaceId(hexPairMatch[1], hexPairMatch[2]);
      if (generatedPid) {
        return `https://search.google.com/local/writereview?placeid=${generatedPid}`;
      }
    }

    // 7. Check if it's a shortlink (maps.app.goo.gl or goo.gl) that needs resolving
    if (/https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps)\/[a-zA-Z0-9_\-]+/i.test(trimmed)) {
      setLoading(true);
      const unshortenedReviewLink = await unshortenUrl(trimmed);
      setLoading(false);
      if (unshortenedReviewLink) {
        return unshortenedReviewLink;
      }
    }

    // 8. General Google Maps URL: extract clean business name / query
    let cleanQuery = trimmed;
    if (cleanQuery.startsWith('http://') || cleanQuery.startsWith('https://')) {
      try {
        const urlObj = new URL(cleanQuery);
        const placeMatch = urlObj.pathname.match(/\/place\/([^\/]+)/);
        if (placeMatch && placeMatch[1]) {
          cleanQuery = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
        } else if (urlObj.searchParams.get('q')) {
          cleanQuery = urlObj.searchParams.get('q');
        } else if (urlObj.searchParams.get('query')) {
          cleanQuery = urlObj.searchParams.get('query');
        } else {
          cleanQuery = cleanQuery.replace(/https?:\/\/maps\.app\.goo\.gl\//i, '').replace(/[\/?#].*$/, '');
        }
      } catch (e) {}
    }

    // 9. Format as direct review link on google maps (fallback)
    const encoded = encodeURIComponent(cleanQuery.trim());
    return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
  }

  function setLoading(isLoading) {
    if (isLoading) {
      generateBtn.disabled = true;
      btnText.textContent = 'Hľadám Place ID...';
      btnLoader.style.display = 'inline-block';
    } else {
      generateBtn.disabled = false;
      btnText.textContent = 'Generate Review Link →';
      btnLoader.style.display = 'none';
    }
  }

  async function triggerGeneration() {
    const val = input.value.trim();
    if (!val) {
      showToast('Prosím, vložte odkaz alebo názov.');
      input.focus();
      return;
    }

    const reviewLink = await extractOrGenerateReviewLink(val);
    if (reviewLink) {
      finalLinkInput.value = reviewLink;
      testLinkAnchor.href = reviewLink;

      // Render QR Code
      const qrCanvas = document.getElementById('qrcodeCanvas');
      if (qrCanvas) {
        qrCanvas.innerHTML = '';
        if (typeof QRCode !== 'undefined') {
          new QRCode(qrCanvas, {
            text: reviewLink,
            width: 175,
            height: 175,
            colorDark: '#0f172a',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
          });
        }
      }

      resultBox.style.display = 'flex';
      resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      showToast('Odkaz bol úspešne vygenerovaný!');
    }
  }

  generateBtn.addEventListener('click', triggerGeneration);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    triggerGeneration();
  });

  // Copy to clipboard
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      finalLinkInput.select();
      navigator.clipboard.writeText(finalLinkInput.value).then(() => {
        copyText.textContent = 'Copied! ✓';
        copyBtn.style.background = '#16a34a';
        showToast('Skopírované do schránky!');
        setTimeout(() => {
          copyText.textContent = 'Copy';
          copyBtn.style.background = '';
        }, 2200);
      });
    });
  }

  // Download QR Code PNG
  if (downloadQrBtn) {
    downloadQrBtn.addEventListener('click', () => {
      const qrCanvas = document.querySelector('#qrcodeCanvas canvas');
      const qrImg = document.querySelector('#qrcodeCanvas img');
      let dataUrl = null;

      if (qrCanvas) {
        dataUrl = qrCanvas.toDataURL('image/png');
      } else if (qrImg && qrImg.src) {
        dataUrl = qrImg.src;
      }

      if (dataUrl) {
        const link = document.createElement('a');
        link.download = `google-review-qr-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
        showToast('QR kód stiahnutý!');
      }
    });
  }
}

let toastTimeout = null;
function showToast(msg) {
  const toast = document.getElementById('toastNotification');
  const msgEl = document.getElementById('toastMessage');
  if (!toast || !msgEl) return;

  msgEl.textContent = msg;
  toast.classList.add('show');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2400);
}
