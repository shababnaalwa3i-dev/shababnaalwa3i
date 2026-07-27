let appData = {};

// Automatic translation for any new Arabic text added directly in HTML.
const AUTO_TRANSLATE_NEW_TEXT = true;
const TRANSLATION_CACHE_KEY = 'ysc-auto-translation-cache-v1';

let currentLang = localStorage.getItem('ysc-lang') || 'ar';
if (currentLang !== 'ar' && currentLang !== 'en') {
  currentLang = 'ar';
}

let activeSlide = 0;

const originalTextNodes = new WeakMap();
let translationCache = {};
try {
  translationCache = JSON.parse(localStorage.getItem(TRANSLATION_CACHE_KEY) || '{}');
} catch (_) {
  translationCache = {};
}

function saveTranslationCache() {
  try {
    localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(translationCache));
  } catch (_) {
    // Ignore storage quota/privacy errors.
  }
}

function decodeHtmlEntities(value) {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
}

function shouldAutoTranslateTextNode(node) {
  if (!node.nodeValue || !/[\u0600-\u06FF]/.test(node.nodeValue)) return false;
  const parent = node.parentElement;
  if (!parent) return false;
  if (parent.closest('script, style, textarea, select, input, .lang-switcher, .notranslate')) return false;
  return node.nodeValue.trim().length > 1;
}

async function translateArabicTextToEnglish(text) {
  const cleanText = text.trim();
  if (!cleanText) return text;
  if (translationCache[cleanText]) return translationCache[cleanText];

  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}&langpair=ar|en`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Translation failed: ${response.status}`);
  const data = await response.json();
  const translated = decodeHtmlEntities(data?.responseData?.translatedText || cleanText);
  translationCache[cleanText] = translated;
  saveTranslationCache();
  return translated;
}

async function autoTranslateNewArabicText() {
  if (!AUTO_TRANSLATE_NEW_TEXT) return;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return shouldAutoTranslateTextNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });

  const nodes = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }

  if (currentLang === 'ar') {
    nodes.forEach(node => {
      if (originalTextNodes.has(node)) {
        node.nodeValue = originalTextNodes.get(node);
      }
    });
    return;
  }

  await Promise.all(nodes.map(async (node) => {
    const original = originalTextNodes.get(node) || node.nodeValue;
    originalTextNodes.set(node, original);
    try {
      node.nodeValue = node.nodeValue.replace(original.trim(), await translateArabicTextToEnglish(original));
    } catch (error) {
      console.warn('Auto translation skipped for:', original, error);
    }
  }));
}

async function autoTranslateArabicAttributes() {
  if (!AUTO_TRANSLATE_NEW_TEXT || currentLang !== 'en') return;
  const attrs = ['placeholder', 'title', 'aria-label', 'alt'];
  const elements = Array.from(document.querySelectorAll('*')).filter(el => !el.closest('script, style, .notranslate'));

  await Promise.all(elements.map(async (el) => {
    await Promise.all(attrs.map(async (attr) => {
      const value = el.getAttribute(attr);
      if (!value || !/[\u0600-\u06FF]/.test(value)) return;
      const originalAttr = `data-original-${attr}`;
      const original = el.getAttribute(originalAttr) || value;
      el.setAttribute(originalAttr, original);
      try {
        el.setAttribute(attr, await translateArabicTextToEnglish(original));
      } catch (error) {
        console.warn('Attribute translation skipped:', original, error);
      }
    }));
  }));
}

