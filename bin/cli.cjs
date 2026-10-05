#!/usr/bin/env node
/**
 * Docs CLI — `npx playlist-data-engine docs [topic]`
 *
 * Plain CommonJS on purpose: it runs straight from the published tarball
 * with zero dependencies and no build step.
 */
const fs = require('node:fs');
const path = require('node:path');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const SKILL_PATH = path.join(__dirname, '..', 'skills', 'playlist-data-engine', 'SKILL.md');

function collectDocs(dir, prefix = '') {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) out.push(...collectDocs(path.join(dir, entry.name), rel));
        else if (entry.name.endsWith('.md')) out.push(rel);
    }
    return out.sort();
}

function topics() {
    return collectDocs(DOCS_DIR).map(rel => ({
        rel,
        slug: rel.replace(/\.md$/i, '').replace(/^features\//, '').toLowerCase(),
    }));
}

function usage() {
    const list = topics().map(t => `  ${t.slug.padEnd(24)} docs/${t.rel}`).join('\n');
    return [
        'playlist-data-engine — docs reader',
        '',
        'USAGE',
        '  npx playlist-data-engine docs            List every doc',
        '  npx playlist-data-engine docs <topic>    Print one doc (slug or file path)',
        '  npx playlist-data-engine skill           Print the Claude Code skill file',
        '',
        'TOPICS',
        list,
        '',
        'Full docs also ship inside the package: node_modules/playlist-data-engine/docs/',
    ].join('\n');
}

const [command, topic] = process.argv.slice(2);

if (!command || ['-h', '--help', 'help'].includes(command)) {
    console.log(usage());
    process.exit(0);
}

if (command === 'skill') {
    try {
        console.log(fs.readFileSync(SKILL_PATH, 'utf8'));
    } catch {
        console.error('Skill file not found in this install (expected skills/playlist-data-engine/SKILL.md).');
        process.exit(1);
    }
    process.exit(0);
}

if (command !== 'docs') {
    console.error(`Unknown command "${command}".\n\n${usage()}`);
    process.exit(1);
}

if (!topic) {
    console.log(usage());
    process.exit(0);
}

const all = topics();
const needle = topic.toLowerCase();
const hit =
    all.find(t => t.slug === needle) ||
    all.find(t => t.rel.toLowerCase() === needle) ||
    all.find(t => t.slug.startsWith(needle));
if (!hit) {
    console.error(`No doc matches "${topic}".\n\n${usage()}`);
    process.exit(1);
}
console.log(fs.readFileSync(path.join(DOCS_DIR, hit.rel), 'utf8'));
