# ARCH-02A — regression and failure-injection matrix (future ARCH-02B/C/D)

**Research specification only** on pinned v137 `2ef68623a001f5169daa3354931632fcf0d47c0f`; no new tests executed, and no production writes performed in ARCH-02A. Cross-reference [source audit](ARCH02A_SOURCE_AUDIT_2026_11_18.md), [safety contract](ARCH02A_SAFETY_CONTRACT_2026_11_18.md), Issue #193.

## Runner and evidence discipline

Use a hermetic in-memory `localStorage` double with `getItem`/`setItem`/`removeItem` and injected failure points; no developer/browser real save key touched. The existing `dev/tests/lib/load.mjs` VM game harness and `tests/golden/saves.mjs` three legacy `v1` fixtures are the initial read-only reference. Explicitly distinguish **v137 baseline expected to fail safe-contract tests** from **post-B/C/D acceptance tests**. For each test capture: input original bytes, order of storage operations, active S snapshot, primary after, backup after, user acknowledgment (success/error), transactions/claim flags, RNG call count and date/time source. Never check in user saves or private telemetry.

Two-phase tests: **characterization** runs existing v137 with test doubles and confirms current failure path; **acceptance** reruns identical fault scenario against B/C implementation and demands target oracle. Maintain same real-game golden snapshots; no `--update`.

## A. Save loading / storage fault matrix

| ID | Given / injected fault / action | Required acceptance oracle | Phase |
|---|---|---|---|
| S01 | No primary key; readable+writable empty store; start | one valid fresh `v:1` save, defaults identical to historical newSave golden | B |
| S02 | `01-legacy-v1.json`; load/start | old resource/roster values, exact golden, idempotent migrations, valid persisted v1 | B |
| S03 | `02-mid.json`; load/start | exact golden and no lost currencies/gear | B |
| S04 | `03-late.json`; load/start | exact golden and no lost journeys/Conquest/raid | B |
| S05 | `getItem` throws `SecurityError`; start | **no new save write**; enter recoverable blocked state; old bytes unchanged | B |
| S06 | `getItem` throws generic unexpected error; start | do not downgrade to missing; preserve, classify and surface failure | B |
| S07 | Primary truncated/invalid JSON | raw primary untouched, no auto-reset, offer manual recovery; backup only when C supports it | B/C |
| S08 | Primary parses to `null`, array, number or missing `v` | classify invalid/unsupported; do not write new account | B |
| S09 | `v=2` with plausible roster | unsupported version; no fallback/newSave/legacy mutation | B |
| S10 | `v=1` with missing/null roster or invalid nested currency/eq/daily/conq | bad shape quarantined; no overwrite or malformed migration | B |
| S11 | `v=1` with only historical fields, all optional fields absent | legacy defaults as historical; same fillSave ordering; no unapproved gifts | B |
| S12 | `fillSave` run twice on same fixture clone | same resulting state, no repeat `ix_plate` migration or reopened Liet/Jihad | B |
| S13 | `JSON.stringify` throws / cyclic test object / oversized input | explicit serialization/validation failure, not success, old durable save preserved | B |
| S14 | `setItem` throws `QuotaExceededError` or `SecurityError` | explicit failed commit, durable old value intact, no "saved" toast or pretend success | B |
| S15 | `setItem` throws on boot post-metaFill | startup does not confirm writable progress; user can recover or export without destructive reset | B |
| S16 | Existing manual export code from v137 | decode/import roundtrip identical progress, valid UTF-8 Cyrillic, keep v1 | C |
| S17 | Import malformed base64/JSON, `roster=null`, `v=2`, negative/malformed currencies | old in-memory S and persistent primary unchanged, explicit error; no "loaded" toast | C |
| S18 | Valid import but injected backup or primary write failure | old active S, old committed bytes remain, no acknowledged import | C |
| S19 | Primary corrupt but last verified backup valid | recover from backup nondestructively; raw corrupt primary preserved for export/manual audit | C |
| S20 | Primary valid but backup corrupt; or two valid snapshots conflicting | avoid auto-selecting incorrect older progress; prompt explicit conflict path | C |
| S21 | Crash at each: backup write, backup verify, primary write, primary verify, cleanup | on next start at least one validated last-known-good checkpoint; no false success and no double settlement | C |
| S22 | Backup write fails due to quota before primary write | abort; original primary bytes exactly unchanged; do not delete good user data | C |
| S23 | Close/reopen PWA during save, and SW update between checkpoints | last acknowledged snapshot or prior valid backup; never corrupt/zeroing account. No claim that per-key setItem produces partial bytes | C |
| S24 | Entire-origin data deleted in Safari/browser | must **not** claim recoverability absent exported/server copy; explain account scope and offer manual code restore | C / UX |
| S25 | Two isolated tabs load identical snapshot and write stale divergent copies | stale write detected/blocked or explicit documented one-tab guarantee; no silent accepted loss | C |

## B. Critical transaction / idempotency matrix