function getSiteIconSvg(iconName) {
  const icons = {
    pin: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>`,
    building: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/><path d="M9 10h.01"/><path d="M12 10h.01"/><path d="M15 10h.01"/></svg>`,
    network: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3.6 9h16.8"/><path d="M3.6 15h16.8"/><path d="M12 3a14 14 0 0 1 0 18"/><path d="M12 3a14 14 0 0 0 0 18"/></svg>`,
    sports: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M3.6 9h16.8"/><path d="M3.6 15h16.8"/><path d="M7.5 4.8c2.2 1.8 3.4 4.2 3.4 7.2s-1.2 5.4-3.4 7.2"/><path d="M16.5 4.8c-2.2 1.8-3.4 4.2-3.4 7.2s1.2 5.4 3.4 7.2"/></svg>`,
    graduation: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c3.5 2 8.5 2 12 0v-5"/><path d="M22 10v6"/></svg>`,
    community: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="10" r="2.5"/><path d="M14.5 19a4.5 4.5 0 0 1 6 0"/></svg>`,
    chart: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 4-4 3 3 5-7"/><path d="M17 7h2v2"/></svg>`
  };
  return icons[iconName] || icons.pin;
}

// Update the dynamic visual elements and text based on current language
function renderTranslations() {
  if (!appData || !appData.ar) return;
  const t = appData.ar;
  
  // Update document metadata & structure
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
  document.title = t.metaTitle;
  
  // Set current lang classes
  document.body.className = currentLang === 'ar' ? 'lang-ar' : 'lang-en';

  // Toggle active language switcher state
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('is-active', btn.getAttribute('data-lang') === currentLang);
  });

  // Update navbar items
  if (document.querySelector('[data-nav-t="home"]')) document.querySelector('[data-nav-t="home"]').innerText = t.nav.home;
  if (document.querySelector('[data-nav-t="charter"]')) document.querySelector('[data-nav-t="charter"]').innerText = t.nav.charter;
  if (document.querySelector('[data-nav-t="about"]')) document.querySelector('[data-nav-t="about"]').innerText = t.nav.about;
  if (document.querySelector('[data-nav-t="vision"]')) document.querySelector('[data-nav-t="vision"]').innerText = t.nav.vision;
  if (document.querySelector('[data-nav-t="bylaws"]')) document.querySelector('[data-nav-t="bylaws"]').innerText = t.nav.bylaws;
  if (document.querySelector('[data-nav-t="leadership"]')) document.querySelector('[data-nav-t="leadership"]').innerText = t.nav.leadership;
  if (document.querySelector('[data-nav-t="offices"]')) document.querySelector('[data-nav-t="offices"]').innerText = t.nav.offices;
  if (document.querySelector('[data-nav-t="join"]')) document.querySelector('[data-nav-t="join"]').innerText = t.nav.join;
  if (document.querySelector('[data-nav-t="news"]')) document.querySelector('[data-nav-t="news"]').innerText = t.nav.news;
  if (document.querySelector('[data-nav-t="contact"]')) document.querySelector('[data-nav-t="contact"]').innerText = t.nav.contact;

  // Header Brand Subtitle
  if (document.querySelector('.brand-copy small')) document.querySelector('.brand-copy small').innerText = t.brand.subtitle;
  if (document.querySelector('.brand-copy strong')) document.querySelector('.brand-copy strong').innerText = t.brand.title;

  // Hero Section
  if (document.querySelector('#hero-eyebrow')) document.querySelector('#hero-eyebrow').innerText = t.hero.eyebrow;
  
  // Stylized main header
  const titleEl = document.querySelector('#hero-title');
  if (titleEl) {
    titleEl.innerHTML = '';
    const textSplit = t.hero.title.split('الشباب');
    if (currentLang === 'ar' && textSplit.length > 1) {
      titleEl.innerHTML = `${textSplit[0]} <span style="color: var(--accent-gold); text-decoration: underline; text-underline-offset: 8px;">الشباب</span> ${textSplit[1]}`;
    } else {
      const enSplit = t.hero.title.split('tomorrow\'s');
      if (enSplit.length > 1) {
        titleEl.innerHTML = `${enSplit[0]} <span style="color: var(--accent-gold); text-decoration: underline; text-underline-offset: 8px;">tomorrow's</span> ${enSplit[1]}`;
      } else {
        titleEl.innerText = t.hero.title;
      }
    }
  }

  if (document.querySelector('#hero-text')) document.querySelector('#hero-text').innerText = t.hero.text;
  if (document.querySelector('#hero-btn-primary')) document.querySelector('#hero-btn-primary').innerText = t.hero.primaryCta;
  if (document.querySelector('#hero-btn-secondary')) document.querySelector('#hero-btn-secondary').innerText = t.hero.secondaryCta;

  // Render hero points list
  const pointsList = document.querySelector('#hero-points-list');
  if (pointsList) pointsList.innerHTML = t.hero.points.map(pt => `<li>${pt}</li>`).join('');

  // Hero Right Panel/Emblem
  if (document.querySelector('#panel-badge')) document.querySelector('#panel-badge').innerText = t.hero.panelBadge;
  if (document.querySelector('#panel-title')) document.querySelector('#panel-title').innerText = t.hero.panelTitle;
  if (document.querySelector('#panel-text')) document.querySelector('#panel-text').innerText = t.hero.panelText;
  if (document.querySelector('#chip-one-text')) document.querySelector('#chip-one-text').innerText = t.hero.chipOne;
  if (document.querySelector('#chip-two-text')) document.querySelector('#chip-two-text').innerText = t.hero.chipTwo;

  const miniMetricsGrid = document.querySelector('#panel-mini-metrics');
  if (miniMetricsGrid) {
    miniMetricsGrid.innerHTML = t.hero.miniMetrics.map(m => `
      <div class="mini-metric">
        <strong>${m.value}</strong>
        <span>${m.label}</span>
      </div>
    `).join('');
  }

  // Stats Section
  if (document.querySelector('#stats-kicker')) document.querySelector('#stats-kicker').innerText = t.stats.kicker;
  if (document.querySelector('#stats-title')) document.querySelector('#stats-title').innerText = t.stats.title;
  
  const statsGrid = document.querySelector('#stats-grid-container');
  if (statsGrid) {
    statsGrid.innerHTML = t.stats.items.map((stat, idx) => {
      let iconSvg = '';
      if (idx === 0) {
        iconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
      } else if (idx === 1) {
        iconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
      } else if (idx === 2) {
        iconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"/><path d="M12 2a4 4 0 0 0-4 4v5a4 4 0 0 0 4 4 4 4 0 0 0 4-4V6a4 4 0 0 0-4-4z"/></svg>`;
      } else {
        iconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
      }
      return `
        <div class="stat-card">
          <div class="stat-icon-wrap">${iconSvg}</div>
          <div class="stat-value">${stat.value}</div>
          <div class="stat-label">${stat.label}</div>
        </div>
      `;
    }).join('');
  }

  // News Activities Section
  if (document.querySelector('#news-kicker')) document.querySelector('#news-kicker').innerText = t.news.kicker;
  if (document.querySelector('#news-title')) document.querySelector('#news-title').innerText = t.news.title;
  if (document.querySelector('#news-text')) document.querySelector('#news-text').innerText = t.news.text;
  
  renderNewsSlides();

  // About Section
  if (document.querySelector('#about-kicker')) document.querySelector('#about-kicker').innerText = t.about.kicker;
  if (document.querySelector('#about-title')) document.querySelector('#about-title').innerText = t.about.title;
  if (document.querySelector('#about-lead')) document.querySelector('#about-lead').innerText = t.about.lead;
  if (document.querySelector('#about-who-title')) document.querySelector('#about-who-title').innerText = t.about.whoTitle;
  if (document.querySelector('#about-who-text')) document.querySelector('#about-who-text').innerText = t.about.whoText;
  if (document.querySelector('#about-quote-text')) document.querySelector('#about-quote-text').innerText = t.about.quote;

  // Vision Section
  if (document.querySelector('#vision-kicker')) document.querySelector('#vision-kicker').innerText = t.vision.kicker;
  if (document.querySelector('#vision-title')) document.querySelector('#vision-title').innerText = t.vision.title;
  if (document.querySelector('#vision-text')) document.querySelector('#vision-text').innerText = t.vision.text;

  const visionGrid = document.querySelector('#vision-grid-container');
  if (visionGrid) {
    visionGrid.innerHTML = t.vision.cards.map(card => `
      <div class="vision-card">
        <div class="vision-icon">${getSiteIconSvg(card.icon)}</div>
        <h3>${card.title}</h3>
        <p>${card.text}</p>
      </div>
    `).join('');
  }

  // Bylaws Section
  if (document.querySelector('#bylaws-kicker')) document.querySelector('#bylaws-kicker').innerText = t.bylaws.kicker;
  if (document.querySelector('#bylaws-title')) document.querySelector('#bylaws-title').innerText = t.bylaws.title;
  if (document.querySelector('#bylaws-text')) document.querySelector('#bylaws-text').innerText = t.bylaws.text;

  const accordionContainer = document.querySelector('#bylaws-accordion');
  if (accordionContainer) {
    accordionContainer.innerHTML = t.bylaws.items.map((item, idx) => `
      <div class="accordion-item" id="accordion-item-${idx}">
        <button class="accordion-trigger" onclick="toggleAccordion(${idx})">
          <span>
            <strong class="accordion-index">0${idx + 1}.</strong>
            ${item.title}
          </span>
          <span class="accordion-icon">+</span>
        </button>
        <div class="accordion-panel">
          <div class="accordion-inner">
            <p>${item.text}</p>
          </div>
        </div>
      </div>
    `).join('');
  }

  // Leadership Section
  if (document.querySelector('#leadership-kicker')) document.querySelector('#leadership-kicker').innerText = t.leadership.kicker;
  if (document.querySelector('#leadership-title')) document.querySelector('#leadership-title').innerText = t.leadership.title;
  if (document.querySelector('#leadership-text')) document.querySelector('#leadership-text').innerText = t.leadership.text;

  const leadershipGrid = document.querySelector('#leadership-grid-container');
  if (leadershipGrid) {
    leadershipGrid.innerHTML = t.leadership.members.map(member => `
      <div class="leader-card">
        <button type="button" onclick="openProfile('${member.id}')" aria-label="${t.leadership.label}: ${member.name}">
          <div class="leader-image-wrap">
            <img src="${member.image}" alt="${member.name}" loading="lazy">
          </div>
          <div class="leader-info">
            <span class="leader-role">${member.role}</span>
            <h3>${member.name}</h3>
            <p>${member.summary}</p>
            <span class="leader-link">
              ${t.leadership.viewProfile} &larr;
            </span>
          </div>
        </button>
      </div>
    `).join('');
  }

  // Offices Section
  if (document.querySelector('#offices-kicker')) document.querySelector('#offices-kicker').innerText = t.offices.kicker;
  if (document.querySelector('#offices-title')) document.querySelector('#offices-title').innerText = t.offices.title;
  if (document.querySelector('#offices-text')) document.querySelector('#offices-text').innerText = t.offices.text;

  const officesGrid = document.querySelector('#offices-grid-container');
  if (officesGrid) {
    officesGrid.innerHTML = t.offices.items.map(office => `
      <div class="office-card">
        <div class="office-icon">${getSiteIconSvg(office.icon)}</div>
        <h3>${office.title}</h3>
        <p>${office.text}</p>
        <spam>
          <iframe src="${office.location}" width="100%" height="64%" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>
        </spam>
      </div>
    `).join('');
  }

  // Join Section
  if (document.querySelector('#join-kicker')) document.querySelector('#join-kicker').innerText = t.join.kicker;
  if (document.querySelector('#join-title')) document.querySelector('#join-title').innerText = t.join.title;
  if (document.querySelector('#join-text')) document.querySelector('#join-text').innerText = t.join.text;
  if (document.querySelector('#join-benefits-list')) {
    document.querySelector('#join-benefits-list').innerHTML = t.join.benefits.map(item => `<div class="join-benefit">${item}</div>`).join('');
  }

  if (document.querySelector('#join-label-name')) document.querySelector('#join-label-name').innerText = t.join.labels.name;
  if (document.querySelector('#join-label-phone')) document.querySelector('#join-label-phone').innerText = t.join.labels.phone;
  if (document.querySelector('#join-label-email')) document.querySelector('#join-label-email').innerText = t.join.labels.email;
  if (document.querySelector('#join-label-age')) document.querySelector('#join-label-age').innerText = t.join.labels.age;
  if (document.querySelector('#join-label-governorate')) document.querySelector('#join-label-governorate').innerText = t.join.labels.governorate;
  if (document.querySelector('#join-label-interest')) document.querySelector('#join-label-interest').innerText = t.join.labels.interest;
  if (document.querySelector('#join-label-message')) document.querySelector('#join-label-message').innerText = t.join.labels.message;
  if (document.querySelector('#join-consent-text')) document.querySelector('#join-consent-text').innerText = t.join.labels.consent;
  if (document.querySelector('#join-submit')) document.querySelector('#join-submit').innerText = t.join.labels.submit;
  if (document.querySelector('#join-note')) document.querySelector('#join-note').innerText = t.join.labels.note;

  if (document.querySelector('#join-name')) document.querySelector('#join-name').placeholder = t.join.placeholders.name;
  if (document.querySelector('#join-phone')) document.querySelector('#join-phone').placeholder = t.join.placeholders.phone;
  if (document.querySelector('#join-email')) document.querySelector('#join-email').placeholder = t.join.placeholders.email;
  if (document.querySelector('#join-age')) document.querySelector('#join-age').placeholder = t.join.placeholders.age;
  if (document.querySelector('#join-message')) document.querySelector('#join-message').placeholder = t.join.placeholders.message;

  if (document.querySelector('#join-governorate')) {
    document.querySelector('#join-governorate').innerHTML = `<option value="">${t.join.chooseGovernorate}</option>` + t.join.governorates.map(g => `<option value="${g}">${g}</option>`).join('');
  }
  if (document.querySelector('#join-interest')) {
    document.querySelector('#join-interest').innerHTML = `<option value="">${t.join.chooseInterest}</option>` + t.join.interests.map(i => `<option value="${i}">${i}</option>`).join('');
  }

  // CTA Section
  if (document.querySelector('#cta-kicker')) document.querySelector('#cta-kicker').innerText = t.cta.kicker;
  if (document.querySelector('#cta-title')) document.querySelector('#cta-title').innerText = t.cta.title;
  if (document.querySelector('#cta-text')) document.querySelector('#cta-text').innerText = t.cta.text;
  if (document.querySelector('#cta-btn-primary')) document.querySelector('#cta-btn-primary').innerText = t.cta.primary;
  if (document.querySelector('#cta-btn-secondary')) document.querySelector('#cta-btn-secondary').innerText = t.cta.secondary;

  // Footer Section
  if (document.querySelector('#footer-brand')) document.querySelector('#footer-brand').innerText = t.footer.brand;
  if (document.querySelector('#footer-text')) document.querySelector('#footer-text').innerText = t.footer.text;
  if (document.querySelector('#footer-copy')) document.querySelector('#footer-copy').innerText = t.footer.copy;
  if (document.querySelector('#footer-status-text')) document.querySelector('#footer-status-text').innerText = t.footer.status;
  if (document.querySelector('#footer-quick-title')) document.querySelector('#footer-quick-title').innerText = currentLang === 'ar' ? 'روابط سريعة' : 'Quick Navigation';
  if (document.querySelector('#footer-socials-title')) document.querySelector('#footer-socials-title').innerText = currentLang === 'ar' ? 'منصات التواصل' : 'Social Platforms';

  if (document.querySelector('[data-footer-link="about"]')) document.querySelector('[data-footer-link="about"]').innerText = t.nav.about;
  if (document.querySelector('[data-footer-link="leadership"]')) document.querySelector('[data-footer-link="leadership"]').innerText = t.nav.leadership;
  if (document.querySelector('[data-footer-link="offices"]')) document.querySelector('[data-footer-link="offices"]').innerText = t.nav.offices;
  if (document.querySelector('[data-footer-link="join"]')) document.querySelector('[data-footer-link="join"]').innerText = t.nav.join;
  if (document.querySelector('[data-footer-link="news"]')) document.querySelector('[data-footer-link="news"]').innerText = t.nav.news;
  if (document.querySelector('[data-footer-link="charter"]')) document.querySelector('[data-footer-link="charter"]').innerText = t.nav.charter;

  autoTranslateNewArabicText().then(autoTranslateArabicAttributes);
}

