(function (root) {
  'use strict';
  const departments = [
    { id: 'home', name: 'Headquarters', short: 'Home', types: ['house'], description: 'Your pinned projects and everyday shortcuts.', path: 'm3 11 9-8 9 8M5 10v11h14V10M10 21v-7h4v7' },
    { id: 'repos', name: 'Engineering office', short: 'Repositories', types: ['office'], description: 'Build projects. Open code, issues, pull requests, and workflows.', path: 'M5 21V3h14v18ZM9 7h6m-6 4h6m-6 4h6' },
    { id: 'stars', name: 'Research library', short: 'Stars', types: ['school','apt'], description: 'Explore the projects you have starred and keep useful tools close.', path: 'm12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z' },
    { id: 'ops', name: 'Operations clinic', short: 'Operations', types: ['clinic'], description: 'Triage your issues, review pull requests, and follow notifications.', path: 'M4 4h16v16H4ZM12 8v8M8 12h8' },
    { id: 'launch', name: 'Launch studio', short: 'Websites', types: ['shop'], description: 'Open the websites listed on your repositories, or add a deployment shortcut.', path: 'M3 4h18v16H3ZM3 9h18M7 6h1m3 0h1' },
    { id: 'tools', name: 'Workshop plaza', short: 'Tools', types: ['plaza','park','wheel'], description: 'Your developer workbench. Add the tools you use every day.', path: 'm4 20 7-7m3-3 6-6M4 4l16 16M4 4v5m0-5h5M15 20h5v-5' }
  ];
  const validUser = value => typeof value === 'string' && /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(value);
  function safeURL(value) {
    try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password ? u.href : null; } catch { return null; }
  }
  function normalizeRepo(repo) {
    if (!repo || typeof repo.full_name !== 'string' || !/^[\w.-]+\/[\w.-]+$/.test(repo.full_name) || repo.private === true) return null;
    return { name: repo.full_name, description: String(repo.description || '').slice(0, 500),
      url: 'https://github.com/' + repo.full_name, language: typeof repo.language === 'string' ? repo.language : '',
      stars: Number.isFinite(repo.stargazers_count) ? repo.stargazers_count : 0,
      updated: String(repo.updated_at || ''), website: safeURL(repo.homepage), archived: repo.archived === true };
  }
  async function fetchCatalog(user, kind, { fetchImpl = fetch, signal, onPage = () => {} } = {}) {
    if (!validUser(user) || !['repos','starred'].includes(kind)) throw new Error('Enter a valid GitHub username.');
    const collected = new Map();
    let page = 1;
    while (true) {
      const response = await fetchImpl(`https://api.github.com/users/${encodeURIComponent(user)}/${kind}?per_page=100&page=${page}&sort=updated&direction=desc`, {
        headers: { Accept: 'application/vnd.github+json' }, signal, credentials: 'omit'
      });
      if (!response.ok) {
        if (response.status === 404) throw new Error('GitHub account not found. Check the username.');
        if (response.status === 403 || response.status === 429) throw new Error('GitHub request limit reached. Try Refresh later or open GitHub directly.');
        throw new Error('GitHub is unavailable. Try Refresh or use the direct GitHub links.');
      }
      const rows = await response.json();
      if (!Array.isArray(rows)) throw new Error('Unexpected response from GitHub. Try Refresh.');
      for (const row of rows) { const repo = normalizeRepo(row); if (repo) collected.set(repo.name, repo); }
      const items = [...collected.values()];
      onPage(items);
      const link = response.headers.get('link') || '';
      if (!/rel="next"/.test(link)) return items;
      page++;
    }
  }
  function filtered(items, query = '', language = '', sort = 'updated') {
    const q = query.trim().toLowerCase();
    return items.filter(r => (!language || r.language === language) && (!q || `${r.name} ${r.description} ${r.language}`.toLowerCase().includes(q)))
      .sort((a,b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'stars' ? b.stars-a.stars || a.name.localeCompare(b.name) : (Date.parse(b.updated)||0)-(Date.parse(a.updated)||0) || a.name.localeCompare(b.name));
  }
  const api = { departments, validUser, safeURL, normalizeRepo, fetchCatalog, filtered };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WorkspaceData = api;
})(globalThis);
