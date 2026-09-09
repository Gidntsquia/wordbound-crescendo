// Pure code-move from RoundSandbox.jsx (READ_SLOWLY_PLAN.md A4): the
// read-only meta rows inside the gear panel -- Editions unlocked, Letters
// won back, Bookmarks discovered. No closures over run/round mutation or
// forceRender; everything it needs is a prop. Ported to .tsx
// (READ_SLOWLY_PLAN.md A1 remainder).
interface KeyDef {
  id: string;
  index: number;
  name: string;
  hint: string;
}

interface ItemDef {
  id: string;
  name: string;
}

export default function GearMeta({
  SB,
  keyUnlocked,
  discovered,
}: {
  SB: {
    KEYS: KeyDef[];
    availableLetters?: unknown;
    isAvailable: (letter: string) => boolean;
    ITEMS?: ItemDef[];
  };
  keyUnlocked: number;
  discovered: ReadonlySet<string>;
}) {
  return (
    <>
      <div className="sb-key-tune" role="group" aria-label="Editions">
        <span className="sb-bags-head">Editions</span>
        <ul className="sb-key-list">
          {SB.KEYS.map((k) => (
            <li key={k.id} className={k.index > keyUnlocked ? 'is-locked' : ''}>
              <b>{k.name}</b> — {k.hint}
            </li>
          ))}
        </ul>
      </div>
      {SB.availableLetters && (
        <div className="sb-alphabet" role="group" aria-label="Letters won back">
          <span className="sb-bags-head">Letters</span>
          <div className="sb-alphabet-row">
            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => (
              <span
                key={l}
                className={
                  'sb-letter' + (SB.isAvailable(l) ? '' : ' is-hollow')
                }
                title={
                  SB.isAvailable(l)
                    ? l
                    : l + ' — lost; win it back by felling a boss'
                }
              >
                {l}
              </span>
            ))}
          </div>
        </div>
      )}
      {SB.ITEMS && (
        <div
          className="sb-alphabet"
          role="group"
          aria-label="Quills discovered"
        >
          <span className="sb-bags-head">
            Bookmarks · {discovered.size}/{SB.ITEMS.length}
          </span>
          <div className="sb-alphabet-row sb-quill-row">
            {SB.ITEMS.map((it) => (
              <span
                key={it.id}
                className={
                  'sb-letter' + (discovered.has(it.id) ? '' : ' is-hollow')
                }
                title={
                  discovered.has(it.id)
                    ? it.name
                    : it.name +
                      ' — undiscovered; felling a boss or reaching Chapter 3 may reveal it'
                }
              >
                {discovered.has(it.id) ? it.name[0] : '?'}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
