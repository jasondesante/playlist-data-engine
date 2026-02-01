EXTRA DATA BELOW HERE NEEDS TO BE INTEGRATED INTO THE ABOVE GUIDE
REMOVE REDUNDANT STUFF TO CREATE A COMPREHENSIVE DOCUMENTATION FILE.



EXTRA STUFF FROM USAGE_IN_OTHER_PROJECTS

### Custom Features and Skills

**NEW:** The Playlist Data Engine now supports full customization of class features, racial traits, and skills through the extensibility system!

#### Custom Class Features

Create your own class features with prerequisites, effects, and spawn rate control:

```typescript
import { FeatureRegistry, ExtensionManager, type ClassFeature } from 'playlist-data-engine';

// Method 1: Direct registration with FeatureRegistry
const registry = FeatureRegistry.getInstance();

// Add a custom Barbarian feature
const dragonFury: ClassFeature = {
    id: 'dragon_fury',
    name: 'Dragon Fury',
    description: 'Channel your draconic heritage to deal bonus fire damage while raging.',
    type: 'active',
    level: 3,
    class: 'Barbarian',
    prerequisites: {
        level: 3,
        // Optional: Require specific features first
        features: ['rage']
    },
    effects: [
        {
            type: 'resource_grant',
            target: 'dragon_fury_damage',
            value: 2,
            description: '+2 fire damage while raging'
        },
        {
            type: 'passive_modifier',
            target: 'fire_resistance',
            value: true,
            condition: 'while_raging',
            description: 'Fire resistance while raging'
        }
    ],
    source: 'custom'
};

registry.registerClassFeature(dragonFury);

// Method 2: Register via ExtensionManager (recommended)
const manager = ExtensionManager.getInstance();

manager.register('classFeatures', [dragonFury], {
    mode: 'append',  // Add to default features
    weights: {
        'dragon_fury': 0.5  // Half as likely to spawn in selection contexts
    }
});

// Class-specific feature registration
manager.register('classFeatures.Barbarian', [dragonFury]);
```

#### Custom Racial Traits

Create custom racial traits with effects and conditions:

```typescript
import { FeatureRegistry, type RacialTrait } from 'playlist-data-engine';

const registry = FeatureRegistry.getInstance();

// Add a custom Elf trait
const elvenCombatTraining: RacialTrait = {
    id: 'elf_weapon_training',
    name: 'Elven Weapon Training',
    description: 'You are proficient with the longsword, shortsword, shortbow, and longbow.',
    race: 'Elf',
    prerequisites: {
        // Optional: Require specific subrace
        subrace: 'High Elf'
    },
    effects: [
        {
            type: 'skill_proficiency',
            target: 'longsword',
            value: 'proficient',
            description: 'Proficient with longsword'
        },
        {
            type: 'skill_proficiency',
            target: 'shortsword',
            value: 'proficient',
            description: 'Proficient with shortsword'
        },
        {
            type: 'skill_proficiency',
            target: 'shortbow',
            value: 'proficient',
            description: 'Proficient with shortbow'
        },
        {
            type: 'skill_proficiency',
            target: 'longbow',
            value: 'proficient',
            description: 'Proficient with longbow'
        }
    ],
    source: 'custom'
};

registry.registerRacialTrait(elvenCombatTraining);
```

#### Custom Skills

Create custom skills for your game:

```typescript
import { SkillRegistry, type CustomSkill } from 'playlist-data-engine';

const skillRegistry = SkillRegistry.getInstance();

// Add a custom survival skill for cold environments
const coldSurvival: CustomSkill = {
    id: 'survival_cold',
    name: 'Survival (Cold Environments)',
    description: 'Expertise in surviving and navigating in cold weather conditions.',
    ability: 'WIS',
    armorPenalty: true,  // Affected by armor disadvantage
    categories: ['exploration', 'environmental'],
    source: 'custom',
    tags: ['wilderness', 'weather', 'arctic']
};

skillRegistry.registerSkill(coldSurvival);

// Register via ExtensionManager with spawn rate control
const manager = ExtensionManager.getInstance();

manager.register('skills', [coldSurvival], {
    mode: 'append',
    weights: {
        'survival_cold': 0.3  // Less likely to spawn than default skills
    }
});

// Register ability-specific skills
manager.register('skills.WIS', [coldSurvival]);

// Verify the skill was registered
if (skillRegistry.isValidSkill('survival_cold')) {
    console.log('Custom skill registered successfully!');
}

// Get skill metadata
const skill = skillRegistry.getSkill('survival_cold');
console.log(`${skill.name} (uses ${skill.ability})`);
console.log(`Categories: ${skill.categories.join(', ')}`);
```

#### Feature Effects

Features can apply various effects to characters:

```typescript
import { type ClassFeature, type FeatureEffect } from 'playlist-data-engine';

const customFeature: ClassFeature = {
    id: 'example_feature',
    name: 'Example Feature',
    description: 'Demonstrates all effect types',
    type: 'passive',
    level: 5,
    class: 'Fighter',
    effects: [
        // Stat Bonus: Increase ability score
        {
            type: 'stat_bonus',
            target: 'STR',
            value: 2,
            description: '+2 Strength score'
        },

        // Skill Proficiency: Grant skill proficiency
        {
            type: 'skill_proficiency',
            target: 'athletics',
            value: 'expertise',
            description: 'Expertise in Athletics'
        },

        // Ability Unlock: Grant special ability
        {
            type: 'ability_unlock',
            target: 'second_wind',
            value: true,
            description: 'Gain Second Wind ability'
        },

        // Passive Modifier: Add constant bonus
        {
            type: 'passive_modifier',
            target: 'speed',
            value: 10,
            condition: 'unarmored',
            description: '+10 speed when unarmored'
        },

        // Resource Grant: Grant resource pool
        {
            type: 'resource_grant',
            target: 'ki_points',
            value: 2,
            description: 'Gain 2 Ki points per short rest'
        },

        // Spell Slot Bonus: Grant additional spell slots
        {
            type: 'spell_slot_bonus',
            target: 'spell_slots_1',
            value: 1,
            description: '+1 level 1 spell slot'
        }
    ],
    source: 'custom'
};
```

#### Querying Features and Skills

```typescript
import { FeatureRegistry, SkillRegistry } from 'playlist-data-engine';

const featureRegistry = FeatureRegistry.getInstance();
const skillRegistry = SkillRegistry.getInstance();

// Get all features for a class at a specific level
const barbarianLevel3Features = featureRegistry.getClassFeatures('Barbarian', 3);
console.log(`Barbarian level 3 features:`, barbarianLevel3Features.map(f => f.name));

// Get all racial traits for a race
const elfTraits = featureRegistry.getRacialTraits('Elf');
console.log(`Elf traits:`, elfTraits.map(t => t.name));

// Get skills by ability
const wisdomSkills = skillRegistry.getSkillsByAbility('WIS');
console.log(`WIS skills:`, wisdomSkills.map(s => s.id));

// Get skills by category
const explorationSkills = skillRegistry.getSkillsByCategory('exploration');
console.log(`Exploration skills:`, explorationSkills.map(s => s.name));

// Get registry statistics
const featureStats = featureRegistry.getRegistryStats();
console.log(`Features: ${featureStats.totalFeatures} (${featureStats.customFeatures} custom)`);

const skillStats = skillRegistry.getRegistryStats();
console.log(`Skills: ${skillStats.totalSkills} (${skillStats.customSkills} custom)`);
```

### Custom Classes

**NEW:** Create entirely new classes or extend existing D&D 5e classes using the template-based class system!

#### Overview

The Template Class System allows you to create new custom classes that extend (inherit from) existing D&D 5e base classes. This enables rapid creation of specialized classes without duplicating all base class properties.

#### Creating a Template-Based Custom Class

Create a new class by extending an existing base class:

```typescript
import { ExtensionManager, asClass } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Register a custom "Necromancer" class based on Wizard
manager.register('classes.data', [{
    name: 'Necromancer',
    baseClass: 'Wizard',  // Inherits from Wizard by default
    // Only override what's different:
    available_skills: ['arcana', 'medicine', 'religion', 'necromancy']
    // All other properties (hit_die, saving_throws, etc.) are inherited from Wizard
}]);

// Register the class name
manager.register('classes', [asClass('Necromancer')]);
```

The `baseClass` property enables template inheritance:
- **Properties are merged**: Base class properties are spread first, then custom properties override
- **Complete overrides**: Specify all properties without `baseClass` for a completely custom class
- **Skill lists are replaced**: The `available_skills` array is completely replaced (not merged)

#### Custom Class with Complete Override

Create a class from scratch without inheriting from a base class:

```typescript
// Register a completely custom "Runecaster" class
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
    // Optional: Audio preferences for class affinity
    audio_preferences: {
        primary: 'folk',
        bass: 0.6,
        treble: 0.7,
        mid: 0.5,
        amplitude: 0.6
    }
}]);

manager.register('classes', [asClass('Runecaster')]);
```

#### Custom Class with Features

Add custom class features to your new class:

```typescript
// Register custom features for Necromancer
manager.register('classFeatures.Necromancer', [
    {
        id: 'necromancer_raise_dead',
        name: 'Raise Undead',
        description: 'Can raise undead creatures to serve you.',
        type: 'active',
        level: 1,
        class: 'Necromancer',
        prerequisites: {
            class: 'Necromancer',
            abilities: { INT: 13 }
        },
        effects: [
            {
                type: 'ability_unlock',
                target: 'raise_undead',
                value: true,
                description: 'Can cast Animate Dead'
            }
        ],
        source: 'custom'
    },
    {
        id: 'necromancer_deadlord',
        name: 'Dead Lord',
        description: 'Control more powerful undead creatures.',
        type: 'passive',
        level: 10,
        class: 'Necromancer',
        prerequisites: {
            class: 'Necromancer',
            level: 10,
            skills: ['necromancy']
        },
        effects: [
            {
                type: 'passive_modifier',
                target: 'undead_control_limit',
                value: 5,
                description: 'Control 5 additional HD of undead'
            }
        ],
        source: 'custom'
    }
], { mode: 'replace' });  // Replace Wizard features entirely
```

#### Custom Class with Skills

Register custom skills for your class:

```typescript
// Register custom skill for Necromancer
manager.register('skills.INT', [{
    id: 'necromancy',
    name: 'Necromancy',
    ability: 'INT',
    description: 'Knowledge of undead creation and control.',
    prerequisites: { class: 'Necromancer' },  // Only for Necromancers
    source: 'custom'
}]);
```

#### Custom Class with Spells

Provide custom spell lists for your spellcasting class:

```typescript
// Register custom spell list for Necromancer
manager.register('classSpellLists.Necromancer', [{
    cantrips: ['Chill Touch', 'Mage Hand', 'Mending', 'Message'],
    spells_by_level: {
        1: ['Animate Dead', 'False Life', 'Ray of Sickness'],
        2: ['Ray of Enfeeblement', 'Web'],
        3: ['Animate Dead', 'Feign Death', 'Speak with Dead'],
        // ... more levels
    }
}]);
```

#### Custom Class with Spell Slots

Define custom spell slot progression:

```typescript
// Register custom spell slot progression
manager.register('classSpellSlots', {
    'Necromancer': {
        1: { 1: 2 },
        2: { 1: 3 },
        3: { 1: 4, 2: 2 },
        4: { 1: 4, 2: 3 },
        5: { 1: 4, 2: 3, 3: 2 },
        // ... more levels
    }
});
```

#### Custom Class with Starting Equipment

Define custom starting equipment:

```typescript
// Register custom starting equipment
manager.register('classStartingEquipment.Necromancer', [{
    weapons: ['Dagger', 'Quarterstaff'],
    armor: [],
    items: ['Component Pouch', 'Spellbook', 'Bone Charm']
}]);
```

#### Generating a Custom Class Character

Generate a character with your custom class:

```typescript
import { CharacterGenerator, getClassData } from 'playlist-data-engine';

// Verify class data
const necromancerData = getClassData('Necromancer');
console.log(necromancerData);
// Output: { name: 'Necromancer', baseClass: 'Wizard', hit_die: 8, ... }

// Generate a character
const character = CharacterGenerator.generate(
    'test-seed',
    sampleAudioProfile,
    'Test Character',
    { forceClass: asClass('Necromancer') }
);

console.log(character.class);  // 'Necromancer'
console.log(character.ability_scores.INT);  // High (primary ability)
console.log(character.class_features);  // ['necromancer_raise_dead']
console.log(character.skills);  // Includes 'necromancy'
```

#### Common Patterns

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

#### Validation Rules

