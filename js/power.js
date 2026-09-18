/**
 * power.js
 * ---------------------------------------------------------------------------
 * Gerencia a barra de energia (0 a 100).
 *
 * O consumo por segundo é recalculado a cada frame, somando:
 *   - um consumo-base (mesmo com tudo desligado, a casa "gasta" um pouco)
 *   - + um valor fixo por PORTA fechada
 *   - + um valor fixo por LUZ acesa
 *   - + um valor fixo se o MONITOR de câmeras estiver aberto
 * ...e multiplicando tudo pelo `powerDrainMultiplier` da noite atual
 * (definido em NIGHTS_CONFIG, em config.js) para a dificuldade escalar
 * noite após noite.
 *
 * Ao chegar a 0, dispara um callback único de "blackout" (apagão): todas
 * as portas destrancam/abrem sozinhas e o monitor para de funcionar —
 * a partir daí é sorte até o amanhecer.
 * ---------------------------------------------------------------------------
 */

class PowerSystem {
  constructor(constants, onBlackout) {
    this.constants = constants;
    this.current = constants.POWER_MAX;
    this.onBlackout = onBlackout;
    this.isBlackedOut = false;
  }

  reset() {
    this.current = this.constants.POWER_MAX;
    this.isBlackedOut = false;
  }

  /**
   * @param {number} deltaSec        tempo real, em segundos, desde o último tick
   * @param {Door[]} doorList        lista de portas atuais
   * @param {boolean} monitorOpen    se o monitor de câmeras está aberto agora
   * @param {number} nightMultiplier multiplicador de dificuldade da noite
   */
  tick(deltaSec, doorList, monitorOpen, nightMultiplier) {
    if (this.isBlackedOut) return;

    let drainPerSec = this.constants.POWER_DRAIN_BASE_PER_SEC;
    doorList.forEach((door) => {
      drainPerSec += door.getPowerDrainPerSec(this.constants);
    });
    if (monitorOpen) {
      drainPerSec += this.constants.POWER_DRAIN_MONITOR_OPEN_PER_SEC;
    }
    drainPerSec *= nightMultiplier;

    this.current = Math.max(0, this.current - drainPerSec * deltaSec);

    if (this.current <= 0 && !this.isBlackedOut) {
      this.isBlackedOut = true;
      if (typeof this.onBlackout === 'function') this.onBlackout();
    }
  }

  get percentage() {
    return Math.round(this.current);
  }

  isLow() {
    return this.current <= this.constants.POWER_LOW_WARNING_THRESHOLD;
  }
}

window.PowerSystem = PowerSystem;
