// DRAG A TILE: along its row to reorder it, or between the case and the
// composing stick to stage / unstage it.
//
// Pointer events, not HTML5 drag-and-drop: the sandbox is played on a phone.
// A press that travels less than SLOP is still a tap (the tile's onClick
// fires as usual); past it the press becomes a drag: a GHOST copy of the tile
// follows the finger, and the tile itself goes hollow and MOVES with it --
// every time the finger crosses into a new slot (of either row) onPreview
// fires with { id, fromRow, fromIndex, toRow, to } and the caller draws both
// rows as the drop would leave them. Letting go calls onDrop with the same
// shape (plus the ghost's last rect, for the FLIP home) and swallows the click
// that would otherwise follow.
//
// Listeners live on the DOCUMENT for the length of the drag, not on the tile:
// the caller re-renders the rows under the finger, and a tile that is moved
// in the DOM loses its pointer capture -- which is exactly how a ghost gets
// left hanging in the air.
//
// Nothing here sets `transform` on a .sb-tile -- the ghost is its own element
// on <body>, and the tile's slide into its new place is the caller's FLIP.
var SLOP = 6;

export function createDragReorder(opts) {
  var active = null;

  function begin(e, row, index, id) {
    if (e.button !== undefined && e.button !== 0) return;
    if (active) return;
    var el = e.currentTarget;
    active = {
      id: id, fromRow: row, fromIndex: index, toRow: row, to: index,
      el: el, startX: e.clientX, startY: e.clientY, dragging: false, ghost: null,
      pointerId: e.pointerId
    };
    document.addEventListener('pointermove', move, { passive: false });
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', cancel);
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

  // Which row the finger is over: inside one (with a little slack), else the
  // nearer by vertical distance.
  function rowAt(rows, x, y) {
    var names = Object.keys(rows);
    var best = names[0]; var bestD = Infinity;
    names.forEach(function (n) {
      var r = rows[n].getBoundingClientRect();
      var d = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
      if (d < bestD) { bestD = d; best = n; }
    });
    return best;
  }

  // Where the tile would end up among the OTHER tiles of a row: nearest
  // sibling by centre, then before/after by which side of it the finger is.
  function targetIndex(rowEl, x, y) {
    var kids = Array.prototype.filter.call(rowEl.children, function (k) {
      return k.classList.contains('sb-tile') && !k.classList.contains('is-dragging');
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

  function state(a) {
    return { id: a.id, fromRow: a.fromRow, fromIndex: a.fromIndex, toRow: a.toRow, to: a.to };
  }

  function move(e) {
    var a = active;
    if (!a || e.pointerId !== a.pointerId) return;
    if (!a.dragging) {
      if (Math.abs(e.clientX - a.startX) < SLOP && Math.abs(e.clientY - a.startY) < SLOP) return;
      a.dragging = true;
      a.ghost = makeGhost(a.el);
      var gr = a.ghost.getBoundingClientRect();
      a.offX = a.startX - gr.left;
      a.offY = a.startY - gr.top;
      opts.onPreview(state(a));
    }
    e.preventDefault();
    a.ghost.style.left = (e.clientX - a.offX) + 'px';
    a.ghost.style.top = (e.clientY - a.offY) + 'px';
    var rows = opts.rows();
    var toRow = rowAt(rows, e.clientX, e.clientY);
    var to = targetIndex(rows[toRow], e.clientX, e.clientY);
    if (toRow !== a.toRow || to !== a.to) {
      a.toRow = toRow;
      a.to = to;
      opts.onPreview(state(a));
    }
  }

  function swallowNextClick() {
    var stop = function (ev) { ev.stopPropagation(); ev.preventDefault(); };
    document.addEventListener('click', stop, true);
    setTimeout(function () { document.removeEventListener('click', stop, true); }, 0);
  }

  function finish(e, cancelled) {
    var a = active;
    if (!a || (e && e.pointerId !== a.pointerId)) return;
    active = null;
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
    document.removeEventListener('pointercancel', cancel);
    if (!a.dragging) return;
    swallowNextClick();
    var ghostRect = a.ghost.getBoundingClientRect();
    a.ghost.remove();
    if (cancelled || (a.toRow === a.fromRow && a.to === a.fromIndex)) {
      opts.onSettle(a.id, ghostRect);
      return;
    }
    opts.onDrop(state(a), ghostRect);
  }
  function up(e) { finish(e, false); }
  function cancel(e) { finish(e, true); }

  // Props to spread onto each tile button of a draggable row.
  function bind(row, index, id) {
    return { onPointerDown: function (e) { begin(e, row, index, id); } };
  }

  return { bind: bind };
}
