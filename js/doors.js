/**
 * doors.js
 * ---------------------------------------------------------------------------
 * Cada porta é uma pequena máquina de estados independente:
 *
 *   isClosed   -> a porta bloqueia a entrada do inimigo, mas consome energia
 *   lightOn    -> acende a luz do lado de fora para "checar" se tem algo lá.
 *                 Só existe um propósito: revelar visualmente o inimigo
 *                 quando ele já chegou (naPorta). Também consome energia
 *                 enquanto ligada.
 *   occupiedBy -> id do inimigo que está fisicamente parado nessa porta
 *                 agora (ou null). Quem seta isso é o enemyAI.js.
 *
 * A porta em si NUNCA decide se o jumpscare acontece — ela só expõe o
 * estado. Quem lê esse estado e decide "atacar ou não" é o enemyAI.js,
 * então toda a regra de "o que significa estar seguro" fica concentrada
 * num único lugar (fácil de reequilibrar o jogo mexendo só ali).
 * ---------------------------------------------------------------------------
 */

class Door {
  constructor(id, label) {
    this.id = id;
    this.label = label;
    this.isClosed = false;
    this.lightOn = false;
    this.occupiedBy = null; // id do inimigo parado na porta, ou null
  }

  toggleClosed() {
    this.isClosed = !this.isClosed;
    return this.isClosed;
  }

  toggleLight() {
    // Por realismo/balanceamento: luz e porta fechada não ficam ligadas
    // juntas (a porta fechada já esconde a visão) — evita "modo seguro
    // infinito" barato de custo de energia. Ajuste aqui se quiser mudar
    // essa regra.
    if (this.isClosed) return this.lightOn;
    this.lightOn = !this.lightOn;
    return this.lightOn;
  }

  /** Consumo de energia por segundo gerado por esta porta agora mesmo. */
  getPowerDrainPerSec(constants) {
    let drain = 0;
    if (this.isClosed) drain += constants.POWER_DRAIN_PER_DOOR_CLOSED_PER_SEC;
    if (this.lightOn) drain += constants.POWER_DRAIN_PER_LIGHT_ON_PER_SEC;
    return drain;
  }

  reset() {
    this.isClosed = false;
    this.lightOn = false;
    this.occupiedBy = null;
  }
}

/** Cria o conjunto de portas a partir de DOORS_CONFIG (config.js). */
function createDoors(doorsConfig) {
  const doors = {};
  doorsConfig.forEach((cfg) => {
    doors[cfg.id] = new Door(cfg.id, cfg.label);
  });
  return doors;
}

window.Door = Door;
window.createDoors = createDoors;