1. **Base class must exist**: `baseClass` must be a valid D&D 5e class name
2. **Custom properties must be valid**: All properties must match expected types
3. **Class name must be registered**: After registering class data, register the class name via `manager.register('classes', [asClass('ClassName')])`
4. **Custom skills must exist**: If referencing custom skills in `available_skills`, register them first

### Spawn Rate Control

Control how often custom content appears in generated characters using spawn rate weights:

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// ===== CLASS FEATURES =====
// Make certain Barbarian features more or less common
manager.setWeights('classFeatures.Barbarian', {
    'rage': 1.0,              // Normal spawn rate (default)
    'dragon_fury': 2.0,       // Twice as likely to appear
    'reckless_attack': 0.5    // Half as likely to appear
});

// ===== RACIAL TRAITS =====
// Control trait spawn rates for Elf
manager.setWeights('racialTraits.Elf', {
    'darkvision': 1.0,        // Always appears (default trait)
    'elf_weapon_training': 0.3,  // 30% of characters get this
    'fey_ancestry': 1.0       // Always appears (default trait)
});

// ===== SKILLS =====
// Control which skills appear during character generation
manager.setWeights('skills', {
    'athletics': 2.0,         // Twice as likely to be selected
    'survival_cold': 0.5,     // Half as likely
    'custom_skill_1': 0.0     // Never spawn (disabled)
});

// Per-ability skill spawn rates
manager.setWeights('skills.WIS', {
    'perception': 1.5,        // More likely for WIS-based characters
    'survival': 0.8,          // Less likely
    'survival_cold': 0.2      // Rare WIS skill
});

// ===== APPEARANCE =====
// Control appearance options
manager.setWeights('appearance.bodyTypes', {
    'athletic': 1.5,          // More common
    'muscular': 1.0,          // Normal
    'slender': 0.8,           // Less common
    'stocky': 0.5             // Rare
});

// ===== EQUIPMENT =====
// Control equipment spawn rates
manager.setWeights('equipment', {
    'Longsword': 1.5,         // More common
    'Dragon Scale Armor': 0.1, // Rare (10% spawn rate)
    'Potion of Healing': 2.0   // Very common
});

// Weight modes: relative vs absolute
manager.register('classFeatures', [customFeature], {
    mode: 'relative',  // Custom weights add to default distribution
    weights: { 'customFeature': 1.0 }
});

manager.register('classFeatures', [customFeature], {
    mode: 'absolute',  // Custom weights replace default distribution
    weights: {
        'rage': 5,
        'customFeature': 3,
        'otherFeature': 2
    }
});

// Get current spawn weights
const currentWeights = manager.getWeights('classFeatures.Barbarian');
console.log('Current Barbarian feature weights:', currentWeights);
```

#### Spawn Rate Modes



import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// ===== RELATIVE MODE (default) =====
// Custom weights are added to the default pool
manager.register('skills', [customSkill], {
    mode: 'relative',
    weights: {
        'customSkill': 2.0  // Twice as likely relative to defaults
    }
});

// Result: customSkill competes with default skills
// If default skills have weight 1.0, customSkill at 2.0 is twice as likely

// ===== ABSOLUTE MODE =====
// Custom weights completely replace the default distribution
manager.register('skills', [customSkill1, customSkill2], {
    mode: 'absolute',
    weights: {
        'customSkill1': 7,  // 70% spawn rate
        'customSkill2': 3   // 30% spawn rate
    }
});

// Result: ONLY customSkill1 and customSkill2 can spawn
// Default skills are completely excluded (weight 0)

// ===== DEFAULT MODE =====
// All items have equal probability (ignores custom weights)
manager.register('skills', [customSkill], {
    mode: 'default'
});

// Result: All skills (default + custom) have equal probability
```

#### Advanced Weight Configuration

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Hierarchical weight system
// Category defaults with individual overrides

// Set default for all skills
manager.setWeights('skills', {
    default: 1.0  // All skills have equal weight by default
});

// Override specific skills
manager.setWeights('skills', {
    'athletics': 2.0,      // Override: athletics is now 2x
    'acrobatics': 0.5,     // Override: acrobatics is now 0.5x
    // All other skills remain at 1.0 (the default)
});

// Per-class skill spawn rates
manager.setWeights('skillLists.Barbarian', {
    'athletics': 2.0,      // Barbarians favor athletics
    'survival': 1.5,       // And survival
    'arcana': 0.2          // But rarely get arcana
});

manager.setWeights('skillLists.Wizard', {
    'arcana': 2.0,         // Wizards favor arcana
    'history': 1.5,        // And history
    'athletics': 0.2       // But rarely get athletics
});

// Zero weight = never spawn
manager.setWeights('classFeatures.Barbarian', {
    'useless_feature': 0.0  // This feature will never spawn
});

// Reset to defaults
manager.reset('classFeatures.Barbarian');
// Now all Barbarian features are back to equal probability

// Reset all categories
manager.resetAll();
```

#### Complete Custom Content Pack Example

```typescript
import { ExtensionManager, FeatureRegistry, SkillRegistry } from 'playlist-data-engine';

// Create an expansion pack with custom features, skills, and spawn rates
function registerArcticExpansionPack() {
    const manager = ExtensionManager.getInstance();
    const featureRegistry = FeatureRegistry.getInstance();
    const skillRegistry = SkillRegistry.getInstance();

    // ===== CUSTOM FEATURES =====
    const frostRage = {
        id: 'frost_rage',
        name: 'Frost Rage',
        description: 'Your rage radiates cold, dealing extra cold damage.',
        type: 'active',
        level: 3,
        class: 'Barbarian',
        effects: [
            {
                type: 'resource_grant',
                target: 'cold_damage_bonus',
                value: 3,
                description: '+3 cold damage while raging'
            }
        ],
        source: 'custom'
    };

    const snowWalker = {
        id: 'snow_walker',
        name: 'Snow Walker',
        description: 'You move through snow and ice without penalty.',
        type: 'passive',
        level: 1,
        class: 'Ranger',
        race: 'Human',
        effects: [
            {
                type: 'ability_unlock',
                target: 'snow_movement',
                value: true,
                description: 'No movement penalty in snow/ice'
            },
            {
                type: 'passive_modifier',
                target: 'survival_cold_bonus',
                value: 5,
                description: '+5 Survival in cold environments'
            }
        ],
        source: 'custom'
    };

    // ===== CUSTOM SKILLS =====
    const coldSurvival = {
        id: 'survival_cold',
        name: 'Survival (Cold Environments)',
        description: 'Expertise in cold weather survival.',
        ability: 'WIS',
        armorPenalty: true,
        categories: ['exploration', 'environmental'],
        source: 'custom'
    };

    const iceFishing = {
        id: 'ice_fishing',
        name: 'Ice Fishing',
        description: 'Ability to catch fish in frozen waters.',
        ability: 'WIS',
        armorPenalty: false,
        categories: ['exploration', 'survival'],
        source: 'custom'
    };

    // ===== REGISTER EVERYTHING =====
    // Features
    featureRegistry.registerClassFeatures([frostRage, snowWalker]);
    manager.register('classFeatures.Barbarian', [frostRage], {
        weights: { 'frost_rage': 0.5 }  // Rare feature
    });
    manager.register('classFeatures.Ranger', [snowWalker], {
        weights: { 'snow_walker': 0.7 }
    });

    // Skills
    skillRegistry.registerSkills([coldSurvival, iceFishing]);
    manager.register('skills', [coldSurvival, iceFishing]);
    manager.register('skills.WIS', [coldSurvival, iceFishing], {
        weights: {
            'survival_cold': 0.5,  // Less common than default skills
            'ice_fishing': 0.3      // Quite rare
        }
    });

    // ===== SPAWN RATE CONFIGURATION =====
    // Make cold-themed content more likely for certain classes
    manager.setWeights('skillLists.Ranger', {
        'survival_cold': 2.0,  // Rangers love this skill
        'ice_fishing': 1.5
    });

    manager.setWeights('skillLists.Barbarian', {
        'survival_cold': 1.5,  // Barbarians also get this
        'ice_fishing': 0.5
    });

    console.log('Arctic Expansion Pack registered!');
}

// Register the expansion pack
registerArcticExpansionPack();

// Generate characters with the new content
const character = CharacterGenerator.generate(seed, audio, 'Arctic Hero');
// Character may now have frost_rage, snow_walker, or survival_cold skill!
```

### Skills with Prerequisites

Skills can have prerequisites that must be met before a character can gain proficiency in them. This allows for advanced skills that require base skills, specific features, spells, ability scores, level, class, or race.

```typescript
import { SkillRegistry, SkillValidator, CharacterGenerator } from 'playlist-data-engine';

const registry = SkillRegistry.getInstance();

// ===== SKILL WITH FEATURE PREREQUISITES =====
// Dragon Smithing: Requires Draconic Bloodline feature
const dragonSmithing: CustomSkill = {
    id: 'dragon_smithing',
    name: 'Dragon Smithing',
    description: 'Craft weapons from dragon scales',
    ability: 'INT',
    prerequisites: {
        features: ['draconic_bloodline'],  // Requires Sorcerer feature
        level: 5,
        class: 'Sorcerer'
    },
    source: 'custom'
};

registry.registerSkill(dragonSmithing);

// ===== SKILL WITH ABILITY SCORE AND SKILL PREREQUISITES =====
// Advanced Arcana: Requires INT 16 and proficiency in Arcana
const advancedArcana: CustomSkill = {
    id: 'advanced_arcana',
    name: 'Advanced Arcana',
    description: 'Cast complex spells and understand magical theory',
    ability: 'INT',
    prerequisites: {
        abilities: { INT: 16 },  // Requires INT 16 or higher
        skills: ['arcana'],       // Must already know Arcana
        level: 7
    },
    source: 'custom'
};

registry.registerSkill(advancedArcana);

// ===== SKILL WITH SPELL PREREQUISITES =====
// Spell Mastery: Requires knowing specific spells first
const spellMasterySkill: CustomSkill = {
    id: 'spell_mastery',
    name: 'Spell Mastery',
    description: 'Improved control over known spells',
    ability: 'INT',
    prerequisites: {
        spells: ['Fireball', 'Lightning Bolt'],  // Must know these spells
        class: 'Wizard',
        level: 10
    },
    source: 'custom'
};

registry.registerSkill(spellMasterySkill);

// ===== SKILL WITH RACE PREREQUISITES =====
// Dwarven Combat Training: Dwarf only
const dwarvenCombat: CustomSkill = {
    id: 'dwarven_warfare',
    name: 'Dwarven Warfare',
    description: 'Advanced dwarven combat techniques',
    ability: 'STR',
    prerequisites: {
        race: 'Dwarf'
    },
    source: 'custom'
};

registry.registerSkill(dwarvenCombat);

// ===== VALIDATING SKILL PREREQUISITES =====
// Check if a character meets the requirements
const character = CharacterGenerator.generate(seed, audioProfile, 'Hero');
const skill = registry.getSkill('dragon_smithing');

if (skill && skill.prerequisites) {
    const result = SkillValidator.validateSkillPrerequisites(skill, character);

    if (!result.valid) {
        console.log('Unmet prerequisites:', result.unmet);
        // Output example: ["Requires feature: draconic_bloodline", "Requires level 5 (current: 1)"]
    }
}

// Skills with unmet prerequisites are automatically
// filtered out during character generation
```

### Spells with Prerequisites

Spells can have prerequisites that must be met before a spellcaster can learn them. This allows for specialized spells that require specific features, abilities, spells, skills, level, or class.

```typescript
import { SpellValidator, SpellManager, ExtensionManager } from 'playlist-data-engine';

// ===== SPELL WITH FEATURE PREREQUISITES =====
// Dragon Breath: Requires Draconic Bloodline feature
const dragonBreath = {
    id: 'dragon_breath',
    name: 'Dragon Breath',
    level: 3,
    school: 'Evocation',
    casting_time: '1 action',
    range: '60 ft cone',
    components: ['V', 'S', 'M'],
    duration: 'Instantaneous',
    description: 'Exhale destructive energy',
    prerequisites: {
        features: ['dragon_bloodline'],
        abilities: { CHA: 16 }
    }
};

// ===== SPELL WITH LEVEL AND CLASS PREREQUISITES =====
// Meteor Swarm: High-level evocation spell
const limitedMeteorSwarm = {
    id: 'limited_meteor_swarm',
    name: 'Meteor Swarm',
    level: 9,
    school: 'Evocation',
    casting_time: '1 action',
    range: '1 mile',
    components: ['V', 'S'],
    duration: 'Instantaneous',
    description: 'Blazing orbs rain down',
    prerequisites: {
        level: 17,  // Character must be level 17+
        class: 'Wizard',
        spells: ['Fireball']  // Must know Fireball first
    }
};

