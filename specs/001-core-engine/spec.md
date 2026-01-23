# Core Data Engine Specification

**Status**: Implementation Complete | **Updated**: 2025-11-29

Transforms music playlists into D&D 5e-inspired RPG characters through audio/visual analysis and deterministic generation.

---

## Features

| # | Feature | Status | Source Files |
|---|---------|--------|--------------|
| 1 | Playlist Parsing | ✅ | `src/core/parser/PlaylistParser.ts`, `MetadataExtractor.ts` |
| 2 | Audio Analysis | ✅ | `src/core/analysis/AudioAnalyzer.ts`, `SpectrumScanner.ts` |
| 3 | Visual Analysis | ✅ | `src/core/analysis/ColorExtractor.ts` |
| 4 | Character Generation | ✅ | `src/core/generation/CharacterGenerator.ts`, `RaceSelector.ts`, `ClassSuggester.ts`, `AbilityScoreCalculator.ts` |
| 5 | Naming | ✅ | `src/core/generation/NamingEngine.ts` |
| 6 | Advanced Character | ✅ | `src/core/generation/SkillAssigner.ts`, `SpellManager.ts`, `EquipmentGenerator.ts`, `AppearanceGenerator.ts` |
| 7 | Environmental Sensors | ✅ | `src/core/sensors/EnvironmentalSensors.ts`, `GeolocationProvider.ts`, `MotionDetector.ts`, `WeatherAPIClient.ts`, `LightSensor.ts` |
| 8 | Gaming Integration | ✅ | `src/core/sensors/GamingPlatformSensors.ts`, `SteamAPIClient.ts`, `DiscordRPCClient.ts` |
| 9 | Progression | ✅ | `src/core/progression/XPCalculator.ts`, `SessionTracker.ts`, `LevelUpProcessor.ts`, `MasterySystem.ts` |
| 10 | Combat | ✅ | `src/core/combat/CombatEngine.ts`, `InitiativeRoller.ts`, `AttackResolver.ts`, `SpellCaster.ts`, `DiceRoller.ts` |

---

## Core Data Types

See `src/core/types/` for complete TypeScript definitions.

### AudioProfile (`src/core/types/AudioProfile.ts`)
```typescript
interface AudioProfile {
  bass_dominance: number;      // 0.0 - 1.0
  mid_dominance: number;       // 0.0 - 1.0
  treble_dominance: number;    // 0.0 - 1.0
  average_amplitude: number;   // 0.0 - 1.0
  spectral_centroid?: number;  // Optional advanced metrics
  spectral_rolloff?: number;
  zero_crossing_rate?: number;
  color_palette?: ColorPalette;
  analysis_metadata: {
    duration_analyzed: number;
    full_buffer_analyzed: boolean;
    sample_positions: number[];
    analyzed_at: string;
  };
}
```

### ColorPalette (`src/core/types/ColorPalette.ts`)
```typescript
interface ColorPalette {
  primary: string;
  secondary: string;
  tertiary: string;
  background: string;
  text: string;
  isMonochrome: boolean;
  brightness: number;  // 0-1
  saturation: number;  // 0-1
  colors: string[];    // Full palette array
}
```

### CharacterSheet (`src/core/types/Character.ts`)
```typescript
type Race = 'Human' | 'Elf' | 'Dwarf' | 'Halfling' | 'Dragonborn' |
            'Gnome' | 'Half-Elf' | 'Half-Orc' | 'Tiefling';

type Class = 'Barbarian' | 'Bard' | 'Cleric' | 'Druid' | 'Fighter' |
             'Monk' | 'Paladin' | 'Ranger' | 'Rogue' | 'Sorcerer' |
             'Warlock' | 'Wizard';

interface CharacterSheet {
  name: string;
  race: Race;
  class: Class;
  level: number;  // 1-20
  ability_scores: AbilityScores;  // STR/DEX/CON/INT/WIS/CHA
  ability_modifiers: AbilityScores;
  proficiency_bonus: number;
  hp: { current: number; max: number; temp: number; };
  armor_class: number;
  initiative: number;
  speed: number;
  skills: Record<Skill, ProficiencyLevel>;  // 18 skills
  saving_throws: Record<Ability, boolean>;
  racial_traits: string[];
  class_features: string[];
  spells?: { spell_slots; known_spells; cantrips; };
  equipment?: { weapons; armor; items; totalWeight; equippedWeight; };
  appearance?: { body_type; skin_tone; hair_style; hair_color; eye_color; facial_features; };
  xp: { current: number; next_level: number; };
  seed: string;
  generated_at: string;
}
```

### Playlist Types (`src/core/types/Playlist.ts`)
```typescript
interface ServerlessPlaylist {
  name: string;
  description?: string;
  image: string;
  creator: string;
  genre?: string;
  tags?: string[];
  tracks: PlaylistTrack[];
}

interface PlaylistTrack {
  id: string;              // e.g. "ethereum-0xContract-1"
  uuid: string;
  playlist_index: number;
  chain_name: string;      // "ethereum", "optimism", "AR"
  token_address?: string;  // Not present for AR chain
  token_id?: string;       // Not present for AR chain
  tx_id?: string;          // Arweave transaction ID
  platform: string;
  title: string;
  artist: string;
  image_url: string;
  audio_url: string;
  duration: number;
  genre: string;
  tags: string[];
}
```

### Environmental Types (`src/core/types/Environmental.ts`)
```typescript
type BiomeType = 'urban' | 'forest' | 'desert' | 'mountain' | 'valley' |
                 'water' | 'tundra' | 'plains' | 'jungle' | 'swamp' |
                 'taiga' | 'savanna';

interface EnvironmentalContext {
  geolocation?: GeolocationData;
  motion?: MotionData;
  weather?: WeatherData;
  light?: LightData;
  biome?: BiomeType;
  timestamp: number;
  environmental_xp_modifier?: number;
}
```

