# Feature Specification: Core Data Engine

**Feature Branch**: `001-core-engine`  
**Created**: 2025-11-29  
**Updated**: 2025-11-29  
**Status**: Draft  
**Input**: ENGINE_DESIGN_DOCUMENT.md (v2.0)

## Clarifications

### Session 2025-11-29
- Q: Target Environment? → A: Isomorphic design (core logic pure JS), but prototype focuses on Browser implementation.
- Q: Audio Fetch Failures (404)? → A: Exclude track ("Unsummonable").
- Q: Short Audio Files (< 3s)? → A: Analyze the entire buffer.
- Q: Gaming API Access? → A: Steam requires API key, Discord requires OAuth. Both optional features.
- Q: Sensor Permissions? → A: All sensors opt-in with explicit user permission dialogs.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Playlist Ingestion & Parsing (Priority: P0)

As a developer, I want to ingest a raw playlist JSON or Arweave TXID so that I can get a standardized `ServerlessPlaylist` object with clean, usable data.

**Why this priority**: This is the fundamental input mechanism for the engine. Without this, no other features can function.

**Independent Test**: Can be fully tested by providing a sample JSON payload and verifying the output object structure.

**Acceptance Scenarios**:

1. **Given** a raw Arweave playlist JSON, **When** the engine parses it, **Then** it returns a `ServerlessPlaylist` object with all tracks flattened and metadata parsed.
2. **Given** a track with multiple audio sources, **When** the engine parses it, **Then** `audio_url` is populated with the highest priority source (mp3 > lossy > audio_url > lossless).
3. **Given** a track with missing metadata, **When** the engine parses it, **Then** it gracefully handles missing fields without crashing.
4. **Given** a track with stringified metadata, **When** parsed, **Then** JSON.parse is executed and the result is flattened into PlaylistTrack.

---

### User Story 2 - Audio Analysis (Priority: P1)

As a developer, I want to get an `AudioProfile` for each track using a lightweight "Triple Tap" analysis so that I can drive gameplay elements without downloading full files.

**Why this priority**: Essential for the "Audio Alchemist" gameplay mechanics, but dependent on ingestion.

**Independent Test**: Can be tested by mocking audio streams and verifying the frequency analysis output.

**Acceptance Scenarios**:

1. **Given** a valid audio URL, **When** `extractSonicFingerprint` is called, **Then** it returns an `AudioProfile` with bass/mid/treble dominance and average amplitude.
2. **Given** a file that supports range requests, **When** analyzed, **Then** the engine only fetches the required chunks (Intro: 5%, Meat: 40%, Peak: 70%).
3. **Given** a file < 3 seconds, **When** analyzed, **Then** the entire buffer is analyzed instead of using Triple Tap.
4. **Given** advanced metrics are requested, **When** analyzed, **Then** spectral_centroid, spectral_rolloff, and zero_crossing_rate are included.

---

### User Story 3 - Visual Analysis (Priority: P1)

As a developer, I want to extract a color palette from track artwork so that I can use it for character tinting, UI theming, and visual effects.

**Why this priority**: Provides visual theming data that enhances character customization and gameplay aesthetics.

**Independent Test**: Can be tested by providing sample images and verifying the extracted color palette.

**Acceptance Scenarios**:

1. **Given** a track with an image_url, **When** `extractSonicFingerprint` is called with `includeColorPalette: true`, **Then** the AudioProfile includes a ColorPalette with 4 dominant colors.
2. **Given** a monochrome image, **When** analyzed, **Then** the palette's `is_monochrome` flag is set to true.
3. **Given** a vibrant image, **When** analyzed, **Then** brightness and saturation metrics are calculated correctly.

---

### User Story 4 - Character Generation (Priority: P1)

As a developer, I want to generate a deterministic `CharacterSheet` from a track's seed and audio profile so that I can create unique in-game characters.

**Why this priority**: The core value proposition for the game integration.

**Independent Test**: Can be tested by providing fixed seeds/profiles and asserting the output character stats are identical every time.

**Acceptance Scenarios**:

