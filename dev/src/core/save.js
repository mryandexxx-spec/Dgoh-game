// core/save.js — строки 3151–3201 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { S, set_S } from './state.js';
import './format.js'; // порядок исполнения
import { CMAX, WMAX } from '../logic/economy.js';
import { CHARS } from '../data/chars.js';
import { MEM_MATS, SCRAP } from '../data/memory-scrap.js';

const SAVE_KEY = 'dune-goh-v1';

function newSave() {
  const roster = {};
  for (const c of CHARS) roster[c.id] = { shards: 0, stars: 0, lvl: 1, gear: 1 };
  Object.assign(roster.leto, { stars: 3 }); Object.assign(roster.paul, { stars: 3 });
  for (const id of ['jessica', 'duncan', 'gurney']) roster[id].stars = 2;
  return fillSave({ v: 1, water: WMAX(), waterTs: Date.now(), solari: 3000, plast: 3, roster, squad: ['leto', 'paul', 'jessica', 'duncan', 'gurney'], cleared: {} });
}
function fillSave(s) {
  s.candle ??= CMAX(); s.candleTs ??= Date.now(); s.rid ??= 0; s.crefills ??= { d: '', n: 0 }; s.buys ??= { d: '', n: {} }; s.campTab ??= 'L'; s.campCh ??= {}; s.shopTab ??= 'post';
  for (const c of CHARS) s.roster[c.id] ??= { shards: 0, stars: 0, lvl: 1, gear: 1 };
  if (!s.darkGift) { s.darkGift = 1; for (const id of ['trooper', 'rabban', 'piter']) s.roster[id].stars = Math.max(s.roster[id].stars || 0, 2); }
  s.squadD ??= ['rabban', 'piter', 'trooper']; s.squadC ??= (s.squad || []).slice();
  s.daily ??= { d: '', c: {}, got: {}, chest: false }; s.login ??= { m: '', n: 0, last: '' };
  s.folio ??= 10; s.seal ??= 0; s.wol ??= 0; s.seenDlg ??= {}; s.skipDlg ??= false; s.sealBuy ??= { d: '', n: 0 }; s.sealClaim ??= {};
  for (const id in s.roster) s.roster[id].sk ??= { basic: 1, special: 1, ult: 1, passive: 1, leader: 1 };
  // BH9.4 uses lazy storyEvents initialization on the first earned reward.
  // Keep untouched legacy saves byte-for-byte compatible with golden snapshots.
  s.cry ??= 200; s.cryClaim ??= {}; s.refills ??= { d: '', n: 0 };
  s.inv ??= {}; s.gearParts ??= {}; s.gearOwned ??= {}; for (const id in s.roster) s.roster[id].eq ??= [false, false, false, false, false, false];
  // Однократная миграция Голосов предков в Платы Икса. Старые уровни ДП не меняются.
  if (!s.memoryEconomyV2) { s.ix_plate = (s.ix_plate || 0) + (s.core || 0); s.core = 0; s.memoryEconomyV2 = 1; }
  for (const k of Object.keys(MEM_MATS)) s[k] ??= 0;
  s.scrapCarry ??= {}; s.scrapLocks ??= {};
  for (const k of Object.keys(SCRAP)) s.scrapCarry[k] ??= 0;
  s.core ??= 0; s.teeth ??= 0; s.raid ??= null; s.raidKills ??= []; s.journey ??= {}; s.journeys ??= { muaddib: s.journey, liet: {} }; s.jKey ??= 'muaddib'; s.jPicks ??= { muaddib: s.jPick || [], liet: [] }; s.raidPick ??= []; s.jPick ??= [];
  // BH9.9: idempotent new legend journey; never replace the old Muad'Dib progress.
  s.journeys.baron_legend ??= {};
  // v83: one-time retirement of legendary liet, no compensation; keep historical data reversible.
  if (!s.migrations) s.migrations = {};
  if (!s.migrations.retireLietV83) {
    s.retiredLiet ??= { hero: s.roster.liet || null, journey: s.journeys.liet || null };
    s.migrations.retireLietV83 = true;
  }
  delete s.roster.liet;
  delete s.journeys.liet;
  delete s.jPicks.liet;
  if (s.jKey === 'liet') s.jKey = 'muaddib';
  for (const name of ['squad', 'squadD', 'squadC', 'squadTr', 'raidPick', 'jPick', 'jPicks', 'squadByCamp', 'squadByNode']) {
    const prune = v => {
      if (Array.isArray(v)) return v.filter(id => id !== 'liet');
      if (v && typeof v === 'object') for (const k of Object.keys(v)) v[k] = prune(v[k]);
      return v;
    };
    if (s[name]) s[name] = prune(s[name]);
  }
  if (s.conq && typeof s.conq === 'object') {
    const pruneCq = o => {
      if (!o || typeof o !== 'object') return;
      for (const k in o) if (k === 'squad' && Array.isArray(o[k])) o[k] = o[k].filter(id => id !== 'liet');
      else if (o[k] && typeof o[k] === 'object') pruneCq(o[k]);
    };
    pruneCq(s.conq);
  }
  // J1: permanent difficulty unlocks survive the weekly S.conq reset.
  // Grandfather previously selected normal/hard to avoid revoking old access.
  s.cqUnlock ??= {};
  if (!s.migrations.jihadJ1) {
    const C = s.conq;
    if (C?.diff === 'normal' || C?.diff === 'hard') s.cqUnlock.easy ??= 'legacy';
    if (C?.diff === 'hard') s.cqUnlock.normal ??= 'legacy';
    // A finished fifth sector from before this update also counts.
    if (C?.done?.['4-11-0'] && (C.diff === 'easy' || C.diff === 'normal'))
      s.cqUnlock[C.diff] ??= C.wk || 'legacy';
    s.migrations.jihadJ1 = 1;
  }
  return s;
}
// ARCH-02B1: the only condition that permits newSave() is a confirmed null
// from Storage.getItem. Do not conflate missing, denied, invalid or newer data.
// Use permissive v1 optional-field handling; old snapshots remain byte-compatible.
const saveRecord = x => !!x && typeof x === 'object' && !Array.isArray(x);
const saveQuantity = x => typeof x === 'number' && Number.isFinite(x) && x >= 0;
function validSaveV1(s) {
  if (!saveRecord(s) || s.v !== 1 || !saveRecord(s.roster)) return false;
  for (const k of ['water', 'solari', 'plast']) if (!saveQuantity(s[k])) return false;
  for (const k of ['candle', 'cry', 'folio', 'seal', 'rid', 'wol', 'core', 'teeth'])
    if (k in s && !saveQuantity(s[k])) return false;
  for (const k of ['cleared', 'daily', 'login', 'conq', 'journey', 'journeys', 'migrations', 'inv', 'gearParts', 'gearOwned', 'cryClaim', 'sealClaim', 'refills', 'buys'])
    if (k in s && s[k] !== null && !saveRecord(s[k])) return false;
  for (const k of ['squad', 'squadD', 'squadC', 'raidPick', 'jPick'])
    if (k in s && !Array.isArray(s[k])) return false;
  // Live metaFill initializes squadTr as a map of trial squads, not an array.
  // Old migration code also tolerates an array; never reject game-written v1.
  if ('squadTr' in s && !saveRecord(s.squadTr) && !Array.isArray(s.squadTr)) return false;
  for (const hero of Object.values(s.roster)) {
    if (!saveRecord(hero)) return false;
    for (const k of ['shards', 'stars', 'lvl', 'gear']) if (k in hero && !saveQuantity(hero[k])) return false;
    if ('eq' in hero && (!Array.isArray(hero.eq) || hero.eq.length !== 6)) return false;
    if ('sk' in hero && !saveRecord(hero.sk)) return false;
  }
  return true;
}
function readSave() {
  let raw;
  try { raw = localStorage.getItem(SAVE_KEY); }
  catch (e) { return { status: 'unavailable', error: (e && e.name) || 'Error' }; }
  if (raw === null) return { status: 'missing' };
  let s;
  try { s = JSON.parse(raw); } catch (e) { return { status: 'corrupt', raw }; }
  if (!saveRecord(s) || !Object.prototype.hasOwnProperty.call(s, 'v'))
    return { status: 'invalid', raw };
  if (s.v !== 1) return { status: 'unsupported', raw };
  if (!validSaveV1(s)) return { status: 'invalid', raw };
  try {
    for (const c of CHARS) s.roster[c.id] ||= { shards: 0, stars: 0, lvl: 1, gear: 1 };
    const filled = fillSave(s); // parsed copy; never mutate raw storage bytes
    if (!validSaveV1(filled)) return { status: 'invalid', raw };
    return { status: 'ok', save: filled };
  } catch (e) { return { status: 'invalid', raw }; }
}
// Compatibility API for legacy golden, other callers and live runtime.
// boot explicitly requests typed result to avoid the old null -> newSave hazard.
function loadSave(details = false) {
  const outcome = readSave();
  return details ? outcome : outcome.status === 'ok' ? outcome.save : null;
}
let persistHook = null; // UI notifications; no core -> ui import
let persistErrorHook = null; // boot registers a separate blocking recovery UI
function saveWriteFailure(status, e) {
  const result = { ok: false, status, error: (e && e.name) || 'Error' };
  if (persistErrorHook) persistErrorHook(result);
  return result;
}
function persist0() {
  // ARCH-02C-B3-B1b: ONLY when an opt-in preboot writer gate is enabled.
  // A gate without a current exclusive lease must NEVER fall back to the
  // historical unchecked setItem (e.g. after pagehide or failed acquire).
  if (writerGateEnabled) {
    // B4: an inner mode-specific persist is a *deferred request* while the
    // outer battle settlement owns the single verified checkpoint.
    if (writerSettlementActive) return { ok: true, status: 'deferred' };
    return writerPersist();
  }
  let json;
  try {
    json = JSON.stringify(S);
    if (typeof json !== 'string') return saveWriteFailure('serialization');
  } catch (e) { return saveWriteFailure('serialization', e); }
  try { localStorage.setItem(SAVE_KEY, json); }
  catch (e) {
    const kind = e && e.name;
    return saveWriteFailure(kind === 'QuotaExceededError' ? 'quota' :
      kind === 'SecurityError' ? 'security' : 'write-failed', e);
  }
  return { ok: true, status: 'ok' };
}
let notePend = 0;
function persist() {
  const result = persist0(); // synchronous write; only UI hook is scheduled
  if (result.ok && result.status !== 'deferred' && !notePend) notePend = setTimeout(() => {
    notePend = 0; if (persistHook) persistHook();
  }, 60);
  return result;
}
const onPersist = (f, onError) => {
  if (f) persistHook = f;
  if (onError) persistErrorHook = onError;
};


