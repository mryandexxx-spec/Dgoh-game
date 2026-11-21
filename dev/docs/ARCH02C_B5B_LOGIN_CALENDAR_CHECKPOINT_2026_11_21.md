# ARCH-02C-B5b — verified login calendar/month rollover

Date: 2026-11-21. Base `main=4c794f50e1e9afcf660262ba8d3e4b2a3793a11b` after B5a PR #228 merge (Fast #44834416248 SUCCESS, Full #44834416157 SUCCESS). **B5b: candidate PR, not merged, not published.** The frozen `dev/src/ui/views/conq.js`, original save v1 fields, 1001 imports / 167 ESM / 898 exports, golden and RNG balance remain unchanged.

## Source audit and risk matrix

Reviewed `dev/CHANGES_STATUS.md`, `dev/ARCHITECTURE.md`, ARCH-02C B1–B4 and B5a checkpoints, `ui/overlays/calendar.js`, `ui/views/daily.js`, `logic/daily.js`, `logic/rewards.js`, `core/save.js`, `ui/events.js` and Fast/Full workflows.

| Path | Preconditions / mutation | Failure | Remedy / disposition |
| --- | --- | --- | --- |
| `loginState()` read path | `login.m`, `n`, `last` | Rendering new month mutates live `S` before checkpoint | **B5b:** projection for mandatory-gated sessions; no live/durable changes until claim |
| `claimLogin()` | Current month and day, `n < monthDays()`, last date not today; grant `loginReward(n+1)` | Previously incremented `n`, set `last`, distributed currencies and shards before unchecked `persist()` | **B5b:** stage detached `S`, revalidate month/day/sequence, commit month+token+grant together via `loadSave.writer.transact` |
| `openCalendar()` / `data-calclaim` | One visible next-day button, account local clock | A stale button from old day/month may claim today's new period | **B5b:** render snapshot `{day,month,n,can}` on existing function property, no DOM change; reject stale or already consumed |
| `loginCan()` / period reset | Historical `m` string with unpadded month, `last` date string | Clock rollback to past month or earlier day restores eligibility | **B5b:** compare parsed numeric month ordinals, reject future save month and future last-claim date; do not change v1 shape |
| `loginReward()` / `grantShards()` | Day-specific rewards, hero of month, 7★ ring conversion | Shard unlock or conversion toast before failed checkpoint | **B5b:** pass existing `giveRewards.presentationHooks` to writer, flush only after confirmed commit |
| `quest('login')` / daily counters | login daily quest progress updated by game lifecycle | Must not introduce nested persist outside outer B4 transaction | Existing `quest()` unchanged; audit producer with remaining B6 context |
| Other quest producers | `events.js` skill/craft/shop/lvl/fragment purchase; battle and simulation progress | Some still mutate resource cost, quest progress and state before unchecked `persist` | **B6 / follow-up** protect the entire originating purchase/upgrade transaction, not merely the quest counter |
| Client clock / external v1 backup | Offline `Date` and restore/export | Time travel into a new future month and rollback of whole storage cannot be proven server-side | **Known limitation:** no trusted time or durable journal in v1; avoid falsely promising anti-cheat |

## Implementation

`loginState()` preserves ungated v138 forensic behavior only when mandatory writer gate was never enabled. In production it projects a new month read-only, without resetting `S.login`. `loginCan()` includes numeric month and last-date rollback checks plus integer valid sequence bounds; backwards month never enables a reward. `openCalendar()` stamps the existing `claimLogin.rendered` UI function property (no HTML attribute or golden update). The gated click fails closed on mismatched current date, month, sequence or calendar eligibility; all mutations are inside `loadSave.writer.transact(stage, giveRewards.presentationHooks)`. The single candidate contains the month reset (if necessary), `login.n+1`, `login.last`, resources and shards. No toast or rerender happens before checked commit, no automatic reroll/retry after ambiguous write, and writer lease loss blocks all writes. Core, architecture boundaries and named exports remain unchanged.

## Acceptance and CI

New `dev/tests/ci/arch02c-b5b-login-calendar-acceptance.mjs` contains **B515–B532**, required on both compiled `dist/pwa/index.html` and `dist/artifact.html` in Fast + Full Validate:
- one successful day-one verified token/reward/checkpoint; repeated same day; stale modal after midnight;
- read-only month rollover preview, atomic month reset and next reward;
- backwards month and same-month future claim date;
- backup QuotaExceededError and primary SecurityError; no optimistic presentation;
- uncertain after-primary write and cold boot no replay; regular cold boot idempotency; loss of Web Locks;
- shard conversion presentation hook rollback on failed commit and exactly once after success;
- exact original crystal reward day 10, final-day shards+Water of Life, completed-month cap.

Existing first-boot v1 golden expects empty `login.m` to be initialized during startup. `loginCan.prepareBoot()` is invoked from `core/boot.js` before its already verified `persist()` to maintain that exact historical snapshot WITHOUT changing goldens or introducing a new ESM edge; pre-existing nonempty month records are not reset by the boot helper. B532 proves the v1 bootstrap month is durable.

Old B0 historical ungated checks and B5a acceptance remain required; no updated golden, release, PWA reinstall, pricing or RNG change. Final merge requires owner approval and **both CI SUCCESS on exact PR HEAD**. Physical Safari/offline/time shift test remains open.

## Limits and next step

The client has no trusted time source; a player who spoofs a future local date **before** a first legitimate claim can still accelerate the calendar. A save v1 without a server timestamp/claim ledger cannot fully prevent deliberate clock manipulation or restoration of an older external backup. B5b only guarantees one verified commit per detected day, monotonic in-save month and last-day checks, and fail-closed under storage/lease errors. Work on quest progress from non-B4 purchases, levelling and crafting should be grouped with B6 economic debit audits to preserve the atomic origin transaction rather than wrapping `quest()` alone.