// ===== SPELL WITH SKILL PREREQUISITES =====
// Arcane Sword: Requires Arcana proficiency
const arcaneSwordSpell = {
    id: 'arcane_sword',
    name: 'Arcane Sword',
    level: 5,
    school: 'Evocation',
    casting_time: '1 bonus action',
    range: '60 ft',
    components: ['V', 'S', 'M'],
    duration: 'Concentration, 1 minute',
    description: 'Summon a sword of pure magic',
    prerequisites: {
        skills: ['arcana']  // Requires Arcana proficiency
    }
};

// ===== REGISTER CUSTOM SPELLS =====
const manager = ExtensionManager.getInstance();
manager.register('spells', [dragonBreath, limitedMeteorSwarm, arcaneSwordSpell]);

// ===== VALIDATE SPELL PREREQUISITES =====
const character = CharacterGenerator.generate(seed, audioProfile, 'Sorcerer');
const spell = SPELL_DATABASE['dragon_breath'];

if (spell.prerequisites) {
    const result = SpellValidator.validateSpellPrerequisites(spell, character);

    if (!result.valid) {
        console.log('Cannot learn this spell:', result.unmet);
    }
}

// During character generation, SpellManager automatically filters
// out spells that have unmet prerequisites
const knownSpells = SpellManager.getKnownSpells(
    character.class,
    character.level,
    character  // Pass character for prerequisite filtering
);
// Only includes spells whose prerequisites are met

```
### Custom Races with Subraces

The engine supports fully extensible custom races with optional subrace variants. Register custom race data and the engine will validate and use it during character generation.
```typescript
import { ExtensionManager } from 'playlist-data-engine';

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

// ===== FEATURE WITH SUBRACE PREREQUISITE =====
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

### Features with Skill/Spell Prerequisites

Class features can now require skills or spells as prerequisites, in addition to the existing support for features, abilities, level, class, and race.

```typescript
import { FeatureRegistry, FeatureValidator } from 'playlist-data-engine';

const registry = FeatureRegistry.getInstance();

// ===== FEATURE REQUIRING SKILL PROFICIENCY =====
// Arcane Smith: Requires Arcana skill proficiency
const arcaneSmith = {
    id: 'arcane_smith',
    name: 'Arcane Smith',
    description: 'Can enchant magical items',
    type: 'passive',
    level: 7,
    class: 'Wizard',
    prerequisites: {
        skills: ['arcana'],  // Requires Arcana proficiency
        level: 7
    },
    effects: [
        { type: 'ability_unlock', target: 'item_enchantment', value: true }
    ],
    source: 'custom'
};

registry.registerClassFeature(arcaneSmith);

// ===== FEATURE REQUIRING SPELL KNOWLEDGE =====
// Spellblade: Requires knowing specific spells
const spellblade = {
    id: 'spellblade',
    name: 'Spellblade',
    description: 'Channel spells through your weapon',
    type: 'active',
    level: 10,
    class: 'Eldritch Knight',
    prerequisites: {
        spells: ['Green-Flame Blade', 'Booming Blade'],
        features: ['weapon_bond']
    },
    effects: [
        { type: 'passive_modifier', target: 'spell_strike_damage', value: 4 }
    ],
    source: 'custom'
};

registry.registerClassFeature(spellblade);

// ===== RACIAL TRAIT WITH SKILL PREREQUISITES =====
// Elven Battle Training: Requires proficiency in a combat skill
const elvenBattleTraining = {
    id: 'elven_battle_training',
    name: 'Elven Battle Training',
    description: 'Advanced elven combat techniques',
    type: 'active',
    race: 'Elf',
    prerequisites: {
        skills: ['athletics', 'perception'],  // Must have both skills
        level: 3
    },
    effects: [
        { type: 'passive_modifier', target: 'initiative', value: 2 }
    ],
    source: 'custom'
};

registry.registerRacialTrait(elvenBattleTraining);

// ===== VALIDATE FEATURE PREREQUISITES =====
const character = CharacterGenerator.generate(seed, audioProfile, 'Elf Warrior');
const feature = registry.getClassFeature('arcane_smith', character.level, character.class);

if (feature && feature.prerequisites) {
    const result = FeatureValidator.validatePrerequisites(feature.prerequisites, character);

    if (!result.valid) {
        console.log('Cannot learn feature:', result.unmet);
    }
}

// Features with unmet prerequisites are automatically
// excluded during character generation
```



FROM DATA_ENGINE_REFERENCE.md



## Extensibility System

**Location:** `src/core/extensions/`

The extensibility system allows runtime customization of ALL procedural generation lists with spawn rate control. This enables adding custom spells, equipment, races, classes, and appearance options without modifying the core engine.

### Overview

**Design Principles:**
- **Hybrid spawn rates**: Support both relative weights (added to pool) and absolute weights (replace distribution)
- **Runtime only**: Custom data provided each session; characters save with custom items already included
- **Strict validation**: Reject invalid data with clear errors
- **Consistent API**: Same function pattern across all categories
- **Per-category spawn rates**: Each expansion pack includes its own spawn rate weights for its content

**Extensible Categories:**

| Category | Phase | Extensibility Type | Spawn Rate Control |
|----------|-------|-------------------|-------------------|
| **Equipment** | 5.3 | Custom weapons, armor, items with weights | ✅ Per-item |
| **Appearance** | 5.1 | Body types, skin tones, hair, eyes, facial features | ✅ Per-option |
| **Spells** | 5.2 | Custom spells with full spell data | ✅ Per-spell |
| **Races** | 5.4 | Custom races with ability bonuses, speed, traits | ✅ Per-race |
| **Classes** | 5.5 | Custom classes for audio-to-class mapping | ✅ Per-class |
| **Class Features** | 11 | Custom class features with prerequisites & effects | ✅ Per-feature |
| **Racial Traits** | 11 | Custom racial traits with effects & conditions | ✅ Per-trait |
| **Skills** | 12 | Custom skills with ability mapping | ✅ Per-skill |
| **Skill Lists** | 12 | Per-class custom skill lists | ✅ Per-skill |

---

### ExtensionManager

**Location:** `src/core/extensions/ExtensionManager.ts`

Singleton class for managing runtime extensions to procedural generation data.

#### Class: `ExtensionManager`

**Constructor:**
```typescript
// Singleton - use getInstance() instead of new ExtensionManager()
```

**Methods:**

- `static getInstance(): ExtensionManager`
    - Returns the singleton instance

- `initializeDefaults(category: ExtensionCategory, data: any[]): void`
    - Initialize default data for a category (called automatically on first use)

- `initializeAllDefaults(data: Record<string, any[]>): void`
    - Initialize all default data from constants

- `register(category: ExtensionCategory, items: any[], options?: ExtensionOptions): void`
    - Register custom data for a category
    - **Parameters:**
        - `category`: The category to extend
        - `items`: Custom items to add
        - `options`: Registration options (mode, weights, validate)
    - **Throws:** Error if validation fails

- `get(category: ExtensionCategory): any[]`
    - Get merged data (defaults + custom) for a category

- `getDefaults(category: ExtensionCategory): any[]`
    - Get default data only (no custom items)

- `getCustom(category: ExtensionCategory): any[]`
    - Get custom items only (no defaults)

- `setWeights(category: ExtensionCategory, weights: Record<string, number>): void`
    - Set spawn weights for a category

- `getWeights(category: ExtensionCategory): Record<string, number>`
    - Get combined default and custom weights

- `getDefaultWeights(category: ExtensionCategory): Record<string, number>`
    - Get default weights only (all items have weight 1.0)

- `hasCustomData(category: ExtensionCategory): boolean`
    - Check if a category has custom data registered

- `getMode(category: ExtensionCategory): 'relative' | 'absolute' | 'default' | undefined`
    - Get the registration mode for a category

- `validate(category: ExtensionCategory, items: any[]): ValidationResult`
    - Validate items for a category

- `reset(category: ExtensionCategory): void`
    - Reset a category to defaults (removes all custom data)

- `resetAll(): void`
    - Reset all categories to defaults

- `getInfo(category?: ExtensionCategory): Record<string, any>`
    - Get information about registered extensions

- `exportCustomData(): Record<string, any>`
    - Export all custom data (for debugging/saving)

- `getRegisteredCategories(): ExtensionCategory[]`
    - Get all categories with default data

#### Types

```typescript
export type ExtensionCategory =
    | 'equipment'
    | 'appearance.bodyTypes'
    | 'appearance.skinTones'
    | 'appearance.hairColors'
    | 'appearance.hairStyles'
    | 'appearance.eyeColors'
    | 'appearance.facialFeatures'
    | 'spells'
    | 'races'
    | 'classes'
    | `spells.${string}`
    | 'classFeatures'
    | `classFeatures.${string}`  // Per-class features
    | 'racialTraits'
    | `racialTraits.${string}`   // Per-race traits
    | 'skills'
    | `skills.${string}`         // Per-ability skills (STR, DEX, etc.)
    | 'skillLists'
    | `skillLists.${string}`;    // Per-class skill lists

export interface ExtensionOptions {
    /** Spawn mode for this extension */
    mode?: 'relative' | 'absolute' | 'default';
    /** Custom spawn weights for individual items */
    weights?: Record<string, number>;
    /** Whether to validate items before registration */
    validate?: boolean;
}

export interface ValidationResult {
    valid: boolean;
    errors?: string[];
}
```

#### Usage Examples

**Basic Custom Spell Registration:**
```typescript
import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Add custom spells
manager.register('spells', [
    {
        name: 'Phoenix Fire',
        level: 5,
        school: 'Evocation',
        casting_time: '1 action',
        range: '60 feet',
        duration: 'Instantaneous',
        components: ['V', 'S', 'M'],
        description: 'A burst of flame explodes in a 20-foot radius...'
    }
], {
    mode: 'relative',
    weights: { 'Phoenix Fire': 0.5 }  // Half as common as other spells
});
```

**Replace All Equipment:**
```typescript
// Use only custom equipment
manager.register('equipment', [
    { name: 'Excalibur', type: 'weapon', rarity: 'legendary', weight: 5 },
    { name: 'Mithril Armor', type: 'armor', rarity: 'very_rare', weight: 10 }
], {
    mode: 'absolute'  // Replace default equipment entirely
});
```

**Custom Appearance Options:**
```typescript
// Add new body types
manager.register('appearance.bodyTypes', [
    'giant',
    'diminutive',
    'elemental'
], {
    weights: { 'giant': 0.3, 'diminutive': 0.3, 'elemental': 0.1 }
});

// Add new skin tones
manager.register('appearance.skinTones', [
    '#8B4513',  // Saddle Brown
    '#DEB887',  // Burlywood
    '#F5DEB3'   // Wheat
]);
```

**Custom Races and Classes:**
```typescript
// Note: Race and class names must extend the existing Race/Class types
// The engine validates against the known Race/Class enums

// This would require modifying the Race type in types/Character.ts first
// manager.register('races', ['Dragonkin'], {
//     weights: { 'Dragonkin': 0.5 }
// });
```

---

### WeightedSelector

**Location:** `src/core/extensions/WeightedSelector.ts`

Utility class for weighted random selection with multiple modes.

#### Class: `WeightedSelector<T>`

All methods are static.

**Methods:**

- `static select<T>(items: T[], weights: Record<string, number>, rng: SeededRNG, mode?: SelectionMode): T`
    - Select a single item based on weights
    - **Parameters:**
        - `items`: Array of items to select from
        - `weights`: Record of item name to weight multiplier
        - `rng`: Seeded random number generator
        - `mode`: Selection mode (default: 'relative')

- `static selectMultiple<T>(items: T[], weights: Record<string, number>, rng: SeededRNG, count: number, mode?: SelectionMode): T[]`
    - Select multiple unique items based on weights
    - **Parameters:**
        - `items`: Array of items to select from
        - `weights`: Record of item name to weight multiplier
        - `rng`: Seeded random number generator
        - `count`: Number of items to select
        - `mode`: Selection mode

- `static getProbabilities<T>(items: T[], weights: Record<string, number>, mode?: SelectionMode): Record<string, number>`
    - Get probability distribution for items based on weights
    - Useful for debugging, testing, or displaying spawn rates

#### Selection Modes

| Mode | Behavior | Use Case |
|------|-----------|-----------|
| **relative** | Use provided weights as-is, normalize to probabilities | Add rare item with high spawn rate |
| **absolute** | All non-specified items get weight 1, then normalize | Complete control over spawn rates |
| **default** | Equal weight for all items (1.0) | Ignore custom weights |

#### Types

```typescript
export type SelectionMode = 'relative' | 'absolute' | 'default';
```

#### Usage Examples