// ARCH-02C-B1 opt-in verified checkpoint. NOT used by legacy persist(), boot
// or gameplay: until C-B3 owns the writer, a localStorage read/write pair is
// NOT cross-tab CAS and must never be advertised as an atomic transaction.
// The primary stays byte-compatible v1, so old exports and rollbacks can read
// it, but old writers still will NOT maintain this sidecar checkpoint.
const CHECKPOINT_KEY = SAVE_KEY + '.backup';
const CHECKPOINT_FORMAT = 1;

// Non-cryptographic accidental-corruption checksum over UTF-16 code units.
// Exact-byte readback is the commit acknowledgment; this is not an HMAC,
// fsync, defense against malicious edits or protection from origin eviction.
function checkpointChecksum(raw) {
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) h = Math.imul(h ^ raw.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16).padStart(8, '0');
}
function checkpointStorageRead(key) {
  try { return { ok: true, raw: localStorage.getItem(key) }; }
  catch (e) { return { ok: false, status: 'unavailable', error: (e && e.name) || 'Error' }; }
}
function checkpointStorageWrite(key, raw) {
  try { localStorage.setItem(key, raw); return { ok: true }; }
  catch (e) {
    const kind = e && e.name;
    return { ok: false, status: kind === 'QuotaExceededError' ? 'quota' :
      kind === 'SecurityError' ? 'security' : 'write-failed', error: kind || 'Error' };
  }
}
function checkpointRawStatus(raw) {
  if (raw === null) return { status: 'missing' };
  if (typeof raw !== 'string') return { status: 'invalid' };
  let save;
  try { save = JSON.parse(raw); }
  catch (e) { return { status: 'corrupt', raw }; }
  if (!saveRecord(save) || !Object.prototype.hasOwnProperty.call(save, 'v'))
    return { status: 'invalid', raw };
  if (save.v !== 1) return { status: 'unsupported', raw };
  if (!validSaveV1(save)) return { status: 'invalid', raw };
  return { status: 'ok', raw, save };
}
function inspectCheckpointPrimary() {
  const result = checkpointStorageRead(SAVE_KEY);
  return result.ok ? checkpointRawStatus(result.raw) : result;
}
function inspectCheckpointBackup() {
  const r = checkpointStorageRead(CHECKPOINT_KEY);
  if (!r.ok) return r;
  if (r.raw === null) return { status: 'missing' };
  let env;
  try { env = JSON.parse(r.raw); }
  catch (e) { return { status: 'corrupt', envelopeRaw: r.raw }; }
  if (!saveRecord(env) || env.format !== CHECKPOINT_FORMAT ||
      env.key !== SAVE_KEY || typeof env.raw !== 'string' ||
      typeof env.checksum !== 'string')
    return { status: 'invalid', envelopeRaw: r.raw };
  if (checkpointChecksum(env.raw) !== env.checksum)
    return { status: 'checksum-mismatch', envelopeRaw: r.raw };
  const checked = checkpointRawStatus(env.raw);
  if (checked.status !== 'ok')
    return { status: 'invalid', envelopeRaw: r.raw, reason: checked.status };
  return { status: 'ok', envelopeRaw: r.raw, raw: env.raw, save: checked.save,
    checksum: env.checksum };
}
// Pure inspection. A bad or missing primary with an intact backup is
// explicitly recoverable, never silently restored or treated as a new save.
// Unsupported versions deliberately require external/user review.
function inspectCheckpoint() {
  const primary = inspectCheckpointPrimary(), backup = inspectCheckpointBackup();
  const status = primary.status === 'ok' ? 'ok' :
    primary.status === 'unsupported' ? 'unsupported' :
    primary.status === 'unavailable' ? 'unavailable' :
    backup.status === 'ok' && ['missing', 'corrupt', 'invalid'].includes(primary.status)
      ? 'recoverable' : 'blocked';
  return { status, primary, backup };
}
function checkpointFailure(status, stage, error) {
  return { ok: false, status, stage, ...(error ? { error } : {}) };
}
function checkpointMatchesExpected(current, expectedRaw) {
  return expectedRaw === null ? current.status === 'missing' :
    current.status === 'ok' && current.raw === expectedRaw;
}
function checkpointCandidate(candidate) {
  let raw, save;
  try {
    if (!saveRecord(candidate)) return { status: 'invalid' };
    raw = JSON.stringify(candidate);
    if (typeof raw !== 'string') return { status: 'serialization' };
    save = JSON.parse(raw);
  } catch (e) { return { status: 'serialization', error: (e && e.name) || 'Error' }; }
  return validSaveV1(save) ? { status: 'ok', raw, save } : { status: 'invalid' };
}

