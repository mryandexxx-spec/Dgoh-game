# ARCH-02A — proposed safety contract / ARCH-02B,C,D implementation boundaries

**Status: PROPOSAL, not owner-approved production code.** Derived from [source audit](ARCH02A_SOURCE_AUDIT_2026_11_18.md) at immutable `main 2ef68623a001f5169daa3354931632fcf0d47c0f`. Upstream: Product Audit #120 / ARCH-02 #193. No merge, release, bump or deploy implied.

## I. Non-negotiable invariants

1. `dune-goh-v1` is the currently supported primary localStorage key. Old `v:1` saves and `tests/fixtures/saves/01-legacy-v1.json`, `02-mid.json`, `03-late.json` load and reproduce the historical golden snapshots. No key rename, silent reset, numeric rebalance, reward change or changed serialized `v` without an explicitly approved, reversible migration.
2. Never treat `missing`, `unavailable`, `corrupt`, `unsupported-version`, and `invalid-shape` as the same state. **Only confirmed missing primary** permits `newSave`; failure in reading or validating existing progress blocks overwriting it. Where the store cannot distinguish absence from failure, fail closed.
3. **No acknowledged critical transaction on failed persistence.** User-facing "saved/claimed/purchased" must mean a successful local durable write and (for checkpoint flow) verified read-back, not an in-memory mutation followed by a swallowed catch. A failure should preserve original bytes, leave a clear retry/export path, and avoid silent success.
4. Never run `fillSave`, `metaFill` or untrusted imported JSON in-place on the only recoverable bytes. Parse → clone → validate → migrate clone → validate result → commit. Keep an untouched original until verification. Migrations idempotent, reproducible; no added resources on repeated load.
5. Every claim/spend must update entitlement/claim marker and resource balances in **one save snapshot**. Explicit attempt/settlement identity required where a workflow spans UI sessions or battles. No flag-only or currency-only recovered checkpoint.
6. `localStorage.setItem` provides a single-key synchronous replacement, not cross-key atomicity or power-loss guarantee. Backup/checkpoint design must test every failure point. A backup of the same origin does not protect against clearing all Safari website data.
7. Deterministic game content and economy remain byte-for-byte equivalent for historical date/seed and random draw stream unless the owner explicitly approves altered behavior. UI sparkle/notification randomness is not game RNG. Do not consume extra draws for debug/telemetry.
8. Strict ARCH-01 `arch-strict` remains independent and must be SUCCESS for every PR/push, including documentation-only. Do not touch `dev/src/render3d/scenes/camp.js`, camp navigation/UI, Campaign 210, 21 3D maps, graphics profiles, golden expected values, current root `app.js/sw.js` or approved ESM/SCC ordering.

## II. Proposed interfaces (concept only; no production edits in A)

### Save loading

`readSaveSnapshot(storage) → { kind:'ok', save, raw, source:'primary'|'backup', metadata } | { kind:'missing' } | { kind:'corrupt'|'invalid'|'unsupported'|'unavailable', raw?, errorCode }`.

- Probe primary with guarded `getItem`, not `JSON.parse(getItem())` collapsed in one catch.
- `null` means missing **only** when `getItem` itself succeeded. Empty string, truncated/invalid JSON, unrecognized version, wrong root/nested types => non-empty non-success state.
- Validate `v===1`, typed core fields (roster object, currencies finite nonnegative, date strings/timestamps when present), safe object shape and bounded payload; do not silently clamp unknown financial fields. For historical saves, optional missing fields must follow existing `fillSave` defaults (same snapshots). Prototype pollution and oversized imports rejected before any mutations.
- Migration is evaluated on a clone, must not mutate backup bytes. Test `fillSave(fillSave(x))` parity where all additive defaults/one-time migration flags apply.
- Boot: on `ok` set active S from validated candidate. On `missing` allow new save *only* if store read/write capability is known and no recoverable backup exists. On non-success, present a blocking recovery state (retry read/export current bytes/load external code); **never run unconditional `persist` or start rewards**. The design of minimal fallback UI requires separate owner approval and must not change Camp layout/navigation. Other startup data (`window.claude.hot.data.save`) is treated as untrusted input/validated consistently.
- For B, preserve `loadSave()`'s existing export/API compatibility to avoid ESM behavior regressions; add a separate typed primitive/adaptor, keep old golden semantics where legitimate no-save is null.

### Save writing / commit

`persistResult(snapshot, {critical, reason, txId?}) → {ok:true,version?,checksum?}|{ok:false,kind:'quota'|'security'|'serialization'|'unavailable'|'verification',errorCode}` (interface subject to approval). No exception swallowed without diagnostic. Notification `onPersist` fires only for successful durable commit; visuals/read-only UI can remain best-effort.

