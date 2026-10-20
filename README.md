# ⭐ Google Review Link & QR Generator (ReviewGen PWA)

Moderná webová aplikácia (PWA) optimalizovaná pre **mobilné telefóny (iOS aj Android)** aj desktop, pripravená na okamžité nasadenie na **GitHub Pages**.

Umožňuje firmám a podnikateľom vygenerovať priamy odkaz na **5-hviezdičkovú recenziu na Google**, ktorý zákazníkovi okamžite otvorí hodnotiaci formulár (bez manuálneho hľadania firmy na mapách), a súčasne vytvorí **QR kód** pripravený na vytlačenie na stoly, pokladničné pulty či nálepky.

---

## 🚀 Ako nasadiť na GitHub Pages (do 2 minút)

Tento projekt nevyžaduje žiaden build proces – ide o čistý HTML/CSS/JS, takže beží priamo z GitHubu:

1. **Vytvorte si nový repozitár na GitHube** (napr. s názvom `google-review-generator` alebo `review-link`).
2. **Nahrajte súbory projektu do repozitára** pomocou týchto príkazov v termináli:
   ```bash
   git init
   git add .
   git commit -m "Prvé nasadenie Google Review Generator"
   git branch -M main
   git remote add origin https://github.com/VASE_MENO/NAZOV_REPOZITARA.git
   git push -u origin main
   ```
3. **Zapnite GitHub Pages v nastaveniach repozitára**:
   - Prejdite na GitHube do **Settings** -> **Pages** (v ľavom menu).
   - V sekcii **Build and deployment**:
     - **Source**: `Deploy from a branch`
     - **Branch**: zvolte `main` a priečinok `/(root)`
   - Kliknite na **Save**.
4. O 1–2 minúty bude váš web naživo na adrese:  
   `https://VASE_MENO.github.io/NAZOV_REPOZITARA/`

---

## 📲 Ako si pridať aplikáciu na plochu telefónu

### 🍏 iPhone (iOS Safari)
1. Otvorte vašu GitHub Pages adresu v prehliadači **Safari**.
2. V spodnej lište Safari kliknite na ikonu **Zdieľať** (štvorec so šípkou nahor ⎋).
3. V ponuke vyberte **„Pridať na plochu”** (Add to Home Screen ⊕).
4. Kliknite na **Pridať**. Appka sa uloží s vlastnou ikonou na vašu plochu a otvára sa na celú obrazovku ako bežná iOS aplikácia!

### 🤖 Android (Google Chrome)
1. Otvorte vašu GitHub Pages adresu v prehliadači **Google Chrome**.
2. Priamo v záhlaví kliknite na modré tlačidlo **„Inštalovať”** (alebo v Chrome menu 3 bodky ⋮ zvoľte **„Inštalovať aplikáciu”** / **„Pridať na plochu”**).
3. Hotovo! Appka funguje samostatne a vďaka Service Workeru aj offline.

---

## ✨ Kľúčové funkcie
- **Inteligentná detekcia Google Place ID**:
  - Konverzia 64-bitových Hex súradníc z Google Maps (`!1s0x...:0x...`) na platné `ChIJ...` Place ID.
  - Podpora pre `maps.app.goo.gl` skrátené odkazy.
  - Podpora pre názov firmy s mestom (automatický bezpečný fallback).
  - Priame zadanie Place ID.
- **Okamžité 5★ okno**: Vygeneruje priamy odkaz `https://search.google.com/local/writereview?placeid=...`.
- **Zabudovaný QR kód generátor**:
  - Tlačidlo **Stiahnuť QR obrázok (PNG)**.
  - Tlačidlo **Vytlačiť stojanček** (špeciálny čistý formát pre tlač na papier).
- **Zdieľanie 1 klikom**: Podpora natívneho **Web Share API** (odoslanie cez WhatsApp, SMS, AirDrop alebo Messenger priamo z mobilu).
- **Offline funkčnosť (PWA)**: Vďaka Service Workeru (`sw.js`) a manifestu (`manifest.webmanifest`) aplikácia načíta okamžite aj bez pripojenia na internet.
- **História podnikov**: Automatické ukladanie posledných vygenerovaných odkazov do pamäte telefónu (`localStorage`).
- **Moderný Glassmorphism dizajn**: Tmavý a svetlý režim, Google farby, plynulé animácie a haptická odozva (vibrácie) na mobile.

---

## 📁 Štruktúra projektu
```
project-gen/
├── index.html            # Hlavné HTML rozhranie s PWA meta značkami
├── style.css             # Glassmorphic CSS štýly, animácie a print pravidlá
├── app.js                # Algoritmus pre Place ID, QR generovanie, PWA inštaláciu
├── qrcode.min.js         # Samostatná offline QR knižnica (žiadne externé CDN)
├── manifest.webmanifest  # PWA manifest pre Android/iOS
├── sw.js                 # Service Worker pre offline kešovanie
├── icons/                # Ikony aplikácie (192x192, 512x512, apple-touch-icon, favicon)
└── README.md             # Návod na nasadenie a používanie
```
