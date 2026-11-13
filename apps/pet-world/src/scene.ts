import {
  CircleGeometry, Color, DirectionalLight, Fog, HemisphereLight, IcosahedronGeometry,
  Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, Scene, WebGLRenderer,
} from 'three';
import type { WebGLRendererParameters } from 'three';
import { createPetAnimator } from './animation.js';
import type { Reaction } from './animation.js';
import { createSprout } from './character.js';

export type SceneRenderer = Pick<WebGLRenderer, 'domElement' | 'setPixelRatio' | 'setSize' | 'render' | 'dispose'> & {
  setAnimationLoop: (callback: ((time: number) => void) | null) => void;
};

export interface HabitatOptions {
  reducedMotion?: boolean;
  createRenderer?: (parameters: WebGLRendererParameters) => SceneRenderer;
  /** Clock shared with animation-loop timestamps. */
  now?: () => number;
  onError?: () => void;
}

export interface Habitat {
  /** Whether a continuous animation loop is running. */
  readonly animating: boolean;
  /** Starts a reaction, replacing the one in progress. */
  react: (reaction: Reaction) => void;
  dispose: () => void;
}

export const HABITAT_LABEL = 'Sprout, a round mint-green creature with leaf ears, standing in a grassy habitat';
const CAMERA_TARGET_Y = 1.05;

export function createHabitat(host: HTMLElement, options: HabitatOptions = {}): Habitat {
  const now = options.now ?? (() => performance.now());
  const reducedMotion = options.reducedMotion ?? false;
  const renderer = (options.createRenderer ?? ((parameters) => new WebGLRenderer(parameters)))({ antialias: true });
  const scene = new Scene();
  scene.background = new Color('#dff1e6');
  scene.fog = new Fog('#dff1e6', 9, 20);
  const camera = new PerspectiveCamera(40, 1, 0.1, 60);
  const animator = createPetAnimator({ reducedMotion });
  const sprout = createSprout();
  let disposed = false;
  let observer: ResizeObserver | undefined;
  const releaseResources: (() => void)[] = [() => sprout.dispose()];

  function dispose() {
    if (disposed) return;
    disposed = true;
    renderer.setAnimationLoop(null);
    observer?.disconnect();
    renderer.domElement.removeEventListener('webglcontextlost', contextLost);
    for (const release of releaseResources) release();
    releaseResources.length = 0;
    scene.clear();
    renderer.dispose();
    renderer.domElement.remove();
  }

  function contextLost(event: Event) {
    event.preventDefault();
    dispose();
    options.onError?.();
  }

  try {
    const owned = <T extends Mesh<CircleGeometry | IcosahedronGeometry, MeshStandardMaterial | MeshBasicMaterial>>(mesh: T) => {
      releaseResources.push(() => mesh.geometry.dispose(), () => mesh.material.dispose());
      scene.add(mesh);
      return mesh;
    };
    const ground = owned(new Mesh(new CircleGeometry(14, 64), new MeshStandardMaterial({ color: '#a9d98f', roughness: 0.95 })));
    ground.name = 'ground';
    ground.rotation.x = -Math.PI / 2;
    const shadow = owned(new Mesh(new CircleGeometry(0.95, 40), new MeshBasicMaterial({ color: '#2f5a3a', transparent: true, opacity: 0.22, depthWrite: false })));
    shadow.name = 'contact-shadow';
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    const bushMaterial = new MeshStandardMaterial({ color: '#5fae6b', roughness: 0.9, flatShading: true });
    const bushGeometry = new IcosahedronGeometry(1, 1);
    releaseResources.push(() => bushGeometry.dispose(), () => bushMaterial.dispose());
    for (const [x, z, size] of [[-3.4, -2.6, 0.9], [3.1, -3.2, 1.2], [-1.6, -4.4, 0.7]] as const) {
      const bush = new Mesh(bushGeometry, bushMaterial);
      bush.name = 'bush';
      bush.scale.set(size, size * 0.75, size);
      bush.position.set(x, size * 0.45, z);
      scene.add(bush);
    }
    scene.add(sprout.root, new HemisphereLight('#ffffff', '#6f9a63', 2.2));
    const sun = new DirectionalLight('#fff3dc', 2.6);
    sun.position.set(3, 6, 5);
    scene.add(sun);

    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute('aria-label', HABITAT_LABEL);
    host.append(renderer.domElement);

    const draw = (time: number) => {
      const pose = animator.sample(time);
      sprout.applyPose(pose);
      const shrink = 1 - Math.min(pose.lift, 1) * 0.45;
      shadow.scale.set(shrink, shrink, 1);
      renderer.render(scene, camera);
    };

    function resize() {
      if (disposed) return;
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      const aspect = width / height;
      // Narrow viewports move the camera back so Sprout and its ears stay in frame.
      const distance = 6.2 * Math.max(1, 1.15 / aspect);
      camera.aspect = aspect;
      camera.position.set(0, CAMERA_TARGET_Y + distance * 0.32, distance);
      camera.lookAt(0, CAMERA_TARGET_Y, 0);
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      draw(now());
    }

    function frame(time: number) {
      if (disposed) return;
      draw(time);
    }

    observer = new ResizeObserver(resize);
    observer.observe(host);
    window.addEventListener('resize', resize);
    releaseResources.push(() => window.removeEventListener('resize', resize));
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    resize();
    renderer.setAnimationLoop(reducedMotion ? null : frame);

    return {
      get animating() { return !disposed && !reducedMotion; },
      react(reaction) {
        if (disposed) return;
        const time = now();
        animator.trigger(reaction, time);
        if (reducedMotion) draw(time);
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
