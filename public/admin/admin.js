(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var tab = "certificate";
  var media = { certificates: [], videos: [] };

  var TEXT = {
    certificate: {
      add: "Add a certificate · إضافة شهادة",
      list: "Certificates on the site · الشهادات على الموقع",
      fileLabel: "File: image (JPG, PNG, WebP) or PDF · صورة أو PDF",
      accept: "image/jpeg,image/png,image/webp,application/pdf"
    },
    video: {
      add: "Add a video · إضافة فيديو",
      list: "Videos on the site · الفيديوهات على الموقع",
      fileLabel: "Video file (MP4, WebM, MOV) · ملف فيديو",
      accept: "video/mp4,video/webm,video/quicktime"
    }
  };

  function show(msgEl, text, kind) {
    msgEl.textContent = text;
    msgEl.className = "msg " + (kind || "");
    msgEl.hidden = !text;
  }

  function api(method, url, body) {
    var opts = { method: method, headers: {}, credentials: "same-origin" };
    if (body !== undefined) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    return fetch(url, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (r.status === 401 && url !== "/api/login") showLogin();
        if (!r.ok) throw new Error(data.error || "Error " + r.status);
        return data;
      });
    });
  }

  // ---------------- Login ----------------
  function showLogin() {
    $("admin-view").hidden = true;
    $("login-view").hidden = false;
  }

  function showAdmin() {
    $("login-view").hidden = true;
    $("admin-view").hidden = false;
    load();
  }

  $("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var form = e.target;
    var button = form.querySelector("button");
    button.disabled = true;
    show($("login-error"), "");
    api("POST", "/api/login", { password: form.password.value })
      .then(function () { form.reset(); showAdmin(); })
      .catch(function (err) { show($("login-error"), err.message, "error"); })
      .then(function () { button.disabled = false; });
  });

  $("logout").addEventListener("click", function () {
    api("POST", "/api/logout").then(showLogin);
  });

  // ---------------- Tabs ----------------
  document.querySelectorAll(".tab").forEach(function (button) {
    button.addEventListener("click", function () {
      tab = button.getAttribute("data-tab");
      document.querySelectorAll(".tab").forEach(function (b) { b.classList.toggle("active", b === button); });
      $("add-title").textContent = TEXT[tab].add;
      $("list-title").textContent = TEXT[tab].list;
      $("file-label").textContent = TEXT[tab].fileLabel;
      $("file-input").accept = TEXT[tab].accept;
      $("add-form").reset();
      $("video-source").hidden = tab !== "video";
      updateSource();
      show($("add-msg"), "");
      render();
    });
  });

  function updateSource() {
    var youtube = tab === "video" && $("add-form").source.value === "youtube";
    $("file-field").hidden = youtube;
    $("youtube-field").hidden = !youtube;
  }
  document.querySelectorAll('input[name="source"]').forEach(function (r) {
    r.addEventListener("change", updateSource);
  });

  // ---------------- Add ----------------
  $("add-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var form = e.target;
    var msg = $("add-msg");
    var youtube = tab === "video" && form.source.value === "youtube";

    if (!form.titleAr.value.trim() && !form.titleEn.value.trim()) {
      return show(msg, "Enter a title (Arabic or English) · اكتب عنوان", "error");
    }
    if (youtube ? !form.youtube.value.trim() : !form.file.files.length) {
      return show(msg, youtube ? "Paste a YouTube link · ضع رابط يوتيوب" : "Choose a file · اختر ملف", "error");
    }

    var data = new FormData();
    data.append("titleAr", form.titleAr.value);
    data.append("titleEn", form.titleEn.value);
    if (youtube) data.append("youtube", form.youtube.value);
    else data.append("file", form.file.files[0]);

    // XHR (not fetch) so we can show upload progress for big videos
    var xhr = new XMLHttpRequest();
    var progress = $("progress");
    var button = $("add-button");
    xhr.open("POST", "/api/media/" + tab);
    xhr.upload.onprogress = function (ev) {
      if (!ev.lengthComputable) return;
      var pct = Math.round((ev.loaded / ev.total) * 100);
      progress.querySelector(".bar").style.width = pct + "%";
      progress.querySelector("span").textContent = pct + "%";
    };
    xhr.onload = function () {
      var res = {};
      try { res = JSON.parse(xhr.responseText); } catch (err) { /* not JSON */ }
      done();
      if (xhr.status === 401) return showLogin();
      if (xhr.status >= 300) return show(msg, res.error || "Upload failed (" + xhr.status + ")", "error");
      form.reset();
      updateSource();
      show(msg, "Added ✔ · تمت الإضافة", "ok");
      load();
    };
    xhr.onerror = function () {
      done();
      show(msg, "Upload failed – check your connection · فشل الرفع", "error");
    };
    function done() {
      button.disabled = false;
      progress.hidden = true;
    }

    button.disabled = true;
    show(msg, "");
    progress.querySelector(".bar").style.width = "0";
    progress.querySelector("span").textContent = "0%";
    progress.hidden = youtube;
    xhr.send(data);
  });

  // ---------------- List / edit / delete ----------------
  function load() {
    api("GET", "/api/media").then(function (data) { media = data; render(); });
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { node.appendChild(c); });
    return node;
  }

  function thumb(item) {
    if (item.youtubeId) return el("img", { src: "https://i.ytimg.com/vi/" + item.youtubeId + "/mqdefault.jpg", alt: "" });
    if (item.mime === "application/pdf") return el("span", { text: "PDF" });
    if (item.type === "video") return el("video", { src: item.url, preload: "metadata", muted: "" });
    return el("img", { src: item.url, alt: "" });
  }

  function render() {
    var list = tab === "certificate" ? media.certificates : media.videos;
    var ul = $("items");
    ul.textContent = "";
    $("empty").hidden = list.length > 0;

    list.forEach(function (item) {
      var ar = el("input", { type: "text", value: item.titleAr || "", dir: "rtl", placeholder: "العنوان بالعربي", maxlength: "200" });
      var en = el("input", { type: "text", value: item.titleEn || "", dir: "ltr", placeholder: "Title in English", maxlength: "200" });
      var save = el("button", { type: "button", "class": "btn btn-small", text: "Save · حفظ" });
      var del = el("button", { type: "button", "class": "btn btn-small btn-danger", text: "Delete · حذف" });
      var open = el("a", {
        "class": "thumb", target: "_blank", rel: "noopener",
        href: item.youtubeId ? "https://www.youtube.com/watch?v=" + item.youtubeId : item.url
      }, [thumb(item)]);

      save.addEventListener("click", function () {
        save.disabled = true;
        api("PATCH", "/api/media/" + item.id, { titleAr: ar.value, titleEn: en.value })
          .then(function (updated) {
            item.titleAr = updated.titleAr;
            item.titleEn = updated.titleEn;
            save.textContent = "Saved ✔";
            setTimeout(function () { save.textContent = "Save · حفظ"; }, 1500);
          })
          .catch(function (err) { alert(err.message); })
          .then(function () { save.disabled = false; });
      });

      del.addEventListener("click", function () {
        if (!confirm("Delete this from the website? · حذف من الموقع؟")) return;
        del.disabled = true;
        api("DELETE", "/api/media/" + item.id)
          .then(load)
          .catch(function (err) { alert(err.message); del.disabled = false; });
      });

      ul.appendChild(el("li", { "class": "item" }, [
        open,
        el("div", { "class": "item-titles" }, [ar, en]),
        el("div", { "class": "item-actions" }, [save, del])
      ]));
    });
  }

  // ---------------- Start ----------------
  api("GET", "/api/me").then(function (me) { if (me.loggedIn) showAdmin(); else showLogin(); })
    .catch(showLogin);
})();
