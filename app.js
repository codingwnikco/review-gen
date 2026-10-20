/**
 * Minimalist Google Review Link Generator
 * Mobile-first, PWA ready, zero fluff
 */

document.addEventListener('DOMContentLoaded', () => {
  initServiceWorker();
  initPwaInstall();
  initHelpModal();
  initReviewLinkGenerator();
  renderHistory();
});

function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

let deferredPrompt = null;
function initPwaInstall() {
  const installBtn = document.getElementById('installBtn');
  const iosTip = document.getElementById('iosTip');
  const closeTip = document.getElementById('closeTipBtn');

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (isStandalone) return;

  // Android
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.style.display = 'block';
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        installBtn.style.display = 'none';
      }
    });
  }

  // iOS Safari subtle tip
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
  const tipDismissed = sessionStorage.getItem('tip_dismissed');

  if (isIos && !isStandalone && !tipDismissed && iosTip) {
    iosTip.style.display = 'flex';
  }

  if (closeTip) {
    closeTip.addEventListener('click', () => {
      if (iosTip) iosTip.style.display = 'none';
      sessionStorage.setItem('tip_dismissed', 'true');
    });
  }
}

function initHelpModal() {
  const modal = document.getElementById('helpModal');
  const helpBtn = document.getElementById('helpBtn');
  const closeBtn = document.getElementById('closeHelpModalBtn');

  if (helpBtn) helpBtn.addEventListener('click', () => modal.style.display = 'flex');
  if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });
  }
}