// Render slides inside slider
function renderNewsSlides() {
  if (!appData || !appData.ar) return;
  const t = appData.ar;
  const newsTrack = document.querySelector('#news-track');
  if (!newsTrack) return;
  
  newsTrack.innerHTML = t.news.slides.map(slide => `
    <div class="news-slide">
      <div class="news-card">
        <div class="news-card-copy">
          <div class="news-meta">
            <span class="news-badge">${slide.category}</span>
            <span class="news-date">${slide.date}</span>
          </div>
          <h3>${slide.title}</h3>
          <p>${slide.text}</p>
        </div>
        <div class="news-card-media">
          <img src="${slide.image}" alt="${slide.title}">
          <span class="media-label">${slide.mediaLabel}</span>
        </div>
      </div>
    </div>
  `).join('');

  // Render dots
  const dotsContainer = document.querySelector('#slider-dots-container');
  if (dotsContainer) {
    dotsContainer.innerHTML = t.news.slides.map((_, idx) => `
      <button class="slider-dot ${idx === activeSlide ? 'is-active' : ''}" 
              onclick="setSlide(${idx})" 
              aria-label="Slide ${idx + 1}"></button>
    `).join('');
  }

  updateSliderPosition();
}

function updateSliderPosition() {
  const newsTrack = document.querySelector('#news-track');
  if (!newsTrack) return;
  const dirMultiplier = currentLang === 'ar' ? 1 : -1;
  const translationValue = activeSlide * 100 * dirMultiplier;
  newsTrack.style.transform = `translateX(${translationValue}%)`;

  // Update dots classes
  document.querySelectorAll('.slider-dot').forEach((dot, idx) => {
    dot.classList.toggle('is-active', idx === activeSlide);
  });
}

