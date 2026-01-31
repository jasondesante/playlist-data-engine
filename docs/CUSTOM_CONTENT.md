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

### Example Subrace-Specific Trait

```typescript
import { FeatureRegistry } from 'playlist-data-engine';

const fireDragonkinResistance = {
    id: 'fire_dragonkin_fire_resistance',
    name: 'Fire Resistance',
    race: 'Dragonkin',
    subrace: 'Fire Dragonkin',  // Only for this subrace
    prerequisites: {
        subrace: 'Fire Dragonkin'
    },
    effects: [
        { type: 'ability_unlock', target: 'fire_resistance', value: true }
    ],
    source: 'custom'
};

FeatureRegistry.getInstance().registerRacialTrait(fireDragonkinResistance);
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

**Complete Custom Class (without baseClass):**

```typescript
// Register a complete custom class (no inheritance)
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

manager.register('classes', [asClass('Runecaster')]);
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

## Spawn Rate Control

Both FeatureRegistry and SkillRegistry support per-item spawn rate control through ExtensionManager's weight system. This allows custom content to be more or less likely to appear during character generation.

### Feature Spawn Rates

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Set spawn rates for Barbarian class features
manager.setWeights('classFeatures.Barbarian', {
    'rage': 1.0,                // Normal spawn rate
    'unarmored_defense': 1.0,   // Normal spawn rate
    'reckless_attack': 0.5,     // Half as likely
    'danger_sense': 0.3,        // Less likely
    'dragon_fury': 0.1          // Very rare (10% of normal)
});

// Set spawn rates for racial traits
manager.setWeights('racialTraits.Elf', {
    'darkvision': 1.0,
    'fey_ancestry': 0.8,
    'trance': 0.5,
    'custom_elf_trait': 0.2     // Rare custom trait
});
```

### Skill Spawn Rates

```typescript
// Set spawn rates for skills in general
manager.setWeights('skills', {
    'athletics': 1.0,
    'acrobatics': 1.0,
    'survival': 0.8,           // Slightly less common
    'survival_cold': 0.3,      // Rare custom skill
    'navigation': 0.5,         // Uncommon custom skill
    'intimidation': 1.2        // More common than default
});

// Set spawn rates for class-specific skill lists
manager.setWeights('skillLists.Rogue', {
    'stealth': 1.5,            // Rogues very likely to get stealth
    'perception': 1.3,
    'acrobatics': 1.2,
    'athletics': 0.5           // Less common for rogues
});
```

### Weight Modes

```typescript
// Relative mode (default): Weights added to pool, normalized
manager.register('classFeatures.Barbarian', customFeatures, {
    mode: 'relative',
    weights: { 'dragon_fury': 0.5 }  // Reduces probability by 50%
});

// Absolute mode: Only specified weights used, all others = 1
manager.register('skills', customSkills, {
    mode: 'absolute',
    weights: {
        'navigation': 5.0,    // Very common
        'intimidation': 3.0,  // Common
        'survival_cold': 1.0  // Normal
    }
    // All other skills implicitly have weight 1
});

// Default mode: Equal weights for all items
manager.register('racialTraits', customTraits, {
    mode: 'default'  // Ignore custom weights
});
```

### Get Current Weights

```typescript
// Get combined weights (defaults + custom)
const weights = manager.getWeights('skills');
console.log(weights);
// {
//     athletics: 1.0,
//     survival: 0.8,
//     survival_cold: 0.3,
//     navigation: 0.5,
//     intimidation: 1.2,
//     ...
// }

// Get default weights only
const defaultWeights = manager.getDefaultWeights('skills');
console.log(defaultWeights);
// { athletics: 1.0, acrobatics: 1.0, ...all 1.0 }
```

### Advanced Patterns

**Per-Category Weight Management:**

```typescript
const manager = ExtensionManager.getInstance();

// Set weights independently of registration
manager.register('equipment', customItems);

// Later, adjust spawn rates
manager.setWeights('equipment', {
    'Dragon Scale Armor': 0.1,  // Rare
    'Sword': 2.0,               // Common
    'Potion': 5.0               // Very common
});

// Get current weights for display
const weights = manager.getWeights('equipment');
console.log(weights);
```

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
