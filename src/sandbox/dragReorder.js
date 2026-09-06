// DRAG TO REORDER within one row of tiles (the case, or the composing stick).
//
// Pointer events, not HTML5 drag-and-drop: the sandbox is played on a phone.
// A press that travels less than SLOP is still a tap (the tile's onClick
// fires as usual); past it the press becomes a drag, a GHOST copy of the tile
// follows the finger, and the tile itself goes hollow and MOVES with it: every
// time the finger crosses into a new slot, onPreview(row, id, to, from) fires and
// the caller re-renders the row with the hollow tile standing where the drop
// would put it, its neighbours sliding aside. Letting go calls
// onReorder(row, from, to) and swallows the click that would otherwise follow.
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

  // Where the tile would end up among the OTHER tiles of the row: nearest
  // sibling by centre, then before/after by which side of it the finger is.
  function targetIndex(rowEl, dragEl, x, y) {
    var kids = Array.prototype.filter.call(rowEl.children, function (k) {
      return k !== dragEl && k.classList.contains('sb-tile');
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

  function move(e) {
    var a = active;
    if (!a) return;
    if (!a.dragging) {
      if (Math.abs(e.clientX - a.startX) < SLOP && Math.abs(e.clientY - a.startY) < SLOP) return;
      a.dragging = true;
      a.ghost = makeGhost(a.el);
      a.el.classList.add('is-dragging');
      opts.onPreview && opts.onPreview(a.row, a.id, a.to, a.from);
      a.offX = a.startX - a.ghost.getBoundingClientRect().left;
      a.offY = a.startY - a.ghost.getBoundingClientRect().top;
    }
    e.preventDefault();
    a.ghost.style.left = (e.clientX - a.offX) + 'px';
    a.ghost.style.top = (e.clientY - a.offY) + 'px';
    var to = targetIndex(a.rowEl, a.el, e.clientX, e.clientY);
    if (to !== a.to) {
      a.to = to;
      opts.onPreview && opts.onPreview(a.row, a.id, to, a.from);
    }
  }

  function end(e, cancelled) {
    var a = active;
    active = null;
    if (!a) return;
    try { a.el.releasePointerCapture(a.pointerId); } catch (err) { /* fine */ }
    if (!a.dragging) return;
    swallowClick = true;
    setTimeout(function () { swallowClick = false; }, 0);
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
