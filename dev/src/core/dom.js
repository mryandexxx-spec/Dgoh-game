// core/dom.js — выделен из core/util в фазе 3a (REFACTOR_PLAN §2). Правится вручную.
import '../logic/daily.js'; // порядок исполнения
const $ = s => document.querySelector(s);
const LAND_MQ = typeof matchMedia !== 'undefined' ? matchMedia('(orientation: landscape) and (max-height: 520px)') : null;
const isLandPhone = () => !!(LAND_MQ && LAND_MQ.matches);


export { $, LAND_MQ, isLandPhone };
