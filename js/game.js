/**
 * game.js
 * ---------------------------------------------------------------------------
 * Orquestra tudo: cria os sistemas (portas, energia, câmeras, inimigos),
 * roda o loop principal (requestAnimationFrame) e reage aos eventos de
 * fim de noite (vitória às 6h, apagão, jumpscare/derrota).
 *
 * Este arquivo NÃO conhece nada sobre onde estão os botões na tela — ele
 * só expõe métodos públicos (toggleDoor, toggleLight, toggleMonitor,
 * switchCameraRoom, startNight). Quem liga esses métodos aos cliques do
 * usuário é o main.js. Essa separação é o que torna fácil, por exemplo,
 * adicionar controles por teclado no futuro sem tocar em game.js.
 * ---------------------------------------------------------------------------
 */

class Game {
  constructor(canvas, assetLoader) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.assetLoader = assetLoader;
    this.constants = window.GAME_CONSTANTS;

    this.doors = createDoors(window.DOORS_CONFIG);
    this.power = new PowerSystem(this.constants, () => this._onBlackout());
    this.cameras = new CameraSystem(window.ROOMS);
    this.enemies = new EnemyManager(window.ENEMIES_CONFIG);

    this.nightIndex = 0;
    this.state = 'menu'; // menu | playing | jumpscare | gameover | victory
    this.elapsedNightMs = 0;
    this.aiTickAccumulator = 0;
    this.lastFrameTime = 0;

    UI.buildCameraTabs(window.ROOMS, (roomId) => this.switchCameraRoom(roomId));
  }

  // -----------------------------------------------------------------
  // CICLO DE VIDA DA NOITE
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
  // AÇÕES DO JOGADOR (chamadas pelo main.js a partir dos cliques)
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
    const isOpen = this.cameras.toggle();
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
  // EVENTOS DE SISTEMA
  // -----------------------------------------------------------------
  _onBlackout() {
    // A partir daqui: nada mais funciona (nem portas nem luzes nem
    // câmeras) — as guardas isBlackedOut nos métodos acima cuidam disso.
    // As portas ficam destrancadas/abertas, então qualquer inimigo que
    // chegar a uma delas vai direto para o cronômetro de ataque.
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
    UI.renderJumpscare(this.ctx, this.canvas, this.assetLoader, enemyId);
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

  // -----------------------------------------------------------------
  // LOOP PRINCIPAL
  // -----------------------------------------------------------------
  loop(now) {
    if (this.state !== 'playing') return; // telas cheias (CSS) cuidam do resto

    const deltaMs = Math.min(now - this.lastFrameTime, 200); // trava picos (aba em segundo plano etc.)
    this.lastFrameTime = now;
    this.elapsedNightMs += deltaMs;

    const night = window.NIGHTS_CONFIG[this.nightIndex];

    // 1) Energia
    this.power.tick(
      deltaMs / 1000,
      Object.values(this.doors),
      this.cameras.isOpen,
      night.powerDrainMultiplier,
    );

    // 2) IA — processada em ticks discretos, não a cada frame de canvas.
    this.aiTickAccumulator += deltaMs;
    while (this.aiTickAccumulator >= this.constants.AI_TICK_INTERVAL_MS) {
      this.aiTickAccumulator -= this.constants.AI_TICK_INTERVAL_MS;
      const jumpscaredBy = this.enemies.tickAll({
        doors: this.doors,
        cameraSystem: this.cameras,
        nightAggression: night.aggression,
        constants: this.constants,
        tickIntervalMs: this.constants.AI_TICK_INTERVAL_MS,
      });
      if (jumpscaredBy) {
        this._triggerJumpscare(jumpscaredBy);
        return;
      }
    }

    // 3) Relógio da noite / condição de vitória
    if (this.elapsedNightMs >= this.constants.NIGHT_DURATION_MS) {
      this._onVictory();
      return;
    }
    const hourFloat = (this.elapsedNightMs / this.constants.NIGHT_DURATION_MS)
      * this.constants.HOURS_PER_NIGHT;

    // 4) Desenho
    if (this.cameras.isOpen) {
      UI.renderCameraMonitor(this.ctx, this.canvas, this.assetLoader, this);
    } else {
      UI.renderOffice(this.ctx, this.canvas, this.assetLoader, this);
    }
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
