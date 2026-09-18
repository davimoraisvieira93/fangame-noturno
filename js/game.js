class Game {
  constructor(canvas, assetLoader) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.assetLoader = assetLoader;
    this.constants = window.GAME_CONSTANTS;

    // Buffer interno de baixa resolução -> upscale pixelado no canvas visível.
    this.buffer = document.createElement('canvas');
    this.buffer.width = this.constants.INTERNAL_WIDTH;
    this.buffer.height = this.constants.INTERNAL_HEIGHT;
    this.bufferCtx = this.buffer.getContext('2d');
    this.bufferCtx.imageSmoothingEnabled = false;

    this.doors = createDoors(window.DOORS_CONFIG);
    this.power = new PowerSystem(this.constants, () => this._onBlackout());
    this.cameras = new CameraSystem(window.ROOMS);
    this.enemies = new EnemyManager(window.ENEMIES_CONFIG);

    this.nightIndex = 0;
    this.state = 'menu';
    this.elapsedNightMs = 0;
    this.aiTickAccumulator = 0;
    this.lastFrameTime = 0;

    const panRange = this.constants.OFFICE_WORLD_WIDTH - this.constants.INTERNAL_WIDTH;
    this.cameraOffsetX = panRange / 2;
    this.targetOffsetX = panRange / 2;

    UI.buildCameraTabs(window.ROOMS, (roomId) => this.switchCameraRoom(roomId));

    this._resizeCanvas();
    this._setupInputs();
  }

  _resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ctx.imageSmoothingEnabled = false; // resize reseta o estado do contexto
  }

  _setupInputs() {
    window.addEventListener('resize', () => this._resizeCanvas());
    window.addEventListener('mousemove', (e) => {
      const frac = Math.min(1, Math.max(0, e.clientX / window.innerWidth));
      const panRange = this.constants.OFFICE_WORLD_WIDTH - this.constants.INTERNAL_WIDTH;
      this.targetOffsetX = frac * panRange;
    });
  }

  /** true se o jogador está olhando para a área central (permite abrir o monitor). */
  isOffsetCentral() {
    const panRange = this.constants.OFFICE_WORLD_WIDTH - this.constants.INTERNAL_WIDTH;
    const center = panRange / 2;
    return Math.abs(this.cameraOffsetX - center) <= this.constants.MONITOR_CENTER_MARGIN;
  }

  // -----------------------------------------------------------------
  startNight(nightIndex) {
    this.nightIndex = Math.min(nightIndex, window.NIGHTS_CONFIG.length - 1);
    this.elapsedNightMs = 0;
    this.aiTickAccumulator = 0;

    Object.values(this.doors).forEach((d) => d.reset());
    this.power.reset();
    this.cameras.reset();
    this.enemies.reset();

    this.state = 'playing';
    this.lastFrameTime = performance.now();

    UI.hideAllScreens();
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('office-controls').classList.remove('hidden');
    document.getElementById('camera-monitor').classList.add('hidden');
    UI.setDoorButtonsState(this.doors);

    this.assetLoader.playSfx('ambience', { loop: true, volume: 0.5 });
    requestAnimationFrame((t) => this.loop(t));
  }

  // -----------------------------------------------------------------
  toggleDoor(doorId) {
    if (this.state !== 'playing' || this.power.isBlackedOut) return;
    this.doors[doorId].toggleClosed();
    this.assetLoader.playSfx('doorToggle');
    UI.setDoorButtonsState(this.doors);
  }

  toggleLight(doorId) {
    if (this.state !== 'playing' || this.power.isBlackedOut) return;
    this.doors[doorId].toggleLight();
    this.assetLoader.playSfx('lightToggle');
    UI.setDoorButtonsState(this.doors);
  }

  toggleMonitor() {
    if (this.state !== 'playing' || this.power.isBlackedOut) return;
    if (!this.cameras.isOpen && !this.isOffsetCentral()) return; // bloqueado: não está olhando pro centro

    const isOpen = this.cameras.toggle(this.isOffsetCentral());
    document.getElementById('camera-monitor').classList.toggle('hidden', !isOpen);
    document.getElementById('office-controls').classList.toggle('hidden', isOpen);
    if (isOpen) {
      this.assetLoader.playSfx('cameraStatic', { volume: 0.4 });
      UI.setActiveCameraTab(this.cameras.currentRoomId);
    }
  }

  switchCameraRoom(roomId) {
    if (this.state !== 'playing' || !this.cameras.isOpen) return;
    this.cameras.switchRoom(roomId);
    this.assetLoader.playSfx('cameraStatic', { volume: 0.25 });
    UI.setActiveCameraTab(roomId);
  }

  // -----------------------------------------------------------------
  _onBlackout() {
    Object.values(this.doors).forEach((d) => {
      d.isClosed = false;
      d.lightOn = false;
    });
    this.cameras.close();
    document.getElementById('camera-monitor').classList.add('hidden');
    document.getElementById('office-controls').classList.add('hidden');
    this.assetLoader.playSfx('blackout');
  }

  _triggerJumpscare(enemyId) {
    this.state = 'jumpscare';
    UI.renderJumpscare(this.bufferCtx, this.buffer, this.assetLoader, enemyId);
    this._blitBuffer();
    this.assetLoader.playSfx('jumpscare', { volume: 1 });
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('office-controls').classList.add('hidden');
    document.getElementById('camera-monitor').classList.add('hidden');
    setTimeout(() => this._onGameOver(), 2200);
  }

  _onGameOver() {
    this.state = 'gameover';
    UI.showScreen('gameover-screen');
  }

  _onVictory() {
    this.state = 'victory';
    this.assetLoader.playSfx('victory');
    const isLast = this.nightIndex >= window.NIGHTS_CONFIG.length - 1;
    document.getElementById('victory-title').textContent = isLast
      ? 'Você sobreviveu a todas as noites!'
      : `${window.NIGHTS_CONFIG[this.nightIndex].label} concluída — são 6 da manhã!`;
    document.getElementById('btn-next-night').classList.toggle('hidden', isLast);
    UI.showScreen('victory-screen');
  }

  _blitBuffer() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(
      this.buffer, 0, 0, this.buffer.width, this.buffer.height,
      0, 0, this.canvas.width, this.canvas.height,
    );
  }

  // -----------------------------------------------------------------
  loop(now) {
    if (this.state !== 'playing') return;

    const deltaMs = Math.min(now - this.lastFrameTime, 200);
    this.lastFrameTime = now;
    this.elapsedNightMs += deltaMs;

    // Pan suave (lerp) em direção à posição do mouse.
    this.cameraOffsetX += (this.targetOffsetX - this.cameraOffsetX) * this.constants.MOUSE_PAN_SMOOTHING;

    const night = window.NIGHTS_CONFIG[this.nightIndex];

    // 1) Mecânica de lockNode (Freddy/Câm 2) — checada a cada frame.
    const lockedJumpscare = this.enemies.updateLocks(deltaMs, this.doors, this.cameras);
    if (lockedJumpscare) {
      this._triggerJumpscare(lockedJumpscare);
      return;
    }

    // 2) Energia
    this.power.tick(deltaMs / 1000, Object.values(this.doors), this.cameras.isOpen, night.powerDrainMultiplier);

    // 3) IA — movimentação em ticks discretos
    this.aiTickAccumulator += deltaMs;
    while (this.aiTickAccumulator >= this.constants.AI_TICK_INTERVAL_MS) {
      this.aiTickAccumulator -= this.constants.AI_TICK_INTERVAL_MS;
      const jumpscaredBy = this.enemies.tickAll({
        doors: this.doors,
        cameraSystem: this.cameras,
        nightAggression: night.aggression,
        constants: this.constants,
        tickIntervalMs: this.constants.AI_TICK_INTERVAL_MS,
        assetLoader: this.assetLoader,
      });
      if (jumpscaredBy) {
        this._triggerJumpscare(jumpscaredBy);
        return;
      }
    }

    // 4) Relógio / vitória
    if (this.elapsedNightMs >= this.constants.NIGHT_DURATION_MS) {
      this._onVictory();
      return;
    }
    const hourFloat = (this.elapsedNightMs / this.constants.NIGHT_DURATION_MS) * this.constants.HOURS_PER_NIGHT;

    // 5) Desenho: cena em baixa resolução -> upscale pixelado + estática
    this.bufferCtx.clearRect(0, 0, this.buffer.width, this.buffer.height);
    if (this.cameras.isOpen) {
      UI.renderCameraMonitor(this.bufferCtx, this.buffer, this.assetLoader, this);
    } else {
      UI.renderOffice(this.bufferCtx, this.buffer, this.assetLoader, this);
    }
    UI.drawStaticNoise(this.bufferCtx, this.buffer.width, this.buffer.height, this.constants.STATIC_NOISE_DENSITY);
    this._blitBuffer();

    UI.updateHud({
      powerPct: this.power.percentage,
      powerLow: this.power.isLow(),
      clockLabel: this._formatClock(hourFloat),
      nightLabel: night.label,
    });

    requestAnimationFrame((t) => this.loop(t));
  }

  _formatClock(hourFloat) {
    const h = Math.floor(hourFloat);
    const displayHour = h === 0 ? 12 : h;
    return `${displayHour}:00 AM`;
  }
}

window.Game = Game;
