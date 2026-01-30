
---

# PART 4: Template-Based Custom Classes (Future Work)

> **NOTE:** This is a separate part, NOT included in Part 3. Custom classes require additional infrastructure beyond prerequisite systems.

## Overview

This section outlines what's needed for template-based custom classes that extend existing D&D 5e classes.

**Goal:** Allow users to create custom classes like "Necromancer" that are based on "Wizard" but with:
- Custom features
- Modified skill lists
- Adjusted spell lists
- Different hit dice, saving throws, etc.

## Existing Infrastructure (Already Working)

The ExtensionManager **already** supports customization of existing class data via "replace" mode:

```typescript
// Replace Barbarian's class features entirely
manager.register('classFeatures.Barbarian', customBarbarianFeatures, { mode: 'replace' });

// Replace Barbarian's skill list entirely
manager.register('skillLists.Barbarian', customBarbarianSkills, { mode: 'replace' });

// Modify spawn weights for classes
manager.setWeights('classes', { 'Barbarian': 2.0, 'Wizard': 0.5 });
```

**This allows modifying EXISTING classes, but creating NEW classes requires additional infrastructure.**

---

## What's Missing for Creating New Classes

To create **entirely new classes** (e.g., "Necromancer" based on "Wizard"), we need:

### 1. Class Type Extensibility

**Problem:** `Class` type is a hardcoded union, not extensible
**File:** `src/core/types/Character.ts` (line 26-38)

**Current:**
```typescript
export type Class = 'Barbarian' | 'Bard' | 'Cleric' | ... | 'Wizard';
```

**Solution:** Convert to extensible pattern with validation
```typescript
// Option A: Branded type (recommended)
export type Class = string & { readonly __ClassBrand: unique symbol };

// Option B: Type augmentation (user-side)
// Users extend in their project:
declare module 'playlist-data-engine' {
    type Class = 'Barbarian' | ... | 'Wizard' | 'Necromancer';
}
```

### 2. Custom Class Data Registration

**Problem:** CLASS_DATA is a hardcoded Record, not extensible
**File:** `src/utils/constants.ts` (line 61-186)

**Solution:** Add `classes.data` category to ExtensionManager

```typescript
export interface ClassDataEntry {
    /** For template-based classes: extends this base class */
    baseClass?: Class;

    /** Class name (e.g., 'Necromancer') */
    name: string;

    primary_ability: Ability;
    hit_die: number;
    saving_throws: Ability[];
    is_spellcaster: boolean;
    skill_count: number;

    /** Allow custom skill IDs (including custom skills) */
    available_skills: string[];

    has_expertise: boolean;
    expertise_count?: number;

    /** Optional: Audio preferences for class affinity */
    audio_preferences?: {
        primary: string;
        secondary?: string;
        tertiary?: string;
        bass?: number;
        treble?: number;
        mid?: number;
        amplitude?: number;
    };
}

/**
 * Get class data (default or custom)
 */
export function getClassData(className: string): ClassDataEntry | undefined {
    // Check default classes
    if (className in CLASS_DATA) {
        return CLASS_DATA[className as Class];
    }

    // Check ExtensionManager for custom class data
    const manager = ExtensionManager.getInstance();
    const customClassData = manager.get('classes.data' as any);

    if (customClassData && Array.isArray(customClassData)) {
        const classEntry = customClassData.find((d: any) => d.name === className);
        if (classEntry) {
            // If has baseClass, merge with base class data
            if (classEntry.baseClass) {
                const baseData = CLASS_DATA[classEntry.baseClass];
                return { ...baseData, ...classEntry };
            }
            return classEntry as ClassDataEntry;
        }
    }

    return undefined;
}
```

### 3. Class Validation Update

**Problem:** ExtensionManager blocks custom classes
**File:** `src/core/extensions/ExtensionManager.ts` (line 453-458)

**Current validation:**
```typescript
const validClasses: Class[] = ['Barbarian', 'Bard', ...];
if (!validClasses.includes(item)) {
    errors.push(`${prefix} Invalid class...`);
}
```

