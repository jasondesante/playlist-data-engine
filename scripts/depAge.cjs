#!/usr/bin/env node
/**
 * Dependency release-age gate.
 *
 * Freshly published versions are the attack surface for registry account
 * takeovers: a hijacked package is typically pulled within hours to days, so
 * refusing anything younger than the cooldown avoids nearly all of that window.
 * npm has no rolling age gate (only the fixed `--before` date), hence this.
 *
 *   node scripts/depAge.js check          audit direct deps
 *   node scripts/depAge.js check --all    audit every package in the lockfile
 *   node scripts/depAge.js add <pkg>...   install newest version past cooldown, pinned
 *   node scripts/depAge.js pin            rewrite package.json ranges to installed versions
 *
 * Exits non-zero when the audit finds a violation, so CI can gate on it.
 * Override the window with COOLDOWN_DAYS (default 30).
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const COOLDOWN_DAYS = Number(process.env.COOLDOWN_DAYS || 30);
const ROOT = path.resolve(__dirname, '..');
const CUTOFF = new Date(Date.now() - COOLDOWN_DAYS * 86400_000);

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const pkgJsonPath = path.join(ROOT, 'package.json');

const REGISTRY = process.env.NPM_REGISTRY || 'https://registry.npmjs.org';

/**
 * version -> ISO publish date, straight from the registry.
 *
 * Retries, because this backs a security gate: a dropped connection must not
 * read as "nothing to see here". Returns null only after every attempt fails,
 * and callers report that as unresolved rather than clean.
 */
async function publishTimes(name, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`${REGISTRY}/${name.replace('/', '%2f')}`, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(60_000),
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const t = (await res.json()).time;
      if (!t) return null;
      delete t.created; delete t.modified;
      return t;
    } catch {
      if (i === attempts - 1) return null;
      await new Promise((r) => setTimeout(r, 300 * 2 ** i));
    }
  }
  return null;
}

/** Bounded parallelism: the registry is the bottleneck, not us. */
async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }));
  return out;
}

const isStable = (v) => /^\d+\.\d+\.\d+$/.test(v);
const cmp = (a, b) => {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
};

/** Newest stable version published on or before the cutoff. */
async function newestAged(name) {
  const times = await publishTimes(name);
  if (!times) return null;
  const ok = Object.entries(times)
    .filter(([v, d]) => isStable(v) && new Date(d) <= CUTOFF)
    .sort((a, b) => cmp(a[0], b[0]));
  return ok.length ? { version: ok[ok.length - 1][0], date: ok[ok.length - 1][1] } : null;
}

/** Version actually in play: what's on disk, else what the lockfile resolves. */
function installedVersion(name) {
  try {
    return readJson(path.join(ROOT, 'node_modules', name, 'package.json')).version;
  } catch {
    const entry = lockfileEntries()?.get(name);
    return entry ? entry.version : null;
  }
}

/** name -> version for everything the lockfile resolves, transitive included. */
let _lockCache;
function lockfileEntries() {
  if (_lockCache !== undefined) return _lockCache;
  const lockPath = path.join(ROOT, 'package-lock.json');
  if (!fs.existsSync(lockPath)) return (_lockCache = null);
  const out = new Map();
  for (const [key, val] of Object.entries(readJson(lockPath).packages || {})) {
    if (!key.startsWith('node_modules/') || !val.version) continue;
    // Aliased installs ("cbw-sdk": "npm:@coinbase/wallet-sdk") carry the real
    // package in `name`; the directory is the alias and means nothing to the registry.
    const dir = key.slice(key.lastIndexOf('node_modules/') + 'node_modules/'.length);
    out.set(val.name || dir, { version: val.version, resolved: val.resolved || '' });
  }
  return (_lockCache = out);
}

