/**
 * Self-describing docs index. The index is inlined by design: safe in browser
 * bundles (no fs at runtime) and always version-matched. Full doc bodies ship
 * in the package under docs/ — this module tells callers exactly where they
 * are. The skill file is inlined at build time from the canonical copy in
 * skills/, so the two can never drift.
 */
import skillRaw from '../../skills/playlist-data-engine/SKILL.md?raw';

export interface EngineDocTopic {
    /** Slug accepted by engineHelp(topic) and `npx playlist-data-engine docs <topic>` */
    slug: string;
    /** File path relative to the package root */
    file: string;
    summary: string;
}

export const ENGINE_DOC_TOPICS: readonly EngineDocTopic[] = [
    { slug: 'data_engine_reference', file: 'docs/DATA_ENGINE_REFERENCE.md', summary: 'Every public function in one table — signatures, inputs, outputs.' },
    { slug: 'usage_in_other_projects', file: 'docs/USAGE_IN_OTHER_PROJECTS.md', summary: 'Install, main vs gateway entry, first parsed playlist.' },
    { slug: 'playlist_parsing', file: 'docs/features/PLAYLIST_PARSING.md', summary: 'Loading playlists, track objects, alternate mixes: pins, alias matching, lossy/lossless pairs.' },
    { slug: 'gateway_resolution', file: 'docs/features/GATEWAY_RESOLUTION.md', summary: 'Gateway failover, Wayfinder, resolving tx and IPFS URLs.' },
    { slug: 'audio_analysis', file: 'docs/features/AUDIO_ANALYSIS.md', summary: 'BPM, key, mood, genre classification (TensorFlow + essentia).' },
    { slug: 'beat_detection', file: 'docs/features/BEAT_DETECTION.md', summary: 'Beat streams and rhythm-game chart generation.' },
    { slug: 'combat_system', file: 'docs/features/COMBAT_SYSTEM.md', summary: 'Seeded combat simulations driven by track energy.' },
    { slug: 'content_packs', file: 'docs/features/CONTENT_PACKS.md', summary: 'Bundled content collections.' },
    { slug: 'custom_content', file: 'docs/features/CUSTOM_CONTENT.md', summary: 'Authoring your own content.' },
    { slug: 'enemy_generation', file: 'docs/features/ENEMY_GENERATION.md', summary: 'Characters generated from sonic fingerprints.' },
    { slug: 'equipment_system', file: 'docs/features/EQUIPMENT_SYSTEM.md', summary: 'Loot and equipment.' },
    { slug: 'extensibility_guide', file: 'docs/features/EXTENSIBILITY_GUIDE.md', summary: 'Extending the engine.' },
    { slug: 'irl_sensors', file: 'docs/features/IRL_SENSORS.md', summary: 'Weather, time, motion context for condition-gated mixes.' },
    { slug: 'prerequisites', file: 'docs/features/PREREQUISITES.md', summary: 'Required setup.' },
    { slug: 'rolls_and_seeds', file: 'docs/features/ROLLS_AND_SEEDS.md', summary: 'Deterministic seeded dice.' },
    { slug: 'xp_and_stats', file: 'docs/features/XP_AND_STATS.md', summary: 'Progression and persistence.' },
];

/** Friendly aliases for the common lookups */
const TOPIC_ALIASES: Readonly<Record<string, string>> = {
    reference: 'data_engine_reference',
    usage: 'usage_in_other_projects',
    parsing: 'playlist_parsing',
    mixes: 'playlist_parsing',
    gateway: 'gateway_resolution',
    docs: 'data_engine_reference',
};

/**
 * Timestamped Arweave snapshots of docs/, newest last. Arweave TXs are
 * immutable, so every entry stays addressable forever — re-uploading after a
 * docs change adds a new entry and never retires the old ones. Append the
 * paste-ready output of `node scripts/upload-docs.cjs <wallet.json> --yes`.
 */
export interface EngineDocArchiveEntry {
    /** Engine version the docs describe */
    version: string;
    /** ISO timestamp of the upload */
    uploadedAt: string;
    /** docs/-relative path → Turbo transaction id */
    files: Record<string, string>;
}