1. **Given** a specific track seed and audio profile, **When** `generateCharacter` is called, **Then** it returns a `CharacterSheet` with Race, Class, and Ability Scores derived from the inputs.
2. **Given** the same input twice, **When** generated, **Then** the output `CharacterSheet` is identical (deterministic).
3. **Given** high bass dominance, **When** character is generated, **Then** Strength and Constitution scores are elevated.
4. **Given** high treble dominance, **When** character is generated, **Then** Dexterity score is elevated.
5. **Given** a deterministic seed, **When** race is selected, **Then** the same race is always chosen for that seed.

---

### User Story 5 - Character Naming Engine (Priority: P2)

As a developer, I want characters to have RPG-style names generated from track metadata so that they feel like authentic game characters.

**Why this priority**: Enhances immersion and character identity.

**Independent Test**: Can be tested by providing track metadata and verifying name format and cleaning logic.

**Acceptance Scenarios**:

1. **Given** a track with title and artist, **When** a name is generated, **Then** it follows one of 3 formats: Class Title (50%), Adjective Construct (30%), or Clan Construct (20%).
2. **Given** a title with brackets like "(Official Video)", **When** cleaned, **Then** the bracketed text is removed.
3. **Given** a title with track numbers like "01 - Song", **When** cleaned, **Then** the track number is removed.
4. **Given** high bass + techno genre, **When** adjective is generated, **Then** it returns "Thumping".

---

### User Story 6 - Advanced Character System (Priority: P2)

As a developer, I want full D&D 5e character features including skills, spells, equipment, and leveling so that I can build deep RPG mechanics.

**Why this priority**: Enables complex gameplay systems and character progression.

**Independent Test**: Can be tested by generating characters and verifying skill proficiencies, spell slots, and equipment match class definitions.

**Acceptance Scenarios**:

1. **Given** a Rogue character, **When** generated, **Then** it has expertise in 2 skills and proficiency in Dexterity saving throws.
2. **Given** a Wizard character, **When** generated, **Then** it has spell slots and a list of known spells.
3. **Given** a character at level 4, **When** generated, **Then** proficiency bonus is +2 and ability score increase is available.
4. **Given** a Dragonborn character, **When** generated, **Then** racial traits include Breath Weapon and Draconic Ancestry.

---

### User Story 7 - Environmental Sensors (Priority: P3)

As a developer, I want to integrate real-world sensor data (GPS, motion, weather, light) so that I can provide location-based and activity-based gameplay bonuses.

**Why this priority**: Adds innovative real-world integration, but is optional for core functionality.

**Independent Test**: Can be tested by mocking sensor data and verifying XP modifier calculations.

**Acceptance Scenarios**:

1. **Given** user permission is granted, **When** `EnvironmentalSensors.requestPermissions()` is called, **Then** it returns which sensors were granted.
2. **Given** user is running (motion sensor), **When** XP is calculated, **Then** a 1.5x multiplier is applied.
3. **Given** weather is thunderstorm, **When** XP is calculated, **Then** a 1.4x multiplier is applied.
4. **Given** user is at high altitude, **When** biome is determined, **Then** it is classified as "mountain".
5. **Given** multiple environmental bonuses, **When** total modifier is calculated, **Then** it is capped at 3.0x.

---

### User Story 8 - Gaming Platform Integration (Priority: P3)

As a developer, I want to detect when users are actively gaming on Steam or Discord so that I can reward them with gaming-based XP bonuses.

**Why this priority**: Encourages music listening during gaming, creating a unique value proposition.

**Independent Test**: Can be tested by mocking Steam/Discord API responses and verifying bonus calculations.

**Acceptance Scenarios**:

1. **Given** Steam API key is provided, **When** `GamingPlatformSensors.startMonitoring()` is called, **Then** it polls Steam for active games.
2. **Given** user is playing an RPG game, **When** gaming bonus is calculated, **Then** a +20% bonus is applied.
3. **Given** user is in a multiplayer party, **When** gaming bonus is calculated, **Then** an additional +15% bonus is applied.
4. **Given** user has been gaming for 4+ hours, **When** session bonus is calculated, **Then** up to +20% is applied.
5. **Given** both environmental and gaming bonuses are active, **When** total XP is calculated, **Then** compound bonuses are applied with a 3.0x cap.

---

### User Story 9 - Character Progression & Leveling (Priority: P2)

As a developer, I want characters to gain XP from listening sessions and level up with proper D&D progression so that users feel rewarded for engagement.

**Why this priority**: Core to the gamification loop and user retention.

**Independent Test**: Can be tested by simulating listening sessions and verifying XP gains and level-ups.

