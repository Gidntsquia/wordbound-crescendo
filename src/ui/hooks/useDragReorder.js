// Drag a tile along its row to reorder it -- the case and the stick both.
// Every tile in the row is FLIPped so its neighbours slide aside; the
// dragged tile slides in from where the finger let go of its ghost.
// Extracted verbatim from RoundSandbox.jsx (READ_SLOWLY_PLAN.md A2/A4).
import { useEffect, useRef, useState } from 'react';
import { createDragReorder } from '../../engine/dragReorder';

export function useDragReorder({
  letters,
  setWord,
  fight,
  dispatchFight,
  refresh,
  sfx,
  captureFlipFrom,
  pendingFlipFromRef,
}) {
  const wordRef = useRef(letters);
  useEffect(() => {
    wordRef.current = letters;
  });
  // While a drag is on, both rows are drawn in PREVIEW: the hollow tile stands
  // where the drop would put it, in whichever row the finger is over.
  const [preview, setPreview] = useState(null); // { id, fromRow, fromIndex, toRow, to } | null
  const playRef = useRef(null);
  const [drag, setDrag] = useState(null);
  useEffect(() => {
    const flipAll = (id) => {
      const r = fight.current?.round;
      if (!r) return;
      r.rack.forEach((t) => {
        if (t.id !== id) captureFlipFrom(t.id);
      });
    };
    setDrag(
      createDragReorder({
        rows: () => ({
          rack: playRef.current.querySelector('.sb-rack'),
          stick: playRef.current.querySelector('.sb-stick'),
        }),
        onPreview: (p) => {
          flipAll(p.id);
          setPreview(p);
        },
        onSettle: (id, ghostRect) => {
          setPreview(null);
          if (id) pendingFlipFromRef.current[id] = ghostRect;
          refresh();
        },
        onDrop: (p, ghostRect) => {
          const r = fight.current?.round;
          if (!r) return;
          setPreview(null);
          if (p.id) pendingFlipFromRef.current[p.id] = ghostRect;
          sfx('tick', p.to, 0);
          const cur = wordRef.current;
          if (p.fromRow === 'rack') {
            const tile = r.rack[p.fromIndex];
            if (!tile) return;
            if (p.toRow === 'rack') {
              dispatchFight({
                type: 'fight/moveTile',
                fight,
                fromIndex: p.fromIndex,
                to: p.to,
              });
              return;
            }
            // Case -> stick: stage the letter at the finger's slot.
            const ch = tile.letter === '?' ? '?' : tile.letter;
            setWord(cur.slice(0, p.to) + ch + cur.slice(p.to));
            return;
          }
          if (p.fromIndex >= cur.length) return;
          const arr = cur.split('');
          const ch = arr.splice(p.fromIndex, 1)[0];
          if (p.toRow === 'stick') {
            arr.splice(p.to, 0, ch);
            setWord(arr.join(''));
            return;
          }
          // Stick -> case: send the tile home, to the slot the finger chose.
          setWord(arr.join(''));
          if (p.id) {
            const i = r.rack.findIndex((t) => t.id === p.id);
            if (i >= 0) {
              dispatchFight({
                type: 'fight/moveTile',
                fromIndex: i,
                to: p.to,
                fight,
              });
            } else {
              refresh();
            }
          }
        },
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { drag, preview, playRef };
}