// A single opt-in prepared snapshot commit, with no mutations to live S.
// expectedRaw is the EXACT raw primary observed by the caller (null for a
// confirmed empty store); omission is rejected rather than guessed.
// Staging and last-write-wins safety are deferred to C-B3/C-B4.
function commitCheckpoint({ expectedRaw, candidate } = {}) {
  if (!(expectedRaw === null || typeof expectedRaw === 'string'))
    return checkpointFailure('invalid-expected', 'preflight');
  const prepared = checkpointCandidate(candidate);
  if (prepared.status !== 'ok')
    return checkpointFailure(prepared.status, 'candidate', prepared.error);
  const primary = inspectCheckpointPrimary();
  if (primary.status === 'unavailable')
    return checkpointFailure('unavailable', 'primary-read', primary.error);
  if (!checkpointMatchesExpected(primary, expectedRaw))
    return checkpointFailure(primary.status === 'ok' || primary.status === 'missing' ?
      'conflict' : primary.status, 'primary-preflight');
  const backup = inspectCheckpointBackup();
  if (backup.status === 'unavailable')
    return checkpointFailure('unavailable', 'backup-read', backup.error);
  if (backup.status !== 'ok' && backup.status !== 'missing')
    return checkpointFailure('backup-' + backup.status, 'backup-preflight');
  if (expectedRaw === null && backup.status === 'ok')
    return checkpointFailure('recovery-required', 'primary-missing');

  if (prepared.raw === expectedRaw) return { ok: true, status: 'unchanged',
    raw: expectedRaw, save: prepared.save };

  if (expectedRaw !== null) {
    // The previous verified good primary is preserved BEFORE primary changes.
    const envelope = JSON.stringify({ format: CHECKPOINT_FORMAT, key: SAVE_KEY,
      raw: expectedRaw, checksum: checkpointChecksum(expectedRaw) });
    const staged = checkpointStorageWrite(CHECKPOINT_KEY, envelope);
    if (!staged.ok) return checkpointFailure(staged.status, 'backup-write', staged.error);
    const confirmed = inspectCheckpointBackup();
    if (confirmed.status !== 'ok' || confirmed.envelopeRaw !== envelope)
      return checkpointFailure(confirmed.status === 'unavailable' ? 'unavailable' :
        'backup-verification', 'backup-readback', confirmed.error);
  }

  // Detect sequential stale writers; this is NOT atomic CAS vs a true race.
  const latest = inspectCheckpointPrimary();
  if (!checkpointMatchesExpected(latest, expectedRaw))
    return checkpointFailure(latest.status === 'unavailable' ? 'unavailable' :
      'conflict', 'primary-recheck', latest.error);
  const written = checkpointStorageWrite(SAVE_KEY, prepared.raw);
  if (!written.ok) {
    // A hostile or unusual storage provider can write and then throw. Never
    // blindly retry if the primary may actually contain the new candidate.
    const probe = checkpointStorageRead(SAVE_KEY);
    if (!probe.ok || probe.raw !== expectedRaw)
      return checkpointFailure('uncertain', 'primary-write', written.error);
    return checkpointFailure(written.status, 'primary-write', written.error);
  }
  const verified = checkpointStorageRead(SAVE_KEY);
  if (!verified.ok || verified.raw !== prepared.raw)
    return checkpointFailure('uncertain', 'primary-readback', verified.error);
  return { ok: true, status: 'committed', raw: prepared.raw, save: prepared.save };
}

