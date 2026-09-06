#!/usr/bin/env node
// tools/fetch-wiktionary.js
// Pulls every page title in Wiktionary's "English lemmas" category (and,
// with --forms, "English non-lemma forms") through the MediaWiki API, keeps
// the ones that are plain single lowercase words, and bakes those the
// wordlist lacks into the GENERATED WIKT_EXTRA block of
// js/wordbound/wordlist.js. Wiktionary text is CC BY-SA 4.0; a title list
// is attribution-only in practice and the attribution lives in the wordlist
// header.
//
//   node tools/fetch-wiktionary.js            # fetch (resumable) + bake
//   node tools/fetch-wiktionary.js --bake     # bake from the cache only
//   node tools/fetch-wiktionary.js --forms    # also pull non-lemma forms
//
// Raw titles cache in .cache/wiktionary/<category>.txt with a .continue
// file beside it, so an interrupted run picks up where it stopped.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CACHE = path.join(ROOT, '.cache', 'wiktionary');
const WORDLIST = path.join(ROOT, 'js', 'wordbound', 'wordlist.js');
const API = 'https://en.wiktionary.org/w/api.php';
const UA = 'wordbound-crescendo/1.0 (https://github.com/gidntsquia/wordbound-crescendo; word list build) node';
const BEGIN = '  // GENERATED WIKT_EXTRA begin (tools/fetch-wiktionary.js) -- do not edit by hand';
const END = '  // GENERATED WIKT_EXTRA end';

const args = process.argv.slice(2);
const bakeOnly = args.includes('--bake');
const withForms = args.includes('--forms');
const CATS = ['English lemmas'].concat(withForms ? ['English non-lemma forms'] : []);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchCategory(cat) {
  fs.mkdirSync(CACHE, { recursive: true });
  const slug = cat.replace(/\W+/g, '_');
  const out = path.join(CACHE, slug + '.txt');
  const contFile = path.join(CACHE, slug + '.continue');
  if (fs.existsSync(out) && !fs.existsSync(contFile)) {
    console.log(`${cat}: cached`);
    return out;
  }
  let cont = fs.existsSync(contFile) ? fs.readFileSync(contFile, 'utf8').trim() : '';
  if (!cont && fs.existsSync(out)) fs.unlinkSync(out);
  let pages = 0, titles = 0;
  for (;;) {
    const u = new URL(API);
    u.search = new URLSearchParams({
      action: 'query', list: 'categorymembers', cmtitle: 'Category:' + cat,
      cmlimit: '500', cmnamespace: '0', cmprop: 'title', format: 'json', formatversion: '2',
      ...(cont ? { cmcontinue: cont } : {}),
    }).toString();
    let json;
    for (let attempt = 0; ; attempt++) {
      try {
        const res = await fetch(u, { headers: { 'User-Agent': UA, 'Accept-Encoding': 'gzip' } });
        if (res.status === 429 || res.status >= 500) throw new Error('HTTP ' + res.status);
        json = await res.json();
        if (json.error) throw new Error(JSON.stringify(json.error));
        break;
      } catch (e) {
        if (attempt >= 8) throw e;
        const wait = Math.min(60000, 1000 * 2 ** attempt);
        console.error(`  ${e.message}; retry in ${wait / 1000}s`);
        await sleep(wait);
      }
    }
    const members = json.query.categorymembers.map((m) => m.title);
    fs.appendFileSync(out, members.join('\n') + '\n');
    pages++; titles += members.length;
    if (pages % 50 === 0) console.log(`${cat}: ${pages} pages, ${titles} titles`);
    cont = json.continue && json.continue.cmcontinue;
    if (!cont) { if (fs.existsSync(contFile)) fs.unlinkSync(contFile); break; }
    fs.writeFileSync(contFile, cont);
    await sleep(120);
  }
  console.log(`${cat}: done, ${pages} pages, ${titles} titles`);
  return out;
}

function currentWords(src) {
  // Evaluate the wordlist in a fake window to get the exact set the game sees.
  const vm = require('vm');
  const win = {};
  vm.runInNewContext(src, { window: win });
  return new Set(win.Wordbound.WORDLIST);
}

function bake(files) {
  const src = fs.readFileSync(WORDLIST, 'utf8');
  const stripped = (src.includes(BEGIN)
    ? src.slice(0, src.indexOf(BEGIN)) + src.slice(src.indexOf(END) + END.length + 1)
    : src).replace(', WIKT_EXTRA);', ');');
  const have = currentWords(stripped);
  const extra = new Set();
  let seen = 0, plain = 0;
  for (const f of files) {
    for (const t of fs.readFileSync(f, 'utf8').split('\n')) {
      if (!t) continue;
      seen++;
      // Wiktionary titles are case-sensitive: lowercase-only rules out proper
      // nouns and abbreviations; a-z only drops phrases, hyphens, apostrophes,
      // diacritics.
      if (!/^[a-z]{4,15}$/.test(t)) continue; // 4+: the 2-3 letter titles are mostly abbreviations (AFK, ADJ)
      plain++;
      const w = t.toUpperCase();
      if (!have.has(w)) extra.add(w);
    }
  }
  const list = Array.from(extra).sort();
  const block = BEGIN + '\n  var WIKT_EXTRA = ' + JSON.stringify(list) + ';\n' + END + '\n';
  const anchor = '  var WORDS = WORDS_BASE.concat(';
  const i = stripped.indexOf(anchor);
  if (i < 0) throw new Error('anchor not found in wordlist.js');
  let next = stripped.slice(0, i) + block + stripped.slice(i);
  next = next.replace(/var WORDS = WORDS_BASE\.concat\(([^)]*)\);/, (m, inner) =>
    inner.includes('WIKT_EXTRA') ? m : `var WORDS = WORDS_BASE.concat(${inner}, WIKT_EXTRA);`);
  fs.writeFileSync(WORDLIST, next);
  const total = have.size + list.length;
  console.log(`wiktionary: ${seen} titles, ${plain} plain words, ${list.length} new; wordlist now ${total}`);
}

(async () => {
  const files = [];
  for (const cat of CATS) {
    const slug = cat.replace(/\W+/g, '_');
    files.push(bakeOnly ? path.join(CACHE, slug + '.txt') : await fetchCategory(cat));
  }
  bake(files.filter((f) => fs.existsSync(f)));
})().catch((e) => { console.error(e); process.exit(1); });
