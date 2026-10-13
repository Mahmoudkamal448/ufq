"use strict";

/*
 * Builds the public home page from the editable content.
 * Every translatable element gets data-i18n="<path into content>", so the
 * browser can switch language without reloading (see public/assets/js/main.js).
 */

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderPage(content, lang) {
  const c = content;
  const pick = (v) => (v ? v[lang] || v.ar || v.en || "" : "");
  // <tag data-i18n="path" ...>text</tag>
  const T = (tag, path, value, attrs = "") =>
    `<${tag} data-i18n="${path}"${attrs ? " " + attrs : ""}>${esc(pick(value))}</${tag}>`;

  const dir = lang === "ar" ? "rtl" : "ltr";
  const logo = esc(c.brand.logo);
  const name = esc(c.brand.name);
  const title = `${c.brand.name} – ${pick(c.brand.tagline)}`;

  const services = c.services.items.map((s, i) => `
      <article class="service-card">
        <div class="service-num">${i + 1}</div>
        ${T("h3", `services.items.${i}.title`, s.title)}
        <ul>
          ${s.points.map((p, j) => T("li", `services.items.${i}.points.${j}.text`, p.text)).join("\n          ")}
        </ul>
      </article>`).join("\n");

  const standards = c.certificates.standards.map((s, i) => `
      <figure class="cert-card">
        <div class="cert-badge${s.color === "blue" ? " badge-blue" : ""}"><span>${esc(s.top) || "&nbsp;"}</span>${T("strong", `certificates.standards.${i}.main`, s.main)}</div>
        ${T("figcaption", `certificates.standards.${i}.caption`, s.caption)}
      </figure>`).join("\n");

  const paragraphs = c.about.paragraphs.map((p, i) => T("p", `about.paragraphs.${i}.text`, p.text)).join("\n      ");
  const why = c.about.why.map((w, i) => T("li", `about.why.${i}.text`, w.text)).join("\n        ");

  const ct = c.contact;
  const tel = ct.phone.replace(/[^\d+]/g, "").replace(/^0/, "+20");
  const wa = ct.whatsapp.replace(/\D/g, "");
  const socials = [
    ["facebook", "Facebook"],
    ["instagram", "Instagram"],
    ["linkedin", "LinkedIn"]
  ].filter(([k]) => ct[k]).map(([k, label]) =>
    `<a class="social social-${k}" href="${esc(ct[k])}" target="_blank" rel="noopener">${label}</a>`
  ).join("\n        ");

  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(pick(c.brand.metaDescription))}">
  <meta name="theme-color" content="#143562">
  <link rel="icon" href="/assets/img/favicon.png" type="image/png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>

<!-- ============ HEADER ============ -->
<header class="site-header" id="top">
  <div class="container header-inner">
    <a href="#home" class="brand" aria-label="${name}">
      <img src="${logo}" alt="${name} logo" class="brand-logo" width="44" height="44">
      <span class="brand-text">
        <strong>${name}</strong>
        ${T("small", "brand.tagline", c.brand.tagline)}
      </span>
    </a>

    <nav class="main-nav" id="main-nav" aria-label="Main">
      ${T("a", "nav.home", c.nav.home, 'href="#home"')}
      ${T("a", "nav.services", c.nav.services, 'href="#services"')}
      ${T("a", "nav.certificates", c.nav.certificates, 'href="#certificates"')}
      ${T("a", "nav.videos", c.nav.videos, 'href="#videos" id="nav-videos" hidden')}
      ${T("a", "nav.about", c.nav.about, 'href="#about"')}
      ${T("a", "nav.contact", c.nav.contact, 'href="#contact"')}
    </nav>

    <div class="header-actions">
      <button type="button" class="lang-toggle" id="lang-toggle" aria-label="Switch language">${lang === "ar" ? "EN" : "عربي"}</button>
      <button type="button" class="menu-toggle" id="menu-toggle" aria-label="Menu" aria-controls="main-nav" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
</header>

<main>

<!-- ============ HOME / HERO ============ -->
<section class="hero" id="home">
  <div class="container hero-inner">
    <div class="hero-text">
      ${c.hero.tag ? `<p class="hero-tag">${esc(c.hero.tag)}</p>` : ""}
      ${T("h1", "hero.title", c.hero.title)}
      ${T("p", "hero.lead", c.hero.lead, 'class="hero-lead"')}
      <div class="hero-buttons">
        ${T("a", "hero.cta1", c.hero.cta1, 'href="#services" class="btn btn-primary"')}
        ${T("a", "hero.cta2", c.hero.cta2, 'href="#contact" class="btn btn-outline"')}
      </div>
    </div>
    <div class="hero-visual">
      <img src="${logo}" alt="${name}" class="hero-logo" width="260" height="260">
      ${T("p", "hero.slogan", c.hero.slogan, 'class="hero-slogan"')}
    </div>
  </div>
