# Custom Content Reference

Complete guide to custom races, custom classes, and spawn rate control in the Playlist Data Engine.

**For prerequisite details, see [PREREQUISITES.md](PREREQUISITES.md)**
**For API details, see [DATA_ENGINE_REFERENCE.md](../DATA_ENGINE_REFERENCE.md)**
**For usage examples, see [USAGE_IN_OTHER_PROJECTS.md](../USAGE_IN_OTHER_PROJECTS.md)**

---

## Table of Contents

1. [Custom Races](#custom-races)
2. [Custom Classes](#custom-classes)
3. [Spawn Rate Control](#spawn-rate-control)

---

## Custom Races

The engine supports custom races through the ExtensionManager.

### Race Type Definition

The base `Race` type is a closed union of default races:

```typescript
type Race =
    | 'Human' | 'Elf' | 'Dwarf' | 'Halfling' | 'Dragonborn' | 'Gnome'
    | 'Half-Elf' | 'Half-Orc' | 'Tiefling';
```

### Type Augmentation for Custom Races

To use custom races, augment the type in your project:

```typescript
import 'playlist-data-engine';

declare module 'playlist-data-engine' {
    type Race =
        | 'Human' | 'Elf' | 'Dwarf' | 'Halfling' | 'Dragonborn' | 'Gnome'
        | 'Half-Elf' | 'Half-Orc' | 'Tiefling'
        | 'Dragonkin';  // Custom race
}
```

### RaceDataEntry Interface

```typescript
interface RaceDataEntry {
    /** Ability score bonuses */
    ability_bonuses: Partial<Record<Ability, number>>;

    /** Base speed in feet */
    speed: number;

    /** Array of trait IDs for this race */
    traits: string[];

    /** Optional: Available subraces for this race */
    subraces?: string[];
}
```

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
    subraces: ['Fire Dragonkin', 'Ice Dragonkin', 'Lightning Dragonkin']
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

The `getRaceData()` function retrieves race data from both default and custom races:

```typescript
import { getRaceData } from 'playlist-data-engine';

const dragonkinData = getRaceData('Dragonkin');
// Returns: { ability_bonuses: { STR: 2, CON: 1, CHA: 1 }, speed: 30, traits: [...] }
```

---

## Subrace Support

Characters can have subraces, and features/traits can require specific subraces.

### Subrace Property

```typescript
interface CharacterSheet {
    race: Race;
    /** Subrace (e.g., 'High Elf', 'Hill Dwarf', 'Wood Elf') */
    subrace?: string;
    // ... other properties
}
```

### RacialTrait with Subrace

```typescript
interface RacialTrait {
    id: string;
    name: string;
    race: Race;
    /** Optional subrace requirement */
    subrace?: string;
    prerequisites?: FeaturePrerequisite;
    effects?: FeatureEffect[];
    source: 'default' | 'custom';
}
```

### Subrace Validation in Prerequisites

When validating feature prerequisites:

```typescript
// Check subrace requirement
if (prereqs.subrace !== undefined) {
    if (!character.subrace || character.subrace !== prereqs.subrace) {
        errors.push(`Requires subrace ${prereqs.subrace} (current: ${character.subrace || 'none'})`);
    }
}
```

### Subrace Filtering

FeatureRegistry provides `getRacialTraitsForSubrace()`:

```typescript
const registry = FeatureRegistry.getInstance();

// Get traits specific to High Elf subrace
const highElfTraits = registry.getRacialTraitsForSubrace('Elf', 'High Elf');
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
    subraces: ['Fire Dragonkin', 'Ice Dragonkin', 'Lightning Dragonkin']
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
const character = CharacterGenerator.generate(seed, audioProfile, 'Pyro');
// After generation, set the subrace
character.subrace = 'Fire Dragonkin';

// Character will have:
// - Base Dragonkin traits (Draconic Ancestry, Darkvision)
// - Subrace-specific traits (Fire Resistance)
// - Correct ability bonuses (STR+2, CON+1, CHA+1)
```

### Feature with Subrace Prerequisite

Traits can require a specific subrace via prerequisites:

```typescript
import { FeatureRegistry } from 'playlist-data-engine';

// Trait that requires a specific subrace
FeatureRegistry.getInstance().registerRacialTrait({
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
});
```

**Type Augmentation for Custom Races:**

Since `Race` is a closed union, extend it in your project:

```typescript
// In your project's global types file
import 'playlist-data-engine';

declare module 'playlist-data-engine' {
    type Race =
        | 'Human' | 'Elf' | 'Dwarf'
        | 'Dwarf' | 'Halfling' | 'Dragonborn' | 'Gnome'
        | 'Half-Elf' | 'Half-Orc' | 'Tiefling'
        | 'Dragonkin';  // Custom race
}

// Now TypeScript accepts 'Dragonkin' as a valid Race
const dragonkinCharacter: CharacterSheet = {
    // ...
    race: 'Dragonkin'  // No TypeScript error!
};
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

**Location:** `src/core/types/Character.ts`

```typescript
/**
 * Branded type for class names (supports custom classes)
 *
 * Use asClass() to convert a string to the Class type, and isValidClass()
 * to validate at runtime.
 */
export type Class = string & { readonly __ClassBrand: unique symbol };

/**
 * Convert a string to the Class type
 *
 * Use this function to register custom class names.
 *
 * @param value - The class name string
 * @returns The value branded as a Class type
 *
 * @example
 * const customClass: Class = asClass('Necromancer');
 */
export function asClass(value: string): Class;

/**
 * Type guard to check if a string is a valid Class (default or custom)
 *
 * This checks against both default D&D 5e classes and any custom classes
 * registered via ExtensionManager's 'classes.data' category.
 *
 * @param value - The value to check
 * @returns True if the value is a valid class name
 */
export function isValidClass(value: string): value is Class;
```

### ClassDataEntry Interface

**Location:** `src/utils/constants.ts`

```typescript
export interface ClassDataEntry {
    /** Primary ability score for this class */
    primary_ability: Ability;

    /** Hit die size for this class */
    hit_die: number;

    /** Saving throw proficiencies */
    saving_throws: Ability[];

    /** Whether this class can cast spells */
    is_spellcaster: boolean;

    /** Number of skills to choose from */
    skill_count: number;

    /** Available skills for this class (includes custom skills) */
    available_skills: string[];

    /** Whether this class has expertise */
    has_expertise: boolean;

    /** Number of expertise choices (if has_expertise is true) */
    expertise_count?: number;

    /**
     * For template-based classes: the base class to inherit from
     *
     * When specified, the custom class will inherit properties from the base class,
     * with custom properties overriding inherited ones.
     *
     * @example
     * // Necromancer extends Wizard
     * baseClass: 'Wizard'
     */
    baseClass?: Class;

    /** Optional: Audio preferences for class affinity calculation */
    audio_preferences?: {
        primary: 'bass' | 'treble' | 'mid' | 'amplitude' | 'chaos';
        secondary?: 'bass' | 'treble' | 'mid' | 'amplitude' | 'chaos';
        tertiary?: 'bass' | 'treble' | 'mid' | 'amplitude' | 'chaos';
        bass?: number;
        treble?: number;
        mid?: number;
        amplitude?: number;
    };
}
```

### getClassData() Helper Function

**Location:** `src/utils/constants.ts`

```typescript
/**
 * Get class data (default or custom)
 *
 * This helper function retrieves class data from either:
 * 1. The default CLASS_DATA constant (for built-in classes)
 * 2. The ExtensionManager (for custom classes registered via 'classes.data')
 *
 * For template-based custom classes (those with a baseClass property),
 * the base class data is merged with custom data, with custom properties
 * taking precedence.
 *
 * @param className - The class name to look up
 * @returns Class data entry or undefined if not found
 *
 * @example
 * // Get default class data
 * const wizardData = getClassData('Wizard');
 * console.log(wizardData.hit_die); // 6
 *
 * // Get custom class data (if registered via ExtensionManager)
 * const necromancerData = getClassData('Necromancer');
 * if (necromancerData) {
 *     console.log(necromancerData.baseClass); // 'Wizard'
 *     console.log(necromancerData.primary_ability); // 'INT'
 * }
 */
export function getClassData(className: string): ClassDataEntry | undefined;
```

### Template Class Merge Logic

When a custom class specifies `baseClass`, the system merges properties as follows:

```typescript
// The merge happens in getClassData() function in src/utils/constants.ts
{
    ...baseData,        // Base class properties (e.g., Wizard)
    ...classEntry,      // Custom properties override base
    available_skills: classEntry.available_skills || baseData.available_skills
}
```

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

### Class-Specific Data Helper Functions

**Location:** `src/utils/constants.ts`

```typescript
/**
 * Get spell list for a class (default or custom)
 *
 * Checks CLASS_SPELL_LISTS for default classes, or ExtensionManager
 * for custom spell lists registered via 'classSpellLists.${ClassName}'.
 *
 * @param className - The class name to look up
 * @returns Spell list with cantrips and spells_by_level, or undefined
 */
export function getClassSpellList(className: string): {
    cantrips: string[];
    spells_by_level: Record<number, string[]>;
} | undefined;

/**
 * Get spell slots for a class at a specific level (default or custom)
 *
 * Checks SPELL_SLOTS_BY_CLASS for default classes, or ExtensionManager
 * for custom spell slot progressions registered via 'classSpellSlots'.
 *
 * @param className - The class name to look up
 * @param characterLevel - The character level (1-20)
 * @returns Record of spell slots by level, or undefined
 */
export function getSpellSlotsForClass(className: string, characterLevel: number): Record<number, number> | undefined;

/**
 * Get starting equipment for a class (default or custom)
 *
 * Checks CLASS_STARTING_EQUIPMENT for default classes, or ExtensionManager
 * for custom equipment registered via 'classStartingEquipment.${ClassName}'.
 *
 * @param className - The class name to look up
 * @returns Equipment object with weapons, armor, items arrays, or undefined
 */
export function getClassStartingEquipment(className: string): {
    weapons: string[];
    armor: string[];
    items: string[];
} | undefined;
```

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
    available_skills: ['arcana', 'medicine', 'religion', 'necromancy']
    // All other properties (hit_die, saving_throws, etc.) are inherited from Wizard
}]);

// Step 2: Register the class name for validation
manager.register('classes', [asClass('Necromancer')]);
```

**Complete Custom Class** (from scratch):

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
    has_expertise: false
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
    'Hero Name'
);
```

**Class Data Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | Yes | Unique class name |
| `baseClass` | Class | No | If specified, inherits properties from this class |
| `primary_ability` | Ability | Yes* | Primary ability score (STR, DEX, CON, INT, WIS, CHA) - required if no baseClass |
| `hit_die` | number | Yes* | Hit die size (6, 8, 10, 12) - required if no baseClass |
| `saving_throws` | Ability[] | Yes* | Two saving throw abilities - required if no baseClass |
| `is_spellcaster` | boolean | Yes* | Can this class cast spells - required if no baseClass |
| `skill_count` | number | Yes* | Number of skill proficiencies - required if no baseClass |
| `available_skills` | string[] | Yes* | Array of skill IDs - required if no baseClass |
| `has_expertise` | boolean | Yes* | Has expertise feature - required if no baseClass |
| `expertise_count` | number | No | Number of expertise choices (if has_expertise is true) |
| `audio_preferences` | object | No | Audio affinity for class suggestion |

**Default Classes:**

The 12 default D&D 5e classes are always available:
`Barbarian`, `Bard`, `Cleric`, `Druid`, `Fighter`, `Monk`, `Paladin`, `Ranger`, `Rogue`, `Sorcerer`, `Warlock`, `Wizard`

### Common Patterns

Here are common patterns for creating custom classes using the template system:

**Archetype Variant** - Same class, different flavor:

```typescript
{
    name: 'BattleMage',
    baseClass: 'Wizard',
    hit_die: 10,           // More durable than standard Wizard
    saving_throws: ['INT', 'CON'],  // CON instead of WIS
    available_skills: ['arcana', 'athletics', 'intimidation']
}
```

**Multiclass-Inspired** - Two classes combined:

```typescript
{
    name: 'Spellsword',
    baseClass: 'Fighter',
    is_spellcaster: true,  // Add spellcasting
    primary_ability: 'STR',  // Keep Fighter primary
    available_skills: ['athletics', 'acrobatics', 'arcana', 'intimidation']
}
```

**Specialist** - Narrow focus:

```typescript
{
    name: 'Beastmaster',
    baseClass: 'Ranger',
    skill_count: 3,  // Extra skill for animal handling
    available_skills: ['animal_handling', 'nature', 'survival', 'perception']
}
```

### Custom Class Validation

**Location:** `src/core/extensions/ExtensionManager.ts`

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

**Location:** `src/core/generation/ClassSuggester.ts`

The `ClassSuggester` automatically includes custom classes registered via ExtensionManager when suggesting a class based on audio profile:

```typescript
class ClassSuggester {
    /**
     * Suggest a class based on audio profile
     *
     * Selects from available classes (default 12 D&D 5e classes plus any
     * custom classes). Custom classes with audio_preferences are matched
     * against the audio profile.
     *
     * @param audioProfile - The audio analysis result
     * @param rng - Seeded random number generator
     * @returns Suggested class name
     */
    static suggest(audioProfile: AudioProfile, rng: SeededRNG): string;
}
```

---

**Check Extension Status:**

```typescript
const manager = ExtensionManager.getInstance();

// Check if custom data exists
if (manager.hasCustomData('spells')) {
    console.log('Custom spells registered');
}

// Get extension info
const info = manager.getInfo('spells');
console.log(info);
// {
//     hasCustomData: true,
//     defaultCount: 53,
//     customCount: 5,
//     totalCount: 58,
//     mode: 'relative',
//     weights: { ... },
//     registeredAt: 1234567890
// }
```

**Reset and Export:**

```typescript
const manager = ExtensionManager.getInstance();

// Reset single category
manager.reset('spells');

// Reset all categories
manager.resetAll();
```

---

## See Also

- [PREREQUISITES.md](PREREQUISITES.md) - Prerequisites system guide
- [DATA_ENGINE_REFERENCE.md](../DATA_ENGINE_REFERENCE.md) - Complete API reference
- [USAGE_IN_OTHER_PROJECTS.md](../USAGE_IN_OTHER_PROJECTS.md) - Usage examples