export const ENGINE_DOC_ARCHIVE: readonly EngineDocArchiveEntry[] = [
    {
        version: '1.7.3',
        uploadedAt: '2026-10-05T00:00:00.000Z',
        files: {
            'DATA_ENGINE_REFERENCE.md': 'TWQ0ashXikM82N2fEmeSSWtV72CavF6kySmZWWyTUX0',
            'USAGE_IN_OTHER_PROJECTS.md': 'wzeOtdQnuAx4Tk_SuTL0Mzkk05EviFljJdpI93pB7Ek',
            'features/AUDIO_ANALYSIS.md': 'v6apJcfWhSXSNf2zFgl36xaeurTsfm89YUvi0PPGUbs',
            'features/BEAT_DETECTION.md': 'IK26T_JcCnS5SVWmvaSzLL_QyihvyCpKXaUrBlhQRow',
            'features/COMBAT_SYSTEM.md': 'dk8G9qnh76tpjudjOhzvCEL89Wm2ZNHY_BPqIzuoxLg',
            'features/CONTENT_PACKS.md': 'QzoLMibxAWtJ6NfM82f_xZUh4tLAoF0ZoQf-vzI-r5c',
            'features/CUSTOM_CONTENT.md': '76hpg3ox37NfaK4b1PplPrJpAP3PXBqQwTtpOhvFWXo',
            'features/ENEMY_GENERATION.md': 'eeEuV9bCP8jxX5_DU6V6p2imbiJ251cTM8dM3UqaCbc',
            'features/EQUIPMENT_SYSTEM.md': 'I8GH9d6UuHl1bbdLAN5LUo4ppcPu5cK320q_HQ0GEzU',
            'features/EXTENSIBILITY_GUIDE.md': '8ha92HARwcA1AQ0z5OqmdXWa7VPDcPrImqF1MB2Dd5Q',
            'features/GATEWAY_RESOLUTION.md': '__oqyaVqA-DPF_M_9_C9S8nYNohXjJd2b2YIU9uYVHE',
            'features/IRL_SENSORS.md': 'AodJ11PvwSNnT8hoReib4lWArlfO6nH0tU3Gz5x5ul8',
            'features/PLAYLIST_PARSING.md': 'CDZOVCe1RTVWQKhG-FMj12XA0hAb6E_Gj-UBq1-h9SY',
            'features/PREREQUISITES.md': 'CnP5rxjK_5xX70-1SiCzymVROaARp5Um2yESF2yaTmQ',
            'features/ROLLS_AND_SEEDS.md': 'y1mCkus6jre7h_jHDZMM_PGoucrDuUazNBnCZD2-zdo',
            'features/XP_AND_STATS.md': 'UV4cFhuL7Un8XuguyAKNu0Qo1RlIiKYGWiBdvBJzEEM',
        },
    },
];

const GITHUB_BLOB = 'https://github.com/jasondesante/playlist-data-engine/blob/main';

function index(): string {
    const rows = ENGINE_DOC_TOPICS.map(t => `- \`${t.slug}\` — ${t.file}: ${t.summary}`).join('\n');
    const latest = ENGINE_DOC_ARCHIVE[ENGINE_DOC_ARCHIVE.length - 1];
    const archiveLine = latest
        ? [`- Permanent archive on Arweave: latest snapshot is v${latest.version} (${latest.uploadedAt}) — every doc also has an \`ar://\` link via \`engineHelp('<topic>')\``, '- All archived versions stay addressable forever: ' + ENGINE_DOC_ARCHIVE.map(a => `v${a.version} (${a.uploadedAt.slice(0, 10)})`).join(', ')]
        : [];
    return [
        '# playlist-data-engine — docs index',
        '',
        'Parse Arweave serverless music playlists, resolve alternate mixes and quality, reach files through gateway failover.',
        '',
        '## Where the full docs are',
        '',
        '- In this install: `node_modules/playlist-data-engine/docs/` (version-matched — prefer this)',
        '- CLI: `npx playlist-data-engine docs <topic>`',
        '- GitHub: https://github.com/jasondesante/playlist-data-engine/tree/main/docs',
        ...archiveLine,
        '',
        '## Topics',
        '',
        rows,
        '',
        '## For AI agents',
        '',
        '- `engineHelp(\'<topic>\')` returns where to read one doc (aliases: ' + Object.keys(TOPIC_ALIASES).join(', ') + ')',
        '- `engineHelp(\'skill\')` returns the Claude Code skill file — write it to `.claude/skills/playlist-data-engine/SKILL.md` to install',
        '- The `.d.ts` in dist/ is the complete API surface with JSDoc',
        '',
    ].join('\n');
}

/** Newest archive snapshot containing this doc file, if any */
function archiveFor(topicFile: string): { entry: EngineDocArchiveEntry; txId: string } | undefined {
    const rel = topicFile.replace(/^docs\//, '');
    for (let i = ENGINE_DOC_ARCHIVE.length - 1; i >= 0; i--) {
        const txId = ENGINE_DOC_ARCHIVE[i].files[rel];
        if (txId) return { entry: ENGINE_DOC_ARCHIVE[i], txId };
    }
    return undefined;
}

function topicHelp(topic: string): string {
    const slug = TOPIC_ALIASES[topic.toLowerCase()] ?? topic.toLowerCase();
    const found = ENGINE_DOC_TOPICS.find(t => t.slug === slug || t.slug.startsWith(slug));
    if (!found) {
        return `No doc topic "${topic}".\n\n${index()}`;
    }
    return [
        `# ${found.slug}`,
        '',
        found.summary,
        '',
        `- File: \`${found.file}\` (relative to the package root)`,
        `- In this install: \`node_modules/playlist-data-engine/${found.file}\``,
        `- CLI: \`npx playlist-data-engine docs ${found.slug}\``,
        `- Online: ${GITHUB_BLOB}/${found.file}`,
        ...(archiveFor(found.file)
            ? [`- Permanent: ar://${archiveFor(found.file)!.txId} (docs v${archiveFor(found.file)!.entry.version}, uploaded ${archiveFor(found.file)!.entry.uploadedAt.slice(0, 10)})`]
            : []),
        '',
        'Read the file itself for the full text — this pointer is deliberately small so it stays safe in browser bundles.',
        '',
    ].join('\n');
}

/**
 * Self-describing docs entry point: the doc index, one topic's location, or
 * the Claude Code skill file. Inlined content only — safe in browsers and
 * always version-matched to the installed package.
 *
 * @param topic - Omit for the doc index; a topic slug (or alias) for one doc's
 *   location; `'skill'` for the SKILL.md contents.
 */
export function engineHelp(topic?: string): string {
    if (!topic) return index();
    if (topic.toLowerCase() === 'skill') return skillRaw;
    return topicHelp(topic);
}
