# Playlist Data Engine - TODO

## Overview

This document tracks what's been completed, what was recently changed, and what still needs work.

**Last Updated**: 2026-01-22

---

## Status: All Tasks Complete ✅

All items previously tracked in this TODO have been completed. See [specs/001-core-engine/IMPLEMENTATION_PLAN.md](specs/001-core-engine/IMPLEMENTATION_PLAN.md) for the current implementation status.

---

## Historical Notes (For Reference)

### What Was Removed (and why it's safe)

| Item | Location | Why It's Safe |
|------|----------|---------------|
| `discordUserId` property | GamingPlatformSensors.ts | Was being stored but never used for actual Discord API calls |
| `callback` parameter | DiscordRPCClient.ts subscribeToVoiceUpdates() | Stub for future Discord voice features |
| `maxConnectionAttempts` | DiscordRPCClient.ts | Was incremented but never used for retry logic |
| `rpcEndpoint` | DiscordRPCClient.ts | Was never used for actual RPC calls |
| `longitude` parameter | GeolocationProvider.ts getBiome() | Simplified biome logic only uses latitude |
| `isListening` property | LightSensor.ts | Internal state flag that wasn't exposed |
| `attackName` parameter | AttackResolver.ts calculateAttackBonus() | Bonus calculation doesn't need attack name |
| `attacker` parameter | AttackResolver.ts rollAttack() | Attack roll (d20 + bonus) doesn't reference attacker |
| `characterClass` variable | SpellCaster.ts restoreSpellSlots() | Declared but never used in slot restoration |
| `rollInitiative` import | InitiativeRoller.ts | Import from DiceRoller was never used |
| `CombatActionResult` import | CombatEngine.ts | Imported but never referenced |
| `players` variable | CombatEngine.ts getCombatResult() | Filtered but never used |

**Bottom Line**: All removed items were truly unused. No functionality was lost.

---

## Previously Completed Tasks

The following tasks from earlier versions of this TODO have all been completed:

### ✅ Environmental Sensor Aggregation
**Status**: Complete - See [IMPLEMENTATION_PLAN.md](specs/001-core-engine/IMPLEMENTATION_PLAN.md) Task 9

### ✅ Motion Detection
**Status**: Complete - See [IMPLEMENTATION_PLAN.md](specs/001-core-engine/IMPLEMENTATION_PLAN.md)

### ✅ Discord RPC Integration
**Status**: Complete - Music presence only (cannot detect games - platform limitation)
See [IMPLEMENTATION_PLAN.md](specs/001-core-engine/IMPLEMENTATION_PLAN.md) Task 1

### ✅ Enhanced Biome Detection
**Status**: Complete - See [IMPLEMENTATION_PLAN.md](specs/001-core-engine/IMPLEMENTATION_PLAN.md) Task 5

### ✅ AttackResolver Enhancement (Ability Modifier)
**Status**: Complete - See [IMPLEMENTATION_PLAN.md](specs/001-core-engine/IMPLEMENTATION_PLAN.md) Task 1

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2026-01-22 | Updated to reflect all tasks complete |
| 1.0.0 | 2025-01-04 | Initial release with TypeScript fixes |
