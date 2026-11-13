import type { PetAction } from './pet-state.js';

export const REACTION_DURATION_MS = 1000;
export const BREATH_PERIOD_MS = 3200;
export const BLINK_PERIOD_MS = 4000;
export const BLINK_DURATION_MS = 160;
export const EAR_PERIOD_MS = 2600;
export const HOP_HEIGHT = 0.7;

export type Reaction = 'eating' | 'hopping';

export const reactionFor: Record<PetAction, Reaction> = { feed: 'eating', play: 'hopping' };

export interface PetPose {
  /** Body scale from breathing and reaction squash. */
  readonly bodyScaleX: number;
  readonly bodyScaleY: number;
  /** Vertical offset of the whole pet above the ground. */
  readonly lift: number;
  /** Ear tilt in radians, mirrored for the second ear. */
  readonly earTilt: number;
  /** Eye openness from 0 (closed) to 1 (open). */
  readonly eyeOpen: number;
  /** Mouth openness from 0 (closed) to 1 (wide). */
  readonly mouthOpen: number;
  /** Forward head nod in radians. */
  readonly nod: number;
  readonly reaction: Reaction | null;
}

export const neutralPose: PetPose = {
  bodyScaleX: 1, bodyScaleY: 1, lift: 0, earTilt: 0, eyeOpen: 1, mouthOpen: 0, nod: 0, reaction: null,
};

export interface PetAnimator {
  /** Starts a reaction at `time`, replacing any reaction already in progress. */
  trigger: (reaction: Reaction, time: number) => void;
  sample: (time: number) => PetPose;
}

export interface AnimatorOptions {
  /** Removes decorative idle motion and reaction movement. Reactions still report their state. */
  reducedMotion?: boolean;
}

const wave = (time: number, period: number) => Math.sin((2 * Math.PI * time) / period);

export function createPetAnimator(options: AnimatorOptions = {}): PetAnimator {
  const reducedMotion = options.reducedMotion ?? false;
  let active: { reaction: Reaction; start: number } | undefined;

  function current(time: number) {
    // Frame timestamps can precede the clock reading taken when an action starts, so early samples keep the reaction.
    if (active && time - active.start >= REACTION_DURATION_MS) active = undefined;
    return active;
  }

  return {
    trigger(reaction, time) {
      active = { reaction, start: time };
    },
    sample(time) {
      const running = current(time);
      const reaction = running?.reaction ?? null;
      if (reducedMotion) return { ...neutralPose, reaction };
      const breath = 1 + 0.025 * wave(time, BREATH_PERIOD_MS);
      const blinking = time % BLINK_PERIOD_MS >= BLINK_PERIOD_MS - BLINK_DURATION_MS;
      const idle: PetPose = {
        ...neutralPose,
        bodyScaleX: 1 - 0.01 * wave(time, BREATH_PERIOD_MS),
        bodyScaleY: breath,
        earTilt: 0.12 * wave(time, EAR_PERIOD_MS),
        eyeOpen: blinking ? 0.1 : 1,
      };
      if (!running) return idle;
      const progress = Math.max(0, time - running.start) / REACTION_DURATION_MS;
      if (running.reaction === 'eating') {
        const chew = Math.abs(Math.sin(progress * Math.PI * 4));
        return { ...idle, reaction, mouthOpen: chew, nod: 0.18 * chew, eyeOpen: 0.55 };
      }
      const arc = Math.sin(progress * Math.PI);
      const squash = progress < 0.15 || progress > 0.85 ? 0.12 * Math.sin((progress < 0.5 ? progress : 1 - progress) / 0.15 * Math.PI) : 0;
      return {
        ...idle,
        reaction,
        lift: HOP_HEIGHT * arc,
        bodyScaleX: idle.bodyScaleX + squash,
        bodyScaleY: idle.bodyScaleY - squash,
        earTilt: idle.earTilt - 0.35 * arc,
        mouthOpen: 0.4,
      };
    },
  };
}
