import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function readText(path) {
  return readFileSync(path, 'utf8');
}

function npmLs() {
  if (process.env.npm_execpath) {
    return JSON.parse(
      execFileSync(process.execPath, [process.env.npm_execpath, 'ls', '--json', '--depth=0'], {
        cwd: rootDir,
        encoding: 'utf8'
      })
    );
  }
  const command = process.platform === 'win32' ? 'cmd.exe' : 'npm';
  const args = process.platform === 'win32' ? ['/d', '/s', '/c', 'npm', 'ls', '--json', '--depth=0'] : ['ls', '--json', '--depth=0'];
  return JSON.parse(execFileSync(command, args, { cwd: rootDir, encoding: 'utf8' }));
}

function lockPackage(lock, name) {
  return lock.packages?.[`node_modules/${name}`] ?? null;
}

function normalizeLicense(license) {
  if (!license) return null;
  if (typeof license === 'string') return license;
  if (license.type) return license.type;
  return null;
}

const packageJson = readJson(join(rootDir, 'package.json'));
const packageLock = readJson(join(rootDir, 'package-lock.json'));
const installed = npmLs();
const notices = readText(join(rootDir, 'THIRD_PARTY_NOTICES.md'));
const ui = readText(join(rootDir, 'src', 'ui.mjs'));

const runtimeDeps = Object.keys(packageJson.dependencies ?? {});
const devDeps = Object.keys(packageJson.devDependencies ?? {});
const allDeps = [
  ...runtimeDeps.map((name) => ({ name, runtime: true })),
  ...devDeps.map((name) => ({ name, runtime: false }))
];

const failures = [];

for (const dep of allDeps) {
  const installedMeta = installed.dependencies?.[dep.name];
  if (!installedMeta) {
    failures.push(`${dep.name}: missing from npm ls --json --depth=0 output`);
    continue;
  }

  const meta = lockPackage(packageLock, dep.name);
  if (!meta) {
    failures.push(`${dep.name}: missing from package-lock.json`);
    continue;
  }

  const license = normalizeLicense(meta.license);
  if (!license) failures.push(`${dep.name}: missing license metadata in package-lock.json`);
  if (installedMeta.version !== meta.version) {
    failures.push(`${dep.name}: npm ls version ${installedMeta.version} does not match lockfile version ${meta.version}`);
  }

  const noticeChecks = [dep.name, meta.version, license].filter(Boolean);
  for (const value of noticeChecks) {
    if (!notices.includes(value)) failures.push(`${dep.name}: THIRD_PARTY_NOTICES.md missing "${value}"`);
  }

  if (dep.runtime) {
    const helpChecks = [dep.name, meta.version, license].filter(Boolean);
    for (const value of helpChecks) {
      if (!ui.includes(value)) failures.push(`${dep.name}: help output missing "${value}"`);
    }
  }
}

if (failures.length > 0) {
  console.error('Notice check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Notice check passed (${runtimeDeps.length} runtime, ${devDeps.length} dev dependencies).`);
