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
    <details className="sb-suggests-drop">
      <summary>
        <span className="sb-suggests-title">Words</span>
        {indexing && <span className="sb-hint">reading the dictionary…</span>}
        {!indexing && !letters && (
          <span className="sb-hint">pick tiles or type letters</span>
        )}
        {!indexing && letters && suggestions.length === 0 && (
          <span className="sb-hint">nothing spells out of {letters}</span>
        )}
        {!indexing && suggestions.length > 0 && (
          <span className="sb-suggests-count">
            {suggestions.length}
            <b>{suggestions[0]!.word}</b>
            <em>{suggestions[0]!.score}</em>
          </span>
        )}
      </summary>
      <div className="sb-suggests">
        {!indexing &&
          suggestions.map((s, i) => (
            <Button
              key={s.word}
              type="button"
              variant="paper"
              className={'sb-suggest' + (i === 0 ? ' is-best' : '')}
              onClick={() => playWord(s.word)}
              disabled={!live}
            >
              {s.word}
              <em>{s.score}</em>
            </Button>
          ))}
      </div>
    </details>
  );
}
