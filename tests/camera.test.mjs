import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

// Exercise the actual input handlers and frame loop without browser dependencies.
function city(reduced = false, saved = null) {
  let now = 0, nextFrame;
  const elements = new Map();
  const noop = () => {};
  const context = new Proxy({}, { get: (target, key) => key in target ? target[key]
    : key === 'createRadialGradient' ? () => ({ addColorStop: noop }) : noop });
  function element() {
    const handlers = {};
    return { handlers, style: {}, dataset: {}, hidden: true,
      getContext: () => context, setAttribute: noop, appendChild: noop,
      setPointerCapture: noop, addEventListener: (name, fn) => { handlers[name] = fn; } };
  }
  const sandbox = {
    document: { getElementById: id => {
      if (!elements.has(id)) elements.set(id, element());
      return elements.get(id);
    }, createElement: element, querySelectorAll: () => [], addEventListener: noop },
    performance: { now: () => now }, matchMedia: () => ({ matches: reduced }),
    innerWidth: 1440, innerHeight: 900, devicePixelRatio: 1,
    localStorage: { getItem: () => saved, setItem: noop },
    addEventListener: noop, setTimeout: () => 1, clearTimeout: noop,
    requestAnimationFrame: fn => { nextFrame = fn; }, console
  };
  const source = readFileSync(new URL('../city.js', import.meta.url), 'utf8')
    .replace(/\}\)\(\);\s*$/, 'globalThis.camera = () => ({...cam});globalThis.testState = () => ({grid,money,hour,paused,photoMode});globalThis.testActions = {apply,applyLine,undo,redo,setTool,togglePause,moveAt,setPhoto,roadTilesFor,commitRoadDraft,plan:(from,to,mode)=>{setTool("road");setRoadMode(mode);roadDraft={from,to};refreshRoadDraft();return roadDraft;},stroke:()=>activeStroke=[]};})();');
  vm.runInNewContext(source, sandbox);
  const stage = elements.get('stage');
  return {
    camera: sandbox.camera,
    state: sandbox.testState,
    actions: sandbox.testActions,
    event: (name, values) => stage.handlers[name]({ preventDefault: noop, clientX: 700, clientY: 400,
      type: name, deltaX: 0, deltaY: 0, deltaMode: 0, pointerId: 1, button: 2, ...values }),
    step: (frames = 90) => { for (let i = 0; i < frames; i++) { now += 1000 / 60; nextFrame(now); } }
  };
}

test('tiny trackpad deltas produce tiny zoom; wheel magnitude matters', () => {
  for (const delta of [-1, -120]) {
    const app = city(), before = app.camera();
    app.event('wheel', { deltaY: delta });
    assert.equal(app.camera().z, before.z, 'input queues motion instead of jumping');
    app.step();
    assert.ok(Math.abs(app.camera().z / before.z - Math.exp(-delta * .0015)) < .00002);
  }
});

test('horizontal and zero wheel input do not zoom', () => {
  const app = city(), before = app.camera();
  app.event('wheel', { deltaX: 80 }); app.step();
  assert.equal(app.camera().z, before.z);
  assert.equal(app.camera().x, before.x - 80);
  app.event('wheel', {}); app.step();
  assert.equal(app.camera().z, before.z);
});

test('zoom preserves cursor world position and normalizes line deltas', () => {
  const app = city(), before = app.camera();
  app.event('wheel', { deltaY: -3, deltaMode: 1 }); app.step();
  const after = app.camera();
  assert.ok(Math.abs(after.z / before.z - Math.exp(48 * .0015)) < .00002);
  assert.ok(Math.abs((700 - before.x) / before.z - (700 - after.x) / after.z) < .00001);
  assert.ok(Math.abs((400 - before.y) / before.z - (400 - after.y) / after.z) < .00001);
});

test('starting a pan cancels pending zoom without camera drift', () => {
  const app = city(); app.event('wheel', { deltaY: -120 }); app.step(2);
  app.event('pointerdown', {}); const before = app.camera();
  app.event('pointermove', { clientX: 750, clientY: 430 }); app.step();
  const after = app.camera();
  assert.equal(after.z, before.z);
  assert.ok(Math.abs(after.x - before.x - 50) < .00001);
  assert.ok(Math.abs(after.y - before.y - 30) < .00001);
});

test('reduced motion applies proportional zoom immediately', () => {
  const app = city(true), before = app.camera();
  app.event('wheel', { deltaY: -1 });
  assert.ok(Math.abs(app.camera().z / before.z - Math.exp(.0015)) < .00001);
});


test('fast diagonal strokes remain connected and undo/redo as one action', () => {
  const app = city(), before = app.state().money;
  app.actions.setTool('road'); app.actions.stroke();
  app.actions.applyLine([20, 20], [23, 23]);
  const built = app.state().grid.flat().filter(t => t === 'road').length;
  assert.equal(app.state().money, before - 70);
  app.actions.undo(); assert.equal(app.state().money, before);
  for (let x=20;x<=23;x++) for(let y=20;y<=23;y++) assert.equal(app.state().grid[x][y], 'forest');
  app.actions.redo();
  assert.equal(app.state().money, before - 70);
  assert.equal(app.state().grid.flat().filter(t => t === 'road').length, built);
});

