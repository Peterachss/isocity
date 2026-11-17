// Workspaces: a Workona-style layer for the city.
// Spaces (School, Personal, ...) hold saved links and buildings, pinned items, notes and tasks.
// Ctrl/Cmd+K opens a command palette. Everything is saved in this browser only.
(() => {
  const API = window.ISOCITY_API;
  if (!API) return;
  const $ = (id) => document.getElementById(id);
  const KEY = 'isocity-ws';
  const uid = () => Math.random().toString(36).slice(2, 9);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  const seed = () => ({
    v: 1, active: 'school', recent: [],
    spaces: [
      { id: 'school', name: 'School', acct: 1, notes: '', tasks: [], res: ['seqta', 'toddle', 'gmail', 'google-docs', 'google-slides', 'google-sheets', 'google-drive', 'goodnotes', 'blooket', 'mybib'].map((r, i) => ({ id: uid(), kind: 'b', ref: r, pin: i < 3 })) },
      { id: 'personal', name: 'Personal', acct: 0, notes: '', tasks: [], res: ['google-calendar', 'gmail', 'google-drive', 'github-hub', 'econ-app', 'uni-plan'].map((r, i) => ({ id: uid(), kind: 'b', ref: r, pin: i < 2 })) },
      { id: 'cham', name: 'Chạm', acct: 0, notes: '', tasks: [], res: ['cham-merch-design', 'notion-widget'].map((r) => ({ id: uid(), kind: 'b', ref: r, pin: false })) },
    ],
  });
  let st;
  try { st = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { st = null; }
  if (!st || !Array.isArray(st.spaces) || !st.spaces.length) st = seed();
  // one-time: add Drive to the starter School and Personal spaces
  if (!st.drive) { st.drive = 1; for (const id of ['school', 'personal']) { const s = st.spaces.find((z) => z.id === id); if (s && !s.res.some((r) => r.ref === 'google-drive')) s.res.push({ id: uid(), kind: 'b', ref: 'google-drive', pin: false }); } }
  let saveT = 0;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } }, 200); };
  const space = () => st.spaces.find((s) => s.id === st.active) || st.spaces[0];
  const live = () => st.spaces.filter((s) => !s.archived);

  // ---- resolving and opening ----
  const byId = (id) => API.allItems().find((i) => i.id === id);
  function resInfo(r, sp) {
    if (r.kind === 'b') {
      const base = byId(r.ref);
      if (!base) return { title: r.ref, url: '', sub: 'Building removed' };
      const it = API.getItem(r.ref, sp.acct == null ? undefined : sp.acct);
      return { title: it.name, url: it.web || it.git || '', sub: base.cat || (base.kind === 'github' ? 'GitHub' : 'Building') };
    }
    let host = ''; try { host = new URL(r.url).host.replace(/^www\./, ''); } catch (e) { /* ignore */ }
    const url = sp.acct == null ? r.url : API.acctUrl(r.url, sp.acct);
    return { title: r.title || host || r.url, url, sub: host };
  }
  function openUrl(url, label, rec) {
    if (!url) return false;
    const w = window.open(API.safeHref(url), '_blank', 'noopener,noreferrer');
    if (rec) {
      st.recent = [rec, ...st.recent.filter((x) => x.key !== rec.key)].slice(0, 8); save();
    }
    if (label) API.notify(`Opened ${label}`, 1400);
    return w !== undefined;
  }
  const openRes = (r, sp) => { const i = resInfo(r, sp); openUrl(i.url, i.title, { key: sp.id + r.id, sid: sp.id, rid: r.id, title: i.title }); };
  function openAll(sp) {
    const list = sp.res.map((r) => resInfo(r, sp)).filter((i) => i.url);
    if (!list.length) return API.notify('Nothing to open yet');
    let ok = 0;
    for (const i of list) { const w = window.open(API.safeHref(i.url), '_blank', 'noopener,noreferrer'); if (w !== null) ok++; }
    API.notify(ok >= list.length ? `Opened all ${ok} in ${sp.name}` : `Opened ${ok} of ${list.length}. Allow pop-ups for this site to open them all.`, 3600);
  }

  // ---- panel ----
  const pop = $('wsPop');
  const body = $('wsBody');
  let q = '';
  function setOpen(o) {
    pop.dataset.open = String(o); pop.inert = !o; $('wsBtn').setAttribute('aria-expanded', String(o));
    if (o) render();
  }
  function btn(label, fn, cls = 'chip small', title) { const b = el('button', cls, label); b.type = 'button'; if (title) b.title = title; b.onclick = fn; return b; }

  function render() {
    const sp = space();
    body.textContent = '';
    // tabs
    const tabs = el('div', 'ws-tabs');
    for (const s of live()) {
      const b = btn(s.name, () => { st.active = s.id; save(); render(); }, 'chip small ws-tab');
      b.setAttribute('aria-pressed', String(s.id === sp.id));
      tabs.appendChild(b);
    }
    tabs.appendChild(btn('+', () => {
      const n = (prompt('Name the new workspace') || '').trim(); if (!n) return;
      const s = { id: uid(), name: n.slice(0, 24), acct: null, notes: '', tasks: [], res: [] };
      st.spaces.push(s); st.active = s.id; save(); render();
    }, 'chip small', 'New workspace'));
    body.appendChild(tabs);

    // actions
    const act = el('div', 'ws-actions');
    act.appendChild(btn(`Open all (${sp.res.length})`, () => openAll(sp), 'chip small primary'));
    act.appendChild(btn(sp.acct == null ? 'Account: default' : sp.acct === 1 ? 'Account: School' : 'Account: Personal', () => {
      sp.acct = sp.acct == null ? 0 : sp.acct === 0 ? 1 : null; save(); render();
    }, 'chip small', 'Which Google account this workspace opens with'));
    act.appendChild(btn('Rename', () => { const n = (prompt('Rename workspace', sp.name) || '').trim(); if (n) { sp.name = n.slice(0, 24); save(); render(); } }));
    act.appendChild(btn('Duplicate', () => { const s = JSON.parse(JSON.stringify(sp)); s.id = uid(); s.name = (sp.name + ' copy').slice(0, 24); s.res.forEach((r) => { r.id = uid(); }); st.spaces.push(s); st.active = s.id; save(); render(); }, 'chip small', 'Copy this workspace'));
    act.appendChild(btn('Share', () => share(sp), 'chip small', 'Copy a link that adds this workspace on another device'));
    act.appendChild(btn(live().length > 1 ? 'Archive' : 'Clear', () => {
      if (live().length > 1) { sp.archived = true; st.active = live()[0].id; API.notify(`${sp.name} archived (Ctrl+K, "restore")`); } else { sp.res = []; sp.tasks = []; sp.notes = ''; }
      save(); render();
    }));
    body.appendChild(act);

    // add
    const add = el('form', 'ws-add');
    const inp = el('input'); inp.type = 'text'; inp.placeholder = 'Paste a link or type a building name, press Enter'; inp.autocomplete = 'off'; inp.setAttribute('aria-label', 'Add a resource');
    add.appendChild(inp);
    add.onsubmit = (e) => {
      e.preventDefault();
      const v = inp.value.trim(); if (!v) return;
      if (/^(https?:\/\/|[a-z0-9-]+\.[a-z]{2,}(\/|$))/i.test(v)) {
        const url = /^https?:/i.test(v) ? v : 'https://' + v;
        if (API.safeHref(url) === '#') return API.notify('That link is not valid');
        sp.res.push({ id: uid(), kind: 'u', url, title: '', pin: false });
      } else {
        const m = API.allItems().find((i) => i.name.toLowerCase().includes(v.toLowerCase()) || i.id.includes(v.toLowerCase()));
        if (!m) return API.notify('No building matches that. Paste a link instead.');
        sp.res.push({ id: uid(), kind: 'b', ref: m.id, pin: false });
      }
      save(); render(); const n = body.querySelector('.ws-add input'); if (n) n.focus();
    };
    body.appendChild(add);

    // resources: pinned first
    const list = el('div', 'ws-list');
    const sorted = [...sp.res].sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0));
    if (!sorted.length) list.appendChild(el('p', 'ws-empty', 'Empty. Add links above, or Ctrl+K to jump anywhere.'));
    for (const r of sorted) {
      const i = resInfo(r, sp);
      const row = el('div', 'ws-row');
      const main = el('button', 'ws-main'); main.type = 'button';
      main.appendChild(el('span', 'ws-title', i.title));
      main.appendChild(el('span', 'ws-sub', i.sub));
      main.onclick = () => openRes(r, sp);
      main.onmouseenter = () => API.warmUrl(i.url);
      row.appendChild(main);
      if (r.kind === 'b') row.appendChild(btn('Map', () => { setOpen(false); API.focus(r.ref); }, 'chip tiny', 'Show this building on the map'));
      row.appendChild(btn(r.pin ? 'Pinned' : 'Pin', () => { r.pin = !r.pin; save(); render(); }, 'chip tiny', 'Pin to top'));
      row.appendChild(btn('x', () => { sp.res = sp.res.filter((x) => x !== r); save(); render(); }, 'chip tiny', 'Remove'));
      list.appendChild(row);
    }
    body.appendChild(list);

    // tasks
    body.appendChild(el('h3', 'ws-h', 'Tasks'));
    const tf = el('form', 'ws-add');
    const ti = el('input'); ti.type = 'text'; ti.placeholder = 'Add a task, press Enter'; ti.autocomplete = 'off'; ti.setAttribute('aria-label', 'Add a task');
    tf.appendChild(ti);
    tf.onsubmit = (e) => { e.preventDefault(); const v = ti.value.trim(); if (!v) return; sp.tasks.push({ id: uid(), t: v.slice(0, 140), d: false }); save(); render(); const n = body.querySelectorAll('.ws-add input')[1]; if (n) n.focus(); };
    body.appendChild(tf);
    const tl = el('div', 'ws-list');
    for (const t of sp.tasks) {
      const row = el('div', 'ws-row');
      const cb = el('input'); cb.type = 'checkbox'; cb.checked = t.d; cb.setAttribute('aria-label', 'Done');
      cb.onchange = () => { t.d = cb.checked; save(); render(); };
      const lab = el('span', 'ws-task' + (t.d ? ' done' : ''), t.t);
      row.append(cb, lab, btn('x', () => { sp.tasks = sp.tasks.filter((x) => x !== t); save(); render(); }, 'chip tiny', 'Delete'));
      tl.appendChild(row);
    }
    body.appendChild(tl);
    if (sp.tasks.some((t) => t.d)) body.appendChild(btn('Clear finished', () => { sp.tasks = sp.tasks.filter((t) => !t.d); save(); render(); }, 'chip tiny'));

    // notes
    body.appendChild(el('h3', 'ws-h', 'Notes'));
    const ta = el('textarea', 'ws-notes'); ta.rows = 4; ta.placeholder = 'Notes for this workspace'; ta.value = sp.notes || ''; ta.setAttribute('aria-label', 'Workspace notes');
    ta.oninput = () => { sp.notes = ta.value.slice(0, 20000); save(); };
    body.appendChild(ta);

    // recent
    const recent = st.recent.filter((x) => st.spaces.some((s) => s.id === x.sid && s.res.some((r) => r.id === x.rid)));
    if (recent.length) {
      body.appendChild(el('h3', 'ws-h', 'Recent'));
      const rl = el('div', 'ws-actions');
      for (const x of recent.slice(0, 6)) {
        rl.appendChild(btn(x.title, () => { const s = st.spaces.find((z) => z.id === x.sid); const r = s && s.res.find((z) => z.id === x.rid); if (r) openRes(r, s); }, 'chip tiny'));
      }
      body.appendChild(rl);
    }

    // backup
    const bk = el('div', 'ws-actions ws-foot');
    bk.appendChild(btn('Export backup', exportBackup, 'chip tiny'));
    bk.appendChild(btn('Import backup', importBackup, 'chip tiny'));
    body.appendChild(bk);
  }

  // ---- share / backup ----
  const b64 = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64 = (s) => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))));
  function share(sp) {
    const o = { n: sp.name, a: sp.acct, r: sp.res.map((r) => (r.kind === 'b' ? { b: r.ref, p: r.pin ? 1 : 0 } : { u: r.url, t: r.title, p: r.pin ? 1 : 0 })) };
    const link = `${location.origin}${location.pathname}#ws=${b64(o)}`;
    const done = () => API.notify('Share link copied');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(done, () => prompt('Copy this link', link));
    else prompt('Copy this link', link);
  }
  function importShared() {
    const m = /^#ws=([\w-]+)$/.exec(location.hash); if (!m) return;
    try {
      const o = unb64(m[1]);
      history.replaceState(null, '', location.pathname + location.search);
      if (!confirm(`Add the shared workspace "${String(o.n).slice(0, 24)}" to your city?`)) return;
      const res = (o.r || []).slice(0, 80).map((x) => (x.b ? { id: uid(), kind: 'b', ref: String(x.b), pin: !!x.p } : { id: uid(), kind: 'u', url: String(x.u), title: String(x.t || '').slice(0, 80), pin: !!x.p })).filter((r) => r.kind === 'b' || API.safeHref(r.url) !== '#');
      const s = { id: uid(), name: String(o.n || 'Shared').slice(0, 24), acct: o.a === 0 || o.a === 1 ? o.a : null, notes: '', tasks: [], res };
      st.spaces.push(s); st.active = s.id; save(); setOpen(true);
    } catch (e) { /* ignore a bad link */ }
  }
  function exportBackup() {
    const blob = new Blob([JSON.stringify(st, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'isocity-workspaces.json';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function importBackup() {
    const f = document.createElement('input'); f.type = 'file'; f.accept = 'application/json,.json';
    f.onchange = async () => {
      try {
        const o = JSON.parse(await f.files[0].text());
        if (!o || !Array.isArray(o.spaces) || !o.spaces.length) throw new Error('bad');
        if (!confirm('Replace your workspaces with this backup?')) return;
        st = o; save(); render(); API.notify('Backup imported');
      } catch (e) { API.notify('That file is not a workspace backup'); }
    };
    f.click();
  }

  // ---- command palette (Ctrl/Cmd+K) ----
  const pal = $('wsPalette'), pin = $('wsPalInput'), pres = $('wsPalList');
  let palItems = [], palSel = 0;
  function palBuild() {
    const items = [];
    for (const s of live()) {
      items.push({ g: 'Workspace', t: `Switch to ${s.name}`, k: `space workspace ${s.name}`, run: () => { st.active = s.id; save(); setOpen(true); } });
      items.push({ g: 'Workspace', t: `Open all in ${s.name}`, k: `open all ${s.name}`, run: () => openAll(s) });
    }
    for (const s of st.spaces.filter((z) => z.archived)) items.push({ g: 'Workspace', t: `Restore ${s.name}`, k: `restore archived ${s.name}`, run: () => { s.archived = false; st.active = s.id; save(); setOpen(true); } });
    for (const s of live()) for (const r of s.res) { const i = resInfo(r, s); items.push({ g: s.name, t: i.title, sub: i.sub, k: `${i.title} ${i.sub} ${s.name}`, run: () => openRes(r, s) }); }
    const have = new Set(); for (const s of live()) for (const r of s.res) if (r.kind === 'b') have.add(r.ref);
    for (const it of API.allItems()) items.push({ g: 'Map', t: it.name, sub: 'Show on map', k: `${it.name} ${it.cat || ''} ${it.id} map`, run: () => API.focus(it.id) });
    items.push({ g: 'Action', t: 'New workspace', k: 'new create workspace', run: () => { const n = (prompt('Name the new workspace') || '').trim(); if (n) { const s = { id: uid(), name: n.slice(0, 24), acct: null, notes: '', tasks: [], res: [] }; st.spaces.push(s); st.active = s.id; save(); setOpen(true); } } });
    items.push({ g: 'Action', t: 'Switch Dusk / Day / Night', k: 'light night day dusk time', run: () => API.setLight() });
    items.push({ g: 'Action', t: 'Export workspace backup', k: 'export backup', run: exportBackup });
    return items;
  }
  function palRender() {
    const terms = pin.value.toLowerCase().split(/\s+/).filter(Boolean);
    let all = palItems.filter((i) => terms.every((t) => i.k.toLowerCase().includes(t)));
    if (!terms.length) all = all.filter((i) => i.g !== 'Map' && i.g !== 'Action').slice(0, 40);
    else all = all.sort((a, b) => (a.t.toLowerCase().startsWith(terms[0]) ? 0 : 1) - (b.t.toLowerCase().startsWith(terms[0]) ? 0 : 1)).slice(0, 30);
    palSel = Math.min(palSel, Math.max(0, all.length - 1));
    pres.textContent = '';
    all.forEach((it, n) => {
      const b = el('button', 'pal-row'); b.type = 'button'; b.setAttribute('role', 'option'); b.setAttribute('aria-selected', String(n === palSel));
      b.appendChild(el('span', 'pal-t', it.t));
      b.appendChild(el('span', 'pal-g', it.sub ? `${it.g} · ${it.sub}` : it.g));
      b.onclick = () => { palClose(); it.run(); };
      b.onmousemove = () => { if (palSel !== n) { palSel = n; pres.querySelectorAll('.pal-row').forEach((x, m) => x.setAttribute('aria-selected', String(m === n))); } };
      pres.appendChild(b);
    });
    if (!all.length) pres.appendChild(el('p', 'ws-empty', 'Nothing matches'));
    pres._all = all;
  }
  function palOpen() { palItems = palBuild(); pin.value = ''; palSel = 0; pal.hidden = false; palRender(); pin.focus(); }
  function palClose() { pal.hidden = true; }
  pin.addEventListener('input', () => { palSel = 0; palRender(); });
  pin.addEventListener('keydown', (e) => {
    const all = pres._all || [];
    if (e.key === 'ArrowDown') { e.preventDefault(); palSel = Math.min(all.length - 1, palSel + 1); palRender(); const s = pres.querySelector('[aria-selected="true"]'); if (s) s.scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); palSel = Math.max(0, palSel - 1); palRender(); const s = pres.querySelector('[aria-selected="true"]'); if (s) s.scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'Enter') { e.preventDefault(); const it = all[palSel]; if (it) { palClose(); it.run(); } }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); palClose(); }
  });
  pal.addEventListener('pointerdown', (e) => { if (e.target === pal) palClose(); });
  addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.hidden ? palOpen() : palClose(); return; }
    if (e.key === 'Escape' && pop.dataset.open === 'true' && pal.hidden) setOpen(false);
  });

  // ---- wiring ----
  $('wsBtn').onclick = (e) => { e.stopPropagation(); setOpen(pop.dataset.open !== 'true'); };
  $('wsClose').onclick = () => setOpen(false);
  $('wsPalBtn').onclick = (e) => { e.stopPropagation(); palOpen(); };
  pop.inert = true;
  importShared();
  addEventListener('hashchange', importShared);
})();
