# Procedural Level Generation - Implementation Plans

> **Note**: This plan has been split into two focused documents for better organization and independent implementation.

## Plan Overview

The procedural level generation system has been divided into two complementary plans:

### 1. [Procedural Rhythm Generation](procedural-rhythm-generation.md)
**Focus**: Automatically generating interesting subdivision patterns from audio analysis

- Multi-band transient detection
- Rhythm extraction and scoring
- Subdivision pattern generation
- 4 output streams (bass/mid/high/composite)
- Difficulty-based density control

**Output**: `GeneratedRhythm` with subdivided beat maps

### 2. [Pitch Detection & Button Mapping](pitch-detection-button-mapping.md)
**Focus**: Extracting melody information and mapping to button patterns

- YIN pitch detection algorithm
- Melody contour analysis
- Key detection hints
- 3 pitch-to-key mapping strategies
- Button pattern vocabulary
- Full level orchestration

**Output**: `GeneratedLevel` with complete playable beat maps

---

## Pipeline Architecture

```
Audio → Beat Detection → Interpolation → Unified Beat Map
                                          ↓
                              ┌───────────────────────┐
                              │  PLAN 1: Rhythm       │
                              │  Multi-Band Analysis  │
                              │  Transient Detection  │
                              │  Subdivision Gen      │
                              └───────────────────────┘
                                          ↓
                              GeneratedRhythm
                              (4 streams: bass/mid/high/composite)
                                          ↓
                              ┌───────────────────────┐
                              │  PLAN 2: Buttons      │
                              │  Pitch Detection      │
                              │  Melody Analysis      │
                              │  Button Mapping       │
                              └───────────────────────┘
                                          ↓
                              GeneratedLevel
                              (Complete playable beat map)
```

---

## Implementation Order

1. **Start with Plan 1** (Rhythm Generation)
   - Core foundation for procedural generation
   - Can be used independently for rhythm-only visualization
   - No dependencies on Plan 2

2. **Then Plan 2** (Pitch & Buttons)
   - Builds on Plan 1's output
   - Adds melody-aware button patterns
   - Creates complete playable levels

---

## Shared Concepts

Both plans share these architectural decisions:

- **Separation of concerns**: Rhythm (WHEN) vs Buttons (WHAT)
- **Multi-band analysis**: Using frequency bands for different purposes
- **Difficulty presets**: easy/medium/hard with configurable parameters
- **Deterministic generation**: Seed-based reproducibility
- **4 output streams**: bass/mid/high/composite for flexibility

---

## Documentation Requirements

Both plans require updates to:
- `DATA_ENGINE_REFERENCE.md` - API documentation and usage examples
- `BEAT_DETECTION.md` - Algorithm explanations and technical details
