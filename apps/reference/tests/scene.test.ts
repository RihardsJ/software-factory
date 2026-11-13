import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { BufferGeometry, Material, Mesh, PerspectiveCamera, Scene } from 'three';
import { createReferenceScene } from '../src/scene.js';
import type { SceneRenderer } from '../src/scene.js';

let resize: ResizeObserverCallback;
const disconnect = vi.fn();
let host: HTMLDivElement;

function renderer() {
  return {
    domElement: document.createElement('canvas'),
    setPixelRatio: vi.fn<SceneRenderer['setPixelRatio']>(),
    setSize: vi.fn<SceneRenderer['setSize']>(),
    render: vi.fn<SceneRenderer['render']>(),
    setAnimationLoop: vi.fn<SceneRenderer['setAnimationLoop']>(),
    dispose: vi.fn<SceneRenderer['dispose']>(),
  };
}

beforeEach(() => {
  disconnect.mockClear();
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: ResizeObserverCallback) { resize = callback; }
    observe() { /* The test drives resize notifications explicitly. */ }
    disconnect = disconnect;
  });
  host = document.createElement('div');
  Object.defineProperties(host, { clientWidth: { value: 800, configurable: true }, clientHeight: { value: 400, configurable: true } });
  document.body.append(host);
});
afterEach(() => { host.remove(); });

describe('reference scene lifecycle', () => {
  test('renders the scene, updates the camera on resize, and caps pixel density', () => {
    const graphics = renderer();
    vi.stubGlobal('devicePixelRatio', 3);
    const scene = createReferenceScene(host, { createRenderer: () => graphics });
    expect(graphics.setSize).toHaveBeenLastCalledWith(800, 400);
    expect(graphics.setPixelRatio).toHaveBeenCalledWith(2);
    Object.defineProperty(host, 'clientWidth', { value: 400 });
    resize([], {} as ResizeObserver);
    expect(graphics.setSize).toHaveBeenLastCalledWith(400, 400);
    const camera = graphics.render.mock.lastCall?.[1];
    expect(camera).toBeInstanceOf(PerspectiveCamera);
    expect((camera as PerspectiveCamera).aspect).toBe(1);
    vi.stubGlobal('devicePixelRatio', 1);
    window.dispatchEvent(new Event('resize'));
    expect(graphics.setPixelRatio).toHaveBeenLastCalledWith(1);
    scene.dispose();
  });

  test('animates geometry, pauses cleanly, and resumes without a time jump', () => {
    const graphics = renderer();
    const controller = createReferenceScene(host, { createRenderer: () => graphics });
    const frame = graphics.setAnimationLoop.mock.calls[0]?.[0];
    if (!frame) throw new Error('Animation callback was not registered');
    const scene = graphics.render.mock.calls[0]?.[0];
    if (!(scene instanceof Scene)) throw new Error('Scene was not rendered');
    const mesh = scene.children.find((child) => child instanceof Mesh);
    if (!(mesh instanceof Mesh)) throw new Error('Sculpture was not created');
    const initial = mesh.rotation.y;
    frame(0);
    frame(100);
    expect(mesh.rotation.y).toBeGreaterThan(initial);
    controller.setPlaying(false);
    const paused = mesh.rotation.y;
    frame(200);
    expect(mesh.rotation.y).toBe(paused);
    expect(graphics.setAnimationLoop).toHaveBeenLastCalledWith(null);
    controller.setPlaying(true);
    frame(10_000);
    expect(mesh.rotation.y).toBe(paused);
    controller.dispose();
  });

  test('honours reduced motion while rendering an initial frame', () => {
    const graphics = renderer();
    const controller = createReferenceScene(host, { createRenderer: () => graphics, reducedMotion: true });
    expect(controller.playing).toBe(false);
    expect(graphics.setAnimationLoop).toHaveBeenCalledWith(null);
    expect(graphics.render).toHaveBeenCalled();
    controller.dispose();
  });

  test('releases owned resources once and ignores stale callbacks after disposal', () => {
    const graphics = renderer();
    const geometryDispose = vi.spyOn(BufferGeometry.prototype, 'dispose');
    const materialDispose = vi.spyOn(Material.prototype, 'dispose');
    const controller = createReferenceScene(host, { createRenderer: () => graphics });
    const frame = graphics.setAnimationLoop.mock.calls[0]?.[0];
    controller.dispose();
    expect(geometryDispose).toHaveBeenCalled();
    expect(materialDispose).toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(graphics.dispose).toHaveBeenCalledOnce();
    expect(host.querySelector('canvas')).toBeNull();
    const disposedGeometries = geometryDispose.mock.calls.length;
    const rendered = graphics.render.mock.calls.length;
    controller.dispose();
    controller.setPlaying(true);
    resize([], {} as ResizeObserver);
    window.dispatchEvent(new Event('resize'));
    frame?.(200);
    expect(graphics.dispose).toHaveBeenCalledOnce();
    expect(geometryDispose).toHaveBeenCalledTimes(disposedGeometries);
    expect(graphics.render).toHaveBeenCalledTimes(rendered);
  });

  test('reports a lost context and removes its event handler during cleanup', () => {
    const graphics = renderer();
    const onError = vi.fn();
    createReferenceScene(host, { createRenderer: () => graphics, onError });
    const lost = new Event('webglcontextlost', { cancelable: true });
    graphics.domElement.dispatchEvent(lost);
    expect(lost.defaultPrevented).toBe(true);
    expect(onError).toHaveBeenCalledOnce();
    expect(graphics.dispose).toHaveBeenCalledOnce();
    graphics.domElement.dispatchEvent(new Event('webglcontextlost'));
    expect(onError).toHaveBeenCalledOnce();
  });

  test('cleans up when observer initialisation fails', () => {
    const graphics = renderer();
    vi.stubGlobal('ResizeObserver', class { constructor() { throw new Error('Observer failed'); } });
    expect(() => createReferenceScene(host, { createRenderer: () => graphics })).toThrow('Observer failed');
    expect(graphics.dispose).toHaveBeenCalledOnce();
    expect(host.querySelector('canvas')).toBeNull();
  });
});
