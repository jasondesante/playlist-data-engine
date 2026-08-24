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
        const compressedPriorities = ['mp3_url', 'mp3Url', 'lossy_audio', 'lossyAudio', 'animation_url', 'animationUrl', 'audio_url', 'audioUrl', 'lossless_audio', 'losslessAudio', 'audio', 'multimedia_url', 'multimediaUrl'];

        for (const key of compressedPriorities) {
            if (data[key] && typeof data[key] === 'string') {
                return data[key];
            }
        }

        return null;
    }

    /**
     * Extract the highest-fidelity audio URL the track offers — best
     * available, not a guarantee. A track whose only source is an mp3 gets
     * that back rather than null.
     */
    static extractAudioUrlLossless(data: Record<string, unknown>): string | null {
        const losslessPriorities = ['lossless_audio', 'losslessAudio', 'wav_url', 'wavUrl', 'flac_url', 'flacUrl', 'audio_url', 'audioUrl'];

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
        const priorities = ['image_small', 'imageSmall', 'image', 'image_large', 'imageLarge', 'image_thumb', 'imageThumb', 'image_url', 'imageUrl', 'image_uri', 'imageUri', 'image_preview', 'imagePreview'];

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
        const priorities = ['artist', 'artist_name', 'artistName', 'album_artist', 'albumArtist', 'created_by', 'createdBy', 'minter'];

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
     * Extract genre with support for string or array formats.
     * Sources are checked in priority order; first non-empty wins:
     * - `genre` field as a string
     * - `genre` field as an array (first element)
     * - OpenSea `attributes` array with `trait_type` of "genre" (case-insensitive)
     * - `attributes` as an object keyed by trait name (e.g. `attributes.Genre`)
     * - malformed `attribute ` key (literal trailing space) with `.genre`
     * Stays strict: only fields literally named "genre" are considered
     * (no fallback to `category` or similar).
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

        // Check object-keyed attributes (e.g. { attributes: { Genre: "House" } })
        if (data.attributes && typeof data.attributes === 'object' && !Array.isArray(data.attributes)) {
            const attrs = data.attributes as Record<string, unknown>;
            for (const key of Object.keys(attrs)) {
                if (key.toLowerCase() === 'genre' && typeof attrs[key] === 'string') {
                    return attrs[key] as string;
                }
            }
        }

        // Check malformed "attribute " key (literal trailing space) present in production data
        const malformed = data['attribute '];
        if (malformed && typeof malformed === 'object' && !Array.isArray(malformed)) {
            const genreField = (malformed as Record<string, unknown>).genre;
            if (typeof genreField === 'string') {
                return genreField;
            }
        }

        return '';
    }

    /**
     * Extract tags from track metadata, normalized to a deduped,
     * lowercased, trimmed string[] with empties removed.
     * Sources (concatenated, then deduped):
     * - `tags` field as an array, or a single comma-separated string
     * - `properties.tags` array (when `properties` is an object)
     * - OpenSea `attributes` array with `trait_type` of "tag"/"tags" (case-insensitive)
     * - `attributes` as an object keyed by trait name (e.g. `attributes.Tags`)
     */
    static extractTags(data: Record<string, unknown>): string[] {
        const collected: unknown[] = [];

        // 1. Direct tags field (array or comma-separated string)
        if (Array.isArray(data.tags)) {
            collected.push(...data.tags);
        } else if (typeof data.tags === 'string') {
            collected.push(...data.tags.split(','));
        }

        // 2. properties.tags
        if (data.properties && typeof data.properties === 'object' && !Array.isArray(data.properties)) {
            const propsTags = (data.properties as Record<string, unknown>).tags;
            if (Array.isArray(propsTags)) {
                collected.push(...propsTags);
            } else if (typeof propsTags === 'string') {
                collected.push(...propsTags.split(','));
            }
        }

        // 3. attributes (array and object forms)
        if (Array.isArray(data.attributes)) {
            for (const attr of data.attributes) {
                if (!attr || typeof attr !== 'object') continue;
                const traitType = (attr as { trait_type?: unknown }).trait_type;
                if (typeof traitType === 'string' && traitType.toLowerCase().match(/^tags?$/)) {
                    const value = (attr as { value?: unknown }).value;
                    if (Array.isArray(value)) {
                        collected.push(...value);
                    } else if (typeof value === 'string') {
                        collected.push(...value.split(','));
                    }
                }
            }
        } else if (data.attributes && typeof data.attributes === 'object') {
            const attrs = data.attributes as Record<string, unknown>;
            for (const key of Object.keys(attrs)) {
                if (key.toLowerCase().match(/^tags?$/)) {
                    const value = attrs[key];
                    if (Array.isArray(value)) {
                        collected.push(...value);
                    } else if (typeof value === 'string') {
                        collected.push(...value.split(','));
                    }
                }
            }
        }

        return MetadataExtractor.normalizeTags(collected);
    }

    /**
     * Normalize a list of raw tag values into a deduped, lowercased,
     * trimmed string[] with empties removed.
     */
    private static normalizeTags(values: unknown[]): string[] {
        const set = new Set<string>();
        for (const v of values) {
            if (v === null || v === undefined) continue;
            const s = String(v).trim().toLowerCase();
            if (s) set.add(s);
        }
        return Array.from(set);
    }


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
