# Combat System Reference

Complete guide to the combat system in the Playlist Data Engine.

**For API details, see [DATA_ENGINE_REFERENCE.md](../DATA_ENGINE_REFERENCE.md)**
**For other usage examples, see [USAGE_IN_OTHER_PROJECTS.md](../USAGE_IN_OTHER_PROJECTS.md)**

---

## Table of Contents

1. [Combat System](#combat-system)
2. [Dice Roller](#dice-roller)

---

## Combat System

```typescript
import {
  CombatEngine,
  CharacterGenerator,
  AudioAnalyzer
} from 'playlist-data-engine';

// Initialize combat engine (optional configuration)
const combat = new CombatEngine({
  useEnvironment: true,    // Apply environmental bonuses
  useMusic: false,         // Apply music bonuses (requires audio context)
  tacticalMode: false,     // Enable advanced tactical rules
  maxTurnsBeforeDraw: 100  // Max turns before draw
});

// Generate player character from audio
const analyzer = new AudioAnalyzer();
const audioProfile = await analyzer.extractSonicFingerprint(track.audio_url);
const playerCharacter = CharacterGenerator.generate(track.id, audioProfile, track);

// Create enemy characters (manually or from a database)
const enemy1 = { /* CharacterSheet */ };
const enemy2 = { /* CharacterSheet */ };

// Start combat - rolls initiative, establishes turn order
const combatInstance = combat.startCombat(
  [playerCharacter],  // Player characters
  [enemy1, enemy2],   // Enemies
  environmentalContext // Optional environmental modifiers
);

// Execute combat turns
while (combatInstance.isActive) {
  const current = combat.getCurrentCombatant(combatInstance);

  // Attack with equipped weapon - engine finds it automatically
  const target = combat.getLivingCombatants(combatInstance).find(c => c.id !== current.id);

  if (target) {
    // Simple: just say who's attacking and who's getting hit
    const action = combat.executeWeaponAttack(combatInstance, current, target);
    console.log(action.result.description);

    if (target.isDefeated) {
      console.log(`${target.character.name} has been defeated!`);
    }
  }

  // Move to next turn
  combat.nextTurn(combatInstance);

  // Check if combat ended
  const result = combat.getCombatResult(combatInstance);
  if (result) {
    console.log(`Combat ended: ${result.description}`);
    console.log(`XP awarded: ${result.xpAwarded}`);
    console.log(`Rounds elapsed: ${result.roundsElapsed}`);
    break;
  }
}
```

**Multiple Equipped Weapons:** If a character has multiple equipped weapons, specify which one:

```typescript
// Attack with a specific equipped weapon
combat.executeWeaponAttack(combatInstance, current, target, 'Longsword');

// Or just use the first equipped weapon (default)
combat.executeWeaponAttack(combatInstance, current, target);
```

**Manual Attack Objects:** For special cases, you can still manually construct `Attack` objects using `executeAttack()` directly. See `Attack` type in DATA_ENGINE_REFERENCE.md for all available properties.

---

## Dice Roller

**For detailed documentation, see [ROLLS_AND_SEEDS.md](docs/ROLLS_AND_SEEDS.md)**


---
