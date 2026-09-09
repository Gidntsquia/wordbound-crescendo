// TS port of src/sandbox/dragReorder.js (READ_SLOWLY_PLAN.md A2): drag a
// tile along its row to reorder it, or between the case and the composing
// stick to stage/unstage it. Pointer events, not HTML5 drag-and-drop: the
// sandbox is played on a phone. A press that travels less than SLOP is still
// a tap; past it the press becomes a drag: a GHOST copy of the tile follows
// the finger, and every time the finger crosses into a new slot onPreview
// fires with { id, fromRow, fromIndex, toRow, to }. Letting go calls onDrop
// with the same shape (plus the ghost's last rect, for the FLIP home) and
// swallows the click that would otherwise follow.
//
// Listeners live on the DOCUMENT for the length of the drag, not on the
// tile: the caller re-renders the rows under the finger, and a tile moved
// in the DOM loses its pointer capture -- which is exactly how a ghost gets
// left hanging in the air.
//
// Nothing here sets `transform` on a .sb-tile -- the ghost is its own
// element on <body>, and the tile's slide into its new place is the
// caller's FLIP. This is a plain ES import (RoundSandbox.jsx), not a
// window.Wordbound.Sandbox global.
import type React from 'react';

const SLOP = 6;

export interface DragState {
  id: string | null;
  fromRow: string;
  fromIndex: number;
  toRow: string;
  to: number;
}

export interface DragReorderOptions {
  rows(): Record<string, HTMLElement>;
  onPreview(state: DragState): void;
  onDrop(state: DragState, ghostRect: DOMRect): void;
  onSettle(id: string | null, ghostRect: DOMRect): void;
}

interface ActiveDrag {
  id: string | null;
  fromRow: string;
  fromIndex: number;
  toRow: string;
  to: number;
  el: HTMLElement;
  startX: number;
  startY: number;
  dragging: boolean;
  ghost: HTMLElement | null;
  pointerId: number;
  offX: number;
  offY: number;
}

export function createDragReorder(opts: DragReorderOptions) {
  let active: ActiveDrag | null = null;

  function begin(
    e: React.PointerEvent<HTMLElement>,
    row: string,
    index: number,
    id: string | null,
  ) {
    if (e.button !== undefined && e.button !== 0) return;
    if (active) return;
    const el = e.currentTarget;
    active = {
      id,
      fromRow: row,
      fromIndex: index,
      toRow: row,
      to: index,
      el,
      startX: e.clientX,
      startY: e.clientY,
      dragging: false,
      ghost: null,
      pointerId: e.pointerId,
      offX: 0,
      offY: 0,
    };
    document.addEventListener('pointermove', move, { passive: false });
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', cancel);
  }

  function makeGhost(el: HTMLElement): HTMLElement {
    const r = el.getBoundingClientRect();
    const g = el.cloneNode(true) as HTMLElement;
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
  function rowAt(
    rows: Record<string, HTMLElement>,
    x: number,
    y: number,
  ): string {
    const names = Object.keys(rows);
    let best = names[0]!;
    let bestD = Infinity;
    names.forEach((n) => {
      const r = rows[n]!.getBoundingClientRect();
      const d = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    });
    return best;
  }

  // Where the tile would end up among the OTHER tiles of a row: nearest
  // sibling by centre, then before/after by which side of it the finger is.
  function targetIndex(rowEl: HTMLElement, x: number, y: number): number {
    const kids = Array.prototype.filter.call(
      rowEl.children,
      (k: Element) =>
        k.classList.contains('sb-tile') && !k.classList.contains('is-dragging'),
    ) as HTMLElement[];
    if (!kids.length) return 0;
    let best = -1;
    let bestD = Infinity;
    let bestRect: DOMRect | null = null;
    kids.forEach((k, i) => {
      const r = k.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const d = Math.abs(x - cx) + Math.abs(y - cy) * 2;
      if (d < bestD) {
        bestD = d;
        best = i;
        bestRect = r;
      }
    });
    return x < bestRect!.left + bestRect!.width / 2 ? best : best + 1;
  }

  function state(a: ActiveDrag): DragState {
    return {
      id: a.id,
      fromRow: a.fromRow,
      fromIndex: a.fromIndex,
      toRow: a.toRow,
      to: a.to,
    };
  }

  function move(e: PointerEvent) {
    const a = active;
    if (!a || e.pointerId !== a.pointerId) return;
    if (!a.dragging) {
      if (
        Math.abs(e.clientX - a.startX) < SLOP &&
        Math.abs(e.clientY - a.startY) < SLOP
      )
        return;
      a.dragging = true;
      a.ghost = makeGhost(a.el);
      const gr = a.ghost.getBoundingClientRect();
      a.offX = a.startX - gr.left;
      a.offY = a.startY - gr.top;
      opts.onPreview(state(a));
    }
    e.preventDefault();
    a.ghost!.style.left = e.clientX - a.offX + 'px';
    a.ghost!.style.top = e.clientY - a.offY + 'px';
    const rows = opts.rows();
    const toRow = rowAt(rows, e.clientX, e.clientY);
    const to = targetIndex(rows[toRow]!, e.clientX, e.clientY);
    if (toRow !== a.toRow || to !== a.to) {
      a.toRow = toRow;
      a.to = to;
      opts.onPreview(state(a));
    }
  }

  function swallowNextClick() {
    const stop = (ev: Event) => {
      ev.stopPropagation();
      ev.preventDefault();
    };
    document.addEventListener('click', stop, true);
    setTimeout(() => {
      document.removeEventListener('click', stop, true);
    }, 0);
  }

  function finish(e: PointerEvent | null, cancelled: boolean) {
    const a = active;
    if (!a || (e && e.pointerId !== a.pointerId)) return;
    active = null;
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
    document.removeEventListener('pointercancel', cancel);
    if (!a.dragging) return;
    swallowNextClick();
    const ghostRect = a.ghost!.getBoundingClientRect();
    a.ghost!.remove();
    if (cancelled || (a.toRow === a.fromRow && a.to === a.fromIndex)) {
      opts.onSettle(a.id, ghostRect);
      return;
    }
    opts.onDrop(state(a), ghostRect);
  }
  function up(e: PointerEvent) {
    finish(e, false);
  }
  function cancel(e: PointerEvent) {
    finish(e, true);
  }

  // Props to spread onto each tile button of a draggable row.
  function bind(row: string, index: number, id: string | null) {
    return {
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
        begin(e, row, index, id);
      },
    };
  }

  return { bind };
}