**Relative Mode:**
```typescript
import { WeightedSelector } from 'playlist-data-engine';
import { SeededRNG } from 'playlist-data-engine';

const rng = new SeededRNG('my-seed');
const monsters = ['Goblin', 'Orc', 'Dragon'];

// Make dragons twice as common
const weights = { 'Dragon': 2, 'Goblin': 1, 'Orc': 1 };
const selected = WeightedSelector.select(monsters, weights, rng, 'relative');
// Result: Dragon has 50% chance, Goblin 25%, Orc 25%
```

**Absolute Mode:**
```typescript
// Only specified items can spawn with their exact weights
const weights = { 'Sword': 5, 'Axe': 3 };
const weapons = ['Sword', 'Axe', 'Dagger', 'Bow'];
const selected = WeightedSelector.select(weapons, weights, rng, 'absolute');
// Result: Sword 62.5%, Axe 37.5%, Dagger and Bow 0%
```

**Multiple Selection (Facial Features):**
```typescript
const features = ['Scar', 'Tattoo', 'Piercing', 'Freckles', 'Beard', 'Mole'];
const featureWeights = { 'Scar': 0.5, 'Tattoo': 0.3 };

const numFeatures = rng.randomInt(1, 4);
const selectedFeatures = WeightedSelector.selectMultiple(
    features,
    featureWeights,
    rng,
    numFeatures,
    'relative'
);
// Selects 1-3 unique features with weighted probabilities
```

**Get Probabilities for Debugging:**
```typescript
const probabilities = WeightedSelector.getProbabilities(
    monsters,
    weights,
    'relative'
);
console.log(probabilities);
// { 'Goblin': 0.25, 'Orc': 0.25, 'Dragon': 0.5 }
```

---

### CharacterGenerator Extensions

**Location:** `src/core/generation/CharacterGenerator.ts`

The `CharacterGenerator.generate()` method accepts an `extensions` option for registering custom content.

#### Updated CharacterGeneratorOptions

```typescript
export interface CharacterGeneratorOptions {
    /** Starting level (default: 1) */
    level?: number;

    /** Override class suggestion */
    forceClass?: Class;

    /** Game mode for stat progression (default: 'standard') */
    gameMode?: GameMode;

    /**
     * Custom extensions for procedural generation
     * Allows adding custom spells, equipment, races, classes, and appearance options
     */
    extensions?: CharacterGeneratorExtensions;
}

export interface CharacterGeneratorExtensions {
    /** Custom spells to add */
    spells?: SpellExtension[];

    /** Custom equipment to add */
    equipment?: EquipmentExtension[];

    /** Custom races to add (race names) */
    races?: RaceExtension[];

    /** Custom classes to add (class names) */
    classes?: ClassExtension[];

    /** Custom appearance options */
    appearance?: AppearanceExtension;
}

export interface SpellExtension {
    name: string;
    level: number;
    school: string;
    casting_time?: string;
    range?: string;
    duration?: string;
    components?: string[];
    description?: string;
}

export interface EquipmentExtension {
    name: string;
    type: 'weapon' | 'armor' | 'item';
    rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';
    weight: number;
}

export type RaceExtension = string;
export type ClassExtension = string;

export type AppearanceExtension = {
    bodyTypes?: string[];
    skinTones?: string[];
    hairColors?: string[];
    hairStyles?: string[];
    eyeColors?: string[];
    facialFeatures?: string[];
};
```

#### Usage Example

```typescript
import { CharacterGenerator } from 'playlist-data-engine';

// Generate a character with custom content
const character = CharacterGenerator.generate(
    seed,
    audioProfile,
    'Hero',
    {
        level: 5,
        gameMode: 'standard',
        extensions: {
            // Custom spells
            spells: [
                {
                    name: 'Phoenix Fire',
                    level: 5,
                    school: 'Evocation',
                    casting_time: '1 action',
                    range: '60 feet',
                    duration: 'Instantaneous',
                    components: ['V', 'S'],
                    description: 'A burst of flame...'
                }
            ],

            // Custom equipment
            equipment: [
                {
                    name: 'Dragon Scale Armor',
                    type: 'armor',
                    rarity: 'rare',
                    weight: 25
                }
            ],

            // Custom appearance options
            appearance: {
                bodyTypes: ['giant', 'diminutive'],
                skinTones: ['#8B4513', '#DEB887'],
                facialFeatures: ['mystical tattoo', 'runes']
            }
        }
    }
);

// Custom items will be merged with defaults during character generation
```

---

### FeatureRegistry

**Location:** `src/core/features/FeatureRegistry.ts`

Singleton class for managing class features and racial traits. Features are abilities gained as characters level up (e.g., Rage, Extra Attack, Metamagic) or innate racial traits (e.g., Darkvision, Fey Ancestry).

#### Class: `FeatureRegistry`

**Constructor:**
```typescript
// Singleton - use getInstance() instead of new FeatureRegistry()
```

**Methods:**

- `static getInstance(): FeatureRegistry`
    - Returns the singleton instance

- `initializeDefaults(defaultClassFeatures?: ClassFeature[], defaultRacialTraits?: RacialTrait[]): void`
    - Initialize the registry with default features
    - Should be called once during package initialization
    - Idempotent - subsequent calls after initialization are ignored

- `registerClassFeature(feature: ClassFeature): void`
    - Register a single class feature
    - **Throws:** Error if feature ID already exists

- `registerClassFeatures(features: ClassFeature[]): void`
    - Register multiple class features at once

- `registerRacialTrait(trait: RacialTrait): void`
    - Register a single racial trait
    - **Throws:** Error if trait ID already exists

- `registerRacialTraits(traits: RacialTrait[]): void`
    - Register multiple racial traits at once

- `getClassFeatures(className: Class, level: number): ClassFeature[]`
    - Get all features for a class at a specific level
    - Includes features from lower levels

- `getFeaturesForLevel(className: Class, level: number): ClassFeature[]`
    - Get only the features gained at exactly this level

- `getClassFeatureById(featureId: string): ClassFeature | undefined`
    - Get a single class feature by ID

- `getRacialTraits(race: Race): RacialTrait[]`
    - Get all racial traits for a race

- `getRacialTraitsForSubrace(race: Race, subrace: string): RacialTrait[]`
    - Get racial traits for a specific subrace

- `getRacialTraitById(traitId: string): RacialTrait | undefined`
    - Get a single racial trait by ID

- `validatePrerequisites(feature: ClassFeature | RacialTrait, character: CharacterSheet): ValidationResult`
    - Validate feature prerequisites against a character
    - Returns validation result with unmet prerequisites if any

- `canGainFeature(feature: ClassFeature | RacialTrait, character: CharacterSheet): boolean`
    - Convenience method that returns true if character meets all prerequisites

- `getRegisteredClasses(): Class[]`
    - Get all classes that have features registered

- `getRegisteredRaces(): Race[]`
    - Get all races that have traits registered

- `getRegistryStats(): { totalClassFeatures: number; totalRacialTraits: number; classesWithFeatures: number; racesWithTraits: number }`
    - Get total count of registered features

- `reset(): void`
    - Reset the registry to initial state (clears all registered features)

- `isInitialized(): boolean`
    - Check if the registry has been initialized with defaults

- `exportRegistry(): { classFeatures: Record<string, ClassFeature[]>; racialTraits: Record<string, RacialTrait[]> }`
    - Export all registered features as JSON

#### Types

```typescript
export interface ClassFeature {
    /** Unique identifier (e.g., 'barbarian_rage', 'fighter_action_surge') */
    id: string;

    /** Display name shown to players */
    name: string;

    /** Detailed description of what the feature does */
    description: string;

    /** Type of feature: 'passive' | 'active' | 'resource' | 'trigger' */
    type: FeatureType;

    /** Character class this feature belongs to */
    class: Class;

    /** Level at which this feature is gained (1-20) */
    level: number;

    /** Prerequisites that must be met to gain this feature */
    prerequisites?: FeaturePrerequisite;

    /** Effects applied when this feature is gained */
    effects?: FeatureEffect[];

    /** Whether this feature is built-in or custom */
    source: 'default' | 'custom';

    /** Optional tags for filtering/categorizing */
    tags?: string[];

    /** Optional flavor text or lore */
    lore?: string;
}

export interface RacialTrait {
    /** Unique identifier (e.g., 'elf_darkvision', 'dwarf_dwarven_resilience') */
    id: string;

    /** Display name shown to players */
    name: string;

    /** Detailed description of what the trait does */
    description: string;

    /** Race this trait belongs to */
    race: Race;

    /** Optional subrace requirement (e.g., 'High Elf', 'Hill Dwarf') */
    subrace?: string;

    /** Prerequisites that must be met */
    prerequisites?: FeaturePrerequisite;

    /** Effects applied when this trait is gained */
    effects?: FeatureEffect[];

    /** Whether this trait is built-in or custom */
    source: 'default' | 'custom';

    /** Optional tags for filtering/categorizing */
    tags?: string[];

    /** Optional flavor text or lore */
    lore?: string;
}

export type FeatureType = 'passive' | 'active' | 'resource' | 'trigger';

export type FeatureEffectType =
    | 'stat_bonus'           // Add to an ability score
    | 'skill_proficiency'    // Grant proficiency or expertise
    | 'ability_unlock'       // Unlock a new ability (e.g., darkvision)
    | 'passive_modifier'     // Add a constant modifier to rolls
    | 'resource_grant'       // Grant a resource pool (e.g., rage counts)
    | 'spell_slot_bonus';    // Grant additional spell slots

export interface FeatureEffect {
    /** Type of effect to apply */
    type: FeatureEffectType;

    /** Target stat, skill, or ability this affects */
    target: string;

    /** Value to apply (number for bonuses, string for unlocks, boolean for flags) */
    value: number | string | boolean;

    /** Optional condition for when this effect applies (e.g., "while raging") */
    condition?: string;

    /** Optional description of this specific effect */
    description?: string;
}

export interface FeaturePrerequisite {
    /** Minimum level required */
    level?: number;

    /** Features that must be learned first (by ID) */
    features?: string[];

    /** Minimum ability scores required */
    abilities?: Partial<Record<Ability, number>>;

    /** Specific class required */
    class?: Class;

    /** Specific race or subrace required */
    race?: Race;

    /** Custom condition description (for manual validation) */
    custom?: string;
}

export interface ValidationResult {
    /** Whether all prerequisites are met */
    valid: boolean;

    /** Array of prerequisite descriptions that are not met */
    unmet?: string[];

    /** Detailed error messages */
    errors?: string[];
}
```

#### Usage Examples

**Register Custom Class Features:**

```typescript
import { FeatureRegistry } from 'playlist-data-engine';

const registry = FeatureRegistry.getInstance();

// Register a custom Barbarian feature
registry.registerClassFeature({
    id: 'dragon_fury',
    name: 'Dragon Fury',
    description: 'Channel your draconic heritage to enhance your rage.',
    type: 'active',
    class: 'Barbarian',
    level: 3,
    source: 'custom',
    prerequisites: {
        level: 3,
        features: ['rage']
    },
    effects: [
        {
            type: 'stat_bonus',
            target: 'STR',
            value: 2,
            condition: 'while raging',
            description: '+2 Strength while raging'
        },
        {
            type: 'passive_modifier',
            target: 'damage',
            value: 4,
            condition: 'melee attacks while raging',
            description: '+4 damage on melee attacks while raging'
        }
    ],
    tags: ['melee', 'damage', 'rage'],
    lore: 'This ability is granted to those with dragon blood in their veins.'
});

// Register multiple features at once
registry.registerClassFeatures([
    {
        id: 'reckless_attack',
        name: 'Reckless Attack',
        description: 'You can throw aside all concern for defense...',
        type: 'active',
        class: 'Barbarian',
        level: 2,
        source: 'custom'
    },
    {
        id: 'danger_sense',
        name: 'Danger Sense',
        description: 'You gain an uncanny sense of when things nearby...',
        type: 'passive',
        class: 'Barbarian',
        level: 2,
        source: 'custom'
    }
]);
```

**Register Custom Racial Traits:**

```typescript
// Register a custom racial trait
registry.registerRacialTrait({
    id: 'dragonborn_fire_resistance',
    name: 'Fire Resistance',
    description: 'You have resistance to fire damage.',
    race: 'Dragonborn',
    subrace: undefined, // Applies to all Dragonborn
    source: 'custom',
    effects: [
        {
            type: 'ability_unlock',
            target: 'damage_resistance',
            value: 'fire',
            description: 'Resistance to fire damage'
        }
    ]
});

// Register a subrace-specific trait
registry.registerRacialTrait({
    id: 'high_elf_weapon_training',
    name: 'High Elf Weapon Training',
    description: 'You have proficiency with the longsword, shortsword, shortbow, and longbow.',
    race: 'Elf',
    subrace: 'High Elf',
    source: 'custom',
    effects: [
        {
            type: 'skill_proficiency',
            target: 'longsword',
            value: 'proficient'
        },
        {
            type: 'skill_proficiency',
            target: 'shortsword',
            value: 'proficient'
        },
        {
            type: 'skill_proficiency',
            target: 'shortbow',
            value: 'proficient'
        },
        {
            type: 'skill_proficiency',
            target: 'longbow',
            value: 'proficient'
        }
    ]
});
```

