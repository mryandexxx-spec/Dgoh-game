# ARCH-02C-A1 — transaction and storage-write inventory (v138)

**Date:** 2026-11-18. **Status:** research / source audit only. Baseline **main b652864bbf033c2be12ea97475013c8ce77e37b8**, shipped **v138**, SW **112de6f994**. Parent [#193](https://github.com/mryandexxx-spec/Dgoh-game/issues/193), dedicated [#199](https://github.com/mryandexxx-spec/Dgoh-game/issues/199); prior A research Draft [#194](https://github.com/mryandexxx-spec/Dgoh-game/pull/194), merged B0/B1 [#195](https://github.com/mryandexxx-spec/Dgoh-game/pull/195) / [#196](https://github.com/mryandexxx-spec/Dgoh-game/pull/196), v138 release [#197](https://github.com/mryandexxx-spec/Dgoh-game/pull/197), cleanup [#198](https://github.com/mryandexxx-spec/Dgoh-game/pull/198).

Evidence levels: **C = confirmed code property**, **T = tested under B0/B1 fault injection**, **H = credible consequence awaiting operation-level execution**, **O = untested Safari / real-tab behavior**. Severity is impact if triggered, not measured prevalence. All source coordinates below refer to this baseline, not old v137 lines.

## 1. Actual deployed baseline / regression provenance

- GitHub main branch API reports exact HEAD above. Post-cleanup main push [#44379737459](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44379737459) SUCCESS.
- Official v138 workflow [#44374893690](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44374893690) COMPLETED SUCCESS on release source 5926f35c52d4e77e68c99ecb59cfc9b6b9007ccf; independent Pages [#44376653192](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44376653192) SUCCESS on published root b1bc0d55d907b49169fa09e158f402cd2145c89e.
- Cleanup PR #198 touched only release-once workflow deletion, CHANGES_STATUS and release documentation; dev/src, root app.js/sw.js and game balance unchanged. There is NO separate GitHub Releases entry or Git tag v138; the official GitHub Pages deployment is the release.
- ARCH-02B1 acceptance dev/tests/ci/arch02b1-storage-acceptance.mjs: 23 scenarios on **each of the actual PWA and HTML artifact builds** in #44356084531; old v1 fixtures remain compatible. This acceptance **does not prove** gameplay transaction atomicity.

## 2. Single-source write graph, data representation and non-save keys

Main progress key **dune-goh-v1**:
- core/save.js:8 SAVE_KEY; :10-75 newSave/fillSave; :80-100 validSaveV1; :102-125 readSave/loadSave; :126-161 persist0, persist, onPersist.
- core/boot.js:31-55: only status missing permits newSave; status corrupt/invalid/unsupported/unavailable blocks boot; errors from initial write block rendering; hot data.save bypasses read path and is not yet independently validated in initialSave.
- core/save.js:133-154: JSON.stringify(S) then **one localStorage.setItem(primary,json)** with classified failure result. No read-back, revision, ledger, transaction isolation, backup key, multi-tab gate or durable commit API. A successful setItem is local write acceptance, **not a power-loss or site-eviction guarantee**.
- core/save.js:82-100: v1 validation checks core v/water/solari/plast/roster and selected optional fields; nested claim marker maps, unknown keys, timestamp ranges and import bounds are not comprehensively validated.
- ui/wiring.js:19-26 metaFill mutates account/trial/stats metadata before boot persist; :39-43 manual export serializes **live S** to UTF-8/base64; import only checks truthy roster, invokes set_S(fillSave(s)) + metaFill(S) **before** persist, then shows success without checking .ok.
- ui/wiring.js:60-133 recovery overlay from B1 allows raw corrupt/unsupported primary export or emergency **unsaved in-memory** export on write failure. This is not an automatic restore or backed-up committed snapshot.

Other localStorage keys are **not** an alternative durable progress source: core/errlog.js:16-20 uses dune-errlog (diagnostic), dune-inbattle (crash indicator) and dune-crashN. core/errlog.js handles their failures best-effort. ui/events.js:96 uses sessionStorage rotok as view preference. Do not mistake these for backup or transaction journal.

## 3. Map of critical transaction boundaries

| ID | Category and source | Existing mutation / marker | Persist boundary / confirmation | Risk |
|---|---|---|---|---|
| TX-01 | **Manual import** ui/wiring.js:39-43 | set_S(fillSave(untrusted)), metaFill(S); no v==1 or deep schema gate in handler | persist() ignored; "Сохранение загружено" immediately | **P0 C/H**: valid old primary overwritten by imported invalid/incomplete snapshot, or active S differs from failed write |
| TX-02 | **General shop** ui/events.js:226-229 + ui/views/shop.js:30-62 | addRes(-price), S.buys.n limit, quest(shop), grantShards/addRes | reward toast before persist; persist result ignored | **P0 C/H**: split spending/grant, apparent success on failed write, stale daily limits |
| TX-03 | **Daily quest** ui/views/daily.js:12-16 | dly().got[quest] then giveRewards and accXP | persist ignored before rewardWin | **P0 C/H**: false acknowledged claim |
| TX-04 | **Daily chest** ui/views/daily.js:18-23 | D.chest flag + randomized crystals, rewards | persist ignored; rewardWin displayed | **P0 C/H**: RNG grant and marker uncommitted; retry must not reroll acknowledged reward |
| TX-05 | **Campaign entry** ui/battle/battle-ui.js:60-68; logic/progress.js:12-13 | enSpend(water/candle) + quest(water) | persist ignored **before** launch | **P0 C/H**: cost can be committed without ever entering combat; failure can continue battle with uncommitted debit |
| TX-06 | **Campaign finish** ui/battle/battle-ui.js:606-650 | S.cleared, cryClaim, sealClaim, shards, inventory, currencies, account XP; failure refund in enRefund | **one** persist after all mutations; result screen unconditional | **P0 C/H**: no settlement acknowledgment/rollback, first-clear outcome ambiguous |
| TX-07 | **Raid damage and kill** ui/battle/battle-ui.js:578-590; ui/events.js:211-220 | S.raid.hp, used roster, log, raidKills, currencies, fragments, kill reward / raid teardown | finish() persist at :644 and raidend persist at :218, ignored | **P0 C/H**: finished damage/entitlement or payout may not match durable save |
| TX-08 | **Conquest entry/fight** ui/overlays/squad-select.js:103-105; ui/views/conq.js:39-79 | cqEnSpend before launch, C.foe/C.done/stars/route/stamina, rewards | entry and finish persist ignored | **P0 C/H**: independent spend/outcome checkpoints; interrupted session semantics undefined |
| TX-09 | **Conquest one-time loot** ui/views/conq.js:203-227 | C.done cache/disk node, C.tk reward track/chest markers, C.buy, crystals, trophy spend, giveRewards | persist ignored; toast/pop/result shown | **P0 C/H**: repeat/claim or lost update on failure; marker and reward are coupled logically but not isolated from memory |
| TX-10 | **Regular energy refills** ui/overlays/sim.js:34-40 | S.cry debit; S.water/candle credit; S.refills/S.crefills daily limit | persist ignored, success toast | **P0 C/H**: charged refill / uncommitted state, retry and tab race |
| TX-11 | **Conquest refill and medics** ui/views/conq.js:216-221 | S.cry / S.jt / S.cqMed / C.en / C.sta, daily C refill key | persist ignored, success toast | **P1 C/H** |
| TX-12 | **Simulation** ui/overlays/sim.js:113-125 and :160-174 | enSpend then simCore rolls loot, grant resources/XP/quest | persist ignored, rewardWin/result shown | **P0 C/H**: RNG reward generated on mutated global S; retry/parity unspecified |
| TX-13 | **Trials completion / simulations** ui/views/trials.js:68-95 | trialRunsToday counter, stars, trialRoll/trialGive; multi-simulation | finish() persist or trialSim persist ignored | **P1 C/H**: day/claim cutoff and credits not committed |
| TX-14 | **Login calendar** ui/overlays/calendar.js:18-22, :44-47 | L.n++, L.last=todayKey(), giveRewards | persist ignored, toast success | **P1 C/H**: day/month boundary and duplicate/false claim |
| TX-15 | **Feats** ui/views/feats.js:40-46 | giveRewards, cosmetics and S.feats tier increment | persist ignored, rewardWin | **P1 C/H** |
| TX-16 | **Journey / BH9 events** ui/battle/battle-ui.js:590-627 | JP tier flag, one-time shard/cry/seal; finishStoryUnlockBattle / finishBaronBH9Battle update S | finish() persist ignored | **P1 C/H**: one-time entitlement and first-clear marker need one snapshot |
| TX-17 | **Hero levelling, stars, skills** ui/events.js:108-113, :201-210 | S.solari/folio/seal/wol debit, p.lvl/p.stars/p.shards/p.sk credit, quest | persist ignored; toasts/celebration often before verification | **P0 C/H**: resource spend and upgrade not transaction-bound |
| TX-18 | **Equipment / relic / craft** ui/events.js:140-170, :203-210; ui/craft.js:28-40; logic/gear-crafting.js:38-64 | wallet and inventory/parts mutation; p.eq, p.gear, relic level, S resources; inner crafting validates inventory on temporary copies but applies to live S | outer persist ignored; success toast/celebration | **P0 C/H**: local recipe atomicity ≠ storage durability |
| TX-19 | **Recycler** ui/recycler-screen.js:104-117; logic/recycler.js | scrapQuote then scrapCommit mutates S, inventory/points | persist ignored; success toast | **P1 C/H**: quote validation does not protect against storage failure |
| TX-20 | **Fragment shop** ui/events.js:189-197 | S.teeth debit, S.inv grant, quest | persist ignored; toast | **P1 C/H** |
| TX-21 | **General saved settings** ui/wiring.js:29-38; ui/events.js:54-55, :95-107, :201-204 | squad/leader/profile/preferences | persist ignored | **P2 C**: lost preferences; lower priority than currencies |
| TX-22 | **Boot and migrations** core/save.js:17-75; core/boot.js:44-55 | fillSave v1 one-time flags, darkGift, ix_plate/core, Liet retirement, cqUnlock, migB and daily stats | startup persistence checked since B1 | **P1 C/H**: no verified checkpoint/backup before migrations; migration must remain idempotent |

**Arena scope:** inspected ui/battle/battle-ui.js imports and creates render3d/scenes/arena.js as **Arena3D visualization** attached to battles. No independent PvP Arena save/reward transaction handler is established by the inspected ui/views and battle mode dispatch. Do not invent an Arena economy: if a separate Arena progression handler is discovered later, add its actual file and transaction ID first.

## 4. Confirmed failure paths vs hypotheses

**Demonstrated by existing B1 test (T):** dev/tests/ci/arch02b1-storage-acceptance.mjs:174-185 S14 explicitly injects setItem QuotaExceededError/SecurityError after startup, increments **live S.solari by 17**, verifies persist().ok=false and unchanged **durable old bytes**. This proves the in-memory vs stored-state divergence class, not a specific double payout.

**Confirmed code path (C):** core/save.js:149-153 exposes a success status; every TX handler above that calls bare persist() without checking result leaves its own mutated S in place. The B1 blocking overlay is triggered by onPersist error hook but **does not undo handler mutations**. A displayed success can coexist with a blocking error UI. No honest claim of end-to-end transactional commit yet.

**Unsupported claims (do NOT make):** single-key setItem produces torn JSON on normal interruption; Safari storage loss has been reproduced on a live device; rewards are already duplicated in production; same-origin backup survives clearing site data; getItem+setItem is a true cross-tab compare-and-swap.

## 5. Specific interleavings that need hermetic/runtime tests

1. **Import:** existing good primary P; import s with roster but invalid v/negative nested currency; set_S(fillSave(s)); setItem succeeds/fails; reload. Assert P remains exportable and active state was never switched before validated+verified commit.
2. **Daily:** original P lacks got/chest; claim mutates got and resources, injected quota; blocking recovery UI and reward modal compete. Retry same claim after reload: one **acknowledged** settlement maximum; failed-only claim not falsely acknowledged.
3. **Shop/refill:** original P has balance and buy limit; debit/grant; fail write or two-tab stale write. Assert exactly one of {no change, complete debit+entitlement} in last **acknowledged** snapshot; not split.
4. **Battle two boundaries:** commit entry cost; close before launch / after win before finish commit / after finish write but before acknowledgment; no redo/reroll policy without explicit owner decision.
5. **Conquest:** cq() resets weekly state by mutation on read (logic/conquest.js:27-37), then chest C.tk and giveRewards; week rollover + quota/multi-tab reload; no unapproved repeat tracks.
6. **Raid:** damage/used heroes checkpoint, kill payout, and early raidend; repeat click after ambiguous acknowledgment must not recreate completed reward.
7. **Recycler/craft:** helper's temporary inventory validation succeeds, then outer snapshot write fails. No irreversible user acknowledgment from helper alone.
8. **Two tabs:** A and B read same saved P. A commits +100; B commits old+3; **current** simple localStorage setItem allows last-writer-wins. B0 SAVE-08 simulated this with **lost 97**. Real Safari/Chrome two-tab timing remains to be characterized.
9. **Boot after corruption:** B1 must remain fail-closed. If a backup exists in future, candidate restore must preserve original raw corrupt bytes, never assume an older snapshot is automatically authoritative.
10. **Quota/security/serialization/read-back mismatch:** inject at every checkpoint write/read. No silent delete/clear of original key, caches or backup.

## 6. Priority / first safe packet

**P0 first:** import + purchases/claims + battle/raid entry/finish. **P1:** backup/checkpoint, stale-tab prevention, Conquest/Trials/recycler. **P2:** preferences only after correctness core is proven. No balance, RNG/clock/locale-policy edits in ARCH-02C.

**Recommended first implementation-preparation packet C-B0:** **test-only hermetic characterization** of current shipped PWA and HTML artifact builds: import S17, quota/failed acknowledgment on daily/shop/refill/craft, two-tab stale overwrite, battle charge/finish; assert **current observed behavior** without yet changing code. Keep B1's 23×2 tests and v1 fixtures intact. Separate follow-up C-B1 implements a small opt-in guarded checkpoint/restore primitive only after architecture/owner GO. This A1 research PR changes documentation only.

See companion ARCH02C_A1_SAFETY_CONTRACT_AND_PR_PLAN_2026_11_18.md for proposed transaction, acknowledgment, backup, import, cross-tab contracts, acceptance and downgrade safety.
