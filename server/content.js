"use strict";

const fsp = require("fs").promises;
const { SCHEMA, DEFAULTS } = require("./content-schema");

const MAX = { text: 300, textarea: 3000, plain: 200, url: 500 };
const MAX_LIST_ITEMS = 100;

function str(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function emptyValue(field) {
  switch (field.type) {
    case "text":
    case "textarea": return { ar: "", en: "" };
    case "list": return [];
    case "select": return field.options[0];
    default: return "";
  }
}

// Returns a clean copy of `input` that matches `fields` exactly.
// Anything missing falls back to `defaults`; anything unknown is dropped.
function clean(fields, input, defaults) {
  const src = input && typeof input === "object" ? input : {};
  const def = defaults && typeof defaults === "object" ? defaults : {};
  const out = {};
  for (const f of fields) {
    const has = Object.prototype.hasOwnProperty.call(src, f.key);
    const v = has ? src[f.key] : def[f.key] !== undefined ? def[f.key] : emptyValue(f);
    switch (f.type) {
      case "text":
      case "textarea": {
        const o = v && typeof v === "object" ? v : {};
        out[f.key] = { ar: str(o.ar, MAX[f.type]), en: str(o.en, MAX[f.type]) };
        break;
      }
      case "plain":
        out[f.key] = str(v, MAX.plain);
        break;
      case "url": {
        const s = str(v, MAX.url);
        out[f.key] = /^https?:\/\/[^\s"'<>]+$/i.test(s) ? s : "";
        break;
      }
      case "image": {
        const s = str(v, 300);
        const ok = /^\/(uploads|assets)\/[A-Za-z0-9._\/-]+$/.test(s) && !s.includes("..");
        out[f.key] = ok ? s : def[f.key] || "";
        break;
      }
      case "select":
        out[f.key] = f.options.includes(v) ? v : f.options[0];
        break;
      case "list":
        out[f.key] = (Array.isArray(v) ? v : [])
          .slice(0, MAX_LIST_ITEMS)
          .map((item) => clean(f.fields, item, {}));
        break;
      default:
        break;
    }
  }
  return out;
}

function cleanContent(input) {
  const src = input && typeof input === "object" ? input : {};
  const out = {};
  for (const section of SCHEMA) {
    out[section.key] = clean(section.fields, src[section.key], DEFAULTS[section.key]);
  }
  return out;
}

function createStore(file) {
  let cache = null;

  async function get() {
    if (cache) return cache;
    let stored = {};
    try {
      stored = JSON.parse(await fsp.readFile(file, "utf8"));
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
      stored = DEFAULTS;
    }
    cache = cleanContent(stored);
    return cache;
  }

  async function save(input) {
    const content = cleanContent(input);
    const tmp = file + ".tmp";
    await fsp.writeFile(tmp, JSON.stringify(content, null, 2));
    await fsp.rename(tmp, file);
    cache = content;
    return content;
  }

  async function reset() {
    await fsp.unlink(file).catch((err) => { if (err.code !== "ENOENT") throw err; });
    cache = null;
    return get();
  }

  return { get, save, reset };
}

module.exports = { createStore, cleanContent, SCHEMA, DEFAULTS };
