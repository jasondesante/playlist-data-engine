#!/usr/bin/env node
/**
 * Docs archiver — uploads docs/ to Arweave via Turbo (@ar.io/sdk) so every
 * docs version has a permanent, timestamped home. appends-to ENGINE_DOC_ARCHIVE
 * in src/utils/engineDocs.ts is manual: this script prints the paste-ready
 * entry when it finishes.
 *
 * Usage:
 *   node scripts/upload-docs.cjs <wallet.json>          # dry run: lists files, estimates cost
 *   node scripts/upload-docs.cjs <wallet.json> --yes    # actually uploads (spends credits)
 */
const fs = require('node:fs');
const path = require('node:path');
const { TurboFactory, ArweaveSigner } = require('@ar.io/sdk');

const ROOT = path.join(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'docs');
const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;

function collect(dir, prefix = '') {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) out.push(...collect(path.join(dir, entry.name), rel));
        else if (entry.name.endsWith('.md')) out.push(rel);
    }
    return out.sort();
}

async function main() {
    const [walletPath, ...flags] = process.argv.slice(2);
    const yes = flags.includes('--yes');
    if (!walletPath) {
        console.error('Usage: node scripts/upload-docs.cjs <wallet.json> [--yes]');
        process.exit(1);
    }
    const jwk = JSON.parse(fs.readFileSync(path.resolve(walletPath), 'utf8'));

    const files = collect(DOCS_DIR);
    const totalBytes = files.reduce((n, f) => n + fs.statSync(path.join(DOCS_DIR, f)).size, 0);
    const uploadedAt = new Date().toISOString();

    console.log(`playlist-data-engine docs → Arweave`);
    console.log(`  version:     ${VERSION}`);
    console.log(`  files:       ${files.length} (${(totalBytes / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`  wallet:      ${path.resolve(walletPath)}`);
    console.log(`  mode:        ${yes ? 'UPLOAD (--yes)' : 'dry run — re-run with --yes to spend credits'}`);

    const turbo = TurboFactory.init({ signer: new ArweaveSigner(jwk) });

    try {
        const [cost] = await turbo.getUploadCosts({ bytes: [totalBytes] });
        if (cost?.winc) {
            console.log(`  est. cost:   ${Number(cost.winc).toLocaleString()} winc (~${(Number(cost.winc) / 1e12).toFixed(6)} AR)`);
        }
    } catch {
        console.log('  est. cost:   (unavailable — proceeding)');
    }

    if (!yes) {
        console.log('\nFiles that would be uploaded:');
        for (const f of files) console.log(`  docs/${f}`);
        process.exit(0);
    }

    console.log('\nUploading…');
    const uploaded = {};
    for (const rel of files) {
        const filePath = path.join(DOCS_DIR, rel);
        try {
            const res = await turbo.uploadFile({
                filePath,
                dataItemStreamFactory: () => fs.createReadStream(filePath),
                dataItemOpts: {
                    contentType: 'text/markdown; charset=utf-8',
                    tags: [
                        { name: 'App-Name', value: 'playlist-data-engine-docs' },
                        { name: 'Engine-Version', value: VERSION },
                        { name: 'Doc-File', value: rel },
                        { name: 'Uploaded-At', value: uploadedAt },
                    ],
                },
            });
            uploaded[rel] = res.id;
            console.log(`  ✓ docs/${rel} → ${res.id}`);
        } catch (err) {
            console.error(`  ✗ docs/${rel}: ${err.message || err}`);
            console.error('\nStopped — earlier uploads are already permanent; fix the error and re-run.');
            process.exit(1);
        }
    }

    console.log(`\nAll ${Object.keys(uploaded).length} docs archived. Paste into ENGINE_DOC_ARCHIVE in src/utils/engineDocs.ts:\n`);
    console.log(`{
    version: '${VERSION}',
    uploadedAt: '${uploadedAt}',
    files: {`);
    for (const [rel, id] of Object.entries(uploaded)) {
        console.log(`        '${rel}': '${id}',`);
    }
    console.log(`    },
},`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
