// render3d/game-scene.js — контракт 3D-сцены на общем движке (фаза 3b, шаг 4).
// Жизненный цикл: create (конструктор подкласса) → wake(host, o) → update(now) каждый кадр → sleep() → wake() … → dispose().
//   created — сцена построена, на экран не выведена; awake — в стеке EngineHost, update() вызывается, пока сцена верхняя;
//   asleep — снята со стека, ресурсы GPU (меши, материалы, текстуры, RT) сохранены, кадры не считаются; disposed — всё освобождено.
// Хост сцены (DOM-узел) отпал → onDetach() → sleep(); подклассы, которым сон не нужен (арена), переопределяют на dispose().
// EngineHost передаётся параметром: модуль стоит в цепочке раньше engine-host.js и не должен тянуть его импортом.
import './ctx.js'; // порядок исполнения

class GameScene {
  constructor(host) {
    this.host = host.adopt(this); this.cv = host.cv; this.engine = host.engine;
    this.state = 'created'; this.alive = true; this.scene = null; this._el = null; this._mo = null;
  }
  get awake() { return this.state === 'awake'; }
  // o — параметры EngineHost.mount: { cls, id, first, replace, dpr }; без аргументов — повторно в прежний хост
  place(el, o) { if (el) { this._el = el; this._mo = o || {}; } if (!this.alive || !this._el) return false; this.host.mount(this, this._el, this._mo); return true; }
  wake(el, o) {
    if (!this.alive || !this.place(el, o)) return false;
    const was = this.state; this.state = 'awake';
    if (was !== 'awake' && this.onWake) this.onWake(was);
    return true;
  }
  // o — подсказки подклассу (например { light: true } — освободить экранные цели рендера); спящую сцену можно «углубить» повторным sleep
  sleep(o) {
    if (!this.alive || this.state === 'disposed' || this.state === 'created') return;
    if (this.state === 'awake') { this.state = 'asleep'; this.host.release(this); }
    if (this.onSleep) this.onSleep(o || {});
  }
  frame() { if (this.state === 'awake') this.update(performance.now()); }
  update() {}
  onDetach() { this.sleep(); }
  dispose() {
    if (!this.alive) return; this.alive = false; this.state = 'disposed';
    if (this.onDispose) try { this.onDispose(); } catch (e) {}
    try { this.scene && this.scene.dispose(); } catch (e) {}
    this.host.forget(this);
  }
}


export { GameScene };
