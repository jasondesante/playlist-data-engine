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
 * Supported genre list types for different model sources.
 * Each genre model was trained on a specific dataset with its own genre taxonomy:
 * - `jamendo`: MTG Jamendo dataset (87 genres)
 * - `discogs400`: Discogs 400-style taxonomy (400+ subgenres)
 * - `tzanetakis`: GTZAN dataset (10 classic genres)
 * - `mtt_musicnn`: MTT (MagnaTagATune) with MusiCNN tags (50 tags)
 */
export type GenreListType = 'jamendo' | 'discogs400' | 'tzanetakis' | 'mtt_musicnn';

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
    /** Explicit embedding architecture type (overrides URL detection) */
    embeddingType?: ModelArchitecture;
    /** Explicit classifier type for genre models (overrides URL detection) */
    classifierType?: GenreListType;
}

/**
 * Configuration for single-step model architecture where one model
 * handles feature extraction and classification internally.
 */
export interface SingleStepModelConfig {
    /** URL to the model file */
    modelUrl: string;
    /** Explicit model architecture type (overrides URL detection) */
    modelType: ModelArchitecture;
    /**
     * Explicit genre list type for genre models (overrides URL detection).
     * Required when using Arweave URLs that don't contain genre identifiers.
     */
    genreType?: GenreListType;
    /** Optional custom labels for model output */
    labels?: string[];
}

/**
 * Model configuration that accepts either:
 * - SingleStepModelConfig: One model with explicit architecture type
 * - TwoStepModelConfig: Separate embedding + classifier models chained together
 *
 * @example
 * // Single-step with explicit type (for Arweave URLs)
 * genre: {
 *     modelUrl: 'https://arweave.net/xxx/model.json',
 *     modelType: 'musicnn'
 * }
 *
 * // Two-step
 * genre: {
 *     embedding: '/models/discogs-effnet-bs64-1.json',
 *     classifier: '/models/mtg_jamendo_genre-discogs-effnet-1.json',
 *     embeddingType: 'effnet',
 *     classifierType: 'jamendo'
 * }
 */
export type ModelConfig = SingleStepModelConfig | TwoStepModelConfig;

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