- B introduces failure classification, non-destructive boot behavior, plus **read-only injected-storage test seam**. Do not auto-upgrade or relocate key in B. In-app persistent error banner/export path is a separate reviewed UI surface outside the forbidden Camp scene/nav.
- A critical mutation should use isolated draft state and commit result before activating/confirming it. **Do not naively clone and replace global S in every handler in one PR**: existing ESM bindings, live refs, reward hooks, and UI input state can require adapters. Select transaction by transaction (C), compare exact resulting snapshots and event ordering. On failure no double award/spend; warn and allow retry of same ID.
- On QUOTA do not delete user saves/cache as an automatic "fix". Keep safe recovery/import/export available, provide explicit human action if storage is permanently unavailable. Diagnostic logs must not contain save JSON or identifiable progress content.
- Cross-tab: detect stale snapshot/generation, do not overwrite newer generation blindly. Use `storage` event or an approved revision/lease protocol and clear conflict UX; local optimistic CAS using `getItem`/`setItem` alone is **not** a true cross-tab atomic compare-and-swap. Tests must demonstrate race handling or document "one active tab" limitation.

### Backup and recovery (C; not in A/B)

Candidate additive keys only after approval, e.g. `dune-goh-v1.backup`, `dune-goh-v1.pending`; names provisional and must not collide with user data. No change to primary key. A safe protocol MUST:
1. Read and structurally validate current primary and candidate, capture original bytes. Never replace a known-good backup with corrupt primary or candidate.
2. Verify ability to store backup of last confirmed good state **before** replacing primary; on backup failure abort critical commit without changing primary.
3. Write primary once with whole candidate JSON; read back / parse / validate and verify exact bytes or checksum; only then report success. On any failure return failed status and retain prior recoverable backup. Multi-key interruption matrix must validate each write/verification boundary.
4. On subsequent boot, prefer primary if valid and coherent; when primary invalid, offer/perform **non-destructive** recovery from last verified backup, with a user-facing explanation and optional raw export. Never destroy the corrupt original until an explicit decision. In case of conflicting valid snapshots or revision monotonicity, don't silently choose a lower-progress state (progress is not totally ordered).
5. Keep manual export/import available; make export of last committed and unsaved memory state visibly distinct. Before import, validate version/shape/size/ledger; create verified restore point of old state; commit candidate, re-read, only then replace active S and toast success. On failure leave old S/primary intact.
6. Test against genuine quota semantics (including backup-write failure), serialized checkpoint interrupted between each operation, unavailable storage and entire-origin deletion. Document that full site-data eviction has **no local-only recovery**.

### Critical entitlement transactions (C)

Examples of proposed IDs, with **no gameplay implementation in A**:
- `battle-attempt:<opaque>` links energy spend to start and outcome settlement; same attempt not granted twice. Decide owner-approved policy for incomplete attempt (resume/forfeit/refund) based on current gameplay before implementing.
- `claim:daily:<local-date>:<quest>` / `claim:daily-chest:<date>`; `claim:login:<month>:<day>`; `claim:journey:<id>:<tier>`; `claim:conquest:<week>:<node/reward>`. Existing `got/chest/cryClaim/sealClaim/tk/JP/raid` markers remain truth; IDs are additive audit/commit identifiers only when justified by test.
- Purchases/crafting/relic/skill upgrades are synchronous resource+inventory transactions with stable precondition and durable postcondition; avoid introducing a double-spend across tab/retry.
- No economic, rewards, drop-rate, or balance changes. Sequential migrations for new ID fields must be supported by older legacy v1 saves without rewriting historical data destructively.

## III. GameClock API (D)

Proposed `GameClock` instance: `nowMs()`, `localDayKey(ms?)`, `localWeekKey(ms?)` (Monday 00:00 in local timezone), `localMonthKey(ms?)`, `localWeekday(ms?)` and `elapsedMs(since, now?)`. Default adapter delegates to the **current** `Date` behavior, including `toDateString()` formatting; test fake clock injects time/zone explicitly. `performance.now()` remains the source for transient animations/press timings, not game rewards.

- Integrate at known clock boundaries first, not blind global replacement. `logic/economy.js:14` daily key and consumers; `logic/conquest.js:27-53` week/regen; `logic/trials.js:9,39` trial week/day; `ui/overlays/calendar.js:18-22` month; `core/state.js:7-11` energy.
- Preserve present timezone/rollover decisions while establishing parity tests. Cross-timezone behavior, DST and manipulation policy are separate product decisions; **offline local wall-clock is not authoritative**. Forward jumps can generate energy or open new period; clamping/rejecting requires owner sign-off and economy analysis, not stealth protection.
- Clock discrepancies should be surfaced in diagnostics; do not unexpectedly expire already earned rewards or reset weekly unlocks. Absolute timestamps stay numeric UTC milliseconds; local day/week labels are compatibility artifacts for old saves.

