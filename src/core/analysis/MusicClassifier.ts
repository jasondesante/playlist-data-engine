import type {
    MusicClassificationProfile,
    ClassificationTag,
    VibeMetrics
} from '../types/AudioProfile.js';
import * as tf from '@tensorflow/tfjs';

/**
 * Supported model architectures for audio feature extraction.
 * Each architecture requires different mel-band configurations:
 * - `musicnn`: 96 mel bands - MusiCNN / MSD style models
 * - `effnet`: 128 mel bands - Discogs-EffNet embedding models
 * - `vggish`: 64 mel bands - VGGish-based models (e.g., audioset classifiers)
 * - `tempocnn`: 40 mel bands - TempoCNN-based models (e.g., tempo estimation)
 */
export type ModelArchitecture = 'musicnn' | 'effnet' | 'vggish' | 'tempocnn';

/**
 * Configuration for two-step model architectures where embedding
 * and classifier models are separate files.
 *
 * This enables using models like:
 * - Discogs-EffNet (embedding) + MTG Jamendo Genre (classifier)
 * - Discogs-EffNet (embedding) + MTG Jamendo Mood (classifier)
 */
export interface TwoStepModelConfig {
    /** URL to the embedding model (e.g., discogs-effnet-bs64-1.json) */
    embedding: string;
    /** URL to the classifier model that operates on embeddings */
    classifier: string;
    /** Optional custom labels for classifier output */
    labels?: string[];
}

/**
 * Model configuration that accepts either:
 * - Single string URL (1-step process): Model handles everything internally
 * - Two-step object: Separate embedding + classifier models chained together
 *
 * @example
 * // Single-step
 * genre: '/models/genre-classifier.json'
 *
 * // Two-step
 * genre: {
 *     embedding: '/models/discogs-effnet-bs64-1.json',
 *     classifier: '/models/mtg_jamendo_genre-discogs-effnet-1.json'
 * }
 */
export type ModelConfig = string | TwoStepModelConfig;

export interface MusicClassifierOptions {
    /**
     * URLs to pre-trained TensorFlow.js models.
     * Each model option accepts EITHER:
     * - Single string URL (1-step process)
     * - Object with { embedding, classifier } for 2-step process
     */
    models?: {
        genre?: ModelConfig;
        mood?: ModelConfig;
        danceability?: ModelConfig;
        voice?: ModelConfig;
        acoustic?: ModelConfig;
    };

    /** Maximum number of tags to return per category */
    topN?: number;

    /** Minimum confidence threshold (0.0 to 1.0) */
    threshold?: number;

