// Home: a live 3D build assembling itself behind the title, then everything in the book.
// The 3D engine is imported inside render(), not at the top: the Builds page borrows buildCard()
// from here and should stay a light reading page.
import { esc, icon, pips, plural, calm, $, $$ } from '../lib/ui.js';
import { catalog, content, buildData } from '../lib/data.js';
import { log } from '../lib/store.js';
import { clack } from '../lib/sound.js';

// a picture for each promise on the home page, matched by its words (not by its place in the list)
const PROMISE_ICONS = [[/3d|drop|watch/i, 'cube'], [/build mode|tv|next to/i, 'mode'], [/size|starter|legend/i, 'layers'],
  [/read|speaker|listen/i, 'speaker'], [/night|lantern|light/i, 'moon'], [/wi-?fi|save|offline/i, 'check']];
const promiseIcon = p => (PROMISE_ICONS.find(([re]) => re.test(p)) || [0, 'cube'])[1];

export function buildCard(b, done) {
  const d = b.diff || 1, t = b.tiers_stats || [];
  const newChip = (b.auto_new || []).length ? '<span class="chip new">NEW BLOCKS</span>' : '';
  return `<a class="bcard ${b.kind}" href="#/build/${esc(b.slug)}" data-slug="${esc(b.slug)}">
    <div class="bcard-art"><img src="img/posters/${esc(b.slug)}.webp" alt="" loading="lazy" decoding="async"></div>
    <div class="bcard-body">
      <div class="bcard-top">${newChip}${done ? `<span class="chip done">${icon('check')} Built</span>` : ''}</div>
      <h3 style="view-transition-name:title-${esc(b.slug)}">${esc(b.title)}</h3>
      <p>${esc(b.pitch || '')}</p>
      <div class="bcard-meta">${pips(d)}<span>${b.ntiers > 1 ? `${b.ntiers} sizes · ` : ''}${t[0] ? `from ${t[0].minutes} min` : ''}</span></div>
    </div></a>`;
}

