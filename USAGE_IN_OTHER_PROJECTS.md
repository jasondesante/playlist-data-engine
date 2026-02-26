# Playlist Data Engine Usage Guide

Transform music playlists into D&D 5e-inspired RPG characters through audio/visual analysis and deterministic generation.

**Quick Links:**
- **[API Reference](DATA_ENGINE_REFERENCE.md)** — Complete class and method documentation
- **[Audio Analysis](docs/AUDIO_ANALYSIS.md)** — Triple-tap real-time, full timeline, beat detection
- **[Extensibility Guide](docs/EXTENSIBILITY_GUIDE.md)** — Custom content, classes, races, skills
- **[Equipment System](docs/EQUIPMENT_SYSTEM.md)** — Properties, enchanting, templates
- **[Enemy Generation](docs/ENEMY_GENERATION.md)** — CR-based enemies, encounters, rarity scaling
- **[Custom Classes & Races](docs/CUSTOM_CONTENT.md)** — Template-based class inheritance
- **[XP and Leveling](docs/XP_AND_STATS.md)** — Progression, stat increases, mastery
- **[Prestige System](docs/XP_AND_STATS.md#track-mastery-prestige-system)** — Reset for badge upgrades after mastering
- **[Prerequisites](docs/PREREQUISITES.md)** — Level/ability/class/skill/feature requirements

---

### Installation

Install from local path (recommended):

```json
{
  "dependencies": {
    "playlist-data-engine": "file:/path/to/playlist-data-engine"
  }
}
```

For development, use `npm link` to test changes without rebuilding:

```bash
cd /path/to/playlist-data-engine && npm link
cd /path/to/your/project && npm link playlist-data-engine
```

---

## Usage Examples

### Basic
- [Playlist Parsing and Character Generation](#basic-playlist-parsing-and-character-generation) — Parse playlists, analyze audio, generate characters
- [XP from Listening](#earning-xp-from-listening-to-music) — Session tracking, XP calculation, level-ups

### Specific Features
- [Color Extraction](#color-extraction) — Artwork color palette extraction
- [Character Naming](#character-naming) — Automatic and manual RPG-style name generation
- [Deterministic Character Generation](#deterministic-character-generation) — Same seed, same character
- [Advanced Character Features](#advanced-character-features) — Skills, spells, equipment, appearance
- [Stat Strategies](#stat-strategies) — Level-up stat increase options
- [XP Scaling](#xp-scaling) — Progression configuration
- [Prestige System](docs/XP_AND_STATS.md#track-mastery-prestige-system) — Reset for badge upgrades after mastering tracks
- [Environmental Sensors](#environmental-sensors) — GPS, motion, weather, light modifiers
- [Gaming Platform Integration](#gaming-platform-integration) — Steam and Discord bonuses
- [Combat System](#combat-system) — Turn-based D&D 5e combat
- [Enemy Generation](#enemy-generation) — CR-based enemies, encounters, CR vs Rarity independence

### Audio Analysis
- [Full Song Analysis](#full-song-analysis) — Segment-by-segment timeline analysis for visualization
- [Beat Detection](docs/AUDIO_ANALYSIS.md) — Rhythm game timing, beat maps, button press accuracy

### Advanced Pipeline
- [Combining All Systems](#combining-all-systems) — Full pipeline with environmental and gaming context

### Extensibility
See [Extensibility System](#extensibility-system) below for complete extensibility documentation and links to detailed guides.

### Equipment System Links
See [EQUIPMENT_SYSTEM.md](docs/EQUIPMENT_SYSTEM.md) for:
- Custom equipment — Properties, enchanting, templates
- Equipment spawning — Batch spawn by rarity, tags, or templates
- Box items — Containers, adventure packs, loot boxes (see also [BoxOpener](DATA_ENGINE_REFERENCE.md#boxopener))

### Developer Reference
- [Available Exports](#available-exports) — Complete API reference
- [Equipment System](#equipment-system) — Quick introduction
- [Extensibility Overview](#extensibility-system) — Registration and custom content
- [Validation Schemas](#validation-schemas) — Runtime type validation with Zod
- [Development Workflow](#development-workflow) — Watch mode and hot reload
- [Environment Variables](#environment-variables) — API keys and sensor configuration
- [Troubleshooting](#troubleshooting) — Common issues

---

## Basic Examples

### Basic Playlist Parsing and Character Generation

```typescript
import {
  PlaylistParser,
  CharacterGenerator,
  AudioAnalyzer
} from 'playlist-data-engine';

// Parse a playlist
const parser = new PlaylistParser();
const playlist = await parser.parse(rawPlaylistJSON);
console.log(`Loaded ${playlist.tracks.length} tracks`);

// Analyze first track's audio
const analyzer = new AudioAnalyzer();
const track = playlist.tracks[0];
const audioProfile = await analyzer.extractSonicFingerprint(track.audio_url);
console.log(`Bass: ${audioProfile.bass_dominance}, Mid: ${audioProfile.mid_dominance}, Treble: ${audioProfile.treble_dominance}`);
console.log(`RMS Energy: ${audioProfile.rms_energy}, Dynamic Range: ${audioProfile.dynamic_range}`);

// Generate character deterministically from audio
const character = CharacterGenerator.generate(
  track.id,  // Deterministic seed
  audioProfile,
  track  // Track metadata for automatic name generation
);

console.log(`Generated: ${character.name}`);
console.log(`  Race: ${character.race}`);
console.log(`  Class: ${character.class}`);
console.log(`  STR: ${character.ability_scores.STR}, DEX: ${character.ability_scores.DEX}`);
```

### Full Song Analysis

Perform a detailed, segment-by-segment analysis of the entire song. This is ideal for generating game levels or showing a song's progression over time.

```typescript
import { AudioAnalyzer } from 'playlist-data-engine';

const analyzer = new AudioAnalyzer();

// Option A: Sample every 2 seconds
const timelineInterval = await analyzer.analyzeTimeline(audioUrl, { 
  type: 'interval', 
  intervalSeconds: 2 
});

// Option B: Generate exactly 100 data points across the song
const timelineCount = await analyzer.analyzeTimeline(audioUrl, { 
  type: 'count', 
  count: 100 
});

// Access timeline data
timelineCount.forEach(event => {
  console.log(`[${event.timestamp}s]`);
  console.log(`  Energy: ${event.rms_energy} (RMS), Peak: ${event.peak}`);
  console.log(`  Dynamic Range: ${event.dynamic_range}`);
  console.log(`  Frequency: B:${event.bass} M:${event.mid} T:${event.treble}`);
  console.log(`  Spectral Centroid: ${event.spectral_centroid}`);
  console.log(`  Zero Crossing Rate: ${event.zero_crossing_rate}`);
});
```


### Earning XP from Listening to Music

Track listening sessions, calculate XP earned (~1 XP/second with environmental/gaming bonuses), and apply to your character. Level-ups happen automatically when XP thresholds are reached.

```typescript
import { SessionTracker, CharacterUpdater } from 'playlist-data-engine';

const tracker = new SessionTracker();
const sessionId = tracker.startSession(track.id, track);

// ... user listens ...

const session = tracker.endSession(sessionId);
if (session) {
  const updater = new CharacterUpdater();
  const previousListenCount = tracker.getTrackListenCount(track.id) - 1;
  const result = updater.updateCharacterFromSession(character, session, track, previousListenCount);

  if (result.leveledUp) console.log(`Level up! Now ${result.newLevel}`);
  if (result.masteredTrack) console.log(`Track mastered! +${result.masteryBonusXP} bonus XP`);
}
```

**Customization**: Stat increases, XP sources, and level scaling are all configurable:

- **Stat strategies**: Auto-smart (default), manual D&D 5e, balanced, primary-only, random, or custom formulas
- **Game modes**: Standard (stats capped at 20, increases at levels 4/8/12/16/19) or uncapped (unlimited levels, every level)
- **XP sources**: Music listening, combat, quests, or any custom activity
- **Level scaling**: Default D&D 5e pattern or provide your own XP formulas

For complete details on progression, stat increases, prestige system, and customization, see **[XP_AND_STATS.md](docs/XP_AND_STATS.md)**.


## Specific Features

### Color Extraction

```typescript
import { ColorExtractor } from 'playlist-data-engine';

// Extract color palette from track artwork
const colorExtractor = new ColorExtractor();
const palette = await colorExtractor.extractPalette(track.image_url);
console.log(`Primary color: ${palette.primary_color}`);
console.log(`Colors: ${palette.colors.join(', ')}`);
console.log(`Brightness: ${palette.brightness}, Saturation: ${palette.saturation}`);
console.log(`Is monochrome: ${palette.is_monochrome}`);

```

### Character Naming

Names are automatically generated by `CharacterGenerator` using track metadata (title, artist, genre) combined with audio characteristics and character class. Names use 7 different naming formats with fantasy-inspired patterns.

```typescript
import { CharacterGenerator } from 'playlist-data-engine';

// Names are generated automatically - no need to provide a name parameter
const character = CharacterGenerator.generate(track.id, audioProfile, track);
console.log(`Generated name: "${character.name}"`);
```

**Naming Modes:**

| Mode | Behavior | Example |
|------|----------|---------|
| **Deterministic** (default) | Same seed always produces same name | `CharacterGenerator.generate(seed, audio, track)` |
| **Manual override** | Force a specific name | `CharacterGenerator.generate(seed, audio, track, { forceName: 'Gandalf' })` |
| **Non-deterministic** | Same seed produces different names | `CharacterGenerator.generate(seed, audio, track, { deterministicName: false })` |

**Advanced:** For manual name generation using the full `NamingEngine` API (with control over deterministic mode), see [DATA_ENGINE_REFERENCE.md](DATA_ENGINE_REFERENCE.md#helper-namingengine).


### Deterministic Character Generation

The same seed and audio profile always produces the same character:

**For more details on deterministic seeding, hash utilities, and seeded randomness, see [ROLLS_AND_SEEDS.md](docs/ROLLS_AND_SEEDS.md)**

```typescript
import { CharacterGenerator, AudioAnalyzer, type CharacterSheet } from 'playlist-data-engine';

const seed = 'ethereum-0x123abc-1';
const analyzer = new AudioAnalyzer();
const audio = await analyzer.extractSonicFingerprint(track.audio_url);

// Generate the same character every time (same inputs = same output)
const char1 = CharacterGenerator.generate(seed, audio, track);
const char2 = CharacterGenerator.generate(seed, audio, track);

// Game mode affects the output, so different game modes = different characters
const standardChar = CharacterGenerator.generate(seed, audio, track, { gameMode: 'standard' });
const uncappedChar = CharacterGenerator.generate(seed, audio, track, { gameMode: 'uncapped' });

console.log(char1.race === char2.race);  // true
console.log(char1.class === char2.class);  // true
console.log(JSON.stringify(char1) === JSON.stringify(char2));  // true

// Use this for caching characters in your app
const characterCache = new Map<string, CharacterSheet>();
if (!characterCache.has(track.id)) {
  characterCache.set(track.id, CharacterGenerator.generate(track.id, audio, track));
}
```



### Advanced Character Features

Characters are generated with complete skills, spells, equipment, and appearance. These are initialized automatically by `CharacterGenerator.generate()`.

```typescript
import { SkillAssigner, SpellManager, EquipmentGenerator, AppearanceGenerator } from 'playlist-data-engine';

const character = CharacterGenerator.generate(track.id, audioProfile, track);

// Skills and proficiencies (assigned by class)
const rng = new SeededRNG(track.id);
const skills = SkillAssigner.assignSkills(character.class, rng);
// Returns: { athletics: 'proficient', perception: 'expertise', stealth: 'proficient', ... }

// Spells (for spellcasting classes)
if (SpellManager.isSpellcaster(character.class)) {
  const spells = SpellManager.initializeSpells(character.class, character.level);
  // Returns: { cantrips, known_spells, spell_slots }
}

// Starting equipment (by class)
const equipment = EquipmentGenerator.initializeEquipment(character.class);
// Returns: { weapons, armor, items, totalWeight, equippedWeight }

// Appearance (from seed + audio profile)
const appearance = AppearanceGenerator.generate(track.id, character.class, audioProfile);
// Returns: body_type, hair_color/style, eye_color, skin_tone, facial_features, aura_color
```

**For deeper dives:**
- **Skills & Proficiencies**: See [XP_AND_STATS.md](docs/XP_AND_STATS.md)
- **Spells**: See [EXTENSIBILITY_GUIDE.md](docs/EXTENSIBILITY_GUIDE.md)
- **Equipment**: See [EQUIPMENT_SYSTEM.md](docs/EQUIPMENT_SYSTEM.md) (properties, enchanting, templates)



### Stat Strategies

**For detailed documentation, see [XP_AND_STATS.md](docs/XP_AND_STATS.md)**

### XP Scaling

**For detailed documentation, see [XP_AND_STATS.md](docs/XP_AND_STATS.md)**


### Environmental Sensors

GPS, motion, weather, and light sensors that provide XP modifiers based on real-world conditions (running, night, storm, altitude).

**For detailed documentation, see [IRL_SENSORS.md](docs/IRL_SENSORS.md)**

### Gaming Platform Integration

Steam game detection and Discord Rich Presence integration that provide XP bonuses based on gaming activity.

**For detailed documentation, see [IRL_SENSORS.md](docs/IRL_SENSORS.md)**


### Combat System

Turn-based D&D 5e-inspired combat with initiative, attacks, spell casting, and dice rolling.

**For detailed documentation, see [COMBAT_SYSTEM.md](docs/COMBAT_SYSTEM.md)**


### Enemy Generation

Generate enemies and balanced encounters using the `EnemyGenerator` class. The system uses **two independent axes** for enemy creation:

| Concept | Determines | Examples |
|---------|------------|----------|
| **Challenge Rating (CR)** | Power level (stats, HP, level) | Weak beast vs. ancient dragon |
| **Rarity** | Complexity (abilities, resistances) | Simple guard vs. complex spellcaster |

**Key principle:** Any CR can combine with any rarity.

```typescript
import { EnemyGenerator } from 'playlist-data-engine';

// Generate a specific enemy at CR 5 with elite rarity
const enemy = EnemyGenerator.generate({
    seed: 'dungeon-orc',
    templateId: 'orc',
    cr: 5,              // Power: Level 5, full stats
    rarity: 'elite'     // Complexity: d10 signature, 2 extra abilities
});

console.log(enemy.level);  // 5 (derived from CR)
```

#### CR + Rarity Combinations

Different combinations create diverse enemies:

| CR | Rarity | Result | Example |
|----|--------|--------|---------|
| 0.25 | Common | Weak, simple | Goblin grunt |
| 0.25 | Boss | Weak, complex | Goblin chieftain |
| 5 | Common | Strong, simple | Dire wolf |
| 5 | Boss | Strong, complex | Werewolf alpha |
| 20 | Common | Epic, simple | Ancient purple worm |
| 20 | Boss | Epic, complex | Ancient red dragon |

```typescript
// Weak but complex enemy (goblin chieftain)
const chieftain = EnemyGenerator.generate({
    seed: 'goblin-leader',
    templateId: 'goblin',
    cr: 0.25,           // Level 0.25, 75% base stats
    rarity: 'boss'      // d12 signature, 3 extra abilities, legendary actions
});

// Strong but simple enemy (ancient beast)
const beast = EnemyGenerator.generate({
    seed: 'ancient-beast',
    templateId: 'purple-worm',
    cr: 20,             // Level 20, full stats
    rarity: 'common'    // d6 signature, no extra abilities
});
```

#### Generate Balanced Encounters

```typescript
// Generate 3 enemies for a level 5 party (medium difficulty)
const enemies = EnemyGenerator.generateEncounter(party, {
    seed: 'dungeon-room-1',
    difficulty: 'medium',
    count: 3
});

// Or generate by specific CR
const cr5Enemies = EnemyGenerator.generateEncounterByCR({
    seed: 'cr5-encounter',
    targetCR: 5,
    count: 3,
    baseRarity: 'common'   // All enemies start at common rarity
});

// Opt-in: Scale rarity with CR (higher CR = higher average rarity)
const scaledEnemies = EnemyGenerator.generateEncounterByCR({
    seed: 'scaling-encounter',
    targetCR: 18,          // High CR
    count: 3,
    scaleRarityWithCR: true  // Results in [elite, uncommon, uncommon]
});
```

#### Fractional CRs

Enemies with fractional CR values (0.25, 0.5) get reduced base stats:

| CR | Stat Multiplier | Description |
|----|-----------------|-------------|
| 0.25 | 75% | Sub-level enemy (goblin grunt) |
| 0.5 | 85% | Sub-level enemy (giant rat) |
| 1+ | 100% | Full stats |

```typescript
const grunt = EnemyGenerator.generate({
    seed: 'weak-goblin',
    cr: 0.25,           // 75% base stats
    rarity: 'common'
});
```

**For detailed documentation**, see [ENEMY_GENERATION.md](docs/ENEMY_GENERATION.md) for:
- Complete template list
- Rarity tier breakdowns
- Leader promotion system
- Audio-influenced generation
- Encounter balance formulas

---

## Advanced Examples

### Combining All Systems

```typescript
import {
  PlaylistParser,
  CharacterGenerator,
  AudioAnalyzer,
  EnvironmentalSensors,
  GamingPlatformSensors,
  SessionTracker,
  CharacterUpdater
} from 'playlist-data-engine';

// Full pipeline: Parse → Analyze → Generate → Track → Level Up

// Initialize components ONCE (outside the loop)
const parser = new PlaylistParser();
const analyzer = new AudioAnalyzer();
const tracker = new SessionTracker();  // Single tracker maintains session history
const sensors = new EnvironmentalSensors(process.env.WEATHER_API_KEY);
const gamingSensors = new GamingPlatformSensors({
  steam: { apiKey: process.env.STEAM_API_KEY, steamId: process.env.STEAM_USER_ID }
});

const playlist = await parser.parse(playlistJSON);

for (const track of playlist.tracks) {
  // 1. Generate character from audio (choose game mode at creation time)
  const audio = await analyzer.extractSonicFingerprint(track.audio_url);
  let character = CharacterGenerator.generate(
    track.id,
    audio,
    track,
    { gameMode: 'standard' }  // or 'uncapped' for epic progression
  );

  // 2. Get environmental context (before starting session)
  const envContext = await sensors.updateSnapshot();

  // 3. Get gaming context (before starting session)
  const gamingContext = gamingSensors.getContext();

  // 4. Track listening session WITH context from the start
  const sessionId = tracker.startSession(track.id, track, {
    environmental_context: envContext,
    gaming_context: gamingContext
  });

  // ... user listens to the track ...

  // 5. End session (XP is calculated automatically with context)
  const session = tracker.endSession(sessionId);
  if (!session) continue;

  // 6. Update character with session results
  const updater = new CharacterUpdater();
  const previousListenCount = tracker.getTrackListenCount(track.id) - 1;
  const result = updater.updateCharacterFromSession(character, session, track, previousListenCount);

  character = result.character;

  console.log(`${character.name} earned ${result.xpEarned} XP`);
  console.log(`  Total: ${result.xpEarned}, Mastery Bonus: ${result.masteryBonusXP}`);
  if (result.leveledUp) {
    console.log(`  LEVEL UP! Now level ${result.newLevel}`);
  }
}
```


---

## Extensibility System

The extensibility system allows you to add custom content at runtime, including spells, equipment, races, classes, features, skills, and appearance options.

**Detailed guides:**
- [docs/EXTENSIBILITY_GUIDE.md](docs/EXTENSIBILITY_GUIDE.md) - Complete extensibility system (custom content, spawn rates, export/import, content packs)
- [docs/CUSTOM_CONTENT.md](docs/CUSTOM_CONTENT.md) - Custom races, subraces, and classes
- [docs/PREREQUISITES.md](docs/PREREQUISITES.md) - Skill, spell, and feature prerequisites
- [docs/EQUIPMENT_SYSTEM.md](docs/EQUIPMENT_SYSTEM.md) - Equipment properties and modifications
- [DATA_ENGINE_REFERENCE.md](DATA_ENGINE_REFERENCE.md) - Complete API reference

### Image Support (Icons and Images)

All entity types support optional `icon` and `image` URL fields for UI display. Use batch methods to add images to multiple items at once.

**Valid URL prefixes:** `http://`, `https://`, `/`, `assets/`

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// --- Register custom content with images ---
manager.register('equipment', [{
    name: 'Dragon Scale Armor',
    type: 'armor',
    rarity: 'very_rare',
    weight: 15,
    icon: '/icons/armor/dragon-scale.png',
    image: '/images/equipment/dragon-scale-armor.png'
}]);

// --- Batch add icons by name ---
manager.batchAddIcons('spells', {
    'Fireball': '/assets/spells/fireball.png',
    'Magic Missile': '/assets/spells/magic-missile.png'
});

// --- Batch add images by name ---
manager.batchAddImages('equipment', {
    'Longsword': '/assets/equipment/longsword.png'
});

// --- Update all items matching a condition ---
// Add same icon to all cantrips
manager.batchUpdateImages('spells',
    spell => spell.level === 0,
    { icon: '/assets/spells/cantrip-icon.png' }
);

// --- Add icons by property value ---
// All evocation spells get fire icon
manager.batchByCategory('spells', 'school', {
    'Evocation': '/assets/icons/fire.png',
    'Necromancy': '/assets/icons/skull.png',
    'Abjuration': '/assets/icons/shield.png'
});

// Add icons by equipment rarity
manager.batchByCategory('equipment', 'rarity', {
    'legendary': '/assets/icons/star-gold.png',
    'very_rare': '/assets/icons/star-purple.png',
    'rare': '/assets/icons/star-blue.png'
});
```

**Supported categories:** `spells`, `skills`, `classFeatures`, `racialTraits`, `equipment`, `races.data`, `classes.data`

**Image validation:**
```typescript
import { validateImageFields, isValidImageUrl } from 'playlist-data-engine';

// Validate both icon and image on an object
const errors = validateImageFields({
    icon: '/assets/icon.png',
    image: 'https://example.com/image.png'
});
if (errors.length > 0) {
    console.error('Invalid image URLs:', errors);
}

// Check a single URL
if (!isValidImageUrl('ftp://invalid.com/file.png')) {
    console.log('URL must start with http, https, /, or assets/');
}
```


---


## Equipment System

Comprehensive equipment system with custom items, properties, enchanting, templates, batch spawning, and box-type containers.

**See [EQUIPMENT_SYSTEM.md](docs/EQUIPMENT_SYSTEM.md)** for:
- Equipment properties — Stat bonuses, skills, abilities, damage, conditions
- Equipment modification — Enchanting, cursing, upgrading at runtime
- Equipment spawning — Batch spawn by rarity, tags, or templates
- Equipment-granted features — Items that grant features, skills, or spells
- Box items — Containers, adventure packs, and loot boxes

### Box Items (Containers & Loot Boxes)

Box-type equipment (`type: 'box'`) can contain other items and gold. This covers both guaranteed containers (like adventure packs that always give specific items) and probability-based loot boxes.

```typescript
import { BoxOpener, EquipmentSpawnHelper, SeededRNG } from 'playlist-data-engine';

const rng = new SeededRNG('player-seed');

// --- Check if an item in inventory is a box ---
const someItem = character.equipment.items[0];
if (BoxOpener.isBox(someItem)) {
    // Preview possible contents without opening
    const preview = BoxOpener.previewContents(someItem);
    console.log(preview.possibleItems);  // ['Backpack', 'Bedroll', 'Torch', ...]
    console.log(preview.possibleGold);   // { min: 0, max: 0 }
    console.log(preview.totalDrops);     // 8
}

// --- Open a box directly ---
const result = BoxOpener.openBox(someItem, rng);
console.log(result.items);       // Equipment[] generated from the box
console.log(result.gold);        // Total gold awarded
console.log(result.consumeBox);  // true = remove box from inventory

// --- Open a named box from a character's inventory ---
// (finds "Explorer's Pack" in inventory, opens it, removes it, adds contents)
EquipmentSpawnHelper.openBoxForCharacter(character, "Explorer's Pack", rng);
```

**Box behavior:**
- **Guaranteed drops** — Single-entry pool (weight 100) always gives that item
- **Weighted random** — Multi-entry pool selects one item per drop slot
- **Quantity** — `quantity: 10` for Torch gives 10 torch items in one drop
- **Gold drops** — Pool entries with `gold` award gold instead of items
- **Nested boxes** — Boxes inside boxes are added unopened (no recursive opening)
- **Deterministic** — Same seed + same box = same result every time

**Box with icon and image:**
```typescript
// Define a custom box with visual assets
const treasureBox = {
    name: 'Treasure Chest',
    type: 'box',
    rarity: 'rare',
    weight: 5,
    icon: '/icons/box/treasure-chest.png',
    image: '/images/equipment/treasure-chest-open.png',
    box: {
        drops: [
            { pool: [{ name: 'Gold Coin', gold: { min: 50, max: 100 }, weight: 100 }] },
            { pool: [{ name: 'Ruby', weight: 30 }, { name: 'Sapphire', weight: 30 }] }
        ],
        consumeOnOpen: true
    }
};
```

For all built-in pack definitions and custom box examples, see [EQUIPMENT_SYSTEM.md](docs/EQUIPMENT_SYSTEM.md#box-equipment-type) and [DATA_ENGINE_REFERENCE.md](DATA_ENGINE_REFERENCE.md#boxopener).

### Locked Boxes (Opening Requirements)

Boxes can have optional opening requirements that must be satisfied before the box can be opened. This is useful for locked chests requiring keys, treasure boxes that cost gold to unlock, or caches requiring consumable tools.

```typescript
import { BoxOpener, EquipmentSpawnHelper, SeededRNG } from 'playlist-data-engine';

const rng = new SeededRNG('player-seed');

// --- Check if a box has requirements ---
const inventory = character.equipment.items; // Character's item inventory
const boxItem = inventory.find(item => item.name === 'Locked Chest');

if (BoxOpener.isBox(boxItem)) {
    // Preview shows requirements along with possible contents
    const preview = BoxOpener.previewContents(boxItem);
    if (preview.openRequirements) {
        console.log('Requirements:', preview.openRequirements);
        // [{ itemName: 'Iron Key' }]
    }
}

// --- Check if player can open a box (boolean check for UI) ---
if (BoxOpener.canOpen(boxItem, inventory)) {
    console.log('You have the required items to open this box!');
} else {
    // Get human-readable description of what's needed
    const description = BoxOpener.getRequirementsDescription(boxItem);
    console.log(description); // "Requires: Iron Key"
}

// --- Open a locked box (with requirement checking) ---
const result = BoxOpener.openBox(boxItem, rng, inventory);

if (result.success) {
    console.log(`Opened! Consumed:`, result.consumedItems);
    // [{ name: 'Iron Key', quantity: 1 }]

    console.log(`Received ${result.items.length} items and ${result.gold} gold`);
    console.log(`Box consumed: ${result.consumeBox}`);
} else {
    console.log(`Cannot open: ${result.error?.message}`);
    // "Missing required item: Iron Key" or
    // "Insufficient Gold Coin: have 50, need 100"
}

// --- Open a locked box directly from character inventory ---
const openResult = EquipmentSpawnHelper.openBoxForCharacter(
    character,
    'Locked Chest',
    rng
);

if (openResult) {
    if (openResult.result.success) {
        // Box opened - character is updated automatically:
        // - Required items consumed from inventory
        // - Box removed from inventory (if consumeOnOpen: true)
        // - New items added to inventory
        character = openResult.character;
        console.log('Consumed:', openResult.result.consumedItems);
    } else {
        // Requirements not met - character unchanged
        console.log('Failed:', openResult.result.error?.code);
        // 'MISSING_ITEM' or 'INSUFFICIENT_QUANTITY'
    }
}
```

**Requirement types:**

| Type | Example | Behavior |
|------|---------|----------|
| **Single item** | `{ itemName: 'Iron Key' }` | Requires 1 of the item |
| **Quantity** | `{ itemName: 'Lockpick', quantity: 3 }` | Requires multiple of the same item |
| **Gold cost** | `{ itemName: 'Gold Coin', quantity: 100 }` | Gold treated as an item with quantity |
| **Multiple** | Array of requirements | ALL requirements must be satisfied |

**Requirement validation:**
- Requirements are checked atomically (all or nothing)
- If any requirement fails, no items are consumed
- When all requirements are met, ALL required items are consumed
- The box contents are then generated as normal

For built-in locked boxes (Locked Chest, Gilded Strongbox, Royal Treasury Box, Thieves' Cache) and custom locked box definitions, see [EQUIPMENT_SYSTEM.md](docs/EQUIPMENT_SYSTEM.md#opening-requirements).

---

## Validation Schemas

Zod schemas for runtime validation (`PlaylistTrackSchema`, `ServerlessPlaylistSchema`, `AudioProfileSchema`, `AbilityScoresSchema`, `CharacterSheetSchema`). Use for API validation, type guards, or form data.

```typescript
import { CharacterSheetSchema } from 'playlist-data-engine';

const result = CharacterSheetSchema.safeParse(externalData);
if (!result.success) {
  console.error('Invalid:', result.error.format());
}
```

---



## Available Exports

For a complete reference of all exports from the library, see **[DATA_ENGINE_REFERENCE.md](DATA_ENGINE_REFERENCE.md)**.

The reference includes:
- **Quick Export Reference** — Concise overview of all exports organized by category
- **Data Types** — Complete type definitions for all core data structures
- **Core Modules** — PlaylistParser, AudioAnalyzer, CharacterGenerator, and more
- **Progression System** — XP calculation, level-ups, stat increases
- **Equipment System** — Properties, enchanting, spawning, templates
- **Extensibility System** — ExtensionManager, FeatureQuery, SkillQuery, SpellQuery
- **Combat System** — Turn-based combat, initiative, dice rolling
- **Configuration** — Sensor and progression configuration
- **Utilities** — Seeded RNG, logging, validation schemas

---

## Development Workflow

**Watch mode**: `npm run dev` rebuilds on file changes.

When developing with `file://` or `npm link`: changes in `src/` are available immediately after rebuild.

**For complete environment configuration, see [`.env.example`](.env.example)** in the project root.

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `WEATHER_API_KEY` | OpenWeatherMap API key for weather-based XP modifiers |
| `STEAM_API_KEY` | Steam Web API key for game detection |
| `STEAM_USER_ID` | Your 64-bit Steam ID |
| `DISCORD_CLIENT_ID` | Discord application ID for Rich Presence |
| `XP_MAX_MODIFIER` | Maximum XP multiplier (default: 3.0) |

All variables are optional. For complete configuration with examples and programmatic options, see **[`.env.example`](.env.example)**.

---

## Troubleshooting

### Library changes not reflecting
- With `npm link`: Changes are instant
- With `file://` paths: Run `npm run build` in the library, then clear your project's cache: `rm -rf node_modules/.bin/playlist-data-engine`

### Audio analysis not working
The `AudioAnalyzer` uses the Web Audio API, which requires:
1. A browser environment, **or**
2. A Node.js polyfill like `web-audio-api`

For TypeScript configuration issues, ensure `tsconfig.json` has `"moduleResolution": "node"` and `"esModuleInterop": true`.
