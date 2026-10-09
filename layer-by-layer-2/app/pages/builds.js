// All builds, with simple filters a kid can tap.
import { esc, icon, $, $$, hashUrl } from '../lib/ui.js';
import { catalog } from '../lib/data.js';
import { log } from '../lib/store.js';
import { buildCard } from './home.js';

const FILTERS = [
  ['all', 'All'], ['easy', 'Easy'], ['medium', 'Medium'], ['tricky', 'Tricky'], ['survival', 'Good in Survival'], ['new', 'New blocks'], ['todo', "Haven't built yet"],
];

export async function render(main, params, ctx) {
  const cat = await catalog(), done = log.done();
  main.innerHTML = `
  <section class="band"><div class="wrap"><div class="kicker">Big and mini builds</div><h1>Step-by-Step Builds</h1>
    <p>Every build comes with a 3D model you can spin, a plan for every layer, and a block list. Big builds come in three sizes: Starter, Pro and Legend.</p></div></section>
  <div class="wrap section">
    <div class="filters" role="group" aria-label="Show builds">${FILTERS.map(([k, l], i) => `<button type="button" class="filter" data-f="${k}" aria-pressed="${i === 0}">${esc(l)}</button>`).join('')}</div>
    <h2 class="list-h">Big builds</h2><div class="grid builds-grid" id="big"></div>
    <h2 class="list-h" style="--c:var(--c-minis)">Mini builds</h2><div class="grid builds-grid minis-grid" id="mini"></div>
    <p class="muted empty" id="empty" hidden>No builds match. Try another button.</p>
  </div>`;
  let f = ctx.query.f || 'all';
  const test = b => ({
    all: true, easy: (b.diff || 1) === 1, medium: b.diff === 2, tricky: b.diff === 3, survival: (b.mode || '').toLowerCase() === 'survival',
    new: (b.auto_new || []).length > 0, todo: !done[b.slug],
  })[f];
  function draw() {
    const big = cat.builds.filter(b => b.kind !== 'mini' && test(b)), mini = cat.builds.filter(b => b.kind === 'mini' && test(b));
    $('#big', main).innerHTML = big.map(b => buildCard(b, done[b.slug])).join('');
    $('#mini', main).innerHTML = mini.map(b => buildCard(b, done[b.slug])).join('');
    $('#empty', main).hidden = big.length + mini.length > 0;
    $$('.list-h', main).forEach((h, i) => { h.hidden = !(i ? mini.length : big.length); });
    $$('.filter', main).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === f)));
  }
  $$('.filter', main).forEach(b => b.addEventListener('click', () => { f = b.dataset.f; history.replaceState(null, '', hashUrl('#/builds' + (f === 'all' ? '' : '?f=' + f))); draw(); }));
  draw();
}
