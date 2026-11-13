import { Group, Mesh, MeshStandardMaterial, SphereGeometry } from 'three';
import type { BufferGeometry, Material } from 'three';
import { neutralPose } from './animation.js';
import type { PetPose } from './animation.js';

export const SPROUT_COLOURS = {
  body: '#8fdcb8',
  belly: '#fff1d0',
  leaf: '#4fae6e',
  eye: '#1f2a26',
  highlight: '#ffffff',
  mouth: '#6b3a3a',
  foot: '#6fc79e',
} as const;

const BODY_RADIUS = 1;
const EAR_REST_ANGLE = 0.45;

export interface SproutParts {
  readonly body: Mesh;
  readonly belly: Mesh;
  readonly ears: readonly [Group, Group];
  readonly eyes: readonly [Mesh, Mesh];
  readonly mouth: Mesh;
  readonly feet: readonly [Mesh, Mesh];
}

export interface Sprout {
  readonly root: Group;
  readonly parts: SproutParts;
  applyPose: (pose: PetPose) => void;
  dispose: () => void;
}

/** Builds Sprout procedurally. The returned object owns every geometry and material it creates. */
export function createSprout(): Sprout {
  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  const sphere = (segments = 32) => {
    const geometry = new SphereGeometry(1, segments, Math.round(segments * 0.75));
    geometries.push(geometry);
    return geometry;
  };
  const material = (color: string, roughness = 0.65) => {
    const created = new MeshStandardMaterial({ color, roughness });
    materials.push(created);
    return created;
  };

  const root = new Group();
  root.name = 'Sprout';
  // Scaling the torso from its base keeps the feet planted while Sprout breathes.
  const torso = new Group();
  torso.name = 'torso';
  root.add(torso);

  const body = new Mesh(sphere(48), material(SPROUT_COLOURS.body, 0.55));
  body.name = 'body';
  body.position.y = BODY_RADIUS;
  torso.add(body);

  const belly = new Mesh(sphere(), material(SPROUT_COLOURS.belly, 0.7));
  belly.name = 'belly';
  belly.scale.set(0.62, 0.58, 0.32);
  belly.position.set(0, 0.78, 0.74);
  torso.add(belly);

  const eyeMaterial = material(SPROUT_COLOURS.eye, 0.3);
  const highlightMaterial = material(SPROUT_COLOURS.highlight, 0.2);
  const eyeGeometry = sphere(24);
  const makeEye = (side: number) => {
    const eye = new Mesh(eyeGeometry, eyeMaterial);
    eye.name = side < 0 ? 'left-eye' : 'right-eye';
    eye.scale.set(0.11, 0.15, 0.08);
    eye.position.set(0.33 * side, 1.38, 0.86);
    const highlight = new Mesh(eyeGeometry, highlightMaterial);
    highlight.scale.setScalar(0.35);
    highlight.position.set(0.3, 0.35, 0.8);
    eye.add(highlight);
    torso.add(eye);
    return eye;
  };
  const eyes = [makeEye(-1), makeEye(1)] as const;

  const mouth = new Mesh(sphere(16), material(SPROUT_COLOURS.mouth, 0.5));
  mouth.name = 'mouth';
  mouth.position.set(0, 1.16, 0.95);
  torso.add(mouth);

  const leafMaterial = material(SPROUT_COLOURS.leaf, 0.5);
  const leafGeometry = sphere();
  const makeEar = (side: number) => {
    const pivot = new Group();
    pivot.name = side < 0 ? 'left-ear' : 'right-ear';
    pivot.position.set(0.42 * side, 1.84, 0);
    pivot.rotation.z = -EAR_REST_ANGLE * side;
    const leaf = new Mesh(leafGeometry, leafMaterial);
    leaf.scale.set(0.2, 0.45, 0.07);
    leaf.position.y = 0.38;
    pivot.add(leaf);
    torso.add(pivot);
    return pivot;
  };
  const ears = [makeEar(-1), makeEar(1)] as const;

  const footMaterial = material(SPROUT_COLOURS.foot, 0.6);
  const footGeometry = sphere(20);
  const makeFoot = (side: number) => {
    const foot = new Mesh(footGeometry, footMaterial);
    foot.name = side < 0 ? 'left-foot' : 'right-foot';
    foot.scale.set(0.24, 0.12, 0.3);
    foot.position.set(0.42 * side, 0.1, 0.35);
    root.add(foot);
    return foot;
  };
  const feet = [makeFoot(-1), makeFoot(1)] as const;

  let disposed = false;

  const sprout: Sprout = {
    root,
    parts: { body, belly, ears, eyes, mouth, feet },
    applyPose(pose) {
      root.position.y = pose.lift;
      torso.scale.set(pose.bodyScaleX, pose.bodyScaleY, pose.bodyScaleX);
      torso.rotation.x = pose.nod;
      ears.forEach((ear, index) => {
        const side = index === 0 ? -1 : 1;
        ear.rotation.z = -(EAR_REST_ANGLE + pose.earTilt) * side;
      });
      for (const eye of eyes) eye.scale.y = 0.15 * Math.max(pose.eyeOpen, 0.05);
      mouth.scale.set(0.12, 0.04 + 0.1 * pose.mouthOpen, 0.06);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      for (const geometry of geometries) geometry.dispose();
      for (const created of materials) created.dispose();
    },
  };
  sprout.applyPose(neutralPose);
  return sprout;
}