| ID | Given / injection | Required oracle | Phase |
|---|---|---|---|
| X01 | Campaign: successful energy debit, close before combat start | owner-approved resume/refund/forfeit policy; no hidden resource freebie or unacknowledged spend | C |
| X02 | Campaign: win 3★ and close before/after finish checkpoint | `cryClaim`/`sealClaim` and currencies always settle as one durable snapshot; no double first clear | C |
| X03 | Camp simulate k times, `setItem` failure after rewards generated | no acknowledged grant and no durable partial reward/spend; retry semantics deterministic or re-generated under approved rule | C |
| X04 | Daily quest double click/reload/clock midnight during claim | one durable claim per defined day; no twice credited same ID | C/D |
| X05 | Daily chest RNG draw, then forced write fail / retry | no false "chest received"; no second durable claim; exact RNG draw parity on success | C/D |
| X06 | Login calendar claim before midnight, reload with timezone changed, claim again | month/day policy and single durable claim per genuine day, with policy explicitly approved | D |
| X07 | Shop purchase at daily limit, repeated click/reload | resource debit and purchase count + item atomically durable; no loss, duplicate, or free gift | C |
| X08 | Craft/equip/relic/skill transaction with missing resources or storage failure | no credit without debit, no debit without item/progression, no successful UI confirmation on failure | C |
| X09 | Recycler quote/commit, item count changes, then injected write fail | quotation validated and no partially durable resource changes | C |
| X10 | Raid: partial damage+used squad, close/relaunch; kill and claim after fail/retry | cumulative HP and used heroes consistent, settlement once; all drops/rewards in same committed snapshot | C |
| X11 | Conquest one-time chest and track reward double action / fail/retry | `C.tk` claim marker, balance and chosen RNG reward agree in saved state; once only | C |
| X12 | Conquest weekly boundary mid-run, reopen, change timezone | no unintended previous-week grant in new week; explicit eligibility policy | D |
| X13 | Trials 3 successes; reload; advance system day; rewind; rotate timezone | per-day trial limit follows approved local-day semantics, no unexpected duplicate payout | D |
| X14 | Story/BH9 first clear and repeated event, reload at day boundary | deterministic reward flag and exact shards, no extra first-clear grant | C/D |
| X15 | Two live tabs concurrently purchase same item or claim same chest | no silent stale write causing double spend/claim or lost legitimate progress | C |

## C. Time / RNG parity matrix

| ID | Deterministic case | Oracle | Phase |
|---|---|---|---|
| T01 | 23:59:59 → 00:00:00 local, daily/shop/Conquest refill | original key formatting and one rollover only | D |
| T02 | Sunday → Monday 00:00 local, timezone Europe/Amsterdam, DST forward/back | `cqWeek` and reset semantics consistent with current v137 until policy approved | D |
| T03 | Local 01:59:59 → 03:00:00 DST spring, autumn repeated hour | valid elapsed regeneration, no negative/infinite cooldown, no hidden extra reset | D |
| T04 | Change timezone Amsterdam → UTC → Pacific/Kiritimati while app open | predictable explicitly approved local-day/month boundaries; no silent destructive progress drop | D |
| T05 | Clock -1h/-1d then +1h/+30d, cold and warm restarts | anomaly detected; cap and pacing preserved until anti-clock-policy approved; no infinite negative values | D |
| T06 | 30-day offline PWA, long absence, 85-level energy cap | bounded regeneration and consistent timestamp, exact v137 rate and cap | D |
| T07 | Clock changes while active raid/Jihad and daily claim modal open | close/claim checks clock at one transaction boundary; no split-date marker | D |
| R01 | Pure `sRng` for seed 0, -1, max uint32, 4096+ vectors | exact ARCH-01C2c vector parity, campaign 210 nodes hash unchanged | D |
| R02 | `logic/battle/engine.js` seed 0 and nonzero, same squads | characterize existing `opts.seed || Date.now`; new injection only after owner-approved compatible policy | D |
| R03 | Battle 200 goldens PWA/artifact and seeded specific BH9 scenario | byte-for-byte historical RNG results and call count/consumption order | D |
| R04 | fixed sequence for `campReward`, `rollItems`, `trialRoll`, `claimChest`, `cqChest`, `raidFrags` | identical outputs/odds per injected stream, no extra draws or reordered RNG | D |
| R05 | UI celebratory FX random while gameplay reward generated | cosmetic random consumption does not affect gameplay stream | D |
| R06 | simulated odds statistical run (read-only) | probability rates within Monte Carlo bounds around v137; **does not replace** exact stream test | D |

## D. CI acceptance and GO/NO-GO checklist

- [ ] Before any production change, B0 *characterization* tests run against pinned main and record exact failed safety assertions, with no user profile writes.
- [ ] B1 accepts S01-S15; preserve historical `tests/golden/saves.mjs` snapshots without `--update`. No destructive boot fallback for non-missing store.
- [ ] C accepts S16-S25 and X01-X11/X14/X15 under **chosen owner-approved policy**, compare checkpoint bytes, completed transactions and conflicts. Any lost existing valid save is NO-GO.
- [ ] D accepts T01-T07, R01-R06 and X04/X06/X12/X13; record local timezone/system clock. Zero changed probability, RNG draw sequence or seeded battle goldens without explicit owner approval.
- [ ] For code packages: full CI policy for core/logic changes, `arch-strict` SUCCESS and both strict CLIs, approved ESM 167 order, zero forbidden deps, unchanged baseline `legacy: []` and protected assets, check-bundle, golden PWA/artifact, SW update/offline, 3D/DOM as required.
- [ ] Real Safari/WebKit iPhone standalone/offline and website storage exercise remains OPEN, must not be replaced with CI claims.
- [ ] No merge/release/root publish until direct separate owner command, even on successful CI.

**Rollback test**: B/C/D build must read legitimate older v1 snapshots after reverting its runtime code. Any additive transaction IDs/backups must not make old builds silently corrupt newer state. If such downgrade cannot be proven safe, release is NO-GO until backward-reader or export-assisted rollback strategy is approved.
