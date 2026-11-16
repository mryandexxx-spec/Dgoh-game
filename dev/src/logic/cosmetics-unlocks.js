// ARCH-01C3a1: save- and roster-owned cosmetic eligibility belongs to logic.
// This is the byte-identical v127+C2c rule; registration does NOT evaluate S/prog.
import { FREE, bindCosmeticUnlockRule } from '../data/cosmetics.js';
import { CH } from '../data/chars.js';
import { S } from '../core/state.js';
import { prog } from './progress.js';

const unlockedRule = (kind, id) => FREE[kind].includes(id) || !!S.unlocks[kind][id] || (kind === 'ava' && id.startsWith('hero:') && CH[id.slice(5)] && prog(id.slice(5)).stars > 0);

// Only a function reference is bound; current S is read on each UI invocation.
bindCosmeticUnlockRule(unlockedRule);