// Slide Navigation
window.prevSlide = function() {
  if (!appData || !appData.ar) return;
  const slidesCount = appData.ar.news.slides.length;
  activeSlide = (activeSlide - 1 + slidesCount) % slidesCount;
  updateSliderPosition();
};

window.nextSlide = function() {
  if (!appData || !appData.ar) return;
  const slidesCount = appData.ar.news.slides.length;
  activeSlide = (activeSlide + 1) % slidesCount;
  updateSliderPosition();
};

window.setSlide = function(idx) {
  activeSlide = idx;
  updateSliderPosition();
};

// Bylaws Accordion Control
window.toggleAccordion = function(idx) {
  const allAccordionItems = document.querySelectorAll('.accordion-item');
  const clickedItem = document.getElementById(`accordion-item-${idx}`);
  if (!clickedItem) return;
  const isCurrentlyOpen = clickedItem.classList.contains('is-open');

  allAccordionItems.forEach(item => {
    item.classList.remove('is-open');
    const panel = item.querySelector('.accordion-panel');
    if (panel) panel.style.maxHeight = null;
  });

  if (!isCurrentlyOpen) {
    clickedItem.classList.add('is-open');
    const panel = clickedItem.querySelector('.accordion-panel');
    if (panel) panel.style.maxHeight = panel.scrollHeight + "px";
  }
};

