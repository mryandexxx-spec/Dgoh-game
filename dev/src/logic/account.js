// logic/account.js — совместимый адаптер публичных экспортов и исторического порядка загрузки.
// Сами правила живут в account-rules.js. Здесь нет зависимостей от UI.
export * from './account-rules.js';
const __accountLegacyAdapter = true;
