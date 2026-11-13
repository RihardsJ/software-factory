import { REACTION_DURATION_MS, reactionFor } from './animation.js';
import type { Reaction } from './animation.js';
import { applyAction, createPetStats, STAT_MAX } from './pet-state.js';
import type { PetAction, PetStats } from './pet-state.js';
import { createHabitat } from './scene.js';
import type { Habitat, HabitatOptions } from './scene.js';

export interface PetWorldOptions {
  createHabitat?: (host: HTMLElement, options: HabitatOptions) => Habitat;
  reducedMotion?: boolean;
}

const reactionText: Record<Reaction, string> = { eating: 'Sprout is eating', hopping: 'Sprout is hopping' };

export function mountPetWorld(root: HTMLElement, options: PetWorldOptions = {}): () => void {
  root.innerHTML = `
    <div class="shell">
      <header class="masthead"><span class="brand"><span class="brand-mark" aria-hidden="true">pw</span> Pet World</span><span class="edition">SPROUT / 001</span></header>
      <main class="layout">
        <section class="habitat-card" aria-labelledby="habitat-title">
          <div class="card-toolbar"><h1 id="habitat-title">Sprout's habitat</h1><span class="reaction" data-reaction="idle">Sprout is relaxing</span></div>
          <div class="viewport" id="viewport"><div class="fallback" role="alert" hidden><h2>Sprout's habitat could not load</h2><p>Your browser could not start 3D graphics.<br>You can still feed and play with Sprout.</p><button class="primary retry" type="button">Try again</button></div></div>
        </section>
        <section class="care-panel" aria-labelledby="care-title">
          <h2 id="care-title">Care for Sprout</h2>
          <div class="stat"><label for="fullness">Fullness</label><meter id="fullness" min="0" max="${STAT_MAX}" low="30" high="70" optimum="100"></meter><span class="stat-value" data-stat="fullness"></span></div>
          <div class="stat"><label for="happiness">Happiness</label><meter id="happiness" min="0" max="${STAT_MAX}" low="30" high="70" optimum="100"></meter><span class="stat-value" data-stat="happiness"></span></div>
          <div class="actions"><button class="primary" type="button" data-action="feed">Feed</button><button class="primary" type="button" data-action="play">Play</button></div>
          <p class="announcement" role="status" aria-live="polite"></p>
        </section>
      </main>
    </div>`;
  const host = root.querySelector<HTMLElement>('#viewport');
  const fallback = root.querySelector<HTMLElement>('.fallback');
  const retry = root.querySelector<HTMLButtonElement>('.retry');
  const reactionBadge = root.querySelector<HTMLElement>('.reaction');
  const announcement = root.querySelector<HTMLElement>('.announcement');
  const fullnessMeter = root.querySelector<HTMLMeterElement>('#fullness');
  const happinessMeter = root.querySelector<HTMLMeterElement>('#happiness');
  const fullnessValue = root.querySelector<HTMLElement>('[data-stat="fullness"]');
  const happinessValue = root.querySelector<HTMLElement>('[data-stat="happiness"]');
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-action]')];
  if (!host || !fallback || !retry || !reactionBadge || !announcement || !fullnessMeter || !happinessMeter || !fullnessValue || !happinessValue || buttons.length !== 2) {
    throw new Error('Pet World elements are missing');
  }
  const indicators = {
    fullness: { meter: fullnessMeter, value: fullnessValue },
    happiness: { meter: happinessMeter, value: happinessValue },
  };
  const build = options.createHabitat ?? createHabitat;
  let stats: PetStats = createPetStats();
  let habitat: Habitat | undefined;
  let reactionTimer: ReturnType<typeof setTimeout> | undefined;
  let destroyed = false;

  const render = () => {
    for (const key of ['fullness', 'happiness'] as const) {
      indicators[key].meter.value = stats[key];
      indicators[key].value.textContent = `${stats[key]} / ${STAT_MAX}`;
    }
  };
  const showReaction = (reaction: Reaction | null) => {
    reactionBadge.dataset['reaction'] = reaction ?? 'idle';
    reactionBadge.textContent = reaction ? reactionText[reaction] : 'Sprout is relaxing';
  };
  const unavailable = () => {
    habitat?.dispose();
    habitat = undefined;
    fallback.hidden = false;
    host.dataset['state'] = 'unavailable';
  };
  const start = () => {
    if (destroyed) return;
    habitat?.dispose();
    habitat = undefined;
    fallback.hidden = true;
    try {
      const reducedMotion = options.reducedMotion ?? window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      habitat = build(host, { reducedMotion, onError: unavailable });
      host.dataset['state'] = 'ready';
      host.dataset['motion'] = reducedMotion ? 'reduced' : 'full';
    } catch {
      unavailable();
    }
  };
  const act = (event: Event) => {
    const action = (event.currentTarget as HTMLButtonElement).dataset['action'] as PetAction;
    const result = applyAction(stats, action);
    stats = result.stats;
    render();
    announcement.textContent = result.message;
    const reaction = reactionFor[action];
    // A new action replaces the current reaction instead of queueing behind it.
    clearTimeout(reactionTimer);
    habitat?.react(reaction);
    showReaction(reaction);
    reactionTimer = setTimeout(() => {
      reactionTimer = undefined;
      showReaction(null);
    }, REACTION_DURATION_MS);
  };

  for (const button of buttons) button.addEventListener('click', act);
  retry.addEventListener('click', start);
  render();
  start();

  return () => {
    if (destroyed) return;
    destroyed = true;
    clearTimeout(reactionTimer);
    habitat?.dispose();
    habitat = undefined;
    for (const button of buttons) button.removeEventListener('click', act);
    retry.removeEventListener('click', start);
    root.replaceChildren();
  };
}