**Solution:** Update validation to check registered classes
```typescript
} else if (category === 'classes') {
    // Allow default classes OR registered custom classes
    const validClasses: Class[] = ['Barbarian', 'Bard', ... 'Wizard'];

    // Check if it's a default class
    if (validClasses.includes(item)) {
        return; // Valid default class
    }

    // Check if it's a previously registered custom class
    const registeredClasses = this.get('classes') as string[];
    if (registeredClasses && registeredClasses.includes(item)) {
        return; // Valid custom class
    }

    // Check custom class data registration
    const customClassData = this.get('classes.data');
    if (customClassData && Array.isArray(customClassData)) {
        const classNames = customClassData.map((d: any) => d.name);
        if (classNames.includes(item)) {
            return; // Valid custom class (has data registered)
        }
    }

    // If validate is disabled, allow any class
    const currentOptions = this.getCurrentOptions(category);
    if (!currentOptions?.validate) {
        return; // Validation disabled
    }

    errors.push(`${prefix} Invalid class "${item}". Must be one of: ${validClasses.join(', ')} or register custom class via 'classes.data' first.`);
}
```

### 4. Spell/Slot/Equipment Registration for Custom Classes

**Problem:** Custom classes need spell lists, slot progressions, starting equipment
**Files:** `constants.ts` (CLASS_SPELL_LISTS, SPELL_SLOTS_BY_CLASS, CLASS_STARTING_EQUIPMENT)

**Solution:** Add helper functions that check ExtensionManager

```typescript
/**
 * Get spell list for a class (default or custom)
 */
export function getClassSpellList(className: string): { cantrips: string[]; spells_by_level: Record<number, string[]> } | undefined {
    // Check default classes
    if (className in CLASS_SPELL_LISTS) {
        return CLASS_SPELL_LISTS[className];
    }

    // Check ExtensionManager for custom spell list
    const manager = ExtensionManager.getInstance();
    const customSpellLists = manager.get(`classSpellLists.${className}` as any);
    return customSpellLists;
}

/**
 * Get spell slots for a class at a specific level
 */
export function getSpellSlotsForClass(className: string, level: number): Record<number, number> | undefined {
    // Check default classes
    if (className in SPELL_SLOTS_BY_CLASS) {
        return SPELL_SLOTS_BY_CLASS[className]?.[level];
    }

    // Check ExtensionManager for custom spell slot progression
    const manager = ExtensionManager.getInstance();
    const customSlots = manager.get('classSpellSlots' as any);
    return customSlots?.[className]?.[level];
}

/**
 * Get starting equipment for a class
 */
export function getClassStartingEquipment(className: string): { weapons: string[]; armor: string[]; items: string[] } | undefined {
    // Check default classes
    if (className in CLASS_STARTING_EQUIPMENT) {
        return CLASS_STARTING_EQUIPMENT[className];
    }

    // Check ExtensionManager for custom equipment
    const manager = ExtensionManager.getInstance();
    const customEquipment = manager.get('classStartingEquipment' as any);
    return customEquipment?.[className];
}
```

### 5. Update All Class Data Access Points

**Files to update:**
- `src/core/generation/SkillAssigner.ts` - Use `getClassData()` instead of `CLASS_DATA`
- `src/core/generation/SpellManager.ts` - Use `getClassSpellList()`, `getSpellSlotsForClass()`
- `src/core/generation/EquipmentGenerator.ts` - Use `getClassStartingEquipment()`
- `src/core/generation/AbilityScoreCalculator.ts` - Already uses `getRaceData()`, apply same pattern
- `src/core/generation/ClassSuggester.ts` - Use `getClassData().audio_preferences`

---

## Implementation Phases for Part 4

When implementing custom classes, the phases would be:

### Phase 1: Class Type Extensibility
- [x] Convert Class type to branded string or document augmentation
- [x] Update all Class type usages to handle validation at runtime
- [x] Add type guards for class validation

### Phase 2: Class Data Registration
- [x] Add `classes.data` to ExtensionCategory type
- [x] Implement `getClassData()` helper in constants.ts
- [x] Update AbilityScoreCalculator to use `getClassData()`
- [x] Update SkillAssigner to use `getClassData()`

### Phase 3: Class-Specific Data Registration
- [x] Add `classSpellLists.${ClassName}` categories
- [x] Add `classSpellSlots` category
- [x] Add `classStartingEquipment.${ClassName}` categories
- [x] Implement helper functions for spell/slot/equipment lookup
- [x] Update SpellManager to use helpers
- [x] Update EquipmentGenerator to use helpers

