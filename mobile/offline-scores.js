// This adapter exists only in the bundled offline copies, never on the website.
// It preserves the games' leaderboard response shape without making network requests.
(() => {
  const originalFetch = window.fetch.bind(window);
  const key = 'dadarcade_offline_scores_v1';
  const read = () => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value.filter(e => /^[A-Z]{3}$/.test(e.initials) && Number.isInteger(e.score) && e.score > 0 && typeof e.date === 'string') : [];
    } catch { return []; }
  };
  const response = (data, status = 200) => Promise.resolve(new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }));
  window.fetch = (input, options = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (url.pathname !== '/api/scores') return originalFetch(input, options);
    const method = (options.method || input.method || 'GET').toUpperCase();
    const today = new Date().toISOString().slice(0, 10);
    const game = url.searchParams.get('game') || 'bub';
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 10));
    let entries = read();
    let added;
    if (method === 'POST') {
      let data;
      try { data = JSON.parse(options.body); } catch { return response({ error: 'Invalid score' }, 400); }
      if (!/^[A-Z]{3}$/.test(data.initials) || !Number.isInteger(data.score) || data.score < 1 || data.score > 999999) return response({ error: 'Invalid score' }, 400);
      added = { initials: data.initials, score: data.score, date: today, game, id: Date.now().toString(36) + Math.random().toString(36).slice(2) };
      entries.push(added);
      entries.sort((a, b) => b.score - a.score);
      // Keep all-time leaders and today's leaders, so old high scores don't erase today's board.
      const retained = new Map();
      for (const id of new Set(entries.map(e => e.game))) {
        const own = entries.filter(e => e.game === id);
        [...own.slice(0, 50), ...own.filter(e => e.date === today).slice(0, 50)].forEach(e => retained.set(e.id, e));
      }
      try { localStorage.setItem(key, JSON.stringify([...retained.values()])); }
      catch { return response({ error: 'Could not save on this device' }, 507); }
    } else if (method !== 'GET') return response({ error: 'Method not allowed' }, 405);
    const all = entries.filter(e => e.game === game).sort((a, b) => b.score - a.score);
    const daily = all.filter(e => e.date === today);
    const board = rows => rows.slice(0, limit).map((e, i) => ({ initials: e.initials, score: e.score, rank: i + 1 }));
    const rank = rows => { const index = rows.findIndex(e => e.id === added?.id); return index >= 0 && index < limit ? index + 1 : null; };
    return response({ alltime: board(all), daily: board(daily), alltimeRank: rank(all), dailyRank: rank(daily) });
  };
})();