**Acceptance Scenarios**:

1. **Given** a listening session of 300 seconds, **When** XP is calculated, **Then** base XP equals duration in seconds.
2. **Given** a character reaches the XP threshold for level 2, **When** `processLevelUp` is called, **Then** new class features and HP increase are applied.
3. **Given** a character reaches level 4, **When** leveled up, **Then** an ability score increase is available.
4. **Given** a track is listened to 10 times, **When** mastery is checked, **Then** it is marked as mastered and bonus XP is awarded.

---

### User Story 10 - Combat System (Optional) (Priority: P4)

As a developer, I want an optional turn-based combat engine so that I can build tactical combat games with music-generated characters.

**Why this priority**: Advanced feature for developers building full RPG experiences.

**Independent Test**: Can be tested by simulating combat encounters and verifying attack rolls, damage, and turn order.

**Acceptance Scenarios**:

1. **Given** two characters, **When** combat is initiated, **Then** initiative is rolled and turn order is established.
2. **Given** an attacker with +5 attack bonus, **When** an attack is executed, **Then** d20 + 5 is rolled against target AC.
3. **Given** a critical hit (natural 20), **When** damage is calculated, **Then** damage dice are doubled.
4. **Given** a spellcaster, **When** a spell is cast, **Then** spell slots are consumed and effects are applied.

---

## Edge Cases

- What happens when the audio file is inaccessible (404)? → **Track is excluded ("Unsummonable").**
- How does system handle malformed JSON metadata? → **Gracefully skip track with error logging.**
- What happens if the audio file is too short for "Triple Tap" analysis? → **Analyze entire buffer.**
- What if sensor permissions are denied? → **Gracefully degrade, no environmental bonuses.**
- What if Steam/Discord APIs are rate-limited? → **Implement exponential backoff, cache results.**
- What if color palette extraction fails? → **Return null for colorPalette, continue with audio analysis.**
- What if user is both running and gaming? → **Apply compound bonuses with 3.0x cap.**

---

## Requirements *(mandatory)*

### Functional Requirements

#### Core Parsing & Analysis
- **FR-001**: System MUST accept playlist JSON or Arweave TXID as input.
- **FR-002**: System MUST parse metadata strings into JSON objects with error handling.
- **FR-003**: System MUST implement strict priority queues for:
  - Audio: mp3 > lossy > audio_url > lossless > animation_url
  - Image: image_small > image > image_large > image_thumb
  - Name: name > title
  - Artist: artist > created_by > minter
- **FR-004**: System MUST generate a deterministic seed from blockchain data (`chain_name-token_address-token_id`).
- **FR-005**: System MUST perform "Triple Tap" audio analysis (Intro: 5%, Meat: 40%, Peak: 70%). For files < 3s, analyze entire buffer.
- **FR-006**: System MUST validate audio URLs. Tracks with inaccessible audio (404) MUST be marked "Unsummonable" and excluded.

#### Visual Analysis
- **FR-007**: System MUST extract color palette from track artwork using k-means or median cut algorithm.
- **FR-008**: System MUST identify 4 dominant colors ranked by frequency.
- **FR-009**: System MUST calculate brightness, saturation, and monochrome detection.

#### Character Generation
- **FR-010**: System MUST generate D&D 5e-compatible character sheets based on seed and audio profile.
- **FR-011**: System MUST map audio frequencies to ability scores:
  - Strength: bass_dominance
  - Dexterity: treble_dominance
  - Constitution: average_amplitude
  - Intelligence: mid_dominance + spectral_centroid
  - Wisdom: balanced frequencies
  - Charisma: mid_dominance + genre
- **FR-012**: System MUST select race deterministically from seed (9 races).
- **FR-013**: System MUST suggest class based on audio profile (12 classes).
- **FR-014**: System MUST apply racial bonuses to ability scores.
- **FR-015**: System MUST cap ability scores at 20.

#### Character Naming
- **FR-016**: System MUST generate character names using 4 format permutations with weighted probabilities.
- **FR-017**: System MUST clean titles by removing brackets, parentheses, and track numbers.
- **FR-018**: System MUST generate adjectives based on audio profile and genre.

