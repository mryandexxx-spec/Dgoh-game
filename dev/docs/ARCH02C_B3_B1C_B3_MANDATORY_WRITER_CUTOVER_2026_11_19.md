# ARCH-02C-B3-B1c-B3 — mandatory default Web Locks boot (DRAFT, NO RELEASE)

Date: 2026-11-19. Parent [#199](https://github.com/mryandexxx-spec/Dgoh-game/issues/199).
Verified base: main **d11b4a980644bc44f50de1be3a0aac380f1fc054**, merged PR #216.
Post-merge [CI #44591177945](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44591177945): SUCCESS.
Published/installed client v140 remains entirely unchanged. No v141, no deploy.

## Source reconstruction

- Frozen composition root dev/src/boot.js still calls the existing named export start through hot.ready or directly. Its bytes must not change; main tree blob is 36844ea06b11eefdba7cfb526ce9525415d1fd4a.
- The first AST action of core/boot.js start(data) remains **set_S(initialSave(data))**. We keep its exact text. Existing 898 named ESM exports must not increase, disappear or reorder.
- Before B3, initialSave chose writer-preview only when a mutable window flag was explicitly set. Otherwise it read primary and started legacy gameplay, which wrote via unchecked persist0().
- Before B3, B3-B2 protected writer.commit, writer.recover, B2 import UI and gated public checkpoint commits already existed; B2 lock-loss lifecycle fenced surprise native settlement, duplicate start, pagehide, BFCache and storage interference.
- Old cached v140 does NOT cooperate with Web Locks and can overwrite localStorage from another instance. New clients cannot stop it. Automatic IndexedDB migration and localStorage clearing are not authorized.

## Changed production startup contract

1. **Unconditional default dispatch.** initialSave now calls startWithWriter for every ordinary start, regardless of preview flags. The first set_S receives undefined while waiting. Under-lease private reentry is the ONLY route to loadSave(true), newSave(), metaFill, migrations, persist, render and gameplay timers. A hot-injected data.save is refused before any under-lease read.
2. **Read-free visible waiting state.** UI-owned showWriterWaiting displays “Проверяем защищённый запуск” without inspecting progress. A capture-phase input guard is installed before acquiring. Native lock refusal/busy/error replaces waiting with the blocking diagnostic UI; only a previously verified owner is offered verified export. No reset, no automatic replay or reload.
3. **Foreground-only acquisition.** Startup from an already hidden document refuses with background-suspended, and a hidden result after acquisition is retired. This prevents a background-loaded PWA from retaining an unnoticed writer. Pagehide, visibilitychange, freeze, resume, pageshow/BFCache, storage event, unexpected lock-request settlement and duplicate callback retain the B1b/B2 one-way invalidation semantics.
4. **Protected transfers are not bypassed.** Direct public checkpoint.commit/recover reject writer-required once the mandatory gate is armed. Import commits under the active gameplay lease, then invalidates the old JS heap. Manual backup restoration has a separate recovery-only lease, two explicit UI actions and a fresh-reload requirement; never silently auto-restores.
5. **No version/root/SW/storage schema update.** dev/src/boot.js, storage primary dune-goh-v1, backup format, PWA root, version, runtime ESM export count, golden fixtures and game economy remain unchanged. Existing legacy low-level persist0 primitive remains for historical off-entrypoint tests, but no normal bootstrap calls it with an unarmed writer gate; this residual surface is not a remotely enforceable defense against uncooperative JS.

## Verification matrix (mandatory)

| Case | Requirement | Evidence |
| --- | --- | --- |
| No preview flag + valid save | Native lease before primary read, write, render and timer | B301 plus native AUTOMATIC Chromium |
| No Web Locks | No save reads, no RAM, no writes, visible refusal | B302/B309 plus native override |
| Asynchronous pending lock | No RAM or storage access while acquiring; visible waiting | B303; real DOM automatic boot |
| Two independent writers | Secondary blocked or released on background, never concurrent ownership | B304 and native real tabs |
| Double host ready | Live S preserved; no repeat migrations/timers | B305 plus historical R01 |
| Manual/native lease loss | Immediate input block, no stale persist or lock reacquire | B306 plus historical R02-R07 |
| pagehide/BFCache/visibility/freeze | One-way release; fresh JS heap reads committed primary | B307 plus existing E01-E21 |
| Native lock rejection | Unsupported/unavailable fail closed | B308; C01/C02/C08 |
| Corrupt, unsupported or missing primary | No automatic reset, no unsafe recover | B310 and existing B1/B2 recovery |
| Injected host snapshot | Never replace newly loaded verified storage | B311; C05 |
| Direct checkpoint APIs | No bypass after gate | B312; C09 |
| Protected import | Requires held lease and explicit confirmation; old RAM invalidated | B313 and existing X/U native proof |
| Preview/legacy flag tamper | Cannot reenable unsafe boot | B314 |
| Existing goldens/strict PWA | 200 battles, 41 screens, WebGL/offline and architecture 898 | Full exact-head CI |

New required tests: dev/tests/ci/arch02c-b3-b1c-b3-mandatory-boot-acceptance.mjs (14 cases on each built PWA and HTML), and dev/tests/ci/arch02c-b3-b1c-b3-native-auto-chromium.mjs (real unflagged automatic PWA + background handoff + no-API denial). Existing native two-page and protected recovery suites now call the ordinary entrypoint, not writer-preview. Workflow .github/workflows/validate-pwa.yml retains all earlier steps. Do not suppress unexpected CI failures; audit and fix exact head.

## STOP conditions and v140 handoff

- This is **a Draft PR, not a release authorization**. A green CI is necessary but insufficient. The current user's PWA **v140 must not be touched now**.
- A v140 client, offline old SW, an older standalone icon or another device writing the same origin is uncooperative. No Web Lock, storage event or lock name can fence it. Before any user migration, verify user-exported v1 code and safe storage outside the installed PWA. The owner alone must shut down all old clients.
- **Do not assume an export exists.** A current v140 saved code must be independently checked before removal. If export, validation or external safekeeping fails, STOP; never clear app/site data.
- After further owner-approved release review: test exact v141 install vs offline old SW, protected import of the verified code, cold-reload roster/currency/campaign preservation, two-tab no-concurrent-save and backup health. No invisible downgrade/auto-reset. No automatic IndexedDB migration.
- iOS Safari / installed standalone PWA: physical device required. Verify native navigator.locks, standalone launch, background/foreground, pagehide, BFCache, offline resume, denied second instance, locked import/recovery, storage/quota behavior, copied export and another full cold reload. Chromium device emulation is **not** iPhone evidence.
- Real iPhone testing must use an **independent test origin and disposable test save** until the owner's v140 external export is verified. Do not ask the user to uninstall, update or reset their current live PWA merely to run these tests.
- Work on reward/purchase settlement B4–B6 remains separate from lease orchestration and may restrict final durability claims.

**Hard hold:** no merge without separate owner approval. No v141 tag, PWA root/SW deployment, uninstall, reinstall, data clearing, or publication. The special reinstall authorization phrase is withheld until all handoff and device prerequisites are met and the owner explicitly authorizes the release.
