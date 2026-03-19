# Playlist Data Engine - TODO

## Overview

This document tracks what's been completed, what was recently changed, and what still needs work.

**Last Updated**: 2026-01-22

---


---

## Historical Notes (For Reference)

### Areas of interest for refactoring

| Item | Location | Why It's Safe |
|------|----------|---------------|
| `discordUserId` property | GamingPlatformSensors.ts | Was being stored but never used for actual Discord API calls |
| `callback` parameter | DiscordRPCClient.ts subscribeToVoiceUpdates() | Stub for future Discord voice features |

| `longitude` parameter | GeolocationProvider.ts getBiome() | Simplified biome logic only uses latitude |
| `isListening` property | LightSensor.ts | Internal state flag that wasn't exposed |

| `attacker` parameter | AttackResolver.ts rollAttack() | Attack roll (d20 + bonus) doesn't reference attacker |
| `characterClass` variable | SpellCaster.ts restoreSpellSlots() | Declared but never used in slot restoration |
| `rollInitiative` import | InitiativeRoller.ts | Import from DiceRoller was never used |
| `CombatActionResult` import | CombatEngine.ts | Imported but never referenced |
| `players` variable | CombatEngine.ts getCombatResult() | Filtered but never used |


---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2026-01-22 | Updated to reflect all tasks complete |
| 1.0.0 | 2025-01-04 | Initial release with TypeScript fixes |
