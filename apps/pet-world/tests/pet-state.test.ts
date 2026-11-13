import { describe, expect, test } from 'vitest';
import { applyAction, clampStat, createPetStats } from '../src/pet-state.js';

describe('pet state', () => {
  test('starts Fullness and Happiness at 60 out of 100', () => {
    expect(createPetStats()).toEqual({ fullness: 60, happiness: 60 });
  });

  test('feeding raises Fullness by 20 and leaves Happiness unchanged', () => {
    const result = applyAction(createPetStats(), 'feed');
    expect(result.stats).toEqual({ fullness: 80, happiness: 60 });
    expect(result.message).toBe('Sprout eats a snack. Fullness rises to 80.');
  });

  test('playing raises Happiness by 15 and lowers Fullness by 10', () => {
    const result = applyAction(createPetStats(), 'play');
    expect(result.stats).toEqual({ fullness: 50, happiness: 75 });
    expect(result.message).toBe('Sprout hops with joy. Happiness rises to 75. Fullness falls to 50.');
  });

  test('keeps values at the upper boundary', () => {
    expect(applyAction({ fullness: 90, happiness: 60 }, 'feed').stats.fullness).toBe(100);
    const full = applyAction({ fullness: 100, happiness: 60 }, 'feed');
    expect(full.stats.fullness).toBe(100);
    expect(full.message).toBe('Sprout eats a snack. Fullness stays at 100.');
    expect(applyAction({ fullness: 60, happiness: 95 }, 'play').stats.happiness).toBe(100);
  });

  test('keeps values at the lower boundary', () => {
    expect(applyAction({ fullness: 5, happiness: 60 }, 'play').stats.fullness).toBe(0);
    const empty = applyAction({ fullness: 0, happiness: 60 }, 'play');
    expect(empty.stats.fullness).toBe(0);
    expect(empty.message).toContain('Fullness stays at 0.');
  });

  test('stays within range across long sequences of actions', () => {
    let stats = createPetStats();
    for (let step = 0; step < 40; step++) {
      stats = applyAction(stats, step % 3 === 0 ? 'feed' : 'play').stats;
      for (const value of [stats.fullness, stats.happiness]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
    }
  });

  test('clamps out-of-range and fractional input', () => {
    expect(clampStat(-4)).toBe(0);
    expect(clampStat(140)).toBe(100);
    expect(clampStat(42.6)).toBe(43);
  });
});
