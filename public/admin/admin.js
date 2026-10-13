(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var tab = "content";
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
    loadContent();
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
      $("content-view").hidden = tab !== "content";
      $("media-view").hidden = tab === "content";
      if (tab === "content") return;
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
    if (tab === "content") return;
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

  // ---------------- Site content editor ----------------
  // The form is generated from the schema the server sends (server/content-schema.js).
  var schema = [];
  var saved = null;   // content as last saved on the server
  var draft = null;   // content being edited
  var current = 0;    // index of the section on screen
  var dirty = false;

  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  function setDirty(value) {
    dirty = value;
    $("unsaved").hidden = !value;
    if (value) show($("content-msg"), "");
  }

  window.addEventListener("beforeunload", function (e) {
    if (dirty) { e.preventDefault(); e.returnValue = ""; }
  });

  function loadContent() {
    api("GET", "/api/content").then(function (res) {
      schema = res.schema;
      saved = res.content;
      draft = clone(saved);
      setDirty(false);
      renderSections();
      renderSection();
    });
  }

  function renderSections() {
    var nav = $("sections");
    nav.textContent = "";
    schema.forEach(function (section, i) {
      var b = el("button", { type: "button", "class": "section-link" + (i === current ? " active" : "") }, [
        el("span", { text: section.label }),
        el("span", { "class": "ar", text: section.labelAr })
      ]);
      b.addEventListener("click", function () {
        current = i;
        renderSections();
        renderSection();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      nav.appendChild(b);
    });
  }

  function renderSection() {
    var section = schema[current];
    var box = $("section-fields");
    box.textContent = "";
    box.appendChild(el("h2", { text: section.label + " · " + section.labelAr }));
    renderFields(box, section.fields, draft[section.key]);
  }

  function emptyFor(fields) {
    var obj = {};
    fields.forEach(function (f) {
      if (f.type === "text" || f.type === "textarea") obj[f.key] = { ar: "", en: "" };
      else if (f.type === "list") obj[f.key] = [];
      else if (f.type === "select") obj[f.key] = f.options[0];
      else obj[f.key] = "";
    });
    return obj;
  }

  function fieldLabel(f) {
    return el("div", { "class": "field-label" }, [
      el("span", { text: f.label }), el("span", { "class": "ar", text: f.labelAr })
    ]);
  }

  function input(type, value, attrs, onChange) {
    var node = type === "textarea" ? el("textarea", attrs || {}) : el("input", Object.assign({ type: type }, attrs || {}));
    node.value = value || "";
    node.addEventListener("input", function () { onChange(node.value); setDirty(true); });
    return node;
  }

  function renderFields(box, fields, obj) {
    fields.forEach(function (f) {
      var wrap = el("div", { "class": "field field-" + f.type });
      wrap.appendChild(fieldLabel(f));

      if (f.type === "text" || f.type === "textarea") {
        var kind = f.type === "textarea" ? "textarea" : "text";
        wrap.appendChild(el("div", { "class": "bilingual" }, [
          el("label", { "class": "lang-input" }, [
            el("span", { "class": "lang-tag", text: "عربي" }),
            input(kind, obj[f.key].ar, { dir: "rtl", rows: "3" }, function (v) { obj[f.key].ar = v; })
          ]),
          el("label", { "class": "lang-input" }, [
            el("span", { "class": "lang-tag", text: "EN" }),
            input(kind, obj[f.key].en, { dir: "ltr", rows: "3" }, function (v) { obj[f.key].en = v; })
          ])
        ]));
      } else if (f.type === "plain" || f.type === "url") {
        wrap.appendChild(input(f.type === "url" ? "url" : "text", obj[f.key],
          { dir: "auto", placeholder: f.type === "url" ? "https://…" : "" },
          function (v) { obj[f.key] = v; }));
      } else if (f.type === "select") {
        var sel = el("select");
        f.options.forEach(function (o) { sel.appendChild(el("option", { value: o, text: o })); });
        sel.value = obj[f.key];
        sel.addEventListener("change", function () { obj[f.key] = sel.value; setDirty(true); });
        wrap.appendChild(sel);
      } else if (f.type === "image") {
        wrap.appendChild(imageField(obj, f));
      } else if (f.type === "list") {
        wrap.appendChild(listField(obj, f));
      }
      box.appendChild(wrap);
    });
  }

  function imageField(obj, f) {
    var preview = el("img", { src: obj[f.key], alt: "", "class": "image-preview" });
    var file = el("input", { type: "file", accept: "image/png,image/jpeg,image/webp" });
    var note = el("span", { "class": "msg" });
    file.addEventListener("change", function () {
      if (!file.files.length) return;
      var data = new FormData();
      data.append("file", file.files[0]);
      note.textContent = "Uploading… · جاري الرفع";
      note.className = "msg";
      fetch("/api/images", { method: "POST", body: data, credentials: "same-origin" })
        .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || "Upload failed"); return d; }); })
        .then(function (d) {
          obj[f.key] = d.url;
          preview.src = d.url;
          setDirty(true);
          note.textContent = "Uploaded – press Save · تم الرفع – اضغط حفظ";
          note.className = "msg ok";
        })
        .catch(function (err) { note.textContent = err.message; note.className = "msg error"; });
    });
    return el("div", { "class": "image-field" }, [preview, el("div", {}, [file, note])]);
  }

  function itemPreview(item) {
    for (var k in item) {
      var v = item[k];
      if (v && typeof v === "object" && !Array.isArray(v) && (v.ar || v.en)) return v.ar || v.en;
    }
    return "";
  }

  function listField(obj, f) {
    var list = obj[f.key];
    var box = el("div", { "class": "list" });

    function redraw() {
      box.textContent = "";
      list.forEach(function (item, i) {
        var body = el("div", { "class": "list-body" });
        renderFields(body, f.fields, item);

        var up = el("button", { type: "button", "class": "icon-btn", title: "Move up · لأعلى", text: "↑" });
        var down = el("button", { type: "button", "class": "icon-btn", title: "Move down · لأسفل", text: "↓" });
        var del = el("button", { type: "button", "class": "icon-btn danger", title: "Delete · حذف", text: "✕" });
        up.disabled = i === 0;
        down.disabled = i === list.length - 1;
        up.addEventListener("click", function () { move(i, -1); });
        down.addEventListener("click", function () { move(i, 1); });
        del.addEventListener("click", function () {
          if (!confirm("Delete this " + f.itemLabel.toLowerCase() + "? · حذف " + f.itemLabelAr + "؟")) return;
          list.splice(i, 1); setDirty(true); redraw();
        });

        var preview = itemPreview(item);
        var head = el("summary", { "class": "list-head" }, [
          el("span", { "class": "list-title", text: f.itemLabel + " " + (i + 1) + (preview ? " – " + preview : "") }),
          el("span", { "class": "list-actions" }, [up, down, del])
        ]);
        // Buttons inside <summary> shouldn't open/close the item
        [up, down, del].forEach(function (b) { b.addEventListener("click", function (e) { e.preventDefault(); }); });
        var details = el("details", { "class": "list-item" }, [head, body]);
        if (item.__open) { details.open = true; delete item.__open; }
        box.appendChild(details);
      });

      var add = el("button", { type: "button", "class": "btn btn-small add-btn", text: "+ Add " + f.itemLabel.toLowerCase() + " · إضافة " + f.itemLabelAr });
      add.addEventListener("click", function () {
        var item = emptyFor(f.fields);
        item.__open = true;
        list.push(item);
        setDirty(true);
        redraw();
      });
      box.appendChild(add);
    }

    function move(i, delta) {
      var j = i + delta;
      if (j < 0 || j >= list.length) return;
      var tmp = list[i]; list[i] = list[j]; list[j] = tmp;
      setDirty(true);
      redraw();
    }

    redraw();
    return box;
  }

  $("save-content").addEventListener("click", function () {
    var button = $("save-content");
    button.disabled = true;
    api("PUT", "/api/content", draft)
      .then(function (res) {
        saved = res.content;
        draft = clone(saved);
        setDirty(false);
        renderSection();
        show($("content-msg"), "Saved ✔ – the site is updated · تم الحفظ", "ok");
      })
      .catch(function (err) { show($("content-msg"), err.message, "error"); })
      .then(function () { button.disabled = false; });
  });

  $("reset-content").addEventListener("click", function () {
    if (!confirm("Put ALL site texts back to the original? Your edits will be lost.\nاسترجاع كل النصوص الأصلية؟ تعديلاتك هتتمسح.")) return;
    api("POST", "/api/content/reset").then(function (res) {
      saved = res.content;
      draft = clone(saved);
      setDirty(false);
      renderSection();
      show($("content-msg"), "Restored ✔ · تم الاسترجاع", "ok");
    }).catch(function (err) { show($("content-msg"), err.message, "error"); });
  });

  // ---------------- Start ----------------
  api("GET", "/api/me").then(function (me) { if (me.loggedIn) showAdmin(); else showLogin(); })
    .catch(showLogin);
})();
