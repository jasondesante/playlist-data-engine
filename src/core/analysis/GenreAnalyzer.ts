import type { GenreProfile } from '../types/AudioProfile.js';
import { MusicClassifier, type MusicClassifierOptions } from './MusicClassifier.js';

export interface GenreAnalyzerOptions extends MusicClassifierOptions {
    /** 
     * URL to the pre-trained TensorFlow.js model (.json file)
     * @deprecated Use options.models.genre instead
     */
    modelUrl?: string;
}

/**
 * Legacy analyzer for genre classification.
 * @deprecated Use MusicClassifier instead for broader analysis (mood, vibe, etc.)
 */
export class GenreAnalyzer {
    private classifier: MusicClassifier;

    constructor(options: GenreAnalyzerOptions = {}) {
        const { modelUrl, ...rest } = options;
        this.classifier = new MusicClassifier({
            models: {
                genre: modelUrl || '/models/genre_tzanetakis-musicnn-msd/model.json'
            },
            ...rest
        });
    }

    /**
     * Analyzes an audio file to extract semantic genre tags.
     */
    async analyzeGenre(audioUrl: string): Promise<GenreProfile> {
        return await this.classifier.analyze(audioUrl);
    }
}
