import { useEffect, useState } from 'react';
import { DeckScreen } from '@/features/run/deck-screen';
import { EndScreen } from '@/features/run/end-screen';
import { RunHeader } from '@/features/run/run-header';
import { TitleScreen } from '@/features/run/title-screen';
import { randomSeed, useRun } from '@/features/run/use-run';
import { FightScreen } from '@/features/fight/fight-screen';
import { ShopScreen } from '@/features/shop/shop-screen';
import { parseDictionary, type Dictionary } from '@/game/dictionary';

export function App() {
  const [dictionary, setDictionary] = useState<Dictionary | null>(null);
  const [run, dispatch] = useRun();
  const [onTitle, setOnTitle] = useState(true);
  const [musicUnlocked, setMusicUnlocked] = useState(false);
  const [showDeck, setShowDeck] = useState(false);

  // The word list is its own chunk, fetched after the first paint.
  useEffect(() => {
    void import('@/game/data/words.txt?raw').then((m) =>
      setDictionary(parseDictionary(m.default)),
    );
  }, []);

  if (onTitle) {
    return (
      <Frame>
        <TitleScreen
          onStart={(composer, seed) => {
            dispatch({ type: 'newRun', seed: seed ?? randomSeed(), composer });
            setMusicUnlocked(true);
            setShowDeck(false);
            setOnTitle(false);
          }}
        />
      </Frame>
    );
  }

  if (!dictionary) return <Frame>Fetching the word list…</Frame>;

  if (showDeck && (run.phase === 'fight' || run.phase === 'shop')) {
    return (
      <Frame>
        <RunHeader run={run} />
        <DeckScreen run={run} onBack={() => setShowDeck(false)} />
      </Frame>
    );
  }

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
          onOpenDeck={() => setShowDeck(true)}
        />
      )}
      {run.phase === 'shop' && (
        <ShopScreen
          run={run}
          onBuyQuill={(id) => dispatch({ type: 'buyQuill', id })}
          onBuyMark={(id, tileId) => dispatch({ type: 'buyMark', id, tileId })}
          onReroll={() => dispatch({ type: 'rerollShop' })}
          onSellQuill={(id) => dispatch({ type: 'sellQuill', id })}
          onReorderQuill={(id, toIndex) =>
            dispatch({ type: 'reorderQuill', id, toIndex })
          }
          onOpenDeck={() => setShowDeck(true)}
          onContinue={() => {
            setMusicUnlocked(true);
            dispatch({ type: 'nextFight' });
          }}
        />
      )}
      {(run.phase === 'won' || run.phase === 'lost') && (
        <EndScreen run={run} onNewRun={() => setOnTitle(true)} />
      )}
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-4">{children}</main>
  );
}
