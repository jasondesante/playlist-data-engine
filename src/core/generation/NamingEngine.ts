import type { PlaylistTrack } from '../types/Playlist';
import type { AudioProfile } from '../types/AudioProfile';
import type { Class } from '../types/Character';
import { NAMING_DATA } from '../../utils/constants';
import { SeededRNG } from '../../utils/random';

/**
 * Naming format types
 */
type NameFormat =
    | 'class_title'
    | 'adjective_construct'
    | 'clan_construct'
    | 'descriptive_epithet'
    | 'compound_adjective'
    | 'artist_inspired'
    | 'mononym_subtitle';

/**
 * Generate RPG-style character names from track metadata and character class
 *
 * Combines track title, artist, and genre with audio characteristics and actual
 * character class to create unique fantasy-inspired character names using seven
 * random formats with weighted distribution (20-20-10-20-15-10-5):
 * - 20% Class Title (e.g., "Midnight Dreams the Wizard")
 * - 20% Adjective Construct (e.g., "Hypnotic Midnight Dreams")
 * - 10% Clan Construct (e.g., "Midnight Dreams of Daft Punk")
 * - 20% Descriptive Epithet (e.g., "Midnight Dreams, the Swift Sage")
 * - 15% Compound Adjective (e.g., "Thunder-Blessed Midnight Dreams")
 * - 10% Artist-Inspired (e.g., "Daftsmith of the Crystal Spire")
 * - 5% Mononym Subtitle (e.g., "Midnight [Dreams Eternal]")
 *
 * Key design principle: Audio characteristics provide LIGHT influence (~50%) on name
 * generation, with random selection equally important (~50%). All adjective categories
 * are always considered - audio just provides weight boosts, not hard selection rules.
 */