test('a new build clears redo and pause stops simulation income', () => {
  const app = city(); app.actions.togglePause();
  const before = app.state().money; app.step(240); assert.equal(app.state().money, before);
  app.actions.setTool('road'); app.actions.apply(20,20); app.actions.undo();
  app.actions.apply(22,22); const balance = app.state().money;
  app.actions.redo(); assert.equal(app.state().grid[20][20], 'forest');
  assert.equal(app.state().money, balance);
});

test('malformed saved grids fall back to a valid starter city', () => {
  for(const grid of [Array(26).fill(null), Array(26).fill(Array(26).fill('pan'))]) {
    const app = city(false, JSON.stringify({grid,money:100,hour:12}));
    assert.equal(app.state().money, 5000);
    assert.equal(app.state().grid[0][0], 'forest');
  }
});


test('two-finger gestures do not build on first touch, but a single tap does', () => {
  const app = city(); const cam = app.camera();
  const x = cam.x, y = cam.y + 41 * 16 * cam.z;
  const before = app.state().money;
  app.event('pointerdown', {pointerType:'touch',button:0,clientX:x,clientY:y});
  assert.equal(app.state().money,before);
  app.event('pointerdown', {pointerType:'touch',button:0,pointerId:2,clientX:x+40,clientY:y});
  app.event('pointerup', {pointerId:2}); app.event('pointerup', {});
  assert.equal(app.state().money,before);
  app.event('pointerdown', {pointerType:'touch',button:0,clientX:x,clientY:y});
  app.event('pointerup', {});
  assert.equal(app.state().money,before-10);
});

test('cancelled touches leave the city unchanged', () => {
  const app = city(), cam = app.camera(), before = app.state().money;
  app.event('pointerdown', {pointerType:'touch',button:0,clientX:cam.x,clientY:cam.y+41*16*cam.z});
  app.event('pointercancel', {});
  assert.equal(app.state().money,before);
});


test('relocation is free, preserves a replaced forest on undo, and redoes atomically', () => {
  const app = city(); app.actions.setTool('house'); app.actions.apply(20,20);
  const balance = app.state().money;
  app.actions.setTool('move'); app.actions.moveAt(20,20); app.actions.moveAt(22,22);
  assert.equal(app.state().grid[20][20], null); assert.equal(app.state().grid[22][22], 'house');
  assert.equal(app.state().money,balance);
  app.actions.undo();
  assert.equal(app.state().grid[20][20], 'house'); assert.equal(app.state().grid[22][22], 'forest');
  app.actions.redo(); assert.equal(app.state().grid[22][22], 'house'); assert.equal(app.state().money,balance);
});

test('road line preview costs only new tiles; block perimeter has no duplicates', () => {
  const app=city(); app.actions.setTool('road');app.actions.apply(20,20);
  const balance=app.state().money;
  const plan=app.actions.plan([20,20],[24,21],'line');
  assert.equal(plan.tiles.length,5);assert.equal(plan.cost,40);
  app.actions.commitRoadDraft();assert.equal(app.state().money,balance-40);
  app.actions.undo();assert.equal(app.state().grid[20][20],'road');assert.equal(app.state().grid[24][20],'forest');
  const tiles=app.actions.roadTilesFor([20,20],[24,24],'block');
  assert.equal(tiles.length,16);assert.equal(new Set(tiles.map(t=>t.join())).size,16);
});

test('blocked road plans do not spend funds or partially build', () => {
  const app=city();app.actions.setTool('house');app.actions.apply(22,20);
  const before=JSON.stringify(app.state().grid), balance=app.state().money;
  assert.equal(app.actions.plan([20,20],[24,20],'line').blocked,true);
  app.actions.commitRoadDraft();assert.equal(JSON.stringify(app.state().grid),before);assert.equal(app.state().money,balance);
});

test('photo mode blocks building and restores the prior pause state', () => {
  const app=city(), balance=app.state().money;
  app.actions.setPhoto(true);app.actions.apply(20,20);app.step(240);
  assert.equal(app.state().money,balance);assert.equal(app.state().paused,true);
  app.actions.setPhoto(false);assert.equal(app.state().paused,false);
  app.actions.togglePause();app.actions.setPhoto(true);app.actions.setPhoto(false);
  assert.equal(app.state().paused,true);
});


test('unaffordable road plans leave the city and funds untouched', () => {
  const grid=Array.from({length:26},()=>Array(26).fill('forest'));
  const app=city(false,JSON.stringify({grid,money:20,hour:12}));
  app.actions.plan([20,20],[24,20],'line');app.actions.commitRoadDraft();
  assert.equal(app.state().money,20);assert.equal(app.state().grid[20][20],'forest');
});
