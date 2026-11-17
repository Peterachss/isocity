// Keyboard shortcut: save every tab in this window to the active workspace.
const uid = () => Math.random().toString(36).slice(2, 9);
const saveable = (t) => /^https?:/i.test(t.url || '');

chrome.commands.onCommand.addListener(async (cmd) => {
  if (cmd !== 'save-window') return;
  const { ws } = await chrome.storage.local.get('ws');
  if (!ws || !ws.spaces) return;
  const sp = ws.spaces.find((s) => s.id === ws.active) || ws.spaces[0];
  const tabs = (await chrome.tabs.query({ currentWindow: true })).filter(saveable);
  let n = 0;
  for (const t of tabs) {
    if (sp.res.some((r) => r.kind === 'u' && r.url === t.url)) continue;
    sp.res.push({ id: uid(), kind: 'u', url: t.url, title: (t.title || '').slice(0, 80), pin: false });
    n++;
  }
  ws.ts = Date.now();
  await chrome.storage.local.set({ ws });
  chrome.action.setBadgeText({ text: String(n) });
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2500);
});