### Phase 4: Template-Based Class System
- [x] Implement `baseClass` inheritance in `getClassData()`
- [x] Custom classes inherit from base unless overridden
- [x] Document template class pattern
- [x] Example: "Necromancer" extends "Wizard" with custom features

### Phase 5: Documentation & Testing
- [x] Update DATA_ENGINE_REFERENCE.md with custom classes section
- [ ] Update USAGE_IN_OTHER_PROJECTS.md with custom class examples
- [x] Write unit tests for custom class registration
- [x] Write integration tests for custom class character generation

---

## Template Class Pattern Documentation

### Overview

The Template Class System allows you to create new custom classes that extend (inherit from) existing D&D 5e base classes. This enables rapid creation of specialized classes without duplicating all base class properties.

### How It Works

When you register a custom class with the `baseClass` property, the system automatically:

1. **Looks up the base class data** from the default `CLASS_DATA` constant
2. **Merges properties** using a shallow merge strategy: base properties are spread first, then custom properties
3. **Applies overrides**: Custom properties take precedence over base class properties
4. **Handles special cases**: The `available_skills` array is completely replaced (not merged), allowing full customization

### Merge Logic

```typescript
// The merge happens in getClassData() function in src/utils/constants.ts
{
    ...baseData,        // Base class properties (e.g., Wizard)
    ...classEntry,      // Custom properties override base
    available_skills: classEntry.available_skills || baseData.available_skills
}
```

### Quick Example

```typescript
import { ExtensionManager } from 'playlist-data-engine';
import { asClass } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Register a custom "Necromancer" class based on Wizard
manager.register('classes.data', [{
    name: 'Necromancer',
    baseClass: 'Wizard',  // Inherits from Wizard
    // Only override what's different:
    available_skills: ['arcana', 'medicine', 'religion', 'necromancy']
    // All other properties (hit_die, saving_throws, etc.) are inherited from Wizard
}]);

// Register the class name
manager.register('classes', [asClass('Necromancer')]);
```

### Property Override Behavior

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

### Complete vs. Partial Overrides

#### Partial Override (Recommended)
Specify only the properties you want to change:

```typescript
{
    name: 'Necromancer',
    baseClass: 'Wizard',
    available_skills: ['arcana', 'medicine', 'religion', 'necromancy']
    // Everything else inherited from Wizard
}
```

#### Complete Override
Specify all properties (not using `baseClass`):

```typescript
{
    name: 'Runecaster',
    // No baseClass - must specify everything
    primary_ability: 'WIS',
    hit_die: 8,
    saving_throws: ['WIS', 'CON'],
    is_spellcaster: true,
    skill_count: 3,
    available_skills: ['arcana', 'nature', 'religion', 'insight', 'medicine'],
    has_expertise: false
}
```

### Integration with Other Systems

Custom classes created via the template pattern integrate seamlessly with:

- **Custom Skills**: Register via `skills.${ABILITY}` categories
- **Custom Features**: Register via `classFeatures.${ClassName}` categories
- **Custom Spell Lists**: Register via `classSpellLists.${ClassName}` categories
- **Custom Spell Slots**: Register via `classSpellSlots` category
- **Custom Equipment**: Register via `classStartingEquipment.${ClassName}` categories

### Common Patterns

#### 1. Archetype Variant (Same class, different flavor)
```typescript
{
    name: 'BattleMage',
    baseClass: 'Wizard',
    hit_die: 10,           // More durable than standard Wizard
    saving_throws: ['INT', 'CON'],  // CON instead of WIS
    available_skills: ['arcana', 'athletics', 'intimidation']
}
```

#### 2. Multiclass-Inspired (Two classes combined)
```typescript
{
    name: 'Spellsword',
    baseClass: 'Fighter',
    is_spellcaster: true,  // Add spellcasting
    primary_ability: 'STR',  // Keep Fighter primary
    available_skills: ['athletics', 'acrobatics', 'arcana', 'intimidation']
}
```

#### 3. Specialist (Narrow focus)
```typescript
{
    name: 'Beastmaster',
    baseClass: 'Ranger',
    skill_count: 3,  // Extra skill for animal handling
    available_skills: ['animal_handling', 'nature', 'survival', 'perception']
}
```

### Validation Rules

1. **Base class must exist**: `baseClass` must be a valid D&D 5e class name
2. **Custom properties must be valid**: All properties must match expected types
3. **Class name must be registered**: After registering class data, register the class name via `manager.register('classes', [asClass('ClassName')])`
4. **Custom skills must exist**: If referencing custom skills in `available_skills`, register them first

