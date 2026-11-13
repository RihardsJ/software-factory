import { describe, expect, test } from 'vitest';
import {
  BLINK_PERIOD_MS, BREATH_PERIOD_MS, EAR_PERIOD_MS, HOP_HEIGHT, REACTION_DURATION_MS,
  createPetAnimator, neutralPose,
} from '../src/animation.js';

describe('pet animation', () => {
  test('idle motion breathes, blinks, and moves the ears', () => {
    const animator = createPetAnimator();
    const rest = animator.sample(0);
    expect(rest.reaction).toBeNull();
    expect(animator.sample(BREATH_PERIOD_MS / 4).bodyScaleY).toBeGreaterThan(rest.bodyScaleY);
    expect(animator.sample((BREATH_PERIOD_MS * 3) / 4).bodyScaleY).toBeLessThan(rest.bodyScaleY);
    expect(animator.sample(EAR_PERIOD_MS / 4).earTilt).toBeGreaterThan(0);
    expect(animator.sample(100).eyeOpen).toBe(1);
    expect(animator.sample(BLINK_PERIOD_MS - 50).eyeOpen).toBeLessThan(0.5);
    expect(animator.sample(BLINK_PERIOD_MS + 50).eyeOpen).toBe(1);
    for (let time = 0; time < 10_000; time += 37) expect(animator.sample(time).lift).toBe(0);
  });

  test('eating lasts one second and returns to idle', () => {
    const animator = createPetAnimator();
    animator.trigger('eating', 1000);
    const chewing = animator.sample(1125);
    expect(chewing.reaction).toBe('eating');
    expect(chewing.mouthOpen).toBeGreaterThan(0.5);
    expect(animator.sample(1000 + REACTION_DURATION_MS - 1).reaction).toBe('eating');
    const after = animator.sample(1000 + REACTION_DURATION_MS);
    expect(after.reaction).toBeNull();
    expect(after.mouthOpen).toBe(0);
  });

  test('hopping lifts Sprout during one second and lands it afterwards', () => {
    const animator = createPetAnimator();
    animator.trigger('hopping', 2000);
    expect(animator.sample(2000).lift).toBeCloseTo(0);
    expect(animator.sample(2500).lift).toBeCloseTo(HOP_HEIGHT);
    expect(animator.sample(2500).reaction).toBe('hopping');
    const landed = animator.sample(2000 + REACTION_DURATION_MS);
    expect(landed.reaction).toBeNull();
    expect(landed.lift).toBe(0);
  });

  test('a new action replaces the current reaction and restarts its timing', () => {
    const animator = createPetAnimator();
    animator.trigger('eating', 0);
    expect(animator.sample(600).reaction).toBe('eating');
    animator.trigger('hopping', 600);
    const replaced = animator.sample(700);
    expect(replaced.reaction).toBe('hopping');
    expect(replaced.mouthOpen).toBe(0.4);
    expect(animator.sample(1500).reaction).toBe('hopping');
    expect(animator.sample(1600).reaction).toBeNull();
    animator.trigger('eating', 2000);
    animator.trigger('eating', 2900);
    expect(animator.sample(3800).reaction).toBe('eating');
    expect(animator.sample(3900).reaction).toBeNull();
  });

  test('keeps a new reaction when the next frame timestamp precedes its start time', () => {
    const animator = createPetAnimator();
    animator.trigger('hopping', 1000.5);
    const early = animator.sample(996);
    expect(early.reaction).toBe('hopping');
    expect(early.lift).toBeCloseTo(0);
    expect(animator.sample(1500.5).lift).toBeCloseTo(HOP_HEIGHT);
  });

  test('reduced motion keeps a still pose while reporting reactions', () => {
    const animator = createPetAnimator({ reducedMotion: true });
    for (const time of [0, BREATH_PERIOD_MS / 4, BLINK_PERIOD_MS - 50, EAR_PERIOD_MS / 4]) {
      expect(animator.sample(time)).toEqual(neutralPose);
    }
    animator.trigger('hopping', 100);
    expect(animator.sample(600)).toEqual({ ...neutralPose, reaction: 'hopping' });
    expect(animator.sample(1100)).toEqual(neutralPose);
  });
});
