# ARCH-02D-B4b1e — manual verified Conquest history retention

**Date:** 2026-11-22. Base `main=3b1a90b8070f7d8e764d5140fb0a801bc3331f15`. Post-merge #245 [CI #44996807237](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44996807237) **SUCCESS**; GitHub Pages auto build #44996806608 SUCCESS. No explicit PWA publish; last approved packaged PWA **v141**.

## Exact scope

Add **manual, opt-in** oldest-first historical Conquest retention to the existing `Профиль → Экспорт сохранения → Архив Conquest` overlay; **not** a timer/automatic quota reaction, and **not** a new v1 save format. Player must independently download the B4b1d offline history file and use the native file chooser to re-select it, request an explicit number of **oldest** archived weeks to remove, tick an independent-custody acknowledgement, type `УДАЛИТЬ`, then click a **separate final confirm**. No default number of weeks, minimum **four most recent** archived weeks always retained, current active run always retained, no removal if at most four previous weeks exist.

The file's complete SHA-256 manifest is independently revalidated; all current archived weeks must be present and byte-identical in the selected file, without conflicting, duplicate, malformed or nested records. Require `sourceWeek` equal the current active week: an older file after advancing to a new week cannot justify removal. Reject file too large (>8,000,000 bytes) before reading. No archive deletion before the file is actually re-selected, all guards pass and both explicit approvals are recorded.

Read only the byte-verified `dune-goh-v1` under the native Web Locks writer. Only `candidate.conq.weekArchive` is modified (remove the explicitly selected N *oldest* records), preserving its existing order for remaining entries; all other keys including current Conquest run/award tokens, heroes and account balances remain unchanged. Use existing `loadSave.writer.commit` for exact expected-primary CAS, previous-primary backup write, verified readback and forced cold reload. Reject stale session, background RAM drift (requires **additional** explicit approval), quota and uncertain writes. Never silently resume or retry a failed removal.

## Recovery, quota and consent limits

- Original complete historical weeks remain in the external file and in **one local predecessor backup immediately after the operation**; the next ordinary verified game write may overwrite that predecessor, leaving the external file as the only remaining history recovery source.
- A browser download or file chooser re-read **does not prove** long-term off-device custody. SHA-256 is accidental-corruption detection, **not** an account/identity signature. The player must explicitly attest external custody. If the file is lost, removed weeks may be permanently unavailable.
- Estimated JSON UTF-8 byte difference is diagnostic only. `localStorage` quota is implementation-defined. The initial backup will still contain the full old history, and immediate actual space gain is **not guaranteed**. If quota prevents even the backup staging, abort without modifying the prior primary.
- Restoring removed weeks uses unchanged **B4b1d** additive archive import with SHA-256, explicit confirmation and verified backup. Archived records are never reward authorizers. Clearing the site or evicted origin may lose account progress; always retain a separate *full v1 save file* in addition to the archival history file.
- No server time, network dependence, new IndexedDB store, balance or RNG change. Keep entire non-Conquest account progress and legacy saves compatible. **No automatic deletion or pruning policy.**

## Verification

- Acceptance M01–M12 compiled PWA/HTML × UTC/Amsterdam/Los_Angeles: absent file, no count, too-few weeks, last-four retention, incomplete/wrong source-week file, malformed/hash denial, explicit attestation + typed phrase, independent final approval, transactional backup/checkpoint and cold restart, additive reimport and retained claim flags, double-submit denial, quota/uncertainty, stolen writer, stale primary and unrelated progress invariants.
- Real Chromium: native archive download, File input selection, 2-step deletion with actual file and reimport after cold reload for PWA and standalone.
- Full existing H01–H10, F01–F10, B425–B431, ARCH-02C, Golden 200/41 screens, strict ABI, Web Locks, WebGL and offline CI. **Do not weaken gates, update Golden, change root PWA, `sw.js` or `dev/version.json`.** Draft PR until exact-head Fast+Full SUCCESS and separate owner approval. Do not publish v142 without release approval.

## Open product decision

Minimum four recent archived weeks is an intentionally conservative fixed safety floor, not an automatic retention period, and can be changed only through explicit review. For a real mobile release, owner should manually test Safari file custody and restoration with a separate full-save backup. This feature does **not** create a trustworthy cloud backup or guarantee historical recovery after device loss.