// Change language
window.switchLang = function(lang) {
  if (lang !== currentLang) {
    currentLang = lang;
    localStorage.setItem('ysc-lang', lang);
    activeSlide = 0; // Reset slider position
    renderTranslations();
    
    // Check if there is an active hash and update it
    const hash = window.location.hash;
    if (hash.startsWith('#member-')) {
      const id = hash.replace('#member-', '');
      openProfile(id);
    }
  }
};

// Toggle mobile menu
window.toggleMobileMenu = function() {
  document.body.classList.toggle('nav-open');
};

// Scroll trigger helpers
window.scrollToSection = function(id) {
  document.body.classList.remove('nav-open');
  const target = document.getElementById(id);
  if (target) {
    const offset = 80;
    const bodyRect = document.body.getBoundingClientRect().top;
    const elementRect = target.getBoundingClientRect().top;
    const elementPosition = elementRect - bodyRect;
    const offsetPosition = elementPosition - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }
};

// Interactive header scrolling
window.addEventListener('scroll', () => {
  const header = document.querySelector('.site-header');
  if (header) {
    if (window.scrollY > 40) {
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }
  }

  // Highlight navigation link corresponding to active section
  const sections = ['home','charter' , 'about', 'vision', 'bylaws', 'leadership', 'offices', 'join', 'news', 'contact'];
  const scrollPosition = window.scrollY + 160;

  for (const s of sections) {
    const el = document.getElementById(s);
    if (el) {
      const top = el.offsetTop;
      const height = el.offsetHeight;
      if (scrollPosition >= top && scrollPosition < top + height) {
        document.querySelectorAll('.nav-link').forEach(link => {
          const onclickAttr = link.getAttribute('onclick') || '';
          link.classList.toggle('is-active', onclickAttr.includes(s));
        });
        break;
      }
    }
  }
});