### Runtime Behavior

- **Character generation**: Custom classes work identically to base classes in `CharacterGenerator.generate()`
- **Skill assignment**: Custom skill lists are respected during skill selection
- **Spell assignment**: Custom spell lists are used if registered via `classSpellLists.${ClassName}`
- **Equipment assignment**: Custom equipment is used if registered via `classStartingEquipment.${ClassName}`

### Testing Your Custom Class

```typescript
import { CharacterGenerator } from 'playlist-data-engine';
import { getClassData } from 'playlist-data-engine';

// Verify class data
const necromancerData = getClassData('Necromancer');
console.log(necromancerData);  // Should show merged properties

// Generate a character
const character = CharacterGenerator.generate(
    'test-seed',
    sampleAudioProfile,
    'Test Character',
    { forceClass: asClass('Necromancer') }
);

console.log(character.class);  // 'Necromancer'
console.log(character.ability_scores.INT);  // Should be high (primary ability)
```

---

## Example Usage (Future)

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Register a custom "Necromancer" class based on Wizard
manager.register('classes.data', [{
    name: 'Necromancer',
    baseClass: 'Wizard',  // Inherits from Wizard by default
    primary_ability: 'INT',
    hit_die: 8,  // Same as Wizard
    saving_throws: ['INT', 'WIS'],  // Same as Wizard
    is_spellcaster: true,
    skill_count: 2,
    // Override available_skills to include custom skill
    available_skills: ['arcana', 'medicine', 'religion', 'necromancy'],
    has_expertise: false
}]);

// Register custom skill for Necromancer
manager.register('skills.INT', [{
    id: 'necromancy',
    name: 'Necromancy',
    ability: 'INT',
    description: 'Knowledge of undead creation and control',
    prerequisites: { class: 'Necromancer' },  // Only for Necromancers
    source: 'custom'
}]);

// Register custom features for Necromancer (replaces Wizard features)
manager.register('classFeatures.Necromancer', [
    {
        id: 'necromancer_raise_dead',
        name: 'Raise Undead',
        description: 'Can raise undead creatures',
        type: 'active',
        level: 1,
        class: 'Necromancer',
        prerequisites: {
            class: 'Necromancer',
            abilities: { INT: 13 }
        },
        effects: [
            { type: 'ability_unlock', target: 'raise_undead', value: true }
        ],
        source: 'custom'
    },
    {
        id: 'necromancer_deadlord',
        name: 'Dead Lord',
        description: 'Control more powerful undead',
        type: 'passive',
        level: 10,
        class: 'Necromancer',
        prerequisites: {
            class: 'Necromancer',
            level: 10,
            skills: ['necromancy']  // Requires necromancy skill
        },
        effects: [
            { type: 'passive_modifier', target: 'undead_control_limit', value: 5 }
        ],
        source: 'custom'
    }
], { mode: 'replace' });  // Replace Wizard features entirely

// Register custom spell list for Necromancer (Wizard spells + necromancy spells)
manager.register('classSpellLists.Necromancer', [{
    cantrips: [' Chill Touch', 'Mage Hand', 'Mending', 'Message'],
    spells_by_level: {
        1: ['Animate Dead', 'False Life', 'Ray of Sickness'],
        2: ['Ray of Enfeeblement', 'Web'],
        3: ['Animate Dead', 'Feign Death'],
        // ... more levels
    }
}]);

// Now generate a Necromancer character!
const necromancer = generator.generate({
    class: 'Necromancer',
    level: 5,
    // ... other options
});

// Result:
// - Class: Necromancer
// - Skills: arcana, necromancy (necromancy skill available because class matches)
// - Features: Raise Undead (level 1), Dead Lord (locked until level 10 + necromancy skill)
// - Spells: Animate Dead, False Life, Ray of Sickness (custom spell list)
```

---

## Key Takeaways

1. **For Modifying Existing Classes:** Infrastructure already exists via ExtensionManager "replace" mode
2. **For Creating New Classes:** Need Part 4 infrastructure (Class type extensibility, class data registration, spell/slot/equipment helpers)
3. **Template Pattern:** New classes can extend base classes via `baseClass` property
4. **Prerequisites Tie-In:** Custom classes can have custom skills/features with prerequisites checking for that specific class

---
