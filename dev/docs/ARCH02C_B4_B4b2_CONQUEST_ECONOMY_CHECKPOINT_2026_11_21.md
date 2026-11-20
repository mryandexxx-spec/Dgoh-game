# ARCH-02C-B4-B4b2 — transaction-safe Conquest caches, shops, consumables and recharge

Date: 2026-11-21. **Stacked draft** upon B4b1 PR #226 (base HEAD `f25dacc74cb1d390e8791fa3d659e1f97308a182`), which itself depends on draft B4a PR #225. No merge, publication, PWA version change, save migration or golden update.

## Scope and frozen architecture

Existing `dev/src/ui/views/conq.js` remains **byte-identical** (blob SHA `e93d51583d00ff17762c98f3cb380773bd8b053c` inherited from #225/#226), and its legacy `cqClick()` handler is intercepted only in writer-gated production sessions. B4b2 adds `cqVerifiedEconomyClick()` to the existing `ui/events.js` dispatch *before* frozen Conquest logic. No new ESM import, module, exported name, view mutation or source-chain reorder. Historical non-gated B0 test harness continues to reach the legacy method.

The already accepted, lazily dereferenced `cq.claimRules()` bridge expands to existing logic helpers and a **read-only `cqShopOffer()`** mirror of the frozen view's week-seeded shop offers. It reproduces keys, price, deterministic item order and sold status without adding a new ESM edge. CI explicitly compares every offer's `key`, `price` and `sold` against frozen `cqShopItems()`; this is an anti-drift contract. `CQ_MED = 50`, `CQ_RF.amt = 50` and `REFILL_MAX = 15` are currently literal values in the bridge due to pinned named import lists. CI also checks these constants against the original `conquest-data.js` and `economy.js` values; any balance change must explicitly review both locations rather than silently skewing them.

## Operation risk and transaction plan

| Legacy click | Existing unsafe mutation | B4b2 transaction |
| --- | --- | --- |
| `cqnode` on a new cache | Mark cache opened and route after setting selected node; unchecked persist | Revalidate node/current week/route; one verified commit for `C.sel`, `C.done`, `C.route`; normal non-cache selection remains presentation-local with no extra write |
| `cqsec` | Current sector and selected node mutated before unchecked persist | Validate unlocked range and update both in one verified commit |
| `cqbuy` | Pay `cry`/`sol`, mark one-time cache stock, grant item/shards, then unchecked persist and toast | Validate node, weekly stock, deterministic offer and cash inside detached candidate; apply payment/stock/reward atomically; toast only after success |
| `cqjbuy` | Pay trophies, buy medicine or rare/legendary disk and mark weekly sold token before unchecked persist | Revalidate price and deterministic offer, account trophies and disk ownership inside candidate; debit, stock, disk/feat or medkit count in same commit |
| `cqmed` | Consume medkit and alter a hero's stamina before unchecked persist | Validate unlocked hero, stock and stamina; consume and heal in one commit |
| `cqrf` | Spend crystals and increment daily refill plus Conquest energy before unchecked persist | Recompute today's refill cost/limit in candidate; debit, daily counter and +50 energy all committed together |
| `cqdon`, `cqdoff` | Equip disk or charge 25 Resolve for unequip before unchecked persist | Recheck disk ownership/caps, available energy and equip state within candidate; apply in one commit |

Any `giveRewards()` character unlock/conversion presentation is deferred through the existing `giveRewards.presentationHooks` contract until the B1 backup-first verified checkpoint. The event handler snapshots `NOTES.length`, since feat notifications live *outside* `S`, and truncates the queue on denied, quota, SecurityError, uncertain, lost-lease or other failed transaction; the writer reverts the detached save snapshot. No UI success toast, discount, cache unlock or reroll is acknowledged on a failed/ambiguous checkpoint. The old unchecked `cqClick()` is never used as a fallback for a gated economic action.

`cqnode` taps of already completed/locked/non-cache nodes remain **local map selection** with no storage write, matching the legacy contract. The writer validates access before such a selection can be applied; a lost lease cannot mutate it. The post-refill read-only `cqClick({cqres:'1'})` displays the existing frozen refill modal without invoking the legacy payment case. Post-equip UI delegates only to `cqClick({cqdisks:'1'})` for the existing frozen disk dialog.

## Required B451–B472 acceptance

Tests are executed on **actual built PWA and standalone HTML artifact** by both the fast Web Locks workflow and full Validate. They cover:
- B451: exact stock, price, sold and week-seed parity with frozen `cqShopItems`;
- B452–B453: route unlock once and no second write;
- B454–B457: stash goods pay/stock/grant, stale replay, quota rollback and reward grant accounting;
- B458–B462: one/three medicine packs, disk sale + once-per-week ownership, replay and 8th-disk feat `NOTES` rollback on quota;
- B463–B466: applying a medkit, recharging energy, SecurityError abort and daily refill cap;
- B467–B470: energy-charged unequip, free equip, sector unlock cap and invalid/forged input;
- B471–B472: ambiguous after-write cold boot prevents double charge; native writer lease loss forbids all purchases.

No test or pinned golden may be weakened, skipped or auto-updated. Full CI + fast CI must both conclude **SUCCESS on the same PR HEAD** before proposing promotion. Tests are VM+Chromium automation, not physical iPhone Safari proof; owner should manually try cache store, energy modal, disk equip, failed/offline write, and cold reopen after an exported save in Safari.

## Remaining work and release gates

Conquest battle reward settlement remains covered by outer B4-B1; B4a stage/chest and B4b1 disk/node reward are separate stacked draft PRs. Future **B5** audits daily/quest/login claims, **B6** audits non-Conquest paid actions and upgrades. Do not assume this Conquest-specific change makes *all* game purchases safe. Merge order requires explicit owner approval, successful B4a into main, restack B4b1 with final checks, then restack B4b2 with final checks. No automatic deploy, release, save upgrade or PWA reinstall.
