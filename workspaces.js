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
      { id: 'school', name: 'School', acct: 1, notes: '', tasks: [], res: ['seqta', 'toddle', 'gmail', 'google-docs', 'google-slides', 'google-sheets', 'google-drive', 'goodnotes', 'blooket', 'mybib'].map((r, i) => ({ id: uid(), kind: 'b', ref: r, pin: i < 3, keep: true })) },
      { id: 'personal', name: 'Personal', acct: 0, notes: '', tasks: [], res: ['google-calendar', 'gmail', 'google-drive', 'github-hub', 'econ-app', 'uni-plan'].map((r, i) => ({ id: uid(), kind: 'b', ref: r, pin: i < 2, keep: true })) },
      { id: 'cham', name: 'Chạm', acct: 0, notes: '', tasks: [], res: ['cham-merch-design', 'notion-widget'].map((r) => ({ id: uid(), kind: 'b', ref: r, pin: false, keep: true })) },
    ],
  });
  let st;
  try { st = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { st = null; }
  if (!st || !Array.isArray(st.spaces) || !st.spaces.length) st = seed();
  // one-time: add Drive to the starter School and Personal spaces
  if (!st.drive) { st.drive = 1; for (const id of ['school', 'personal']) { const s = st.spaces.find((z) => z.id === id); if (s && !s.res.some((r) => r.ref === 'google-drive')) s.res.push({ id: uid(), kind: 'b', ref: 'google-drive', pin: false }); } }
  let saveT = 0;
  const post = (type) => { try { window.postMessage({ src: 'isocity-page', type, state: st }, location.origin); } catch (e) { /* ignore */ } };
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };
  const save = () => { st.ts = Date.now(); clearTimeout(saveT); saveT = setTimeout(() => { persist(); post('state'); }, 200); };
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

  // ---- workspace screen (Workona-style: sidebar of spaces, Tabs / Notes / Tasks, Resources with sections) ----
  const pop = $('wsPop');
  const side = $('wsSide');
  const body = $('wsBody');
  let view = 'tabs', filterQ = '', showArchive = false, enter = false, enterT = 0;
  const sel = new Set();
  const wide = () => innerWidth >= 900;
  const inset = () => (pop.dataset.open === 'true' && wide() ? pop.offsetWidth : 0);
  const syncInset = () => { if (API.setInset) API.setInset(inset()); };
  function setOpen(o) {
    pop.dataset.open = String(o); pop.inert = !o; document.body.classList.toggle('ws-open', o); $('wsBtn').setAttribute('aria-expanded', String(o)); $('wsTopBtn').setAttribute('aria-expanded', String(o));
    if (o) { enter = true; render(); }
    requestAnimationFrame(syncInset);
  }
  addEventListener('resize', () => { if (pop.dataset.open === 'true') syncInset(); });
  function btn(label, fn, cls = 'wsn-btn', title) { const b = el('button', cls, label); b.type = 'button'; if (title) b.title = title; b.onclick = fn; return b; }
  const initial = (s) => (String(s || '?').trim()[0] || '?').toUpperCase();
  const shades = ['#0a3324', '#0a2f1e', '#0d2a18', '#0c2412', '#004225'];
  const matches = (r, sp) => { if (!filterQ) return true; const i = resInfo(r, sp); return `${i.title} ${i.sub}`.toLowerCase().includes(filterQ); };

  function renderSide() {
    side.textContent = '';
    const brand = el('div', 'wsn-brand'); brand.appendChild(el('span', 'wsn-logo', 'W')); brand.appendChild(el('span', '', 'workspaces'));
    side.appendChild(brand);
    side.appendChild(btn('Jump to... (Ctrl+K)', () => palOpen(), 'wsn-nav', 'Command palette'));
    const head = el('div', 'wsn-sidehead'); head.appendChild(el('span', '', 'Spaces'));
    head.appendChild(btn('+', () => {
      const n = (prompt('Name the new workspace') || '').trim(); if (!n) return;
      const s = { id: uid(), name: n.slice(0, 24), acct: null, notes: '', tasks: [], res: [], secs: [] };
      st.spaces.push(s); st.active = s.id; sel.clear(); save(); render();
    }, 'wsn-plus', 'New workspace'));
    side.appendChild(head);
    const list = el('div', 'wsn-spaces');
    for (const s of live()) {
      const b = btn(s.name, () => { if (st.active !== s.id) enter = true; st.active = s.id; sel.clear(); filterQ = ''; save(); render(); }, 'wsn-space');
      b.setAttribute('aria-current', String(s.id === space().id));
      list.appendChild(b);
    }
    side.appendChild(list);
    const arch = st.spaces.filter((s) => s.archived);
    side.appendChild(btn(`Archive${arch.length ? ` (${arch.length})` : ''}`, () => { showArchive = !showArchive; renderSide(); }, 'wsn-nav'));
    if (showArchive) {
      const al = el('div', 'wsn-spaces');
      if (!arch.length) al.appendChild(el('p', 'wsn-empty', 'Nothing archived'));
      for (const s of arch) al.appendChild(btn(`Restore ${s.name}`, () => { s.archived = false; st.active = s.id; save(); render(); }, 'wsn-space dim'));
      side.appendChild(al);
    }
    const foot = el('div', 'wsn-sidefoot');
    foot.appendChild(btn('Export backup', exportBackup, 'wsn-nav small'));
    foot.appendChild(btn('Import backup', importBackup, 'wsn-nav small'));
    side.appendChild(foot);
  }

  function render() {
    renderSide();
    const sp = space();
    sp.secs = sp.secs || [];
    body.textContent = '';
    if (enter) { enter = false; body.classList.add('wsn-in'); clearTimeout(enterT); enterT = setTimeout(() => body.classList.remove('wsn-in'), 900); }
    const drag = { r: null };

    // ---- header ----
    const top = el('div', 'wsn-top');
    const title = el('h2', 'wsn-title', sp.name); title.title = 'Click to rename';
    title.onclick = () => { const n = (prompt('Rename workspace', sp.name) || '').trim(); if (n) { sp.name = n.slice(0, 24); save(); render(); } };
    top.appendChild(title);
    const search = el('input', 'wsn-search'); search.type = 'search'; search.placeholder = 'Search across spaces & apps'; search.setAttribute('aria-label', 'Search across spaces and apps');
    search.onfocus = () => { search.blur(); palOpen(); };
    top.appendChild(search);
    const cm = el('details', 'wsn-menu wsn-create'); cm.appendChild(el('summary', '', 'CREATE'));
    const cl = el('div', 'wsn-menulist');
    for (const [label, url] of [['New Google Doc', 'https://docs.new'], ['New Google Sheet', 'https://sheets.new'], ['New Google Slides', 'https://slides.new'], ['New Google Form', 'https://forms.new'], ['New Google Site', 'https://sites.new'], ['New Gmail email', 'https://mail.google.com/mail/?view=cm&fs=1'], ['New GitHub repository', 'https://github.com/new']]) {
      cl.appendChild(btn(label, () => {
        cm.open = false;
        let u = url;
        if (sp.acct != null && /^https:\/\/(docs|sheets|slides|forms|sites)\.new$|mail\.google\.com/.test(url)) u += (u.includes('?') ? '&' : '?') + 'authuser=' + sp.acct;
        window.open(API.safeHref(u), '_blank', 'noopener,noreferrer');
      }, 'wsn-menuitem'));
    }
    cm.appendChild(cl); top.appendChild(cm);
    body.appendChild(top);

    // ---- tabs row ----
    const tabs = el('div', 'wsn-tabs'); tabs.setAttribute('role', 'tablist');
    for (const [id, label] of [['tabs', 'Tabs'], ['notes', 'Notes'], ['tasks', `Tasks${sp.tasks.filter((t) => !t.d).length ? ` (${sp.tasks.filter((t) => !t.d).length})` : ''}`]]) {
      const b = btn(label, () => { if (view !== id) enter = true; view = id; render(); }, 'wsn-tab'); b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(view === id)); tabs.appendChild(b);
    }
    const act = el('div', 'wsn-tabright');
    act.appendChild(btn(sp.acct == null ? 'Account: default' : sp.acct === 1 ? 'School account' : 'Personal account', () => { sp.acct = sp.acct == null ? 0 : sp.acct === 0 ? 1 : null; save(); render(); }, 'wsn-chipbtn', 'Which Google account this workspace opens with'));
    act.appendChild(btn(`Open all (${sp.res.length})`, () => openAll(sp), 'wsn-chipbtn'));
    act.appendChild(btn('Share', () => share(sp), 'wsn-chipbtn'));
    const menu = el('details', 'wsn-menu'); menu.appendChild(el('summary', '', '...'));
    const mi = el('div', 'wsn-menulist');
    mi.appendChild(btn('Duplicate', () => { const s = JSON.parse(JSON.stringify(sp)); s.id = uid(); s.name = (sp.name + ' copy').slice(0, 24); s.res.forEach((r) => { r.id = uid(); }); (s.secs || []).forEach((x) => { const o = x.id; x.id = uid(); s.res.forEach((r) => { if (r.sec === o) r.sec = x.id; }); }); st.spaces.push(s); st.active = s.id; save(); render(); }, 'wsn-menuitem'));
    mi.appendChild(btn(live().length > 1 ? 'Archive' : 'Clear all', () => {
      if (live().length > 1) { sp.archived = true; st.active = live()[0].id; } else { sp.res = []; sp.tasks = []; sp.notes = ''; sp.secs = []; }
      sel.clear(); save(); render();
    }, 'wsn-menuitem'));
    menu.appendChild(mi); act.appendChild(menu);
    tabs.appendChild(act);
    body.appendChild(tabs);
    const content = el('div', 'wsn-content'); body.appendChild(content);

    // ---- helpers ----
    const dropOn = (target, secId, keep) => {
      const r = drag.r; if (!r || r === target) return;
      sp.res = sp.res.filter((x) => x !== r);
      r.sec = secId || ''; r.keep = !!keep || !!secId;
      const at = target ? sp.res.indexOf(target) : -1;
      if (at >= 0) sp.res.splice(at, 0, r); else sp.res.push(r);
      drag.r = null; save(); render();
    };
    const allow = (node, fn) => { node.ondragover = (e) => { if (drag.r) { e.preventDefault(); node.classList.add('drop'); } }; node.ondragleave = () => node.classList.remove('drop'); node.ondrop = (e) => { e.preventDefault(); e.stopPropagation(); node.classList.remove('drop'); fn(); }; };
    const brand = (u) => {
      let x = null; try { x = new URL(u); } catch (e) { /* ignore */ }
      const h = x ? x.host.replace(/^www\./, '') : ''; const pa = x ? x.pathname : '';
      if (h === 'docs.google.com') return pa.includes('/spreadsheets') ? ['#0f9d58', 'S'] : pa.includes('/presentation') ? ['#f4b400', 'P'] : pa.includes('/forms') ? ['#673ab7', 'F'] : ['#4285f4', 'D'];
      if (h === 'mail.google.com') return ['#ea4335', 'M'];
      if (h === 'drive.google.com') return ['#1fa463', 'D'];
      if (h === 'calendar.google.com') return ['#4285f4', 'C'];
      if (h === 'meet.google.com') return ['#00897b', 'M'];
      if (/blooket/.test(h)) return ['#00bcd4', 'B'];
      if (/github/.test(h)) return ['#24292f', 'G'];
      if (/notion/.test(h)) return ['#111111', 'N'];
      return null;
    };
    const icon = (r, i) => { const b = brand(i.url); const a = el('span', 'wsn-ico', b ? b[1] : initial(i.title)); a.style.background = b ? b[0] : '#6b7785'; return a; };
    const rowFor = (r, inTabs) => {
      const i = resInfo(r, sp);
      const row = el('div', 'wsn-row'); row.draggable = true;
      row.ondragstart = (e) => { drag.r = r; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', i.title); } catch (x) { /* ignore */ } row.classList.add('dragging'); };
      row.ondragend = () => { drag.r = null; row.classList.remove('dragging'); };
      allow(row, () => dropOn(r, r.sec, !inTabs));
      if (inTabs) { const cb = el('input'); cb.type = 'checkbox'; cb.checked = sel.has(r.id); cb.setAttribute('aria-label', 'Select'); cb.onchange = () => { cb.checked ? sel.add(r.id) : sel.delete(r.id); renderBodyOnly(); }; row.appendChild(cb); }
      row.appendChild(icon(r, i));
      const main = el('button', 'wsn-main'); main.type = 'button';
      main.appendChild(el('span', 'wsn-rt', i.title)); main.appendChild(el('span', 'wsn-rs', i.sub));
      main.onclick = () => openRes(r, sp);
      main.onmouseenter = () => API.warmUrl(i.url);
      row.appendChild(main);
      const acts = el('span', 'wsn-acts');
      acts.appendChild(btn('Open', () => openRes(r, sp), 'wsn-mini', 'Open'));
      if (r.kind === 'b') acts.appendChild(btn('Map', () => API.focus(r.ref), 'wsn-mini', 'Show on the map'));
      acts.appendChild(btn(r.pin ? 'Unpin' : 'Pin', () => { r.pin = !r.pin; save(); render(); }, 'wsn-mini', 'Pin to top'));
      acts.appendChild(btn(inTabs ? 'Save' : 'Unsave', () => { r.keep = inTabs; if (!inTabs) r.sec = ''; save(); render(); }, 'wsn-mini', inTabs ? 'Move to Resources' : 'Move back to Tabs'));
      acts.appendChild(btn('x', () => { sp.res = sp.res.filter((x) => x !== r); sel.delete(r.id); save(); render(); }, 'wsn-mini', 'Remove'));
      row.appendChild(acts);
      return row;
    };
    const addBar = (ph, onAdd) => {
      const f = el('form', 'wsn-add'); const inp = el('input'); inp.type = 'text'; inp.placeholder = ph; inp.autocomplete = 'off'; inp.setAttribute('aria-label', ph);
      f.appendChild(inp);
      f.onsubmit = (e) => { e.preventDefault(); const v = inp.value.trim(); if (!v) return; if (onAdd(v) !== false) { save(); render(); } };
      return f;
    };
    const addResource = (keep, secId) => (v) => {
      if (/^(https?:\/\/|[a-z0-9-]+\.[a-z]{2,}(\/|$))/i.test(v)) {
        const url = /^https?:/i.test(v) ? v : 'https://' + v;
        if (API.safeHref(url) === '#') { API.notify('That link is not valid'); return false; }
        sp.res.push({ id: uid(), kind: 'u', url, title: '', pin: false, keep, sec: secId || '' });
      } else {
        const m = API.allItems().find((i) => i.name.toLowerCase().includes(v.toLowerCase()) || i.id.includes(v.toLowerCase()));
        if (!m) { API.notify('No building matches that. Paste a link instead.'); return false; }
        sp.res.push({ id: uid(), kind: 'b', ref: m.id, pin: false, keep, sec: secId || '' });
      }
      return true;
    };
    const sortPin = (a) => [...a].sort((x, y) => (y.pin ? 1 : 0) - (x.pin ? 1 : 0));
    const inRes = (r) => !!r.keep || (r.sec && sp.secs.some((s) => s.id === r.sec));

    function renderBodyOnly() {
      content.textContent = '';
      if (view === 'notes') {
        const ta = el('textarea', 'wsn-notes'); ta.placeholder = 'Notes for this workspace'; ta.value = sp.notes || ''; ta.setAttribute('aria-label', 'Workspace notes');
        ta.oninput = () => { sp.notes = ta.value.slice(0, 20000); save(); };
        content.appendChild(ta); return;
      }
      if (view === 'tasks') {
        const box = el('div', 'wsn-col wsn-single');
        box.appendChild(addBar('Add a task, press Enter', (v) => { sp.tasks.push({ id: uid(), t: v.slice(0, 140), d: false }); }));
        const tl = el('div', 'wsn-list');
        if (!sp.tasks.length) tl.appendChild(el('p', 'wsn-empty', 'No tasks yet.'));
        for (const t of sp.tasks) {
          const row = el('div', 'wsn-row');
          const cb = el('input'); cb.type = 'checkbox'; cb.checked = t.d; cb.setAttribute('aria-label', 'Done'); cb.onchange = () => { t.d = cb.checked; save(); render(); };
          row.append(cb, el('span', 'wsn-task' + (t.d ? ' done' : ''), t.t), btn('x', () => { sp.tasks = sp.tasks.filter((x) => x !== t); save(); render(); }, 'wsn-mini', 'Delete'));
          tl.appendChild(row);
        }
        box.appendChild(tl);
        if (sp.tasks.some((t) => t.d)) box.appendChild(btn('Clear finished', () => { sp.tasks = sp.tasks.filter((t) => !t.d); save(); render(); }, 'wsn-btn'));
        content.appendChild(box); return;
      }
      // Tabs + Resources columns
      const cols = el('div', 'wsn-cols');
      // Tabs column
      const tc = el('div', 'wsn-col'); allow(tc, () => dropOn(null, '', false));
      const tabsList = sortPin(sp.res.filter((r) => !inRes(r) && matches(r, sp)));
      const th = el('div', 'wsn-colhead'); th.appendChild(el('h3', '', `Tabs (${tabsList.length})`));
      tc.appendChild(th);
      tc.appendChild(addBar('Paste a link or building name', addResource(false, '')));
      const picked = tabsList.filter((r) => sel.has(r.id));
      if (picked.length) {
        const bar = el('div', 'wsn-bulk');
        bar.appendChild(el('span', '', `${picked.length} selected`));
        bar.appendChild(btn('Open', () => { picked.forEach((r) => openRes(r, sp)); }, 'wsn-mini'));
        bar.appendChild(btn('Save to Resources', () => { picked.forEach((r) => { r.keep = true; }); sel.clear(); save(); render(); }, 'wsn-mini'));
        bar.appendChild(btn('Remove', () => { sp.res = sp.res.filter((r) => !sel.has(r.id)); sel.clear(); save(); render(); }, 'wsn-mini'));
        tc.appendChild(bar);
      }
      const tl = el('div', 'wsn-list');
      if (!tabsList.length) tl.appendChild(el('p', 'wsn-empty', filterQ ? 'No match.' : 'No tabs here. Use the Chrome extension to save your open tabs, or add a link.'));
      tabsList.forEach((r) => tl.appendChild(rowFor(r, true)));
      tc.appendChild(tl);
      cols.appendChild(tc);
      // Resources column
      const rc = el('div', 'wsn-col'); allow(rc, () => dropOn(null, '', true));
      const rh = el('div', 'wsn-colhead'); rh.appendChild(el('h3', '', 'Resources'));
      rh.appendChild(btn('+ Section', () => { const n = (prompt('Section name') || '').trim(); if (!n) return; sp.secs.push({ id: uid(), name: n.slice(0, 24), collapsed: false }); save(); render(); }, 'wsn-mini'));
      rc.appendChild(rh);
      rc.appendChild(addBar('Add a resource', addResource(true, '')));
      const loose = sortPin(sp.res.filter((r) => inRes(r) && !r.sec && matches(r, sp)));
      const ll = el('div', 'wsn-list');
      if (!loose.length && !sp.secs.length) ll.appendChild(el('p', 'wsn-empty', 'Organize important docs and links here. Drag a tab across, or press Save.'));
      loose.forEach((r) => ll.appendChild(rowFor(r, false)));
      rc.appendChild(ll);
      for (const s of sp.secs) {
        const rs = sortPin(sp.res.filter((r) => r.sec === s.id && matches(r, sp)));
        const card = el('div', 'wsn-sec');
        const hd = el('div', 'wsn-sechead'); allow(hd, () => dropOn(null, s.id, true));
        hd.appendChild(btn(`${s.collapsed ? '+' : '-'} ${s.name} (${rs.length})`, () => { s.collapsed = !s.collapsed; save(); render(); }, 'wsn-sectitle'));
        hd.appendChild(btn('Open', () => { rs.forEach((r) => openRes(r, sp)); }, 'wsn-mini'));
        hd.appendChild(btn('Rename', () => { const n = (prompt('Rename section', s.name) || '').trim(); if (n) { s.name = n.slice(0, 24); save(); render(); } }, 'wsn-mini'));
        hd.appendChild(btn('x', () => { if (!confirm(`Remove the section "${s.name}"? Its links move out of it.`)) return; sp.secs = sp.secs.filter((z) => z !== s); sp.res.forEach((r) => { if (r.sec === s.id) r.sec = ''; }); save(); render(); }, 'wsn-mini', 'Remove section'));
        card.appendChild(hd);
        if (!s.collapsed) {
          const sl = el('div', 'wsn-list'); allow(sl, () => dropOn(null, s.id, true));
          if (!rs.length) sl.appendChild(el('p', 'wsn-empty', 'Drag links here'));
          rs.forEach((r) => sl.appendChild(rowFor(r, false)));
          card.appendChild(sl);
          card.appendChild(addBar('Add to this section', addResource(true, s.id)));
        }
        rc.appendChild(card);
      }
      rc.appendChild(btn('+ Resource section', () => { const n = (prompt('Section name') || '').trim(); if (!n) return; sp.secs.push({ id: uid(), name: n.slice(0, 24), collapsed: false }); save(); render(); }, 'wsn-dashed'));
      cols.appendChild(rc);
      content.appendChild(cols);
    }
    renderBodyOnly();
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
  $('wsBtn').onclick = $('wsTopBtn').onclick = (e) => { e.stopPropagation(); setOpen(pop.dataset.open !== 'true'); };
  $('wsClose').onclick = () => setOpen(false);
  pop.inert = true;
  // Bridge to the Workspaces browser extension (saves open tabs into these spaces)
  addEventListener('message', (e) => {
    if (e.source !== window || e.origin !== location.origin || !e.data || e.data.src !== 'isocity-ext') return;
    if (e.data.type === 'hello') { post('state'); return; }
    if (e.data.type === 'set') {
      const o = e.data.state;
      if (!o || !Array.isArray(o.spaces) || !o.spaces.length || !(o.ts > (st.ts || 0))) return;
      st = o; persist(); if (pop.dataset.open === 'true') render();
      API.notify('Workspaces updated from your extension', 1800);
    }
  });
  post('state');
  importShared();
  addEventListener('hashchange', importShared);
})();
