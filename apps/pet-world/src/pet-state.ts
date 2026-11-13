export const STAT_MIN = 0;
export const STAT_MAX = 100;
export const INITIAL_STAT = 60;
export const FEED_FULLNESS = 20;
export const PLAY_HAPPINESS = 15;
export const PLAY_FULLNESS = -10;

export type PetAction = 'feed' | 'play';

export interface PetStats {
  readonly fullness: number;
  readonly happiness: number;
}

export interface ActionResult {
  readonly stats: PetStats;
  readonly message: string;
}

export function clampStat(value: number): number {
  return Math.min(STAT_MAX, Math.max(STAT_MIN, Math.round(value)));
}

export function createPetStats(): PetStats {
  return { fullness: INITIAL_STAT, happiness: INITIAL_STAT };
}

function describeChange(name: string, before: number, after: number): string {
  if (after === before) return `${name} stays at ${after}`;
  return `${name} ${after > before ? 'rises' : 'falls'} to ${after}`;
}

export function applyAction(stats: PetStats, action: PetAction): ActionResult {
  if (action === 'feed') {
    const fullness = clampStat(stats.fullness + FEED_FULLNESS);
    return {
      stats: { fullness, happiness: stats.happiness },
      message: `Sprout eats a snack. ${describeChange('Fullness', stats.fullness, fullness)}.`,
    };
  }
  const happiness = clampStat(stats.happiness + PLAY_HAPPINESS);
  const fullness = clampStat(stats.fullness + PLAY_FULLNESS);
  return {
    stats: { fullness, happiness },
    message: `Sprout hops with joy. ${describeChange('Happiness', stats.happiness, happiness)}. ${describeChange('Fullness', stats.fullness, fullness)}.`,
  };
}
