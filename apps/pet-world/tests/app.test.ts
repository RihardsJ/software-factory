import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { mountPetWorld } from '../src/app.js';
import type { Habitat, HabitatOptions } from '../src/scene.js';

let root: HTMLDivElement;

function fakeHabitat() {
  const created: { habitat: Habitat & { react: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn> }; options: HabitatOptions }[] = [];
  const factory = vi.fn((_host: HTMLElement, options: HabitatOptions) => {
    const habitat = { animating: !options.reducedMotion, react: vi.fn(), dispose: vi.fn() };
    created.push({ habitat, options });
    return habitat;
  });
  return { factory, created };
}

const button = (name: string) => {
  const found = [...root.querySelectorAll('button')].find((candidate) => candidate.textContent === name);
  if (!found) throw new Error(`${name} button is missing`);
  return found;
};
const stat = (name: string) => root.querySelector(`[data-stat="${name}"]`)?.textContent;
const meter = (id: string) => root.querySelector<HTMLMeterElement>(`#${id}`)?.value;
const reaction = () => root.querySelector<HTMLElement>('.reaction');
const announcement = () => root.querySelector('[role="status"]')?.textContent;

beforeEach(() => {
  vi.useFakeTimers();
  root = document.createElement('div');
  document.body.append(root);
});
afterEach(() => {
  vi.useRealTimers();
  root.remove();
});

describe('Pet World controls', () => {
  test('shows labelled indicators starting at 60 out of 100', () => {
    const { factory } = fakeHabitat();
    const dispose = mountPetWorld(root, { createHabitat: factory, reducedMotion: false });
    expect(root.querySelector('label[for="fullness"]')?.textContent).toBe('Fullness');
    expect(root.querySelector('label[for="happiness"]')?.textContent).toBe('Happiness');
    expect(stat('fullness')).toBe('60 / 100');
    expect(stat('happiness')).toBe('60 / 100');
    expect(meter('fullness')).toBe(60);
    expect(meter('happiness')).toBe(60);
    expect(reaction()?.dataset['reaction']).toBe('idle');
    dispose();
  });

  test('feeding updates Fullness, announces the result, and eats for one second', () => {
    const { factory, created } = fakeHabitat();
    const dispose = mountPetWorld(root, { createHabitat: factory, reducedMotion: false });
    button('Feed').click();
    expect(stat('fullness')).toBe('80 / 100');
    expect(meter('fullness')).toBe(80);
    expect(stat('happiness')).toBe('60 / 100');
    expect(announcement()).toBe('Sprout eats a snack. Fullness rises to 80.');
    expect(created[0]?.habitat.react).toHaveBeenCalledWith('eating');
    expect(reaction()?.textContent).toBe('Sprout is eating');
    vi.advanceTimersByTime(999);
    expect(reaction()?.dataset['reaction']).toBe('eating');
    vi.advanceTimersByTime(1);
    expect(reaction()?.dataset['reaction']).toBe('idle');
    dispose();
  });

  test('playing updates both values and hops; a new action replaces the current reaction', () => {
    const { factory, created } = fakeHabitat();
    const dispose = mountPetWorld(root, { createHabitat: factory, reducedMotion: false });
    button('Feed').click();
    vi.advanceTimersByTime(600);
    button('Play').click();
    expect(stat('happiness')).toBe('75 / 100');
    expect(stat('fullness')).toBe('70 / 100');
    expect(announcement()).toBe('Sprout hops with joy. Happiness rises to 75. Fullness falls to 70.');
    expect(created[0]?.habitat.react).toHaveBeenLastCalledWith('hopping');
    expect(reaction()?.dataset['reaction']).toBe('hopping');
    vi.advanceTimersByTime(600);
    expect(reaction()?.dataset['reaction']).toBe('hopping');
    vi.advanceTimersByTime(400);
    expect(reaction()?.dataset['reaction']).toBe('idle');
    expect(vi.getTimerCount()).toBe(0);
    dispose();
  });

  test('keeps indicator values within range after repeated actions', () => {
    const { factory } = fakeHabitat();
    const dispose = mountPetWorld(root, { createHabitat: factory, reducedMotion: false });
    for (let count = 0; count < 5; count++) button('Feed').click();
    expect(stat('fullness')).toBe('100 / 100');
    expect(announcement()).toBe('Sprout eats a snack. Fullness stays at 100.');
    for (let count = 0; count < 12; count++) button('Play').click();
    expect(stat('fullness')).toBe('0 / 100');
    expect(stat('happiness')).toBe('100 / 100');
    dispose();
  });

  test('passes reduced motion to the habitat while preserving actions and feedback', () => {
    const { factory, created } = fakeHabitat();
    const dispose = mountPetWorld(root, { createHabitat: factory, reducedMotion: true });
    expect(created[0]?.options.reducedMotion).toBe(true);
    expect(root.querySelector<HTMLElement>('#viewport')?.dataset['motion']).toBe('reduced');
    button('Play').click();
    expect(stat('happiness')).toBe('75 / 100');
    expect(announcement()).toContain('Happiness rises to 75');
    expect(reaction()?.dataset['reaction']).toBe('hopping');
    dispose();
  });

  test('reads the reduced-motion media preference by default', () => {
    const { factory, created } = fakeHabitat();
    const matchMedia = vi.fn((query: string) => ({ matches: query === '(prefers-reduced-motion: reduce)' }));
    vi.stubGlobal('matchMedia', matchMedia);
    const dispose = mountPetWorld(root, { createHabitat: factory });
    expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    expect(created[0]?.options.reducedMotion).toBe(true);
    dispose();
  });

  test('shows a fallback when graphics fail, keeps care actions working, and retries', () => {
    let fail = true;
    const { factory, created } = fakeHabitat();
    const flaky = vi.fn((host: HTMLElement, options: HabitatOptions) => {
      if (fail) throw new Error('WebGL unavailable');
      return factory(host, options);
    });
    const dispose = mountPetWorld(root, { createHabitat: flaky, reducedMotion: false });
    const alert = root.querySelector<HTMLElement>('[role="alert"]');
    expect(alert?.hidden).toBe(false);
    expect(alert?.textContent).toContain("Sprout's habitat could not load");
    button('Feed').click();
    expect(stat('fullness')).toBe('80 / 100');
    fail = false;
    button('Try again').click();
    expect(alert?.hidden).toBe(true);
    expect(created).toHaveLength(1);
    created[0]?.options.onError?.();
    expect(alert?.hidden).toBe(false);
    expect(created[0]?.habitat.dispose).toHaveBeenCalled();
    dispose();
  });

  test('cleanup releases the habitat, timers, and listeners exactly once', () => {
    const { factory, created } = fakeHabitat();
    const dispose = mountPetWorld(root, { createHabitat: factory, reducedMotion: false });
    const feed = button('Feed');
    const retry = button('Try again');
    const removed = [vi.spyOn(feed, 'removeEventListener'), vi.spyOn(retry, 'removeEventListener')];
    feed.click();
    expect(vi.getTimerCount()).toBe(1);
    dispose();
    expect(vi.getTimerCount()).toBe(0);
    expect(created[0]?.habitat.dispose).toHaveBeenCalledOnce();
    for (const spy of removed) expect(spy).toHaveBeenCalledWith('click', expect.any(Function));
    expect(root.childElementCount).toBe(0);
    feed.click();
    expect(created[0]?.habitat.react).toHaveBeenCalledOnce();
    dispose();
    expect(created[0]?.habitat.dispose).toHaveBeenCalledOnce();
  });
});