    /**
     * When true, embedding models are cached and reused across multiple
     * predictions. Useful when using the same embedding model for both
     * genre and mood classification.
     * @default true
     */
    cacheEmbeddings?: boolean;
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

const DANCEABILITY_LABELS = ['danceable', 'non-danceable'];

const VOICE_LABELS = ['voice', 'instrumental'];

const ACOUSTIC_LABELS = ['acoustic', 'electronic'];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Type guard to check if a model config is a two-step configuration
 * (embedding + classifier) or a single model URL string.
 */
export function isTwoStepModel(config: ModelConfig): config is TwoStepModelConfig {
    return typeof config === 'object' && config !== null &&
           'embedding' in config && 'classifier' in config;
}

/**
 * Detects the model architecture from a model URL.
 * Used to select the correct feature extractor (mel-band count) and model class.
 *
 * Architecture → Mel Bands mapping:
 * - effnet: 128 bands (Discogs-EffNet)
 * - vggish: 64 bands
 * - tempocnn: 40 bands
 * - musicnn: 96 bands (default)
 *
 * @param modelUrl - URL to the model file
 * @returns The detected architecture type
 */
export function detectModelArchitecture(modelUrl: string): ModelArchitecture {
    const url = modelUrl.toLowerCase();

    // Discogs-EffNet models (128 mel bands) - check first since they're commonly used for embeddings
    if (url.includes('effnet') || url.includes('discogs')) {
        return 'effnet';
    }

    // VGGish models (64 mel bands)
    if (url.includes('vggish')) {
        return 'vggish';
    }

    // TempoCNN models (40 mel bands)
    if (url.includes('tempocnn') || (url.includes('tempo') && !url.includes('temple'))) {
        return 'tempocnn';
    }

    // Default to musicnn (96 mel bands) for MusiCNN, MSD, and other models
    return 'musicnn';
}

/**
 * Formats a model config for display in metadata.
 * - Single-step: just the URL
 * - Two-step: "embedding -> classifier" format
 */
export function formatModelForMetadata(config: ModelConfig): string {
    if (isTwoStepModel(config)) {
        return `${config.embedding} -> ${config.classifier}`;
    }
    return config;
}

/**
 * Averages embeddings across all audio frames.
 * Used in two-step model architecture to aggregate frame-level embeddings
 * before passing to the classifier.
 *
 * @param embeddings - 2D array of embeddings, shape [frames][embedding_dim]
 * @returns 1D array of averaged embeddings, shape [embedding_dim]
 *
 * @example
 * const frameEmbeddings = [[0.1, 0.2, 0.3], [0.2, 0.3, 0.4]];
 * const avgEmbedding = averageEmbeddings(frameEmbeddings);
 * // Result: [0.15, 0.25, 0.35]
 */
export function averageEmbeddings(embeddings: number[][]): number[] {
    // Handle empty arrays gracefully
    if (!embeddings || embeddings.length === 0) {
        return [];
    }

    // Get embedding dimension from first frame
    const embeddingDim = embeddings[0].length;
    if (embeddingDim === 0) {
        return [];
    }

    // Average across all frames
    const averaged: number[] = [];
    for (let i = 0; i < embeddingDim; i++) {
        const sum = embeddings.reduce((acc, frame) => acc + (frame[i] ?? 0), 0);
        averaged.push(sum / embeddings.length);
    }

    return averaged;
}

// Type definitions for essentia.js model module
interface EssentiaModel {
    EssentiaTFInputExtractor: new (wasmBackend: any, outputType: string) => any;
    TensorflowMusiCNN: new (tf: typeof import('@tensorflow/tfjs'), modelUrl: string) => any;
    TensorflowVGGish: new (tf: typeof import('@tensorflow/tfjs'), modelUrl: string) => any;
}

export class MusicClassifier {
    private options: MusicClassifierOptions;
    private essentiaWASM: any = null;
    private essentiaModel: EssentiaModel | null = null;
    private extractor: any = null;
    private initialized = false;

    /**
     * Cache for embedding models by URL.
     * Key: model URL, Value: initialized model instance
     * Used to avoid re-loading the same embedding model when shared across
     * multiple classifiers (e.g., genre and mood using the same discogs-effnet).
     */
    private embeddingModelCache: Map<string, any> = new Map();

    /**
     * Optional cache for classifier models.
     * Key: model URL, Value: initialized model instance
     * Useful when repeatedly analyzing audio with the same classifier.
     */
    private classifierModelCache: Map<string, any> = new Map();

    /**
     * Architecture-specific feature extractors.
     * Each architecture requires different mel-band configurations:
     * - musicnn: 96 bands (default extractor)
     * - effnet: 128 bands (custom extractor)
     * - vggish: 64 bands
     * - tempocnn: 40 bands
     */
    private extractors: Map<ModelArchitecture, any> = new Map();

