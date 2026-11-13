import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { BufferGeometry, Material, Mesh, PerspectiveCamera, Scene } from 'three';
import type { Object3D } from 'three';
import { HABITAT_LABEL, createHabitat } from '../src/scene.js';
import type { SceneRenderer } from '../src/scene.js';

let resize: ResizeObserverCallback;
const disconnect = vi.fn();
let host: HTMLDivElement;
let clock = 0;
const now = () => clock;

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

function renderedScene(graphics: ReturnType<typeof renderer>): Scene {
  const scene: unknown = graphics.render.mock.lastCall?.[0];
  if (!(scene instanceof Scene)) throw new Error('Scene was not rendered');
  return scene as Scene;
}

function named(scene: Scene, name: string): Object3D {
  const found = scene.getObjectByName(name);
  if (!found) throw new Error(`${name} is missing`);
  return found;
}

beforeEach(() => {
  clock = 0;
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

describe('habitat lifecycle', () => {
  test('renders Sprout on a lit ground plane with an accessible label', () => {
    const graphics = renderer();
    const habitat = createHabitat(host, { createRenderer: () => graphics, now });
    const scene = renderedScene(graphics);
    expect(named(scene, 'Sprout')).toBeDefined();
    expect(named(scene, 'ground')).toBeInstanceOf(Mesh);
    expect(scene.children.some((child) => 'isLight' in child)).toBe(true);
    expect(graphics.domElement.getAttribute('role')).toBe('img');
    expect(graphics.domElement.getAttribute('aria-label')).toBe(HABITAT_LABEL);
    expect(host.querySelector('canvas')).toBe(graphics.domElement);
    habitat.dispose();
  });

  test('resizes to the container, reframes narrow views, and caps pixel density', () => {
    const graphics = renderer();
    vi.stubGlobal('devicePixelRatio', 3);
    const habitat = createHabitat(host, { createRenderer: () => graphics, now });
    expect(graphics.setSize).toHaveBeenLastCalledWith(800, 400);
    expect(graphics.setPixelRatio).toHaveBeenCalledWith(2);
    const camera = graphics.render.mock.lastCall?.[1] as PerspectiveCamera;
    expect(camera).toBeInstanceOf(PerspectiveCamera);
    const wideDistance = camera.position.z;
    Object.defineProperty(host, 'clientWidth', { value: 300 });
    resize([], {} as ResizeObserver);
    expect(graphics.setSize).toHaveBeenLastCalledWith(300, 400);
    expect(camera.aspect).toBe(0.75);
    expect(camera.position.z).toBeGreaterThan(wideDistance);
    vi.stubGlobal('devicePixelRatio', 1);
    window.dispatchEvent(new Event('resize'));
    expect(graphics.setPixelRatio).toHaveBeenLastCalledWith(1);
    habitat.dispose();
  });

  test('animates idle motion and plays reactions from the animation loop', () => {
    const graphics = renderer();
    const habitat = createHabitat(host, { createRenderer: () => graphics, now });
    expect(habitat.animating).toBe(true);
    const frame = graphics.setAnimationLoop.mock.calls[0]?.[0];
    if (!frame) throw new Error('Animation callback was not registered');
    const sprout = named(renderedScene(graphics), 'Sprout');
    const torso = named(renderedScene(graphics), 'torso');
    frame(800);
    expect(torso.scale.y).toBeGreaterThan(1);
    clock = 1000;
    habitat.react('hopping');
    frame(1500);
    expect(sprout.position.y).toBeGreaterThan(0.5);
    frame(2000);
    expect(sprout.position.y).toBe(0);
    habitat.dispose();
  });

  test('reduced motion renders still frames without an animation loop', () => {
    const graphics = renderer();
    const habitat = createHabitat(host, { createRenderer: () => graphics, now, reducedMotion: true });
    expect(habitat.animating).toBe(false);
    expect(graphics.setAnimationLoop).toHaveBeenCalledWith(null);
    expect(graphics.setAnimationLoop.mock.calls.every(([callback]) => callback === null)).toBe(true);
    const rendered = graphics.render.mock.calls.length;
    habitat.react('hopping');
    expect(graphics.render).toHaveBeenCalledTimes(rendered + 1);
    expect(named(renderedScene(graphics), 'Sprout').position.y).toBe(0);
    habitat.dispose();
  });

  test('releases owned resources once and ignores stale callbacks after disposal', () => {
    const graphics = renderer();
    const geometryDispose = vi.spyOn(BufferGeometry.prototype, 'dispose');
    const materialDispose = vi.spyOn(Material.prototype, 'dispose');
    const removeListener = vi.spyOn(window, 'removeEventListener');
    const habitat = createHabitat(host, { createRenderer: () => graphics, now });
    const frame = graphics.setAnimationLoop.mock.calls[0]?.[0];
    habitat.dispose();
    expect(graphics.setAnimationLoop).toHaveBeenLastCalledWith(null);
    expect(geometryDispose.mock.calls.length).toBeGreaterThanOrEqual(8);
    expect(materialDispose.mock.calls.length).toBeGreaterThanOrEqual(10);
    expect(disconnect).toHaveBeenCalledOnce();
    expect(removeListener).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(graphics.dispose).toHaveBeenCalledOnce();
    expect(host.querySelector('canvas')).toBeNull();
    expect(habitat.animating).toBe(false);
    const disposedGeometries = geometryDispose.mock.calls.length;
    const rendered = graphics.render.mock.calls.length;
    habitat.dispose();
    habitat.react('eating');
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
    createHabitat(host, { createRenderer: () => graphics, now, onError });
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
    const geometryDispose = vi.spyOn(BufferGeometry.prototype, 'dispose');
    vi.stubGlobal('ResizeObserver', class { constructor() { throw new Error('Observer failed'); } });
    expect(() => createHabitat(host, { createRenderer: () => graphics, now })).toThrow('Observer failed');
    expect(graphics.dispose).toHaveBeenCalledOnce();
    expect(geometryDispose).toHaveBeenCalled();
    expect(host.querySelector('canvas')).toBeNull();
  });
});
