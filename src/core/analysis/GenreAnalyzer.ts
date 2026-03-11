import type { GenreProfile, GenreTag } from '../types/AudioProfile.js';

export interface GenreAnalyzerOptions {
    /**
     * URL to the pre-trained TensorFlow.js model (.json file)
     * e.g., 'https://cdn.jsdelivr.net/gh/MTG/essentia.js/examples/models/mtg_jamendo_genre/model.json'
     */
    modelUrl?: string;

    /** Maximum number of top genres to return */
    topN?: number;

    /** Minimum confidence threshold for a genre to be included (0.0 to 1.0) */
    threshold?: number;
}

// The 87 genre classes used by the mtg_jamendo_genre model
// Based on the MTG Jamendo dataset taxonomy
const JAMENDO_GENRES = [
    "60s", "70s", "80s", "90s", "acidjazz", "alternative", "alternativerock", "ambient", "atmospheric", "blues",
    "bluesrock", "bossanova", "bossa", "celtic", "chanson", "chillout", "choir", "classical", "classicrock",
    "club", "comedy", "country", "cuban", "dance", "darkambient", "darkwave", "deephouse", "disco", "downtempo",
    "drumandbass", "dub", "dubstep", "easylistening", "edm", "electronic", "electro", "electropop", "ethno",
    "eurodance", "experimental", "folk", "funk", "fusion", "groove", "grunge", "hardcore", "hardrock", "hiphop",
    "house", "indie", "indiepop", "indierock", "industrial", "instrumentalpop", "instrumentalrock", "jazz",
    "jazzfusion", "latin", "lounge", "metal", "minimal", "newage", " orchestrall", "pop", "popfolk", "poprock",
    "postrock", "progressive", "psychedelic", "punkrock", "rap", "reggae", "rnb", "rock", "rockandroll",
    "ska", "soul", "soundtrack", "synthpop", "techno", "trance", "trip", "triphop", "underground", "world",
    "worldbeat", "worldmusic"
];

export class GenreAnalyzer {
    private options: GenreAnalyzerOptions;
    // We will dynamically import essentia to avoid issues in Node.js / non-browser environments if the user doesn't use this class
    private essentiaModule: any = null;

    constructor(options: GenreAnalyzerOptions = {}) {
        this.options = {
            // Default to the broad Jamendo genre model
            modelUrl: 'https://cdn.jsdelivr.net/gh/MTG/essentia.js/examples/models/mtg_jamendo_genre/model.json',
            topN: 5,
            threshold: 0.05,
            ...options
        };
    }

    /**
     * Analyzes an audio file to extract semantic genre tags.
     * 
     * Uses `essentia.js` and a pre-trained TensorFlow.js model to classify the audio.
     */
    async analyzeGenre(audioUrl: string): Promise<GenreProfile> {
        try {
            await this.initializeEssentia();

            // Fetch and decode audio
            const response = await fetch(audioUrl);
            const arrayBuffer = await response.arrayBuffer();
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

            // The Essentia Model Extractor will handle the audio internally, passing audioCtx just gives it context
            // Get audio data as Float32Array just in case we need it later
            // const _audioData = audioBuffer.getChannelData(0); // Use first channel for mono analysis

            // Load the model using essentially-model Extractor helper
            const extractor = new this.essentiaModule.EssentiaModel.Extractor(
                this.essentiaModule.Essentia,
                this.options.modelUrl!,
                audioCtx,
                false // Disable GUI if any
            );

            // Predict
            const predictions = await extractor.predict(audioUrl, false);

            // Map predictions to genre labels
            const genreTags: GenreTag[] = predictions.map((prob: number, index: number) => ({
                name: JAMENDO_GENRES[index],
                confidence: prob
            }))
                // Sort by highest confidence
                .sort((a: GenreTag, b: GenreTag) => b.confidence - a.confidence)
                // Filter by threshold
                .filter((tag: GenreTag) => tag.confidence >= this.options.threshold!)
                // Take top N
                .slice(0, this.options.topN);

            return {
                genres: genreTags,
                primary_genre: genreTags.length > 0 ? genreTags[0].name : "Unknown",
                analysis_metadata: {
                    model_used: this.options.modelUrl!,
                    duration_analyzed: audioBuffer.duration,
                    frames_analyzed: 0, // Not easily accessible without manual frame extraction
                    analyzed_at: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error("Genre analysis failed:", error);
            throw error;
        }
    }

    private async initializeEssentia() {
        if (!this.essentiaModule) {
            // @ts-expect-error essentia.js does not have types
            this.essentiaModule = await import('essentia.js');
        }
    }
}