// Profile Modal Actions
window.openProfile = function(id) {
  if (!appData || !appData.ar) return;
  const t = appData.ar;
  const member = t.leadership.members.find(m => m.id === id);
  if (!member) return;

  // Set hash deep-link
  window.location.hash = `#member-${id}`;

  const modal = document.querySelector('#profile-modal');
  if (!modal) return;
  
  // Inject values
  modal.querySelector('#modal-image').src = member.image;
  modal.querySelector('#modal-image').alt = member.name;
  modal.querySelector('#modal-name').innerText = member.name;
  modal.querySelector('#modal-role').innerText = member.role;
  modal.querySelector('#modal-bio').innerText = member.bio;
  modal.querySelector('#modal-label').innerText = t.leadership.label;
  
  modal.querySelector('#modal-achievements-title').innerText = t.leadership.achievementsTitle;
  modal.querySelector('#modal-socials-title').innerText = t.leadership.socialTitle;

  // Render Achievements list
  const achievementsList = modal.querySelector('#modal-achievements-list');
  if (achievementsList) {
    achievementsList.innerHTML = member.achievements.map(ach => `<li>${ach}</li>`).join('');
  }

  // Render social links
  const socialsList = modal.querySelector('#modal-socials-list');
  if (socialsList) {
    socialsList.innerHTML = member.socials.map(social => {
      let socialIcon = '✦';
      if (social.label.toLowerCase().includes('linkedin')) {
        socialIcon = 'in';
      } else if (social.label.toLowerCase().includes('facebook')) {
        socialIcon = 'f';
      } else if (social.label.toLowerCase().includes('x') || social.label.toLowerCase().includes('twitter')) {
        socialIcon = '𝕏';
      } else if (social.label.toLowerCase().includes('instagram')) {
        socialIcon = 'ig';
      } else if (social.label.toLowerCase().includes('youtube')) {
        socialIcon = 'yt';
      }
      return `
        <a href="${social.url}" target="_blank" rel="noreferrer">
          <span>${socialIcon}</span> ${social.label}
        </a>
      `;
    }).join('');
  }

  // Open modal
  modal.classList.add('is-open');
  document.body.classList.add('modal-open');
};

