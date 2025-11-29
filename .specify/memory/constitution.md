<!--
Sync Impact Report:
- Version change: 0.0.0 -> 1.0.0
- List of modified principles: Defined all principles based on Engine Design Document.
- Added sections: Data Model, Development Workflow.
- Removed sections: None.
- Templates requiring updates: None (initial creation).
- Follow-up TODOs: None.
-->
# Playlist Data Engine Constitution

## Core Principles

### I. Standalone Core
The "Core" is designed as a standalone **npm package** or module (`@audio-alchemist/core`). It handles data ingestion, parsing, audio signal processing, procedural generation logic, and environmental sensor integration. It knows nothing about the game's UI, React state, or visuals—it only returns **Data**.

### II. Deterministic Generation
We use a **Deterministic Seed** derived from the blockchain data in the `PlaylistTrack` to drive deterministic aspects of character generation including Race, Starting Class, Appearance, and certain Base Modifiers. This ensures the "Soul" of the NFT remains constant, regardless of metadata updates.

### III. Strict Extraction Logic
When constructing the `PlaylistTrack` object from the raw input, the Engine **MUST** follow strictly defined priority queues. It stops at the first valid, non-empty string found. This applies to Audio, Image, Name, and Artist extraction.

### IV. Lightweight Analysis
We do not analyze the entire file. We do not determine BPM via heavy computation. We use a lightweight **Spectrum Scanner** with a "Triple Tap" strategy (Intro, Meat, Peak) to get a fingerprint of the song without downloading the entire file immediately.

### V. Privacy-First Sensors
The engine provides **optional** sensor integration hooks (Geolocation, Motion, Weather, Light) that allow games to incorporate real-world context. All sensor data is opt-in and respects user privacy. No data storage without consent.

## Data Model

### Core Interfaces
- **ServerlessPlaylist**: The container for the playlist, containing metadata and an array of tracks.
- **PlaylistTrack**: The single source of truth for a track, merging Blockchain Data (Outer Shell) with Parsed Metadata (Inner Core).
- **AudioProfile**: The output of the audio analysis, containing frequency dominance and average amplitude.
- **CharacterSheet**: The D&D 5e-inspired character object generated from the audio profile and seed.

### Parsing Pipeline
The `PlaylistParser` iterates through raw tracks, parses metadata, maps outer shell data, runs extraction logic, merges attributes, and validates the audio URL.

## Development Workflow

### Testing & Quality
- **Test-Driven Development**: Write tests for extraction logic and procedural generation before implementation.
- **Semantic Versioning**: Follow SemVer for the package.
- **Code Quality**: Ensure strict typing (TypeScript) and clean interfaces.

## Governance

### Rules
- This Constitution supersedes all other practices.
- Amendments require documentation, approval, and a migration plan.
- All PRs/reviews must verify compliance with these principles.

**Version**: 1.0.0 | **Ratified**: 2025-11-29 | **Last Amended**: 2025-11-29