**Query Features:**

```typescript
// Get all features for a level 5 Barbarian
const barbarianFeatures = registry.getClassFeatures('Barbarian', 5);
// Returns: rage, unarmored_defense, reckless_attack, danger_sense, extra_attack

// Get only level 3 features
const level3Features = registry.getFeaturesForLevel('Barbarian', 3);
// Returns: [dragon_fury] (if registered)

// Get racial traits for a race
const elfTraits = registry.getRacialTraits('Elf');
// Returns: darkvision, fey_ancestry, trance, etc.

// Get subrace-specific traits
const highElfTraits = registry.getRacialTraitsForSubrace('Elf', 'High Elf');
// Returns traits specific to High Elves

// Look up a specific feature
const rageFeature = registry.getClassFeatureById('rage');
console.log(rageFeature.name); // "Rage"
```

**Validate Prerequisites:**

```typescript
import { CharacterGenerator } from 'playlist-data-engine';

// Generate a character
const character = CharacterGenerator.generate(seed, audioProfile, name);

// Check if character can gain a feature
const dragonFury = registry.getClassFeatureById('dragon_fury');
const canGain = registry.canGainFeature(dragonFury, character);
console.log(canGain); // true or false

// Get detailed validation result
const validation = registry.validatePrerequisites(dragonFury, character);
if (!validation.valid) {
    console.log('Unmet prerequisites:', validation.unmet);
    // e.g., ["Requires level 3 (current: 1)", "Requires feature: Rage"]
}
```

**Get Registry Statistics:**

```typescript
const stats = registry.getRegistryStats();
console.log(stats);
// {
//     totalClassFeatures: 120,
//     totalRacialTraits: 45,
//     classesWithFeatures: 12,
//     racesWithTraits: 9
// }
```

---

### SkillRegistry

**Location:** `src/core/skills/SkillRegistry.ts`

Singleton class for managing skills (default D&D 5e skills and custom skills). Supports skill registration, lookup, and categorization.

#### Class: `SkillRegistry`

**Constructor:**
```typescript
// Singleton - use getInstance() instead of new SkillRegistry()
```

**Methods:**

- `static getInstance(): SkillRegistry`
    - Returns the singleton instance

- `initializeDefaults(defaultSkills?: CustomSkill[]): void`
    - Initialize the registry with default skills
    - Uses DEFAULT_SKILLS if not provided

- `registerSkill(skill: CustomSkill): void`
    - Register a single skill
    - **Throws:** Error if skill ID already exists or ID format is invalid

- `registerSkills(skills: CustomSkill[]): void`
    - Register multiple skills at once

- `getSkill(id: string): CustomSkill | undefined`
    - Get a skill by ID

- `getAllSkills(): CustomSkill[]`
    - Get all registered skills

- `getSkillsByAbility(ability: Ability): CustomSkill[]`
    - Get skills that use a specific ability score

- `getSkillsByCategory(category: string): CustomSkill[]`
    - Get skills in a specific category

- `getCategories(): string[]`
    - Get all categories in use

- `getSkillsBySource(source: 'default' | 'custom'): CustomSkill[]`
    - Get skills by source (default or custom)

- `isValidSkill(id: string): boolean`
    - Check if a skill ID exists in the registry

- `validateSkill(skill: CustomSkill): SkillValidationResult`
    - Validate skill data structure

- `getRegistryStats(): SkillRegistryStats`
    - Get statistics about registered skills

- `reset(): void`
    - Reset the registry to initial state

- `isInitialized(): boolean`
    - Check if the registry has been initialized

- `exportRegistry(): CustomSkill[]`
    - Export all registered skills as JSON

- `unregisterSkill(id: string): boolean`
    - Remove a skill by ID
    - **Warning:** Primarily for testing; removing skills in use may cause issues

#### Types

```typescript
export interface CustomSkill {
    /** Unique identifier (e.g., 'athletics', 'survival_cold') */
    id: string;

    /** Display name (e.g., 'Athletics', 'Survival (Cold Environments)') */
    name: string;

    /** Optional description of what the skill covers */
    description?: string;

    /** The ability score used (STR, DEX, CON, INT, WIS, CHA) */
    ability: Ability;

    /** Whether affected by armor disadvantage (default: false) */
    armorPenalty?: boolean;

    /** Optional custom properties for advanced mechanics */
    customProperties?: Record<string, string | number | boolean | string[]>;

    /** Optional categories for grouping (e.g., 'exploration', 'social') */
    categories?: string[];

    /** Source: 'default' or 'custom' */
    source: 'default' | 'custom';

    /** Optional tags for additional categorization */
    tags?: string[];

    /** Optional flavor text or lore */
    lore?: string;
}

export interface SkillValidationResult {
    /** Whether the skill is valid */
    valid: boolean;
    /** Array of error messages (empty if valid) */
    errors: string[];
}

export interface SkillRegistryStats {
    /** Total number of registered skills */
    totalSkills: number;
    /** Number of default skills */
    defaultSkills: number;
    /** Number of custom skills */
    customSkills: number;
    /** Skills per ability */
    skillsByAbility: Record<Ability, number>;
    /** All categories in use */
    categories: string[];
}
```

#### Usage Examples

**Register Custom Skills:**

```typescript
import { SkillRegistry } from 'playlist-data-engine';

const registry = SkillRegistry.getInstance();

// Register a single custom skill
registry.registerSkill({
    id: 'survival_cold',
    name: 'Survival (Cold Environments)',
    description: 'Expertise in surviving and traveling in cold weather conditions.',
    ability: 'WIS',
    armorPenalty: false,
    categories: ['exploration', 'environmental'],
    source: 'custom',
    tags: ['cold', 'weather', 'wilderness'],
    lore: 'Masters of cold survival learn to find shelter, build fires in snow, and navigate blizzards.'
});

// Register multiple skills at once
registry.registerSkills([
    {
        id: 'survival_desert',
        name: 'Survival (Desert)',
        description: 'Expertise in desert survival.',
        ability: 'WIS',
        categories: ['exploration', 'environmental'],
        source: 'custom'
    },
    {
        id: 'navigation',
        name: 'Navigation',
        description: 'Ability to navigate by stars, maps, and landmarks.',
        ability: 'INT',
        categories: ['exploration'],
        source: 'custom',
        armorPenalty: false
    },
    {
        id: 'intimidation',
        name: 'Intimidation',
        description: 'Influence others through threats and force.',
        ability: 'CHA',
        categories: ['social'],
        source: 'custom'
    }
]);
```

**Query Skills:**

```typescript
// Get a specific skill
const athletics = registry.getSkill('athletics');
console.log(athletics.name); // "Athletics"
console.log(athletics.ability); // "STR"

// Get all skills for an ability
const strengthSkills = registry.getSkillsByAbility('STR');
// Returns: [athletics, ...other STR skills]

// Get skills by category
const explorationSkills = registry.getSkillsByCategory('exploration');
// Returns skills tagged with 'exploration'

// Get all categories
const categories = registry.getCategories();
console.log(categories);
// ['exploration', 'social', 'knowledge', 'combat', 'environmental', ...]

// Get custom skills only
const customSkills = registry.getSkillsBySource('custom');

// Check if a skill exists
const hasSurvival = registry.isValidSkill('survival'); // true
const hasFake = registry.isValidSkill('fake_skill'); // false
```

**Validate Skills:**

```typescript
// Validate a skill before registering
const newSkill = {
    id: 'test_skill',
    name: 'Test Skill',
    ability: 'STR',
    source: 'custom'
};

const validation = registry.validateSkill(newSkill);
if (!validation.valid) {
    console.log('Validation errors:', validation.errors);
}
```

**Get Registry Statistics:**

```typescript
const stats = registry.getRegistryStats();
console.log(stats);
// {
//     totalSkills: 21,      // 18 default + 3 custom
//     defaultSkills: 18,
//     customSkills: 3,
//     skillsByAbility: {
//         STR: 2,   // athletics + custom
//         DEX: 3,
//         CON: 1,
//         INT: 4,
//         WIS: 6,
//         CHA: 5
//     },
//     categories: ['exploration', 'social', 'knowledge', 'combat', 'environmental']
// }
```

---

### Per-Category Spawn Rate System

Both FeatureRegistry and SkillRegistry support per-item spawn rate control through ExtensionManager's weight system. This allows custom content to be more or less likely to appear during character generation.

**Feature Spawn Rates:**

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

**Skill Spawn Rates:**

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

**Weight Modes:**

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

**Get Current Weights:**

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

---

### Validation System

The ExtensionManager includes built-in validation for all extensible categories.

**Validation Rules:**

| Category | Required Fields | Valid Values |
|----------|----------------|--------------|
| **equipment** | name, type, rarity, weight | type: 'weapon' \| 'armor' \| 'item'; rarity: 'common'...'legendary'; weight: ≥ 0 |
| **spells** | name, level, school | level: 0-9; school: 'Abjuration'...'Transmutation' |
| **races** | (string value) | Must be valid Race enum value |
| **classes** | (string value) | Must be valid Class enum value |
| **appearance.*** | (string value) | Must be string type |
| **classFeatures** | id, name, type, class, level, source | type: 'passive'\|'active'\|'resource'\|'trigger'; level: 1-20 |
| **racialTraits** | id, name, race, source | Must have valid race from Race enum |
| **skills** | id, name, ability, source | ability: 'STR'\|'DEX'\|'CON'\|'INT'\|'WIS'\|'CHA' |
| **skillLists** | class, skillCount, availableSkills | skillCount: ≥ 0; availableSkills: array of skill IDs |

**Validation Example:**

```typescript
const manager = ExtensionManager.getInstance();

try {
    // This will throw validation errors
    manager.register('spells', [
        {
            name: 'Invalid Spell',
            level: 15,  // Invalid: level must be 0-9
            school: 'NotASchool'  // Invalid: not a valid school
        }
    ], {
        validate: true  // Validation is on by default
    });
} catch (error) {
    console.error(error.message);
    // "Invalid items for category 'spells':
    //  Item 0: Invalid 'level' (must be 0-9)
    //  Item 0: Invalid 'school'"
}

// Disable validation if needed
manager.register('spells', items, { validate: false });
```

---

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

// Reset everything
manager.resetAll();

// Export custom data for saving/loading
const customData = manager.exportCustomData();
console.log(customData);
// {
//     extensions: {
//         'spells': { items: [...], options: {...}, registeredAt: ... },
//         'equipment': { items: [...], options: {...}, registeredAt: ... }
//     },
//     weights: {
//         'spells': { 'Phoenix Fire': 0.5 },
//         'equipment': { 'Sword': 2.0 }
//     }
// }
```

---

### Complete Working Example: Creating an Expansion Pack

This example demonstrates creating a complete "Dragon Expansion Pack" with custom spells, equipment, races, classes, and appearance options.

```typescript
import {
    ExtensionManager,
    CharacterGenerator,
    AudioAnalyzer
} from 'playlist-data-engine';

/**
 * DRAGON EXPANSION PACK
 * A complete example of creating custom content for the Playlist Data Engine
 */

// ============================================================
// STEP 1: Define Custom Content
// ============================================================

const dragonSpells = [
    {
        name: 'Dragon Breath',
        level: 3,
        school: 'Evocation',
        casting_time: '1 action',
        range: 'Self (30-foot cone)',
        duration: 'Instantaneous',
        components: ['V', 'S'],
        description: 'You exhale destructive energy in a 30-foot cone...'
    },
    {
        name: 'Draconic Presence',
        level: 4,
        school: 'Enchantment',
        casting_time: '1 action',
        range: 'Self',
        duration: 'Concentration, up to 1 minute',
        components: ['V', 'S'],
        description: 'You channel the presence of a dragon, exuding an aura of power...'
    },
    {
        name: 'Scale Hardening',
        level: 2,
        school: 'Abjuration',
        casting_time: '1 bonus action',
        range: 'Touch',
        duration: '1 hour',
        components: ['V', 'S', 'M'],
        description: 'The target\'s skin becomes as hard as dragon scales...'
    }
];

