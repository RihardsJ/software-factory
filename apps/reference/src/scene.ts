import {
  AmbientLight, Color, CylinderGeometry, DirectionalLight, Fog, GridHelper,
  HemisphereLight, Mesh, MeshStandardMaterial, PerspectiveCamera,
  Scene, TorusKnotGeometry, WebGLRenderer,
} from 'three';
import type { WebGLRendererParameters } from 'three';

export type SceneRenderer = Pick<WebGLRenderer, 'domElement' | 'setPixelRatio' | 'setSize' | 'render' | 'dispose'> & {
  setAnimationLoop: (callback: ((time: number) => void) | null) => void;
};

export interface SceneOptions {
  reducedMotion?: boolean;
  createRenderer?: (parameters: WebGLRendererParameters) => SceneRenderer;
  onError?: () => void;
}

export interface ReferenceScene {
  readonly playing: boolean;
  setPlaying: (playing: boolean) => void;
  dispose: () => void;
}

export function createReferenceScene(host: HTMLElement, options: SceneOptions = {}): ReferenceScene {
  const renderer = (options.createRenderer ?? ((parameters) => new WebGLRenderer(parameters)))({ antialias: true });
  const scene = new Scene();
  scene.background = new Color('#e9eeeb');
  scene.fog = new Fog('#e9eeeb', 7, 15);
  const camera = new PerspectiveCamera(38, 1, 0.1, 50);
  camera.position.set(4, 2.8, 5.8);
  camera.lookAt(0, 0, 0);
  let disposed = false;
  let playing = !options.reducedMotion;
  let lastTime: number | undefined;
  let observer: ResizeObserver | undefined;
  const releaseResources: (() => void)[] = [];

  function dispose() {
    if (disposed) return;
    disposed = true;
    playing = false;
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
    const sculpture = new Mesh(
      new TorusKnotGeometry(0.85, 0.27, 160, 24),
      new MeshStandardMaterial({ color: '#e67545', roughness: 0.32, metalness: 0.22 }),
    );
    releaseResources.push(() => sculpture.geometry.dispose(), () => sculpture.material.dispose());
    sculpture.rotation.set(0.25, 0.15, 0);
    scene.add(sculpture);
    const plinth = new Mesh(
      new CylinderGeometry(1.65, 1.65, 0.12, 64),
      new MeshStandardMaterial({ color: '#cdd8d0', roughness: 0.8 }),
    );
    releaseResources.push(() => plinth.geometry.dispose(), () => plinth.material.dispose());
    plinth.position.y = -1.5;
    scene.add(plinth);
    const grid = new GridHelper(20, 40, '#b4c4b8', '#d1dbd3');
    releaseResources.push(() => grid.geometry.dispose(), () => grid.material.dispose());
    grid.position.y = -1.57;
    scene.add(grid, new AmbientLight('#ffffff', 1.2), new HemisphereLight('#ffffff', '#839a8a', 2));
    const light = new DirectionalLight('#fff1dd', 4);
    light.position.set(3, 5, 4);
    scene.add(light);

    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute('aria-label', 'An orange interwoven sculpture on a circular platform');
    host.append(renderer.domElement);

    function resize() {
      if (disposed) return;
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      renderer.render(scene, camera);
    }

    function frame(time: number) {
      if (disposed || !playing) return;
      const delta = lastTime === undefined ? 0 : Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      sculpture.rotation.y += delta * 0.32;
      sculpture.rotation.x += delta * 0.08;
      renderer.render(scene, camera);
    }

    observer = new ResizeObserver(resize);
    observer.observe(host);
    window.addEventListener('resize', resize);
    releaseResources.push(() => window.removeEventListener('resize', resize));
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    resize();
    renderer.setAnimationLoop(playing ? frame : null);

    return {
      get playing() { return playing; },
      setPlaying(next) {
        if (disposed) return;
        playing = next;
        lastTime = undefined;
        renderer.setAnimationLoop(playing ? frame : null);
        if (!playing) renderer.render(scene, camera);
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