## IV. RNG API (D)

A scoped injectable `GameRng` with `nextFloat() → [0,1)`, optional seeded factory `create(seed)` and trace-only deterministic testing. Preserve streams separately:
- `data/seeded-rng.js` pure seeded (`sRng`) for campaign/Conquest/shop; current seed hashing/order unchanged.
- `logic/battle/engine.js` internal `mkRng` + `B.rng()`; preserve historical battle seeds and every draw. `opts.seed || Date.now()` means `0` is currently an invalid effective explicit seed — change only under approved compatibility tests.
- Result RNG currently comes from `Math.random()` in economy, gear, trials, daily, Conquest. Inject only through optional/default adapters with same invocation order, same thresholds, and same number of calls. No global monkeypatch in shipped code.
- Pure cosmetic `Math.random()` in celebrate effects and ephemeral notification IDs stays independent; no output-changing "shared stream". Existing golden combat and campaign 210 node hash must remain exact; include sample/long stream parity and counters.
- Log only seeds/test trace hashes as agreed; never log sensitive saved state.

## V. Staging / approval / GO-NO-GO / rollback

| Package | Exact planned production touch points (approval required) | Preconditions | GO acceptance | NO-GO / rollback |
|---|---|---|---|---|
| **ARCH-02B0 read-only characterization** | new `dev/tests/ci/arch02b-*` harness + optional CI registration only (no runtime save writes, no golden updates); file harness uses VM/test-scoped ephemeral localStorage | A docs accepted | old fixtures unchanged; reproduces corrupt-json path, quota/read errors, broken-import attempts, user data never touched | no reliable fault injection => stop; revert tests only |
| **ARCH-02B1 fail-closed storage** | `core/save.js` typed load/write result, `core/boot.js` safe-start gate, optional small non-Camp recovery surface in `ui/`; tests; registration/split only if added module with exact ESM preflight | B0 characterization and owner sign-off | no overwrite on `corrupt/unavailable`; no critical success toast on error; golden saves and start order identical on success; strict arch and full CI | any old save changed or boot ESM reorder => no merge; revert B1 to pinned baseline while preserving exported raw backup |
| **ARCH-02C durable recovery & transactions** | `core/save.js` additional backup/verify protocol, `ui/wiring.js` safe import/export, selected `ui/events.js`, `ui/battle/battle-ui.js`, `ui/views/daily.js`, `ui/views/conq.js`, `ui/overlays/calendar.js`, `ui/overlays/sim.js`, `ui/recycler-screen.js`; approved additive schema/checkpoint | B1 green, failure-policy and compatibility contract approved; one transaction family per PR | ordered fault matrix passes, 2-tab trials, no duplicate durable claims, read-back/restore, old snapshots; no reward or rate change | no atomic recoverability / invalid backup policy => stop; do not delete primary/old backups; rollback code with migration compatibility proven first |
| **ARCH-02D reproducible time/RNG** | `core` clock/RNG adapters + consumers `logic/economy.js`/`conquest.js`/`trials.js`/`battle/engine.js`/`gear.js`, `ui/overlays/calendar.js`, `ui/views/daily.js`/`conq.js`, `core/state.js` and test harness | B/C CI green, timezone and RNG baseline fixed, product date policy approved | old goldens and seeded streams identical, exact consumption count, DST/midnight/week/zone rollover, PWA offline, no new reverse imports/cycles | any ESM, rewards, odds, balances, 210 campaign nodes differ => no merge; revert adapter/consumer changes, preserve v1 save |

**CI rule**: docs-only A expects Plan+gate **and independent arch-strict SUCCESS**; implementation touching core/logic/CI uses full matrix per `dev/docs/ci/STAGE3_MINIMAL_SCENARIOS_AND_PROMOTION.md`. Run both `node tools/check-deps.mjs --strict` and `node tools/check-arch-imports.mjs --strict`, `check-bundle`, golden PWA + artifact, smoke SW offline/cold/warm, DOM, WebGL MED/LOW/HIGH/lifecycle according to pipeline. Never blindly update golden. ESM marker/order count and SCC must be explicitly compared against pinned v137. iPhone physical acceptance still outstanding and cannot be inferred from Chromium.

**Rollback protocol**: A docs only: close Draft/revert docs; B: revert only after confirming unchanged old saves and no new metadata; C: keep reading additive backup/transaction metadata across app rollback or plan compatible downgrade before release, never overwrite a newer verified snapshot with an older build; D: revert injectable adapters while preserving stored legacy temporal keys. Merge, bump v138, release and Pages publish are separate explicit owner commands.
