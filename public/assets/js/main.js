(function () {
  "use strict";

  var STORAGE_KEY = "ufq-lang";
  var nodes = document.querySelectorAll("[data-i18n]");

  // All site text, in both languages, is embedded in the page by the server.
  var data = JSON.parse(document.getElementById("ufq-content").textContent);

  function lookup(path) {
    return path.split(".").reduce(function (obj, key) { return obj == null ? obj : obj[key]; }, data.content);
  }

  function setLang(lang) {
    if (lang !== "en") lang = "ar";
    var other = lang === "ar" ? "en" : "ar";
    nodes.forEach(function (el) {
      var value = lookup(el.getAttribute("data-i18n"));
      if (value) el.textContent = value[lang] || value[other] || "";
    });
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.title = data.title[lang];
    toggle.textContent = lang === "ar" ? "EN" : "عربي";
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* storage blocked */ }
    renderMedia();
  }

  var toggle = document.getElementById("lang-toggle");
  toggle.addEventListener("click", function () {
    setLang(document.documentElement.lang === "ar" ? "en" : "ar");
  });

  // Initial language: ?lang=en|ar  >  saved choice  >  Arabic
  var initial = new URLSearchParams(location.search).get("lang");
  if (!initial) {
    try { initial = localStorage.getItem(STORAGE_KEY); } catch (e) { initial = null; }
  }
  setLang(initial || document.documentElement.lang);

  // Mobile menu
  var menuBtn = document.getElementById("menu-toggle");
  var nav = document.getElementById("main-nav");
  menuBtn.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });
  nav.addEventListener("click", function (e) {
    if (e.target.tagName === "A") {
      nav.classList.remove("open");
      menuBtn.setAttribute("aria-expanded", "false");
    }
  });

  // Highlight the nav link of the section on screen
  var links = nav.querySelectorAll("a");
  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.toggle("active", a.getAttribute("href") === "#" + entry.target.id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("main section[id]").forEach(function (s) { observer.observe(s); });
  }


  // ---------------------------------------------------------------------
  // Certificates and videos uploaded from the admin page
  // ---------------------------------------------------------------------
  var media = null;

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { node.appendChild(c); });
    return node;
  }

  function title(item) {
    var ar = document.documentElement.lang === "ar";
    return (ar ? item.titleAr || item.titleEn : item.titleEn || item.titleAr) || "";
  }

  function renderMedia() {
    if (!media) return;
    var ar = document.documentElement.lang === "ar";

    var certBox = document.getElementById("uploaded-certs");
    var certGrid = document.getElementById("uploaded-certs-grid");
    certGrid.textContent = "";
    media.certificates.forEach(function (c) {
      var isPdf = c.mime === "application/pdf";
      var thumb = isPdf
        ? el("div", { "class": "media-pdf" }, [el("span", { text: "PDF" })])
        : el("img", { src: c.url, alt: title(c), loading: "lazy" });
      var link = el("a", {
        href: c.url, "class": "media-card", target: "_blank", rel: "noopener",
        "data-image": isPdf ? "" : c.url
      }, [thumb, el("span", { "class": "media-title", text: title(c) || (ar ? "فتح الملف" : "Open file") })]);
      certGrid.appendChild(link);
    });
    certBox.hidden = media.certificates.length === 0;

    var videoSection = document.getElementById("videos");
    var videoGrid = document.getElementById("videos-grid");
    videoGrid.textContent = "";
    media.videos.forEach(function (v) {
      var player = v.youtubeId
        ? el("iframe", {
            src: "https://www.youtube-nocookie.com/embed/" + v.youtubeId,
            title: title(v), loading: "lazy", allowfullscreen: "",
            allow: "accelerometer; encrypted-media; gyroscope; picture-in-picture"
          })
        : el("video", { src: v.url, controls: "", preload: "metadata", playsinline: "" });
      videoGrid.appendChild(el("figure", { "class": "video-card" }, [
        el("div", { "class": "video-frame" }, [player]),
        el("figcaption", { text: title(v) })
      ]));
    });
    videoSection.hidden = media.videos.length === 0;
    document.getElementById("nav-videos").hidden = media.videos.length === 0;
  }

  fetch("/api/media")
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) { if (data) { media = data; renderMedia(); } })
    .catch(function () { /* site still works without uploads */ });

  // Click a certificate image to view it large
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = lightbox.querySelector("img");
  document.getElementById("uploaded-certs-grid").addEventListener("click", function (e) {
    var card = e.target.closest("a[data-image]");
    if (!card || !card.getAttribute("data-image")) return;
    e.preventDefault();
    lightboxImg.src = card.getAttribute("data-image");
    lightboxImg.alt = card.textContent;
    lightbox.hidden = false;
  });
  lightbox.addEventListener("click", function () { lightbox.hidden = true; });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") lightbox.hidden = true; });
})();
