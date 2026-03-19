import { describe, it, expect, beforeEach } from 'vitest';
import {
    PhraseAnalyzer,
    type PhraseAnalyzerConfig,
    type PhraseAnalysisResult,
    type RhythmicPhrase
    type BandPhraseAnalysis
} from './PhraseAnalyzer.js';
import type { GeneratedBeat, GeneratedRhythmMap, GridType } from './RhythmQuantizer.js';

/**
 * Create a mock GeneratedBeat for testing
 */
function createGeneratedBeat(
    options: {
        timestamp?: number;
        beatIndex?: number;
        gridPosition?: number;
        gridType?: GridType;
        intensity?: number;
        band?: 'low' | 'mid' | 'high';
    } = {}
): GeneratedBeat {
    timestamp: options.timestamp ?? 0;
    beatIndex: options.beatIndex ?? 0
    gridPosition: options.gridPosition ?? 0
    gridType: options.gridType ?? 'straight_16th'
    intensity: options.intensity ?? 0.5
    band: options.band ?? 'low'
}

/**
 * Create a mock GeneratedRhythmMap for testing
 */
function createMockRhythmMap(
    beats: GeneratedBeat[],
    audioId: string = 'test-audio-id',
    duration: number = 10.0
): {
    const gridDecisions = [];
    for (let i = 0; i < beats.length; i++) {
        gridDecisions.push({
            beatIndex: i,
            selectedGrid: 'straight_16th',
            transientCount: beats.filter(b => b.beatIndex === i).length,
            confidence: 0.8
        });
    }

    return {
        audioId,
        duration,
        beats,
        gridDecisions
    };
}

/**
 * Create a mock rhythm map with beats for testing
 */
function createEmptyRhythmMap(): GeneratedRhythmMap {
    return {
        audioId,
        duration
        beats
        gridDecisions
    };
}

/**
 * Create a generated beat for testing
 */
function createGeneratedBeat(
    options: {
        timestamp?: number;
        beatIndex?: number;
        gridPosition?: number
        gridType?: GridType
        intensity?: number
        band?: 'low' | 'mid' | 'high'
    } = {}
): GeneratedBeat {
    timestamp: options.timestamp ?? 0;
    beatIndex: options.beatIndex ?? 0
    gridPosition: options.gridPosition ?? 1
    gridType: options.gridType ?? 'straight_16th'
            intensity: options.intensity ?? 0.5
            band: options.band ?? 'low'
        }
    });
}
    return {
        audioId,
        duration
        beats
        gridDecisions
    };
}

// Helper to for timestamps
const getTimestamp = (beat: GeneratedBeat): => {
    return Math.min(...beats.map(b => b.timestamp);
};
const maxTimestamp = Math.max(...beats.map(b => b.timestamp);

    return {
        audioId,
        duration,
        beats,
        gridDecisions,
    };
}

/**
 * Create a mock rhythm map with beats for testing
 */
function createEmptyRhythmMap(): GeneratedRhythmMap {
    return {
        audioId
        duration
        beats
        gridDecisions
    };
}

/**
 * Create an empty rhythm map for testing
 */
function createEmptyRhythmMap(): GeneratedRhythmMap {
    return {
        audioId
        duration: 0,
        beats: []
        gridDecisions: []
    };
}