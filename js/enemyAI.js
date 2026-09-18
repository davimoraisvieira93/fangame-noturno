/**
 * enemyAI.js
 * ---------------------------------------------------------------------------
 * Cada inimigo segue um "path" (definido em ENEMIES_CONFIG, config.js):
 * uma lista de cômodos terminando sempre em 'porta:<id>'.
 *
 * A cada AI_TICK_INTERVAL_MS (config.js), cada inimigo "rola um dado" de
 * 0 a 19. Se o resultado for menor que sua "aggression" da noite atual,
 * ele avança UM passo no path. Isso é o clássico esquema de "AI level"
 * do gênero: aggression 0 = praticamente parado; aggression 19+ = avança
 * quase a cada tick.
 *
 * Estados possíveis de um inimigo:
 *   'roaming'    -> em algum cômodo do path, visível pela câmera daquele
 *                   cômodo (ver isVisibleInRoom).
 *   'atDoor'     -> chegou na porta-alvo. Se a porta estiver ABERTA, um
 *                   cronômetro de ataque começa a contar (DOOR_ATTACK_GRACE_MS);
 *                   se o jogador não fechar a porta a tempo, dispara o
 *                   jumpscare. Se a porta está FECHADA, ele fica "batendo"
 *                   por DOOR_KNOCK_RETREAT_MS e depois recua.
 *   'retreating' -> recuou após ser bloqueado; fica em cooldown antes de
 *                   reiniciar o caminho do zero.
 * ---------------------------------------------------------------------------
 */

class Enemy {
  constructor(cfg) {
    this.id = cfg.id;
    this.label = cfg.label;
    this.path = cfg.path; // ex: ['quintal','cozinha','corredor','porta:esquerda']
    this.reset();
  }

  reset() {
    this.pathIndex = -1; // -1 = ainda não apareceu em nenhum cômodo
    this.state = 'roaming';
    this.doorId = null;
    this.attackTimerMs = 0;
    this.knockTimerMs = 0;
    this.cooldownUntil = 0;
  }

  /** Id do cômodo onde está agora (ou null se ainda não apareceu / já está na porta). */
  currentRoomId() {
    if (this.pathIndex < 0) return null;
    const step = this.path[this.pathIndex];
    return step.startsWith('porta:') ? null : step;
  }

  isVisibleInRoom(roomId) {
    return this.state === 'roaming' && this.currentRoomId() === roomId;
  }

  /** Só aparece na "checagem de luz" da porta se a luz estiver acesa. */
  isRevealedAtDoor(doorId, doors) {
    return this.state === 'atDoor' && this.doorId === doorId && doors[doorId].lightOn;
  }

  _advanceStep(doors) {
    this.pathIndex += 1;
    const step = this.path[this.pathIndex];

    if (step.startsWith('porta:')) {
      this.doorId = step.split(':')[1];
      this.state = 'atDoor';
      this.attackTimerMs = 0;
      this.knockTimerMs = 0;
      doors[this.doorId].occupiedBy = this.id;
    } else {
      this.state = 'roaming';
    }
  }

  _retreat(doors, constants) {
    if (this.doorId && doors[this.doorId].occupiedBy === this.id) {
      doors[this.doorId].occupiedBy = null;
    }
    this.state = 'retreating';
    this.doorId = null;
    this.cooldownUntil = Date.now() + constants.ENEMY_RETREAT_COOLDOWN_MS;
    this.pathIndex = -1;
  }

  /**
   * Chamado a cada AI_TICK_INTERVAL_MS pelo game.js.
   * @returns {boolean} true se este tick causou um jumpscare (fim de jogo)
   */
  tick({ doors, cameraSystem, aggression, constants, tickIntervalMs }) {
    const now = Date.now();

    if (this.state === 'retreating') {
      if (now >= this.cooldownUntil) this.state = 'roaming';
      return false;
    }

    if (this.state === 'atDoor') {
      const door = doors[this.doorId];
      if (door.isClosed) {
        this.knockTimerMs += tickIntervalMs;
        if (this.knockTimerMs >= constants.DOOR_KNOCK_RETREAT_MS) {
          this._retreat(doors, constants);
        }
      } else {
        this.attackTimerMs += tickIntervalMs;
        if (this.attackTimerMs >= constants.DOOR_ATTACK_GRACE_MS) {
          return true; // JUMPSCARE — o game.js decide o que fazer com isso
        }
      }
      return false;
    }

    // state === 'roaming' (incluindo pathIndex === -1, "prestes a surgir")
    let chance = aggression;
    const room = this.currentRoomId();
    if (room && cameraSystem.msSinceLastViewed(room) > constants.AI_NOT_WATCHED_THRESHOLD_MS) {
      chance += constants.AI_NOT_WATCHED_BONUS;
    }

    const roll = Math.floor(Math.random() * 20); // 0..19
    if (roll < chance) {
      this._advanceStep(doors);
    }
    return false;
  }
}

class EnemyManager {
  constructor(enemiesConfig) {
    this.enemies = enemiesConfig.map((cfg) => new Enemy(cfg));
  }

  reset() {
    this.enemies.forEach((e) => e.reset());
  }

  /**
   * @param {Object} nightAggression  mapa { enemyId: aggressionLevel } da noite atual
   * @returns {string|null} id do inimigo que causou jumpscare, ou null
   */
  tickAll({ doors, cameraSystem, nightAggression, constants, tickIntervalMs }) {
    for (const enemy of this.enemies) {
      const jumpscared = enemy.tick({
        doors,
        cameraSystem,
        aggression: nightAggression[enemy.id] ?? 0,
        constants,
        tickIntervalMs,
      });
      if (jumpscared) return enemy.id;
    }
    return null;
  }

  getById(id) {
    return this.enemies.find((e) => e.id === id);
  }

  /** Todos os inimigos visíveis agora num determinado cômodo (normalmente 0 ou 1). */
  getVisibleInRoom(roomId) {
    return this.enemies.filter((e) => e.isVisibleInRoom(roomId));
  }

  getAtDoor(doorId) {
    return this.enemies.find((e) => e.state === 'atDoor' && e.doorId === doorId) || null;
  }
}

window.Enemy = Enemy;
window.EnemyManager = EnemyManager;