export const DISCOGS400_GENRES = [
    'Blues---Boogie Woogie',
    'Blues---Chicago Blues',
    'Blues---Country Blues',
    'Blues---Delta Blues',
    'Blues---Electric Blues',
    'Blues---Harmonica Blues',
    'Blues---Jump Blues',
    'Blues---Louisiana Blues',
    'Blues---Modern Electric Blues',
    'Blues---Piano Blues',
    'Blues---Rhythm & Blues',
    'Blues---Texas Blues',
    'Brass & Military---Brass Band',
    'Brass & Military---Marches',
    'Brass & Military---Military',
    `Children's-- - Educational`,
    `Children's-- - Nursery Rhymes`,
    `Children's-- - Story`,
    `Classical---Baroque`,
    'Classical---Choral',
    'Classical---Classical',
    'Classical---Contemporary',
    'Classical---Impressionist',
    'Classical---Medieval',
    'Classical---Modern',
    'Classical---Neo-Classical',
    'Classical---Neo-Romantic',
    'Classical---Opera',
    'Classical---Post-Modern',
    'Classical---Renaissance',
    'Classical---Romantic',
    'Electronic---Abstract',
    'Electronic---Acid',
    'Electronic---Acid House',
    'Electronic---Acid Jazz',
    'Electronic---Ambient',
    'Electronic---Bassline',
    'Electronic---Beatdown',
    'Electronic---Berlin-School',
    'Electronic---Big Beat',
    'Electronic---Bleep',
    'Electronic---Breakbeat',
    'Electronic---Breakcore',
    'Electronic---Breaks',
    'Electronic---Broken Beat',
    'Electronic---Chillwave',
    'Electronic---Chiptune',
    'Electronic---Dance-pop',
    'Electronic---Dark Ambient',
    'Electronic---Darkwave',
    'Electronic---Deep House',
    'Electronic---Deep Techno',
    'Electronic---Disco',
    'Electronic---Disco Polo',
    'Electronic---Donk',
    'Electronic---Downtempo',
    'Electronic---Drone',
    'Electronic---Drum n Bass',
    'Electronic---Dub',
    'Electronic---Dub Techno',
    'Electronic---Dubstep',
    'Electronic---Dungeon Synth',
    'Electronic---EBM',
    'Electronic---Electro',
    'Electronic---Electro House',
    'Electronic---Electroclash',
    'Electronic---Euro House',
    'Electronic---Euro-Disco',
    'Electronic---Eurobeat',
    'Electronic---Eurodance',
    'Electronic---Experimental',
    'Electronic---Freestyle',
    'Electronic---Future Jazz',
    'Electronic---Gabber',
    'Electronic---Garage House',
    'Electronic---Ghetto',
    'Electronic---Ghetto House',
    'Electronic---Glitch',
    'Electronic---Goa Trance',
    'Electronic---Grime',
    'Electronic---Halftime',
    'Electronic---Hands Up',
    'Electronic---Happy Hardcore',
    'Electronic---Hard House',
    'Electronic---Hard Techno',
    'Electronic---Hard Trance',
    'Electronic---Hardcore',
    'Electronic---Hardstyle',
    'Electronic---Hi NRG',
    'Electronic---Hip Hop',
    'Electronic---Hip-House',
    'Electronic---House',
    'Electronic---IDM',
    'Electronic---Illbient',
    'Electronic---Industrial',
    'Electronic---Italo House',
    'Electronic---Italo-Disco',
    'Electronic---Italodance',
    'Electronic---Jazzdance',
    'Electronic---Juke',
    'Electronic---Jumpstyle',
    'Electronic---Jungle',
    'Electronic---Latin',
    'Electronic---Leftfield',
    'Electronic---Makina',
    'Electronic---Minimal',
    'Electronic---Minimal Techno',
    'Electronic---Modern Classical',
    'Electronic---Musique Concrète',
    'Electronic---Neofolk',
    'Electronic---New Age',
    'Electronic---New Beat',
    'Electronic---New Wave',
    'Electronic---Noise',
    'Electronic---Nu-Disco',
    'Electronic---Power Electronics',
    'Electronic---Progressive Breaks',
    'Electronic---Progressive House',
    'Electronic---Progressive Trance',
    'Electronic---Psy-Trance',
    'Electronic---Rhythmic Noise',
    'Electronic---Schranz',
    'Electronic---Sound Collage',
    'Electronic---Speed Garage',
    'Electronic---Speedcore',
    'Electronic---Synth-pop',
    'Electronic---Synthwave',
    'Electronic---Tech House',
    'Electronic---Tech Trance',
    'Electronic---Techno',
    'Electronic---Trance',
    'Electronic---Tribal',
    'Electronic---Tribal House',
    'Electronic---Trip Hop',
    'Electronic---Tropical House',
    'Electronic---UK Garage',
    'Electronic---Vaporwave',
    'Folk, World, & Country---African',
    'Folk, World, & Country---Bluegrass',
    'Folk, World, & Country---Cajun',
    'Folk, World, & Country---Canzone Napoletana',
    'Folk, World, & Country---Catalan Music',
    'Folk, World, & Country---Celtic',
    'Folk, World, & Country---Country',
    'Folk, World, & Country---Fado',
    'Folk, World, & Country---Flamenco',
    'Folk, World, & Country---Folk',
    'Folk, World, & Country---Gospel',
    'Folk, World, & Country---Highlife',
    'Folk, World, & Country---Hillbilly',
    'Folk, World, & Country---Hindustani',
    'Folk, World, & Country---Honky Tonk',
    'Folk, World, & Country---Indian Classical',
    'Folk, World, & Country---Laïkó',
    'Folk, World, & Country---Nordic',
    'Folk, World, & Country---Pacific',
    'Folk, World, & Country---Polka',
    'Folk, World, & Country---Raï',
    'Folk, World, & Country---Romani',
    'Folk, World, & Country---Soukous',
    'Folk, World, & Country---Séga',
    'Folk, World, & Country---Volksmusik',
    'Folk, World, & Country---Zouk',
    'Folk, World, & Country---Éntekhno',
    'Funk / Soul---Afrobeat',
    'Funk / Soul---Boogie',
    'Funk / Soul---Contemporary R&B',
    'Funk / Soul---Disco',
    'Funk / Soul---Free Funk',
    'Funk / Soul---Funk',
    'Funk / Soul---Gospel',
    'Funk / Soul---Neo Soul',
    'Funk / Soul---New Jack Swing',
    'Funk / Soul---P.Funk',
    'Funk / Soul---Psychedelic',
    'Funk / Soul---Rhythm & Blues',
    'Funk / Soul---Soul',
    'Funk / Soul---Swingbeat',
    'Funk / Soul---UK Street Soul',
    'Hip Hop---Bass Music',
    'Hip Hop---Boom Bap',
    'Hip Hop---Bounce',
    'Hip Hop---Britcore',
    'Hip Hop---Cloud Rap',
    'Hip Hop---Conscious',
    'Hip Hop---Crunk',
    'Hip Hop---Cut-up/DJ',
    'Hip Hop---DJ Battle Tool',
    'Hip Hop---Electro',
    'Hip Hop---G-Funk',
    'Hip Hop---Gangsta',
    'Hip Hop---Grime',
    'Hip Hop---Hardcore Hip-Hop',
    'Hip Hop---Horrorcore',
    'Hip Hop---Instrumental',
    'Hip Hop---Jazzy Hip-Hop',
    'Hip Hop---Miami Bass',
    'Hip Hop---Pop Rap',
    'Hip Hop---Ragga HipHop',
    'Hip Hop---RnB/Swing',
    'Hip Hop---Screw',
    'Hip Hop---Thug Rap',
    'Hip Hop---Trap',
    'Hip Hop---Trip Hop',
    'Hip Hop---Turntablism',
    'Jazz---Afro-Cuban Jazz',
    'Jazz---Afrobeat',
    'Jazz---Avant-garde Jazz',
    'Jazz---Big Band',
    'Jazz---Bop',
    'Jazz---Bossa Nova',
    'Jazz---Contemporary Jazz',
    'Jazz---Cool Jazz',
    'Jazz---Dixieland',
    'Jazz---Easy Listening',
    'Jazz---Free Improvisation',
    'Jazz---Free Jazz',
    'Jazz---Fusion',
    'Jazz---Gypsy Jazz',
    'Jazz---Hard Bop',
    'Jazz---Jazz-Funk',
    'Jazz---Jazz-Rock',
    'Jazz---Latin Jazz',
    'Jazz---Modal',
    'Jazz---Post Bop',
    'Jazz---Ragtime',
    'Jazz---Smooth Jazz',
    'Jazz---Soul-Jazz',
    'Jazz---Space-Age',
    'Jazz---Swing',
    'Latin---Afro-Cuban',
    'Latin---Baião',
    'Latin---Batucada',
    'Latin---Beguine',
    'Latin---Bolero',
    'Latin---Boogaloo',
    'Latin---Bossanova',
    'Latin---Cha-Cha',
    'Latin---Charanga',
    'Latin---Compas',
    'Latin---Cubano',
    'Latin---Cumbia',
    'Latin---Descarga',
    'Latin---Forró',
    'Latin---Guaguancó',
    'Latin---Guajira',
    'Latin---Guaracha',
    'Latin---MPB',
    'Latin---Mambo',
    'Latin---Mariachi',
    'Latin---Merengue',
    'Latin---Norteño',
    'Latin---Nueva Cancion',
    'Latin---Pachanga',
    'Latin---Porro',
    'Latin---Ranchera',
    'Latin---Reggaeton',
    'Latin---Rumba',
    'Latin---Salsa',
    'Latin---Samba',
    'Latin---Son',
    'Latin---Son Montuno',
    'Latin---Tango',
    'Latin---Tejano',
    'Latin---Vallenato',
    'Non-Music---Audiobook',
    'Non-Music---Comedy',
    'Non-Music---Dialogue',
    'Non-Music---Education',
    'Non-Music---Field Recording',
    'Non-Music---Interview',
    'Non-Music---Monolog',
    'Non-Music---Poetry',
    'Non-Music---Political',
    'Non-Music---Promotional',
    'Non-Music---Radioplay',
    'Non-Music---Religious',
    'Non-Music---Spoken Word',
    'Pop---Ballad',
    'Pop---Bollywood',
    'Pop---Bubblegum',
    'Pop---Chanson',
    'Pop---City Pop',
    'Pop---Europop',
    'Pop---Indie Pop',
    'Pop---J-pop',
    'Pop---K-pop',
    'Pop---Kayōkyoku',
    'Pop---Light Music',
    'Pop---Music Hall',
    'Pop---Novelty',
    'Pop---Parody',
    'Pop---Schlager',
    'Pop---Vocal',
    'Reggae---Calypso',
    'Reggae---Dancehall',
    'Reggae---Dub',
    'Reggae---Lovers Rock',
    'Reggae---Ragga',
    'Reggae---Reggae',
    'Reggae---Reggae-Pop',
    'Reggae---Rocksteady',
    'Reggae---Roots Reggae',
    'Reggae---Ska',
    'Reggae---Soca',
    'Rock---AOR',
    'Rock---Acid Rock',
    'Rock---Acoustic',
    'Rock---Alternative Rock',
    'Rock---Arena Rock',
    'Rock---Art Rock',
    'Rock---Atmospheric Black Metal',
    'Rock---Avantgarde',
    'Rock---Beat',
    'Rock---Black Metal',
    'Rock---Blues Rock',
    'Rock---Brit Pop',
    'Rock---Classic Rock',
    'Rock---Coldwave',
    'Rock---Country Rock',
    'Rock---Crust',
    'Rock---Death Metal',
    'Rock---Deathcore',
    'Rock---Deathrock',
    'Rock---Depressive Black Metal',
    'Rock---Doo Wop',
    'Rock---Doom Metal',
    'Rock---Dream Pop',
    'Rock---Emo',
    'Rock---Ethereal',
    'Rock---Experimental',
    'Rock---Folk Metal',
    'Rock---Folk Rock',
    'Rock---Funeral Doom Metal',
    'Rock---Funk Metal',
    'Rock---Garage Rock',
    'Rock---Glam',
    'Rock---Goregrind',
    'Rock---Goth Rock',
    'Rock---Gothic Metal',
    'Rock---Grindcore',
    'Rock---Grunge',
    'Rock---Hard Rock',
    'Rock---Hardcore',
    'Rock---Heavy Metal',
    'Rock---Indie Rock',
    'Rock---Industrial',
    'Rock---Krautrock',
    'Rock---Lo-Fi',
    'Rock---Lounge',
    'Rock---Math Rock',
    'Rock---Melodic Death Metal',
    'Rock---Melodic Hardcore',
    'Rock---Metalcore',
    'Rock---Mod',
    'Rock---Neofolk',
    'Rock---New Wave',
    'Rock---No Wave',
    'Rock---Noise',
    'Rock---Noisecore',
    'Rock---Nu Metal',
    'Rock---Oi',
    'Rock---Parody',
    'Rock---Pop Punk',
    'Rock---Pop Rock',
    'Rock---Pornogrind',
    'Rock---Post Rock',
    'Rock---Post-Hardcore',
    'Rock---Post-Metal',
    'Rock---Post-Punk',
    'Rock---Power Metal',
    'Rock---Power Pop',
    'Rock---Power Violence',
    'Rock---Prog Rock',
    'Rock---Progressive Metal',
    'Rock---Psychedelic Rock',
    'Rock---Psychobilly',
    'Rock---Pub Rock',
    'Rock---Punk',
    'Rock---Rock & Roll',
    'Rock---Rockabilly',
    'Rock---Shoegaze',
    'Rock---Ska',
    'Rock---Sludge Metal',
    'Rock---Soft Rock',
    'Rock---Southern Rock',
    'Rock---Space Rock',
    'Rock---Speed Metal',
    'Rock---Stoner Rock',
    'Rock---Surf',
    'Rock---Symphonic Rock',
    'Rock---Technical Death Metal',
    'Rock---Thrash',
    'Rock---Twist',
    'Rock---Viking Metal',
    'Rock---Yé-Yé',
    'Stage & Screen---Musical',
    'Stage & Screen---Score',
    'Stage & Screen---Soundtrack',
    'Stage & Screen---Theme'
];

