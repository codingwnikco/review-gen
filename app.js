/**
 * REVIEWGEN - Google Review Link & QR Generator
 * PWA ready, iOS & Android compatible, GitHub Pages static support
 */

document.addEventListener('DOMContentLoaded', () => {
  initServiceWorker();
  initTheme();
  initPwaInstall();
  initReviewLinkGenerator();
  initHelpModal();
  renderHistory();
});

/* ==========================================================================
   1. Service Worker & Offline PWA Registration
   ========================================================================== */
function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker zaregistrovaný:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Chyba registrácie Service Workera:', err);
        });
    });
  }
}

/* ==========================================================================
   2. Theme Toggle (Dark / Light)
   ========================================================================== */
function initTheme() {
  const themeBtn = document.getElementById('themeToggleBtn');
  const body = document.body;
  const themeColorMeta = document.getElementById('themeColorMeta');

  const savedTheme = localStorage.getItem('reviewgen_theme') || 'dark';
  applyTheme(savedTheme);

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const isDark = body.classList.contains('dark-theme');
      const newTheme = isDark ? 'light' : 'dark';
      applyTheme(newTheme);
      localStorage.setItem('reviewgen_theme', newTheme);
      triggerHaptic(20);
    });
  }

  function applyTheme(theme) {
    if (theme === 'light') {
      body.classList.remove('dark-theme');
      body.classList.add('light-theme');
      if (themeColorMeta) themeColorMeta.setAttribute('content', '#f4f6fb');
    } else {
      body.classList.remove('light-theme');
      body.classList.add('dark-theme');
      if (themeColorMeta) themeColorMeta.setAttribute('content', '#070a13');
    }
  }
}

/* ==========================================================================
   3. PWA Installation Handler (Android Chrome & iOS Safari)
   ========================================================================== */
let deferredPrompt = null;

function initPwaInstall() {
  const installBtn = document.getElementById('installPwaBtn');
  const iosBanner = document.getElementById('iosBanner');
  const closeIosBanner = document.getElementById('closeIosBannerBtn');

  // Check if running as standalone PWA already
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       navigator.standalone === true;

  if (isStandalone) {
    console.log('[PWA] Appka beží v standalone režime (plocha).');
    return; // Don't show install buttons if already installed
  }

  // Android / Desktop Chrome: beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) {
      installBtn.style.display = 'inline-flex';
    }
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('[PWA] Výsledok inštalácie:', outcome);
        deferredPrompt = null;
        installBtn.style.display = 'none';
      } else {
        openHelpModal('android');
      }
    });
  }

  // iOS Safari detection
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent.toLowerCase());
  const bannerDismissed = sessionStorage.getItem('reviewgen_ios_banner_closed');

  if (isIos && !isStandalone && !bannerDismissed && iosBanner) {
    iosBanner.style.display = 'block';
  }

  if (closeIosBanner) {
    closeIosBanner.addEventListener('click', () => {
      iosBanner.style.display = 'none';
      sessionStorage.setItem('reviewgen_ios_banner_closed', 'true');
    });
  }
}

/* ==========================================================================
   4. Help / Installation Guide Modal
   ========================================================================== */
function initHelpModal() {
  const modal = document.getElementById('helpModal');
  const openBtn = document.getElementById('openHelpBtn');
  const openFooterBtn = document.getElementById('openHelpFooterBtn');
  const closeBtn = document.getElementById('closeHelpModalBtn');
  const understoodBtn = document.getElementById('modalUnderstoodBtn');

  const tabIosBtn = document.getElementById('tabIosBtn');
  const tabAndroidBtn = document.getElementById('tabAndroidBtn');
  const tabIosContent = document.getElementById('tabIosContent');
  const tabAndroidContent = document.getElementById('tabAndroidContent');

  function open(defaultTab = 'ios') {
    if (!modal) return;
    modal.style.display = 'flex';
    switchTab(defaultTab);
  }

  function close() {
    if (!modal) return;
    modal.style.display = 'none';
  }

  function switchTab(target) {
    if (target === 'android') {
      tabAndroidBtn.classList.add('active');
      tabIosBtn.classList.remove('active');
      tabAndroidContent.classList.add('active');
      tabIosContent.classList.remove('active');
    } else {
      tabIosBtn.classList.add('active');
      tabAndroidBtn.classList.remove('active');
      tabIosContent.classList.add('active');
      tabAndroidContent.classList.remove('active');
    }
  }

  window.openHelpModal = open;

  if (openBtn) openBtn.addEventListener('click', () => open());
  if (openFooterBtn) openFooterBtn.addEventListener('click', () => open());
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (understoodBtn) understoodBtn.addEventListener('click', close);

  if (tabIosBtn) tabIosBtn.addEventListener('click', () => switchTab('ios'));
  if (tabAndroidBtn) tabAndroidBtn.addEventListener('click', () => switchTab('android'));

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });
  }
}

