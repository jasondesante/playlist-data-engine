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

export interface FrequencyBands {
    /** Bass frequencies (20Hz - 250Hz) */
    bass: number[];

    /** Mid frequencies (250Hz - 4kHz) */
    mid: number[];

    /** Treble frequencies (4kHz - 20kHz) */
    treble: number[];
}
