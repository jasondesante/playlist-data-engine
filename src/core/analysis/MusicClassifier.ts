import type {
    MusicClassificationProfile,
    ClassificationTag,
    VibeMetrics
} from '../types/AudioProfile.js';

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

const JAMENDO_MOODS = [
    "action", "adventure", "advertising", "background", "ballad", "calm", "children", "christmas", "commercial", "cool",
    "corporate", "dark", "deep", "documentary", "drama", "dramatic", "dream", "emotional", "energetic", "epic",
    "fast", "film", "fun", "funny", "game", "groovy", "happy", "heavy", "holiday", "hopeful",
    "inspiring", "love", "meditative", "melancholic", "melodic", "motivational", "movie", "nature", "nostalgic", "party",
    "peaceful", "positive", "relaxing", "retro", "romantic", "sad", "scary", "science", "sea", "sentimental",
    "serene", "sexy", "space", "sport", "summer", "suspense", "trailer", "travel", "upbeat", "uplifting",
    "video", "war"
];

export class MusicClassifier {
    private options: MusicClassifierOptions;
    private essentiaModule: any = null;

    constructor(options: MusicClassifierOptions = {}) {
        this.options = {
            models: {
                genre: 'https://cdn.jsdelivr.net/gh/MTG/essentia.js/examples/models/mtg_jamendo_genre/model.json',
                mood: 'https://cdn.jsdelivr.net/gh/MTG/essentia.js/examples/models/mtg_jamendo_moodtheme/model.json',
                danceability: 'https://cdn.jsdelivr.net/gh/MTG/essentia.js/examples/models/danceability/model.json',
                ...options.models
            },
            topN: 5,
            threshold: 0.05,
            ...options
        };
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

            const modelsUsed: string[] = [];
            const results: Partial<MusicClassificationProfile> = {
                genres: [],
                moods: [],
                mood_tags: [],
                vibe_metrics: {}
            };

            // 1. Analyze Genre
            if (this.options.models?.genre) {
                const genrePredictions = await this.predictWithModel(this.options.models.genre, audioUrl, audioCtx);
                results.genres = this.mapPredictions(genrePredictions, JAMENDO_GENRES);
                results.primary_genre = results.genres.length > 0 ? results.genres[0].name : "Unknown";
                modelsUsed.push(this.options.models.genre);
            }

            // 2. Analyze Mood
            if (this.options.models?.mood) {
                const moodPredictions = await this.predictWithModel(this.options.models.mood, audioUrl, audioCtx);
                results.moods = this.mapPredictions(moodPredictions, JAMENDO_MOODS);
                results.mood_tags = results.moods.slice(0, 3).map(m => m.name);
                modelsUsed.push(this.options.models.mood);
            }

            // 3. Analyze Vibe (Danceability)
            if (this.options.models?.danceability) {
                const dancePredictions = await this.predictWithModel(this.options.models.danceability, audioUrl, audioCtx);
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
                    frames_analyzed: 0,
                    duration_analyzed: audioBuffer.duration,
                    analyzed_at: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error("Music analysis failed:", error);
            throw error;
        }
    }

    private async predictWithModel(modelUrl: string, audioUrl: string, audioCtx: AudioContext): Promise<number[]> {
        const extractor = new this.essentiaModule.EssentiaModel.Extractor(
            this.essentiaModule.Essentia,
            modelUrl,
            audioCtx,
            false
        );
        return await extractor.predict(audioUrl, false);
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

    private async initializeEssentia() {
        if (!this.essentiaModule) {
            // @ts-expect-error essentia.js does not have types
            this.essentiaModule = await import('essentia.js');
        }
    }
}
