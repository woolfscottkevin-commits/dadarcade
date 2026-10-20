import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const source = await readFile(new URL('offline-scores.js', root), 'utf8');
function gameContext() {
  const data = new Map();
  const context = { Response, URL, Date, Math, location: { href: 'arcade://bundled/balloon-uncle-bop/index.html?edition=public' },
    localStorage: { getItem: k => data.get(k), setItem: (k, v) => data.set(k, v) },
    window: { fetch: () => { throw new Error('Unexpected network request'); } } };
  vm.runInNewContext(source, context);
  return context;
}
test('offline scores save, rank, persist, and reject malformed initials without network calls', async () => {
  const ctx = gameContext();
  const post = (initials, score) => ctx.window.fetch('/api/scores?game=bub', { method: 'POST', body: JSON.stringify({ initials, score }) });
  assert.equal((await post('<b>', 50)).status, 400);
  assert.equal((await post('AAA', -10)).status, 400);
  await post('AAA', 100);
  const high = await (await post('BBB', 200)).json();
  assert.equal(high.alltimeRank, 1);
  assert.deepEqual(high.alltime.map(e => e.initials), ['BBB', 'AAA']);
  const data = await (await ctx.window.fetch('/api/scores?game=bub')).json();
  assert.equal(data.daily.length, 2);
  ctx.localStorage.setItem = () => { throw Error('Full'); };
  assert.equal((await post('CCC', 300)).status, 507);
});
test('the bundled public edition contains no family photographs, analytics, or remote fonts', async () => {
  const bundle = new URL('DadArcade/Resources/Offline/', root);
  const names = await readdir(new URL('balloon-uncle-bop/assets/', bundle));
  assert.ok(!names.some(name => name.startsWith('face-')));
  assert.equal(names.filter(name => name.startsWith('illustrated-')).length, 4);
  for (const name of ['mahjong/index.html', 'mahjong/american/index.html', 'balloon-uncle-bop/index.html']) {
    const html = await readFile(new URL(name, bundle), 'utf8');
    assert.ok(html.includes("connect-src 'none'"));
    assert.ok(!html.includes('googletagmanager.com'));
    assert.ok(!html.includes('fonts.googleapis.com'));
    const boot = name.includes('balloon') ? 'initPasswordGate();' : name.includes('american') ? "openSheet('menu')" : "openSheet('home')";
    assert.ok(html.includes(boot), `Game boot code missing from ${name}`);
    for (const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (/src=|application\/ld\+json/.test(match[1])) continue;
      assert.doesNotThrow(() => new vm.Script(match[2]), `Invalid JavaScript in ${name}`);
    }
  }
});