// Explicit, opt-in operator/user-authorized restore only. Requires the exact
// primary AND backup-envelope bytes from a prior inspectCheckpoint() result;
// refuse valid primary or future-version data, and never clear the bad raw.
// This method cannot prevent truly concurrent noncooperating old writers.
function recoverCheckpoint({ expectedPrimaryRaw, expectedBackupEnvelope } = {}) {
  if (!(expectedPrimaryRaw === null || typeof expectedPrimaryRaw === 'string') ||
      typeof expectedBackupEnvelope !== 'string')
    return checkpointFailure('invalid-expected', 'recovery-preflight');
  const state = inspectCheckpoint();
  const p = state.primary, b = state.backup;
  if (p.status === 'unavailable' || b.status === 'unavailable')
    return checkpointFailure('unavailable', 'recovery-read');
  if (p.status === 'ok' || p.status === 'unsupported')
    return checkpointFailure(p.status === 'ok' ? 'already-valid' : 'unsupported',
      'recovery-preflight');
  if (!['missing', 'corrupt', 'invalid'].includes(p.status) || b.status !== 'ok')
    return checkpointFailure('no-verified-backup', 'recovery-preflight');
  if ((p.raw ?? null) !== expectedPrimaryRaw || b.envelopeRaw !== expectedBackupEnvelope)
    return checkpointFailure('conflict', 'recovery-preflight');
  const latest = inspectCheckpointPrimary();
  if (latest.status !== p.status || (latest.raw ?? null) !== expectedPrimaryRaw)
    return checkpointFailure('conflict', 'recovery-recheck');
  const written = checkpointStorageWrite(SAVE_KEY, b.raw);
  if (!written.ok) {
    const probe = checkpointStorageRead(SAVE_KEY);
    if (!probe.ok || probe.raw !== expectedPrimaryRaw)
      return checkpointFailure('uncertain', 'recovery-write', written.error);
    return checkpointFailure(written.status, 'recovery-write', written.error);
  }
  const verified = checkpointStorageRead(SAVE_KEY);
  if (!verified.ok || verified.raw !== b.raw)
    return checkpointFailure('uncertain', 'recovery-readback', verified.error);
  return { ok: true, status: 'restored', raw: b.raw, save: b.save };
}

