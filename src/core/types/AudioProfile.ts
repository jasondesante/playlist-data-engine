/**
 * Audio analysis type definitions
 */

export interface AudioProfile {
    /** Bass dominance (0.0 - 1.0) */
    bass_dominance: number;

    /** Mid-range dominance (0.0 - 1.0) */
    mid_dominance: number;

    /** Treble dominance (0.0 - 1.0) */
    treble_dominance: number;

    /** Average amplitude (0.0 - 1.0) */
    average_amplitude: number;

    /** Advanced metrics (optional) */
    spectral_centroid?: number;
    spectral_rolloff?: number;
    zero_crossing_rate?: number;

    /** Color palette extracted from artwork (optional) */
    color_palette?: ColorPalette;

    /** Analysis metadata */
    analysis_metadata: {
        /** Duration of audio analyzed in seconds */
        duration_analyzed: number;

        /** Whether full buffer was analyzed (true for files < 3s) */
        full_buffer_analyzed: boolean;

        /** Sample positions used (percentages) */
        sample_positions: number[];

        /** Timestamp of analysis */
        analyzed_at: string;
    };

    /** RMS (Root Mean Square) energy (0.0 - 1.0) */
    rms_energy?: number;

    /** Dynamic range (Peak - RMS) (0.0 - 1.0) */
    dynamic_range?: number;
}

/**
 * Event in a full timeline analysis
 */
export interface AudioTimelineEvent {
    timestamp: number;
    duration: number;
    bass: number;
    mid: number;
    treble: number;
    amplitude: number;           // RMS for this segment (kept for backward compatibility)
    rms_energy: number;          // RMS energy for this segment (same as amplitude, for clarity)
    peak: number;                // Peak amplitude for this segment.
    dynamic_range: number;       // Dynamic range within this segment (peak - RMS).
    spectral_centroid: number;   // Frequency brightness measure (always populated)
    spectral_rolloff: number;    // Frequency below which 85% of energy is contained (always populated)
    zero_crossing_rate: number;  // Measure of noisiness/percussiveness (always populated)
}

export interface ColorPalette {
    /** Dominant colors ranked by frequency (hex format) */
    colors: string[];

    /** Primary color (most dominant) */
    primary_color: string;

    /** Secondary color */
    secondary_color?: string;

    /** Accent color */
    accent_color?: string;

    /** Average brightness (0.0 - 1.0) */
    brightness: number;

    /** Average saturation (0.0 - 1.0) */
    saturation: number;

    /** Is the image monochrome? */
    is_monochrome: boolean;
}

/**
 * Frequency bands separated from audio analysis
 *
 * Rebalanced v2 ranges prevent treble dominance:
 * - Bass: 20Hz - 400Hz (380 Hz range, 11% of spectrum)
 * - Mid: 400Hz - 4kHz (3,600 Hz range, 52% of spectrum)
 * - Treble: 4kHz - 14kHz (10,000 Hz range, 37% of spectrum)
 *
 * Previous v1 ranges (imbalanced):
 * - Bass: 20Hz - 250Hz (only 3% of spectrum)
 * - Mid: 250Hz - 4kHz (47% of spectrum)
 * - Treble: 4kHz - 20kHz (200% of spectrum!)
 */
export interface FrequencyBands {
    /** Bass frequencies (20Hz - 400Hz) */
    bass: number[];

    /** Mid frequencies (400Hz - 4kHz) */
    mid: number[];

    /** Treble frequencies (4kHz - 14kHz) */
    treble: number[];
}

/**
 * A detected classification tag (genre, mood, etc) with its confidence score
 */
export interface ClassificationTag {
    /** The name of the tag (e.g. "rock", "happy", "party") */
    name: string;

    /** Confidence score from the ML model (0.0 to 1.0) */
    confidence: number;
}

/**
 * Backward compatibility alias for GenreTag
 */
export type GenreTag = ClassificationTag;

/**
 * Vibe and engagement metrics extracted from audio
 */
export interface VibeMetrics {
    /** Suitability for dancing (0.0 - 1.0) */
    danceability?: number;

    /** Perceived energy level (0.0 - 1.0) */
    energy?: number;

    /** Emotional positivity/happiness (0.0 - 1.0) */
    valence?: number;

    /** How "catchy" or engaging the track is (0.0 - 1.0) */
    engagement?: number;

    /** Likelihood of being acoustic vs electronic (0.0 - 1.0, >0.5 is more electronic) */
    electronic_probability?: number;

    /** Likelihood of being instrumental vs vocal (0.0 - 1.0, >0.5 is more instrumental) */
    instrumental_probability?: number;
}

/**
 * The output profile from the ML-based MusicClassifier
 */
export interface MusicClassificationProfile {
    /** Top detected genres */
    genres: ClassificationTag[];

    /** Top detected moods and themes */
    moods: ClassificationTag[];

    /** Highest confidence genre */
    primary_genre: string;

    /** Semantic mood tags (highest confidence) */
    mood_tags: string[];

    /** High-level vibe metrics */
    vibe_metrics?: VibeMetrics;

    /** Analysis metadata */
    analysis_metadata: {
        /** ML models used in analysis */
        models_used: string[];

        /** Legacy: The primary model used (first in models_used) */
        model_used?: string;

        /** Legacy: Number of frames processed (usually 0) */
        frames_analyzed?: number;

        /** Duration of audio analyzed in seconds */
        duration_analyzed: number;

        /** Timestamp of analysis */
        analyzed_at: string;
    };
}

/**
 * Backward compatibility alias for GenreProfile
 */
export interface GenreProfile extends MusicClassificationProfile { }
