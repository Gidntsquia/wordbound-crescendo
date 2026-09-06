// DRAG TO REORDER within one row of tiles (the case, or the composing stick).
//
// Pointer events, not HTML5 drag-and-drop: the sandbox is played on a phone.
// A press that travels less than SLOP is still a tap (the tile's onClick
// fires as usual); past it the press becomes a drag, a GHOST copy of the tile
// follows the finger, the tile itself goes hollow in place, and the row shows
// a rule where the tile would land. Letting go calls onReorder(row, from, to)
// and swallows the click that would otherwise follow.
//
// Nothing here sets `transform` on a .sb-tile -- the ghost is its own element
// on <body>, and the tile's slide into its new place is the FLIP the caller
// already owns (it is handed the ghost's last rect to slide from).
var SLOP = 6;

export function createDragReorder(opts) {
  var active = null;  // { row, from, id, startX, startY, dragging, ghost, rowEl, to }
  var swallowClick = false;

  function tileFromEvent(e) {
    return e.currentTarget;
  }

  function begin(e, row, index, id) {
    if (e.button !== undefined && e.button !== 0) return;
    var el = tileFromEvent(e);
    active = {
      row: row, from: index, id: id, el: el, rowEl: el.parentElement,
      startX: e.clientX, startY: e.clientY, dragging: false, ghost: null, to: index,
      pointerId: e.pointerId
    };
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
  }

  function makeGhost(el) {
    var r = el.getBoundingClientRect();
    var g = el.cloneNode(true);
    g.className = 'sb-drag-ghost';
    g.removeAttribute('data-flip-tile-id');
    g.removeAttribute('disabled');
    g.style.width = r.width + 'px';
    g.style.height = r.height + 'px';
    g.style.left = r.left + 'px';
    g.style.top = r.top + 'px';
    document.body.appendChild(g);
    return g;
  }

  // Which slot of the row the pointer is over: nearest child by centre, then
  // before/after by which side of that centre the finger is on.
  function targetIndex(rowEl, x, y) {
    var kids = Array.prototype.filter.call(rowEl.children, function (k) {
      return k.classList.contains('sb-tile');
    });
    if (!kids.length) return 0;
    var best = -1; var bestD = Infinity; var bestRect = null;
    kids.forEach(function (k, i) {
      var r = k.getBoundingClientRect();
      var cx = r.left + r.width / 2; var cy = r.top + r.height / 2;
      var d = Math.abs(x - cx) + Math.abs(y - cy) * 2;
      if (d < bestD) { bestD = d; best = i; bestRect = r; }
    });
    return x < bestRect.left + bestRect.width / 2 ? best : best + 1;
  }

  function clearMarks(rowEl) {
    Array.prototype.forEach.call(rowEl.querySelectorAll('.is-drop-before, .is-drop-after'), function (k) {
      k.classList.remove('is-drop-before', 'is-drop-after');
    });
  }

  function mark(rowEl, insertAt) {
    clearMarks(rowEl);
    var kids = Array.prototype.filter.call(rowEl.children, function (k) {
      return k.classList.contains('sb-tile');
    });
    if (insertAt < kids.length) kids[insertAt].classList.add('is-drop-before');
    else if (kids.length) kids[kids.length - 1].classList.add('is-drop-after');
  }

  function move(e) {
    var a = active;
    if (!a) return;
    if (!a.dragging) {
      if (Math.abs(e.clientX - a.startX) < SLOP && Math.abs(e.clientY - a.startY) < SLOP) return;
      a.dragging = true;
      a.ghost = makeGhost(a.el);
      a.el.classList.add('is-dragging');
      a.offX = a.startX - a.ghost.getBoundingClientRect().left;
      a.offY = a.startY - a.ghost.getBoundingClientRect().top;
    }
    e.preventDefault();
    a.ghost.style.left = (e.clientX - a.offX) + 'px';
    a.ghost.style.top = (e.clientY - a.offY) + 'px';
    var insertAt = targetIndex(a.rowEl, e.clientX, e.clientY);
    // Insertion index -> index the tile ends up at once it has left `from`.
    var to = insertAt > a.from ? insertAt - 1 : insertAt;
    a.to = to;
    if (to === a.from) clearMarks(a.rowEl); else mark(a.rowEl, insertAt);
  }

  function end(e, cancelled) {
    var a = active;
    active = null;
    if (!a) return;
    try { a.el.releasePointerCapture(a.pointerId); } catch (err) { /* fine */ }
    if (!a.dragging) return;
    swallowClick = true;
    setTimeout(function () { swallowClick = false; }, 0);
    clearMarks(a.rowEl);
    a.el.classList.remove('is-dragging');
    var ghostRect = a.ghost.getBoundingClientRect();
    a.ghost.remove();
    if (cancelled || a.to === a.from) {
      // Slide home from wherever the finger let go.
      opts.onSettle && opts.onSettle(a.id, ghostRect);
      return;
    }
    opts.onReorder(a.row, a.from, a.to, a.id, ghostRect);
  }

  // Props to spread onto each tile button of a reorderable row.
  function bind(row, index, id) {
    return {
      onPointerDown: function (e) { begin(e, row, index, id); },
      onPointerMove: move,
      onPointerUp: function (e) { end(e, false); },
      onPointerCancel: function (e) { end(e, true); },
      onClickCapture: function (e) {
        if (swallowClick) { e.stopPropagation(); e.preventDefault(); }
      }
    };
  }

  return { bind: bind };
}
