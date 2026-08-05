/**
 * File upload / attachments for Nightboard chat context.
 *
 * The prompt can take files (picker, drag-drop, paste). Attachments travel with
 * the next send as structured chat context — text is inlined (capped), images
 * and binaries contribute metadata (+ optional data-URL preview for images).
 *
 * Soft-fail: private mode, oversized files, and read errors never throw into
 * the shell; they surface as chip errors the user can dismiss.
 */
(function () {
  "use strict";

  var MAX_FILES = 8;
  var MAX_BYTES = 2 * 1024 * 1024; // 2 MiB read cap per file
  var MAX_TEXT = 32000;
  var MAX_IMAGE_PREVIEW = 512 * 1024; // data-URL only when small enough

  function nextId() {
    return "att-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e5).toString(36);
  }

  function kindFor(file) {
    var type = String((file && file.type) || "").toLowerCase();
    var name = String((file && file.name) || "").toLowerCase();
    if (type.indexOf("image/") === 0) return "image";
    if (type.indexOf("text/") === 0 || type === "application/json" ||
        type === "application/xml" || type === "application/javascript" ||
        type === "application/typescript" || type === "application/x-yaml" ||
        type === "application/yaml" || type === "application/csv" ||
        /\.(md|txt|json|js|ts|tsx|jsx|css|html|htm|svg|csv|yml|yaml|toml|ini|log|sh|py|rs|go|java|c|h|cpp|rb|php|xml|sql|env|feature|gherkin)$/i.test(name)) {
      return "text";
    }
    return "file";
  }

  function formatSize(n) {
    n = Number(n) || 0;
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(n < 10 * 1024 ? 1 : 0) + " KB";
    return (n / (1024 * 1024)).toFixed(1) + " MB";
  }

  function glyphFor(kind) {
    if (kind === "image") return "▣";
    if (kind === "text") return "▤";
    return "◈";
  }

  /**
   * Lightweight metadata for transcript / UI (no bulk payloads).
   */
  function meta(att) {
    att = att || {};
    return {
      id: att.id,
      name: att.name,
      size: att.size,
      type: att.type,
      kind: att.kind,
      bytes: att.bytes,
      chars: att.text ? att.text.length : 0,
      error: att.error || null,
      truncated: !!att.truncated,
    };
  }

  function chipLabel(att) {
    att = att || {};
    var name = att.name || "file";
    if (name.length > 28) name = name.slice(0, 18) + "…" + name.slice(-6);
    return glyphFor(att.kind) + " " + name +
      (att.error ? " !" : "") +
      " · " + formatSize(att.size || att.bytes || 0);
  }

  /**
   * Read one File into an attachment record.
   * @returns {Promise<object>}
   */
  function readFile(file) {
    return new Promise(function (resolve) {
      if (!file) {
        resolve({
          id: nextId(), name: "unknown", size: 0, type: "", kind: "file",
          error: "no file", text: null, dataUrl: null, bytes: 0,
        });
        return;
      }
      var kind = kindFor(file);
      var base = {
        id: nextId(),
        name: file.name || "untitled",
        size: typeof file.size === "number" ? file.size : 0,
        type: file.type || "application/octet-stream",
        kind: kind,
        text: null,
        dataUrl: null,
        bytes: typeof file.size === "number" ? file.size : 0,
        truncated: false,
        error: null,
      };

      if (base.size > MAX_BYTES) {
        // Still keep the chip so the model knows the file existed; no content.
        base.error = "too large (>" + formatSize(MAX_BYTES) + ") — name only";
        base.kind = kind;
        resolve(base);
        return;
      }

      var reader = new FileReader();
      reader.onerror = function () {
        base.error = "could not read file";
        resolve(base);
      };

      if (kind === "text") {
        reader.onload = function () {
          var text = String(reader.result || "");
          if (text.length > MAX_TEXT) {
            base.text = text.slice(0, MAX_TEXT);
            base.truncated = true;
          } else {
            base.text = text;
          }
          resolve(base);
        };
        try { reader.readAsText(file); } catch (e) {
          base.error = (e && e.message) || "read failed";
          resolve(base);
        }
        return;
      }

      if (kind === "image" && base.size <= MAX_IMAGE_PREVIEW) {
        reader.onload = function () {
          base.dataUrl = String(reader.result || "") || null;
          resolve(base);
        };
        try { reader.readAsDataURL(file); } catch (e) {
          base.error = (e && e.message) || "read failed";
          resolve(base);
        }
        return;
      }

      // Binary / large image: metadata only (honest about no OCR / no bytes).
      if (kind === "image") {
        base.error = null; // not an error — just no preview bytes
      }
      resolve(base);
    });
  }

  /**
   * Read many Files; respects MAX_FILES when `existing` count is passed.
   * @param {FileList|File[]} files
   * @param {object} opts { existing?: number }
   * @returns {Promise<object[]>}
   */
  function readFiles(files, opts) {
    opts = opts || {};
    var list = Array.prototype.slice.call(files || []);
    var existing = opts.existing || 0;
    var room = Math.max(0, MAX_FILES - existing);
    if (!list.length) return Promise.resolve([]);
    if (room <= 0) {
      return Promise.resolve([{
        id: nextId(),
        name: "(limit)",
        size: 0,
        type: "",
        kind: "file",
        error: "max " + MAX_FILES + " attachments",
        text: null,
        dataUrl: null,
        bytes: 0,
      }]);
    }
    var slice = list.slice(0, room);
    return Promise.all(slice.map(readFile));
  }

  /**
   * Format attachments as chat context for the agent / transcript expansion.
   * Plain text, terminal-honest.
   */
  function formatContext(atts) {
    atts = atts || [];
    if (!atts.length) return "";
    var lines = ["[attachments: " + atts.length + " file" + (atts.length === 1 ? "" : "s") + "]"];
    atts.forEach(function (a, i) {
      var head = "--- " + (i + 1) + ". " + (a.name || "file") +
        " (" + (a.type || a.kind || "file") + ", " + formatSize(a.size || a.bytes || 0) + ")" +
        (a.truncated ? " truncated" : "") +
        (a.error ? " · " + a.error : "") +
        " ---";
      lines.push(head);
      if (a.kind === "text" && a.text) {
        lines.push(a.text);
      } else if (a.kind === "image") {
        lines.push(a.dataUrl
          ? "[image attached — " + (a.type || "image") + "; preview available in UI]"
          : "[image attached — " + (a.type || "image") + ", " + formatSize(a.size) + "; no preview bytes]");
      } else {
        lines.push("[binary file — name and type only; content not inlined]");
      }
    });
    lines.push("[/attachments]");
    return lines.join("\n");
  }

  /**
   * Compose user text + attachment context for the model.
   */
  function composeInput(text, atts) {
    var body = String(text || "").trim();
    var ctx = formatContext(atts);
    if (!ctx) return body;
    if (!body) return "Using the attached files as context.\n\n" + ctx;
    return body + "\n\n" + ctx;
  }

  /**
   * Accept only real File / Blob-like objects from a DataTransfer.
   */
  function filesFromDataTransfer(dt) {
    if (!dt) return [];
    if (dt.files && dt.files.length) return Array.prototype.slice.call(dt.files);
    var out = [];
    if (dt.items) {
      for (var i = 0; i < dt.items.length; i++) {
        var it = dt.items[i];
        if (it.kind === "file") {
          var f = it.getAsFile && it.getAsFile();
          if (f) out.push(f);
        }
      }
    }
    return out;
  }

  window.NB_ATTACH = {
    MAX_FILES: MAX_FILES,
    MAX_BYTES: MAX_BYTES,
    MAX_TEXT: MAX_TEXT,
    kindFor: kindFor,
    formatSize: formatSize,
    glyphFor: glyphFor,
    meta: meta,
    chipLabel: chipLabel,
    readFile: readFile,
    readFiles: readFiles,
    formatContext: formatContext,
    composeInput: composeInput,
    filesFromDataTransfer: filesFromDataTransfer,
  };
})();
