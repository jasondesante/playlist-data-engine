import type {
    MusicClassificationProfile,
    ClassificationTag,
    VibeMetrics
} from '../types/AudioProfile.js';
import * as tf from '@tensorflow/tfjs';

export interface MusicClassifierOptions {
    /**
     * URLs to pre-trained TensorFlow.js models
     */
    models?: {
        genre?: string;
        mood?: string;
        danceability?: string;
        voice?: string;
        acoustic?: string;
    };

    /** Maximum number of tags to return per category */
    topN?: number;

    /** Minimum confidence threshold (0.0 to 1.0) */
    threshold?: number;
}

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

const GTZAN_GENRES = [
    "Blues",
    "Classical",
    "Country",
    "Disco",
    "Hip-Hop",
    "Jazz",
    "Metal",
    "Pop",
    "Reggae",
    "Rock"
]

const MTT_MUSICNN = [
    "guitar", "classical", "slow", "techno", "strings", "drums", "electronic", "rock", "fast", "piano", "ambient", "beat", "violin", "vocal", "synth", "female", "indian", "opera", "male", "singing", "vocals", "no vocals", "harpsichord", "loud", "quiet", "flute", "woman", "male vocal", "no vocal", "pop", "soft", "sitar", "solo", "man", "classic", "choir", "voice", "new age", "dance", "male voice", "female vocal", "beats", "harp", "cello", "no voice", "weird", "country", "metal", "female voice", "choral"
]


const JAMENDO_MOODS = [
    "action", "adventure", "advertising", "background", "ballad", "calm", "children", "christmas", "commercial", "cool",
    "corporate", "dark", "deep", "documentary", "drama", "dramatic", "dream", "emotional", "energetic", "epic",
    "fast", "film", "fun", "funny", "game", "groovy", "happy", "heavy", "holiday", "hopeful",
    "inspiring", "love", "meditative", "melancholic", "melodic", "motivational", "movie", "nature", "nostalgic", "party",
    "peaceful", "positive", "relaxing", "retro", "romantic", "sad", "scary", "science", "sea", "sentimental",
    "serene", "sexy", "space", "sport", "summer", "suspense", "trailer", "travel", "upbeat", "uplifting",
    "video", "war"
];

// Type definitions for essentia.js model module
interface EssentiaModel {
    EssentiaTFInputExtractor: new (wasmBackend: any, outputType: string) => any;
    TensorflowMusiCNN: new (tf: typeof import('@tensorflow/tfjs'), modelUrl: string) => any;
}

export class MusicClassifier {
    private options: MusicClassifierOptions;
    private essentiaWASM: any = null;
    private essentiaModel: EssentiaModel | null = null;
    private extractor: any = null;
    private initialized = false;

    constructor(options: MusicClassifierOptions = {}) {
        this.options = {
            models: {
                genre: '/models/gender/model.json',
                mood: '/models/mtg_jamendo_moodtheme/mtg_jamendo_moodtheme-discogs-effnet-1.json',
                danceability: '/models/classifiers/danceability/danceability-vggish-audioset-1.json',
                ...options.models
            },
            topN: 5,
            threshold: 0.05,
            ...options
        };
    }

    /**
     * Initialize essentia.js modules for browser environment.
     * Must be called before any analysis.
     */
    private async initializeEssentia(): Promise<void> {
        if (this.initialized) return;

        // Load WASM backend (ES module version for proper import)
        // @ts-expect-error essentia.js does not have types for dist files
        const wasmModule = await import('essentia.js/dist/essentia-wasm.es.js');
        const EssentiaWASM = wasmModule.EssentiaWASM;
        // Wait for the WASM module to be ready before using it
        await EssentiaWASM.ready;
        this.essentiaWASM = EssentiaWASM;

        // Load model classes
        // @ts-expect-error essentia.js does not have types for dist files
        const modelModule = await import('essentia.js/dist/essentia.js-model.es.js');
        this.essentiaModel = modelModule;

        // Create feature extractor (musicnn = MTG Jamendo compatible)
        this.extractor = new modelModule.EssentiaTFInputExtractor(
            this.essentiaWASM,
            'musicnn'
        );

        this.initialized = true;
    }