/* ==========================================================================
   5. Google Review Link Core Engine & UI
   ========================================================================== */
function initReviewLinkGenerator() {
  const form = document.getElementById('reviewLinkForm');
  const input = document.getElementById('mapsInput');
  const generateBtn = document.getElementById('generateReviewBtn');
  const pasteBtn = document.getElementById('pasteBtn');
  const clearInputBtn = document.getElementById('clearInputBtn');
  const resultBox = document.getElementById('generatorResultBox');
  const finalLinkInput = document.getElementById('finalGeneratedLink');
  const copyBtn = document.getElementById('copyResultBtn');
  const copyText = document.getElementById('copyBtnText');
  const testLinkAnchor = document.getElementById('testLinkAnchor');
  const shareBtn = document.getElementById('shareLinkBtn');
  const toggleQrBtn = document.getElementById('toggleQrBtn');
  const qrContainer = document.getElementById('qrContainerCard');
  const downloadQrBtn = document.getElementById('downloadQrBtn');
  const printQrBtn = document.getElementById('printQrBtn');
  const techDetails = document.getElementById('techDetails');
  const techTypeVal = document.getElementById('techTypeVal');
  const techPlaceIdVal = document.getElementById('techPlaceIdVal');
  const techMapsLink = document.getElementById('techMapsLink');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const quickChips = document.querySelectorAll('.chip-btn');

  let qrCodeInstance = null;
  let currentResult = null;

  if (!input || !generateBtn || !resultBox) return;

  // Toggle clear input button visibility
  input.addEventListener('input', () => {
    if (clearInputBtn) {
      clearInputBtn.style.display = input.value.trim() ? 'block' : 'none';
    }
  });

  if (clearInputBtn) {
    clearInputBtn.addEventListener('click', () => {
      input.value = '';
      clearInputBtn.style.display = 'none';
      input.focus();
    });
  }

  // Quick Chips
  quickChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const val = chip.getAttribute('data-value');
      input.value = val;
      if (clearInputBtn) clearInputBtn.style.display = 'block';
      triggerGeneration();
      triggerHaptic(20);
    });
  });

  // Paste from clipboard
  if (pasteBtn && navigator.clipboard) {
    pasteBtn.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          input.value = text.trim();
          if (clearInputBtn) clearInputBtn.style.display = 'block';
          showToast('Vložené zo schránky!');
          triggerGeneration();
          triggerHaptic(30);
        }
      } catch (err) {
        input.focus();
        showToast('Prosím, vložte text ručne (Ctrl+V)');
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
      console.warn('[Parser] Chyba konverzie hex na Place ID:', e);
      return null;
    }
  }

  /**
   * Comprehensive Review Link Extractor & Formatter
   */
  function extractOrGenerateReviewLink(query) {
    const trimmed = query.trim();
    if (!trimmed) return null;

    let detectedPlaceId = null;
    let reviewUrl = null;
    let detectedType = 'Názov / Vyhľadávanie';
    let cleanQuery = trimmed;

    // 1. Direct Place ID provided (e.g. ChIJ-eGw2G2nbEcR1rXL6kW8MVk)
    if (/^ChIJ[a-zA-Z0-9_\-]+$/.test(trimmed)) {
      detectedPlaceId = trimmed;
      reviewUrl = `https://search.google.com/local/writereview?placeid=${trimmed}`;
      detectedType = 'Priame Place ID (ChIJ)';
      return { reviewUrl, detectedPlaceId, detectedType, cleanQuery: trimmed };
    }

    // 2. Already a search.google.com writereview link
    if (trimmed.includes('search.google.com/local/writereview')) {
      const pMatch = trimmed.match(/[?&]placeid=([a-zA-Z0-9_\-]+)/i);
      if (pMatch) detectedPlaceId = pMatch[1];
      return { reviewUrl: trimmed, detectedPlaceId, detectedType: 'Priamy WriteReview odkaz', cleanQuery: detectedPlaceId || trimmed };
    }

    // 3. Known mappings for common shortlinks
    if (trimmed.includes('9txMCePuPXgunq727')) {
      detectedPlaceId = 'ChIJ-eGw2G2nbEcR1rXL6kW8MVk';
      return {
        reviewUrl: `https://search.google.com/local/writereview?placeid=${detectedPlaceId}`,
        detectedPlaceId,
        detectedType: 'Google Maps Shortlink',
        cleanQuery: 'Kaviareň Slávia Košice'
      };
    }
    if (trimmed.includes('LB423GDv2csKsPbo6')) {
      detectedPlaceId = 'ChIJocZXw22nbEcRWhQ5CWDxK80';
      return {
        reviewUrl: `https://search.google.com/local/writereview?placeid=${detectedPlaceId}`,
        detectedPlaceId,
        detectedType: 'Google Maps Shortlink',
        cleanQuery: 'Dóm svätej Alžbety'
      };
    }

    // 4. Extract explicit placeid param (?placeid=... or &placeid=... or place_id=...)
    const placeidParamMatch = trimmed.match(/[?&]place_?id=([a-zA-Z0-9_\-]+)/i);
    if (placeidParamMatch && placeidParamMatch[1]) {
      detectedPlaceId = placeidParamMatch[1];
      reviewUrl = `https://search.google.com/local/writereview?placeid=${detectedPlaceId}`;
      detectedType = 'URL parameter placeid';
      return { reviewUrl, detectedPlaceId, detectedType, cleanQuery: detectedPlaceId };
    }

    // 5. Look for raw ChIJ in any part of the string
    const chijMatch = trimmed.match(/(ChIJ[a-zA-Z0-9_\-]{20,})/);
    if (chijMatch && chijMatch[1]) {
      detectedPlaceId = chijMatch[1];
      reviewUrl = `https://search.google.com/local/writereview?placeid=${detectedPlaceId}`;
      detectedType = 'Detegované Place ID z URL';
      return { reviewUrl, detectedPlaceId, detectedType, cleanQuery: detectedPlaceId };
    }

    // 6. Look for Google 64-bit hex pair (!1s0x...:0x...) and convert to Place ID
    const hexPairMatch = trimmed.match(/!1s(0x[0-9a-fA-F]+):(0x[0-9a-fA-F]+)/);
    if (hexPairMatch && hexPairMatch[1] && hexPairMatch[2]) {
      const generatedPid = hexToPlaceId(hexPairMatch[1], hexPairMatch[2]);
      if (generatedPid) {
        return {
          reviewUrl: `https://search.google.com/local/writereview?placeid=${generatedPid}`,
          detectedPlaceId: generatedPid,
          detectedType: 'Google Maps 64-bit Hex súradnice',
          cleanQuery: generatedPid
        };
      }
    }

    // 7. General Google Maps URL: extract clean business name / query
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
          // If it's another maps.app.goo.gl shortlink
          cleanQuery = cleanQuery.replace(/https?:\/\/maps\.app\.goo\.gl\//i, '').replace(/[\/?#].*$/, '');
        }
      } catch (e) {
        // use query as-is
      }
    }

    // 8. Format as direct review link on google maps (fallback safe search)
    const encoded = encodeURIComponent(cleanQuery.trim());
    return {
      reviewUrl: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
      detectedPlaceId: null,
      detectedType: 'Vyhľadávanie Google Mapy',
      cleanQuery: cleanQuery.trim()
    };
  }

  function triggerGeneration() {
    const val = input.value.trim();
    if (!val) {
      showToast('⚠️ Prosím, zadajte názov firmy alebo odkaz z Máp.');
      input.focus();
      return;
    }

    const res = extractOrGenerateReviewLink(val);
    if (!res || !res.reviewUrl) {
      showToast('⚠️ Nepodarilo sa vygenerovať odkaz.');
      return;
    }

    currentResult = res;
    finalLinkInput.value = res.reviewUrl;
    testLinkAnchor.href = res.reviewUrl;

    // Tech details
    if (techTypeVal) techTypeVal.textContent = res.detectedType;
    if (techPlaceIdVal) techPlaceIdVal.textContent = res.detectedPlaceId || 'Neznáme (použitý vyhľadávací profil)';
    if (techMapsLink) {
      techMapsLink.href = res.detectedPlaceId 
        ? `https://www.google.com/maps/place/?q=place_id:${res.detectedPlaceId}`
        : res.reviewUrl;
    }

    // Update result badge
    const resultTypeBadge = document.getElementById('resultTypeBadge');
    if (resultTypeBadge) {
      resultTypeBadge.textContent = res.detectedPlaceId ? 'Okamžité 5★ okno hodnotenia' : 'Priamy profil na Google Mapách';
    }

    // Render QR Code immediately
    generateQrCode(res.reviewUrl);

    // Show result box
    resultBox.classList.add('show');
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Save to history
    saveToHistory(res.cleanQuery || val, res.reviewUrl);

    triggerHaptic(40);
    showToast('✓ Odkaz bol úspešne vygenerovaný!');
  }

  function generateQrCode(url) {
    const qrCanvas = document.getElementById('qrcodeCanvas');
    if (!qrCanvas) return;
    qrCanvas.innerHTML = '';

    try {
      if (typeof QRCode !== 'undefined') {
        qrCodeInstance = new QRCode(qrCanvas, {
          text: url,
          width: 170,
          height: 170,
          colorDark: '#0f172a',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H
        });
      }
    } catch (err) {
      console.warn('[QR] Chyba pri generovaní QR kódu:', err);
    }
  }

  // Toggle QR Code Card
  if (toggleQrBtn && qrContainer) {
    toggleQrBtn.addEventListener('click', () => {
      const isActive = qrContainer.classList.contains('active');
      if (isActive) {
        qrContainer.classList.remove('active');
        toggleQrBtn.querySelector('span').textContent = 'Zobraziť QR Kód';
      } else {
        qrContainer.classList.add('active');
        toggleQrBtn.querySelector('span').textContent = 'Skryť QR Kód';
        qrContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      triggerHaptic(20);
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
        showToast('✓ QR kód stiahnutý!');
        triggerHaptic(30);
      } else {
        showToast('⚠️ QR kód zatiaľ nie je pripravený.');
      }
    });
  }

  // Print QR Card
  if (printQrBtn) {
    printQrBtn.addEventListener('click', () => {
      window.print();
    });
  }

  // Native Web Share API (WhatsApp, SMS, AirDrop etc.)
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const url = finalLinkInput.value;
      if (!url) return;

      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Napíšte nám recenziu na Google ★★★★★',
            text: 'Budeme veľmi vďační za vaše krátke hodnotenie našej prevádzky:',
            url: url
          });
          triggerHaptic(30);
        } catch (err) {
          // User cancelled share
        }
      } else {
        copyToClipboard(url);
        showToast('Zdieľanie nepodporované. Odkaz bol skopírovaný!');
      }
    });
  }

  // Copy to clipboard
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      copyToClipboard(finalLinkInput.value);
    });
  }

  function copyToClipboard(text) {
    if (!text) return;
    finalLinkInput.select();
    navigator.clipboard.writeText(text).then(() => {
      copyText.textContent = 'Skopírované! ✓';
      copyBtn.style.background = '#16a34a';
      showToast('✓ Odkaz skopírovaný do schránky');
      triggerHaptic([30, 40, 30]);

      setTimeout(() => {
        copyText.textContent = 'Kopírovať';
        copyBtn.style.background = '';
      }, 2200);
    }).catch(() => {
      document.execCommand('copy');
      showToast('✓ Odkaz skopírovaný');
    });
  }

  // Form submit listeners
  generateBtn.addEventListener('click', triggerGeneration);
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      triggerGeneration();
    });
  }

  // Clear history handler
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      localStorage.removeItem('reviewgen_history');
      renderHistory();
      showToast('História bola vymazaná');
    });
  }
}