window.closeProfile = function() {
  const modal = document.querySelector('#profile-modal');
  if (modal) modal.classList.remove('is-open');
  document.body.classList.remove('modal-open');
  
  // Reset hash safely
  window.location.hash = '#leadership';
};

// Close modal on click backdrop
const backdrop = document.querySelector('#profile-backdrop');
if (backdrop) {
  backdrop.addEventListener('click', () => {
    closeProfile();
  });
}

// Handle browser hash changes
window.addEventListener('hashchange', () => {
  const hash = window.location.hash;
  if (hash.startsWith('#member-')) {
    const id = hash.replace('#member-', '');
    openProfile(id);
  } else if (hash === '' || hash === '#') {
    closeProfile();
  }
});

function setupJoinForm() {
  const form = document.querySelector('#join-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (!appData || !appData[currentLang]) return;
    const t = appData[currentLang].join.labels;
    const submitButton = document.querySelector('#join-submit');
    const statusEl = document.querySelector('#join-status');

    const formData = {
      name: document.querySelector('#join-name').value.trim(),
      phone: document.querySelector('#join-phone').value.trim(),
      email: document.querySelector('#join-email').value.trim(),
      age: document.querySelector('#join-age').value.trim(),
      governorate: document.querySelector('#join-governorate').value,
      interest: document.querySelector('#join-interest').value,
      message: document.querySelector('#join-message').value.trim()
    };

    const subject = currentLang === 'ar'
      ? `طلب انضمام جديد - ${formData.name}`
      : `New Membership Request - ${formData.name}`;

    const payload = new FormData();
    payload.append('Full Name', formData.name);
    payload.append('Phone', formData.phone);
    payload.append('Email', formData.email);
    payload.append('Age', formData.age);
    payload.append('Governorate', formData.governorate);
    payload.append('Area of Interest', formData.interest);
    payload.append('Short Bio', formData.message || '-');
    payload.append('_subject', subject);
    payload.append('_template', 'table');
    payload.append('_captcha', 'false');
    payload.append('_replyto', formData.email);

    statusEl.innerText = t.loading;
    statusEl.classList.remove('is-error');
    submitButton.disabled = true;
    submitButton.style.opacity = '0.7';

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: payload
      });

      if (!response.ok) {
        throw new Error(`Email delivery error: ${response.status}`);
      }

      statusEl.innerText = t.status;
      form.reset();
    } catch (error) {
      console.error(error);
      statusEl.innerText = t.error;
      statusEl.classList.add('is-error');
    } finally {
      submitButton.disabled = false;
      submitButton.style.opacity = '1';
    }
  });
}

