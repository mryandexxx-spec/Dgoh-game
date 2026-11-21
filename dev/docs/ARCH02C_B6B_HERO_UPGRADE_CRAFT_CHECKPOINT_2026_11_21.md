# ARCH-02C-B6b — verified hero upgrades and equipment crafting

Date: 2026-11-21. **Stacked draft after B6a Draft PR #230**, based on B6a exact source `b640ec08e7070694d3a01a0afcd9056479692674`; B6a is not merged or published. B6b adds no save schema migration, version bump, root PWA file, golden update, economy/reward/RNG rebalance or new named ESM export/import boundary. Frozen Conquest UI and historical v140 release remain untouched.

## What was unsafe and the new atomic boundary

| Existing action | Prior failure window | B6b candidate |
| --- | --- | --- |
| Skill level (`skup`) | Cost, skill level and `quest('skill')` changed live `S` before ignored persist and early toast | Revalidate hero/cap/cost in detached writer state; commit all three together; toast after verified commit |
| Hero level slider, +1/+5 (`lvlto`, `lvl`, `lvl5`) | Debit and quest increment interleaved before unchecked persist; queued celebration could occur without durable level | One verified snapshot for exact current cost, level and all quest steps; celebration only after success |
| Star promotion (`star`) | Solari debit, shard consumption, stars and immediate toast/queued animation without checked save | Preflight current shard requirement and price; commit all; no star toast or animation on failed/uncertain write |
| Gear tier (`gear`) and all-equipped promotion (`gup`) | Currency debit, tier and six equipped flags mutated live before unchecked persist/celebration | Revalidate tier/cap/current cost/slots on clone; one commit; then render/celebrate |
| Another Memory (`relic`) | Multi-material debit and memory level before unchecked persist + queued animation | Run existing `relicBuy` against detached `S`/hero; gate every material and new level before celebration |
| Ultimate unlock (`glopen`) | Water of Life spent before unchecked persist; old click could spend again on same unlocked ultimate | One checked Water of Life debit and unlock marker; reject already-unlocked replay |
| Component build and single-slot craft (`buildpart`, `craft`) | Recipe engine uses temporary inventory internally but resulting wallet/parts/equipment/`quest('craft')` were only memory changes if save failed | Repeat recipe and funds check within full writer transaction; commit inventory, parts, cash, equipped slot and quest as one record |
| Equip all (`craftAll`) | Multiple slot changes, materials/cash and quest steps before one ignored persist, with success count from stale preview | Rebuild plan on detached candidate, apply all slots/quest steps together or none; present only applied list after verified save |

The paid actions use an **UI-owned dispatcher** `verifiedUpgradeClick()` in the pre-existing `ui/events.js` and the existing `craftAll()` entry point. No logic-to-UI imports were added. All historical **ungated B0** handlers are preserved only for forensic old-v138 characterization, with **zero fallback** when the production mandatory writer gate is armed. No detached transaction callback may display UI or asynchronously launch gameplay. Existing cost formulas, level caps, recipes and daily quest rules are reused, not duplicated.

## Required B617–B636 acceptance

`dev/tests/ci/arch02c-b6b-upgrade-crafting-acceptance.mjs` runs on **actual built PWA and standalone HTML artifact** in both Fast Web Locks and Full Validate:

- **B617–B619**: exact skill price/level/quest, backup quota rollback, cap and forged skill denial.
- **B620–B622**: level slider/+5 price, counted quest steps, failed write with no celebration.
- **B623–B625**: stars, shard/solari debit and cold boot after primary-write-then-throw uncertainty, no false star animation.
- **B626–B630**: direct gear tier purchase, all-equipped gear tier+six-slot reset, exact multi-material relic charge, quota without queued celebration, ultimate unlock no replay debit.
- **B631–B636**: crafting full equipment and individual parts, quest atomicity, quota rollback, all-slot craft batch with no partial equips and dead Web Locks writer refusing every upgrade.

Additional full gate: strict ARCH-01D/import graph, 167 module order/898 exports, old PWA/HTML golden saves and 200 battles, all daily/Conquest/B4/B5/B6a compiled acceptance, native Chromium dual-tab, PWA SW offline and real WebGL mobile. Do not claim Full CI SUCCESS until an exact latest HEAD run confirms all required jobs and final gate. Physical iPhone Safari low storage, background/foreground and actual old/new PWA handover remain untested, not silently waived.

## Boundaries and follow-up

- B6b cannot give strong idempotency for *intentional successive repeatable upgrades* without an owner-approved operation journal; each new click that satisfies current rules is a new purchase. It does ensure no acknowledgment without verified whole-state write, and an ambiguous after-primary write retires the writer until cold reopen.
- The normal published v140 old-cache PWA does not participate in Web Locks; no concurrent use with a newer client is safe until the owner-approved manual handover. No IndexedDB, timestamps or server authority were added.
- **Residual audit B6c:** feat one-time claims (`ui/views/feats.js`), raid start/selection state and lower-priority saved preferences remain to be classified/protected. Also verify no new paid action was introduced elsewhere. Any battle crash/refund policy requires separate product consent; do not infer one from B6b.
- **HARD HOLD:** no merge, release, root publish, version bump, PWA reinstall or site-data clearance without separate owner approval and full validation.
