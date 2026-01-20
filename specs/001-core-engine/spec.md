# Core Data Engine Specification

**Status**: Implementation Complete | **Updated**: 2025-11-29

Transforms music playlists into D&D 5e-inspired RPG characters through audio/visual analysis and deterministic generation.

---

## Features

| # | Feature | Status | Key Details |
|---|---------|--------|-------------|
| 1 | Playlist Parsing | ✅ | Arweave/JSON input, priority queues, deterministic seed from `chain-token-tokenId` |
| 2 | Audio Analysis | ✅ | Triple Tap (5%/40%/70%), bass/mid/treble, < 1s per track |
| 3 | Visual Analysis | ✅ | K-means palette extraction, 4 colors, < 200ms |
| 4 | Character Generation | ✅ | 9 races, 12 classes, audio → ability scores, deterministic |
| 5 | Naming | ✅ | 3 formats weighted 50/30/20, title cleaning |
| 6 | Advanced Character | ✅ | 18 skills, proficiencies, spells, equipment, appearance |
| 7 | Environmental Sensors | ✅ | GPS, motion, weather, light, XP modifiers up to 3.0x |
| 8 | Gaming Integration | ✅ | Steam/Discord, genre bonuses, compound modifiers |
| 9 | Progression | ✅ | 1 XP/sec, D&D 5e levels 1-20, mastery system |
| 10 | Combat | ✅ | Turn-based, initiative, attacks, spell casting |

---

## Core Data Types

```typescript
// Audio analysis output
AudioProfile {
  bass_dominance, mid_dominance, treble_dominance, average_amplitude
  spectral_centroid?, spectral_rolloff?, zero_crossing_rate?
  colorPalette?: ColorPalette
}

// Visual analysis output
ColorPalette {
  primary, secondary, tertiary, accent  // hex colors
  brightness, saturation, is_monochrome
}

// Generated character
CharacterSheet {
  name, level, race, class, alignment
  ability_scores (STR/DEX/CON/INT/WIS/CHA)
  skills, spells, equipment, appearance
  listening_sessions, tracks_mastered
}
```

See `src/core/types/` for complete TypeScript definitions.

---

## Ability Score Mapping

| Ability | Audio Source |
|---------|--------------|
| Strength | bass_dominance |
| Dexterity | treble_dominance |
| Constitution | average_amplitude |
| Intelligence | mid_dominance + spectral_centroid |
| Wisdom | balanced frequencies |
| Charisma | mid_dominance + genre |

---

## XP Modifiers

**Environmental**: Running (1.5x), Storm (1.4x), Altitude (1.3x), Night (1.25x)
**Gaming**: Any (+25%), RPG (+20%), Multiplayer (+15%), 4hr+ (+20%)
**Formula**: `base (1 XP/sec) × environmental × gaming` (capped at 3.0x)

---

## Performance Targets

| Operation | Target |
|-----------|--------|
| Parse 50 tracks | < 2s |
| Audio analysis | < 1s/track |
| Color extraction | < 200ms |
| Character generation | < 100ms |
| Level-up | < 50ms |

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Audio 404 | Mark "Unsummonable", exclude |
| Malformed JSON | Skip with error logging |
| Audio < 3s | Analyze entire buffer |
| Sensor denied | Gracefully degrade, no bonuses |
| Rate limited | Exponential backoff + cache |
| Color extraction fails | Return null, continue |

---

## Implementation

**All 6 phases complete**: 114/114 tasks, 426 tests (419 passing)
