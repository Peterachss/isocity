// Bridges the city page (localStorage) and the extension (chrome.storage.local). Newest "ts" wins.
(() => {
  if (!chrome.storage) return;
  let pageTs = -1;
  const toPage = (state) => window.postMessage({ src: 'isocity-ext', type: 'set', state }, location.origin);

  window.addEventListener('message', (e) => {
    if (e.source !== window || e.origin !== location.origin || !e.data || e.data.src !== 'isocity-page' || e.data.type !== 'state') return;
    const page = e.data.state;
    if (!page || !Array.isArray(page.spaces)) return;
    pageTs = page.ts || 0;
    chrome.storage.local.get('ws', ({ ws }) => {
      if (ws && ws.fresh) {
        // the extension was used before the city: keep the city's workspaces and add what was saved
        const merged = JSON.parse(JSON.stringify(page));
        for (const s of ws.spaces) {
          let t = merged.spaces.find((z) => z.id === s.id);
          if (!t) { t = { id: s.id, name: s.name, acct: s.acct == null ? null : s.acct, notes: '', tasks: [], res: [] }; merged.spaces.push(t); }
          for (const r of s.res) if (!t.res.some((z) => z.kind === 'u' && z.url === r.url)) t.res.push(r);
        }
        merged.active = ws.active || merged.active; merged.ts = Date.now();
        chrome.storage.local.set({ ws: merged }); return;
      }
      if (!ws || (page.ts || 0) > (ws.ts || 0)) chrome.storage.local.set({ ws: page });
      else if ((ws.ts || 0) > (page.ts || 0)) toPage(ws);
    });
  });

  chrome.storage.onChanged.addListener((ch, area) => {
    if (area !== 'local' || !ch.ws || !ch.ws.newValue) return;
    const ws = ch.ws.newValue;
    if ((ws.ts || 0) > pageTs) { pageTs = ws.ts || 0; toPage(ws); }
  });

  window.postMessage({ src: 'isocity-ext', type: 'hello' }, location.origin);
})();
