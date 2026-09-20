import { useEffect, useState } from 'react';
import { FightScreen } from '@/features/fight/fight-screen';
import { EndScreen } from '@/features/run/end-screen';
import { RunHeader } from '@/features/run/run-header';
import { randomSeed, useRun } from '@/features/run/use-run';
import { ShopScreen } from '@/features/shop/shop-screen';
import { parseDictionary, type Dictionary } from '@/game/dictionary';

export function App() {
  const [dictionary, setDictionary] = useState<Dictionary | null>(null);
  const [run, dispatch] = useRun();
  const [musicUnlocked, setMusicUnlocked] = useState(false);

  // The word list is its own chunk, fetched after the first paint.
  useEffect(() => {
    void import('@/game/data/words.txt?raw').then((m) =>
      setDictionary(parseDictionary(m.default)),
    );
  }, []);

  if (!dictionary) return <Frame>Loading words…</Frame>;

  return (
    <Frame>
      {(run.phase === 'fight' || run.phase === 'shop') && (
        <RunHeader run={run} />
      )}
      {run.phase === 'fight' && (
        <FightScreen
          key={run.fightIndex}
          musicUnlocked={musicUnlocked}
          onUnlockMusic={() => setMusicUnlocked(true)}
          run={run}
          dictionary={dictionary}
          onPlay={(tileIds, dict) =>
            dispatch({ type: 'play', tileIds, dictionary: dict })
          }
          onSwap={(tileIds) => dispatch({ type: 'swap', tileIds })}
        />
      )}
      {run.phase === 'shop' && (
        <ShopScreen
          run={run}
          onBuyQuill={(id) => dispatch({ type: 'buyQuill', id })}
          onBuyMark={(id, tileId) => dispatch({ type: 'buyMark', id, tileId })}
          onContinue={() => {
            setMusicUnlocked(true);
            dispatch({ type: 'nextFight' });
          }}
        />
      )}
      {(run.phase === 'won' || run.phase === 'lost') && (
        <EndScreen
          run={run}
          onNewRun={() => dispatch({ type: 'newRun', seed: randomSeed() })}
        />
      )}
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-4">{children}</main>
  );
}
