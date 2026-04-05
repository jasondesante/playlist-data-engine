/**
 * Analysis Module
 *
 * Exports all audio analysis utilities.
 */

export { AudioAnalyzer } from './AudioAnalyzer.js';
export { SpectrumScanner } from './SpectrumScanner.js';
export { MusicClassifier } from './MusicClassifier.js';
export { PitchDetector } from './PitchDetector.js';
export { EssentiaPitchDetector, DEFAULT_CREPE_MODEL_URL } from './EssentiaPitchDetector.js';
export type {
    EssentiaPitchAlgorithm,
    EssentiaPitchDetectorConfig,
} from './EssentiaPitchDetector.js';
export { MultiBandAnalyzer } from './MultiBandAnalyzer.js';

// Beat analysis
export * from './beat/index.js';

// Melody contour analysis
export { MelodyContourAnalyzer } from './MelodyContourAnalyzer.js';
export type {
    MelodyContourAnalysisResult,
    MelodyContourAnalyzerConfig,
    DirectionStats,
    IntervalStats,
    IntervalCategory,
    PitchDirection,
    MelodyContour,
    MelodySegment,
    MelodySegmentDirection,
    MelodyContourDirection,
} from './MelodyContourAnalyzer.js';

// Pitch analysis (standalone, no beat dependency)
export { PitchAnalyzer } from './PitchAnalyzer.js';
export type {
    PitchAnalyzerConfig,
    PitchAnalysisProfile,
    PitchContour,
    PitchContourSegment,
    PitchContourSegmentDirection,
    PitchContourDirection,
} from './PitchAnalyzer.js';