const dragonEquipment = [
    {
        name: 'Dragon Scale Armor',
        type: 'armor',
        rarity: 'very_rare',
        weight: 25
    },
    {
        name: 'Dragon Tooth Dagger',
        type: 'weapon',
        rarity: 'rare',
        weight: 1
    },
    {
        name: 'Potion of Dragon Blood',
        type: 'item',
        rarity: 'rare',
        weight: 0.5
    }
];

// NOTE: This example demonstrates custom SPELLS, EQUIPMENT, and APPEARANCE only.
//
// While you can register 'classes' via ExtensionManager, this ONLY adjusts spawn rates
// for the 12 existing D&D 5e classes. You cannot create entirely new classes like
// "Draconis" through ExtensionManager without source code changes.
//
// This example does NOT add a custom "Draconis" class - it only adds dragon-themed
// content that can appear for any existing class.
const dragonAppearance = {
    bodyTypes: ['draconic', 'dragonborn'],
    skinTones: ['#8B0000', '#B8860B', '#006400', '#4B0082'], // Red, Gold, Green, Purple
    hairColors: ['#FF0000', '#FFD700', '#00FF00'], // Red, Gold, Green
    eyeColors: ['#FF4500', '#FFD700', '#32CD32', '#9400D3'], // Orange-red, Gold, Lime, Purple
    facialFeatures: ['horns', 'scaled skin', 'dragon tail', 'fangs', 'claws']
};

// ============================================================
// STEP 2: Register Content with ExtensionManager
// ============================================================

const manager = ExtensionManager.getInstance();

// Register custom spells
manager.register('spells', dragonSpells, {
    mode: 'relative',  // Add to default spells
    weights: {
        'Dragon Breath': 0.3,      // Rare spell
        'Draconic Presence': 0.2,  // Very rare spell
        'Scale Hardening': 0.4     // Uncommon spell
    },
    validate: true  // Validate spell data before registration
});

// Register custom equipment
manager.register('equipment', dragonEquipment, {
    mode: 'relative',
    weights: {
        'Dragon Scale Armor': 0.1,   // Very rare armor
        'Dragon Tooth Dagger': 0.3,  // Rare weapon
        'Potion of Dragon Blood': 0.2 // Rare consumable
    }
});

// Register custom appearance options
manager.register('appearance.bodyTypes', dragonAppearance.bodyTypes, {
    mode: 'relative',
    weights: { 'draconic': 0.2, 'dragonborn': 0.3 }
});

manager.register('appearance.skinTones', dragonAppearance.skinTones, {
    mode: 'relative',
    weights: {
        '#8B0000': 0.3,  // Red dragons most common
        '#B8860B': 0.2,  // Gold dragons
        '#006400': 0.15, // Green dragons
        '#4B0082': 0.1   // Purple dragons
    }
});

manager.register('appearance.hairColors', dragonAppearance.hairColors, {
    mode: 'relative',
    weights: { '#FF0000': 0.4, '#FFD700': 0.3, '#00FF00': 0.2 }
});

manager.register('appearance.eyeColors', dragonAppearance.eyeColors, {
    mode: 'relative'
});

manager.register('appearance.facialFeatures', dragonAppearance.facialFeatures, {
    mode: 'relative',
    weights: {
        'horns': 0.4,
        'scaled skin': 0.3,
        'dragon tail': 0.2,
        'fangs': 0.3,
        'claws': 0.3
    }
});

// ============================================================
// STEP 3: Verify Registration
// ============================================================

// Check what was registered
const spellInfo = manager.getInfo('spells');
console.log('Spells:', spellInfo);
// {
//     hasCustomData: true,
//     defaultCount: 53,
//     customCount: 3,
//     totalCount: 56,
//     mode: 'relative',
//     weights: { 'Dragon Breath': 0.3, ... },
//     registeredAt: 1234567890
// }

const equipInfo = manager.getInfo('equipment');
console.log('Equipment:', equipInfo);

// ============================================================
// STEP 4: Generate Characters with Custom Content
// ============================================================

async function generateDragonCharacter() {
    // Analyze audio from a music file
    const audioProfile = await AudioAnalyzer.analyze(audioUrl);

    // Generate character with custom content available
    const character = CharacterGenerator.generate(
        'dragon-seed-123',
        audioProfile,
        'Draconis',
        {
            level: 5,
            gameMode: 'standard'
            // Note: Extensions are registered via ExtensionManager,
            // not passed directly in options
        }
    );

    // The character will have:
    // - Custom dragon-themed appearance options (horns, scales, etc.)
    // - Access to custom dragon spells if they're a spellcaster
    // - Possibility of custom dragon equipment
    // - Dragon-themed color palette

    console.log('Generated Character:', character);
    return character;
}

// ============================================================
// STEP 5: Adjust Spawn Rates Later
// ============================================================

// Make dragon items more common after testing
manager.setWeights('equipment', {
    'Dragon Scale Armor': 0.5,  // Increased from 0.1
    'Dragon Tooth Dagger': 0.8, // Increased from 0.3
    'Potion of Dragon Blood': 0.6 // Increased from 0.2
});

// ============================================================
// STEP 6: Export/Import Custom Data
// ============================================================

// Export for saving
const customData = manager.exportCustomData();
console.log('Custom Data:', customData);

// Save to localStorage or file
// localStorage.setItem('dragonExpansion', JSON.stringify(customData));

// Later, load and restore:
// const savedData = JSON.parse(localStorage.getItem('dragonExpansion'));
// manager.importCustomData(savedData);

// ============================================================
// STEP 7: Cleanup (if needed)
// ============================================================

// Reset dragon content when switching themes
// manager.reset('spells');
// manager.reset('equipment');
// manager.reset('appearance.bodyTypes');
// manager.reset('appearance.skinTones');
// manager.reset('appearance.hairColors');
// manager.reset('appearance.eyeColors');
// manager.reset('appearance.facialFeatures');

// Or reset everything at once
// manager.resetAll();
```

**Expected Results:**

When generating characters with this Dragon Expansion Pack:

1. **Appearance**: Characters will have dragon-themed features:
   - Body types: 50% chance of draconic/dragonborn (with other types still possible)
   - Skin tones: Red, gold, green, or purple dragon scales
   - Hair colors: Red, gold, or green
   - Eye colors: Orange-red, gold, lime green, or purple
   - Facial features: High chance of horns, scales, tail, fangs, or claws

2. **Equipment**: Spellcasters may know dragon-themed spells, and any class might receive dragon equipment

3. **Variety**: All default content remains available (mode: 'relative'), ensuring variety

**Key Takeaways:**

1. **Batch Registration**: Register all related content at once for a themed expansion
2. **Weight Control**: Fine-tune spawn rates for balanced gameplay
3. **Validation**: Always validate data during development (set `validate: true`)
4. **Modularity**: Each category is independent - mix and match as needed
5. **Persistence**: Export custom data to save/load expansion configurations
6. **Cleanup**: Use `reset()` to cleanly switch between expansion packs

---

### Skill Prerequisites

**Location:** `src/core/skills/SkillTypes.ts`, `src/core/skills/SkillValidator.ts`

Skills can have prerequisites that must be met before a character can gain proficiency in them. This allows for advanced skills that require base skills, specific features, spells, ability scores, level, class, or race.

#### SkillPrerequisite Interface

```typescript
export interface SkillPrerequisite {
    /** Minimum character level required */
    level?: number;

    /** Minimum ability scores required */
    abilities?: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>>;

    /** Specific class required */
    class?: Class;

    /** Specific race required */
    race?: Race;

    /** Skills that must be proficient first (by skill ID) */
    skills?: string[];

    /** Features that must be learned first (by feature ID) */
    features?: string[];

    /** Spells that must be known first (by spell name) */
    spells?: string[];

    /** Custom condition description */
    custom?: string;
}
```

#### Updated CustomSkill Interface

The `CustomSkill` interface now includes an optional `prerequisites` property:

```typescript
export interface CustomSkill {
    id: string;
    name: string;
    description?: string;
    ability: Ability;
    armorPenalty?: boolean;
    customProperties?: Record<string, string | number | boolean | string[]>;
    categories?: string[];
    source: 'default' | 'custom';
    tags?: string[];
    lore?: string;

    // NEW: Prerequisites for learning this skill
    prerequisites?: SkillPrerequisite;
}
```

#### SkillValidator Prerequisite Validation

**Location:** `src/core/skills/SkillValidator.ts`

The `SkillValidator` class now includes a method for validating skill prerequisites:

```typescript
class SkillValidator {
    /**
     * Validate skill prerequisites against a character
     *
     * @param skill - The skill to validate prerequisites for
     * @param character - The character to check against
     * @returns Validation result with valid flag and optional unmet requirements
     */
    static validateSkillPrerequisites(
        skill: CustomSkill,
        character: CharacterSheet
    ): ValidationResult;
}
```

**ValidationResult:**
```typescript
interface ValidationResult {
    /** Whether all prerequisites are met */
    valid: boolean;

    /** Array of unmet prerequisite descriptions (empty if valid) */
    unmet?: string[];
}
```

#### SkillAssigner Filtering

**Location:** `src/core/generation/SkillAssigner.ts`

The `SkillAssigner` now filters skills by prerequisites when assigning skills to a character. Skills with unmet prerequisites are automatically excluded from selection.

#### SkillRegistry Validation

**Location:** `src/core/skills/SkillRegistry.ts`

The `SkillRegistry` includes a method for validating prerequisites:

```typescript
class SkillRegistry {
    /**
     * Validate skill prerequisites against a character
     *
     * @param skill - The skill to validate
     * @param character - The character to check against
     * @returns Validation result
     */
    validatePrerequisites(
        skill: CustomSkill,
        character: CharacterSheet
    ): ValidationResult;
}
```

#### Usage Examples

**Skill with Level and Feature Prerequisites:**

```typescript
import { SkillRegistry } from 'playlist-data-engine';

const dragonSmithing: CustomSkill = {
    id: 'dragon_smithing',
    name: 'Dragon Smithing',
    description: 'Craft weapons and armor from dragon scales',
    ability: 'INT',
    prerequisites: {
        features: ['draconic_bloodline'],  // Requires Sorcerer's Draconic Bloodline feature
        level: 5,                          // Must be level 5+
        class: 'Sorcerer'                  // Must be a Sorcerer
    },
    source: 'custom',
    categories: ['crafting']
};

SkillRegistry.getInstance().registerSkill(dragonSmithing);
```

**Skill with Ability Score and Skill Prerequisites:**

```typescript
const arcaneMastery: CustomSkill = {
    id: 'arcane_mastery',
    name: 'Arcane Mastery',
    description: 'Advanced magical theory and practice',
    ability: 'INT',
    prerequisites: {
        abilities: { INT: 16 },      // Requires 16+ Intelligence
        skills: ['arcana'],          // Must be proficient in Arcana first
        level: 7                     // Must be level 7+
    },
    source: 'custom',
    categories: ['knowledge', 'magic']
};
```

**Skill with Spell and Race Prerequisites:**

```typescript
const elvenSongMagic: CustomSkill = {
    id: 'elven_song_magic',
    name: 'Elven Song Magic',
    description: 'Traditional elven magic through song',
    ability: 'CHA',
    prerequisites: {
        race: 'Elf',                 // Elves only
        spells: ['Minor Illusion'],  // Must know Minor Illusion
        skills: ['performance']      // Must be proficient in Performance
    },
    source: 'custom',
    categories: ['magic', 'social']
};
```

**Validate Prerequisites:**

```typescript
import { SkillRegistry } from 'playlist-data-engine';

const registry = SkillRegistry.getInstance();
const skill = registry.getSkill('dragon_smithing');

if (skill && skill.prerequisites) {
    const result = registry.validatePrerequisites(skill, character);

    if (!result.valid) {
        console.log('Unmet prerequisites:', result.unmet);
        // Output: [
        //   'Requires feature: draconic_bloodline',
        //   'Requires level 5 (current: 3)',
        //   'Requires Sorcerer class (current: Fighter)'
        // ]
    }
}
```

---

### Spell Prerequisites

**Location:** `src/utils/constants.ts`, `src/core/spells/SpellValidator.ts`

Spells can have prerequisites that must be met before a spellcaster can learn them. This allows for specialized spells that require specific features, abilities, spells, skills, level, or class.

#### SpellPrerequisite Interface

```typescript
export interface SpellPrerequisite {
    /** Minimum character level */
    level?: number;

    /** Minimum spellcaster level (if different from character level) */
    casterLevel?: number;

    /** Minimum ability scores */
    abilities?: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>>;

    /** Specific class required */
    class?: string;

    /** Features that must be learned first (by feature ID) */
    features?: string[];

    /** Spells that must be known first (by spell name) */
    spells?: string[];

    /** Skills that must be proficient first (by skill ID) */
    skills?: string[];

