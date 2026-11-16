// logic/cinematic-preference.js — минимальная независимая настройка кинематографа.
// Никакой загрузки аккаунта или UI; эквивалентная существующей CINE_OFF реализация.
const CINE_OFF = () => { try { return !!JSON.parse(localStorage.getItem('dune-cine-off') || 'true'); } catch (e) { return true; } };
export { CINE_OFF };
