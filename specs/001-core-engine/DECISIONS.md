# Core Data Engine - Technical Decisions

**Updated**: 2025-11-29

---

## Architecture

Layered pipeline: Parser → Analysis → Generation → Progression → Sensors → Combat

```
src/core/
├── parser/      # Playlist parsing
├── analysis/    # Audio + visual
├── generation/  # Character creation
├── progression/ # XP + leveling
├── sensors/     # Environmental + gaming
├── combat/      # Turn-based combat
└── types/       # TypeScript definitions
```

---

## Technology Stack

| Component | Technology | Why |
|-----------|------------|-----|
| Types | TypeScript 5.x | Strict typing for complex data |
| Validation | Zod | Runtime schema validation |
| Hashing | murmurhash-v3 | Fast, deterministic 32-bit seeds |
| Audio | Web Audio API + OfflineAudioContext | Browser-native, faster-than-realtime analysis |
| Visual | Canvas API, k-means, median cut | Native, performant color extraction |
| D&D 5e | Hardcoded SRD 5.1 | Static data, no network dependency |
| Sensors | Geolocation, DeviceMotion APIs | Native browser APIs |
| Weather | OpenWeatherMap (dev key required) | Free tier, comprehensive data |
| Gaming | Steam Web API, Discord RPC | Platform integration (CORS proxy needed) |
| Testing | Vitest + mock fixtures | Fast, reproducible tests |

---

## Key Decisions

**Audio**: OfflineAudioContext for < 1s analysis of 3-min tracks; 100x100px for images (< 200ms)

**Privacy**: All sensors opt-in, no server-side storage without consent

**Naming**: Weighted 50/30/20 (Class Title / Adjective / Clan) for deterministic variety

**XP**: Base 1 XP/sec × environmental (max 2.0x) × gaming (max 1.75x), capped at 3.0x total

**Spells**: Hardcoded cantrips + levels 1-9 across 8 schools (reduces bundle size)

---

## Design Principles

1. **Deterministic**: Same seed + audio = identical character
2. **Privacy-first**: Sensors opt-in, graceful degradation when denied
3. **Isomorphic**: Core logic works in browser and Node.js
4. **Performance targets**: Audio < 1s, generation < 100ms, level-up < 50ms

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Browser API compatibility | Feature detection + graceful degradation |
| Steam/Discord rate limits | Exponential backoff + caching |
| Weather API costs | Optional, developer provides key |
| Sensor permission fatigue | Cache permissions, clear value prop |