// // Fetch data from JSONBin and initialize app
// document.addEventListener('DOMContentLoaded', async () => {
//   try {
//     const response = await fetch(
//       'https://api.jsonbin.io/v3/b/6a6763f4da38895dfe968411/latest'
//     );

//     if (!response.ok) {
//       throw new Error(`HTTP Error: ${response.status}`);
//     }

//     const result = await response.json();

//     // لأن البيانات داخل المفتاح ar
//     appData = result.record;
// // console.log(result);
//     renderTranslations();
//     setupJoinForm();

//     // Check initial deep-linking hash
//     const hash = window.location.hash;
//     if (hash.startsWith('#member-')) {
//       const id = hash.replace('#member-', '');
//       openProfile(id);
//     }

//     console.log("✅ Data loaded successfully from JSONBin");

//   } catch (err) {
//     console.error('❌ Error loading JSONBin:', err);
//   }
// });


// Fetch data.json and initialize app
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('./data.json');

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    appData = await response.json();

    renderTranslations();
    setupJoinForm();

    // Check initial deep-linking hash
    const hash = window.location.hash;
    if (hash.startsWith('#member-')) {
      const id = hash.replace('#member-', '');
      openProfile(id);
    }

  } catch (err) {
    console.error('Error loading data.json:', err);
  }
});