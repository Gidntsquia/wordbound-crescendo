import { useLayoutEffect, useRef } from 'react';

// Shared tap/click-to-show-stats behavior for item-like cards (quills in the
// run strip, shop offers, ...). Centralizes the focus/click race fix from
// 6f33151/148d8fa (onFocus fires before onClick on a pointer tap, so without
// the pointer-vs-keyboard guard the click handler's toggle sees the tip
// already open and immediately closes it) so every caller gets it for free
// instead of re-deriving it per card.
export function useTapTooltip(
  tipId: string,
  tip: string | null,
  setTip: (updater: (t: string | null) => string | null) => void,
) {
  const viaPointerRef = useRef(false);
  return {
    open: tip === tipId,
    handlers: {
      role: 'button' as const,
      tabIndex: 0,
      onClick: () => setTip((t) => (t === tipId ? null : tipId)),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setTip((t) => (t === tipId ? null : tipId));
        }
      },
      onMouseDown: () => {
        viaPointerRef.current = true;
      },
      onTouchStart: () => {
        viaPointerRef.current = true;
      },
      onFocus: () => {
        if (viaPointerRef.current) {
          viaPointerRef.current = false;
          return;
        }
        setTip(() => tipId);
      },
      onBlur: () => setTip((t) => (t === tipId ? null : t)),
    },
  };
}

// The tooltip markup itself (sandbox.css A6 port), shared so the shop's card
// doesn't drift from the run strip's -- also carries the `overflow-visible`
// requirement on the parent Card, since Card defaults to overflow-hidden
// (src/ui/primitives/card.tsx) and clips this absolutely-positioned popover
// otherwise (the bug 6f33151 fixed for QuillCard but CardSlot never got).
export const TOOLTIP_CLASS =
  'absolute bottom-[calc(100%+6px)] left-1/2 z-5 flex w-max max-w-[180px] translate-x-[calc(-50%+var(--tip-shift,0px))] flex-col gap-0.5 rounded-[3px] border border-[var(--brass)] bg-[var(--pit-deep)] px-[9px] py-[7px] text-left text-[11px] whitespace-normal shadow-[0_4px_14px_rgba(0,0,0,0.5)]';

// Wraps TOOLTIP_CLASS's markup and clamps it back onto screen: centered
// under a card near the left/right viewport edge otherwise runs off-screen
// (no overflow-hidden involved -- the popover is just positioned past the
// edge of the page). Measures itself once on open and sets --tip-shift so
// the centered transform above nudges it back in by exactly the overflow.
export function TapTooltip({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const margin = 8;
    const rect = el.getBoundingClientRect();
    let shift = 0;
    if (rect.left < margin) shift = margin - rect.left;
    else if (rect.right > window.innerWidth - margin) {
      shift = window.innerWidth - margin - rect.right;
    }
    el.style.setProperty('--tip-shift', shift + 'px');
  }, []);
  return (
    <span ref={ref} className={TOOLTIP_CLASS} role="tooltip">
      {children}
    </span>
  );
}
