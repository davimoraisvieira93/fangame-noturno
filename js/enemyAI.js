class Enemy {
  constructor(cfg) {
    this.id = cfg.id;
    this.label = cfg.label;
    this.startNode = cfg.startNode;
    this.graph = cfg.graph;
    this.onMoveSfx = cfg.onMoveSfx || null;
    this.lockNode = cfg.lockNode || null; // {nodeId, timeoutMs, doorId}
    this.reset();
  }

  reset() {
    this.currentNode = null; // ainda não apareceu
    this.state = 'roaming'; // roaming | atDoor | locked | retreating
    this.doorId = null;
    this.attackTimerMs = 0;
    this.knockTimerMs = 0;
    this.lockTimerMs = 0;
    this.cooldownUntil = 0;
  }

  currentRoomId() {
    if (!this.currentNode || this.currentNode.startsWith('porta:')) return null;
    return this.currentNode;
  }

  isVisibleInRoom(roomId) {
    return (this.state === 'roaming' || this.state === 'locked') && this.currentNode === roomId;
  }

  isRevealedAtDoor(doorId, doors) {
    return this.state === 'atDoor' && this.doorId === doorId && doors[doorId].lightOn;
  }

  _moveTo(nextNode, doors, assetLoader) {
    if (nextNode.startsWith('porta:')) {
      this.doorId = nextNode.split(':')[1];
      this.currentNode = nextNode;
      this.state = 'atDoor';
      this.attackTimerMs = 0;
      this.knockTimerMs = 0;
      doors[this.doorId].occupiedBy = this.id;
    } else {
      this.currentNode = nextNode;
      if (this.lockNode && this.lockNode.nodeId === nextNode) {
        this.state = 'locked';
        this.lockTimerMs = 0;
      } else {
        this.state = 'roaming';
      }
    }
    if (this.onMoveSfx && assetLoader) assetLoader.playSfx(this.onMoveSfx);
  }

  _retreat(doors, constants) {
    if (this.doorId && doors[this.doorId].occupiedBy === this.id) {
      doors[this.doorId].occupiedBy = null;
    }
    this.state = 'retreating';
    this.doorId = null;
    this.currentNode = null;
    this.cooldownUntil = Date.now() + constants.ENEMY_RETREAT_COOLDOWN_MS;
  }

  /** Movimentação por agressividade — chamado a cada AI_TICK_INTERVAL_MS. */
  tick({ doors, cameraSystem, aggression, constants, tickIntervalMs, assetLoader }) {
    const now = Date.now();

    if (this.state === 'retreating') {
      if (now >= this.cooldownUntil) this.state = 'roaming';
      return false;
    }

    if (this.state === 'locked') return false; // resolvido em updateLock(), não aqui

    if (this.state === 'atDoor') {
      const door = doors[this.doorId];
      if (door.isClosed) {
        this.knockTimerMs += tickIntervalMs;
        if (this.knockTimerMs >= constants.DOOR_KNOCK_RETREAT_MS) this._retreat(doors, constants);
      } else {
        this.attackTimerMs += tickIntervalMs;
        if (this.attackTimerMs >= constants.DOOR_ATTACK_GRACE_MS) return true; // JUMPSCARE
      }
      return false;
    }

    // roaming
    let chance = aggression;
    const room = this.currentRoomId();
    if (room && cameraSystem.msSinceLastViewed(room) > constants.AI_NOT_WATCHED_THRESHOLD_MS) {
      chance += constants.AI_NOT_WATCHED_BONUS;
    }

    const roll = Math.floor(Math.random() * 20);
    if (roll < chance) {
      const candidates = this.currentNode === null ? [this.startNode] : (this.graph[this.currentNode] || []);
      if (candidates.length > 0) {
        const next = candidates[Math.floor(Math.random() * candidates.length)];
        this._moveTo(next, doors, assetLoader);
      }
    }
    return false;
  }

  /**
   * Mecânica exclusiva de nós com lockNode (hoje só o Freddy, Câm 2).
   * Chamado A CADA FRAME (não por tick de IA), porque depende de reação
   * imediata à troca de câmera do jogador.
   * @returns {boolean} true se deve disparar jumpscare agora
   */
  updateLock(deltaMs, doors, cameraSystem) {
    if (this.state !== 'locked' || !this.lockNode) return false;

    const door = doors[this.lockNode.doorId];
    const doorOpen = !door.isClosed;
    if (!doorOpen) return false; // porta fechada = totalmente seguro (timer congela)

    const watchingLockNode = cameraSystem.isOpen && cameraSystem.currentRoomId === this.lockNode.nodeId;
    const watchingWrongCam = cameraSystem.isOpen && cameraSystem.currentRoomId !== this.lockNode.nodeId;

    if (watchingWrongCam) return true; // Morte 1: câmera errada com a porta aberta

    if (watchingLockNode) {
      this.lockTimerMs = 0; // paralisado enquanto observado
      return false;
    }

    // monitor fechado (não observando nada) — acumula o tempo-limite
    this.lockTimerMs += deltaMs;
    return this.lockTimerMs >= this.lockNode.timeoutMs; // Morte 2: timeout
  }
}

class EnemyManager {
  constructor(enemiesConfig) {
    this.enemies = enemiesConfig.map((cfg) => new Enemy(cfg));
  }

  reset() {
    this.enemies.forEach((e) => e.reset());
  }

  tickAll({ doors, cameraSystem, nightAggression, constants, tickIntervalMs, assetLoader }) {
    for (const enemy of this.enemies) {
      const jumpscared = enemy.tick({
        doors,
        cameraSystem,
        aggression: nightAggression[enemy.id] ?? 0,
        constants,
        tickIntervalMs,
        assetLoader,
      });
      if (jumpscared) return enemy.id;
    }
    return null;
  }

  /** Roda a mecânica de lockNode de todos os inimigos, a cada frame. */
  updateLocks(deltaMs, doors, cameraSystem) {
    for (const enemy of this.enemies) {
      if (enemy.updateLock(deltaMs, doors, cameraSystem)) return enemy.id;
    }
    return null;
  }

  getById(id) {
    return this.enemies.find((e) => e.id === id);
  }

  getVisibleInRoom(roomId) {
    return this.enemies.filter((e) => e.isVisibleInRoom(roomId));
  }

  getAtDoor(doorId) {
    return this.enemies.find((e) => e.state === 'atDoor' && e.doorId === doorId) || null;
  }
}

window.Enemy = Enemy;
window.EnemyManager = EnemyManager;