async function check(all) {
  const pkg = readJson(pkgJsonPath);
  let targets;

  if (all) {
    const lock = lockfileEntries();
    if (!lock) {
      console.error('No package-lock.json — cannot audit transitive deps.');
      process.exit(2);
    }
    targets = [...lock.entries()].map(([n, v]) => [n, v.version, v.resolved]);
  } else {
    targets = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })
      .map((n) => [n, installedVersion(n) || (pkg.dependencies?.[n] ?? pkg.devDependencies[n]), '']);
  }

  console.log(`Cooldown: ${COOLDOWN_DAYS} days (cutoff ${CUTOFF.toISOString().slice(0, 10)})`);
  console.log(`Auditing ${targets.length} package(s)${all ? ' including transitive' : ''}…\n`);

  // Not from the registry, so there is no publish date to judge. A git URL ending
  // in a commit SHA pins content exactly, which is its own guarantee; a file/link
  // dep is local source. Neither is an unknown, so neither fails the gate.
  const offRegistry = (r) => /^(git\+|file:|link:)/.test(r || '');

  const young = [], unknown = [], external = [];
  let done = 0;
  const results = await mapPool(targets, 16, async ([name, version, resolved]) => {
    if (offRegistry(resolved)) { done++; return { name, version, resolved, skip: true }; }
    const times = await publishTimes(name);
    if (++done % 100 === 0) process.stderr.write(`  …${done}/${targets.length}\n`);
    return { name, version, times };
  });
  for (const { name, version, times, resolved, skip } of results) {
    if (skip) { external.push(`${name}@${version} (${resolved.split('#')[0].slice(0, 40)}…)`); continue; }
    if (!times || !times[version]) { unknown.push(name); continue; }
    const published = new Date(times[version]);
    if (published > CUTOFF) {
      const days = Math.floor((Date.now() - published) / 86400_000);
      young.push({ name, version, days, date: times[version].slice(0, 10) });
    }
  }

  if (young.length) {
    console.log(`❌ ${young.length} package(s) newer than the cooldown:\n`);
    young.sort((a, b) => a.days - b.days);
    for (const y of young) {
      console.log(`   ${y.name}@${y.version}  published ${y.date}  (${y.days}d old)`);
    }
  } else {
    console.log('✅ Every audited package is past the cooldown.');
  }
  if (external.length) {
    console.log(`\nℹ️  ${external.length} package(s) resolved outside the registry (pinned by SHA or local path):`);
    for (const e of external.slice(0, 6)) console.log(`   ${e}`);
  }
  if (unknown.length) {
    console.log(`\n⚠️  ${unknown.length} package(s) could not be checked (treat as unknown, not clean):`);
    console.log(`   ${unknown.slice(0, 8).join(', ')}${unknown.length > 8 ? '…' : ''}`);
  }
  process.exit(young.length || unknown.length ? 1 : 0);
}

async function add(names) {
  if (!names.length) { console.error('Usage: depAge.js add <pkg>...'); process.exit(2); }
  const specs = [];
  for (const name of names) {
    const aged = await newestAged(name);
    if (!aged) { console.error(`❌ ${name}: no stable version older than ${COOLDOWN_DAYS} days.`); process.exit(1); }
    console.log(`${name} -> ${aged.version} (published ${aged.date.slice(0, 10)})`);
    specs.push(`${name}@${aged.version}`);
  }
  const args = ['install', '--save-exact', ...specs];
  console.log(`\n$ npm ${args.join(' ')}\n`);
  execFileSync('npm', args, { cwd: ROOT, stdio: 'inherit' });
}

/** Replaces ranges with the version actually installed, so package.json matches reality. */
function pin() {
  const pkg = readJson(pkgJsonPath);
  let changed = 0;
  for (const field of ['dependencies', 'devDependencies']) {
    for (const [name, range] of Object.entries(pkg[field] || {})) {
      if (/^\d+\.\d+\.\d+$/.test(range)) continue;
      // file:/link:/git: deps resolve outside the registry — a version number
      // here would sever the link.
      if (!/^[\^~>=<]*\d/.test(range) && range !== '*' && !range.startsWith('latest')) {
        console.log(`   skip ${name} (${range})`);
        continue;
      }
      const installed = installedVersion(name);
      if (!installed) { console.log(`   skip ${name} (not installed)`); continue; }
      console.log(`   ${name}: ${range} -> ${installed}`);
      pkg[field][name] = installed;
      changed++;
    }
  }
  fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`\nPinned ${changed} dependency range(s).`);
}

const [cmdName, ...rest] = process.argv.slice(2);
if (cmdName === 'check') check(rest.includes('--all'));
else if (cmdName === 'add') add(rest);
else if (cmdName === 'pin') pin();
else { console.error('Usage: depAge.js check [--all] | add <pkg>... | pin'); process.exit(2); }