    /** Custom condition */
    custom?: string;
}
```

#### Updated Spell Interface

The `Spell` interface now includes optional `id` and `prerequisites` properties:

```typescript
export interface Spell {
    /** Unique identifier (optional for backward compatibility) */
    id?: string;

    name: string;
    level: number;           // 0-9 (0 = cantrips)
    school: 'Abjuration' | 'Conjuration' | 'Divination' | 'Enchantment' | 'Evocation' | 'Illusion' | 'Necromancy' | 'Transmutation';
    casting_time: string;
    range: string;
    components: string[];
    duration: string;
    description?: string;

    // NEW: Prerequisites for learning this spell
    prerequisites?: SpellPrerequisite;
}
```

#### SpellValidator

**Location:** `src/core/spells/SpellValidator.ts` (NEW FILE)

The `SpellValidator` class validates spells and their prerequisites:

```typescript
class SpellValidator {
    /**
     * Validate a spell's data structure
     */
    static validateSpell(spell: unknown): SpellValidationResult;

    /**
     * Validate spell prerequisites schema
     */
    static validatePrerequisites(prerequisites: unknown): SpellValidationResult;

    /**
     * Validate spell prerequisites against a character
     *
     * @param prerequisites - The spell prerequisites to validate
     * @param character - The character to check against
     * @returns Validation result with valid flag and optional errors
     */
    static validateSpellPrerequisites(
        prerequisites: SpellPrerequisite | undefined,
        character: CharacterSheet
    ): SpellValidationResult;
}
```

**SpellValidationResult:**
```typescript
interface SpellValidationResult {
    /** Whether the spell/prerequisites are valid */
    valid: boolean;

    /** Array of error messages (empty if valid) */
    errors: string[];
}
```

#### SpellManager Filtering

**Location:** `src/core/generation/SpellManager.ts`

The `SpellManager` now filters spells by prerequisites when assigning spells to a character:

```typescript
class SpellManager {
    /**
     * Get known spells for a character, filtering by prerequisites
     *
     * @param characterClass - The character's class
     * @param characterLevel - The character's level
     * @param character - Optional character for prerequisite validation
     * @returns Array of known spell names
     */
    static getKnownSpells(
        characterClass: Class,
        characterLevel: number,
        character?: CharacterSheet
    ): string[];
}
```

#### Usage Examples

**Spell with Feature and Ability Prerequisites:**

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const dragonBreath = {
    id: 'dragon_breath',
    name: 'Dragon Breath',
    level: 3,
    school: 'Evocation',
    casting_time: '1 action',
    range: '60 ft cone',
    components: ['V', 'S', 'M'],
    duration: 'Instantaneous',
    description: 'Exhale destructive energy in a 60-foot cone',
    prerequisites: {
        features: ['draconic_bloodline'],  // Requires Draconic Bloodline feature
        abilities: { CHA: 16 },            // Requires 16+ Charisma
        class: 'Sorcerer'                  // Sorcerer only
    }
};

const manager = ExtensionManager.getInstance();
manager.register('spells', [dragonBreath]);
```

**Spell with Spell Chain Prerequisites:**

```typescript
const improvedFireball = {
    id: 'improved_fireball',
    name: 'Improved Fireball',
    level: 5,
    school: 'Evocation',
    casting_time: '1 action',
    range: '150 ft',
    components: ['V', 'S', 'M'],
    duration: 'Instantaneous',
    description: 'A more powerful version of fireball',
    prerequisites: {
        spells: ['Fireball'],        // Must know Fireball first
        level: 11,                   // Must be level 11+
        class: 'Wizard'              // Wizards only
    }
};
```

**Spell with Skill Prerequisites:**

```typescript
const arcaneSight = {
    id: 'arcane_sight_superior',
    name: 'Superior Arcane Sight',
    level: 4,
    school: 'Divination',
    casting_time: '1 action',
    range: 'Self',
    components: ['V', 'S'],
    duration: '1 hour',
    description: 'See all magical auras and understand their school',
    prerequisites: {
        skills: ['arcana'],           // Must be proficient in Arcana
        abilities: { INT: 14 },       // Requires 14+ Intelligence
        casterLevel: 7                // Must be a 7th-level spellcaster
    }
};
```

**Validate Spell Prerequisites:**

```typescript
import { SpellValidator } from 'playlist-data-engine';

// Check if a character can learn a spell
const spell = SPELL_DATABASE['dragon_breath'];
if (spell.prerequisites) {
    const result = SpellValidator.validateSpellPrerequisites(
        spell.prerequisites,
        character
    );

    if (!result.valid) {
        console.log('Cannot learn spell:', result.errors);
        // Output: [
        //   'Requires feature: draconic_bloodline',
        //   'Requires CHA 16+ (current: 14)',
        //   'Requires Sorcerer class (current: Wizard)'
        // ]
    }
}
```

---

### Custom Races

**Location:** `src/utils/constants.ts`, `src/core/extensions/ExtensionManager.ts`, `src/core/generation/AbilityScoreCalculator.ts`

The engine now supports custom races through the ExtensionManager. Custom races can define ability score bonuses, speed, traits, and available subraces.

#### RaceDataEntry Interface

```typescript
export interface RaceDataEntry {
    /** Ability score bonuses granted by this race */
    ability_bonuses: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>>;

    /** Base walking speed in feet */
    speed: number;

    /** Array of racial trait names/IDs */
    traits: string[];

    /** Optional: Available subraces for this race */
    subraces?: string[];
}
```

#### getRaceData() Helper Function

**Location:** `src/utils/constants.ts`

```typescript
/**
 * Get race data (default or custom)
 *
 * Checks both the built-in RACE_DATA and the ExtensionManager for custom race data.
 *
 * @param race - The race name to look up
 * @returns Race data entry or undefined if not found
 *
 * @example
 * // Get default race data
 * const elfData = getRaceData('Elf');
 * console.log(elfData.speed); // 30
 *
 * // Get custom race data (if registered via ExtensionManager)
 * const dragonkinData = getRaceData('Dragonkin');
 * if (dragonkinData) {
 *     console.log(dragonkinData.ability_bonuses);
 * }
 */
export function getRaceData(race: string): RaceDataEntry | undefined;
```

#### Registering Custom Races

**Via ExtensionManager:**

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Step 1: Register custom race data (ability bonuses, speed, traits, subraces)
manager.register('races.data', [
    {
        race: 'Dragonkin',
        ability_bonuses: { STR: 2, CON: 1, CHA: 1 },
        speed: 30,
        traits: ['Draconic Ancestry', 'Darkvision', 'Draconic Resistance'],
        subraces: ['Fire Dragonkin', 'Ice Dragonkin', 'Lightning Dragonkin']
    },
    {
        race: 'Fairy',
        ability_bonuses: { DEX: 2, CHA: 2, WIS: 1 },
        speed: 25,
        traits: ['Fey Ancestry', 'Flight', 'Nature Sense'],
        subraces: ['Summer Fairy', 'Winter Fairy', 'Twilight Fairy']
    }
]);

// Step 2: Register the race names for validation
manager.register('races', ['Dragonkin', 'Fairy'], { validate: true });
```

#### AbilityScoreCalculator Custom Race Support

**Location:** `src/core/generation/AbilityScoreCalculator.ts`

The `AbilityScoreCalculator.applyRacialBonuses()` method now accepts `string` instead of `Race` and uses `getRaceData()` to support custom races:

```typescript
class AbilityScoreCalculator {
    /**
     * Apply racial ability score bonuses
     *
     * Supports both default D&D 5e races and custom races registered via ExtensionManager.
     *
     * @param baseScores - Base scores before racial bonuses
     * @param race - Selected character race (e.g., 'Human', 'Elf', or custom race like 'Dragonkin')
     * @returns Final scores with racial bonuses applied (capped at 20 in standard mode)
     */
    static applyRacialBonuses(baseScores: AbilityScores, race: string): AbilityScores;
}
```

#### RaceSelector Custom Race Support

**Location:** `src/core/generation/RaceSelector.ts`

The `RaceSelector` automatically includes custom races registered via ExtensionManager:

```typescript
class RaceSelector {
    /**
     * Select a random race based on weighted spawn rates
     *
     * Selects from available races (default 9 D&D 5e races plus any custom races).
     * Spawn rates can be customized via ExtensionManager weights.
     *
     * @param rng - Seeded random number generator
     * @returns Selected race name
     */
    static selectRace(rng: SeededRNG): string;
}
```

#### Custom Race Validation

**Location:** `src/core/extensions/ExtensionManager.ts`

The ExtensionManager validates custom races:

1. **Race Names**: Must be either a default race or registered via `races.data`
2. **Race Data**: Must have `race` (string), `ability_bonuses` (record), `speed` (number), `traits` (array)

```typescript
// Validation errors for invalid race data
manager.register('races', ['InvalidRace']);
// Throws: "Invalid items for category 'races':
//   Invalid race 'InvalidRace'. Must be one of: Human, Elf, Dwarf, Halfling,
//   Dragonborn, Gnome, Half-Elf, Half-Orc, Tiefling or register custom race
//   via 'races.data' first."
```

#### Usage Examples

**Basic Custom Race:**

```typescript
const manager = ExtensionManager.getInstance();

// Register a simple custom race
manager.register('races.data', [{
    race: 'Aasimar',
    ability_bonuses: { CHA: 2 },
    speed: 30,
    traits: ['Celestial Resistance', 'Darkvision', 'Celestial Legacy']
}]);

manager.register('races', ['Aasimar']);

// Now characters can be generated as Aasimar
const character = CharacterGenerator.generate(seed, audioProfile, name);
// character.race might be 'Aasimar'
```

**Custom Race with Subraces:**

```typescript
// Register custom race with subraces
manager.register('races.data', [{
    race: 'Dragonkin',
    ability_bonuses: { STR: 2, CON: 1, CHA: 1 },
    speed: 30,
    traits: ['Draconic Ancestry', 'Darkvision'],
    subraces: ['Fire Dragonkin', 'Ice Dragonkin', 'Lightning Dragonkin']
}]);

// Register subrace-specific traits
manager.register('racialTraits', [
    {
        id: 'fire_dragonkin_resistance',
        name: 'Fire Resistance',
        race: 'Dragonkin',
        subrace: 'Fire Dragonkin',
        effects: [{ type: 'passive_modifier', target: 'fire_resistance', value: true }],
        source: 'custom'
    },
    {
        id: 'ice_dragonkin_resistance',
        name: 'Cold Resistance',
        race: 'Dragonkin',
        subrace: 'Ice Dragonkin',
        effects: [{ type: 'passive_modifier', target: 'cold_resistance', value: true }],
        source: 'custom'
    }
]);
```

**Custom Race Spawn Rates:**

```typescript
// Make custom races rarer than default races
manager.setWeights('races', {
    'Human': 1.0,      // Common
    'Elf': 1.0,        // Common
    'Dragonkin': 0.2,  // Rare (20% of normal)
    'Fairy': 0.1       // Very rare (10% of normal)
});
```

---

### Subrace Support

**Location:** `src/core/types/Character.ts`, `src/core/generation/CharacterGenerator.ts`, `src/core/features/FeatureTypes.ts`

Characters can now have a subrace property (e.g., 'High Elf', 'Hill Dwarf', 'Wood Elf'). Subraces allow for more granular racial trait assignment and prerequisite validation.

#### CharacterSheet Subrace Property

The `CharacterSheet` interface now includes an optional `subrace` property:

```typescript
export interface CharacterSheet {
    name: string;
    race: Race;

    /** Subrace (e.g., 'High Elf', 'Hill Dwarf', 'Wood Elf') */
    subrace?: string;

    class: Class;
    level: number;
    // ... rest of properties
}
```

#### FeaturePrerequisite Subrace Support

The `FeaturePrerequisite` interface now includes `subrace`:

```typescript
export interface FeaturePrerequisite {
    level?: number;
    features?: string[];
    abilities?: Partial<Record<Ability, number>>;
    class?: Class;
    race?: Race;

    /** Specific subrace required (e.g., 'High Elf', 'Hill Dwarf') */
    subrace?: string;

    /** Skills that must be proficient first (by skill ID) */
    skills?: string[];

    /** Spells that must be known first (by spell name) */
    spells?: string[];

    custom?: string;
}
```

#### RacialTrait Subrace Support

The `RacialTrait` interface includes a `subrace` property for subrace-specific traits:

```typescript
export interface RacialTrait {
    id: string;
    name: string;
    race: Race;

    /** Optional subrace (e.g., 'High Elf', 'Hill Dwarf') */
    subrace?: string;

