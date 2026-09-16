import { describe, it, expect } from 'vitest';
import { MetadataExtractor } from '../../../src/core/parser/MetadataExtractor';

describe('MetadataExtractor.extractDescription', () => {
    it('returns the canonical flat description', () => {
        expect(MetadataExtractor.extractDescription({ description: 'A thick tune' })).toBe('A thick tune');
    });

    it('walks the flat priority queue', () => {
        expect(MetadataExtractor.extractDescription({ track_description: 'scoped' })).toBe('scoped');
        expect(MetadataExtractor.extractDescription({ trackDescription: 'camel' })).toBe('camel');
        expect(MetadataExtractor.extractDescription({ description_text: 'text' })).toBe('text');
        expect(MetadataExtractor.extractDescription({ desc: 'short' })).toBe('short');
        expect(MetadataExtractor.extractDescription({ blurb: 'blurby' })).toBe('blurby');
    });

    it('prefers description over lower-priority variants', () => {
        expect(MetadataExtractor.extractDescription({ description: 'canonical', desc: 'short' })).toBe('canonical');
    });

    it('skips empty strings and non-strings', () => {
        expect(MetadataExtractor.extractDescription({ description: '', desc: 'fallback' })).toBe('fallback');
        expect(MetadataExtractor.extractDescription({ description: 42, desc: 'fallback' })).toBe('fallback');
    });

    it('reads an OpenSea-style attributes trait', () => {
        const data = {
            attributes: [
                { trait_type: 'Artist', value: 'Someone' },
                { trait_type: 'DESCRIPTION', value: 'from attributes' },
            ],
        };
        expect(MetadataExtractor.extractDescription(data)).toBe('from attributes');
    });

    it('deep-searches nested objects (e.g. properties.description)', () => {
        expect(
            MetadataExtractor.extractDescription({ properties: { description: 'nested' } })
        ).toBe('nested');
    });

    it('prefers shallow matches over deeper ones', () => {
        expect(
            MetadataExtractor.extractDescription({
                outer: { description: 'shallow-ish' },
                deep: { deeper: { description: 'deepest' } },
            })
        ).toBe('shallow-ish');
    });

    it('does not descend into arrays (array items carry their own scoped text)', () => {
        expect(
            MetadataExtractor.extractDescription({ mixes: [{ name: 'Night Mix', description: 'mix blurb' }] })
        ).toBeNull();
    });

    it('returns null when nothing matches', () => {
        expect(MetadataExtractor.extractDescription({ title: 'nope' })).toBeNull();
    });
});

describe('MetadataExtractor.extractAlbumDescription', () => {
    it('reads flat album_description variants', () => {
        expect(MetadataExtractor.extractAlbumDescription({ album_description: 'LP notes' })).toBe('LP notes');
        expect(MetadataExtractor.extractAlbumDescription({ albumDescription: 'LP camel' })).toBe('LP camel');
    });

    it('searches inside an album object', () => {
        expect(MetadataExtractor.extractAlbumDescription({ album: { description: 'about the record' } })).toBe('about the record');
        expect(MetadataExtractor.extractAlbumDescription({ album: { liner_notes: 'liner' } })).toBe('liner');
        expect(MetadataExtractor.extractAlbumDescription({ album: { notes: 'notes' } })).toBe('notes');
    });

    it('ignores an album that is a plain name string (the common case)', () => {
        expect(MetadataExtractor.extractAlbumDescription({ album: 'Night Moves' })).toBeNull();
    });

    it('never picks up the track description', () => {
        expect(MetadataExtractor.extractAlbumDescription({ description: 'track text' })).toBeNull();
    });
});

describe('MetadataExtractor.extractArtistDescription', () => {
    it('reads flat artist_description and bio variants', () => {
        expect(MetadataExtractor.extractArtistDescription({ artist_description: 'bio text' })).toBe('bio text');
        expect(MetadataExtractor.extractArtistDescription({ artistDescription: 'camel text' })).toBe('camel text');
        expect(MetadataExtractor.extractArtistDescription({ artist_bio: 'bio' })).toBe('bio');
        expect(MetadataExtractor.extractArtistDescription({ artistBio: 'camel bio' })).toBe('camel bio');
    });

    it('searches inside an artist object', () => {
        expect(MetadataExtractor.extractArtistDescription({ artist: { description: 'desc' } })).toBe('desc');
        expect(MetadataExtractor.extractArtistDescription({ artist: { bio: 'bio' } })).toBe('bio');
        expect(MetadataExtractor.extractArtistDescription({ artist: { about: 'about' } })).toBe('about');
    });

    it('ignores an artist that is a plain name string (the common case)', () => {
        expect(MetadataExtractor.extractArtistDescription({ artist: 'Night Moves' })).toBeNull();
    });

    it('never picks up the track description', () => {
        expect(MetadataExtractor.extractArtistDescription({ description: 'track text' })).toBeNull();
    });
});
