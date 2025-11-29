# Playlist Data Engine

A serverless TypeScript library for parsing music playlists and generating D&D 5e-inspired characters from audio analysis.

## Features

### Phase 0: Foundation (MVP) ✅

- **Playlist Parsing**: Parse raw JSON playlists with priority-based metadata extraction
- **Audio Analysis**: "Triple Tap" FFT analysis for bass/mid/treble dominance
- **Character Generation**: Generate deterministic D&D 5e characters from audio profiles
- **Type Safety**: Full TypeScript support with Zod validation

## Installation

```bash
npm install
```

## Quick Start

```typescript
import { PlaylistParser, AudioAnalyzer, CharacterGenerator } from './src/index.js';

// Parse a playlist
const parser = new PlaylistParser();
const playlist = await parser.parse(rawPlaylistData);

// Analyze audio
const analyzer = new AudioAnalyzer({ includeAdvancedMetrics: true });
const audioProfile = await analyzer.extractSonicFingerprint(track.audio_url);

// Generate character
const character = CharacterGenerator.generate(
  track.seed,
  audioProfile,
  'Character Name'
);

console.log(character);
```

## API

### PlaylistParser

Parses raw playlist JSON into standardized `ServerlessPlaylist` objects.

**Priority Queues:**
- Audio: `mp3 > lossy > audio_url > lossless > animation_url`
- Image: `image_small > image > image_large > image_thumb`
- Name: `name > title`
- Artist: `artist > created_by > minter`

### AudioAnalyzer

Analyzes audio files using the "Triple Tap" strategy (5%, 40%, 70% positions).

**Outputs:**
- Bass dominance (20Hz - 250Hz)
- Mid dominance (250Hz - 4kHz)
- Treble dominance (4kHz - 20kHz)
- Average amplitude
- Optional: spectral centroid, spectral rolloff, zero crossing rate

### CharacterGenerator

Generates D&D 5e characters with:
- Deterministic race selection from seed
- Class suggestion based on audio profile
- Ability scores mapped from frequency analysis
- Racial bonuses and traits

## Development

```bash
# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Type check
npm run type-check

# Development server
npm run dev
```

## Project Structure

```
src/
├── core/
│   ├── types/          # TypeScript interfaces
│   ├── parser/         # Playlist parsing
│   ├── analysis/       # Audio analysis
│   └── generation/     # Character generation
├── utils/              # Utilities (hash, random, validators)
└── index.ts            # Public API

tests/
├── unit/               # Unit tests
├── integration/        # Integration tests
└── fixtures/           # Test data
```

## Roadmap

- **Phase 1**: Visual analysis & character naming
- **Phase 2**: Advanced character features (skills, spells, equipment)
- **Phase 3**: Progression system (XP, leveling)
- **Phase 4**: Environmental sensors
- **Phase 5**: Gaming platform integration
- **Phase 6**: Combat system (optional)

## License

MIT
