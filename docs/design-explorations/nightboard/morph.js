/**
 * Keyed DOM morphing — render by diffing, not by replacing.
 *
 * The board used to redraw with `innerHTML`, which destroys every node on
 * every state change. That is why nothing could animate (a restarted animation
 * is an invisible one), why scroll positions and hover states vanished on the
 * live tick, and why the input needed a caret-restoration dance. Morphing
 * walks the freshly rendered tree against the live one and touches only what
 * differs, so an unchanged node — and everything the browser hangs off it —
 * survives.
 *
 * Matching is by `data-key` where the renderer provides one (posts by id,
 * items by path) and by tag-in-order where it does not. A keyed child that
 * appears is inserted, one that disappears is removed, and the rest are moved
 * — not rebuilt — so a CSS animation started on arrival keeps running.
 */
(function () {
  "use strict";

  function keyOf(node) {
    return node.nodeType === 1 ? node.getAttribute("data-key") : null;
  }

  function sameKind(a, b) {
    if (a.nodeType !== b.nodeType) return false;
    if (a.nodeType === 1 && a.tagName !== b.tagName) return false;
    var ka = keyOf(a), kb = keyOf(b);
    return ka === kb || (!ka && !kb);
  }

  function syncAttributes(live, next) {
    var i, name;
    for (i = live.attributes.length - 1; i >= 0; i--) {
      name = live.attributes[i].name;
      if (!next.hasAttribute(name)) live.removeAttribute(name);
    }
    for (i = 0; i < next.attributes.length; i++) {
      name = next.attributes[i].name;
      var value = next.attributes[i].value;
      if (live.getAttribute(name) !== value) live.setAttribute(name, value);
    }
  }

  function morphNode(live, next) {
    if (live.nodeType === 3) {
      if (live.nodeValue !== next.nodeValue) live.nodeValue = next.nodeValue;
      return;
    }
    syncAttributes(live, next);
    // A form control's value is state the user owns, not markup: never sync it
    // from the render. The element carries data-morph-keep to say so.
    if (live.hasAttribute("data-morph-keep")) return;
    morphChildren(live, next);
  }

  function morphChildren(live, next) {
    var want = Array.prototype.slice.call(next.childNodes);
    var byKey = {};
    var i, k;
    for (i = 0; i < live.childNodes.length; i++) {
      k = keyOf(live.childNodes[i]);
      if (k) byKey[k] = live.childNodes[i];
    }

    var cursor = live.firstChild;
    for (i = 0; i < want.length; i++) {
      var target = want[i];
      var match = null;
      k = keyOf(target);

      if (k && byKey[k]) {
        match = byKey[k];
      } else if (cursor && !keyOf(cursor) && sameKind(cursor, target)) {
        match = cursor;
      }

      if (!match) {
        // New content. Importing the rendered node directly is fine: it is
        // detached output nobody holds a reference to.
        live.insertBefore(target, cursor);
        continue;
      }
      if (match !== cursor) live.insertBefore(match, cursor);
      else cursor = cursor.nextSibling;
      morphNode(match, target);
    }

    // Anything after the cursor was not asked for this frame.
    while (cursor) {
      var drop = cursor;
      cursor = cursor.nextSibling;
      live.removeChild(drop);
    }
    // Keyed nodes that were skipped over (their key vanished) are also gone.
    for (k in byKey) {
      if (byKey[k].parentNode === live) {
        var still = false;
        for (i = 0; i < want.length; i++) if (keyOf(want[i]) === k) { still = true; break; }
        if (!still) live.removeChild(byKey[k]);
      }
    }
  }

  /** Morph `live`'s children to match the given HTML string. */
  function morph(live, html) {
    var staging = live.ownerDocument.createElement(live.tagName);
    staging.innerHTML = html;
    morphChildren(live, staging);
  }

  window.NB_MORPH = { morph: morph };
})();