</section>

<!-- ============ SERVICES ============ -->
<section class="section" id="services">
  <div class="container">
    <header class="section-head">
      ${T("h2", "services.title", c.services.title)}
      ${T("p", "services.subtitle", c.services.subtitle)}
    </header>
    <div class="services-grid">
${services}
    </div>
  </div>
</section>

<!-- ============ CERTIFICATES ============ -->
<section class="section section-alt" id="certificates">
  <div class="container">
    <header class="section-head">
      ${T("h2", "certificates.title", c.certificates.title)}
      ${T("p", "certificates.subtitle", c.certificates.subtitle)}
    </header>

    <div id="uploaded-certs" hidden>
      ${T("h3", "certificates.oursTitle", c.certificates.oursTitle, 'class="sub-head"')}
      <div class="media-grid" id="uploaded-certs-grid"></div>
      ${c.certificates.standards.length ? T("h3", "certificates.standardsTitle", c.certificates.standardsTitle, 'class="sub-head"') : ""}
    </div>

    <div class="certs-grid">
${standards}
    </div>
  </div>
</section>

<!-- ============ VIDEOS (hidden while empty) ============ -->
<section class="section" id="videos" hidden>
  <div class="container">
    <header class="section-head">
      ${T("h2", "videos.title", c.videos.title)}
      ${T("p", "videos.subtitle", c.videos.subtitle)}
    </header>
    <div class="video-grid" id="videos-grid"></div>
  </div>
</section>

<!-- ============ ABOUT ============ -->
<section class="section" id="about">
  <div class="container about-grid">
    <div class="about-text">
      ${T("h2", "about.title", c.about.title)}
      ${paragraphs}
      ${c.about.statNumber ? `<div class="about-stat">
        <strong>${esc(c.about.statNumber)}</strong>
        ${T("span", "about.statLabel", c.about.statLabel)}
      </div>` : ""}
    </div>

    ${c.about.why.length ? `<div class="why">
      ${T("h3", "about.whyTitle", c.about.whyTitle)}
      <ul class="why-list">
        ${why}
      </ul>
    </div>` : ""}
  </div>
</section>

<!-- ============ CONTACT ============ -->
<section class="section contact" id="contact">
  <div class="container contact-inner">
    ${T("h2", "contact.title", c.contact.title)}
    ${T("p", "contact.text", c.contact.text)}
    <div class="contact-buttons">
      ${ct.phone ? `<a class="btn btn-light" href="tel:${esc(tel)}">
        ${T("span", "contact.callLabel", ct.callLabel)}
        <span class="phone" dir="ltr">${esc(ct.phone)}</span>
      </a>` : ""}
      ${wa ? T("a", "contact.whatsappLabel", ct.whatsappLabel, `class="btn btn-whatsapp" href="https://wa.me/${wa}" target="_blank" rel="noopener"`) : ""}
      ${ct.email ? `<a class="btn btn-outline" href="mailto:${esc(ct.email)}" dir="ltr">${esc(ct.email)}</a>` : ""}
    </div>
    ${socials ? `<div class="socials">
        ${socials}
    </div>` : ""}
    ${pick(ct.address) ? T("p", "contact.address", ct.address, 'class="address"') : ""}
  </div>
</section>

</main>

<footer class="site-footer">
  <div class="container footer-inner">
    <div class="brand brand-footer">
      <img src="${logo}" alt="" width="36" height="36">
      <span><strong>${name}</strong> – ${T("span", "brand.tagline", c.brand.tagline)}</span>
    </div>
    ${T("p", "footer.slogan", c.footer.slogan)}
    <p class="copy">© <span id="year">${new Date().getFullYear()}</span> ${name}. ${T("span", "footer.rights", c.footer.rights)}</p>
  </div>
</footer>

<div class="lightbox" id="lightbox" hidden>
  <button type="button" class="lightbox-close" aria-label="Close">×</button>
  <img alt="">
</div>

<a href="#top" class="to-top" aria-label="Back to top">↑</a>

<script type="application/json" id="ufq-content">${JSON.stringify({ content: c, title: { ar: `${c.brand.name} – ${c.brand.tagline.ar || c.brand.tagline.en}`, en: `${c.brand.name} – ${c.brand.tagline.en || c.brand.tagline.ar}` } }).replace(/</g, "\\u003c")}</script>
<script src="/assets/js/main.js"></script>
</body>
</html>
`;
}

module.exports = { renderPage, esc };
