// The shop between fights: two cards, two packs, reroll, and the door --
// extracted unchanged from RoundSandbox.jsx (READ_SLOWLY_PLAN.md A4,
// mechanical extraction).
import HeldRow from '../fight/HeldRow';
import { cardBlurb, cardName } from '../fight/cardCopy';

export default function Shop({
  run,
  SB,
  act,
  leave,
  onInk,
  firstVisit,
  buyCard,
  pickCard,
  selecting,
  commitSelecting,
  cancelSelecting,
  toggleSelectTile,
  tip,
  setTip,
}) {
  const shop = run.shop;
  const next = SB.enemyAt(run.movement, run.stage);
  const packDef = (kind) => SB.PACK_KINDS.find((k) => k.kind === kind);
  return (
    <div className="sb-shop">
      <div className="sb-shop-head">
        <span className="sb-eyebrow">
          The shop · between fights
          {shop.coupon ? ' · coupon: cards are free' : ''}
          {shop.packs.some((p) => p.free && !p.opened) ? ' · a free pack' : ''}
        </span>
        <span className="sb-purse">
          <b>{run.ink}</b> ink
        </span>
      </div>
      {firstVisit && !selecting && (
        <div className="sb-callout sb-callout-inline">
          Quills score every word. Gold carries over.
        </div>
      )}
      {selecting && (
        <div className="sb-pack-open sb-ink-decide">
          <span className="sb-eyebrow">
            {selecting.name}
            {selecting.from === 'shop' ? ' · ' + selecting.price + ' gold' : ''}
          </span>
          <span className="sb-hint">
            {selecting.ink.targets === 0
              ? selecting.ink.hint
              : (selecting.ink.targets === 1
                  ? 'Tap one of your tiles to apply on the spot, or just buy it — '
                  : 'Tap up to ' +
                    selecting.ink.targets +
                    ' of your tiles to apply on the spot, or just buy it — ') +
                selecting.ink.hint}
          </span>
          {selecting.ink.targets > 0 && (
            <div className="sb-rack">
              {selecting.hand.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={
                    'sb-tile' +
                    (t.mark ? ' is-mark-' + t.mark : '') +
                    (selecting.ids.includes(t.id) ? ' is-inking' : '')
                  }
                  title={
                    t.mark
                      ? SB.MARK_DEFS[t.mark].name +
                        ' — ' +
                        SB.MARK_DEFS[t.mark].hint
                      : undefined
                  }
                  onClick={() => toggleSelectTile(t.id)}
                >
                  {t.letter === '?' ? '␣' : t.letter}
                  <sub>
                    {SB.LETTER_VALUES
                      ? SB.LETTER_VALUES[t.letter]
                      : window.Wordbound.Lexicon.LETTER_VALUES[t.letter]}
                  </sub>
                </button>
              ))}
            </div>
          )}
          {selecting.ink.needsVowel && selecting.ids.length > 0 && (
            <span className="sb-vowels">
              {SB.VOWELS.map((v) => (
                <button
                  key={v}
                  type="button"
                  className={
                    'sb-vowel' + (selecting.vowel === v ? ' is-on' : '')
                  }
                  onClick={() => toggleSelectTile(null, v)}
                >
                  {v}
                </button>
              ))}
            </span>
          )}
          <div className="sb-shop-row">
            <button
              type="button"
              onClick={() => commitSelecting(false)}
              disabled={run.consumables.length >= run.tune.CONSUMABLE_SLOTS}
            >
              Buy ({run.consumables.length}/{run.tune.CONSUMABLE_SLOTS} slots)
            </button>
            <button
              type="button"
              className="sb-go"
              onClick={() => commitSelecting(true)}
              disabled={
                selecting.ink.targets > 0 &&
                (!selecting.ids.length ||
                  (selecting.ink.needsVowel && !selecting.vowel))
              }
            >
              Buy &amp; apply
              {selecting.ids.length ? ' to ' + selecting.ids.length : ''}
            </button>
            <button type="button" onClick={cancelSelecting}>
              Never mind
            </button>
          </div>
        </div>
      )}
      {!selecting && run.pack && (
        <div className="sb-pack-open">
          <span className="sb-eyebrow">
            {packDef(run.pack.kind).name} · keep one
          </span>
          <div className="sb-shop-row">
            {run.pack.choices.map((c, i) => (
              <button
                key={i}
                type="button"
                className={'sb-card sb-card-pick sb-card-' + c.kind}
                title={
                  c.kind === 'tile'
                    ? 'A ' + c.tile.letter + ' for your rack'
                    : cardBlurb(SB, c, run)
                }
                onClick={() => pickCard(i)}
              >
                {c.kind === 'tile' ? (
                  <span className="sb-tile is-set sb-tile-static">
                    {c.tile.letter}
                    <sub>
                      {SB.LETTER_VALUES
                        ? SB.LETTER_VALUES[c.tile.letter]
                        : window.Wordbound.Lexicon.LETTER_VALUES[c.tile.letter]}
                    </sub>
                  </span>
                ) : (
                  <>
                    <b>{cardName(SB, c)}</b>
                    <em>{cardBlurb(SB, c, run)}</em>
                  </>
                )}
              </button>
            ))}
            <button
              type="button"
              className="sb-offer-skip"
              onClick={() => act('Kept nothing.', run.pick(null))}
            >
              Keep nothing
            </button>
          </div>
        </div>
      )}
      {!selecting && !run.pack && (
        <>
          <div className="sb-shop-row" aria-label="Cards">
            {shop.cards.map((c, i) => {
              const disabled =
                c.sold ||
                run.ink < c.price ||
                (c.kind === 'item' && run.items.length >= run.tune.ITEM_SLOTS);
              const tipId = 'shop:' + i;
              if (c.kind === 'item' && !c.sold) {
                // Tapping the whole card would buy it on the spot -- with no
                // hover on touch, that left no way to read a quill's effect
                // before spending gold on it. The icon toggles a preview
                // instead; a separate Buy button commits.
                return (
                  <span
                    key={i}
                    className={
                      'sb-card sb-card-buy sb-card-item sb-card-glyphed is-' +
                      (SB.ITEM_DEFS[c.id].rarity || 'common')
                    }
                    role="button"
                    tabIndex={0}
                    aria-label={cardName(SB, c) + ' — ' + cardBlurb(SB, c, run)}
                    onClick={() => setTip((t) => (t === tipId ? null : tipId))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setTip((t) => (t === tipId ? null : tipId));
                      }
                    }}
                  >
                    <span className="sb-card-kind">{cardName(SB, c)}</span>
                    <span className="sb-card-icon" aria-hidden="true">
                      {SB.ITEM_DEFS[c.id].glyph || '❖'}
                    </span>
                    {tip === tipId && (
                      <span className="sb-card-tip" role="tooltip">
                        <b>{cardName(SB, c)}</b>
                        <em>{cardBlurb(SB, c, run)}</em>
                      </span>
                    )}
                    <span className="sb-price">{c.price}</span>
                    <button
                      type="button"
                      className="sb-card-buy-btn"
                      disabled={disabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        buyCard(i);
                      }}
                    >
                      Buy
                    </button>
                  </span>
                );
              }
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  className={
                    'sb-card sb-card-buy sb-card-' +
                    c.kind +
                    (c.sold ? ' is-sold' : '')
                  }
                  title={
                    c.sold
                      ? 'sold'
                      : cardName(SB, c) + ' — ' + cardBlurb(SB, c, run)
                  }
                  onClick={() => buyCard(i)}
                >
                  <span className="sb-card-kind">{c.kind}</span>
                  <em>{c.sold ? '' : cardBlurb(SB, c, run)}</em>
                  <b>{c.sold ? 'sold' : cardName(SB, c)}</b>
                  {!c.sold && <span className="sb-price">{c.price}</span>}
                </button>
              );
            })}
            <button
              type="button"
              className="sb-reroll"
              disabled={run.ink < shop.rerollPrice()}
              onClick={() => act('Rerolled.', shop.reroll(), 'coin')}
            >
              Reroll <span className="sb-price">{shop.rerollPrice()}</span>
            </button>
          </div>
          <div className="sb-shop-row" aria-label="Packs">
            {shop.packs.map((p, i) => (
              <button
                key={i}
                type="button"
                disabled={p.opened || run.ink < (p.free ? 0 : p.price)}
                className={
                  'sb-card sb-card-pack sb-pack-' +
                  p.kind +
                  (p.opened ? ' is-sold' : '')
                }
                title={packDef(p.kind).hint}
                onClick={() =>
                  act(
                    'Opened a ' + packDef(p.kind).name.toLowerCase() + '.',
                    shop.openPack(i),
                    'coin',
                  )
                }
              >
                <span className="sb-card-kind">pack</span>
                <b>{p.opened ? 'opened' : packDef(p.kind).name}</b>
                <em>{p.opened ? '' : packDef(p.kind).hint}</em>
                {!p.opened && (
                  <span className="sb-price">{p.free ? 'free' : p.price}</span>
                )}
              </button>
            ))}
          </div>
          <HeldRow
            run={run}
            SB={SB}
            act={act}
            inShop
            onInk={onInk}
            tip={tip}
            setTip={setTip}
          />
          <button type="button" className="sb-go sb-shop-leave" onClick={leave}>
            Continue
            <small>
              next: {next.glyph} {next.name} · target{' '}
              {run.targetFor(run.movement, run.stage)}
            </small>
          </button>
        </>
      )}
    </div>
  );
}
