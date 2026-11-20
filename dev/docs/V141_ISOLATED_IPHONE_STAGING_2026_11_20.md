# v141 physical iPhone acceptance — ISOLATED STAGING, NEVER LIVE v140

## Immutable candidate
- Candidate gameplay/source SHA (PR #217): `467fc0ab15049740a1fd1a307839ed584cd9f312`.
- This staging branch was forked from that SHA. The only staging-specific file is root `vercel.json`; **do not merge staging files into PR #217 or main**.
- `vercel.json` builds `dev/dist/pwa` from repository source with `npm ci && npm run build`. Compare resulting `app.js` and `sw.js` checksums with the PR #217 validated artifact if reproducible; report any drift. A deploy is NOT automatically a passed production release.
- A Vercel project has its own `*.vercel.app` origin, independent of the existing GitHub Pages origin, whereas a different `github.io` project path shares the same localStorage scope.
- **Never deploy this branch to the existing GitHub Pages production address.** No reset / clearing / migration of installed v140.

## Staging setup
1. Connect a **new, staging-only Vercel project** to `mryandexxx-spec/Dgoh-game` and deploy branch `staging/v141-iphone-safari-20261120`. Use root project directory and the root `vercel.json` to build the game. Do not connect/change any existing production deployment.
2. Confirm HTTPS hostname is `*.vercel.app` and **different origin** (scheme/hostname/port) from currently installed production. Copy and record the actual Vercel deployment URL; never invent one.
3. On iPhone Safari open the staging URL, with **disposable test progress** only; `navigator.locks?.request` must exist and cold game launch must show the mandatory single-writer gate.
4. Install **test staging PWA** only after confirming the new host and distinct home-screen identity. Ensure no risk of mistaking staging for the v140 installed app.
5. Test tab A owns writer; same-origin tab B cannot write; background/foreground, pagehide, BFCache, offline/cached service worker, cold start and visible refusal on lock denial.
6. Test disposable export/import: verify code in preview, exercise updated third explicit confirmation when RAM changes, and after writer retirement cold-reload. Check roster, solari, plast, campaign and existing backup.
7. Test denied storage/quota and corrupt-save manual recovery using disposable data; never use the live owner's v140 exported code in public staging. Keep logs or screenshots excluding any full save code.
8. Record iPhone model, iOS/Safari version, exact HTTPS staging URL, tested commit, test results and owner signoff on issue #219.

## Further release gates
- Owner already reported verified-storage export from v140 saved off-PWA, **but independent full-code validation and restore demonstration remain outstanding**; never copy private code into public issue/PR comments.
- Old v140 JavaScript, Safari tabs or offline service workers are non-cooperative with mandatory Web Locks and may still write same-origin primary.
- Even a successful physical iPhone staging run does not authorize main merge, publish, live PWA reinstall, site storage clearing or tag. Complete #219 gate A and B first, then obtain owner go/no-go.
- For Vercel project creation and deploy, Vercel connection is required; no URL is usable until the external provider has confirmed actual deployment.
