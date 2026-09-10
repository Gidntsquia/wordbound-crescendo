// The fight screen's mount point -- delegates all state/callbacks to
// useFight.ts (READ_SLOWLY_PLAN.md A4 "FightScreen becomes a fight
// screen") and renders the phase router, App.tsx. SB and the shared prop
// types stay re-exported from here since HeldRow/Shop/PlayBoard/Rack/
// Stick/InkingPicker/ShopInkPicker/main.tsx already import them from this
// path.
import App from '../../app/App';
import { useFight } from '../hooks/useFight';
export { SB } from '../hooks/useFight';
export type {
  SandboxTables,
  Selecting,
  Inking,
  FloatItem,
  ScoringState,
} from '../hooks/useFight';

export default function FightScreen() {
  const props = useFight();
  return <App {...props} />;
}