#### Advanced Character Features
- **FR-019**: System MUST implement 18 D&D skills with proficiency levels (none, proficient, expertise).
- **FR-020**: System MUST assign saving throw proficiencies based on class.
- **FR-021**: System MUST generate spell lists and spell slots for spellcasting classes.
- **FR-022**: System MUST provide equipment and inventory management.
- **FR-023**: System MUST generate character appearance (deterministic + dynamic from audio/visual).

#### Environmental Sensors
- **FR-024**: System MUST provide optional sensor integration for Geolocation, Motion, Weather, and Light.
- **FR-025**: System MUST require explicit user permission for all sensors.
- **FR-026**: System MUST detect activity type from motion data (stationary, walking, running, driving).
- **FR-027**: System MUST fetch weather data from external API using GPS coordinates.
- **FR-028**: System MUST calculate environmental XP modifiers based on sensor data.
- **FR-029**: System MUST cap environmental XP modifier at 3.0x.

#### Gaming Platform Integration
- **FR-030**: System MUST integrate with Steam Web API to detect active games.
- **FR-031**: System MUST integrate with Discord Rich Presence to detect gaming activity.
- **FR-032**: System MUST calculate gaming bonuses based on game genre, party size, and session duration.
- **FR-033**: System MUST support compound bonuses (environmental + gaming) with 3.0x cap.

#### Progression System
- **FR-034**: System MUST track listening sessions with timestamps and context.
- **FR-035**: System MUST calculate XP as: base (1 XP/second) * environmental modifier * gaming modifier.
- **FR-036**: System MUST implement D&D 5e XP thresholds for levels 1-20.
- **FR-037**: System MUST award bonus XP for track completion (95%+ listened).
- **FR-038**: System MUST implement track mastery system (threshold-based).
- **FR-039**: System MUST process level-ups with class features, HP increases, and ability score increases.

#### Combat System (Optional)
- **FR-040**: System MAY provide optional turn-based combat engine.
- **FR-041**: Combat engine MUST support initiative rolls, attack rolls, and damage calculation.
- **FR-042**: Combat engine MUST support spell casting with spell slot management.

### Non-Functional Requirements

- **NFR-001**: Core logic MUST be isomorphic (browser + Node.js compatible).
- **NFR-002**: Audio analysis MUST complete in < 1 second for typical 3-minute tracks.
- **NFR-003**: Character generation MUST be near-instantaneous (< 100ms).
- **NFR-004**: Parsing 50 tracks MUST take < 2 seconds (excluding network latency).
- **NFR-005**: Sensor polling MUST be rate-limited to avoid battery drain (default: 5-second intervals).
- **NFR-006**: Gaming platform polling MUST use 60-second intervals with exponential backoff.
- **NFR-007**: All sensor data MUST respect user privacy (no storage without consent).
- **NFR-008**: System MUST gracefully degrade when sensors are unavailable.

### Key Entities *(include if feature involves data)*

See [data-model.md](data-model.md) for comprehensive entity definitions:

- **ServerlessPlaylist**: Container for playlist metadata and tracks
- **PlaylistTrack**: Standardized track object with extracted assets
- **AudioProfile**: Frequency analysis result with optional color palette
- **ColorPalette**: Dominant colors from artwork
- **CharacterSheet**: Full D&D 5e character with stats, skills, spells, equipment
- **EnvironmentalContext**: Real-world sensor data
- **GamingContext**: Steam/Discord gaming activity
- **ListeningSession**: XP tracking with bonuses

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Parsing a playlist with 50 tracks takes under 2 seconds (excluding network latency).
- **SC-002**: Audio analysis completes within 1 second per track (after data fetch).
- **SC-003**: Character generation is 100% deterministic for the same input.
- **SC-004**: Engine handles 100% of valid input formats defined in the design document.
- **SC-005**: Color palette extraction completes within 200ms per image.
- **SC-006**: Character names are generated with proper format distribution (50/30/20%).
- **SC-007**: Environmental sensor integration provides 0% overhead when disabled.
- **SC-008**: Gaming platform integration polls at 60-second intervals with < 100ms processing time.
- **SC-009**: XP calculations are accurate within 1% margin.
- **SC-010**: Level-up processing completes in < 50ms.
- **SC-011**: Combat engine (if implemented) processes turns in < 100ms.
- **SC-012**: All sensor permissions are explicitly requested and respected.
- **SC-013**: System gracefully handles 100% of edge cases without crashing.
