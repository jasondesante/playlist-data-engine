/**
 * Metadata extraction with priority queue logic
 * Based on specs/001-core-engine/SPEC.md
 */

export class MetadataExtractor {
    /**
     * Extract primary (compressed) audio URL with priority:
     * 1. mp3_url (Standard web audio - preferred)
     * 2. lossy_audio (Compressed)
     * 3. audio_url (Explicit audio field)
     * 4. audio (Bare audio field — some platforms use this instead of audio_url)
     * 5. lossless_audio (High fidelity - larger files)
     * 6. animation_url (OpenSea standard - often audio, but could be video)
     * 7. multimedia_url (Alternative media field)
     */
    static extractAudioUrl(data: Record<string, unknown>): string | null {
        const compressedPriorities = ['mp3_url', 'lossy_audio', 'audio_url', 'lossless_audio', 'animation_url', 'audio', 'multimedia_url', "losslessAudio"];

        for (const key of compressedPriorities) {
            if (data[key] && typeof data[key] === 'string') {
                return data[key];
            }
        }

        return null;
    }

    /**
     * Extract optional lossless audio URL (uncompressed/high-fidelity source).
     * Returns a lossless URL only if it differs from the primary audio URL.
     * Priority: lossless_audio > animation_url (only if it looks like a lossless format)
     */
    static extractAudioUrlLossless(data: Record<string, unknown>): string | null {
        const losslessPriorities = ['audio_url', 'lossless_audio', 'wav_url', 'flac_url', "losslessAudio"];

        for (const key of losslessPriorities) {
            if (data[key] && typeof data[key] === 'string') {
                return data[key];
            }
        }

        return null;
    }

    /**
     * Extract image URL with priority:
     *
     * Flat fields:
     * 1. image_small (Preferred for performance)
     * 2. image (Standard)
     * 3. image_url (Explicit image URL variant)
     * 4. image_large (Fallback)
     * 5. image_uri (URI variant)
     * 6. image_preview (Preview variant)
     * 7. image_thumb (Last resort)
     *
     * Nested object fields (checked if no flat match found):
     * 8. artwork.uri (Nina Protocol structured artwork)
     * 9. project.artwork.uri (Project-level artwork)
     * 10. primaryMedia.uri (Primary media field)
     */
    static extractImageUrl(data: Record<string, unknown>): string | null {
        const priorities = ['image_small', 'image', 'image_large', 'image_thumb', 'image_url', 'image_uri', 'image_preview'];

        for (const key of priorities) {
            if (data[key] && typeof data[key] === 'string') {
                return data[key];
            }
        }

        // Nested object fields — checked after flat fields
        const nestedUris = [
            this.extractNestedUri(data, 'artwork', 'uri'),
            this.extractNestedUri(data, 'project', 'artwork', 'uri'),
            this.extractNestedUri(data, 'primaryMedia', 'uri'),
        ];
        for (const uri of nestedUris) {
            if (uri) return uri;
        }

        return null;
    }

    /**
     * Extract thumbnail image URL directly from image_thumb fields.
     * Unlike extractImageUrl, this specifically targets thumbnail fields only.
     * Priority: image_thumb_url > image_thumb
     */
    static extractImageThumbUrl(data: Record<string, unknown>): string | null {
        // Check image_thumb_url first (preferred)
        if (data.image_thumb_url && typeof data.image_thumb_url === 'string') {
            return data.image_thumb_url;
        }

        // Fall back to image_thumb
        if (data.image_thumb && typeof data.image_thumb === 'string') {
            return data.image_thumb;
        }

        return null;
    }

    /**
     * Extract name/title with priority (see specs/001-core-engine/SPEC.md):
     * 1. name
     * 2. title
     */
    static extractTitle(data: Record<string, unknown>): string | null {
        if (data.name && typeof data.name === 'string') {
            return data.name;
        }
        if (data.title && typeof data.title === 'string') {
            return data.title;
        }
        return null;
    }