export async function render(main, params, ctx) {
  // start the 3D engine loading while the words come in
  const s3dP = import('../lib/stage3d.js'), stageP = s3dP.then(m => m.getStage()).catch(() => null);
  const { has3D, skyFor } = await s3dP;
  const cat = await catalog();
  const book = ctx.book || await content('book').catch(() => ({}));
  const optional = n => content(n).catch(() => null);
  const [lessons, redstone, showcase, top10] = await Promise.all([optional('lessons'), optional('redstone'), optional('showcase'), optional('top10')]);
  const done = log.done();
  const big = cat.builds.filter(b => b.kind !== 'mini'), minis = cat.builds.filter(b => b.kind === 'mini');
  const feature = cat.builds.find(b => b.featured) || big[0];
  const promise = (book.home && book.home.promise) || [];

  main.innerHTML = `
  <section class="hero" id="hero">
    <div class="hero-sky" id="hero-sky"></div>
    <div class="hero-stage" id="hero-stage" aria-label="A 3D build putting itself together, layer by layer"></div>
    ${has3D ? '' : `<img class="hero-poster" src="img/posters/${esc(feature.slug)}.webp" alt="">`}
    <div class="hero-copy wrap">
      <div class="hero-badge">Volume 2</div>
      <h1 class="hero-title"><span>Layer</span> <span>by</span> <span>Layer</span></h1>
      <p class="hero-sub">${esc(book.subtitle || 'The Living Build Book')}<span class="hero-for">for Minecraft Bedrock</span></p>
      <p class="hero-hello" data-read>${esc((book.home && book.home.hello) || 'Every build in this book is alive. Spin it, slice it, and watch it put itself together. Then build it yourself, one layer at a time.')}</p>
      <div class="hero-cta">
        <a class="btn big gold" href="#/builds">${icon('builds')} Pick a build</a>
        <a class="btn big ghost" href="#/build/${esc(feature.slug)}">${icon('play')} ${esc(feature.title)}</a>
      </div>
    </div>
    <div class="hero-caption" id="hero-caption">${esc(feature.title)}</div>
  </section>

  <div class="wrap" data-readable>
    ${promise.length ? `<section class="section promise">${promise.map(p => `<div class="pcard">${icon(promiseIcon(p))}<p>${esc(p)}</p></div>`).join('')}</section>` : ''}

    <section class="section">
      <div class="section-head"><div><div class="kicker">Big builds</div><h2>Step-by-Step Builds</h2></div><a class="btn small ghost" href="#/builds">All builds ${icon('next')}</a></div>
      <div class="grid builds-grid">${big.map(b => buildCard(b, done[b.slug])).join('')}</div>
    </section>

    ${minis.length ? `<section class="section">
      <div class="section-head"><div><div class="kicker" style="color:var(--c-minis)">Quick wins</div><h2>Mini Builds</h2></div></div>
      <div class="grid builds-grid minis-grid">${minis.map(b => buildCard(b, done[b.slug])).join('')}</div>
    </section>` : ''}

    <section class="section parts">
      ${partCard('secrets', 'Master Builder Secrets', lessons && lessons.intro, lessons && lessons.lessons && lessons.lessons.length, 'lesson', '#/secrets', 'secrets')}
      ${partCard('redstone', 'Redstone Workshop', redstone && redstone.intro, redstone && redstone.gadgets && redstone.gadgets.length, 'gadget', '#/redstone', 'redstone')}
      ${partCard('showcase', 'Master Build Showcase', showcase && showcase.intro, showcase && showcase.features && showcase.features.length, 'story', '#/showcase', 'showcase')}
      ${partCard('top10', 'Top 10 Coolest Things to Do', top10 && top10.intro, top10 && top10.items && top10.items.length ? 10 : 0, 'thing', '#/top10', 'top10')}
    </section>

    <section class="section grown">
      <div class="card grown-card">
        <div><div class="kicker" style="color:var(--c-log)">For grown-ups</div><h2>Reading together, privacy and offline</h2>
        <p>No accounts, no chat, nothing typed is collected. Progress stays on this device. Visits are counted with Google Analytics. Save the whole book to use with no Wi-Fi.</p></div>
        <div class="grown-actions"><a class="btn" style="--c:var(--c-log)" href="#/grownups">For Grown-ups</a><a class="btn ghost" href="#/howto">How to use this book</a><a class="btn ghost" href="/layer-by-layer">Volume 1</a></div>
      </div>
    </section>
  </div>`;
  ctx.setReadable(true);

  function partCard(key, title, intro, n, word, href, ic) {
    const many = word === 'story' ? 'stories' : undefined;
    return `<a class="part-card" href="${href}" style="--pc:var(--c-${key})">${icon(ic)}<h3>${esc(title)}</h3><p>${esc(intro || '')}</p>${n ? `<span class="chip">${plural(n, word, many)}</span>` : ''}</a>`;
  }

  // the live hero
  $('#hero-sky', main).style.background = skyFor(0.42);
  if (has3D) {
    const stage = await stageP;
    if (stage && document.body.contains(main.querySelector('#hero-stage'))) {
      stage.mount($('#hero-stage', main));
      const data = await buildData(feature.slug);
      await stage.show(data, { view: 'hero', groundBlock: feature.ground || undefined });
      stage.setTime(feature.time || 0.42);
      $('#hero-sky', main).style.background = skyFor(feature.time || 0.42);
      // aim the build at the right-hand side on wide screens so the title has room
      if (innerWidth > 900) stage.setShift(0.2);
      const layers = data.bounds[4] - data.bounds[1] + 1;
      if (!calm()) {
        // the whole show stays under 5 seconds (no pause button needed): under 4 s of building, then
        // the layers close up in 0.7 s. A timer (not a tick count) ends it, so slow frames can't stretch
        // it. It stops at once if Calm mode is turned on part way through.
        const ms = Math.min(3900, layers * 380);
        stage.set('uOpen', 1); stage.set('uReveal', 0);
        stage.set('uReveal', layers + 1, ms);
        let n = 0;
        const finish = quick => { clearInterval(t); clearTimeout(end); if (quick) stage.set('uReveal', layers + 1); stage.set('uOpen', 0, quick ? 0 : 700); };
        const t = setInterval(() => { if (++n % 2) clack(.9 + Math.random() * .4); }, 95);
        const end = setTimeout(() => finish(false), ms);
        const mo = new MutationObserver(() => { if (calm()) { finish(true); mo.disconnect(); } });
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-calm'] });
        return () => { clearInterval(t); clearTimeout(end); mo.disconnect(); };
      }
    }
  }
}
