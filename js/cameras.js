/**
 * cameras.js
 * ---------------------------------------------------------------------------
 * Controla o "monitor" (o tablet/painel de câmeras que cobre a tela).
 *
 * - open/close: alterna o monitor. Abrir consome mais energia (ver
 *   power.js) e, propositalmente, esconde as portas — enquanto o jogador
 *   olha as câmeras, ele não pode fechar portas na hora (igual ao gênero
 *   original: checar câmera tem o custo de "ficar cego" para a porta).
 * - switchRoom: troca o cômodo exibido e registra `lastViewedAt` por
 *   cômodo — o enemyAI.js usa esse timestamp para aumentar a agressão de
 *   um inimigo que está num cômodo "esquecido" há muito tempo.
 * ---------------------------------------------------------------------------
 */

class CameraSystem {
  constructor(rooms) {
    this.rooms = rooms; // [{id, label}, ...]
    this.isOpen = false;
    this.currentRoomId = rooms[0].id;
    this.lastViewedAt = {}; // roomId -> timestamp (ms)
    this.lastSwitchAt = 0; // usado pelo efeito de estática ao trocar de câmera
    const now = Date.now();
    rooms.forEach((r) => (this.lastViewedAt[r.id] = now));
  }

  reset() {
    this.isOpen = false;
    this.currentRoomId = this.rooms[0].id;
    this.lastSwitchAt = 0;
    const now = Date.now();
    this.rooms.forEach((r) => (this.lastViewedAt[r.id] = now));
  }

  /** @param {boolean} allowed  false bloqueia a abertura (ex.: não olhando pro centro) */
  open(allowed = true) {
    if (!allowed) return false;
    this.isOpen = true;
    this.lastSwitchAt = Date.now();
    this._markViewed(this.currentRoomId);
    return true;
  }

  close() {
    this.isOpen = false;
  }

  toggle(allowed = true) {
    if (this.isOpen) {
      this.close();
      return false;
    }
    return this.open(allowed);
  }

  switchRoom(roomId) {
    this.currentRoomId = roomId;
    this.lastSwitchAt = Date.now();
    if (this.isOpen) this._markViewed(roomId);
  }

  isFlashingStatic(flashDurationMs) {
    return Date.now() - this.lastSwitchAt < flashDurationMs;
  }

  _markViewed(roomId) {
    this.lastViewedAt[roomId] = Date.now();
  }

  /** Há quanto tempo (ms) este cômodo não é observado com o monitor aberto. */
  msSinceLastViewed(roomId) {
    return Date.now() - (this.lastViewedAt[roomId] || 0);
  }
}

window.CameraSystem = CameraSystem;
