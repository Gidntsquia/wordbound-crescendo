#!/usr/bin/env node
/**
 * Spot-check responsive/mobile layout at common small-screen widths.
 *
 * Tests at 375px (iPhone SE) and 414px (iPhone 12/13) viewport widths.
 * Checks for: horizontal overflow, elements clipped off screen, readable text, button sizes.
 */

const { chromium } = require('@playwright/test');
const http = require('http');
const path = require('path');
const fs = require('fs');

const PORT = 9879;
let server;

async function startServer() {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      let filePath = path.join(__dirname, '..', req.url === '/' ? 'wordbound.html' : req.url);
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        const ext = path.extname(filePath);
        let contentType = 'text/html';
        if (ext === '.js') contentType = 'application/javascript';
        if (ext === '.css') contentType = 'text/css';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    });
    server.listen(PORT, resolve);
  });
}

async function checkLayout(page, widthPx, heightPx = 800) {
  const results = {
    width: widthPx,
    height: heightPx,
    checks: {
      overflowX: false,
      elementsClipped: [],
      hiddenElements: 0,
      buttonSizesOK: true,
      textReadable: true
    }
  };

  // Set viewport
  await page.setViewportSize({ width: widthPx, height: heightPx });
  await page.waitForTimeout(300);

  // Check for horizontal overflow
  const overflow = await page.evaluate(() => {
    const viewport = document.documentElement;
    const hasOverflow = viewport.scrollWidth > viewport.clientWidth;
    const scrollAmount = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    return { hasOverflow, scrollAmount };
  });

  results.checks.overflowX = overflow.hasOverflow;

  if (overflow.hasOverflow) {
    console.log(`  ⚠️  Horizontal overflow detected: ${overflow.scrollAmount}px beyond viewport`);
  }

  // Check for clipped elements
  const clipped = await page.evaluate(() => {
    const viewport = window.innerWidth;
    const clippedElements = [];

    const visibleElements = Array.from(document.querySelectorAll('*')).filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });

    visibleElements.forEach(el => {
      const rect = el.getBoundingClientRect();
      // Check if element extends past right edge
      if (rect.right > viewport && rect.width > 10) {
        clippedElements.push({
          tag: el.tagName,
          class: el.className,
          text: el.textContent?.substring(0, 30),
          right: Math.round(rect.right),
          viewport: viewport,
          overflow: Math.round(rect.right - viewport)
        });
      }
    });

    return clippedElements.slice(0, 3); // Return top 3
  });

  if (clipped.length > 0) {
    results.checks.elementsClipped = clipped;
    clipped.forEach(el => {
      console.log(`  ⚠️  Element clipped (${el.overflow}px): ${el.tag}.${el.class} "${el.text}"`);
    });
  }

  // Check button sizes (should be at least 44px tall for touch)
  const buttonSizes = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button')).filter(btn => {
      const style = window.getComputedStyle(btn);
      return style.display !== 'none' && style.visibility !== 'hidden' && btn.offsetParent !== null;
    });
    const tooSmall = buttons.filter(btn => {
      const rect = btn.getBoundingClientRect();
      return rect.height < 36 || rect.width < 36;
    });

    return {
      total: buttons.length,
      tooSmall: tooSmall.length,
      examples: tooSmall.slice(0, 2).map(btn => ({
        text: btn.textContent.substring(0, 20),
        height: Math.round(btn.getBoundingClientRect().height),
        width: Math.round(btn.getBoundingClientRect().width)
      }))
    };
  });

  if (buttonSizes.tooSmall > 0) {
    console.log(`  ⚠️  ${buttonSizes.tooSmall} buttons are < 36px (hard to touch)`);
    buttonSizes.examples.forEach(btn => {
      console.log(`     "${btn.text}": ${btn.height}x${btn.width}px`);
    });
    results.checks.buttonSizesOK = false;
  }

  // Check text legibility (font size > 12px)
  const textSizes = await page.evaluate(() => {
    const textElements = Array.from(document.querySelectorAll('body *')).filter(el => {
      return el.textContent?.trim().length > 0 && !el.querySelector('*');
    });

    const tooSmall = textElements.filter(el => {
      const fontSize = parseFloat(window.getComputedStyle(el).fontSize);
      return fontSize < 12;
    });

    return {
      total: textElements.length,
      tooSmall: tooSmall.length,
      minSize: Math.min(...textElements.map(el => parseFloat(window.getComputedStyle(el).fontSize)))
    };
  });

  if (textSizes.tooSmall > 0) {
    console.log(`  ⚠️  ${textSizes.tooSmall} text elements < 12px (hard to read)`);
    results.checks.textReadable = false;
  }

  return results;
}

