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
// NOT ported this run: EVENT (choices carry a `disabledReason(state)`
// function, not a static def-id lookup) and SHREDDER (multi-select-then-
// confirm, a different interaction shape entirely) -- both still fall
// through to RunScreen's generic NodePlaceholder. Flagged as a known gap in
// PROGRESS.md, not silently dropped.
export function TreasureOrShopScreen({ state, Game, act }) {
  const Items = window.Wordbound.Items;
  const Tiles = window.Wordbound.Tiles;
  const Consumables = window.Wordbound.Consumables;
  const isShop = state.screen === 'SHOP';

  return (
    <div className="treasure-panel">
      <h2>{isShop ? `Shop — Gold: ${state.player.gold} 🪙` : 'Choose an item'}</h2>
      <div className="treasure-choices">
        {isShop ? (
          <ShopChoices state={state} Game={Game} act={act} Items={Items} Consumables={Consumables} />
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

function ShopChoices({ state, Game, act, Items, Consumables }) {
  if (!state.shopOptions || state.shopOptions.length === 0) {
    return <p style={{ textAlign: 'center' }}>No items available in shop</p>;
  }
  return state.shopOptions.map((itemId) => {
    const isConsumable = itemId.indexOf('c:') === 0;
    const actualId = isConsumable ? itemId.substring(2) : itemId;
    const def = isConsumable ? Consumables?.CONSUMABLE_DEFS[actualId] : Items.ITEM_DEFS[actualId];
    if (!def) return null;
    const canAfford = state.player.gold >= (def.shopPrice || 0);
    const priceColor = canAfford ? '#f0d789' : '#8b7355';
    return (
      <button key={itemId} className={'treasure-choice' + (canAfford ? '' : ' shop-unavailable')}
        style={{ opacity: canAfford ? 1 : 0.6 }} disabled={!canAfford}
        onClick={() => act(() => Game.buyItem(itemId))}>
        <strong>{def.name}</strong>
        <span style={{ fontSize: '0.8rem', color: '#9a8b6f' }}>{isConsumable ? ' [Consumable]' : ''}</span><br />
        {def.hint}<br />
        <span style={{ color: priceColor }}>Cost: {def.shopPrice || 0} 🪙</span>
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
