// The board -- case (rack), composing stick, inking picker, play/swap/clear
// input row, bag/discard details, word-helper suggestions -- moved out of
// RoundSandbox.jsx (READ_SLOWLY_PLAN.md A4, mechanical extraction). The
// section's ref is still owned by RoundSandbox (drag.bind's row lookups
// query it via playRef.current.querySelector), so it's forwarded rather
// than created here.
import { forwardRef } from 'react';

// The premium stick slot (DIVERGENCE_PLAN.md): a fixed position that
// bonuses whichever tile lands there.
const PREMIUM_HINT = {
  dl: 'Double letter',
  tl: 'Triple letter',
  dw: 'Double word',
};
const PREMIUM_ICON = { dl: 'DL', tl: 'TL', dw: 'DW' };

const PlayBoard = forwardRef(function PlayBoard(
  {
    live,
    seen,
    round,
    inking,
    setInking,
    toggleInkTile,
    applyInk,
    SB,
    rackShown,
    drag,
    letters,
    word,
    setWord,
    play,
    changeout,
    pickedIds,
    helper,
    rackLetters,
    say,
    stageTile,
    unstageAt,
    sfx,
    W,
    formable,
    barredNow,
    spelt,
    worthHow,
    worth,
    scoring,
    stickShown,
    indexing,
    suggestions,
    playWord,
    inputRef,
  },
  playRef,
) {
  return (
    <section className="sb-play" ref={playRef}>
      {live && !seen.has('rack') && round.plays.length === 0 && (
        <div className="sb-callout">Tap letters to spell a word</div>
      )}
      <div className="sb-rack">
        {rackShown.map(({ t, i, picked, hollow }) =>
          picked ? (
            <span key={t.id} className="sb-tile is-slot" aria-hidden="true" />
          ) : (
            <button
              key={t.id}
              type="button"
              disabled={!live}
              className={
                'sb-tile' +
                (hollow ? ' is-dragging' : '') +
                (t.mark ? ' is-mark-' + t.mark : '') +
                (inking && inking.ids.includes(t.id) ? ' is-inking' : '') +
                (round.isBarred(t) ? ' is-barred' : '') +
                (scoring && scoring.litTile === t.id ? ' is-lit' : '')
              }
              data-flip-tile-id={t.id}
              title={
                t.mark
                  ? SB.MARK_DEFS[t.mark].name +
                    ' — ' +
                    SB.MARK_DEFS[t.mark].hint
                  : undefined
              }
              {...(inking ? {} : drag.bind('rack', i, t.id))}
              onClick={() =>
                inking
                  ? toggleInkTile(t.id)
                  : round.isBarred(t)
                    ? (sfx('thud'),
                      say(
                        t.letter +
                          ' has been played this round — ' +
                          round.rule.name +
                          '.',
                      ))
                    : stageTile(t)
              }
            >
              {t.letter === '?' ? '␣' : t.letter}
              <sub>{W.Lexicon.LETTER_VALUES[t.letter] || 0}</sub>
            </button>
          ),
        )}
      </div>

      {inking && (
        <div className="sb-inking">
          <span className="sb-eyebrow">{inking.ink.name}</span>
          <span className="sb-hint">
            {inking.ink.targets === 1
              ? 'tap one of your tiles'
              : 'tap up to ' + inking.ink.targets + ' of your tiles'}
            {' · '}
            {inking.ink.hint}
          </span>
          {inking.ink.needsVowel && (
            <span className="sb-vowels">
              {SB.VOWELS.map((v) => (
                <button
                  key={v}
                  type="button"
                  className={'sb-vowel' + (inking.vowel === v ? ' is-on' : '')}
                  onClick={() => setInking((k) => ({ ...k, vowel: v }))}
                >
                  {v}
                </button>
              ))}
            </span>
          )}
          <button
            type="button"
            className="sb-go"
            onClick={applyInk}
            disabled={
              !inking.ids.length || (inking.ink.needsVowel && !inking.vowel)
            }
          >
            Apply{inking.ids.length ? ' to ' + inking.ids.length : ''}
          </button>
          <button type="button" onClick={() => setInking(null)}>
            Cancel
          </button>
        </div>
      )}

      <div className="sb-stick-wrap">
        <div className="sb-stick-head">
          {live && !seen.has('stick') && letters.length >= 2 ? (
            <span className="sb-callout sb-callout-inline">
              Tap Play, or tap a tile to send it back
            </span>
          ) : (
            <span className="sb-eyebrow">
              {scoring ? 'Scoring' : letters.length ? 'Your word' : ' '}
            </span>
          )}
          {scoring && (
            <span className="sb-stick-worth is-hand is-scoring">
              <span className="sb-stick-math">
                <em className="sb-tier-name">
                  {scoring.tier
                    ? scoring.tier.name +
                      (scoring.tier.level > 1 ? ' ' + scoring.tier.level : '')
                    : ' '}
                </em>
                <b className="sb-figure sb-pts">{scoring.pts}</b>
                <i>×</i>
                <b className="sb-figure sb-mult">{scoring.mult}</b>
                <i>=</i>
              </span>
              <b
                className={
                  'sb-figure sb-total' +
                  (scoring.total != null ? ' is-hit' : '')
                }
              >
                {scoring.total != null ? scoring.total : '…'}
              </b>
              {scoring.total != null && scoring.crossed && (
                <span className="sb-crossed">meets the target</span>
              )}
            </span>
          )}
          {!scoring && spelt && (
            <span className="sb-stick-worth is-hand">
              <span className="sb-stick-math">
                <em className="sb-tier-name">
                  {worthHow.tierName}
                  {worthHow.tierLevel > 1 ? ' ' + worthHow.tierLevel : ''}
                </em>
                <b className="sb-figure sb-pts">{worthHow.points}</b>
                <i>×</i>
                <b className="sb-figure sb-mult">{worthHow.mult}</b>
                <i>=</i>
              </span>
              <b className="sb-figure">{worth}</b>
              {round.score + worth >= round.target
                ? 'meets the target'
                : letters.length === 1
                  ? 'single letter'
                  : 'points'}
            </span>
          )}
        </div>
        <div
          className={
            'sb-stick' +
            (formable ? '' : ' is-short') +
            (scoring && !scoring.cleared ? ' is-locked' : '')
          }
        >
          {scoring &&
            !scoring.cleared &&
            scoring.tiles.map((t, i) => (
              <span
                key={t.id}
                className={
                  'sb-tile-pop' +
                  (scoring.litTile === t.id || scoring.litSlot === t.id
                    ? ' is-pop'
                    : '')
                }
              >
                {scoring.floats
                  .filter((x) => x.on === t.id)
                  .map((x) => (
                    <i key={x.key} className={'sb-float is-' + x.tone}>
                      {x.text}
                    </i>
                  ))}
                <button
                  type="button"
                  disabled
                  data-flip-tile-id={t.id}
                  className={
                    'sb-tile is-set' +
                    (t.mark ? ' is-mark-' + t.mark : '') +
                    (scoring.litTile === t.id ? ' is-lit' : '') +
                    (round.premium && round.premium.pos === i
                      ? ' is-premium-' + round.premium.kind
                      : '') +
                    (scoring.litSlot === t.id ? ' is-lit' : '')
                  }
                >
                  {t.letter === '?' ? '␣' : t.letter}
                  <sub>{W.Lexicon.LETTER_VALUES[t.letter] || 0}</sub>
                </button>
              </span>
            ))}
          {scoring &&
            scoring.floats
              .filter((x) => x.on === 'stick')
              .map((x) => (
                <i key={x.key} className={'sb-float is-' + x.tone}>
                  {x.text}
                </i>
              ))}
          {!(scoring && !scoring.cleared) &&
            stickShown.map(({ t, i, ch, hollow }) => {
              const premiumHere = round.premium && round.premium.pos === i;
              return t ? (
                <button
                  key={t.id}
                  type="button"
                  disabled={!live}
                  className={
                    'sb-tile is-set' +
                    (hollow ? ' is-dragging' : '') +
                    (t.mark ? ' is-mark-' + t.mark : '') +
                    (round.isBarred(t) ? ' is-barred' : '') +
                    (premiumHere ? ' is-premium-' + round.premium.kind : '')
                  }
                  data-flip-tile-id={t.id}
                  title={
                    (premiumHere
                      ? PREMIUM_HINT[round.premium.kind] + ' · '
                      : '') + 'Tap to send home · drag to reorder'
                  }
                  {...drag.bind('stick', i, t.id)}
                  onClick={() => unstageAt(i)}
                >
                  {t.letter === '?' ? (ch === '?' ? '␣' : ch) : t.letter}
                  <sub>{W.Lexicon.LETTER_VALUES[t.letter] || 0}</sub>
                </button>
              ) : (
                <button
                  key={'gap' + i}
                  type="button"
                  disabled={!live}
                  className={
                    'sb-tile is-missing' + (hollow ? ' is-dragging' : '')
                  }
                  title="None of your tiles spells this"
                  {...drag.bind('stick', i, null)}
                  onClick={() => unstageAt(i)}
                >
                  {ch}
                </button>
              );
            })}
          {!(scoring && !scoring.cleared) &&
            (() => {
              const minEnd = Math.max(5, round.premium ? round.premium.pos : 0);
              return (
                minEnd >= stickShown.length &&
                Array.from(
                  { length: minEnd - stickShown.length + 1 },
                  (_, k) => stickShown.length + k,
                ).map((i) =>
                  round.premium && i === round.premium.pos ? (
                    <span
                      key="premium-preview"
                      className={
                        'sb-tile sb-premium-slot is-premium-' +
                        round.premium.kind
                      }
                      title={
                        PREMIUM_HINT[round.premium.kind] +
                        ' — lands on stick position ' +
                        (round.premium.pos + 1)
                      }
                    >
                      {PREMIUM_ICON[round.premium.kind]}
                    </span>
                  ) : (
                    <span
                      key={'premium-gap' + i}
                      className="sb-tile sb-premium-slot is-slot-empty"
                      title={'Stick position ' + (i + 1)}
                    />
                  ),
                )
              );
            })()}
        </div>
      </div>

      {live &&
        !seen.has('swap') &&
        pickedIds.size > 0 &&
        round.changeoutsLeft > 0 &&
        seen.has('stick') && (
          <div className="sb-callout">
            Swap tiles you don’t want — {round.tune.CHANGEOUTS} per fight
          </div>
        )}
      <div className="sb-input">
        <input
          ref={inputRef}
          value={word}
          disabled={!live}
          readOnly
          inputMode="none"
          className={formable ? '' : 'is-unformable'}
          placeholder="Tap tiles"
          onFocus={(e) => e.target.blur()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') play();
          }}
        />
        <button
          type="button"
          className="sb-go"
          onClick={play}
          disabled={!live || !letters}
        >
          Play
        </button>
        <button
          type="button"
          onClick={changeout}
          disabled={!live || !pickedIds.size || round.changeoutsLeft <= 0}
          title="Put the chosen tiles back in the bag and draw as many"
        >
          Swap{pickedIds.size ? ' ' + pickedIds.size : ''}
        </button>
        <button type="button" onClick={() => setWord('')} disabled={!live}>
          Clear
        </button>
        {helper && (
          <button
            type="button"
            onClick={() => {
              const best = SB.bestFromRack(
                rackLetters,
                (w) => round.scoreFor(w),
                1,
              );
              if (best.length) setWord(best[0].word);
              else say('Nothing spells out of this rack.');
            }}
            disabled={!live}
          >
            Best play
          </button>
        )}
      </div>

      <details className="sb-piles" aria-label="The bag and the discard pile">
        <summary title="Played and swapped tiles wait here until the bag is empty; the bag reshuffles each fight.">
          <span>
            <b>{round.pile.drawPile.length}</b> in the bag
          </span>
          <span>
            <b>{round.pile.discardPile.length}</b> discarded
          </span>
        </summary>
        <div className="sb-pile-tiles">
          {round.pile.discardPile.length === 0 && (
            <span className="sb-hint">Nothing discarded yet.</span>
          )}
          {round.pile.discardPile.map((t) => (
            <span
              key={t.id}
              className={'sb-pile-tile' + (t.mark ? ' is-' + t.mark : '')}
            >
              {t.letter}
            </span>
          ))}
        </div>
      </details>
      {helper && (
        <details className="sb-suggests-drop">
          <summary>
            <span className="sb-suggests-title">Words</span>
            {indexing && (
              <span className="sb-hint">reading the dictionary…</span>
            )}
            {!indexing && !letters && (
              <span className="sb-hint">pick tiles or type letters</span>
            )}
            {!indexing && letters && suggestions.length === 0 && (
              <span className="sb-hint">nothing spells out of {letters}</span>
            )}
            {!indexing && suggestions.length > 0 && (
              <span className="sb-suggests-count">
                {suggestions.length}
                <b>{suggestions[0].word}</b>
                <em>{suggestions[0].score}</em>
              </span>
            )}
          </summary>
          <div className="sb-suggests">
            {!indexing &&
              suggestions.map((s, i) => (
                <button
                  key={s.word}
                  type="button"
                  className={'sb-suggest' + (i === 0 ? ' is-best' : '')}
                  onClick={() => playWord(s.word)}
                  disabled={!live}
                >
                  {s.word}
                  <em>{s.score}</em>
                </button>
              ))}
          </div>
        </details>
      )}
      {!formable && letters && (
        <p className="sb-hint sb-warn-line">
          {letters} needs letters that aren’t in your rack.
        </p>
      )}
      {formable && barredNow.length > 0 && (
        <p className="sb-hint sb-warn-line">
          {barredNow.map((t) => t.letter).join(', ')} has been played this round
          — {round.rule.name}.
        </p>
      )}
    </section>
  );
});

export default PlayBoard;