// Keep exactly 898 pre-existing named ESM exports (ARCH-01C3b2 invariant).
// Opt-in access via the already exported loadSave function does not add a new
// module export, change initialization edges, or affect legacy loadSave() calls.
// B3-B1c-B1 pre-cutover safeguard: once a writer gate is armed, the older B2
// public checkpoint methods must NOT bypass that lease. The writer's internal
// under-lease writerCommit() still uses the private implementation above.
// B3-B2 will provide approved, lease-aware import/recovery integration.
function publicCheckpointCommit(options) {
  if (writerGateEnabled) return checkpointFailure('writer-required', 'writer-gate');
  return commitCheckpoint(options);
}
function publicCheckpointRecover(options) {
  if (writerGateEnabled) return checkpointFailure('writer-required', 'writer-gate');
  return recoverCheckpoint(options);
}
loadSave.checkpoint = Object.freeze({
  key: CHECKPOINT_KEY, inspect: inspectCheckpoint,
  commit: publicCheckpointCommit, recover: publicCheckpointRecover
});


// ARCH-02C-B3-B1a: OPT-IN Web Locks writer coordination prototype.
// This deliberately does NOT change legacy persist(), boot or existing B1
// checkpoint callers. Those still bypass this lease until a separate gated
// integration; therefore this is NOT yet cross-tab safe production saving.
// A lock only coordinates cooperating, same-origin/partitioned JS contexts.
// In particular a cached older PWA ignores it. Never claim otherwise.
const WRITER_LOCK_NAME = SAVE_KEY + '.writer';
// Off in v140 legacy boot, for explicit B3-B1b integration proof only.
// One-way within this JS realm: release, denial, exception, or BFCache must
// not silently re-enable the old unsafe write path after opting in.
let writerGateEnabled = false;
// Once a gated gameplay session releases/loses its lease it cannot be
// reattached to newly acquired storage bytes while S remains stale in RAM.
let writerGateInvalidated = false;
// The boot lifecycle owns the UI/input fence. Reuse the existing loadSave
// namespace to avoid new ESM exports or a forbidden core -> UI import.
let writerRetiredHook = null;
function writerOnRetired(callback) {
  writerRetiredHook = typeof callback === 'function' ? callback : null;
}
function writerNotifyRetired(reason) {
  if (!writerGateEnabled || !writerRetiredHook) return;
  try { writerRetiredHook(reason); }
  catch (e) { /* the irreversible gate remains invalid even without UI */ }
}
function writerEnableGate() {
  if (!writerGateEnabled && S !== undefined) {
    // The caller already has RAM that was created without writer authority.
    // Switching that session to "owned" now could overwrite newer progress.
    writerGateEnabled = true;
    writerGateInvalidated = true;
    return { ok: false, status: 'late-gate' };
  }
  writerGateEnabled = true;
  return writerGateInvalidated ? { ok: false, status: 'session-stale' } :
    { ok: true, status: 'gated' };
}
function writerPersist() {
  if (writerGateInvalidated) return saveWriteFailure('session-stale',
    { name: 'StaleSession' });
  const result = writerCommit({ expectedRaw: writerLease ? writerLease.raw : undefined,
    candidate: S });
  if (result.ok) return { ok: true, status: 'ok', verified: result.status };
  return saveWriteFailure(result.status, { name: result.error || result.status });
}
// This is RAM-only, never a save-schema field or a second storage layer.
// A synchronous battle can defer nested persist() until XP/quests finish.
let writerSettlementActive = false;
function writerBeginSettlement() {
  if (!writerGateEnabled || writerSettlementActive)
    return checkpointFailure('settlement-busy', 'settlement-begin');
  const checked = writerCheck();
  if (!checked.ok) return checked;
  writerSettlementActive = true;
  return { ok: true, status: 'staging' };
}
function writerFinishSettlement() {
  if (!writerSettlementActive)
    return checkpointFailure('settlement-inactive', 'settlement-finish');
  writerSettlementActive = false;
  return persist(); // Existing B1 backup + byte-verified primary, once.
}
function writerAbortSettlement() {
  writerSettlementActive = false;
  return { ok: true, status: 'aborted' };
}
// B4-B2: only synchronous, storage-backed entry mutations may use this.
// A transaction callback changes ONLY the detached v1 save. It must not
// launch a battle, show a reward, or perform other UI/external side effects.
// Return {commit:false,value:reason} for a normal precondition failure.
function writerTransact(stage, presentationHooks = null) {
  if (!writerGateEnabled || typeof stage !== 'function')
    return checkpointFailure('writer-required', 'entry-transaction');
  const checked = writerCheck();
  if (!checked.ok) { writerRelease(); return checked; }
  const previous = S;
  let candidate;
  try { candidate = JSON.parse(JSON.stringify(previous)); }
  catch (e) {
    writerRelease();
    return checkpointFailure('serialization', 'entry-snapshot', e);
  }
  const begun = writerBeginSettlement();
  if (!begun.ok) { writerRelease(); return begun; }
  // B4-B3: hooks are supplied by the UI; core knows nothing about rewards.
  // Queue *presentation only*, never show an unlock/shard toast on failed IO.
  const hookQueue = [], savedHooks = [];
  if (presentationHooks) for (const name of ['unlock', 'shardConv']) {
    if (typeof presentationHooks[name] !== 'function') continue;
    savedHooks.push([name, presentationHooks[name]]);
    presentationHooks[name] = (...args) => { hookQueue.push([name, args]); };
  }
  const restoreHooks = () => {
    if (presentationHooks) for (const [name, fn] of savedHooks)
      presentationHooks[name] = fn;
  };
  set_S(candidate);
  let committedValue;
  try {
    const value = stage();
    if (value && typeof value.then === 'function')
      throw new Error('entry-transaction-must-be-synchronous');
    if (value && value.commit === false) {
      set_S(previous);
      writerAbortSettlement();
      restoreHooks();
      return { ok: false, status: 'cancelled', value: value.value };
    }
    const committed = writerFinishSettlement();
    if (!committed.ok) {
      set_S(previous);
      restoreHooks();
      writerRelease();
      return committed;
    }
    committedValue = value;
  } catch (e) {
    set_S(previous);
    writerAbortSettlement();
    restoreHooks();
    writerRelease();
    return checkpointFailure('transaction-error', 'entry-action', e);
  }
  restoreHooks();
  for (const [name, args] of hookQueue) {
    try { presentationHooks[name](...args); }
    catch (e) { /* durable result succeeded; a visual hook cannot roll it back */ }
  }
  return { ok: true, status: 'committed', value: committedValue };
}
let writerLease = null;
let writerAcquiring = false;
let writerCancelAcquire = null;
let writerTicket = 0;
let writerLastStatus = 'idle';
function writerState() {
  if (writerLease) return { ok: !writerLease.stale,
    status: writerLease.stale ? 'stale' : 'owned', raw: writerLease.raw,
    gated: writerGateEnabled };
  return { ok: false, status: writerGateInvalidated ? 'session-stale' :
    (writerAcquiring ? 'acquiring' : writerLastStatus), gated: writerGateEnabled };
}
function writerRelease() {
  // Any retired session invalidates an unfinished staged battle as well.
  writerSettlementActive = false;
  const retiring = !!(writerAcquiring || writerLease);
  if (writerGateEnabled && retiring) writerGateInvalidated = true;
  if (writerAcquiring && writerCancelAcquire) {
    writerTicket++;
    writerCancelAcquire();
  }
  if (!writerLease) {
    if (retiring) writerNotifyRetired('writer-released');
    return { ok: true, status: 'idle' };
  }
  const lease = writerLease;
  writerLease = null;
  writerLastStatus = 'released';
  lease.release();
  // Explicit API release must also fence the old UI, not only persist0().
  // The boot's own lifecycle block sets blocked=true BEFORE calling release.
  writerNotifyRetired('writer-released');
  return { ok: true, status: 'released' };
}
function writerCheck() {
  if (!writerLease) return checkpointFailure('not-owner', 'writer-check');
  if (writerLease.stale) return checkpointFailure('stale', 'writer-check');
  // Reinspect even while locked: this also detects uncooperative old builds,
  // but cannot prevent them from writing AGAIN after this synchronous check.
  const latest = inspectCheckpointPrimary();
  const expected = writerLease;
  if (latest.status !== expected.primaryStatus ||
      (latest.raw ?? null) !== expected.raw) {
    expected.stale = true;
    return checkpointFailure(latest.status === 'unavailable' ? 'unavailable' :
      'stale', 'writer-recheck', latest.error);
  }
  return { ok: true, status: 'current', raw: expected.raw };
}
function writerCommit({ expectedRaw, candidate } = {}) {
  // A recovery-only lease can never commit gameplay RAM or import a save.
  if (writerLease && writerLease.purpose === 'recovery')
    return checkpointFailure('recovery-only', 'writer-commit');
  const checked = writerCheck();
  if (!checked.ok) return checked;
  if (expectedRaw !== writerLease.raw)
    return checkpointFailure('conflict', 'writer-expected');
  // No await / yield between the under-lease read and the checked B1 commit.
  const result = commitCheckpoint({ expectedRaw, candidate });
  if (result.ok) {
    writerLease.raw = result.raw;
    writerLease.primaryStatus = 'ok';
  } else if (result.status === 'uncertain' || result.status === 'conflict') {
    writerLease.stale = true; // never blindly retry a possibly written draft
  }
  return result;
}
// B3-B2: optional user-confirmed recovery lease has NO gameplay authority.
 // It can only be requested in a gated, empty-RAM realm and for a verified
 // backup plus corrupt/invalid/missing primary. Ordinary acquire is unchanged.