    /**
     * Analyzes audio to extract genre, mood, and vibe data.
     */
    async analyze(audioUrl: string): Promise<MusicClassificationProfile> {
        try {
            await this.initializeEssentia();

            // Fetch and decode audio
            const response = await fetch(audioUrl);
            const arrayBuffer = await response.arrayBuffer();
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

            // Downsample to 16kHz mono for essentia.js
            const audioSignal = await this.extractor.downsampleAudioBuffer(
                audioBuffer,
                audioCtx.sampleRate
            );

            // Compute mel-spectrogram features frame-wise
            const features = this.extractor.computeFrameWise(audioSignal, 512);

            const modelsUsed: string[] = [];
            const results: Partial<MusicClassificationProfile> = {
                genres: [],
                moods: [],
                mood_tags: [],
                vibe_metrics: {}
            };

            // 1. Analyze Genre
            if (this.options.models?.genre) {
                const genrePredictions = await this.predictWithModel(
                    this.options.models.genre,
                    features
                );
                results.genres = this.mapPredictions(genrePredictions, JAMENDO_GENRES);
                // results.genres = this.mapPredictions(genrePredictions, GTZAN_GENRES);
                // results.genres = this.mapPredictions(genrePredictions, MTT_MUSICNN);
                results.primary_genre = results.genres.length > 0 ? results.genres[0].name : "Unknown";
                modelsUsed.push(this.options.models.genre);
            }

            // 2. Analyze Mood
            if (this.options.models?.mood) {
                const moodPredictions = await this.predictWithModel(
                    this.options.models.mood,
                    features
                );
                results.moods = this.mapPredictions(moodPredictions, JAMENDO_MOODS);
                results.mood_tags = results.moods.slice(0, 3).map(m => m.name);
                modelsUsed.push(this.options.models.mood);
            }

            // 3. Analyze Vibe (Danceability)
            if (this.options.models?.danceability) {
                const dancePredictions = await this.predictWithModel(
                    this.options.models.danceability,
                    features
                );
                // Danceability model usually returns [danceable, non-danceable]
                results.vibe_metrics!.danceability = dancePredictions[0];
                modelsUsed.push(this.options.models.danceability);
            }

            // Note: Other metrics (valence, energy) could be derived from the mood predictions
            // or separate models if available as .json
            if (results.moods) {
                const energetic = results.moods.find(m => m.name === 'energetic' || m.name === 'upbeat' || m.name === 'epic');
                const positive = results.moods.find(m => m.name === 'happy' || m.name === 'positive' || m.name === 'uplifting');

                if (energetic) results.vibe_metrics!.energy = energetic.confidence;
                if (positive) results.vibe_metrics!.valence = positive.confidence;
            }

            return {
                genres: results.genres || [],
                moods: results.moods || [],
                primary_genre: results.primary_genre || "Unknown",
                mood_tags: results.mood_tags || [],
                vibe_metrics: results.vibe_metrics as VibeMetrics,
                analysis_metadata: {
                    models_used: modelsUsed,
                    model_used: modelsUsed.length > 0 ? modelsUsed[0] : undefined,
                    frames_analyzed: features.length,
                    duration_analyzed: audioBuffer.duration,
                    analyzed_at: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error("Music analysis failed:", error);
            throw error;
        }
    }

    /**
     * Run TensorFlow model inference on pre-computed features.
     */
    private async predictWithModel(
        modelUrl: string,
        features: any[]
    ): Promise<number[]> {
        if (!this.essentiaModel) {
            throw new Error('Essentia not initialized. Call initializeEssentia() first.');
        }

        // Create and initialize the TensorFlow model
        const model = new this.essentiaModel!.TensorflowMusiCNN(tf, modelUrl);
        await model.initialize();

        // Run prediction with zero-padding
        const predictions = await model.predict(features, true);

        // Average predictions across all frames
        // predictions is number[][] - shape [frames][num_classes]
        if (!predictions || predictions.length === 0) {
            return [];
        }

        const numClasses = predictions[0].length;
        const avgPredictions: number[] = [];

        for (let i = 0; i < numClasses; i++) {
            const sum = predictions.reduce((acc: number, batch: number[]) => acc + batch[i], 0);
            avgPredictions.push(sum / predictions.length);
        }

        // Clean up model resources
        if (model.terminate) {
            model.terminate();
        }

        return avgPredictions;
    }

    private mapPredictions(predictions: number[], labels: string[]): ClassificationTag[] {
        return predictions.map((prob: number, index: number) => ({
            name: labels[index],
            confidence: prob
        }))
            .sort((a, b) => b.confidence - a.confidence)
            .filter(tag => tag.confidence >= this.options.threshold!)
            .slice(0, this.options.topN);
    }
}
