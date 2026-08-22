// React port of the "choose from a list" panel family (STRUCTURAL ticket,
// sub-step after the combat panel): treasure-panel/tile-reward-panel/
// boss-reward-panel from wordbound.html's game.js renderTreasure()/
// renderShop()/renderTileReward()/renderBossReward(). These four share one
// shape (a heading, a grid of clickable choice buttons, sometimes a trailing
// leave/skip button) and every one of their Game.* actions (pickTreasureItem,
// buyItem, buyShopTile, leaveShop, pickTileReward, skipTileReward,
// pickBossItemReward, skipBossItemReward) is a synchronous state mutator --
// same shape as toggleOvercharge/rewriteRack in CombatScreen.jsx, so no
// setTimeout-bridging is needed here.
//
// EventScreen and ShredderScreen (below) are the same family too -- ported
// in the STRUCTURAL ticket's EVENT/SHREDDER sub-step, direct ports of
// game.js's renderEvent()/renderShredder().
export function TreasureOrShopScreen({ state, Game, act }) {
  const Items = window.Wordbound.Items;
  const Tiles = window.Wordbound.Tiles;
  const Shopkeepers = window.Wordbound.Shopkeepers;
  const isShop = state.screen === 'SHOP';
  const shopAuthorDef = (isShop && Shopkeepers && state.shopkeeperId) ? Shopkeepers.AUTHOR_DEFS[state.shopkeeperId] : null;

  return (
    <div className="treasure-panel">
      <h2>{isShop ? `Shop — Gold: ${state.player.gold} 🪙` : 'Choose an item'}</h2>
      {shopAuthorDef && (
        <div className="shop-keeper-banner">
          <span className="shop-keeper-glyph">{shopAuthorDef.glyph}</span>
          <span className="shop-keeper-text">
            <strong>{shopAuthorDef.name}</strong>, {shopAuthorDef.epithet}
            <br /><em>&quot;{state.shopkeeperLine}&quot;</em>
            <br /><span className="shop-keeper-quirk">{shopAuthorDef.quirkName}: {shopAuthorDef.quirkDescription}</span>
          </span>
        </div>
      )}
      <div className="treasure-choices">
        {isShop ? (
          <ShopChoices state={state} Game={Game} act={act} Items={Items} />
        ) : (
          state.treasureOptions.map((itemId) => {
            const def = Items.ITEM_DEFS[itemId];
            return (
              <button key={itemId} className="treasure-choice"
                onClick={() => act(() => Game.pickTreasureItem(itemId))}>
                <strong>{def.name}</strong><br />{def.hint}
              </button>
            );
          })
        )}
      </div>
      {isShop && state.shopTileOffer && (
        <ShopTileOffer state={state} Game={Game} act={act} Tiles={Tiles} />
      )}
      {isShop && (
        <button className="btn btn-secondary" style={{ marginTop: 10 }}
          onClick={() => act(Game.leaveShop)}>
          Leave Shop
        </button>
      )}
    </div>
  );
}

const VARIANT_TILE_SHOP_PRICE = 45; // mirrors game.js's own constant of the same name

function ShopChoices({ state, Game, act, Items }) {
  if (!state.shopOptions || state.shopOptions.length === 0) {
    return <p style={{ textAlign: 'center' }}>No items available in shop</p>;
  }
  return state.shopOptions.map((itemId) => {
    const def = Items.ITEM_DEFS[itemId];
    if (!def) return null;
    const price = Game.getShopItemPrice(itemId);
    const discounted = price < (def.shopPrice || 0);
    const canAfford = state.player.gold >= price;
    const priceColor = canAfford ? '#f0d789' : '#8b7355';
    return (
      <button key={itemId} className={'treasure-choice' + (canAfford ? '' : ' shop-unavailable')}
        style={{ opacity: canAfford ? 1 : 0.6 }} disabled={!canAfford}
        onClick={() => act(() => Game.buyItem(itemId))}>
        <strong>{def.name}</strong><br />
        {def.hint}<br />
        <span style={{ color: priceColor }}>Cost: {discounted ? <><s>{def.shopPrice}</s> {price}</> : price} 🪙</span>
      </button>
    );
  });
}

function ShopTileOffer({ state, Game, act, Tiles }) {
  const tile = state.shopTileOffer;
  const canAfford = state.player.gold >= VARIANT_TILE_SHOP_PRICE;
  const priceColor = canAfford ? '#f0d789' : '#8b7355';
  const displayLetter = tile.letter === '?' ? '★' : tile.letter;
  return (
    <button className={'treasure-choice variant-' + tile.variant + (canAfford ? '' : ' shop-unavailable')}
      style={{ opacity: canAfford ? 1 : 0.6 }} disabled={!canAfford}
      onClick={() => act(Game.buyShopTile)}>
      <strong>Premium Tile: {displayLetter}</strong>
      <span style={{ fontSize: '0.8rem', color: '#9a8b6f' }}> [Tile]</span><br />
      {Tiles.describeVariant(tile.variant)}<br />
      <span style={{ color: priceColor }}>Cost: {VARIANT_TILE_SHOP_PRICE} 🪙</span>
    </button>
  );
}

