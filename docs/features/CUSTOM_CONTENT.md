# Custom Content Reference

Complete guide to custom races, custom classes, and spawn rate control in the Playlist Data Engine.

---

## Table of Contents

1. [Custom Races](#custom-races)
   - [Race Type](#race-type)
   - [RaceDataEntry](#racedataentry)
   - [Registering Custom Races](#registering-custom-races)
   - [Race Validation](#race-validation)
   - [getRaceData() Helper](#getracedata-helper)
   - [Controlling Race Spawn Rates](#controlling-race-spawn-rates)
2. [Subrace Support](#subrace-support)
   - [Subrace Property](#subrace-property)
   - [RacialTrait with Subrace](#racialtrait-with-subrace)
   - [Subrace Validation](#subrace-validation)
   - [Subrace Filtering](#subrace-filtering)
   - [Complete Subrace Registration Example](#complete-subrace-registration-example)
   - [Feature with Subrace Prerequisite](#feature-with-subrace-prerequisite)
3. [Custom Classes](#custom-classes)
   - [Overview](#overview)
   - [Class Type Extensibility](#class-type-extensibility)
   - [ClassDataEntry](#classdataentry)
   - [getClassData() Helper](#getclassdata-helper)
   - [Class-Specific Data Helpers](#class-specific-data-helpers)
   - [Registering Custom Classes](#registering-custom-classes)
   - [Controlling Class Spawn Rates](#controlling-class-spawn-rates)
   - [Overriding Audio Preferences for Default Classes](#overriding-audio-preferences-for-default-classes)
   - [Example: Complete Custom Class (from scratch)](#example-complete-custom-class-from-scratch)
   - [Common Patterns](#common-patterns)
   - [Custom Class Validation](#custom-class-validation)
   - [ClassSuggester Custom Class Support](#classsuggester-custom-class-support)

---

## Custom Races

The engine supports custom races through the ExtensionManager.

### Race Type

**Location:** [src/core/types/Character.ts](../src/core/types/Character.ts)

*Also known as: Playable race, character race*

For the complete list of default D&D 5e races and type definitions, see [DATA_ENGINE_REFERENCE.md](../DATA_ENGINE_REFERENCE.md#data-types).

**Helper Functions:**

| Function | Description |
|----------|-------------|
| `asRace(value: string)` | Convert a string to the Race type |
| `isValidRace(value: string)` | Type guard for valid race names |

**Usage:**

```typescript
import { asRace, isValidRace } from 'playlist-data-engine';

const raceName = 'Dragonkin';
if (isValidRace(raceName)) {
    const race: Race = asRace(raceName);
    // Safe to use
}
```

### RaceDataEntry

**Location:** [src/utils/constants.ts](../src/utils/constants.ts)

For complete type definitions, see [DATA_ENGINE_REFERENCE.md](../DATA_ENGINE_REFERENCE.md#data-types).

| Property | Type | Description |
|----------|------|-------------|
| `race` | string | Race identifier |
| `ability_bonuses` | `Partial<Record<Ability, number>>` | Ability score bonuses |
| `speed` | number | Base speed in feet |
| `traits` | string[] | Array of trait IDs for this race |
| `subraces?` | string[] | Optional available subraces |
| `icon?` | string | Optional icon URL for small UI display |
| `image?` | string | Optional image URL for larger display |

### Registering Custom Races

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Step 1: Register custom race data
manager.register('races.data', [{
    race: 'Dragonkin',
    ability_bonuses: { STR: 2, CON: 1, CHA: 1 },
    speed: 30,
    traits: ['Draconic Ancestry', 'Darkvision'],
    subraces: ['Fire Dragonkin', 'Ice Dragonkin', 'Lightning Dragonkin'],
    icon: '/icons/races/dragonkin.png',
    image: '/images/races/dragonkin-full.png'
}]);

// Step 2: Register the race name (enables validation)
manager.register('races', ['Dragonkin']);

// Step 3: Register custom racial traits (optional)
manager.register('racialTraits', [{
    id: 'dragonkin_draconic_ancestry',
    name: 'Draconic Ancestry',
    race: 'Dragonkin',
    description: 'You have draconic heritage',
    effects: [
        { type: 'ability_unlock', target: 'damage_resistance', value: 'elemental' }
    ],
    source: 'custom'
}]);
```

### Race Validation

The ExtensionManager validates races in this order:

1. Check if it's a default race (Human, Elf, etc.)
2. Check if it's been registered as a custom race name
3. Check if it has data registered via 'races.data'
4. If validation is disabled via `{ validate: false }`, allow any race

### getRaceData() Helper

The `getRaceData()` function retrieves race data from both default and custom races. For complete API reference, see [DATA_ENGINE_REFERENCE.md](../DATA_ENGINE_REFERENCE.md#helper-functions).

```typescript
import { getRaceData } from 'playlist-data-engine';

const dragonkinData = getRaceData('Dragonkin');
// Returns: { ability_bonuses: { STR: 2, CON: 1, CHA: 1 }, speed: 30, traits: [...] }
```

### Controlling Race Spawn Rates

Adjust how frequently custom (or default) races appear during character generation:

```typescript
import { ExtensionManager, CharacterGenerator } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Register custom races
manager.register('races', ['Dragonkin', 'Fairy', 'Elemental']);

// Set spawn rates (relative weights)
manager.setWeights('races', {
    'Dragonkin': 0.3,  // Rare (30% of default weight)
    'Fairy': 0.5,      // Uncommon (50% of default weight)
    'Human': 2.0       // Common (2x default weight)
});

// Now custom races will be selected during character generation
const character = CharacterGenerator.generate('my-seed', audioProfile, track);
// character.race could be 'Dragonkin', 'Fairy', or any default race
```

---

## Subrace Support

Characters can have subraces, and features/traits can require specific subraces.

### Subrace Property

**Location:** [src/core/types/Character.ts](../src/core/types/Character.ts)

| Property | Type | Description |
|----------|------|-------------|
| `subrace?` | string | Optional subrace (e.g., 'High Elf', 'Hill Dwarf', 'Wood Elf') |

### RacialTrait with Subrace

**Location:** [src/core/features/FeatureTypes.ts](../src/core/features/FeatureTypes.ts)

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique trait identifier |
| `name` | string | Trait name |
| `race` | Race | Parent race |
| `subrace?` | string | Optional subrace requirement |
| `prerequisites?` | `FeaturePrerequisite` | Additional requirements |
| `effects?` | `FeatureEffect[]` | Effects when applied |
| `source` | `'default' \| 'custom'` | Data source |

### Subrace Validation

Features with subrace requirements validate that the character has the specified subrace before applying effects.

### Subrace Filtering

FeatureQuery provides `getRacialTraitsForSubrace()`:

```typescript
const query = FeatureQuery.getInstance();

// Get traits specific to High Elf subrace
const highElfTraits = query.getRacialTraitsForSubrace('Elf', 'High Elf');
```

### Complete Subrace Registration Example

```typescript
import { ExtensionManager, CharacterGenerator } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// ===== REGISTER CUSTOM RACE WITH SUBRACES =====
// Step 1: Register the race name
manager.register('races', ['Dragonkin'], { validate: true });

// Step 2: Register the race data (ability bonuses, speed, traits, subraces)
manager.register('races.data', [{
    race: 'Dragonkin',
    ability_bonuses: { STR: 2, CON: 1, CHA: 1 },
    speed: 30,
    traits: ['Draconic Ancestry', 'Darkvision'],
    subraces: ['Fire Dragonkin', 'Ice Dragonkin', 'Lightning Dragonkin'],
    icon: '/icons/races/dragonkin.png',
    image: '/images/races/dragonkin-full.png'
}]);

// ===== REGISTER SUBRACE-SPECIFIC TRAITS =====
// Fire Dragonkin only
manager.register('racialTraits', [{
    id: 'fire_dragonkin_resistance',
    name: 'Fire Resistance',
    description: 'Resistance to fire damage',
    race: 'Dragonkin',
    subrace: 'Fire Dragonkin',  // Only for this subrace
    effects: [
        { type: 'passive_modifier', target: 'fire_resistance', value: true }
    ],
    source: 'custom'
}]);

// Ice Dragonkin only
manager.register('racialTraits', [{
    id: 'ice_dragonkin_resistance',
    name: 'Cold Resistance',
    description: 'Resistance to cold damage',
    race: 'Dragonkin',
    subrace: 'Ice Dragonkin',
    effects: [
        { type: 'passive_modifier', target: 'cold_resistance', value: true }
    ],
    source: 'custom'
}]);

// ===== GENERATE CHARACTER WITH SUBRACE =====
const character = CharacterGenerator.generate(seed, audioProfile, track, {
    forceRace: 'Dragonkin',
    subrace: 'Fire Dragonkin'
});

// Character will have:
// - Base Dragonkin traits (Draconic Ancestry, Darkvision)
// - Subrace-specific traits (Fire Resistance)
// - Correct ability bonuses (STR+2, CON+1, CHA+1)
```

### Feature with Subrace Prerequisite

Traits can require a specific subrace via prerequisites:

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Trait that requires a specific subrace
manager.register('racialTraits', [{
    id: 'inferno_breath',
    name: 'Inferno Breath',
    description: 'Breathe fire like a true red dragon',
    race: 'Dragonkin',
    subrace: 'Fire Dragonkin',
    prerequisites: {
        subrace: 'Fire Dragonkin',  // Must be Fire Dragonkin
        level: 5
    },
    effects: [
        { type: 'active_ability', target: 'fire_breath', value: '6d6' }
    ],
    source: 'custom'
}]);
```

---

## Custom Classes

The engine supports template-based custom classes through the ExtensionManager. Custom classes can extend (inherit from) existing D&D 5e base classes or be defined completely from scratch.

### Overview

The Template Class System enables creating new classes that extend existing D&D 5e base classes without duplicating all properties. For example, a "Necromancer" class can extend "Wizard" and only override the properties that differ.

**Key Features:**
- **Template inheritance**: Custom classes can inherit from base classes via `baseClass` property
- **Complete customization**: Classes can be defined from scratch without `baseClass`
- **Skill lists**: Custom skill lists (including custom skills)
- **Spell casting**: Custom spell lists and slot progressions
- **Equipment**: Custom starting equipment
- **Features**: Custom class features with prerequisites
- **Audio preferences**: Optional audio affinity for class suggestion

### Class Type Extensibility

**Location:** [src/core/types/Character.ts](../src/core/types/Character.ts)

*Also known as: Class name type, branded class type*

For the complete list of default D&D 5e classes and type definitions, see [DATA_ENGINE_REFERENCE.md](../DATA_ENGINE_REFERENCE.md#data-types).

**Helper Functions:**

| Function | Description |
|----------|-------------|
| `asClass(value: string)` | Convert a string to the Class type |
| `isValidClass(value: string)` | Type guard for valid class names |

### ClassDataEntry

**Location:** [src/utils/constants.ts](../src/utils/constants.ts)

For complete type definitions, see [DATA_ENGINE_REFERENCE.md](../DATA_ENGINE_REFERENCE.md#data-types).

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | Yes | Unique class name |
| `baseClass?` | Class | No | Base class to inherit from (template system) |
| `primary_ability` | Ability | Yes* | Primary ability score |
| `hit_die` | number | Yes* | Hit die size (6, 8, 10, 12) |
| `saving_throws` | Ability[] | Yes* | Two saving throw abilities |
| `is_spellcaster` | boolean | Yes* | Can this class cast spells |
| `skill_count` | number | Yes* | Number of skill proficiencies |
| `available_skills` | string[] | Yes* | Array of skill IDs |
| `has_expertise` | boolean | Yes* | Has expertise feature |
| `expertise_count?` | number | No | Number of expertise choices |
| `audio_preferences?` | object | No | Audio affinity for class suggestion |
| `icon?` | string | No | Optional icon URL for small UI display |
| `image?` | string | No | Optional image URL for larger display |

*Required only if `baseClass` is not specified.

**Audio Preferences:**

| Property | Type | Description |
|----------|------|-------------|
| `primary` | `'bass' \| 'treble' \| 'mid' \| 'amplitude' \| 'chaos'` | Primary audio trait |
| `secondary?` | audio trait | Secondary preference |
| `tertiary?` | audio trait | Tertiary preference |
| `bass?`, `treble?`, `mid?`, `amplitude?` | number | Optional weight values |

See also: [DATA_ENGINE_REFERENCE.md - Audio Preferences](../DATA_ENGINE_REFERENCE.md#data-types)

### getClassData() Helper

**Location:** [src/utils/constants.ts](../src/utils/constants.ts)

Retrieves class data from default CLASS_DATA or ExtensionManager. For template-based classes, merges base class data with custom data (custom properties override).

For complete API reference, see [DATA_ENGINE_REFERENCE.md - Helper Functions](../DATA_ENGINE_REFERENCE.md#helper-functions).

**Property Override Behavior:**

| Property | Behavior | Example |
|----------|----------|---------|
| `primary_ability` | Inherited unless specified | `baseClass: 'Wizard'` → inherits `INT` |
| `hit_die` | Inherited unless specified | `baseClass: 'Wizard'` → inherits `8` |
| `saving_throws` | Inherited unless specified | `baseClass: 'Wizard'` → inherits `['INT', 'WIS']` |
| `is_spellcaster` | Inherited unless specified | `baseClass: 'Wizard'` → inherits `true` |
| `skill_count` | Inherited unless specified | `baseClass: 'Wizard'` → inherits `2` |
| `available_skills` | **Replaced** (not merged) | Custom list replaces base entirely |
| `has_expertise` | Inherited unless specified | `baseClass: 'Wizard'` → inherits `false` |
| `audio_preferences` | Inherited unless specified | Can override for custom audio affinity |

### Class-Specific Data Helpers

**Location:** [src/utils/constants.ts](../src/utils/constants.ts)

For complete API reference, see [DATA_ENGINE_REFERENCE.md - Helper Functions](../DATA_ENGINE_REFERENCE.md#helper-functions).

| Function | Description |
|----------|-------------|
| `getClassSpellList(className: string)` | Get spell list for a class |
| `getSpellSlotsForClass(className: string, level: number)` | Get spell slots at a level |
| `getClassStartingEquipment(className: string)` | Get starting equipment |

### Registering Custom Classes

**Via ExtensionManager:**

```typescript
import { ExtensionManager } from 'playlist-data-engine';
import { asClass } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Step 1: Register custom class data
manager.register('classes.data', [{
    name: 'Necromancer',
    baseClass: 'Wizard',  // Inherits from Wizard
    // Only override what's different:
    available_skills: ['arcana', 'medicine', 'religion', 'necromancy'],
    icon: '/icons/classes/necromancer.png',
    image: '/images/classes/necromancer-full.png'
    // All other properties (hit_die, saving_throws, etc.) are inherited from Wizard
}]);

// Step 2: Register the class name for validation
manager.register('classes', [asClass('Necromancer')]);
```

### Controlling Class Spawn Rates

Adjust how frequently custom (or default) classes appear during character generation:

```typescript
import { ExtensionManager, CharacterGenerator } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Make certain classes more or less common
manager.setWeights('classes', {
    'Necromancer': 0.5,   // Rare (half default weight)
    'Sorcerer': 2.0,      // Common (2x default weight)
    'Warlock': 1.5,       // Uncommon (1.5x default weight)
    'Paladin': 0.3        // Very rare
});

// Classes will be selected according to their weights during generation
const character = CharacterGenerator.generate('my-seed', audioProfile, track);
// character.class will favor Sorcerer and Warlock over Necromancer and Paladin
```

### Overriding Audio Preferences for Default Classes:

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Override default class audio preferences
manager.register('classes.data', [{
    name: 'Barbarian',  // Override default Barbarian
    audio_preferences: {
        primary: 'treble',  // Make Barbarians prefer treble instead of bass
        treble: 1.0
    }
}]);

// Now Barbarians will be suggested for treble-heavy audio instead of bass-heavy
```

### Example: Complete Custom Class (from scratch):

```typescript
import { ExtensionManager, asClass } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Step 1: Register complete custom class data
manager.register('classes.data', [{
    name: 'Runecaster',
    // No baseClass - must specify everything
    primary_ability: 'WIS',
    hit_die: 8,
    saving_throws: ['WIS', 'CON'],
    is_spellcaster: true,
    skill_count: 3,
    available_skills: ['arcana', 'nature', 'religion', 'insight', 'medicine'],
    has_expertise: false,
    icon: '/icons/classes/runecaster.png',
    image: '/images/classes/runecaster-full.png'
}]);

// Step 2: Register the class name
manager.register('classes', [asClass('Runecaster')]);

// Step 3: (Optional) Set custom spell list
manager.register('classSpellLists.Runecaster', [{
    cantrips: ['druidcraft', 'guidance', 'resistance'],
    spells_by_level: {
        1: ['detect magic', 'magic stone', 'faerie fire']
    }
}]);

// Step 4: (Optional) Set custom spell slot progression
manager.register('classSpellSlots', [{
    class: 'Runecaster',
    slots: {
        1: { 1: 2 },
        2: { 1: 3 },
        3: { 1: 4, 2: 2 }
        // ... define for all levels 1-20
    }
}]);

// Step 5: (Optional) Set custom starting equipment
manager.register('classStartingEquipment.Runecaster', [{
    weapons: ['Quarterstaff', 'Dagger'],
    armor: [],
    items: ['Component pouch', 'Spellbook']
}]);

// Now generate a Runecaster character!
const character = CharacterGenerator.generate(
    'my-seed',
    audioProfile,
    track
);
```

**Note:** For complete ClassDataEntry property definitions and the full list of default D&D 5e classes, see [DATA_ENGINE_REFERENCE.md](../DATA_ENGINE_REFERENCE.md#data-types).

### Common Patterns

Here are common patterns for creating custom classes using the template system:

**Archetype Variant** - Same class, different flavor:

```typescript
{
    name: 'BattleMage',
    baseClass: 'Wizard',
    hit_die: 10,           // More durable than standard Wizard
    saving_throws: ['INT', 'CON'],  // CON instead of WIS
    available_skills: ['arcana', 'athletics', 'intimidation'],
    icon: '/icons/classes/battlemage.png'
}
```

**Multiclass-Inspired** - Two classes combined:

```typescript
{
    name: 'Spellsword',
    baseClass: 'Fighter',
    is_spellcaster: true,  // Add spellcasting
    primary_ability: 'STR',  // Keep Fighter primary
    available_skills: ['athletics', 'acrobatics', 'arcana', 'intimidation'],
    icon: '/icons/classes/spellsword.png'
}
```

**Specialist** - Narrow focus:

```typescript
{
    name: 'Beastmaster',
    baseClass: 'Ranger',
    skill_count: 3,  // Extra skill for animal handling
    available_skills: ['animal_handling', 'nature', 'survival', 'perception'],
    icon: '/icons/classes/beastmaster.png'
}
```

### Custom Class Validation

**Location:** [src/core/extensions/ExtensionManager.ts](../src/core/extensions/ExtensionManager.ts)

The ExtensionManager validates custom classes:

1. **Class Names**: Must be either a default class or registered via `classes.data`
2. **Class Data**: Must have `name` (string), `primary_ability` (Ability), `hit_die` (number), `saving_throws` (Ability[]), `is_spellcaster` (boolean), `skill_count` (number), `available_skills` (string[]), `has_expertise` (boolean)

```typescript
// Validation errors for invalid class data
manager.register('classes', ['InvalidClass']);
// Throws: "Invalid items for category 'classes':
//   Invalid class (must be one of: Barbarian, Bard, Cleric, Druid, Fighter,
//   Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard or a custom
//   class registered via 'classes.data')"
```

### ClassSuggester Custom Class Support

**Location:** [src/core/generation/ClassSuggester.ts](../src/core/generation/ClassSuggester.ts)

The `ClassSuggester` automatically includes custom classes registered via ExtensionManager when suggesting a class based on audio profile. Custom classes with `audio_preferences` are matched against the audio profile.

| Method | Returns | Description |
|--------|---------|-------------|
| `suggest(audioProfile: AudioProfile, rng: SeededRNG)` | `string` | Suggest a class based on audio profile |

---

## See Also

- [PREREQUISITES.md](PREREQUISITES.md) - Prerequisites system guide
- [DATA_ENGINE_REFERENCE.md](../DATA_ENGINE_REFERENCE.md) - Complete API reference
- [USAGE_IN_OTHER_PROJECTS.md](../USAGE_IN_OTHER_PROJECTS.md) - Usage examples
- [EXTENSIBILITY_GUIDE.md](EXTENSIBILITY_GUIDE.md) - Custom content registration and spawn rates
- [EQUIPMENT_SYSTEM.md](EQUIPMENT_SYSTEM.md) - Custom equipment
- [XP_AND_STATS.md](XP_AND_STATS.md) - Progression and stat strategies
