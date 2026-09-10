// The word-helper suggestions disclosure. Extracted from PlayBoard.jsx
// (READ_SLOWLY_PLAN.md A4).
import { Button } from '@/ui/primitives/button';

interface Suggestion {
  word: string;
  score: number;
}

export default function SuggestionsDrawer({
  indexing,
  letters,
  suggestions,
  live,
  playWord,
}: {
  indexing: boolean;
  letters: string;
  suggestions: Suggestion[];
  live: boolean;
  playWord: (word: string) => void;
}) {
  return (
    <details className="sb-suggests-drop border-t border-[var(--rule)] pt-2.5">
      <summary className="group flex cursor-pointer items-baseline gap-2.5 py-0.5 [&::-webkit-details-marker]:hidden">
        <span className="sb-suggests-title text-[10px] font-semibold tracking-[0.22em] text-[var(--leaf-dim)] uppercase group-hover:text-[var(--brass-hot)]">
          Words
        </span>
        {indexing && (
          <span className="sb-hint text-[11px] text-[var(--leaf-dim)] italic">
            reading the dictionary…
          </span>
        )}
        {!indexing && !letters && (
          <span className="sb-hint text-[11px] text-[var(--leaf-dim)] italic">
            pick tiles or type letters
          </span>
        )}
        {!indexing && letters && suggestions.length === 0 && (
          <span className="sb-hint text-[11px] text-[var(--leaf-dim)] italic">
            nothing spells out of {letters}
          </span>
        )}
        {!indexing && suggestions.length > 0 && (
          <span className="sb-suggests-count flex items-baseline gap-2 text-[11px] font-[var(--figure)] text-[var(--leaf-dim)]">
            {suggestions.length}
            <b className="text-[15px] font-[var(--display)] tracking-[0.1em] text-[var(--leaf)]">
              {suggestions[0]!.word}
            </b>
            <em className="text-[var(--brass)] not-italic">
              {suggestions[0]!.score}
            </em>
          </span>
        )}
      </summary>
      <div className="sb-suggests flex min-h-[30px] flex-wrap items-center gap-1.5 pt-2.5">
        {!indexing &&
          suggestions.map((s, i) => (
            <Button
              key={s.word}
              type="button"
              variant="paper"
              className={
                'sb-suggest px-2.5 py-1.5 text-xs font-semibold tracking-[0.08em]' +
                (i === 0
                  ? ' is-best border-[var(--leaf)] bg-[var(--leaf)] text-[var(--ink)]'
                  : '')
              }
              onClick={() => playWord(s.word)}
              disabled={!live}
            >
              {s.word}
              <em
                className={
                  'ml-2 text-[10px] font-[var(--figure)] text-[var(--brass)] not-italic' +
                  (i === 0 ? ' text-[rgba(26,23,16,0.6)]' : '')
                }
              >
                {s.score}
              </em>
            </Button>
          ))}
      </div>
    </details>
  );
}
