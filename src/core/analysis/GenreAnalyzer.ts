import type { GenreProfile } from '../types/AudioProfile.js';
import { MusicClassifier, type MusicClassifierOptions, type ModelConfig } from './MusicClassifier.js';

export interface GenreAnalyzerOptions extends MusicClassifierOptions {
    /**
     * URL to the pre-trained TensorFlow.js model (.json file)
     * @deprecated Use options.models.genre instead for both single-step and two-step model support
     */
    modelUrl?: string;
}

/**
 * Legacy analyzer for genre classification.
 * @deprecated Use MusicClassifier instead for broader analysis (mood, vibe, etc.)
 *
 * @example
 * // Single-step model (legacy)
 * const analyzer = new GenreAnalyzer({
 *     modelUrl: '/models/genre-classifier.json'
 * });
 *
 * // Two-step model (new, recommended)
 * const analyzer = new GenreAnalyzer({
 *     models: {
 *         genre: {
 *             embedding: '/models/discogs-effnet-bs64-1.json',
 *             classifier: '/models/mtg_jamendo_genre-discogs-effnet-1.json'
 *         }
 *     }
 * });
 */
export class GenreAnalyzer {
    private classifier: MusicClassifier;

    constructor(options: GenreAnalyzerOptions = {}) {
        const { modelUrl, ...rest } = options;

        // Determine the genre model config with proper priority:
        // 1. options.models.genre (new way, supports two-step ModelConfig)
        // 2. modelUrl (deprecated, single-step string)
        // 3. Default single-step model
        const genreConfig: ModelConfig =
            rest.models?.genre ?? modelUrl ?? '/models/genre_tzanetakis-musicnn-msd/model.json';

        this.classifier = new MusicClassifier({
            ...rest,
            models: {
                ...rest.models,
                genre: genreConfig
            }
        });
    }

    /**
     * Analyzes an audio file to extract semantic genre tags.
     */
    async analyzeGenre(audioUrl: string): Promise<GenreProfile> {
        return await this.classifier.analyze(audioUrl);
    }
}
