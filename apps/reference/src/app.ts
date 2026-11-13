import { createReferenceScene } from './scene.js';
import type { ReferenceScene } from './scene.js';

export function mountReferenceApp(root: HTMLElement): () => void {
  root.innerHTML = `
    <div class="shell">
      <header class="masthead"><a class="brand" href="./"><span class="brand-mark" aria-hidden="true">sf</span> Software Factory</a><span class="edition">REFERENCE / 001</span></header>
      <main>
        <section class="introduction" aria-labelledby="page-title">
          <div><p class="eyebrow">A SMALL BEGINNING</p><h1 id="page-title">Make room<br>for possibility<span>.</span></h1></div>
          <div class="intro-note"><span class="note-line" aria-hidden="true"></span><p>One scene. A little motion.<br>A foundation to build on.</p></div>
        </section>
        <section class="scene-card" aria-label="Interactive 3D reference scene">
          <div class="scene-toolbar"><div class="scene-title"><span class="indicator" aria-hidden="true"></span><h2>Study in motion</h2></div><span class="status" role="status" aria-live="polite">Starting scene</span></div>
          <div class="viewport" id="viewport"><div class="fallback" role="alert" hidden><span class="fallback-symbol" aria-hidden="true">↗</span><h3>3D view unavailable</h3><p>Your browser could not display this scene.<br>Check graphics support and try again.</p><button class="primary retry" type="button">Try again</button></div><span class="view-label" aria-hidden="true">PERSPECTIVE VIEW</span><span class="view-number" aria-hidden="true">01 — FORM</span></div>
          <div class="scene-footer"><p class="motion-note">An interwoven form, always finding a new angle.</p><div class="controls"><button class="toggle" type="button">Pause animation</button><button class="lifecycle" type="button">Stop scene</button></div></div>
        </section>
        <footer class="page-footer"><p>Built to explore. Designed to grow.</p><span>THREE.JS / TYPESCRIPT / VITE</span></footer>
      </main>
    </div>`;
  const host = root.querySelector<HTMLElement>('#viewport');
  const status = root.querySelector<HTMLElement>('.status');
  const fallback = root.querySelector<HTMLElement>('.fallback');
  const toggle = root.querySelector<HTMLButtonElement>('.toggle');
  const lifecycle = root.querySelector<HTMLButtonElement>('.lifecycle');
  const retry = root.querySelector<HTMLButtonElement>('.retry');
  const note = root.querySelector<HTMLElement>('.motion-note');
  if (!host || !status || !fallback || !toggle || !lifecycle || !retry || !note) throw new Error('Reference application elements are missing');
  let current: ReferenceScene | undefined;
  let destroyed = false;

  const updateControls = () => {
    toggle.disabled = !current;
    toggle.textContent = current?.playing ? 'Pause animation' : 'Resume animation';
    lifecycle.textContent = current ? 'Stop scene' : 'Start scene';
  };
  const unavailable = () => {
    current?.dispose();
    current = undefined;
    fallback.hidden = false;
    status.textContent = 'Unavailable';
    host.dataset['state'] = 'unavailable';
    updateControls();
  };
  const start = () => {
    if (destroyed) return;
    current?.dispose();
    current = undefined;
    fallback.hidden = true;
    try {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      current = createReferenceScene(host, { reducedMotion, onError: unavailable });
      status.textContent = current.playing ? 'Animating' : 'Paused';
      host.dataset['state'] = 'ready';
      note.textContent = reducedMotion ? 'Motion is paused to match your preferences.' : 'An interwoven form, always finding a new angle.';
      updateControls();
    } catch {
      unavailable();
    }
  };
  const toggleMotion = () => {
    if (!current) return;
    current.setPlaying(!current.playing);
    status.textContent = current.playing ? 'Animating' : 'Paused';
    updateControls();
  };
  const toggleLifecycle = () => {
    if (!current) { start(); return; }
    current.dispose();
    current = undefined;
    status.textContent = 'Stopped';
    host.dataset['state'] = 'stopped';
    updateControls();
  };
  toggle.addEventListener('click', toggleMotion);
  lifecycle.addEventListener('click', toggleLifecycle);
  retry.addEventListener('click', start);
  start();

  return () => {
    if (destroyed) return;
    destroyed = true;
    current?.dispose();
    toggle.removeEventListener('click', toggleMotion);
    lifecycle.removeEventListener('click', toggleLifecycle);
    retry.removeEventListener('click', start);
    root.replaceChildren();
  };
}