async function writerAcquire(options = {}) {
  const recovery = options && options.purpose === 'recovery';
  if (recovery && (!writerGateEnabled || S !== undefined))
    return { ok: false, status: 'recovery-requires-empty-ram' };
  if (writerGateEnabled && writerGateInvalidated)
    return { ok: false, status: 'session-stale' };
  if (writerLease) return { ok: false, status: 'already-owner' };
  if (writerAcquiring) return { ok: false, status: 'acquiring' };
  // Do not use a localStorage mutex: test-and-set is not atomic between tabs.
  let locks;
  try { locks = typeof navigator === 'undefined' ? null : navigator.locks; }
  catch (e) { return { ok: false, status: 'unavailable' }; }
  if (!locks || typeof locks.request !== 'function')
    return { ok: false, status: 'unsupported' };
  writerAcquiring = true;
  writerLastStatus = 'acquiring';
  const ticket = ++writerTicket;
  let resolveStart, settled = false;
  const started = new Promise(resolve => { resolveStart = resolve; });
  function finish(outcome) {
    if (settled) return;
    settled = true;
    writerAcquiring = false;
    writerCancelAcquire = null;
    if (!outcome.ok) writerLastStatus = outcome.status;
    resolveStart(outcome);
  }
  writerCancelAcquire = () => finish({ ok: false, status: 'cancelled' });
  let request, requestValidated = false;
  try {
    request = locks.request(WRITER_LOCK_NAME,
      { mode: 'exclusive', ifAvailable: true }, lock => {
        if (ticket !== writerTicket) {
          finish({ ok: false, status: 'cancelled' });
          return;
        }
        if (!lock) {
          finish({ ok: false, status: 'busy' });
          return;
        }
        const primary = inspectCheckpointPrimary();
        const backup = inspectCheckpointBackup();
        if (recovery) {
          if (primary.status === 'unsupported' || primary.status === 'ok') {
            finish({ ok: false, status: primary.status === 'ok' ?
              'already-valid' : 'unsupported' });
            return;
          }
          if (!['missing', 'corrupt', 'invalid'].includes(primary.status)) {
            finish({ ok: false, status: primary.status });
            return;
          }
          if (backup.status !== 'ok') {
            finish({ ok: false, status: backup.status === 'missing' ?
              'no-verified-backup' : 'backup-' + backup.status });
            return;
          }
        } else {
          if (primary.status !== 'ok' && primary.status !== 'missing') {
            finish({ ok: false, status: primary.status });
            return;
          }
          if (backup.status !== 'ok' && backup.status !== 'missing') {
            finish({ ok: false, status: 'backup-' + backup.status });
            return;
          }
          if (primary.status === 'missing' && backup.status === 'ok') {
            finish({ ok: false, status: 'recovery-required' });
            return;
          }
        }
        // The returned pending Promise keeps the native Web Lock held.
        const holding = new Promise(resolve => {
          writerLease = { raw: primary.raw ?? null, primaryStatus: primary.status,
            stale: false, ticket, purpose: recovery ? 'recovery' : 'game',
            release: resolve };
        });
        writerLastStatus = 'owned';
        // Do not acknowledge a provider that calls back but fails to return
        // the Promise required by the native Web Locks API.
        const acknowledge = () => {
          if (requestValidated && writerLease && writerLease.ticket === ticket)
            finish({ ok: true, status: 'acquired', raw: writerLease.raw });
        };
        if (requestValidated) acknowledge();
        else Promise.resolve().then(acknowledge);
        return holding;
      });
  } catch (e) {
    finish({ ok: false, status: 'unavailable' });
    return started;
  }
  if (!request || typeof request.then !== 'function') {
    // A mock/nonconforming manager returning synchronously is not a lock.
    writerRelease();
    finish({ ok: false, status: 'unavailable' });
    return started;
  }
  requestValidated = true;
  // A native request must remain pending for as long as its callback holds
  // the lock. Early fulfillment OR rejection with a recorded lease is loss
  // of authority. Invalidate synchronously, then fence UI before a new input.
  const unexpectedSettlement = () => {
    if (!settled) finish({ ok: false, status: 'unavailable' });
    if (writerLease && writerLease.ticket === ticket) {
      const lost = writerLease;
      writerLease = null;
      if (writerGateEnabled) writerGateInvalidated = true;
      writerLastStatus = 'lost';
      // The holding Promise may still be pending in a broken/revoking manager.
      // Do not retain it and risk locking out a fresh safe page forever.
      lost.release();
      writerNotifyRetired('lock-lost');
    }
  };
  Promise.resolve(request).then(unexpectedSettlement, unexpectedSettlement);
  return started;
}
// Manual one-shot restore: NEVER acquires a lock implicitly, replaces RAM,
// boots gameplay, or retries after an uncertain write. The caller supplies
// both EXACT bytes inspected while holding the same recovery-only Web Lock.
function writerRecover({ expectedPrimaryRaw, expectedBackupEnvelope } = {}) {
  if (!writerGateEnabled || !writerLease ||
      writerLease.purpose !== 'recovery' || S !== undefined)
    return checkpointFailure('not-recovery-owner', 'writer-recover');
  const checked = writerCheck();
  if (!checked.ok) {
    writerRelease(); // an interrupted or stale recovery session is retired
    return checked;
  }
  const result = recoverCheckpoint({ expectedPrimaryRaw, expectedBackupEnvelope });
  // Even a successful restore MUST reload a new JS realm. The original
  // primary, if corrupt, must never be adopted into this heap's gameplay RAM.
  writerRelease();
  return result;
}
// Opt-in surface on an existing named export preserves the 898-name ESM ABI.
loadSave.writer = Object.freeze({
  name: WRITER_LOCK_NAME, primaryKey: SAVE_KEY,
  acquire: writerAcquire, state: writerState,
  check: writerCheck, commit: writerCommit, recover: writerRecover,
  beginSettlement: writerBeginSettlement, finishSettlement: writerFinishSettlement,
  abortSettlement: writerAbortSettlement, transact: writerTransact,
  release: writerRelease, enableGate: writerEnableGate,
  onRetired: writerOnRetired
});

export { SAVE_KEY, newSave, fillSave, loadSave, persist0, notePend, persist, onPersist };