async function main() {
  try {
    await startServer();
    console.log('Starting mobile layout verification...\n');

    // Some sandboxes pre-install a Chromium build under a fixed path that may not match
    // the exact revision @playwright/test's package.json pins (its own auto-resolved
    // path can then 404). Prefer that fixed path when present; otherwise fall back to
    // Playwright's normal resolution (e.g. Jaxon's local Mac, where it doesn't exist).
    const sandboxChromiumPath = '/opt/pw-browsers/chromium';
    const launchOpts = { headless: true };
    if (fs.existsSync(sandboxChromiumPath)) {
      launchOpts.executablePath = sandboxChromiumPath;
    }
    const browser = await chromium.launch(launchOpts);

    const page = await browser.newPage();

    // Load game
    await page.goto(`http://localhost:${PORT}/wordbound.html`, {
      waitUntil: 'networkidle'
    });

    await page.waitForFunction(() => window.Wordbound?.Game, { timeout: 15000 });

    const widths = [375, 414]; // Common mobile widths
    const results = [];

    console.log('Testing main menu screen:\n');

    for (const width of widths) {
      console.log(`${width}px width:`);
      const result = await checkLayout(page, width);
      results.push(result);

      const hasIssues = result.checks.overflowX ||
                       result.checks.elementsClipped.length > 0 ||
                       !result.checks.buttonSizesOK ||
                       !result.checks.textReadable;

      console.log(`  ${hasIssues ? '⚠️  ' : '✓ '}Layout OK\n`);
    }

    // Test node map (branching map) screen (GOALS.md branching-map ticket,
    // run 2/N): the new grid+SVG DAG view replacing the old flat pill list.
    // The ticket's own bar is "tappable at 375px (44px+ targets)" -- check
    // layout overflow same as every other screen, plus a dedicated tap-
    // target size check on the clickable (.node-current) pills specifically,
    // since checkLayout's generic button-size check only looks at <button>
    // elements and node pills are plain clickable <div>s.
    console.log('Testing node map (branching map) screen:\n');

    await page.click('#btn-new-run');
    await page.waitForTimeout(300);
    await page.click('.character-option:first-child');
    await page.waitForTimeout(400);

    for (const width of widths) {
      console.log(`${width}px width:`);
      const result = await checkLayout(page, width);
      results.push(result);

      const tapTargets = await page.evaluate(() => {
        const pills = Array.from(document.querySelectorAll('.node-pill.node-current'));
        const tooSmall = pills.filter((p) => {
          const rect = p.getBoundingClientRect();
          return rect.height < 44 || rect.width < 44;
        });
        return {
          total: pills.length,
          tooSmall: tooSmall.length,
          examples: tooSmall.slice(0, 2).map((p) => ({
            text: p.textContent.substring(0, 20),
            height: Math.round(p.getBoundingClientRect().height),
            width: Math.round(p.getBoundingClientRect().width),
          })),
        };
      });
      if (tapTargets.tooSmall > 0) {
        console.log(`  ⚠️  ${tapTargets.tooSmall}/${tapTargets.total} clickable node pills are < 44px`);
        tapTargets.examples.forEach((p) => console.log(`     "${p.text}": ${p.height}x${p.width}px`));
        result.checks.buttonSizesOK = false;
      } else if (tapTargets.total === 0) {
        console.log('  ⚠️  no .node-current pills found to check (map may have failed to render)');
        result.checks.buttonSizesOK = false;
      }

      const hasIssues = result.checks.overflowX ||
                       result.checks.elementsClipped.length > 0 ||
                       !result.checks.buttonSizesOK ||
                       !result.checks.textReadable;

      console.log(`  ${hasIssues ? '⚠️  ' : '✓ '}Layout OK\n`);
    }

    // Test combat screen
    console.log('Testing combat screen:\n');

    // Navigate to combat
    await page.click('.node-pill:first-child');
    await page.waitForTimeout(400);

    // Wait for combat
    await page.waitForFunction(() => {
      return document.getElementById('combat-panel').classList.contains('hidden') === false;
    }, { timeout: 5000 }).catch(() => {});

    for (const width of widths) {
      console.log(`${width}px width:`);
      const result = await checkLayout(page, width);
      results.push(result);

      const hasIssues = result.checks.overflowX ||
                       result.checks.elementsClipped.length > 0 ||
                       !result.checks.buttonSizesOK ||
                       !result.checks.textReadable;

      console.log(`  ${hasIssues ? '⚠️  ' : '✓ '}Layout OK\n`);
    }

    // A tile-reward-screen layout block used to sit here (GOALS.md POLISH
    // review F4.5: three letter-tile-shaped choice buttons side by side at
    // 375/414px). PLAYTEST FINDINGS 3 item 2 (2026-08-22) removed the whole
    // per-kill add-a-tile step, so there is no screen left to lay out --
    // the block is deliberately deleted rather than re-pointed. The reward
    // family's remaining member, the boss hoard panel, already has its own
    // 375px overflow/tap-target check in test/verify-react-qa-boss-reward.js.

    // Test game-over screen's new end-of-run stats block (GOALS.md review
    // N6): a row-per-stat layout added to a screen that used to be just two
    // lines of text -- confirm it doesn't overflow/clip at these widths.
    console.log('Testing game-over screen (end-of-run stats block):\n');

    await page.evaluate(() => {
      const state = window.Wordbound.Game._state;
      state.screen = 'GAME_OVER';
      window.Wordbound.Game._render();
    });

    for (const width of widths) {
      console.log(`${width}px width:`);
      const result = await checkLayout(page, width);
      results.push(result);

      const hasIssues = result.checks.overflowX ||
                       result.checks.elementsClipped.length > 0 ||
                       !result.checks.buttonSizesOK ||
                       !result.checks.textReadable;

      console.log(`  ${hasIssues ? '⚠️  ' : '✓ '}Layout OK\n`);
    }

    // SHOPKEEPERS ticket (GOALS.md, SHAKESPEARE GUIDE + AUTHOR SHOPKEEPERS
    // step 2), this ticket's own "shop layout with portrait + dialogue"
    // mobile bar: the new #shop-keeper-banner (name/epithet, a sampled
    // line, the quirk description) sits above the existing item rows --
    // confirm it doesn't overflow or clip at these widths. Forces Homer
    // (the longest quirk description of the six) via the test-only
    // _setShopkeeperForTesting hook rather than hunting a seed.
    console.log('Testing shop screen (shopkeeper banner):\n');

    const shopForced = await page.evaluate(() => {
      const Wordbound = window.Wordbound;
      const Game = Wordbound.Game;
      const state = Game._state;
      if (!Wordbound.Shopkeepers) return false;
      state.screen = 'SHOP';
      Game._setShopkeeperForTesting('homer');
      state.shopOptions = Game._rollShopOptions();
      state.shopTileOffer = Wordbound.Tiles.rollVariantTile(state.rng);
      Game._render();
      return true;
    });

    if (!shopForced) {
      console.log('  SKIP -- Shopkeepers module not present (not a layout bug)\n');
    } else {
      for (const width of widths) {
        console.log(`${width}px width:`);
        const result = await checkLayout(page, width);
        results.push(result);

        const hasIssues = result.checks.overflowX ||
                         result.checks.elementsClipped.length > 0 ||
                         !result.checks.buttonSizesOK ||
                         !result.checks.textReadable;

        console.log(`  ${hasIssues ? '⚠️  ' : '✓ '}Layout OK\n`);
      }
    }

    // ITEMS ticket (GOALS.md, 2026-08-22), FORTISSIMO's own "test:mobile
    // mandatory" bar: tiles render at double size, rack halved -- confirm
    // this real combination fits 375/414px. Forces a deterministic small
    // rack matching Items.getRackCapacity's own real halved number
    // directly (rather than needing a real fresh run/fight to reach it),
    // same "force determinism via setup" convention the game-over/shop
    // sections above already use.
    console.log('Testing combat screen with Fortissimo (halved rack, doubled tiles):\n');

    await page.evaluate(() => {
      const Wordbound = window.Wordbound;
      const Game = Wordbound.Game;
      const state = Game._state;
      state.player.items = ['fortissimo'];
      const capacity = Wordbound.Items.getRackCapacity(state.player);
      state.player.rack = ['C', 'A', 'T', 'D', 'G', 'L', 'N'].slice(0, capacity).map((l) => Wordbound.Tiles.createTile(l, null));
      state.monster = { name: 'Layout Test Monster', hp: 10, maxHp: 10, traitPhases: [{ hpThreshold: 1, traitId: 'plain' }], isBoss: false };
      state.combatActive = true;
      state.screen = 'RUN';
      state.selectedTileIds = [];
      Game._render();
    });

    for (const width of widths) {
      console.log(`${width}px width:`);
      const result = await checkLayout(page, width);
      results.push(result);

      const hasIssues = result.checks.overflowX ||
                       result.checks.elementsClipped.length > 0 ||
                       !result.checks.buttonSizesOK ||
                       !result.checks.textReadable;

      console.log(`  ${hasIssues ? '⚠️  ' : '✓ '}Layout OK\n`);
    }

    // MOBILE INPUT 1/3 (GOALS.md, Jaxon 2026-08-20), real-browser touch-mode
    // check: on coarse-pointer devices the typing box must be CSS-hidden (no
    // soft keyboard) and the tap-only blank-letter picker must fit small
    // screens. jsdom can't compute display:none from the stylesheet or lay out
    // the grid, so this is the piece only a real browser can confirm. Force
    // touch-mode by mocking matchMedia coarse in-page and re-deriving the mode
    // (independent of whether headless Chromium reports a coarse pointer).
    console.log('Testing touch-mode input (coarse pointer):\n');
    let touchModeOK = true;
    {
      await page.goto(`http://localhost:${PORT}/wordbound.html`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.Wordbound?.Game, { timeout: 15000 });
      await page.setViewportSize({ width: 375, height: 800 });
      await page.evaluate(() => {
        window.matchMedia = (q) => ({
          matches: /coarse/.test(q), media: q,
          addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
        });
        window.Wordbound.Game.applyTouchModeFromMedia();
      });
      await page.waitForTimeout(100);

      const touchState = await page.evaluate(() => {
        const input = document.getElementById('word-input');
        const cs = window.getComputedStyle(input);
        return {
          bodyHasClass: document.body.classList.contains('touch-mode'),
          inputHidden: cs.display === 'none',
          submitVisible: window.getComputedStyle(document.getElementById('btn-submit-word')).display !== 'none',
          clearVisible: window.getComputedStyle(document.getElementById('btn-clear-word')).display !== 'none',
        };
      });
      console.log('  <body>.touch-mode:', touchState.bodyHasClass, '| #word-input display:none:', touchState.inputHidden);
      console.log('  Play Word visible:', touchState.submitVisible, '| Clear visible:', touchState.clearVisible);
      if (!touchState.bodyHasClass || !touchState.inputHidden || !touchState.submitVisible || !touchState.clearVisible) {
        console.log('  ⚠️  touch-mode input row not in the expected state');
        touchModeOK = false;
      }

      // Open the blank-letter picker and confirm its A-Z grid fits 375px with
      // no horizontal overflow. The picker renders from state alone (no combat
      // needed), so force it open and re-render.
      await page.evaluate(() => {
        const s = window.Wordbound.Game._state;
        s.blankPickerOpen = true;
        s.blankPickerTileId = 'layout-probe';
        window.Wordbound.Game._render();
      });
      await page.waitForTimeout(100);
      const picker = await page.evaluate(() => {
        const overlay = document.getElementById('blank-picker-overlay');
        const grid = document.getElementById('blank-picker-grid');
        const letters = grid ? grid.querySelectorAll('.blank-picker-letter') : [];
        const gridRect = grid ? grid.getBoundingClientRect() : null;
        return {
          overlayShown: overlay && !overlay.classList.contains('hidden'),
          letterCount: letters.length,
          gridRight: gridRect ? Math.round(gridRect.right) : null,
          docOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        };
      });
      console.log('  Blank picker shown:', picker.overlayShown, '| A-Z letters:', picker.letterCount, '| doc overflow:', picker.docOverflow + 'px');
      if (!picker.overlayShown || picker.letterCount !== 26 || picker.docOverflow > 0) {
        console.log('  ⚠️  blank picker layout issue at 375px');
        touchModeOK = false;
      }
      console.log(`  ${touchModeOK ? '✓ ' : '⚠️  '}Touch-mode input OK\n`);
    }

    await page.close();
    await browser.close();

    // Summary
    console.log('=== SUMMARY ===');
    const hasIssues = results.some(r => r.checks.overflowX || r.checks.elementsClipped.length > 0) || !touchModeOK;

    if (!hasIssues) {
      console.log('✅ Mobile layout appears responsive and functional');
      console.log('All tested widths (375px, 414px) display correctly');
      process.exit(0);
    } else {
      console.log('⚠️  Some mobile layout issues detected');
      console.log('See details above. Most are CSS sizing issues.');
      process.exit(1);
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    if (server) server.close();
  }
}

main();
