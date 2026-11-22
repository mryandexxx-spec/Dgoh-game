# ARCH-02D-B4b2 — per-day Trials and shop entitlement preservation

**2026-11-22.** Base: `main=8c6be2c1828255aa5961a5915832387d770541c6`, after merged #247. **Candidate; no PWA publication**. Next planned stage after green merge: **ARCH-02-FINAL**, not another speculative substage.

## Confirmed defect and bounded fix

The original `trialRunsToday()` / `buysToday()` reset the respective `{d,n}` on **any** device day mismatch. A forward-day operation followed by a backward clock correction re-enabled spent Trials (three per type per day) and shop stock, even with a verified writer. Both the Trial payout and shop charge already use writer transactions; the vulnerability was their date-dependent candidate logic.

Keep the existing v1 `dune-goh-v1` fields and named exports. Add an **optional** `days` map to each existing ledger, storing only inactive days with **nonempty** counters. `d,n` remain the single active day; swapping to another day moves the current spent counts to history and restores exact counters if that day was seen previously. No wholesale reset or automatic pruning. Read-only `trialLeft` / `shopLeft` consult the correct date without switching the persisted active ledger. Never treat archived day history as an independent reward or purchase authorization: the existing verified transaction remains the only grant/debit path. Both ledgers use a single shared internal accessor on the existing `todayKey` export to avoid ESM graph/export changes.

Malformed nested or ambiguous history is **fail closed** (attempts/limited stock unavailable), and v1 save validation refuses invalid optional history without repairing or deleting raw bytes. Existing full-save JSON import/export and verified backup retain the exact optional map. A Trial battle crossing a date boundary checks today's remaining attempts again before awarding.

### Fairness and data boundaries

This is a *replay-prevention and lossless account-history guard*, **not trusted time or anti-cheat**. A fabricated never-used future local day can still earn that day's allowed entitlements. On a legitimate newly encountered day, the existing rates and stock/attempt caps remain unchanged, including timezone and DST local-date semantics. An incorrect far-future day does **not permanently deny** an honest user a return to previously unused calendar days. No resources are clawed back, no server/network is required and the previously earned offline Water/Candles/Resolve/Stamina remain untouched.

The per-day spent history can grow slowly over years, but no silent retention cap is permitted: verified writes fail closed on storage quota, preserving the predecessor primary/backup. Revisit storage format only on a reproducible P0/P1, not merely theoretical pressure.

### Verification

- Existing B411–B417 baseline expectations for Trials and shop are updated from known vulnerabilities to enforced rollback retention. Conquest and daily quest behaviors otherwise unchanged.
- New T01–T09 check legacy v1, read-only day views, verified Trial payout + exact predecessor backup, actual paid shop purchase + no repeat debit, consecutive day histories, invalid map fail-closed, quota, write-then-throw uncertainty and Web Locks loss. Both compiled PWA/standalone × UTC/Europe/Amsterdam/America/Los_Angeles = **54 new executions** plus old B414/B415.
- Both mandatory Fast and Full pipelines retain Golden 200 battles / 41 screens, strict exports/AST, WebGL and offline checks. No root `app.js`, `sw.js`, `dev/version.json`, Golden fixture or PWA bundle changes.

**Merge gate:** exact final PR SHA Fast + Full SUCCESS and no critical regressions. **Do not publish v142** automatically. Real iPhone Safari/system-date manipulation remains manual acceptance in ARCH-02-FINAL.