### Progression Types (`src/core/types/Progression.ts`)
```typescript
interface GamingContext {
  isActivelyGaming: boolean;
  platformSource: 'steam' | 'none';  // Discord RPC cannot detect games
  currentGame?: {
    name: string;
    source: 'steam';
    genre?: string[];
    sessionDuration?: number;
    partySize?: number;
  };
  totalGamingMinutes: number;
  gamesPlayedWhileListening: string[];
  lastUpdated: number;
}

interface ListeningSession {
  track_uuid: string;
  start_time: number;
  end_time: number;
  duration_seconds: number;
  base_xp_earned: number;
  bonus_xp: number;
  environmental_context?: EnvironmentalContext;
  gaming_context?: GamingContext;
  total_xp_earned: number;
}
```

### Combat Types (`src/core/types/Combat.ts`)
```typescript
interface Combatant {
  id: string;
  character: CharacterSheet;
  initiative: number;
  currentHP: number;
  temporaryHP?: number;
  statusEffects: StatusEffect[];
  isDefeated: boolean;
  actionUsed: boolean;
  bonusActionUsed: boolean;
  reactionUsed: boolean;
}

interface CombatInstance {
  id: string;
  combatants: Combatant[];
  currentTurnIndex: number;
  roundNumber: number;
  environment?: EnvironmentalContext;
  history: CombatAction[];
  isActive: boolean;
  winner?: Combatant;
}
```

---

## Ability Score Mapping

Implemented in `src/core/generation/AbilityScoreCalculator.ts`.

Base scores range 8-15, calculated as:
- **STR**: `8 + (bass_dominance × 7)`
- **DEX**: `8 + (treble_dominance × 7)`
- **CON**: `8 + (average_amplitude × 7)`
- **INT**: `8 + (mid_dominance × 7)`
- **WIS**: `8 + ((1 - |bass - treble|) × 7)` — balanced frequencies
- **CHA**: `8 + ((mid_dominance + average_amplitude) / 2 × 7)`

Racial bonuses applied after (via `applyRacialBonuses()`), capped at 20. |

---

## XP Modifiers

Implemented in `src/core/progression/XPCalculator.ts` and `src/core/sensors/EnvironmentalSensors.ts`.

**Base Rate**: 1 XP per second of listening.

**Environmental Modifiers** (stack additively, capped at 3.0x):
- Motion: Running 1.5x, Walking 1.2x, Driving 1.3x, Stationary 1.0x
- Weather: Storm/Rain 1.4x, Snow 1.3x
- Time: Night 1.25x
- Altitude: ≥2000m adds 0.3x

**Gaming Modifiers** (additive bonuses):
- Active gaming: +25% base
- Genre bonuses: RPG +20%, Action/FPS +15%, Strategy +10%
- Multiplayer (partySize > 1): +15%
- Session duration: Up to +20% for 4+ hours

**Formula**: `base (1 XP/sec) × environmental modifier × gaming modifier` (total capped at 3.0x)

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

## Source Files

### Sensors (8 files)
- `src/core/sensors/DiscordRPCClient.ts` - Discord Rich Presence for music
- `src/core/sensors/MotionDetector.ts` - Device motion/activity detection
- `src/core/sensors/SteamAPIClient.ts` - Steam game detection
- `src/core/sensors/GamingPlatformSensors.ts` - Aggregates Steam + Discord
- `src/core/sensors/EnvironmentalSensors.ts` - Aggregates all environmental sensors
- `src/core/sensors/GeolocationProvider.ts` - GPS location + biome detection
- `src/core/sensors/WeatherAPIClient.ts` - Weather + forecast + moon phase
- `src/core/sensors/LightSensor.ts` - Ambient light detection

### Combat (5 files)
- `src/core/combat/AttackResolver.ts` - Attack/damage resolution
- `src/core/combat/CombatEngine.ts` - Turn-based combat
- `src/core/combat/DiceRoller.ts` - Dice rolling
- `src/core/combat/InitiativeRoller.ts` - Initiative order
- `src/core/combat/SpellCaster.ts` - Spell casting

### Type Definitions (7 files)
- `src/core/types/Environmental.ts` - Weather, geolocation, biome types
- `src/core/types/Progression.ts` - XP, leveling, gaming context
- `src/core/types/Combat.ts` - Combat-related types
- `src/core/types/Character.ts` - Character types
- `src/core/types/Playlist.ts` - Playlist types
- `src/core/types/AudioProfile.ts` - Audio analysis types
- `src/core/types/ColorPalette.ts` - Color types

### Utilities (6 files)
- `src/utils/logger.ts` - Logging system
- `src/utils/sensorDashboard.ts` - Diagnostic dashboard
- `src/utils/random.ts`, `src/utils/constants.ts`, `src/utils/validators.ts`, `src/utils/hash.ts`

### Config (2 files)
- `src/core/config/sensorConfig.ts` - Sensor configuration
- `src/core/config/index.ts` - Module exports

### Tests (27 files)
- Unit: `tests/unit/attackResolver.test.ts`, `tests/unit/discordRPC.test.ts`, `tests/unit/gaming.test.ts`, `tests/unit/sensors.test.ts`, `tests/unit/xpCalculator.test.ts`, etc.
- Integration: `tests/integration/discordRPC.integration.test.ts`, `tests/integration/gamingIntegration.test.ts`, `tests/integration/fullSensorPipeline.test.ts`, etc.
- Mocks: `tests/mocks/browserAPIs.ts` - Browser API mocks for headless testing

---

## How to Use

### Basic Workflow: Playlist → Character

```typescript
import { Pla