# ARCH-02C-B6a — verified market purchases, energy refills and recycler

Date: 2026-11-21. Base `main=d749a9d72a47a13a26483f0674d0c7e9b5514591` after owner-approved B5b PR #229 merge. **B6a is an implementation candidate, not merged or published.** Production root files, v140 version, the existing v1 save schema/key, historic golden data, balance, loot and RNG remain unchanged. B6b hero upgrades/crafting and unrelated personal settings are **not included**.

## Audit: origin operation, not just its quest increment

| Operation | Existing risk | B6a verified transaction |
| --- | --- | --- |
| Standard post/sietch/chron/ring shop `data-buy` | Currency debit, daily stock, `quest('shop')`, shard unlock/conversion or item grant mutated live `S` before unchecked `persist()`; toast preceded commit | Resolve current offer and stock inside detached `loadSave.writer.transact`, deduct, update stock + quest, grant item/shards; defer shard hooks with `giveRewards.presentationHooks`; only show receipt after verified checkpoint |
| Shop render and daily buy limits | `shopLeft()` invoked mutating `buysToday()` simply by displaying an old-day shop | Read-only stock projection; daily counter resets only on a committed purchase, preserving old v1 fields and todayKey rules |
| Fragment shop `data-fbuy` | Teeth debit, inventory credit and shop quest all changed before unchecked `persist()` | Revalidate cost and funds inside one transaction; no optimistic toast or quest increment on failure |
| Water/candle refills `doRefill()` | Crystals, energy, timestamp (water), daily count updated before unchecked `persist()` and toast | Recompute daily cap, escalating price and funds inside one transaction; write debit + energy + timer/count together; unknown refill kind rejected |
| Recycler `data-ixdo` | `scrapCommit` modifies items, artifact/carry before unchecked `persist()`; success toast | Revalidate exact captured basket against protected stock under writer lease, debit and output in one verified checkpoint; keep confirmation modal on storage failure |
| Recycler stock locks `data-ixlock` | Lock preference and resulting reservation changed before unchecked `persist()` | Verify saved lock mutation before rerender; forged unknown stock lock rejected |

Every gated path returns without falling through to the old unchecked branch on quota, SecurityError, uncertain write or lease loss. Historic ungated branches remain solely so C-B0 forensic baseline can still inspect v138 unsafe behavior; ordinary production boot always enables the writer gate. B6a does **not** add a new named export/import edge or change frozen `ui/views/conq.js`.

## Required acceptance: actual bundled PWA and standalone HTML

`dev/tests/ci/arch02c-b6a-market-recycler-acceptance.mjs` is required in the Fast Web Locks workflow and Full Validate, run twice per workflow (PWA + `dist/artifact.html`):

- **B601–B606**: market debit/receipt/quest and daily stock, sold-out replay, read-only old-day view + next-day commit, post-commit shard conversion, failed-backup hook rollback, uncertain primary write followed by cold boot.
- **B607–B608**: fragment item plus teeth + quest atomicity; backup quota cannot leak a fragment or quest progress.
- **B609–B612**: water and candle refills, daily cap, invalid kind, backup quota rollbacks with no optimistic success.
- **B613–B616**: recycler stock/carry/output commit, quota preserving confirmation, stale basket rejection and writer-lease retirement refusing purchases/refills/recycle.

Validation requirements beyond these focused cases: strict ARCH-01D/import gate, unchanged 898 named ESM exports, 167 module order, PWA/HTML golden saves/200 battles/meta/41 screens, native Chromium writer lifecycle and full CI gate success on exact final PR HEAD. Physical iPhone Safari storage-pressure, tab handover, failed and interrupted transactions remain **OPEN**. Do not treat simulated VM/Web Locks as real Safari proof.

## Unchanged boundaries and next slices

- Daily purchases are intentionally repeatable until their original limit; fragments and refills are intentionally repeatable actions with a fresh verified debit per click. This change prevents **unacknowledged** grants; it does not invent one-time tokens for repeatable purchases or a trusted offline clock.
- Writer lease coordinates cooperating new clients only. A cached v140 PWA remains an uncooperative writer, so do not run it alongside newer clients. No IndexedDB or v1 schema migration is introduced. An old external backup and complete-origin eviction cannot be handled by local checkpoint alone.
- **B6b**: hero level/star/skill/gear/relic/ultimate and part/craft-all purchases with quest counters and deferred celebrations. **B6c, if needed**: lower-priority paid/one-time flows identified in the final residual writer audit. Review one group per PR, then acceptance before owner-authorized merge or release.
- **NO RELEASE / PWA HOLD:** no version bump, no root deploy, no reinstall, no clearing site data. Only the owner can separately approve merge and publication. Manual v140 export/handoff rules from Issue #199 still apply.
