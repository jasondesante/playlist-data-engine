---
name: playlist-data-engine
description: The playlist-data-engine npm package — parse Arweave/IPFS serverless music playlists (Ethereum NFTs + Arweave uploads; the data behind ar://listen and ApeTapes) into clean track data; resolve alternate mixes (entry pins, selected_mix, alias-tolerant lookup, lossy/lossless pairs) and track extras/stems; reach files through Arweave gateway failover (AR.IO Wayfinder); analyze audio (sonic fingerprint, genre/mood classification, pitch, BPM/beat maps, rhythm charts) and drive deterministic D&D-style generation from the music — characters, enemies, combat, equipment, XP. Use when working with the playlist-data-engine package, serverless playlist JSON, Arweave music NFTs, or building music-reactive or rhythm-game features on this engine.
---

# playlist-data-engine

One engine, one pipeline: a **serverless playlist** (Arweave JSON mixing Ethereum NFTs and Arweave uploads) is parsed into clean tracks; track audio is analyzed; analysis drives **deterministic generation** — characters, enemies, rhythm charts, combat; XP/progression and IRL sensors make the result a living music player. Two halves meet at audio: the data half (parse → extract → resolve → analyze) and the game half (beat map → chart → character/XP/combat).

## First moves

- Docs ship **inside the package**, version-matched to your install: `node_modules/playlist-data-engine/docs/`. If docs and observed behavior disagree, check your installed version.
- `docs/DATA_ENGINE_REFERENCE.md` is the master index — every export, one row each, **no examples or algorithms by design** (those live in USAGE and features/*). Start at its **Quick Export Reference** to find the function, then jump to its section. Caveat: its Core table predates the entry-point split — the ML classes listed there now live behind `/analysis`.
- `docs/USAGE_IN_OTHER_PROJECTS.md` has working code for every major feature (install, full pipeline, troubleshooting).
- CLI: `npx playlist-data-engine docs` (doc index) · `docs <topic>` (full text) · `skill` (this file). From code: `engineHelp()` / `engineHelp('<topic>')` / `engineHelp('skill')` — exported from both the default and `/gateway` entries. Canonical copy of this file: `skills/playlist-data-engine/SKILL.md` in the repo.
- The `.d.ts` in `dist/` is the complete API surface with JSDoc.

## Three entry points — pick by bundle weight

| Import | Gives you | Pulls TF? |
|---|---|---|
| `playlist-data-engine` (default) | Everything **except** ML — parser, playlists, mixes, gateway, generation, combat, XP, sensors, beat detection | No |
| `playlist-data-engine/gateway` | Lightest: `ArweaveGatewayManager` + Arweave/IPFS URL utils, `MetadataExtractor`, mix lookup (`findMixByName`/`resolveMixUrl`/`selectMix`), `getMixes`/`getMixTracks`/VRM getters | No |
| `playlist-data-engine/analysis` | TensorFlow-bearing: `AudioAnalyzer`, `MusicClassifier`, `PitchAnalyzer`, `EssentiaPitchDetector`, `PitchBeatLinker`, `ButtonMapper`, `LevelGenerator`, `LevelSerializer`, `BeatConverter`, `ModelCache` | Yes (~14 MB) |

Rules: default to the bare import; import `/analysis` only in code that actually runs ML — ideally isolated in a Web Worker; never re-export `/analysis` symbols through the other entries.

## The map

| You want… | Reach for | Read |
|---|---|---|
| Parse a playlist | `new PlaylistParser().parse(raw)` — takes any raw object; options `strict`, `validateAudioUrls`, `resolveImageUrls`. Gateway fetch is yours: `arweaveGatewayManager.resolveUrl()` + `fetch` | features/PLAYLIST_PARSING.md |
| Quick data arrays | `getAudioUrls`, `getTrackTitles`, `getArtists`, `getGenres`, `getTags`, `getTotalDuration`, `getTracks`, `getFullTracks` — work on raw **and** parsed input | DATA_ENGINE_REFERENCE.md → Playlist Utilities |
| Track extras (stems, mixes, VRM, lyrics, charts…) | `track.extras`, `getTrackMetadata(raw)`, `getTrackExtras(metadata)` | features/PLAYLIST_PARSING.md |
| Alternate mixes | See **Mixes** below | features/PLAYLIST_PARSING.md |
| Conditional mixes (weather/time/plays) | `evaluateMixConditions(extras, { environment, appState })` — unknown condition types always pass; `weather` conditions need `WEATHER_API_KEY`, day/time pass keyless | features/PLAYLIST_PARSING.md |
| Resolve any Arweave URL | `arweaveGatewayManager.resolveUrl(url)` — cache → the gateway already in the URL → persisted gateway → arweave.net → static gateways in parallel → AR.IO Wayfinder last. Hot path: `resolveUrlSimple()`. After a real fetch fails: `reportGatewayFailure(url, { reason })`. Non-Arweave URLs pass through | features/GATEWAY_RESOLUTION.md |
| Show gateway progress in UI | `Logger.addSink({ contexts: ['ArweaveGateway'], replay: true, handle })` from `playlist-data-engine/gateway` — every resolve step emits a `StatusEvent` (step, gateway, attempt/total, elapsedMs, correlationId), delivered regardless of log level; `Logger.getEventHistory()` for events before attach | features/GATEWAY_RESOLUTION.md → Status Events |
| IPFS URLs | `isIPFS`, `extractIPFSPath`, `resolveIPFSLink` | features/GATEWAY_RESOLUTION.md |
| Sonic fingerprint / full timeline | `AudioAnalyzer.extractSonicFingerprint(url)` (samples 5%/40%/70%), `.analyzeTimeline(url, { type: 'interval' \| 'count', … })` | features/AUDIO_ANALYSIS.md |
| Genre / mood / vibes | `MusicClassifier.analyze(url)` — 400+ subgenres, mood themes, danceability/energy/valence; zero-config defaults load Arweave-hosted models; `preset:` swaps models | features/AUDIO_ANALYSIS.md |
| Pitch / melody | `PitchDetector` (pure pYIN, TF-free, **default entry**) or `/analysis` `PitchAnalyzer.analyze(url)` (adds contour; `EssentiaPitchDetector` needs `await .create()`) | features/AUDIO_ANALYSIS.md |
| Colors from artwork | `ColorExtractor.extractPalette(imageUrl)` (default entry, no TF) | DATA_ENGINE_REFERENCE.md → ColorExtractor |
| Detect beats / play in rhythm | `BeatMapGenerator.generateBeatMap()` → `BeatStream` (real-time sync, `checkButtonPress`); `GrooveAnalyzer` (DMC-style groove meter); interpolation/subdivision helpers; manual chart editing via `reapplyDownbeatConfig` + beat key helpers | features/BEAT_DETECTION.md |
| Procedural rhythm charts | `RhythmGenerator` (default entry: transients → quantize → phrases → composite streams → difficulty variants) or `/analysis` `LevelGenerator` (adds pitch-driven `ButtonMapper` for DDR/Guitar Hero/Tap) | features/BEAT_DETECTION.md |
| Character from a song | `CharacterGenerator.generate(seed, audioProfile, track, { gameMode: 'standard' \| 'uncapped' })` — same song, same character. `audioProfile` = `/analysis` `AudioAnalyzer.extractSonicFingerprint()` — or any plain `AudioProfile` object (TF-free synthesis is valid) | USAGE_IN_OTHER_PROJECTS.md |
| Enemies / encounters | `EnemyGenerator.generate()` / `generateEncounter(party, opts)` / `generateEncounterByCR(opts)` — **CR = power, rarity = complexity, independent axes**; audio profile steers templates & stats | features/ENEMY_GENERATION.md |
| Combat & balance | `CombatEngine` (turn-based; `hitMode: 'scaled'` default — AC reduces damage — vs `'dnd'`), `CombatSimulator` (Monte Carlo, per-run seeds), `CombatAI`/`AICombatRunner`, `DifficultyCalculator`, `BalanceValidator`, `ParameterSweep` | features/COMBAT_SYSTEM.md |
| Dice & seeds | `generateSeed(chain, address, tokenId)`, `deriveSeed`, `SeededRNG`, `DiceRoller`, `SeededDiceRoller`/`createSeededRoller` | features/ROLLS_AND_SEEDS.md |
| Equipment / loot | `EquipmentGenerator`, `EquipmentModifier` (enchant/curse/upgrade), `EquipmentSpawnHelper` (batch spawn), `BoxOpener` (box items) | features/EQUIPMENT_SYSTEM.md |
| XP & leveling | `SessionTracker` → `CharacterUpdater.updateCharacterFromSession()` (~1 XP/s × modifiers), `addXP`/`addRhythmXP` for other sources; `StatManager` strategies; `PrestigeSystem` (track mastery); uncapped XP curves | features/XP_AND_STATS.md |
| IRL context | `EnvironmentalSensors` (GPS/motion/weather; solar math needs no API key), `GamingPlatformSensors` (Steam); XP modifier capped at 3.0× | features/IRL_SENSORS.md |
| Custom content | `ExtensionManager.getInstance().register(category, items, { mode, weights })` — races, classes, spells, skills, `classFeatures`, `racialTraits`, equipment; runtime only | features/EXTENSIBILITY_GUIDE.md (+ CUSTOM_CONTENT.md, CONTENT_PACKS.md, PREREQUISITES.md) |
| Something broke | ML models load from Arweave at runtime (offline dev fails); audio analysis needs Web Audio | USAGE_IN_OTHER_PROJECTS.md → Troubleshooting |
| Validate data | Zod schemas: `ServerlessPlaylistSchema`, `PlaylistTrackSchema`, `CharacterSheetSchema`, `AudioProfileSchema`, `MixInfoSchema`, … | DATA_ENGINE_REFERENCE.md → Utilities |

## Mixes — the subtle part

- A playlist **entry** pins a mix via `selected_mix` on the track wrapper. Pin matching is **exact and case-sensitive** — `'default'`, or a name matching nothing, means unpinned; legacy `Selected Mix` attribute is the fallback. A pinned track's `audio_url` (and `audio_url_lossless`) are repointed at parse time, so it just plays. `getTracks`/`getFullTracks` apply pins on the raw path too.
- **User choice after parse** is the tolerant path over `track.extras.mixes`: `findMixByName(mixes, name, { prefer, aliases, caseInsensitive })` and `selectMix(track, name)` — case-insensitive, trimmed, alias-aware, exact names always win. `'tv mix'` finds Karaoke, which is its own concept, **never** an instrumental. One name can ship twice (lossy + lossless master): `prefer` defaults to `'lossy'`; `getUniqueMixes`/`getPreferredMixByQuality` handle grouping. Pass `conditionsContext` to `selectMix` to enforce a gated mix's conditions at choice time.
- Audio/mix URIs are **not** resolved at parse time (only images, and only with `resolveImageUrls: true`). `resolveMixUrl(mix)` gateway-resolves for you and follows metadata-JSON uris (`application/json`) one hop to the real audio file.

## Cross-cutting rules

- **Determinism is the contract.** `generateSeed`/`deriveSeed` → `SeededRNG` (generation) and `SeededDiceRoller` (combat dice): same seed + same inputs = byte-identical output. This is why characters are cacheable per track id.
- **Leveling config:** `LevelUpProcessor.setUncappedConfig()` is genuinely global (set before leveling uncapped characters). XP math is otherwise **per-instance**: `new XPCalculator({ xp_per_second, activity_bonuses })`, optionally handed to `new SessionTracker(calculator)` — `mergeProgressionConfig()` is a stateless merge helper, not global state.
- **Extensions are runtime-only.** Nothing persists across restarts; re-register on boot or round-trip `exportCustomData()`.
- **No `src` ships in the package** — consumers get built `dist` (plus `docs/`, `bin/`, `skills/`, `llms.txt`). Consumers on `file:` deps read built dist — rebuild the engine (`npm run build`) after source changes, then restart the consumer's dev server (webpack does not invalidate `file:` symlink targets).
- **Environment:** audio analysis + beat detection need Web Audio (browser, or the `web-audio-api` polyfill in Node); the gateway manager persists state to `localStorage` (shim it server-side); ML models fetch from Arweave at runtime.
- **Sensors are optional.** Env keys: `WEATHER_API_KEY`, `STEAM_API_KEY`, `STEAM_USER_ID`, `XP_MAX_MODIFIER`; sunrise/sunset math needs no key.
