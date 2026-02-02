/**
 * Metadata extraction with priority queue logic
 * Based on specs/001-core-engine/SPEC.md
 */

export class MetadataExtractor {
    /**
     * Extract audio URL with priority (see specs/001-core-engine/SPEC.md):
     * 1. mp3_url (Standard web audio - preferred)
     * 2. lossy_audio (Compressed)
     * 3. audio_url (Explicit audio field)
     * 4. lossless_audio (High fidelity - larger files)
     * 5. animation_url (OpenSea standard - often audio, but could be video)
     */
    static extractAudioUrl(data: Record<string, unknown>): string | null {
        const priorities = ['mp3_url', 'lossy_audio', 'audio_url', 'lossless_audio', 'animation_url'];

        for (const key of priorities) {
            if (data[key] && typeof data[key] === 'string') {
                return data[key];
            }
        }

        return null;
    }

    /**
     * Extract image URL with priority (see specs/001-core-engine/SPEC.md):
     * 1. image_small (Preferred for performance)
     * 2. image (Standard)
     * 3. image_large (Fallback)
     * 4. image_thumb (Last resort)
     */
    static extractImageUrl(data: Record<string, unknown>): string | null {
        const priorities = ['image_small', 'image', 'image_large', 'image_thumb'];

        for (const key of priorities) {
            if (data[key] && typeof data[key] === 'string') {
                return data[key];
            }
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
     */
    static extractArtist(data: Record<string, unknown>): string | null {
        const priorities = ['artist', 'created_by', 'minter'];

        for (const key of priorities) {
            if (data[key] && typeof data[key] === 'string') {
                return data[key];
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
}
