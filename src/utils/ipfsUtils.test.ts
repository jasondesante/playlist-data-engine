/**
 * Tests for the IPFS URL utilities — focused on the embedded-CID shape
 * (Cloudinary-style CDN paths like /video/upload/ipfs_audio/{cid}) and
 * the strictness guards that keep ordinary URLs from matching it.
 */
import { describe, expect, it } from 'vitest';
import { extractIPFSPath, isIPFS, resolveIPFSLink } from './ipfsUtils.js';

// A real CID from a real (now-dead) Spinamp content URL.
const SPINAMP_CID = 'QmfX6sKmbVDFrpatmnBDQR2j4ALZhFriJSywRTf8ue8bzY';
const SPINAMP_URL = `https://content.spinamp.xyz/video/upload/ipfs_audio/${SPINAMP_CID}`;

describe('isIPFS — embedded CID after an ipfs_* segment', () => {
    it('recognizes the dead Spinamp content CDN shape', () => {
        expect(isIPFS(SPINAMP_URL)).toBe(true);
    });

    it('recognizes ipfs_image and ipfs_video segment variants on any host', () => {
        expect(isIPFS(`https://res.example.com/image/upload/ipfs_image/${SPINAMP_CID}`)).toBe(true);
        expect(isIPFS(`https://cdn.foo/video/upload/ipfs_video/${SPINAMP_CID}`)).toBe(true);
    });

    it('accepts CIDv1 (base32) CIDs', () => {
        expect(isIPFS(`https://cdn.foo/ipfs_audio/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi`)).toBe(true);
    });

    it('rejects a non-CID tail after the segment', () => {
        expect(isIPFS('https://cdn.foo/video/upload/ipfs_audio/not-a-cid')).toBe(false);
        expect(isIPFS('https://cdn.foo/video/upload/ipfs_audio/12345')).toBe(false);
    });

    it('rejects ordinary URLs without the segment', () => {
        expect(isIPFS('https://content.spinamp.xyz/video/upload/QmfX6sKmbVDFrpatmnBDQR2j4ALZhFriJSywRTf8ue8bzY')).toBe(false);
        expect(isIPFS('https://example.com/image.png')).toBe(false);
    });

    it('rejects a CID with no ipfs_* segment before it', () => {
        expect(isIPFS(`https://cdn.foo/${SPINAMP_CID}`)).toBe(false);
    });

    it('still handles the existing shapes', () => {
        expect(isIPFS('ipfs://QmXxx')).toBe(true);
        expect(isIPFS('https://ipfs.io/ipfs/QmXxx')).toBe(true);
        expect(isIPFS('https://QmXxx.ipfs.dweb.link')).toBe(true);
        expect(isIPFS(undefined)).toBe(false);
    });
});

describe('extractIPFSPath — embedded CID', () => {
    it('returns the bare CID for the Spinamp shape', () => {
        expect(extractIPFSPath(SPINAMP_URL)).toBe(SPINAMP_CID);
    });

    it('preserves a subpath after the CID', () => {
        expect(extractIPFSPath(`https://cdn.foo/ipfs_audio/${SPINAMP_CID}/file.mp3`)).toBe(`${SPINAMP_CID}/file.mp3`);
    });

    it('returns null for lookalike paths without a valid CID', () => {
        expect(extractIPFSPath('https://cdn.foo/video/upload/ipfs_audio/nope')).toBeNull();
    });
});

describe('resolveIPFSLink — embedded CID recovery', () => {
    it('rebuilds a dead-CDN URL onto the target gateway', () => {
        expect(resolveIPFSLink(SPINAMP_URL, 'gateway.pinata.cloud'))
            .toBe(`https://gateway.pinata.cloud/ipfs/${SPINAMP_CID}`);
    });

    it('leaves ordinary URLs untouched', () => {
        expect(resolveIPFSLink('https://example.com/file.png')).toBe('https://example.com/file.png');
    });
});
