const $ = (id) => document.getElementById(id);
const uid = () => Math.random().toString(36).slice(2, 9);
const saveable = (t) => /^https?:/i.test(t.url || '');
const GOOGLE = /^(docs|mail|drive|chat|calendar)\.google\.com$/;
let ws = null;

const seed = () => ({ v: 1, fresh: true, ts: 0, active: 'school', recent: [], spaces: [
  { id: 'school', name: 'School', acct: 1, notes: '', tasks: [], res: [] },
  { id: 'personal', name: 'Personal', acct: 0, notes: '', tasks: [], res: [] },
] });
const sp = () => ws.spaces.find((s) => s.id === ws.active) || ws.spaces[0];
const live = () => ws.spaces.filter((s) => !s.archived);
async function save() { ws.ts = Date.now(); await chrome.storage.local.set({ ws }); }

function hostOf(u) { try { return new URL(u).host.replace(/^www\./, ''); } catch (e) { return ''; } }
// Building entries only exist in the city, so the popup opens them through the city.
const CITY = 'https://isocity-mu.vercel.app/';
function urlOf(r, s) {
  if (r.kind !== 'u') return CITY;
  if (s.acct == null) return r.url;
  try {
    const x = new URL(r.url);
    if (!GOOGLE.test(x.host)) return r.url;
    x.pathname = x.pathname.replace(/\/u\/\d+\//, `/u/${s.acct}/`);
    if (!/\/u\/\d+\//.test(r.url)) x.searchParams.set('authuser', s.acct);
    return x.toString();
  } catch (e) { return r.url; }
}

function note(msg) { $('hint').textContent = msg; clearTimeout(note.t); note.t = setTimeout(render, 2500); }

function render() {
  const s = sp();
  const sel = $('space'); sel.textContent = '';
  for (const z of live()) { const o = document.createElement('option'); o.value = z.id; o.textContent = `${z.name} (${z.res.length})`; o.selected = z.id === s.id; sel.appendChild(o); }
  $('hint').textContent = `${s.res.length} saved in ${s.name}`;
  const f = $('filter').value.trim().toLowerCase();
  const list = $('list'); list.textContent = '';
  const rows = [...s.res].sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0)).filter((r) => !f || `${r.title || ''} ${r.url || r.ref || ''}`.toLowerCase().includes(f));
  if (!rows.length) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'Nothing here yet.'; list.appendChild(p); }
  for (const r of rows) {
    const row = document.createElement('div'); row.className = 'row';
    const main = document.createElement('button'); main.className = 'main';
    const t = document.createElement('span'); t.className = 't'; t.textContent = r.kind === 'u' ? (r.title || hostOf(r.url) || r.url) : r.ref;
    const sub = document.createElement('span'); sub.className = 's'; sub.textContent = r.kind === 'u' ? hostOf(r.url) : 'City building';
    main.append(t, sub);
    main.onclick = () => chrome.tabs.create({ url: urlOf(r, s) });
    const x = document.createElement('button'); x.className = 'x'; x.textContent = 'x'; x.title = 'Remove';
    x.onclick = async () => { s.res = s.res.filter((z) => z !== r); await save(); render(); };
    row.append(main, x); list.appendChild(row);
  }
}

async function addTabs(tabs) {
  const s = sp(); let n = 0;
  for (const t of tabs) {
    if (!saveable(t) || s.res.some((r) => r.kind === 'u' && r.url === t.url)) continue;
    s.res.push({ id: uid(), kind: 'u', url: t.url, title: (t.title || '').slice(0, 80), pin: false }); n++;
  }
  await save();
  return n;
}
async function afterSave(tabs, n) {
  if ($('closeAfter').checked && n > 0) {
    const ids = tabs.filter(saveable).map((t) => t.id);
    const all = await chrome.tabs.query({ currentWindow: true });
    // never close the last tab in the window
    if (ids.length >= all.length) await chrome.tabs.create({ url: 'chrome://newtab' });
    await chrome.tabs.remove(ids);
  }
  render(); note(n ? `Saved ${n} tab${n === 1 ? '' : 's'} to ${sp().name}` : 'Already saved');
}

$('space').onchange = async (e) => { ws.active = e.target.value; await save(); render(); };
$('newSpace').onclick = async () => {
  const n = (prompt('Name the new workspace') || '').trim(); if (!n) return;
  const s = { id: uid(), name: n.slice(0, 24), acct: null, notes: '', tasks: [], res: [] };
  ws.spaces.push(s); ws.active = s.id; await save(); render();
};
$('saveWin').onclick = async () => { const tabs = await chrome.tabs.query({ currentWindow: true }); afterSave(tabs, await addTabs(tabs)); };
$('saveTab').onclick = async () => { const tabs = await chrome.tabs.query({ active: true, currentWindow: true }); afterSave(tabs, await addTabs(tabs)); };
$('openAll').onclick = async () => {
  const s = sp(); const urls = s.res.map((r) => urlOf(r, s)).filter((u) => /^https?:/.test(u));
  if (!urls.length) return note('Nothing to open');
  await chrome.windows.create({ url: urls });
  note(`Opened ${urls.length} in a new window`);
};
$('suspend').onclick = async () => {
  const tabs = await chrome.tabs.query({ currentWindow: true, active: false, audible: false, pinned: false, discarded: false });
  let n = 0; for (const t of tabs) { try { await chrome.tabs.discard(t.id); n++; } catch (e) { /* ignore */ } }
  note(`Suspended ${n} tab${n === 1 ? '' : 's'} to free memory`);
};
$('filter').oninput = render;

(async () => {
  const got = await chrome.storage.local.get('ws');
  ws = got.ws && Array.isArray(got.ws.spaces) && got.ws.spaces.length ? got.ws : seed();
  render();
  chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && ch.ws && ch.ws.newValue && (ch.ws.newValue.ts || 0) > (ws.ts || 0)) { ws = ch.ws.newValue; render(); } });
})();