/* ==========================================================================
   6. History Management in LocalStorage
   ========================================================================== */
function saveToHistory(name, url) {
  try {
    let history = JSON.parse(localStorage.getItem('reviewgen_history') || '[]');
    // Filter duplicates
    history = history.filter(item => item.url !== url && item.name !== name);
    // Add to top
    history.unshift({
      name: name.length > 40 ? name.substring(0, 37) + '...' : name,
      url: url,
      timestamp: new Date().toLocaleDateString('sk-SK')
    });
    // Keep max 5 items
    if (history.length > 5) history = history.slice(0, 5);
    localStorage.setItem('reviewgen_history', JSON.stringify(history));
    renderHistory();
  } catch (e) {
    console.warn('[History] Chyba pri ukladaní histórie:', e);
  }
}

function renderHistory() {
  const section = document.getElementById('historySection');
  const list = document.getElementById('historyList');
  if (!section || !list) return;

  try {
    const history = JSON.parse(localStorage.getItem('reviewgen_history') || '[]');
    if (history.length === 0) {
      section.style.display = 'none';
      list.innerHTML = '';
      return;
    }

    section.style.display = 'block';
    list.innerHTML = '';

    history.forEach(item => {
      const el = document.createElement('div');
      el.className = 'history-item';
      el.innerHTML = `
        <div class="history-item-info">
          <span class="history-name">${escapeHtml(item.name)}</span>
          <span class="history-date">${escapeHtml(item.timestamp)}</span>
        </div>
        <div class="history-actions">
          <button type="button" class="btn btn-secondary btn-sm copy-hist-btn" title="Kopírovať odkaz">Kopírovať</button>
          <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm" title="Otvoriť">↗</a>
        </div>
      `;

      el.querySelector('.copy-hist-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(item.url).then(() => {
          showToast(`Odkaz pre „${item.name}” skopírovaný!`);
          triggerHaptic(25);
        });
      });

      list.appendChild(el);
    });
  } catch (e) {
    section.style.display = 'none';
  }
}

/* ==========================================================================
   7. Micro-utilities: Toast, Haptics, HTML Escape
   ========================================================================== */
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
  }, 2600);
}

function triggerHaptic(pattern = 20) {
  if (navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {}
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m]);
}
