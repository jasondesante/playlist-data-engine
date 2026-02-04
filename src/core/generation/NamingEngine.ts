import type { PlaylistTrack } from '../types/Playlist';
import type { AudioProfile } from '../types/AudioProfile';
import { ADJECTIVE_DATA } from '../../utils/constants';
import { SeededRNG } from '../../utils/random';

/**
 * Generate RPG-style character names from track metadata
 *
 * Combines track title, artist, and genre with audio characteristics to create
 * unique fantasy-inspired character names using three random formats:
 * - 50% Class Title (e.g., "Sonic Bard")
 * - 30% Adjective Construct (e.g., "Midnight Echoes")
 * - 20% Clan Construct (e.g., "Harmonix Collective")
 */
export class NamingEngine {
    /**
     * Generate a unique RPG-style character name from track metadata
     *
     * Creates fantasy-inspired character names by combining:
     * - Track title/artist with cleaning (removes "Official Video", "Remix", etc.)
     * - Genre classification
     * - Audio profile characteristics
     * - Randomized format selection
     *
     * Format distribution:
     * - 50% "Class Title" format (e.g., "Sonic Bard", "Thumping Mage")
     * - 30% "Adjective Construct" format (e.g., "Midnight City", "Electric Dreams")
     * - 20% "Clan Construct" format (e.g., "Harmonix Collective", "Bass Synth")
     *
     * @param {PlaylistTrack} track - Track with title, artist, genre metadata
     * @param {AudioProfile} audioProfile - Audio frequency characteristics
     * @param {boolean} deterministic - If true, same track always produces same name. Default: false (random variation each time)
     * @returns {string} Generated RPG-style character name (20-50 characters)
     *
     * @example
     * // Non-deterministic (default) - slightly different each time
     * const name1 = namingEngine.generateName(track, audioProfile);
     * const name2 = namingEngine.generateName(track, audioProfile);
     * console.log(name1);  // e.g., "Midnight Synth"
     * console.log(name2);  // e.g., "Electric Dreams of The Band" (different!)
     *
     * @example
     * // Deterministic mode - same track always produces same name
     * const name = namingEngine.generateName(track, audioProfile, true);
     * console.log(name);  // Always: "Midnight Synth" for this track
     */
    public generateName(track: PlaylistTrack, audioProfile: AudioProfile, deterministic: boolean = false): string {
        const cleanTitle = this.cleanTitle(track.title);

        // Generate seed: deterministic uses track.uuid, non-deterministic adds timestamp + random
        const seed = deterministic
            ? track.uuid
            : `${track.uuid}-${Date.now()}-${Math.random()}`;

        const rng = new SeededRNG(seed);
        const format = this.selectFormat(rng);

        switch (format) {
            case 'class_title':
                return this.formatClassTitle(cleanTitle, track.genre);
            case 'adjective_construct':
                return this.formatAdjectiveConstruct(cleanTitle, track.genre, audioProfile);
            case 'clan_construct':
                return this.formatClanConstruct(cleanTitle, track.artist);
            default:
                return cleanTitle;
        }
    }

    /**
     * Clean track title by removing metadata and noise
     *
     * Removes common metadata suffixes and prefixes:
     * - Removes "(Official Video)", "[Remix]", "[feat. Artist]", etc.
     * - Removes leading track numbers like "01 - " or "1. "
     * - Removes audio file extensions (.mp3, .wav, .flac, etc.)
     *
     * @param {string} title - Raw track title
     * @returns {string} Cleaned title suitable for character naming
     *
     * @example
     * namingEngine.cleanTitle("01 - Midnight Dreams (Official Video)");
     * // Returns: "Midnight Dreams"
     */
    public cleanTitle(title: string): string {
        let clean = title;

        // Remove brackets and parentheses content if it looks like metadata
        clean = clean.replace(/\s*[([].*?(video|official|remix|mix|edit|feat|ft\.|version|remaster).*?[)\]]/gi, '');

        // Remove leading track numbers (e.g. "01 - ", "1. ")
        clean = clean.replace(/^\s*\d+[\s.-]+/, '');

        // Remove file extensions
        clean = clean.replace(/\.(mp3|wav|flac|m4a)$/i, '');

        return clean.trim();
    }

    private selectFormat(rng: SeededRNG): 'class_title' | 'adjective_construct' | 'clan_construct' {
        // Weighted random selection: 50% Class Title, 30% Adjective, 20% Clan
        const rand = rng.random();

        if (rand < 0.5) return 'class_title';
        if (rand < 0.8) return 'adjective_construct';
        return 'clan_construct';
    }

    private formatClassTitle(core: string, genre: string): string {
        // [Core] the [Class]
        // Class is derived from genre or random?
        // Let's map genre to a "Class" title or use a generic one.
        // For now, I'll use a simple mapping or just "Bard" if unknown.
        // Actually, maybe we can use the "Class" from D&D classes?
        // Let's use a simple mapping for now.

        const genreLower = genre.toLowerCase();
        let className = 'Bard';

        if (genreLower.includes('rock') || genreLower.includes('metal')) className = 'Barbarian';
        else if (genreLower.includes('techno') || genreLower.includes('electronic')) className = 'Artificer';
        else if (genreLower.includes('ambient') || genreLower.includes('classical')) className = 'Wizard';
        else if (genreLower.includes('rap') || genreLower.includes('hip hop')) className = 'Rogue';
        else if (genreLower.includes('pop')) className = 'Sorcerer';
        else if (genreLower.includes('jazz')) className = 'Monk';
        else if (genreLower.includes('folk')) className = 'Druid';

        return `${core} the ${className}`;
    }

    private formatAdjectiveConstruct(core: string, genre: string, audio: AudioProfile): string {
        // [Adjective] [Core]
        const genreKey = this.findGenreKey(genre);
        const adjectives = ADJECTIVE_DATA[genreKey] || ADJECTIVE_DATA['default'];

        let adjective = adjectives.mid; // Default

        // Determine dominant feature
        if (audio.average_amplitude < 0.3) {
            adjective = adjectives.quiet;
        } else if (audio.average_amplitude > 0.8) {
            adjective = adjectives.loud;
        } else if (audio.bass_dominance > 0.6) {
            adjective = adjectives.bass;
        } else if (audio.treble_dominance > 0.6) {
            adjective = adjectives.treble;
        }

        return `${adjective} ${core}`;
    }

    private formatClanConstruct(core: string, artist: string): string {
        // [Core] of [Artist]
        return `${core} of ${artist}`;
    }

    private findGenreKey(genre: string): string {
        const lower = genre.toLowerCase();
        for (const key of Object.keys(ADJECTIVE_DATA)) {
            if (lower.includes(key)) return key;
        }
        return 'default';
    }
}