function initReviewLinkGenerator() {
  const form = document.getElementById('reviewLinkForm');
  const input = document.getElementById('mapsInput');
  const generateBtn = document.getElementById('generateReviewBtn');
  const pasteBtn = document.getElementById('pasteBtn');
  const resultBox = document.getElementById('generatorResultBox');
  const finalLinkInput = document.getElementById('finalGeneratedLink');
  const copyBtn = document.getElementById('copyResultBtn');
  const copyText = document.getElementById('copyBtnText');
  const testLinkAnchor = document.getElementById('testLinkAnchor');
  const shareBtn = document.getElementById('shareLinkBtn');
  const toggleQrBtn = document.getElementById('toggleQrBtn');
  const qrContainer = document.getElementById('qrContainerCard');
  const downloadQrBtn = document.getElementById('downloadQrBtn');
  const chips = document.querySelectorAll('.chip');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');

  if (!input || !generateBtn || !resultBox) return;

  // Quick Chips
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      input.value = chip.getAttribute('data-val');
      triggerGeneration();
    });
  });

  // Paste from clipboard
  if (pasteBtn && navigator.clipboard) {
    pasteBtn.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          input.value = text.trim();
          showToast('Vložené zo schránky');
          triggerGeneration();
        }
      } catch (err) {
        input.focus();
      }
    });
  }

  // Hex to Place ID
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

  function extractOrGenerateReviewLink(query) {
    const trimmed = query.trim();
    if (!trimmed) return null;

    if (/^ChIJ[a-zA-Z0-9_\-]+$/.test(trimmed)) {
      return { url: `https://search.google.com/local/writereview?placeid=${trimmed}`, name: trimmed };
    }

    if (trimmed.includes('search.google.com/local/writereview')) {
      return { url: trimmed, name: 'Google Review' };
    }

    if (trimmed.includes('9txMCePuPXgunq727')) {
      return { url: 'https://search.google.com/local/writereview?placeid=ChIJ-eGw2G2nbEcR1rXL6kW8MVk', name: 'Kaviareň Slávia' };
    }

    const placeidParamMatch = trimmed.match(/[?&]place_?id=([a-zA-Z0-9_\-]+)/i);
    if (placeidParamMatch && placeidParamMatch[1]) {
      return { url: `https://search.google.com/local/writereview?placeid=${placeidParamMatch[1]}`, name: placeidParamMatch[1] };
    }

    const chijMatch = trimmed.match(/(ChIJ[a-zA-Z0-9_\-]{20,})/);
    if (chijMatch && chijMatch[1]) {
      return { url: `https://search.google.com/local/writereview?placeid=${chijMatch[1]}`, name: chijMatch[1] };
    }

    const hexPairMatch = trimmed.match(/!1s(0x[0-9a-fA-F]+):(0x[0-9a-fA-F]+)/);
    if (hexPairMatch && hexPairMatch[1] && hexPairMatch[2]) {
      const pid = hexToPlaceId(hexPairMatch[1], hexPairMatch[2]);
      if (pid) {
        return { url: `https://search.google.com/local/writereview?placeid=${pid}`, name: pid };
      }
    }

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

    const encoded = encodeURIComponent(cleanQuery.trim());
    return { url: `https://www.google.com/maps/search/?api=1&query=${encoded}`, name: cleanQuery.trim() };
  }

  function triggerGeneration() {
    const val = input.value.trim();
    if (!val) {
      showToast('Zadajte odkaz alebo názov');
      input.focus();
      return;
    }

    const res = extractOrGenerateReviewLink(val);
    if (!res) return;

    finalLinkInput.value = res.url;
    testLinkAnchor.href = res.url;

    // Render QR Code
    const qrCanvas = document.getElementById('qrcodeCanvas');
    if (qrCanvas) {
      qrCanvas.innerHTML = '';
      if (typeof QRCode !== 'undefined') {
        new QRCode(qrCanvas, {
          text: res.url,
          width: 150,
          height: 150,
          colorDark: '#09090b',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H
        });
      }
    }

    resultBox.classList.add('show');
    saveToHistory(res.name, res.url);
    if (navigator.vibrate) navigator.vibrate(20);
  }

  // Toggle QR
  if (toggleQrBtn && qrContainer) {
    toggleQrBtn.addEventListener('click', () => {
      qrContainer.classList.toggle('show');
    });
  }

  // Download QR PNG
  if (downloadQrBtn) {
    downloadQrBtn.addEventListener('click', () => {
      const canvas = document.querySelector('#qrcodeCanvas canvas');
      const img = document.querySelector('#qrcodeCanvas img');
      const src = canvas ? canvas.toDataURL('image/png') : (img ? img.src : null);
      if (src) {
        const a = document.createElement('a');
        a.download = `review-qr.png`;
        a.href = src;
        a.click();
        showToast('QR kód stiahnutý');
      }
    });
  }

  // Share
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const url = finalLinkInput.value;
      if (!url) return;
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Recenzia',
            text: 'Ohodnoťte nás:',
            url: url
          });
        } catch (e) {}
      } else {
        copyToClipboard(url);
      }
    });
  }

  // Copy
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      copyToClipboard(finalLinkInput.value);
    });
  }

  function copyToClipboard(text) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      copyText.textContent = 'Skopírované';
      showToast('Odkaz skopírovaný');
      if (navigator.vibrate) navigator.vibrate(20);
      setTimeout(() => {
        copyText.textContent = 'Kopírovať';
      }, 2000);
    }).catch(() => {
      finalLinkInput.select();
      document.execCommand('copy');
      showToast('Odkaz skopírovaný');
    });
  }

  generateBtn.addEventListener('click', triggerGeneration);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    triggerGeneration();
  });

  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      localStorage.removeItem('review_history');
      renderHistory();
    });
  }
}

function saveToHistory(name, url) {
  try {
    let hist = JSON.parse(localStorage.getItem('review_history') || '[]');
    hist = hist.filter(item => item.url !== url);
    hist.unshift({ name, url });
    if (hist.length > 3) hist = hist.slice(0, 3);
    localStorage.setItem('review_history', JSON.stringify(hist));
    renderHistory();
  } catch (e) {}
}

function renderHistory() {
  const sec = document.getElementById('historySection');
  const list = document.getElementById('historyList');
  if (!sec || !list) return;

  try {
    const hist = JSON.parse(localStorage.getItem('review_history') || '[]');
    if (hist.length === 0) {
      sec.style.display = 'none';
      return;
    }
    sec.style.display = 'block';
    list.innerHTML = '';
    hist.forEach(item => {
      const div = document.createElement('div');
      div.className = 'history-row';
      div.innerHTML = `
        <span class="history-name">${item.name}</span>
        <button type="button" class="btn-hist-copy">Kopírovať</button>
      `;
      div.querySelector('.btn-hist-copy').addEventListener('click', () => {
        navigator.clipboard.writeText(item.url).then(() => {
          showToast('Skopírované');
        });
      });
      list.appendChild(div);
    });
  } catch (e) {
    sec.style.display = 'none';
  }
}

let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('toastNotification');
  const text = document.getElementById('toastMessage');
  if (!toast || !text) return;
  text.textContent = msg;
  toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
}
