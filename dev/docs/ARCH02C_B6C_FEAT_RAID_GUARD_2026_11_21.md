# ARCH-02C-B6c — verified feat claims and raid session creation

Date: 2026-11-21. **Stacked on B6b Draft PR #231**, exact parent `0a1b45f57ea0f20a58cdd7262af320dbdf21db92` (itself stacked after B6a #230). **No merge/release/publish is authorized.** Both earlier drafts must be separately reviewed and approved in order before promotion.

## Residual critical source audit

After B4 battle/Conquest/Trials, B5 daily/calendar, B6a shops/refills/recycler and B6b level/star/skill/gear/craft, source grep still finds two notable saved-operation families not yet covered:

| Operation | Prior unsafe boundary | B6c stage |
| --- | --- | --- |
| `ui/views/feats.js:featClaim` | `giveRewards()`, cosmetic unlocks and the one-time `S.feats[id]` tier flag modified live `S` before ignored `persist()`; reward modal unconditionally shown | Check metric, exact next tier and claim eligibility inside detached writer state; credits, title/avatar/frame unlocks and tier flag committed together. Use `giveRewards.presentationHooks` for delayed presentation. No reward window until confirmed checkpoint. |
| `ui/events.js:data-raidstart` | New raid HP/tier and cleared team selection changed live before ignored `persist()`; failed storage could show a different active raid from durable bytes | One verified snapshot for raid tier, max/starting HP, log/used and reset `raidPick`. Preserve existing intentional restart semantics, but do not show a new raid after quota/denial/uncertainty. |

Other remaining `persist()` sites in `ui/events.js`, `ui/overlays/battle-settings.js` and squad selection are saved squad/leader/profile/toggle preferences, **not a debit, one-time grant or claim**. They remain lower priority and should not be inaccurately described as verified B6c operations. `ui/overlays/squad-select.js` legacy Conquest charged entry exists solely for B0 ungated characterization; mandatory-gated production entry was protected in B4. B4 raid completion payout is already verified. This B6c **does not** decide recovery/refund for an abandoned raid or campaign attempt; that requires an explicit product decision and separate acceptance.

## Required B637–B646 acceptance

New `dev/tests/ci/arch02c-b6c-feat-raid-acceptance.mjs` must run on both built PWA and standalone HTML in Fast and Full CI:

- B637–B638: tier-1 exact crystal credit and claim token commit; replay after next goal remains unmet does zero writes.
- B639–B641: backup quota, primary SecurityError and primary-write-then-throw uncertain/cold boot; no double payout or optimistic reward modal.
- B642–B643: a higher-tier cosmetic avatar unlock, seal/crystal reward and tier marker committed atomically; failed quota leaves all previous profile entitlements intact.
- B644–B645: raid session tier/HP/team reset one committed write; failed restart cannot wipe prior saved HP/used roster.
- B646: retired writer lease prevents both feat grant and raid creation, zero legacy fallback.

All 10 tests must pass per artifact **in addition** to B6a 16×2, B6b 20×2 and B4/B5 suites. Local strict architecture/167 ESM order/898 named exports, unchanged 200-battle/meta/v1 saves and full final remote gate are mandatory. Physical iPhone Safari/PWA with limited storage, cross-tab lifecycle and actual v140 import/reinstall remain **OPEN**, not proved by simulated tests.

## No-go and handoff

- Save remains `dune-goh-v1`, v1 JSON, with writer/backup sidecar. No balance, RNG, version, root asset, `conq.js`, golden or IndexedDB changes. The body of `featClaim` in the ungated historical harness remains to characterize old v138 forensics; no gated fallback is allowed.
- The owner must separately authorize merge of #230, then #231 (after retarget/rechecks), then this B6c PR (after retarget/rechecks). No automatic main mutation or publish.
- Old published v140 ignores Web Locks; do **not** reinstall/remove the PWA or clear local data until the explicit owner-approved verified export-first handoff and message «МОЖНО ПЕРЕУСТАНАВЛИВАТЬ PWA».