export class NamingEngine {
    /**
     * Generate a unique RPG-style character name from track metadata and character class
     *
     * Creates fantasy-inspired character names by combining:
     * - Track title/artist with cleaning (removes "Official Video", "Remix", etc.)
     * - Genre classification
     * - Audio profile characteristics (light influence via weights)
     * - Actual character class (not genre-guessed)
     * - Randomized format and word selection
     *
     * @param {string} seed - Seed for random generation (provided by CharacterGenerator)
     * @param {PlaylistTrack} track - Track with title, artist, genre metadata
     * @param {AudioProfile} audioProfile - Audio frequency characteristics
     * @param {Class} characterClass - Actual D&D character class
     * @param {boolean} deterministic - If true, same seed always produces same name. Default: false (adds timestamp/random variation)
     * @returns {string} Generated RPG-style character name
     *
     * @example
     * // Non-deterministic (default) - slightly different each time
     * const name1 = namingEngine.generateName(seed, track, audioProfile, 'Wizard');
     * const name2 = namingEngine.generateName(seed, track, audioProfile, 'Wizard');
     * // name1 might be "Midnight Dreams the Wizard"
     * // name2 might be "Hypnotic Midnight Dreams" (different format!)
     *
     * @example
     * // Deterministic mode - same seed always produces same name
     * const name = namingEngine.generateName(seed, track, audioProfile, 'Wizard', true);
     * // Always same result for this seed
     */
    public generateName(
        seed: string,
        track: PlaylistTrack,
        audioProfile: AudioProfile,
        characterClass: Class,
        deterministic: boolean = false
    ): string {
        const cleanTitle = this.cleanTitle(track.title);

        // Create RNG from seed + optional variation
        const rngSeed = deterministic
            ? seed
            : `${seed}-${Date.now()}-${Math.random()}`;

        const rng = new SeededRNG(rngSeed);

        // Select format using RNG
        const format = this.selectFormat(rng);

        // All format methods now accept rng parameter for randomized word selection
        switch (format) {
            case 'class_title':
                return this.formatClassTitle(cleanTitle, characterClass, rng);
            case 'adjective_construct':
                return this.formatAdjectiveConstruct(cleanTitle, track.genre, audioProfile, rng);
            case 'clan_construct':
                return this.formatClanConstruct(cleanTitle, track.artist, rng);
            case 'descriptive_epithet':
                return this.formatDescriptiveEpithet(cleanTitle, characterClass, audioProfile, rng);
            case 'compound_adjective':
                return this.formatCompoundAdjective(cleanTitle, track.genre, audioProfile, rng);
            case 'artist_inspired':
                return this.formatArtistInspired(cleanTitle, track.artist, characterClass, rng);
            case 'mononym_subtitle':
                return this.formatMononymSubtitle(cleanTitle, audioProfile, track.genre, rng);
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

    /**
     * Select naming format using weighted random selection
     * Distribution: 20-20-10-20-15-10-5
     */
    private selectFormat(rng: SeededRNG): NameFormat {
        const rand = rng.random();

        if (rand < 0.20) return 'class_title';
        if (rand < 0.40) return 'adjective_construct';
        if (rand < 0.50) return 'clan_construct';
        if (rand < 0.70) return 'descriptive_epithet';
        if (rand < 0.85) return 'compound_adjective';
        if (rand < 0.95) return 'artist_inspired';
        return 'mononym_subtitle';
    }

    /**
     * Format 1: Class Title
     * Pattern: "{title} the {class}"
     * Uses actual character class instead of genre-guessing
     *
     * @example "Midnight Dreams the Wizard"
     */
    private formatClassTitle(core: string, characterClass: Class, _rng: SeededRNG): string {
        return `${core} the ${characterClass}`;
    }

    /**
     * Format 2: Adjective Construct
     * Pattern: "{adjective} {title}"
     * Uses RNG-based selection with balanced audio/random weights
     *
     * @example "Hypnotic Midnight Dreams"
     */
    private formatAdjectiveConstruct(
        core: string,
        genre: string,
        audio: AudioProfile,
        rng: SeededRNG
    ): string {
        const genreKey = this.findGenreKey(genre);
        const adjectives = NAMING_DATA.adjectives[genreKey as keyof typeof NAMING_DATA.adjectives] || NAMING_DATA.adjectives['default'];

        // 50% audio influence, 50% random influence
        const weights = this.calculateBalancedAdjectiveWeights(audio);
        const category = rng.weightedChoice(weights);

        // Pick random adjective from selected category
        const adjectiveList = adjectives[category as keyof typeof adjectives];
        const adjective = rng.randomChoice(adjectiveList);

        return `${adjective} ${core}`;
    }

    /**
     * Format 3: Clan Construct
     * Pattern: "{title} of {artist}"
     *
     * @example "Midnight Dreams of Daft Punk"
     */
    private formatClanConstruct(core: string, artist: string, _rng: SeededRNG): string {
        return `${core} of ${artist}`;
    }

    /**
     * Format 4: Descriptive Epithet
     * Pattern: "{title}, the {descriptor} {class_aspect}"
     *
     * @example "Midnight Dreams, the Swift Sage"
     */
    private formatDescriptiveEpithet(
        core: string,
        characterClass: Class,
        _audio: AudioProfile,
        rng: SeededRNG
    ): string {
        const descriptor = rng.randomChoice(NAMING_DATA.descriptors);
        const aspects = NAMING_DATA.classAspects[characterClass] || ['Wanderer', 'Seeker', 'Sage', 'Hero'];
        const aspect = rng.randomChoice(aspects);

        return `${core}, the ${descriptor} ${aspect}`;
    }

    /**
     * Format 5: Compound Adjective
     * Pattern: "{prefix}-{suffix} {title}"
     *
     * @example "Thunder-Blessed Midnight Dreams"
     */
    private formatCompoundAdjective(
        core: string,
        _genre: string,
        _audio: AudioProfile,
        rng: SeededRNG
    ): string {
        const prefix = rng.randomChoice(NAMING_DATA.prefixes);
        const suffix = rng.randomChoice(NAMING_DATA.suffixes);

        return `${prefix}-${suffix} ${core}`;
    }

    /**
     * Format 6: Artist-Inspired
     * Pattern: "{artist_word}{occupation} of the {realm}"
     *
     * @example "Daftsmith of the Crystal Spire"
     */
    private formatArtistInspired(
        _core: string,
        artist: string,
        _characterClass: Class,
        rng: SeededRNG
    ): string {
        // Transform first word of artist into occupation
        const firstWord = artist.split(' ')[0];
        const occupation = rng.randomChoice(NAMING_DATA.occupations);
        const artistTransform = `${firstWord}${occupation}`;

        const realm = rng.randomChoice(NAMING_DATA.realms);

        return `${artistTransform} of the ${realm}`;
    }

    /**
     * Format 7: Mononym Subtitle
     * Pattern: "{first_word} [{subtitle}]"
     *
     * @example "Midnight [Dreams Eternal]"
     */
    private formatMononymSubtitle(
        core: string,
        _audio: AudioProfile,
        _genre: string,
        rng: SeededRNG
    ): string {
        // Take first word of title
        const words = core.split(' ');
        const mononym = words[0];

        // Generate subtitle from remaining words or create one
        let subtitle: string;
        if (words.length > 1) {
            subtitle = words.slice(1).join(' ');
        } else {
            subtitle = rng.randomChoice(NAMING_DATA.subtitlePrefixes);
        }

        return `${mononym} [${subtitle}]`;
    }

    /**
     * Calculate balanced adjective weights for 50/50 audio/random influence
     * All categories are always considered - audio just provides weight boosts
     */
    private calculateBalancedAdjectiveWeights(audio: AudioProfile): [string, number][] {
        // Start with base random weights (50% influence)
        const baseWeight = 1.0;

        // Audio provides additional weight (50% influence)
        const audioBoost = {
            bass: audio.bass_dominance,
            treble: audio.treble_dominance,
            mid: audio.mid_dominance,
            quiet: audio.average_amplitude < 0.4 ? 0.5 : 0,
            loud: audio.average_amplitude > 0.6 ? 0.5 : 0
        };

        // Combine: each category always has baseWeight, plus audio boost
        // This ensures all categories are always considered
        return [
            ['bass', baseWeight + audioBoost.bass],
            ['treble', baseWeight + audioBoost.treble],
            ['mid', baseWeight + audioBoost.mid],
            ['quiet', baseWeight + audioBoost.quiet],
            ['loud', baseWeight + audioBoost.loud]
        ];

        // Example results:
        // - High bass track (0.8): bass gets weight 1.8, others get 1.0-1.3
        // - Balanced track: all categories get roughly equal weight ~1.0-1.3
        // - This gives audio ~40-50% influence while keeping randomness strong
    }

    /**
     * Find matching genre key in NAMING_DATA.adjectives
     * Returns 'default' if no match (ensures all adjectives available)
     */
    private findGenreKey(genre: string): string {
        const lower = genre.toLowerCase();
        const matches = Object.keys(NAMING_DATA.adjectives).filter(key =>
            key !== 'default' && lower.includes(key)
        );

        // If no match, return 'default' (don't lock away adjectives)
        return matches.length > 0 ? matches[0] : 'default';
    }
}
