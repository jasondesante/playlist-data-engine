/**
 * Analysis Module
 *
 * Exports all audio analysis utilities.
 */

export { AudioAnalyzer } from './AudioAnalyzer.js';
export { SpectrumScanner } from './SpectrumScanner.js';
export { MusicClassifier } from './MusicClassifier.js';
export { PitchDetector } from './PitchDetector.js';
export { EssentiaPitchDetector } from './EssentiaPitchDetector.js';
export type {
    EssentiaPitchAlgorithm,
    EssentiaPitchDetectorConfig,
    CrepeModelVariant,
} from './EssentiaPitchDetector.js';
export { MultiBandAnalyzer } from './MultiBandAnalyzer.js';
export { MultiBandPitchAnalyzer } from './MultiBandPitchAnalyzer.js';
// Multi-band pitch analysis types for button mapping
export type {
    MultiBandPitchAnalysis,
    BandPitchAnalysis,
    BandName,
    MelodyContour,
    MelodySegment,
    MelodySegmentDirection,
    MelodyContourDirection,
    MultiBandPitchAnalyzerConfig,
    PreFilteredBandInput,
    PreFilteredAnalysisConfig,
} from './MultiBandPitchAnalyzer.js';

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
} from './MelodyContourAnalyzer.js';
