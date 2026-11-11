import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

// Exercise the actual input handlers and frame loop without browser dependencies.
function city(reduced = false) {
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
    localStorage: { getItem: () => null, setItem: noop },
    addEventListener: noop, setTimeout: () => 1, clearTimeout: noop,
    requestAnimationFrame: fn => { nextFrame = fn; }, console
  };
  const source = readFileSync(new URL('../city.js', import.meta.url), 'utf8')
    .replace(/\}\)\(\);\s*$/, 'globalThis.camera = () => ({...cam});})();');
  vm.runInNewContext(source, sandbox);
  const stage = elements.get('stage');
  return {
    camera: sandbox.camera,
    event: (name, values) => stage.handlers[name]({ preventDefault: noop, clientX: 700, clientY: 400,
      deltaX: 0, deltaY: 0, deltaMode: 0, pointerId: 1, button: 2, ...values }),
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
