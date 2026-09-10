// Pure code-move from RoundSandbox.jsx (READ_SLOWLY_PLAN.md A4): the
// read-only meta rows inside the gear panel -- Editions unlocked, Letters
// won back, Bookmarks discovered. No closures over run/round mutation or
// forceRender; everything it needs is a prop. Ported to .tsx
// (READ_SLOWLY_PLAN.md A1 remainder).
import { isAvailable } from '../../engine/meta/stolenLetters';

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
  wonLetters,
}: {
  SB: {
    KEYS: KeyDef[];
    availableLetters?: unknown;
    ITEMS?: ItemDef[];
  };
  keyUnlocked: number;
  discovered: ReadonlySet<string>;
  wonLetters: readonly string[];
}) {
  return (
    <>
      <div
        className="flex flex-col gap-[5px] text-[10px] text-[var(--leaf-dim)]"
        role="group"
        aria-label="Editions"
      >
        <span className="flex items-baseline gap-2">Editions</span>
        <ul className="m-0 list-disc pl-[14px]">
          {SB.KEYS.map((k) => (
            <li
              key={k.id}
              className={k.index > keyUnlocked ? 'opacity-40' : ''}
            >
              <b className="tracking-[0.06em] text-[var(--leaf-dim)] uppercase">
                {k.name}
              </b>{' '}
              — {k.hint}
            </li>
          ))}
        </ul>
      </div>
      {SB.availableLetters && (
        <div
          className="flex flex-col gap-[5px]"
          role="group"
          aria-label="Letters won back"
        >
          <span className="flex items-baseline gap-2">Letters</span>
          <div className="flex flex-wrap gap-[3px]">
            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => (
              <span
                key={l}
                className={
                  'inline-flex h-[20px] w-[20px] items-center justify-center rounded-[2px] border border-[var(--brass)] text-[11px] font-[var(--display)] text-[var(--leaf)] uppercase' +
                  (isAvailable(l, wonLetters)
                    ? ''
                    : ' border-dashed !text-[var(--leaf-dim)] opacity-[0.35]')
                }
                title={
                  isAvailable(l, wonLetters)
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
          className="flex flex-col gap-[5px]"
          role="group"
          aria-label="Quills discovered"
        >
          <span className="flex items-baseline gap-2">
            Bookmarks · {discovered.size}/{SB.ITEMS.length}
          </span>
          <div className="sb-quill-row flex flex-wrap gap-[3px]">
            {SB.ITEMS.map((it) => (
              <span
                key={it.id}
                className={
                  'inline-flex h-[20px] w-[20px] items-center justify-center rounded-[2px] border border-[var(--brass)] text-[11px] font-[var(--display)] text-[var(--leaf)] uppercase' +
                  (discovered.has(it.id)
                    ? ''
                    : ' border-dashed !text-[var(--leaf-dim)] opacity-[0.35]')
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
