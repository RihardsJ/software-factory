import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const workspaceRoot = resolve(import.meta.dirname, '../../..');
const memberRoot = join(workspaceRoot, 'tools/factory');

function run(script: string, args: string[], cwd: string, overrides: NodeJS.ProcessEnv = {}) {
  return spawnSync('bash', [script, ...args], {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      SPECIFY_INIT_DIR: '',
      SPECIFY_FEATURE: '',
      SPECIFY_FEATURE_DIRECTORY: '',
      SPECIFY_FEATURE_NO_PERSIST: '1',
      ...overrides,
    },
  });
}

describe.each(['.', 'tools/factory', 'apps/reference'])('Spec Kit scripts in %s', (project) => {
  const scripts = join(workspaceRoot, project, '.specify/scripts/bash');
  const common = join(scripts, 'common.sh');

  function resolveRoot(cwd: string, overrides: NodeJS.ProcessEnv = {}) {
    return run('-c', ['source "$1"; get_repo_root', 'bash', common], cwd, overrides);
  }

  test('keeps workspace scope at the repository root', () => {
    const result = resolveRoot(workspaceRoot);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout.trim()).toBe(workspaceRoot);
  });

  test.each(['tools/factory', 'apps/reference'])('selects the nearest member from %s source', (member) => {
    const selected = join(workspaceRoot, member);
    const result = resolveRoot(join(selected, 'src'));
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout.trim()).toBe(selected);
  });

  test.each(['tools/factory', 'apps/reference'])('selects %s explicitly from the repository root', (member) => {
    const result = resolveRoot(workspaceRoot, { SPECIFY_INIT_DIR: member });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout.trim()).toBe(join(workspaceRoot, member));
  });

  test.each([
    ['tools/no-such-project', 'does not point to an existing directory'],
    ['tools', 'is not a Spec Kit project'],
  ])('rejects the invalid project override %s', (target, message) => {
    const result = resolveRoot(workspaceRoot, { SPECIFY_INIT_DIR: target });
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain(message);
  });

  test('resolves feature paths within the selected member without changing its pointer', () => {
    const pointer = join(memberRoot, '.specify/feature.json');
    const before = existsSync(pointer) ? readFileSync(pointer, 'utf8') : undefined;
    const result = run(join(scripts, 'check-prerequisites.sh'), ['--paths-only', '--json'], workspaceRoot, {
      SPECIFY_INIT_DIR: 'tools/factory',
      SPECIFY_FEATURE_DIRECTORY: 'specs/001-member-feature',
    });
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout) as unknown).toMatchObject({
      REPO_ROOT: memberRoot,
      FEATURE_DIR: join(memberRoot, 'specs/001-member-feature'),
      FEATURE_SPEC: join(memberRoot, 'specs/001-member-feature/spec.md'),
    });
    expect(existsSync(pointer) ? readFileSync(pointer, 'utf8') : undefined).toBe(before);
  });

  test('numbers member features independently from workspace features', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'spec-kit-monorepo-'));
    const member = join(fixture, 'tools/factory');
    try {
      mkdirSync(join(fixture, '.specify'), { recursive: true });
      mkdirSync(join(fixture, 'specs/009-workspace-feature'), { recursive: true });
      mkdirSync(join(member, '.specify'), { recursive: true });
      mkdirSync(join(member, 'specs/001-member-feature'), { recursive: true });
      for (const { cwd, expected } of [
        { cwd: fixture, expected: '010-scope-probe' },
        { cwd: member, expected: '002-scope-probe' },
      ]) {
        const result = run(join(scripts, 'create-new-feature.sh'), ['--dry-run', '--json', '--short-name', 'scope-probe', 'Scope probe'], cwd);
        expect(result.status, result.stderr).toBe(0);
        expect(JSON.parse(result.stdout) as unknown).toMatchObject({ BRANCH_NAME: expected });
      }
      expect(existsSync(join(member, 'specs/002-scope-probe'))).toBe(false);
      expect(existsSync(join(fixture, 'specs/010-scope-probe'))).toBe(false);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  test('creates a feature with the selected member template without writing workspace specs', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'spec-kit-monorepo-'));
    const member = join(fixture, 'tools/factory');
    try {
      for (const [projectRoot, content] of [[fixture, '# Workspace specification\n'], [member, '# Member specification\n']] as const) {
        mkdirSync(join(projectRoot, '.specify/templates'), { recursive: true });
        writeFileSync(join(projectRoot, '.specify/templates/spec-template.md'), content);
      }
      const result = run(join(scripts, 'create-new-feature.sh'), ['--json', '--short-name', 'scope-probe', 'Scope probe'], fixture, {
        SPECIFY_INIT_DIR: member,
      });
      expect(result.status, result.stderr).toBe(0);
      const specFile = join(member, 'specs/001-scope-probe/spec.md');
      expect(JSON.parse(result.stdout) as unknown).toMatchObject({ SPEC_FILE: specFile });
      expect(readFileSync(specFile, 'utf8')).toBe('# Member specification\n');
      expect(existsSync(join(fixture, 'specs'))).toBe(false);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });
});
