#!/usr/bin/env node
/**
 * Dependency release-age gate.
 *
 * Freshly published versions are the attack surface for registry account
 * takeovers: a hijacked package is typically pulled within hours to days, so
 * refusing anything younger than the cooldown avoids nearly all of that window.
 * npm has no rolling age gate (only the fixed `--before` date), hence this.
 *
 *   node scripts/depAge.cjs check          audit direct deps
 *   node scripts/depAge.cjs check --all    audit every package in the lockfile
 *   node scripts/depAge.cjs add <pkg>...   install newest version past cooldown, pinned
 *   node scripts/depAge.cjs pin            rewrite package.json ranges to installed versions
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

/**
 * One request per package name, shared by every version of it in the tree.
 *
 * The registry returns the whole publish-date map in a single response, so the
 * per-version audit costs no extra requests. Caches the promise, not the result,
 * so concurrent workers asking for the same name coalesce onto one fetch.
 */
const _timesCache = new Map();
function publishTimesCached(name) {
  if (!_timesCache.has(name)) _timesCache.set(name, publishTimes(name));
  return _timesCache.get(name);
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
    const entry = lockfileEntries()?.byName.get(name);
    return entry ? entry.version : null;
  }
}

/**
 * Everything the lockfile resolves, transitive included.
 *
 * `instances` holds one record per name+version. npm nests duplicate versions of
 * a package throughout the tree and each one is its own thing to audit, so
 * collapsing them by name alone would leave most of the tree unchecked.
 *
 * `byName` answers "which version of this dependency is in play", preferring the
 * hoisted copy at `node_modules/<name>` over anything nested beneath a sibling.
 */
let _lockCache;
function lockfileEntries() {
  if (_lockCache !== undefined) return _lockCache;
  const lockPath = path.join(ROOT, 'package-lock.json');
  if (!fs.existsSync(lockPath)) return (_lockCache = null);

  const instances = new Map();
  const byName = new Map();
  for (const [key, val] of Object.entries(readJson(lockPath).packages || {})) {
    if (!key.startsWith('node_modules/')) continue;
    // Aliased installs ("cbw-sdk": "npm:@coinbase/wallet-sdk") carry the real
    // package in `name`; the directory is the alias and means nothing to the registry.
    const dir = key.slice(key.lastIndexOf('node_modules/') + 'node_modules/'.length);
    const name = val.name || dir;
    // A linked dep carries no version — it is local source, not a release.
    const entry = { name, version: val.version || null, resolved: val.resolved || '', link: val.link === true };
    instances.set(`${name}@${entry.version ?? key}`, entry);
    if (!byName.has(name) || key === `node_modules/${name}`) byName.set(name, entry);
  }
  return (_lockCache = { instances: [...instances.values()], byName });
}

/** Registry tarballs are the only thing carrying a publish date we can read. */
const REGISTRY_TARBALL = /^https?:\/\/registry\.npmjs\.org\//;

/**
 * Positively known not to come from the registry: a linked local path, a git or
 * file spec, or a tarball on another host. None has a publish date to judge, so
 * these are reported rather than failed. An empty `resolved` is not a
 * determination — it means the lockfile had nothing to say — so it is fetched.
 */
function offRegistry(entry) {
  if (entry.link) return true;
  const resolved = entry.resolved || '';
  return resolved !== '' && !REGISTRY_TARBALL.test(resolved);
}

async function check(all) {
  const pkg = readJson(pkgJsonPath);
  const lock = lockfileEntries();
  let targets;

  if (all) {
    if (!lock) {
      console.error('No package-lock.json — cannot audit transitive deps.');
      process.exit(2);
    }
    targets = lock.instances;
  } else {
    // The lockfile supplies how each dependency resolves, which is the only way
    // to tell a registry release from local source before going to the network.
    targets = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).map((name) => {
      const entry = lock?.byName.get(name);
      const spec = pkg.dependencies?.[name] ?? pkg.devDependencies?.[name];
      return {
        name,
        version: installedVersion(name) || spec,
        resolved: entry?.resolved || '',
        link: entry?.link || false,
      };
    });
  }

  console.log(`Cooldown: ${COOLDOWN_DAYS} days (cutoff ${CUTOFF.toISOString().slice(0, 10)})`);
  console.log(`Auditing ${targets.length} package(s)${all ? ' including transitive' : ''}…\n`);

  const young = [], unknown = [], external = [];
  let done = 0;
  const results = await mapPool(targets, 16, async (target) => {
    if (offRegistry(target)) { done++; return { ...target, skip: true }; }
    const times = await publishTimesCached(target.name);
    if (++done % 100 === 0) process.stderr.write(`  …${done}/${targets.length}\n`);
    return { ...target, times };
  });
  for (const { name, version, times, resolved, skip } of results) {
    if (skip) {
      external.push(`${name}@${version ?? 'linked'} (${(resolved || 'local path').split('#')[0].slice(0, 40)}…)`);
      continue;
    }
    if (!version || !times || !times[version]) { unknown.push(`${name}@${version ?? '?'}`); continue; }
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
  if (!names.length) { console.error('Usage: depAge.cjs add <pkg>...'); process.exit(2); }
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
else { console.error('Usage: depAge.cjs check [--all] | add <pkg>... | pin'); process.exit(2); }