    /**
     * Extract artist with priority (see specs/001-core-engine/SPEC.md):
     * 1. artist
     * 2. created_by
     * 3. minter
     * 4. OpenSea-style attributes array with trait_type "Artist"
     */
    static extractArtist(data: Record<string, unknown>): string | null {
        const priorities = ['artist', 'created_by', 'minter'];

        for (const key of priorities) {
            if (data[key] && typeof data[key] === 'string') {
                return data[key] as string;
            }
        }

        if (Array.isArray(data.attributes)) {
            const artistAttr = data.attributes.find(
                (attr: { trait_type?: string; value?: unknown }) =>
                    attr.trait_type?.toLowerCase() === 'artist' && attr.value !== undefined
            );
            if (artistAttr && typeof artistAttr.value === 'string') {
                return artistAttr.value;
            }
        }

        return null;
    }

    /**
     * Parse metadata string to JSON object
     * Handles stringified JSON with error handling
     */
    static parseMetadata(metadata: unknown): Record<string, unknown> | null {
        if (!metadata) {
            return null;
        }

        // Already an object
        if (typeof metadata === 'object' && !Array.isArray(metadata)) {
            return metadata as Record<string, unknown>;
        }

        // Try to parse stringified JSON
        if (typeof metadata === 'string') {
            try {
                const parsed = JSON.parse(metadata);
                if (typeof parsed === 'object' && !Array.isArray(parsed)) {
                    return parsed;
                }
            } catch (error) {
                console.warn('Failed to parse metadata:', error);
                return null;
            }
        }

        return null;
    }

    /**
     * Extract genre with support for string or array formats
     * - If genre is a string, returns it directly
     * - If genre is an array, returns the first element
     * - Also checks OpenSea attributes array for "Genre" trait_type
     */
    static extractGenre(data: Record<string, unknown>): string {
        // Check direct genre field first
        if (typeof data.genre === 'string') {
            return data.genre;
        }

        // Handle array of genres - take first one as primary
        if (Array.isArray(data.genre) && data.genre.length > 0) {
            const firstGenre = data.genre[0];
            return typeof firstGenre === 'string' ? firstGenre : '';
        }

        // Check OpenSea-style attributes for Genre trait
        if (Array.isArray(data.attributes)) {
            const genreAttr = data.attributes.find(
                (attr: { trait_type?: string; value?: unknown }) =>
                    attr.trait_type?.toLowerCase() === 'genre' && attr.value !== undefined
            );
            if (genreAttr) {
                if (typeof genreAttr.value === 'string') {
                    return genreAttr.value;
                }
                if (Array.isArray(genreAttr.value) && genreAttr.value.length > 0) {
                    const firstGenre = genreAttr.value[0];
                    return typeof firstGenre === 'string' ? firstGenre : '';
                }
            }
        }

        return '';
    }

    /**
     * Convert OpenSea-style attributes array to key-value object
     * Example: [{ trait_type: "BPM", value: 120 }] => { BPM: 120 }
     */
    static convertAttributes(attributes: unknown): Record<string, string | number> | null {
        if (!Array.isArray(attributes)) {
            return null;
        }

        const result: Record<string, string | number> = {};
        for (const attr of attributes) {
            if (attr.trait_type && attr.value !== undefined) {
                result[attr.trait_type] = attr.value;
            }
        }

        return Object.keys(result).length > 0 ? result : null;
    }

    /**
     * Safely extract a URI string from a nested object path.
     * e.g. extractNestedUri(data, 'project', 'artwork', 'uri') => data.project.artwork.uri
     */
    private static extractNestedUri(data: Record<string, unknown>, ...path: string[]): string | null {
        let current: unknown = data;
        for (const key of path) {
            if (current && typeof current === 'object' && !Array.isArray(current)) {
                current = (current as Record<string, unknown>)[key];
            } else {
                return null;
            }
        }
        return typeof current === 'string' ? current : null;
    }
}
