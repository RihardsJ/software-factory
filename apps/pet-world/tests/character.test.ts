import { describe, expect, test, vi } from 'vitest';
import { BufferGeometry, Color, Group, Material, Mesh, MeshStandardMaterial } from 'three';
import { neutralPose } from '../src/animation.js';
import { SPROUT_COLOURS, createSprout } from '../src/character.js';

const colourOf = (mesh: Mesh) => `#${(mesh.material as MeshStandardMaterial).color.getHexString()}`;

describe('Sprout character', () => {
  test('builds a round mint-green body, cream belly, leaf ears, eyes, and small feet', () => {
    const { root, parts, dispose } = createSprout();
    expect(root.name).toBe('Sprout');
    expect(colourOf(parts.body)).toBe(`#${new Color(SPROUT_COLOURS.body).getHexString()}`);
    expect(parts.body.scale.toArray()).toEqual([1, 1, 1]);
    expect(colourOf(parts.belly)).toBe(`#${new Color(SPROUT_COLOURS.belly).getHexString()}`);
    expect(parts.ears.map((ear) => ear.name)).toEqual(['left-ear', 'right-ear']);
    for (const ear of parts.ears) {
      const leaf = ear.children[0];
      expect(leaf).toBeInstanceOf(Mesh);
      expect(colourOf(leaf as Mesh)).toBe(`#${new Color(SPROUT_COLOURS.leaf).getHexString()}`);
    }
    expect(parts.eyes.map((eye) => eye.name)).toEqual(['left-eye', 'right-eye']);
    expect(parts.feet.map((foot) => foot.name)).toEqual(['left-foot', 'right-foot']);
    for (const foot of parts.feet) expect(foot.scale.x).toBeLessThan(0.5);
    expect(parts.feet[0].parent).toBe(root);
    dispose();
  });

  test('applies poses to the body, ears, eyes, mouth, and height', () => {
    const { root, parts, applyPose, dispose } = createSprout();
    const torso = parts.body.parent as Group;
    const restingEar = parts.ears[1].rotation.z;
    applyPose({ ...neutralPose, lift: 0.5, bodyScaleY: 1.05, earTilt: 0.2, eyeOpen: 0.1, mouthOpen: 1, nod: 0.1 });
    expect(root.position.y).toBe(0.5);
    expect(torso.scale.y).toBe(1.05);
    expect(torso.rotation.x).toBe(0.1);
    expect(parts.ears[1].rotation.z).toBeLessThan(restingEar);
    expect(parts.ears[0].rotation.z).toBeCloseTo(-parts.ears[1].rotation.z);
    expect(parts.eyes[0].scale.y).toBeCloseTo(0.015);
    expect(parts.mouth.scale.y).toBeCloseTo(0.14);
    applyPose(neutralPose);
    expect(root.position.y).toBe(0);
    expect(parts.ears[1].rotation.z).toBeCloseTo(restingEar);
    dispose();
  });

  test('releases every geometry and material once', () => {
    const geometryDispose = vi.spyOn(BufferGeometry.prototype, 'dispose');
    const materialDispose = vi.spyOn(Material.prototype, 'dispose');
    const parent = new Group();
    const sprout = createSprout();
    parent.add(sprout.root);
    sprout.dispose();
    expect(parent.children).toHaveLength(0);
    expect(geometryDispose.mock.calls.length).toBeGreaterThanOrEqual(5);
    expect(materialDispose.mock.calls.length).toBeGreaterThanOrEqual(7);
    const geometries = geometryDispose.mock.calls.length;
    sprout.dispose();
    expect(geometryDispose).toHaveBeenCalledTimes(geometries);
  });
});