const tzanetakis_GENRES = [
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


const BINARY_MOOD_LABELS = ['happy', 'not happy'];

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
 * Type guard to check if a model config is a single-step configuration.
 */
export function isSingleStepModel(config: ModelConfig): config is SingleStepModelConfig {
    return typeof config === 'object' && config !== null && 'modelUrl' in config;
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
 * @param explicitType - Optional explicit architecture type (overrides URL detection)
 * @returns The detected architecture type
 */
export function detectModelArchitecture(
    modelUrl: string,
    explicitType?: ModelArchitecture
): ModelArchitecture {
    // Use explicit type if provided
    if (explicitType) return explicitType;

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
 * Detects which genre list to use based on the model URL.
 * Different genre models were trained on different datasets with different taxonomies:
 *
 * Model path keywords → Genre list:
 * - 'jamendo' → JAMENDO_GENRES (MTG Jamendo dataset)
 * - 'discogs400' or 'discogs' → DISCOGS400_GENRES (Discogs taxonomy)
 * - 'tzanetakis' → tzanetakis_GENRES (GTZAN 10-class dataset)
 * - 'mtt_musicnn' or 'mtt' → MTT_MUSICNN (MagnaTagATune tags)
 *
 * @param modelUrl - URL to the genre model file
 * @param explicitType - Optional explicit genre list type (overrides URL detection)
 * @returns The detected genre list type
 */
export function detectGenreListType(
    modelUrl: string,
    explicitType?: GenreListType
): GenreListType {
    // Use explicit type if provided
    if (explicitType) return explicitType;

    const url = modelUrl.toLowerCase();

    // Check for specific model identifiers in order of specificity

    // MTG Jamendo genre models
    if (url.includes('jamendo')) {
        return 'jamendo';
    }

    // Discogs 400 genre models - check for discogs400 first, then generic discogs
    if (url.includes('discogs400') || url.includes('discogs')) {
        return 'discogs400';
    }

    // GTZAN Tzanetakis models (classic 10-genre dataset)
    if (url.includes('tzanetakis')) {
        return 'tzanetakis';
    }

    // MTT (MagnaTagATune) with MusiCNN
    if (url.includes('mtt_musicnn')) {
        return 'mtt_musicnn';
    }

    // Default to jamendo as it's the middle size
    return 'jamendo';
}

/**
 * Gets the genre labels array for a given genre list type.
 *
 * @param genreType - The genre list type
 * @returns Array of genre label strings
 */
export function getGenreLabels(genreType: GenreListType): string[] {
    switch (genreType) {
        case 'jamendo':
            return JAMENDO_GENRES;
        case 'discogs400':
            return DISCOGS400_GENRES;
        case 'tzanetakis':
            return tzanetakis_GENRES;
        case 'mtt_musicnn':
            return MTT_MUSICNN;
        default:
            return DISCOGS400_GENRES;
    }
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
    // SingleStepModelConfig
    return config.modelUrl;
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

/**
 * Default model configurations using Arweave-hosted models.
 * These work out-of-the-box without any local model files.
 *
 * @example
 * import { MusicClassifier, DEFAULT_ARWEAVE_MODELS } from 'playlist-data-engine';
 *
 * const classifier = new MusicClassifier({
 *     models: DEFAULT_ARWEAVE_MODELS
 * });
 */
export const DEFAULT_ARWEAVE_MODELS = {
    genre: {
        embedding: 'https://arweave.net/tVO0RIu2Ly_Di5cZccw_wB3x6Vs_2KSqxhl8bdhhimE/model.json',
        classifier: 'https://arweave.net/ZY-GSfMe7crJUITAtHITcoLCNfNWVP1HMwywivZ_LAQ/model.json',
        embeddingType: 'effnet' as ModelArchitecture,
        classifierType: 'discogs400' as GenreListType
    },
    mood: {
        embedding: 'https://arweave.net/tVO0RIu2Ly_Di5cZccw_wB3x6Vs_2KSqxhl8bdhhimE/model.json',
        classifier: 'https://arweave.net/BUXf3AoFuIsrNDkV2hW6BhiwSVTuFllWOUQv5mu6qQ8/model.json',
        embeddingType: 'effnet' as ModelArchitecture
    },
    danceability: {
        modelUrl: 'https://turbo-gateway.com/nX9KX1OVhEaT1dStNcsRiZKCQTWuHjAMl4MWprIFyZU/model.json',
        modelType: 'musicnn' as ModelArchitecture
    }
} as const;

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
                genre: DEFAULT_ARWEAVE_MODELS.genre,
                mood: DEFAULT_ARWEAVE_MODELS.mood,
                // Single-step architecture: VGGish model handles everything internally
                danceability: DEFAULT_ARWEAVE_MODELS.danceability,
                // Voice and acoustic are optional - user can provide either format
                ...options.models
            },
            topN: 5,
            threshold: 0.05,
            cacheEmbeddings: true, // Enable embedding caching by default (reuses shared embedding)
            ...options
        };
    }

    //     const DEFAULT_MODELS = {
    //     genre: {
    //         embedding: 'https://turbo-gateway.com/tVO0RIu2Ly_Di5cZccw_wB3x6Vs_2KSqxhl8bdhhimE/model.json',
    //         classifier: 'https://turbo-gateway.com/ZY-GSfMe7crJUITAtHITcoLCNfNWVP1HMwywivZ_LAQ/model.json',
    //         embeddingType: 'effnet' as ModelArchitecture,
    //         classifierType: 'discogs400' as GenreListType
    //     },
    //     mood: {
    //         embedding: 'https://turbo-gateway.com/tVO0RIu2Ly_Di5cZccw_wB3x6Vs_2KSqxhl8bdhhimE/model.json',
    //         classifier: 'https://turbo-gateway.com/BUXf3AoFuIsrNDkV2hW6BhiwSVTuFllWOUQv5mu6qQ8/model.json',
    //         embeddingType: 'effnet' as ModelArchitecture
    //         // classifierType not needed - mood always uses jamendo labels
    //     },
    //     danceability: {
    //         modelUrl: 'https://turbo-gateway.com/nX9KX1OVhEaT1dStNcsRiZKCQTWuHjAMl4MWprIFyZU/model.json',
    //         modelType: 'musicnn' as ModelArchitecture
    //         // Always uses danceability-musicnn-msd-2, fixed labels
    //     }
    // };

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

        // Create vggish extractor (64 mel bands) for VGGish-based models
        const vggishExtractor = new modelModule.EssentiaTFInputExtractor(
            this.essentiaWASM,
            'vggish'
        );
        this.extractors.set('vggish', vggishExtractor);

        this.initialized = true;
    }

    /**
     * Loads a TensorFlow.js GraphModel with retry logic for network resilience.
     *
     * This method handles transient network failures (common with remote URLs
     * like Arweave) by retrying with exponential backoff.
     *
     * @param modelUrl - URL to the model file
     * @param maxRetries - Maximum number of retry attempts (default: 3)
     * @param baseDelayMs - Base delay for exponential backoff in ms (default: 1000)
     * @returns Promise resolving to the loaded GraphModel
     */
    private async loadModelWithRetry(
        modelUrl: string,
        maxRetries: number = 3,
        baseDelayMs: number = 1000
    ): Promise<tf.GraphModel> {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await tf.loadGraphModel(modelUrl);
            } catch (error) {
                lastError = error as Error;
                const errorMessage = String(error).toLowerCase();

                // Check if this is a transient network error that might succeed on retry
                const isTransient =
                    errorMessage.includes('fetch') ||
                    errorMessage.includes('network') ||
                    errorMessage.includes('timeout') ||
                    errorMessage.includes('failed to fetch') ||
                    errorMessage.includes('networkerror');

                // If not transient or we've exhausted retries, throw immediately
                if (!isTransient || attempt === maxRetries - 1) {
                    throw error;
                }

                // Calculate exponential backoff delay: 1s, 2s, 4s
                const delay = baseDelayMs * Math.pow(2, attempt);
                console.warn(
                    `[MusicClassifier] Model load failed (attempt ${attempt + 1}/${maxRetries}), ` +
                    `retrying in ${delay}ms...`,
                    { modelUrl, error: String(error) }
                );

                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        throw lastError;
    }

    /**
     * Initializes an Essentia model with retry logic for network resilience.
     *
     * Essentia models (TensorflowMusiCNN, TensorflowVGGish) have their own
     * initialize() method that loads the model from URL. This wrapper adds
     * retry logic similar to loadModelWithRetry.
     *
     * @param model - Essentia model instance (TensorflowMusiCNN or TensorflowVGGish)
     * @param modelUrl - URL to the model file (for logging)
     * @param maxRetries - Maximum number of retry attempts (default: 3)
     * @param baseDelayMs - Base delay for exponential backoff in ms (default: 1000)
     */
    private async initializeEssentiaModelWithRetry(
        model: any,
        modelUrl: string,
        maxRetries: number = 3,
        baseDelayMs: number = 1000
    ): Promise<void> {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                await model.initialize();
                return; // Success
            } catch (error) {
                const errorMessage = String(error).toLowerCase();

                // Check if this is a transient network error
                const isTransient =
                    errorMessage.includes('fetch') ||
                    errorMessage.includes('network') ||
                    errorMessage.includes('timeout') ||
                    errorMessage.includes('failed to fetch') ||
                    errorMessage.includes('networkerror');

                if (!isTransient || attempt === maxRetries - 1) {
                    throw error;
                }

                const delay = baseDelayMs * Math.pow(2, attempt);
                console.warn(
                    `[MusicClassifier] Essentia model init failed (attempt ${attempt + 1}/${maxRetries}), ` +
                    `retrying in ${delay}ms...`,
                    { modelUrl, error: String(error) }
                );

                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    /**
     * Gets or creates an embedding model instance with caching support.
     *
     * This method implements intelligent model caching to avoid re-loading
     * the same embedding model when it's shared across multiple classifiers
     * (e.g., genre and mood both using discogs-effnet).
     *
     * @param modelUrl - URL to the embedding model
     * @param explicitType - Optional explicit architecture type (overrides URL detection)
     * @returns Promise resolving to the initialized model instance
     */
    private async getEmbeddingModel(modelUrl: string, explicitType?: ModelArchitecture): Promise<any> {
        // Check cache first
        if (this.embeddingModelCache.has(modelUrl)) {
            return this.embeddingModelCache.get(modelUrl);
        }

        // Detect architecture to select the correct model loading strategy
        // Use explicit type if provided, otherwise detect from URL
        const architecture = detectModelArchitecture(modelUrl, explicitType);
        let model: any;

        if (architecture === 'effnet') {
            // EffNet models use raw TensorFlow.js (not Essentia wrapper classes)
            // These are GraphModel format, loaded directly with tf.loadGraphModel()
            // Use retry logic for network resilience (especially for Arweave URLs)
            model = await this.loadModelWithRetry(modelUrl);
        } else if (architecture === 'vggish') {
            // VGGish models use TensorflowVGGish class from Essentia
            if (!this.essentiaModel) {
                throw new Error('Essentia not initialized. Call initializeEssentia() first.');
            }
            model = new this.essentiaModel.TensorflowVGGish(tf, modelUrl);
            await this.initializeEssentiaModelWithRetry(model, modelUrl);
        } else {
            // musicnn and tempocnn models use TensorflowMusiCNN class from Essentia
            if (!this.essentiaModel) {
                throw new Error('Essentia not initialized. Call initializeEssentia() first.');
            }
            model = new this.essentiaModel.TensorflowMusiCNN(tf, modelUrl);
            await this.initializeEssentiaModelWithRetry(model, modelUrl);
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
    /**
     * Creates a wrapper object that combines EssentiaJS algorithms with WASM utility methods.
     * This is needed because EssentiaJS has algorithms (Windowing, Spectrum, etc.) but lacks
     * utility methods like arrayToVector/vectorToArray which are on the WASM module directly.
     */
    private createEssentiaWrapper(): { Windowing: any; Spectrum: any; MelBands: any; UnaryOperator: any; arrayToVector: any; vectorToArray: any } {
        const algorithms = new this.essentiaWASM.EssentiaJS(false);
        return {
            Windowing: algorithms.Windowing.bind(algorithms),
            Spectrum: algorithms.Spectrum.bind(algorithms),
            MelBands: algorithms.MelBands.bind(algorithms),
            UnaryOperator: algorithms.UnaryOperator.bind(algorithms),
            // Utility methods are on the WASM module directly, not on EssentiaJS
            arrayToVector: this.essentiaWASM.arrayToVector,
            vectorToArray: this.essentiaWASM.vectorToArray
        };
    }

    private computeEffnetFeatures(audioSignal: Float32Array): number[][] {
        if (!this.essentiaWASM) {
            throw new Error('Essentia WASM not initialized. Call initializeEssentia() first.');
        }

        // Create Essentia wrapper that combines algorithms with utility methods
        const essentia = this.createEssentiaWrapper();
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
            // Essentia.js Windowing parameters (in order):
            // frame, normalized, size, type, zeroPadding, zeroPhase
            const windowed = essentia.Windowing(
                essentia.arrayToVector(frame),
                true,        // normalized
                frameSize,   // size (must be explicit, not inferred from frame length)
                'hann',      // type
                0,           // zeroPadding
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
                // VGGish uses 64 bands - use dedicated vggish extractor
                const vggishExtractor = this.extractors.get('vggish');
                if (!vggishExtractor) {
                    console.warn('VGGish extractor not initialized, falling back to default 96-band extractor.');
                    return this.extractor.computeFrameWise(audioSignal, 512);
                }
                return vggishExtractor.computeFrameWise(audioSignal, 512);

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
                // Detect genre list from the model path or use explicit type
                const genreModelUrl = isTwoStepModel(genreConfig)
                    ? genreConfig.classifier
                    : genreConfig.modelUrl;

                // Check for explicit genreType in config (works for both single and two-step)
                let genreType: GenreListType;
                if (isTwoStepModel(genreConfig) && genreConfig.classifierType) {
                    genreType = genreConfig.classifierType;
                } else if (isSingleStepModel(genreConfig) && genreConfig.genreType) {
                    genreType = genreConfig.genreType;
                } else {
                    genreType = detectGenreListType(genreModelUrl);
                }

                const genreLabels = getGenreLabels(genreType);

                results.genres = await this.runModelPrediction(
                    genreConfig,
                    audioSignal,
                    genreLabels
                );
                results.primary_genre = results.genres.length > 0 ? results.genres[0].name : "Unknown";
                modelsUsed.push(formatModelForMetadata(genreConfig));
            }

            // 2. Analyze Mood
            if (this.options.models?.mood) {
                const moodConfig = this.options.models.mood;
                // Use binary labels for single-step models, JAMENDO_MOODS for two-step models
                const moodLabels = isSingleStepModel(moodConfig) ? BINARY_MOOD_LABELS : JAMENDO_MOODS;
                results.moods = await this.runModelPrediction(
                    moodConfig,
                    audioSignal,
                    moodLabels
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
        // Use retry logic for network resilience (especially for Arweave URLs)
        const classifier = await this.loadModelWithRetry(classifierUrl);

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
        // Step 1: Detect embedding architecture (use explicit type if provided)
        const architecture = detectModelArchitecture(config.embedding, config.embeddingType);

        // Step 2: Get architecture-specific features
        // CRITICAL: effnet uses 128 mel bands, musicnn uses 96!
        const features = this.getFeaturesForArchitecture(audioSignal, architecture);

        if (features.length === 0) {
            console.warn('No features extracted from audio signal');
            return [];
        }

        // Step 3: Load embedding model (with caching)
        // Pass explicit embeddingType to ensure correct model loading for Arweave URLs
        const embeddingModel = await this.getEmbeddingModel(config.embedding, config.embeddingType);

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
     * Discovers the input names from a TensorFlow.js GraphModel.
     *
     * Different model versions and sources may have different input naming conventions.
     * This method inspects the model's signature to find the correct input names.
     *
     * @param model - TensorFlow.js GraphModel instance
     * @returns Array of input names expected by the model
     */
    private getModelInputNames(model: tf.GraphModel): string[] {
        const inputNames: string[] = [];

        try {
            // Method 1: Check model.inputs (standard TF.js API)
            if (model.inputs && Array.isArray(model.inputs)) {
                for (const input of model.inputs) {
                    if (input && input.name) {
                        inputNames.push(input.name);
                    }
                }
            }

            // Method 2: Check model.executor for signature info
            if (inputNames.length === 0 && (model as any).executor) {
                const executor = (model as any).executor;
                if (executor._signature && executor._signature.inputs) {
                    for (const key of Object.keys(executor._signature.inputs)) {
                        inputNames.push(key);
                    }
                }
            }

            // Method 3: Check model.inputNodes
            if (inputNames.length === 0 && (model as any).inputNodes) {
                const nodes = (model as any).inputNodes;
                if (Array.isArray(nodes)) {
                    inputNames.push(...nodes);
                }
            }

            // Method 4: Check model.metadata
            if (inputNames.length === 0 && (model as any).metadata) {
                const metadata = (model as any).metadata;
                if (metadata.signature && metadata.signature.inputs) {
                    for (const key of Object.keys(metadata.signature.inputs)) {
                        inputNames.push(key);
                    }
                }
            }

            // Method 5: Check model.graph and related properties
            if (inputNames.length === 0) {
                const graphModel = model as any;
                if (graphModel.graph && graphModel.graph.inputs) {
                    for (const key of Object.keys(graphModel.graph.inputs)) {
                        inputNames.push(key);
                    }
                }
            }
        } catch (e) {
            console.warn('[MusicClassifier] Error discovering input names:', e);
        }

        return inputNames;
    }

    /**
     * Runs effnet embedding model inference on mel-spectrogram features.
     *
     * EffNet models are TensorFlow.js GraphModels that expect:
     * - Named inputs discovered dynamically from model signature
     * - Mel-spectrogram shape: [batch=64, mel_bands=128, time_frames=96]
     *
     * The 'bs64' in model name means fixed batch size of 64.
     *
     * @param model - TensorFlow.js GraphModel instance
     * @param features - 2D array of mel-spectrogram frames, shape [frames][128]
     * @returns 2D array of embeddings, shape [segments][embedding_dim]
     */
    private async runEffnetEmbedding(model: tf.GraphModel, features: number[][]): Promise<number[][]> {
        const numBands = features[0]?.length || 128;
        const numFrames = features.length;

        // Discogs-EffNet-bs64 expects exactly [64, 128, 96]
        const batchSize = 64;      // Fixed batch size (bs64)
        const melBands = 128;       // Mel bands
        const timeFrames = 96;      // Time frames per sample

        let embeddings: number[][] = [];

        // We need to create 64 segments of 96 frames each
        // Each segment will be transposed to [128, 96] (mel_bands, time_frames)

        // First, ensure we have at least 96 frames by padding if needed
        let paddedFeatures = features;
        if (numFrames < timeFrames) {
            const zeroFrame = Array(numBands).fill(0);
            while (paddedFeatures.length < timeFrames) {
                paddedFeatures = [...paddedFeatures, zeroFrame];
            }
        }

        // Create 64 segments by sliding window or repeating
        // For short audio, we repeat the available segments
        const segments: number[][][] = [];

        for (let i = 0; i < batchSize; i++) {
            // Use modulo to cycle through available frames if we don't have enough
            const startFrame = (i * timeFrames) % paddedFeatures.length;
            const segment: number[][] = [];

            for (let t = 0; t < timeFrames; t++) {
                const frameIdx = (startFrame + t) % paddedFeatures.length;
                segment.push(paddedFeatures[frameIdx] || Array(numBands).fill(0));
            }
            segments.push(segment);
        }

        // Now build the batch tensor: [64, 128, 96]
        // Transpose each segment from [96, 128] to [128, 96]
        const batchData: number[] = [];

        for (let b = 0; b < batchSize; b++) {
            // Transpose segment: [time_frames][mel_bands] -> [mel_bands][time_frames]
            for (let band = 0; band < melBands; band++) {
                for (let t = 0; t < timeFrames; t++) {
                    batchData.push(segments[b][t]?.[band] ?? 0);
                }
            }
        }

        // Create input tensors
        const melTensor = tf.tensor3d(batchData, [batchSize, melBands, timeFrames]);

        try {
            // Dynamically discover input names from the model signature
            // Different model versions may have different input names
            const inputNames = this.getModelInputNames(model);

            if (inputNames.length === 0) {
                throw new Error('Could not discover model input names');
            }

            // Build the input map based on discovered names
            const inputs: Record<string, tf.Tensor> = {};

            for (const name of inputNames) {
                if (name.includes('melspectrogram') || name.includes('mel') || name.includes('spectrogram')) {
                    inputs[name] = melTensor;
                } else if (name.includes('saver') || name.includes('filename')) {
                    // Some models expect a dummy string tensor
                    inputs[name] = tf.scalar('');
                } else {
                    // Unknown input type - try mel tensor as default for single-input models
                    inputs[name] = melTensor;
                }
            }

            // Use execute() with dynamically discovered named inputs
            const result = model.execute(inputs);

            // Handle different output types (single tensor, array, or named map)
            let output: tf.Tensor;
            if (Array.isArray(result)) {
                // Take the first tensor from array output
                output = result[0];
            } else if (result && typeof result === 'object' && !('data' in result)) {
                // Named output map - take the first value
                const tensors = Object.values(result);
                output = tensors[0] as tf.Tensor;
            } else {
                output = result as tf.Tensor;
            }

            if (!output || typeof output.data !== 'function') {
                throw new Error('Model execution did not return a valid tensor');
            }

            const outputData = await output.data();
            const outputShape = output.shape;

            // Output shape is typically [64, embedding_dim]
            // We average across the batch to get a single embedding
            if (outputShape.length === 2) {
                const embeddingDim = outputShape[1];
                // Average all 64 embeddings
                const avgEmbedding: number[] = [];
                for (let d = 0; d < embeddingDim; d++) {
                    let sum = 0;
                    for (let b = 0; b < batchSize; b++) {
                        sum += outputData[b * embeddingDim + d];
                    }
                    avgEmbedding.push(sum / batchSize);
                }

                // L2 normalize the embedding - this is critical for classifier compatibility
                // The discogs-effnet model outputs unnormalized values that need normalization
                const norm = Math.sqrt(avgEmbedding.reduce((sum, val) => sum + val * val, 0));
                const normalizedEmbedding = norm > 0
                    ? avgEmbedding.map(val => val / norm)
                    : avgEmbedding;

                embeddings.push(normalizedEmbedding);
            } else {
                // Fallback: just use the first embedding
                const rawEmbedding = Array.from(outputData.slice(0, outputShape[outputShape.length - 1]));

                // L2 normalize
                const norm = Math.sqrt(rawEmbedding.reduce((sum, val) => sum + val * val, 0));
                const normalizedEmbedding = norm > 0
                    ? rawEmbedding.map(val => val / norm)
                    : rawEmbedding;

                embeddings.push(normalizedEmbedding);
            }

            output.dispose();

            // Dispose any dynamically created input tensors (except melTensor which is handled below)
            for (const [name, tensor] of Object.entries(inputs)) {
                // Don't dispose melTensor here, it's handled in finally block
                if (tensor !== melTensor) {
                    tensor.dispose();
                }
            }
        } finally {
            melTensor.dispose();
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
     * - Detects if the config is single-step or two-step
     * - Detects the model architecture and uses the correct feature extractor
     * - Calls the appropriate prediction method
     * - Maps predictions to labeled ClassificationTags
     *
     * @param config - Model configuration (SingleStepModelConfig or TwoStepModelConfig)
     * @param audioSignal - Mono audio signal at 16kHz sample rate
     * @param labels - Array of class labels for the model output
     * @returns Promise resolving to array of ClassificationTags sorted by confidence
     *
     * @example
     * // Single-step prediction
     * const tags = await classifier.runModelPrediction(
     *     { modelUrl: '/models/genre-classifier.json', modelType: 'musicnn' },
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
            // Single-step architecture
            const architecture = detectModelArchitecture(config.modelUrl, config.modelType);
            const features = this.getFeaturesForArchitecture(audioSignal, architecture);
            predictions = await this.predictWithModel(config.modelUrl, features);
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

        // Create and initialize the TensorFlow model with retry logic
        const model = new this.essentiaModel!.TensorflowMusiCNN(tf, modelUrl);
        await this.initializeEssentiaModelWithRetry(model, modelUrl);

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
            name: labels[index] || `unknown_${index}`,
            confidence: prob
        }))
            .sort((a, b) => b.confidence - a.confidence)
            .filter(tag => tag.confidence >= this.options.threshold!)
            .slice(0, this.options.topN);
    }
}
