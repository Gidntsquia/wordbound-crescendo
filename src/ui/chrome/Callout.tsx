// A one-time tutorial hint, fired as a Sonner toast the moment its
// condition becomes true. READ_SLOWLY_PLAN.md A4/A6: replaces the five
// scattered inline `.sb-callout` divs (rack/stick/swap/shop/character) with
// one call site each. Each caller still owns its own `seen`-gated condition
// (unchanged) -- this just fires the toast once when that condition flips
// from false to true, instead of rendering an inline div while it's true.
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

export function useCallout(show: boolean, message: string) {
  const shown = useRef(false);
  useEffect(() => {
    if (show && !shown.current) {
      shown.current = true;
      toast(message);
    }
  }, [show, message]);
}