    constructor(options: MusicClassifierOptions = {}) {
        this.options = {
            models: {
                // Two-step architecture: Discogs-EffNet embedding + MTG Jamendo classifiers
                // Benefits: 1) Shared embedding model cached for both genre and mood
                //          2) Better accuracy with specialized classifier heads
                genre: {
                    embedding: '/models/discogs-effnet-bs64-1.json',
                    classifier: '/models/mtg_jamendo_genre-discogs-effnet-1.json'
                },
                mood: {
                    embedding: '/models/discogs-effnet-bs64-1.json',
                    classifier: '/models/mtg_jamendo_moodtheme-discogs-effnet-1.json'
                },
                // Single-step architecture: VGGish model handles everything internally
                danceability: '/models/classifiers/danceability/danceability-vggish-audioset-1.json',
                // Voice and acoustic are optional - user can provide either format
                ...options.models
            },
            topN: 5,
            threshold: 0.05,
            cacheEmbeddings: true, // Enable embedding caching by default (reuses shared embedding)
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
     * Gets or creates an embedding model instance with caching support.
     *
     * This method implements intelligent model caching to avoid re-loading
     * the same embedding model when it's shared across multiple classifiers
     * (e.g., genre and mood both using discogs-effnet).
     *
     * @param modelUrl - URL to the embedding model
     * @returns Promise resolving to the initialized model instance
     */
    private async getEmbeddingModel(modelUrl: string): Promise<any> {
        // Check cache first
        if (this.embeddingModelCache.has(modelUrl)) {
            return this.embeddingModelCache.get(modelUrl);
        }

        // Detect architecture to select the correct model loading strategy
        const architecture = detectModelArchitecture(modelUrl);
        let model: any;

        if (architecture === 'effnet') {
            // EffNet models use raw TensorFlow.js (not Essentia wrapper classes)
            // These are GraphModel format, loaded directly with tf.loadGraphModel()
            model = await tf.loadGraphModel(modelUrl);
        } else if (architecture === 'vggish') {
            // VGGish models use TensorflowVGGish class from Essentia
            if (!this.essentiaModel) {
                throw new Error('Essentia not initialized. Call initializeEssentia() first.');
            }
            model = new this.essentiaModel.TensorflowVGGish(tf, modelUrl);
            await model.initialize();
        } else {
            // musicnn and tempocnn models use TensorflowMusiCNN class from Essentia
            if (!this.essentiaModel) {
                throw new Error('Essentia not initialized. Call initializeEssentia() first.');
            }
            model = new this.essentiaModel.TensorflowMusiCNN(tf, modelUrl);
            await model.initialize();
        }

        // Cache the model if caching is enabled
        if (this.options.cacheEmbeddings) {
            this.embeddingModelCache.set(modelUrl, model);
        }

        return model;
    }

    /**
     * Clears the embedding model cache, disposing of any cached models.
     * Call this to free memory when switching to different models or
     * when done with analysis.
     *
     * Handles both:
     * - GraphModel instances (effnet) - use dispose()
     * - Essentia model instances (musicnn, vggish) - use terminate()
     */
    public clearEmbeddingCache(): void {
        for (const model of this.embeddingModelCache.values()) {
            if (model.dispose) {
                // TensorFlow.js GraphModel (effnet)
                model.dispose();
            } else if (model.terminate) {
                // Essentia model wrapper (musicnn, vggish, tempocnn)
                model.terminate();
            }
        }
        this.embeddingModelCache.clear();
    }

    /**
     * Clears the classifier model cache, disposing of any cached models.
     */
    public clearClassifierCache(): void {
        for (const model of this.classifierModelCache.values()) {
            if (model.terminate) {
                model.terminate();
            }
        }
        this.classifierModelCache.clear();
    }

    /**
     * Clears all model caches (both embedding and classifier).
     */
    public clearAllCaches(): void {
        this.clearEmbeddingCache();
        this.clearClassifierCache();
    }

    /**
     * Computes 128-band mel-spectrogram features for Discogs-EffNet models.
     *
     * Unlike the standard musicnn extractor (96 bands), EffNet requires 128 mel bands.
     * This method uses Essentia WASM's core MelBands algorithm directly.
     *
     * @param audioSignal - Mono audio signal at 16kHz sample rate
     * @returns 2D array of mel-spectrogram frames, shape [frames][128]
     */
    private computeEffnetFeatures(audioSignal: Float32Array): number[][] {
        if (!this.essentiaWASM) {
            throw new Error('Essentia WASM not initialized. Call initializeEssentia() first.');
        }

        // Create Essentia instance for algorithm access
        const essentia = new this.essentiaWASM.EssentiaJS(false);
        const features: number[][] = [];

        // Frame parameters matching discogs-effnet requirements
        const frameSize = 512;
        const hopSize = 256; // 50% overlap
        const sampleRate = 16000;
        const numBands = 128; // KEY: EffNet uses 128 mel bands, not 96!

        // Process audio in overlapping frames
        for (let i = 0; i <= audioSignal.length - frameSize; i += hopSize) {
            const frame = audioSignal.slice(i, i + frameSize);

            // Apply Hann window
            const windowed = essentia.Windowing(
                essentia.arrayToVector(frame),
                true,        // normalized
                frameSize,   // size
                'hann',      // type
                true         // zeroPhase
            );

            // Compute spectrum (FFT magnitude)
            const spectrum = essentia.Spectrum(
                windowed.frame,
                frameSize
            );

            // Compute 128-band mel spectrum
            const melBands = essentia.MelBands(
                spectrum.spectrum,
                8000,          // highFrequencyBound (16kHz / 2)
                frameSize / 2, // inputSize (FFT output size)
                false,         // log (apply log later)
                0,             // lowFrequencyBound
                'unit_sum',    // normalize
                numBands,      // numberBands - THE MAGIC NUMBER!
                sampleRate,    // sampleRate
                'power',       // type
                'slaneyMel',   // warpingFormula
                'linear'       // weighting
            );

            // Apply log compression (dB scale with floor)
            const logMel = essentia.UnaryOperator(
                melBands.bands,
                10000,    // scale pre-log to avoid log(0)
                1,        // shift
                'log10'   // operation
            );

            // Convert back to array and store
            const frameFeatures = Array.from(essentia.vectorToArray(logMel.array) as number[]);
            features.push(frameFeatures);
        }

        return features;
    }

    /**
     * Gets the appropriate mel-spectrogram features for a given model architecture.
     *
     * Different architectures require different mel-band configurations:
     * - musicnn: 96 bands (default)
     * - effnet: 128 bands (custom)
     * - vggish: 64 bands
     * - tempocnn: 40 bands
     *
     * @param audioSignal - Mono audio signal at 16kHz sample rate
     * @param architecture - The model architecture type
     * @returns 2D array of mel-spectrogram frames
     */
    private getFeaturesForArchitecture(
        audioSignal: Float32Array,
        architecture: ModelArchitecture
    ): number[][] {
        switch (architecture) {
            case 'effnet':
                // EffNet requires custom 128-band extraction
                return this.computeEffnetFeatures(audioSignal);

            case 'vggish':
                // VGGish uses 64 bands - for now use default extractor
                // TODO: Implement dedicated vggish extractor if needed
                console.warn('VGGish architecture requested but using default 96-band extractor. ' +
                    'Results may be suboptimal for VGGish models.');
                return this.extractor.computeFrameWise(audioSignal, 512);

            case 'tempocnn':
                // TempoCNN uses 40 bands - for now use default extractor
                // TODO: Implement dedicated tempocnn extractor if needed
                console.warn('TempoCNN architecture requested but using default 96-band extractor. ' +
                    'Results may be suboptimal for TempoCNN models.');
                return this.extractor.computeFrameWise(audioSignal, 512);

            case 'musicnn':
            default:
                // Default musicnn uses 96 bands (standard extractor)
                return this.extractor.computeFrameWise(audioSignal, 512);
        }
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
                const genreConfig = this.options.models.genre;
                results.genres = await this.runModelPrediction(
                    genreConfig,
                    audioSignal,
                    JAMENDO_GENRES
                );
                results.primary_genre = results.genres.length > 0 ? results.genres[0].name : "Unknown";
                modelsUsed.push(formatModelForMetadata(genreConfig));
            }

            // 2. Analyze Mood
            if (this.options.models?.mood) {
                const moodConfig = this.options.models.mood;
                results.moods = await this.runModelPrediction(
                    moodConfig,
                    audioSignal,
                    JAMENDO_MOODS
                );
                results.mood_tags = results.moods.slice(0, 3).map(m => m.name);
                modelsUsed.push(formatModelForMetadata(moodConfig));
            }

            // 3. Analyze Vibe (Danceability)
            if (this.options.models?.danceability) {
                const danceConfig = this.options.models.danceability;
                const danceTags = await this.runModelPrediction(
                    danceConfig,
                    audioSignal,
                    DANCEABILITY_LABELS
                );
                // Extract the danceability probability (confidence of "danceable" class)
                const danceableTag = danceTags.find(tag => tag.name === 'danceable');
                results.vibe_metrics!.danceability = danceableTag?.confidence ?? 0;
                modelsUsed.push(formatModelForMetadata(danceConfig));
            }

            // 4. Analyze Voice/Instrumental
            if (this.options.models?.voice) {
                const voiceConfig = this.options.models.voice;
                const voiceTags = await this.runModelPrediction(
                    voiceConfig,
                    audioSignal,
                    VOICE_LABELS
                );
                // Extract the instrumental probability (confidence of "instrumental" class)
                const instrumentalTag = voiceTags.find(tag => tag.name === 'instrumental');
                results.vibe_metrics!.instrumental_probability = instrumentalTag?.confidence ?? 0;
                modelsUsed.push(formatModelForMetadata(voiceConfig));
            }

            // 5. Analyze Acoustic/Electronic
            if (this.options.models?.acoustic) {
                const acousticConfig = this.options.models.acoustic;
                const acousticTags = await this.runModelPrediction(
                    acousticConfig,
                    audioSignal,
                    ACOUSTIC_LABELS
                );
                // Extract the electronic probability (confidence of "electronic" class)
                const electronicTag = acousticTags.find(tag => tag.name === 'electronic');
                results.vibe_metrics!.electronic_probability = electronicTag?.confidence ?? 0;
                modelsUsed.push(formatModelForMetadata(acousticConfig));
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
     * Runs a classifier model on pre-computed embeddings.
     *
     * This method is used in the two-step model architecture:
     * 1. Embedding model produces embeddings from audio features
     * 2. Classifier model produces class predictions from embeddings
     *
     * @param classifierUrl - URL to the classifier model (GraphModel format)
     * @param embeddings - 2D array of embeddings, shape [frames][embedding_dim]
     * @returns Promise resolving to 1D array of averaged class predictions
     */
    private async runClassifierOnEmbeddings(
        classifierUrl: string,
        embeddings: number[][]
    ): Promise<number[]> {
        // Average embeddings across all frames
        const avgEmbedding = averageEmbeddings(embeddings);

        if (avgEmbedding.length === 0) {
            console.warn('Empty embeddings provided to classifier');
            return [];
        }

        // Load classifier model (GraphModel format for TF.js)
        const classifier = await tf.loadGraphModel(classifierUrl);

        // Create input tensor with shape [1, embedding_dim]
        // The model expects batch dimension, even for single sample
        const inputTensor = tf.tensor2d([avgEmbedding], [1, avgEmbedding.length]);

        let predictions: number[] = [];

        try {
            // Execute model inference
            const output = classifier.predict(inputTensor) as tf.Tensor;

            // Convert output tensor to array
            predictions = await output.data().then(data => Array.from(data));

            // Dispose output tensor
            output.dispose();
        } finally {
            // Always dispose input tensor and model
            inputTensor.dispose();
            classifier.dispose();
        }

        return predictions;
    }

    /**
     * Runs a two-step model architecture prediction.
     *
     * This method implements the complete two-step flow:
     * 1. Detect embedding architecture from config
     * 2. Extract architecture-specific features (96 vs 128 mel bands!)
     * 3. Load embedding model (with caching)
     * 4. Run embedding model to get feature vectors
     * 5. Run classifier on embeddings
     * 6. Return predictions
     *
     * @param config - Two-step model configuration with embedding and classifier URLs
     * @param audioSignal - Mono audio signal at 16kHz sample rate
     * @returns Promise resolving to 1D array of class predictions
     */
    private async predictWithTwoStepModel(
        config: TwoStepModelConfig,
        audioSignal: Float32Array
    ): Promise<number[]> {
        // Step 1: Detect embedding architecture
        const architecture = detectModelArchitecture(config.embedding);

        // Step 2: Get architecture-specific features
        // CRITICAL: effnet uses 128 mel bands, musicnn uses 96!
        const features = this.getFeaturesForArchitecture(audioSignal, architecture);

        if (features.length === 0) {
            console.warn('No features extracted from audio signal');
            return [];
        }

        // Step 3: Load embedding model (with caching)
        const embeddingModel = await this.getEmbeddingModel(config.embedding);

        // Step 4: Run embedding model to get embeddings
        let embeddings: number[][];

        if (architecture === 'effnet') {
            // EffNet uses TensorFlow.js GraphModel directly
            embeddings = await this.runEffnetEmbedding(embeddingModel, features);
        } else if (architecture === 'vggish') {
            // VGGish uses Essentia TensorflowVGGish
            embeddings = await this.runEssentiaEmbedding(embeddingModel, features);
        } else {
            // musicnn and tempocnn use Essentia TensorflowMusiCNN
            embeddings = await this.runEssentiaEmbedding(embeddingModel, features);
        }

        if (embeddings.length === 0) {
            console.warn('No embeddings produced by embedding model');
            return [];
        }

        // Step 5: Run classifier on embeddings
        const predictions = await this.runClassifierOnEmbeddings(config.classifier, embeddings);

        // Step 6: Return predictions
        return predictions;
    }

    /**
     * Runs effnet embedding model inference on mel-spectrogram features.
     *
     * EffNet models are TensorFlow.js GraphModels that expect input shape
     * [batch, time, mel_bands, channels] and output embeddings.
     *
     * @param model - TensorFlow.js GraphModel instance
     * @param features - 2D array of mel-spectrogram frames, shape [frames][128]
     * @returns 2D array of embeddings, shape [frames][embedding_dim]
     */
    private async runEffnetEmbedding(model: tf.GraphModel, features: number[][]): Promise<number[][]> {
        const numFrames = features.length;
        const numBands = features[0]?.length || 128;

        // Stack all frames into a single tensor [1, frames, bands, 1]
        // The model expects batch dimension and channel dimension
        const flattened = features.flat();
        const inputTensor = tf.tensor4d(flattened, [1, numFrames, numBands, 1]);

        let embeddings: number[][] = [];

        try {
            // Run inference
            const output = model.predict(inputTensor) as tf.Tensor;

            // Output shape is typically [1, frames, embedding_dim] or [1, embedding_dim]
            const outputData = await output.data();
            const outputShape = output.shape;

            if (outputShape.length === 2) {
                // Pooled output: [1, embedding_dim]
                const embeddingDim = outputShape[1];
                embeddings.push(Array.from(outputData));
            } else if (outputShape.length === 3) {
                // Frame-level output: [1, frames, embedding_dim]
                const numOutputFrames = outputShape[1];
                const embeddingDim = outputShape[2];
                for (let i = 0; i < numOutputFrames; i++) {
                    const start = i * embeddingDim;
                    const frameEmbedding = Array.from(outputData.slice(start, start + embeddingDim));
                    embeddings.push(frameEmbedding);
                }
            } else {
                // Fallback: treat as single embedding
                embeddings.push(Array.from(outputData));
            }

            output.dispose();
        } finally {
            inputTensor.dispose();
        }

        return embeddings;
    }

    /**
     * Runs Essentia embedding model inference on mel-spectrogram features.
     *
     * This handles TensorflowMusiCNN and TensorflowVGGish models from Essentia.js.
     * These models have a predict() method that returns frame-level outputs.
     *
     * @param model - Essentia model instance (TensorflowMusiCNN or TensorflowVGGish)
     * @param features - 2D array of mel-spectrogram frames
     * @returns 2D array of embeddings, shape [frames][embedding_dim]
     */
    private async runEssentiaEmbedding(model: any, features: number[][]): Promise<number[][]> {
        // Essentia models have a predict method that takes features array
        // and returns predictions (which for embedding models are the embeddings)
        const predictions = await model.predict(features, true);

        if (!predictions || predictions.length === 0) {
            return [];
        }

        // predictions is number[][] - shape [frames][output_dim]
        // For embedding models, output_dim is the embedding dimension
        return predictions;
    }

    /**
     * Unified model prediction method that handles both single-step and two-step model architectures.
     *
     * This is the primary entry point for model predictions. It automatically:
     * - Detects if the config is single-step (string URL) or two-step (object with embedding + classifier)
     * - Detects the model architecture and uses the correct feature extractor
     * - Calls the appropriate prediction method
     * - Maps predictions to labeled ClassificationTags
     *
     * @param config - Model configuration (string URL for single-step, or TwoStepModelConfig for two-step)
     * @param audioSignal - Mono audio signal at 16kHz sample rate
     * @param labels - Array of class labels for the model output
     * @returns Promise resolving to array of ClassificationTags sorted by confidence
     *
     * @example
     * // Single-step prediction
     * const tags = await classifier.runModelPrediction(
     *     '/models/genre-classifier.json',
     *     audioSignal,
     *     JAMENDO_GENRES
     * );
     *
     * // Two-step prediction
     * const tags = await classifier.runModelPrediction(
     *     { embedding: '/models/effnet.json', classifier: '/models/genre-cls.json' },
     *     audioSignal,
     *     JAMENDO_GENRES
     * );
     */
    private async runModelPrediction(
        config: ModelConfig,
        audioSignal: Float32Array,
        labels: string[]
    ): Promise<ClassificationTag[]> {
        let predictions: number[];

        if (isTwoStepModel(config)) {
            // Two-step architecture: embedding model + classifier
            predictions = await this.predictWithTwoStepModel(config, audioSignal);
        } else {
            // Single-step architecture: one model does it all
            // Use default musicnn extractor (96 bands) - the model handles internal feature processing
            const features = this.extractor.computeFrameWise(audioSignal, 512);
            predictions = await this.predictWithModel(config, features);
        }

        // Map predictions to labeled tags
        return this.mapPredictions(predictions, labels);
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