    description?: string;
    level?: number;
    prerequisites?: FeaturePrerequisite;
    effects?: FeatureEffect[];
    source: 'default' | 'custom';
}
```

#### CharacterGenerator Subrace Support

**Location:** `src/core/generation/CharacterGenerator.ts`

The `CharacterGenerator.generate()` method accepts an optional `subrace` parameter:

```typescript
class CharacterGenerator {
    /**
     * Generate a complete D&D 5e character
     *
     * @param seed - Deterministic seed for generation
     * @param audioProfile - Audio analysis result
     * @param name - Character name
     * @param options - Generation options
     * @param options.level - Character level (default: 1)
     * @param options.subrace - Optional subrace (e.g., 'High Elf', 'Hill Dwarf')
     * @param options.extensions - Custom extensions
     * @returns Complete D&D 5e character sheet
     */
    static generate(
        seed: string,
        audioProfile: AudioProfile,
        name: string,
        options?: {
            level?: number;
            subrace?: string;
            gameMode?: GameMode;
            extensions?: CharacterGeneratorExtensions;
        }
    ): CharacterSheet;
}
```

**Racial Trait Assignment by Subrace:**

When generating a character with a subrace, the generator filters racial traits by subrace:

```typescript
// Get racial traits, filtering by subrace if character has one
const racialTraits = subrace
    ? featureRegistry.getRacialTraitsForSubrace(race, subrace)
    : featureRegistry.getRacialTraits(race);
```

#### FeatureRegistry Subrace Methods

**Location:** `src/core/features/FeatureRegistry.ts`

```typescript
class FeatureRegistry {
    /**
     * Get racial traits for a specific subrace
     *
     * @param race - The base race
     * @param subrace - The subrace name
     * @returns Array of racial traits for that subrace
     */
    getRacialTraitsForSubrace(race: Race, subrace: string): RacialTrait[];

    /**
     * Validate feature prerequisites against a character
     *
     * @param prerequisites - The prerequisites to validate
     * @param character - The character to check against
     * @param context - Optional context (race, subrace, class, level, ability_scores)
     * @returns Validation result with errors array
     */
    validatePrerequisites(
        prerequisites: FeaturePrerequisite,
        character?: CharacterSheet,
        context?: FeaturePrerequisiteContext
    ): ValidationResult;
}
```

#### FeatureValidator Subrace Validation

**Location:** `src/core/features/FeatureValidator.ts`

The `FeatureValidator.validatePrerequisites()` method now validates subrace requirements:

```typescript
class FeatureValidator {
    static validatePrerequisites(
        prerequisites: FeaturePrerequisite,
        character?: CharacterSheet,
        context?: FeaturePrerequisiteContext
    ): ValidationResult {
        const errors: string[] = [];

        // ... other validations ...

        // Check subrace requirement
        if (prereqs.subrace !== undefined) {
            if (!context?.subrace || context.subrace !== prereqs.subrace) {
                errors.push(`Requires subrace ${prereqs.subrace} (current: ${context?.subrace || 'none'})`);
            }
        }

        return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
    }
}
```

#### RaceDataEntry Subraces Property

The `RaceDataEntry` interface includes optional `subraces`:

```typescript
export interface RaceDataEntry {
    ability_bonuses: Partial<Record<Ability, number>>;
    speed: number;
    traits: string[];
    /** Optional: Available subraces for this race */
    subraces?: string[];
}
```

#### Usage Examples

**Generate Character with Subrace:**

```typescript
import { CharacterGenerator } from 'playlist-data-engine';

// Generate a High Elf character
const character = CharacterGenerator.generate(
    'seed-123',
    audioProfile,
    'Elandra',
    {
        level: 5,
        subrace: 'High Elf'  // Specify subrace
    }
);

console.log(character.race);     // 'Elf'
console.log(character.subrace);  // 'High Elf'
console.log(character.racial_traits);
// Might include: ['Darkvision', 'Fey Ancestry', 'Trance', 'High Elf Cantrip']
```

**Subrace-Specific Racial Trait:**

```typescript
import { FeatureRegistry } from 'playlist-data-engine';

const registry = FeatureRegistry.getInstance();

// Register a High Elf-specific trait
registry.registerRacialTrait({
    id: 'high_elf_cantrip',
    name: 'High Elf Cantrip',
    race: 'Elf',
    subrace: 'High Elf',  // Only for High Elves
    description: 'You know one cantrip from the wizard spell list',
    prerequisites: {
        race: 'Elf',
        subrace: 'High Elf'  // Requires High Elf subrace
    },
    effects: [
        { type: 'grant_spell', target: 'cantrip', source: 'wizard', count: 1 }
    ],
    source: 'custom'
});
```

**Feature with Subrace Prerequisite:**

```typescript
// Register a feature that requires Wood Elf subrace
registry.registerClassFeature({
    id: 'wood elf masking',
    name: 'Wood Elf Masking',
    description: 'You can attempt to hide even when only lightly obscured',
    type: 'passive',
    level: 1,
    class: 'Ranger',
    prerequisites: {
        race: 'Elf',
        subrace: 'Wood Elf'  // Only Wood Elves get this
    },
    effects: [
        { type: 'passive_modifier', target: 'stealth_bonus', value: 2 }
    ],
    source: 'custom'
});
```

**Validate Subrace Prerequisites:**

```typescript
import { FeatureValidator } from 'playlist-data-engine';

const trait = {
    id: 'high_elf_cantrip',
    name: 'High Elf Cantrip',
    prerequisites: {
        race: 'Elf',
        subrace: 'High Elf'
    }
};

// Check if character meets prerequisites
const result = FeatureValidator.validatePrerequisites(
    trait.prerequisites!,
    undefined,
    {
        race: 'Elf',
        subrace: 'Wood Elf',  // Wrong subrace
        class: 'Wizard',
        level: 1,
        ability_scores: { STR: 10, DEX: 14, CON: 12, INT: 16, WIS: 12, CHA: 10 }
    }
);

console.log(result.valid);  // false
console.log(result.errors); // ['Requires subrace High Elf (current: Wood Elf)']
```

---

### Custom Classes

**Location:** `src/utils/constants.ts`, `src/core/extensions/ExtensionManager.ts`, `src/core/types/Character.ts`, `src/core/generation/ClassSuggester.ts`

The engine now supports template-based custom classes through the ExtensionManager. Custom classes can extend (inherit from) existing D&D 5e base classes or be defined completely from scratch.

#### Overview

The Template Class System enables creating new classes that extend existing D&D 5e base classes without duplicating all properties. For example, a "Necromancer" class can extend "Wizard" and only override the properties that differ.

**Key Features:**
- **Template inheritance**: Custom classes can inherit from base classes via `baseClass` property
- **Complete customization**: Classes can be defined from scratch without `baseClass`
- **Skill lists**: Custom skill lists (including custom skills)
- **Spell casting**: Custom spell lists and slot progressions
- **Equipment**: Custom starting equipment
- **Features**: Custom class features with prerequisites
- **Audio preferences**: Optional audio affinity for class suggestion

#### Class Type Extensibility

The `Class` type uses a branded string pattern for extensibility:

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

#### ClassDataEntry Interface

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

#### getClassData() Helper Function

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

#### Template Class Merge Logic

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

#### Class-Specific Data Helper Functions

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

#### Registering Custom Classes

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

#### Custom Class Validation

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

#### ClassSuggester Custom Class Support

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

#### Usage Examples

**Template-Based Custom Class (Necromancer):**

```typescript
import { ExtensionManager, asClass, CharacterGenerator } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Register custom skill for Necromancer
manager.register('skills.INT', [{
    id: 'necromancy',
    name: 'Necromancy',
    ability: 'INT',
    description: 'Knowledge of undead creation and control',
    prerequisites: { class: asClass('Necromancer') },
    source: 'custom'
}]);

// Register Necromancer class based on Wizard
manager.register('classes.data', [{
    name: 'Necromancer',
    baseClass: 'Wizard',
    available_skills: ['arcana', 'medicine', 'religion', 'necromancy']
}]);

manager.register('classes', [asClass('Necromancer')]);

// Register custom spell list for Necromancer
manager.register('classSpellLists.Necromancer', [{
    cantrips: ['Chill Touch', 'Mage Hand', 'Mending', 'Message'],
    spells_by_level: {
        1: ['Animate Dead', 'False Life', 'Ray of Sickness'],
        2: ['Ray of Enfeeblement', 'Web'],
        3: ['Animate Dead', 'Feign Death']
        // ... more levels
    }
}]);

// Generate a Necromancer character
const character = CharacterGenerator.generate(
    'test-seed',
    sampleAudioProfile,
    'Test Character',
    { forceClass: asClass('Necromancer') }
);

console.log(character.class);  // 'Necromancer'
console.log(character.ability_scores.INT);  // High (primary ability)
console.log(character.spells?.known_spells);  // Custom spell list
```

**Archetype Variant (Battle Mage):**

```typescript
// BattleMage - tougher Wizard variant
manager.register('classes.data', [{
    name: 'BattleMage',
    baseClass: 'Wizard',
    hit_die: 10,           // More durable than standard Wizard (d8 → d10)
    saving_throws: ['INT', 'CON'],  // CON instead of WIS
    available_skills: ['arcana', 'athletics', 'intimidation']
}]);

manager.register('classes', [asClass('BattleMage')]);
```

**Multiclass-Inspired (Spellsword):**

```typescript
// Spellsword - Fighter with spellcasting
manager.register('classes.data', [{
    name: 'Spellsword',
    baseClass: 'Fighter',
    is_spellcaster: true,  // Add spellcasting to Fighter
    primary_ability: 'STR',  // Keep Fighter primary
    available_skills: ['athletics', 'acrobatics', 'arcana', 'intimidation']
}]);

manager.register('classes', [asClass('Spellsword')]);

// Register spell list for Spellsword
manager.register('classSpellLists.Spellsword', [{
    cantrips: ['Booming Blade', 'Green-Flame Blade', 'Light', 'Mending'],
    spells_by_level: {
        1: ['Shield', 'Thunderwave', 'Magic Missile'],
        2: ['Blur', 'Warding Bond'],
        // ... more levels
    }
}]);

// Register spell slots for Spellsword (half-caster progression)
manager.register('classSpellSlots', [{
    class: 'Spellsword',
    slots_by_level: {
        1: { 1: 2 },
        2: { 1: 3 },
        3: { 1: 4, 2: 2 },
        // ... more levels
    }
}]);
```

**Specialist (Beastmaster Ranger):**

```typescript
// Beastmaster - focused Ranger variant
manager.register('classes.data', [{
    name: 'Beastmaster',
    baseClass: 'Ranger',
    skill_count: 3,  // Extra skill for animal handling
    available_skills: ['animal_handling', 'nature', 'survival', 'perception']
}]);

manager.register('classes', [asClass('Beastmaster')]);

// Register custom starting equipment
manager.register('classStartingEquipment.Beastmaster', [{
    weapons: ['Longbow', 'Shortsword'],
    armor: ['Leather Armor'],
    items: ['Explorer\'s Pack', 'Animal Companion Kit']
}]);
```

**Custom Class Spawn Rates:**

```typescript
// Make custom classes rarer than default classes
manager.setWeights('classes', {
    'Fighter': 1.0,       // Common
    'Wizard': 1.0,        // Common
    'Necromancer': 0.2,   // Rare (20% of normal)
    'BattleMage': 0.15,   // Very rare
    'Spellsword': 0.1     // Very rare
});
```

#### Integration with Other Systems

Custom classes created via the template pattern integrate seamlessly with:

- **Custom Skills**: Register via `skills.${ABILITY}` categories
- **Custom Features**: Register via `classFeatures.${ClassName}` categories
- **Custom Spell Lists**: Register via `classSpellLists.${ClassName}` categories
- **Custom Spell Slots**: Register via `classSpellSlots` category
- **Custom Equipment**: Register via `classStartingEquipment.${ClassName}` categories
- **Prerequisites**: Custom classes can be used in feature/skill prerequisites

#### Testing Your Custom Class

```typescript
import { CharacterGenerator, getClassData } from 'playlist-data-engine';

// Verify class data
const necromancerData = getClassData('Necromancer');
if (necromancerData) {
    console.log(necromancerData.baseClass);       // 'Wizard'
    console.log(necromancerData.primary_ability); // 'INT'
    console.log(necromancerData.hit_die);         // 8 (inherited)
    console.log(necromancerData.available_skills); // Custom skill list
}

// Generate a character
const character = CharacterGenerator.generate(
    'test-seed',
    sampleAudioProfile,
    'Test Character',
    { forceClass: asClass('Necromancer') }
);

console.log(character.class);  // 'Necromancer'
console.log(character.ability_scores.INT);  // Should be high (primary ability)
console.log(character.saving_throws.INT);   // true (inherited from Wizard)
console.log(character.saving_throws.WIS);   // true (inherited from Wizard)
```

---