export function TileRewardScreen({ state, Game, act }) {
  const Tiles = window.Wordbound.Tiles;
  const Lexicon = window.Wordbound.Lexicon;

  return (
    <div className="treasure-panel">
      <h2>Add a tile to your deck?</h2>
      <div className="treasure-choices treasure-choices-tiles">
        {state.tileRewardOptions.map((tile) => {
          let bonusClass = '';
          if (tile.variant) bonusClass = ' has-bonus variant-' + tile.variant;
          else if (tile.bonus) {
            bonusClass = ' has-bonus';
            if (tile.bonus.type === 'flatOnPlay') bonusClass += ' bonus-flat';
            else if (tile.bonus.type === 'multOnPlay') bonusClass += ' bonus-mult-play';
            else if (tile.bonus.type === 'multOnHold') bonusClass += ' bonus-mult-hold';
          }
          const bonusDesc = Tiles.describeVariant(tile.variant) || Tiles.describeBonus(tile.bonus);
          let val = Lexicon.LETTER_VALUES[tile.letter] || 0;
          // Same doubled value the rack will show once this tile is in play --
          // otherwise the reward screen understates what the player is picking.
          if (tile.variant === Tiles.VARIANTS.VOLATILE) val *= 2;
          const displayLetter = tile.letter === '?' ? '★' : tile.letter;
          return (
            <button key={tile.id} className={'treasure-choice treasure-choice-tile' + bonusClass}
              onClick={() => act(() => Game.pickTileReward(tile.id))}>
              <span className="tile-reward-letter">{displayLetter}<sub>{val}</sub></span>
              {bonusDesc && <span className="tile-reward-bonus">{bonusDesc}</span>}
            </button>
          );
        })}
      </div>
      <button className="btn btn-secondary tile-reward-skip" onClick={() => act(Game.skipTileReward)}>
        Skip
      </button>
    </div>
  );
}

export function BossRewardScreen({ state, Game, act }) {
  const Items = window.Wordbound.Items;
  return (
    <div className="treasure-panel">
      <h2>The boss's hoard yields a powerful find</h2>
      <div className="treasure-choices">
        {state.bossRewardOptions.map((itemId) => {
          const def = Items.ITEM_DEFS[itemId];
          return (
            <button key={itemId} className="treasure-choice"
              onClick={() => act(() => Game.pickBossItemReward(itemId))}>
              <strong>{def.name}</strong><br />{def.hint}
            </button>
          );
        })}
      </div>
      <button className="btn btn-secondary tile-reward-skip" onClick={() => act(Game.skipBossItemReward)}>
        Skip
      </button>
    </div>
  );
}

// Direct port of renderEvent(): a heading + italic flavor text + a column of
// choice buttons, where each choice's `disabledReason(state)` (events.js) is
// re-evaluated on every render -- same live re-check game.js's own
// chooseEventOption does before applying a choice's effect, so a disabled
// choice can never be clicked through even via a stale render.
export function EventScreen({ state, Game, act }) {
  const event = state.currentEvent;
  if (!event) return null;
  return (
    <div className="treasure-panel">
      <h2>{event.name}</h2>
      <p style={{ textAlign: 'center', color: '#b8ac8a', marginBottom: 20, fontStyle: 'italic' }}>{event.text}</p>
      <div className="treasure-choices">
        {event.choices.map((choice, index) => {
          const reason = choice.disabledReason ? choice.disabledReason(state) : null;
          return (
            <button key={index} className="treasure-choice" disabled={!!reason}
              style={reason ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
              onClick={reason ? undefined : () => act(() => Game.chooseEventOption(index))}>
              {reason ? (<>{choice.text}<br /><em style={{ color: '#b8ac8a' }}>({reason})</em></>) : choice.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Direct port of renderShredder(): the deck-viewer list made pickable, same
// remaining-picks math as game.js's shredderRemainingPicks() (not reused
// directly -- that function is internal to game.js and only exposes a
// test-only inspection hook, `Game._shredderRemainingPicks`, per its own
// comment -- so the cap/floor math is mirrored here instead of imported).
export function ShredderScreen({ state, Game, act }) {
  const Events = window.Wordbound.Events;
  const Tiles = window.Wordbound.Tiles;
  const picked = state.shredderSelection.length;
  const byCap = Events.SHREDDER_MAX_TILES - picked;
  const byDeckFloor = state.deck.length - Events.SHREDDER_MIN_DECK_SIZE - picked;
  const remaining = Math.max(0, Math.min(byCap, byDeckFloor));
  const status = picked > 0
    ? `Feeding ${picked} tile${picked > 1 ? 's' : ''} to the Shredder. `
      + (remaining > 0 ? `You may pick ${remaining} more, or confirm.` : 'Confirm to destroy them.')
    : `Pick up to ${Events.SHREDDER_MAX_TILES} tiles to destroy (or confirm to feed it nothing).`;
  const sorted = state.deck.slice().sort((a, b) => a.letter.localeCompare(b.letter));

  return (
    <div className="treasure-panel">
      <h2>Feed the Shredder</h2>
      <p style={{ textAlign: 'center', color: '#b8ac8a', marginBottom: 20, fontStyle: 'italic' }}>{status}</p>
      <div className="treasure-choices">
        {sorted.map((tile) => {
          const isPicked = state.shredderSelection.indexOf(tile.id) !== -1;
          const variantClass = tile.variant ? ' variant-' + tile.variant : '';
          const bonusDesc = Tiles.describeVariant(tile.variant) || Tiles.describeBonus(tile.bonus);
          // Same reversibility rule as game.js: an already-picked tile stays
          // clickable (to un-pick it) even once the pick budget is spent.
          const disabled = !isPicked && remaining <= 0;
          return (
            <button key={tile.id} className={'treasure-choice' + variantClass + (isPicked ? ' shredder-picked' : '')}
              disabled={disabled} style={disabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
              onClick={disabled ? undefined : () => act(() => Game.toggleShredderTile(tile.id))}>
              <strong>{tile.letter === '?' ? '★' : tile.letter}</strong>
              {bonusDesc && <><br />{bonusDesc}</>}
              {isPicked && <><br /><em>— for the teeth</em></>}
            </button>
          );
        })}
      </div>
      <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => act(Game.confirmShredder)}>
        Confirm
      </button>
    </div>
  );
}
