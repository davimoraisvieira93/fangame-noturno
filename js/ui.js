const UI = {
  PLACEHOLDER_COLORS: {
    office: '#2b2f3a',
    cameras: '#1f2937',
    enemies: '#7f1d1d',
    ui: '#374151',
  },

  drawPlaceholder(ctx, x, y, w, h, label, group) {
    ctx.fillStyle = this.PLACEHOLDER_COLORS[group] || '#333';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2);
  },

  /** @param {boolean} jitter  aplica um leve tremor aleatório a cada frame */
  drawAsset(ctx, assetLoader, assetKey, x, y, w, h, group, jitter = false) {
    let dx = x;
    let dy = y;
    if (jitter) {
      const j = window.GAME_CONSTANTS.JITTER_MAX_PX;
      dx += Math.random() * j * 2 - j;
      dy += Math.random() * j * 2 - j;
    }
    const img = assetLoader.getImage(assetKey);
    if (img) {
      ctx.drawImage(img, dx, dy, w, h);
    } else {
      this.drawPlaceholder(ctx, dx, dy, w, h, assetKey, group);
    }
  },

  drawLightingOverlay(ctx, w, h) {
    const gradient = ctx.createRadialGradient(w * 0.92, h * 0.05, 0, w * 0.92, h * 0.05, w * 0.8);
    gradient.addColorStop(0, 'rgba(255, 214, 140, 0.35)');
    gradient.addColorStop(1, 'rgba(255, 214, 140, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  },

  /** Ruído estilo fita VHS: riscos translúcidos + uma linha de tracking ocasional. */
  drawStaticNoise(ctx, w, h, density) {
    ctx.save();
    for (let i = 0; i < density; i += 1) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const rw = Math.random() * 3 + 1;
      const rh = Math.random() * 1.5 + 0.5;
      ctx.fillStyle = `rgba(255,255,255,${(Math.random() * 0.12).toFixed(3)})`;
      ctx.fillRect(x, y, rw, rh);
    }
    if (Math.random() < 0.05) {
      const ly = Math.random() * h;
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(0, ly, w, 2);
    }
    ctx.restore();
  },

  // -------------------------------------------------------------------
  // TELA: ESCRITÓRIO — panorama 180° com pan pelo mouse (game.cameraOffsetX)
  // -------------------------------------------------------------------
  renderOffice(ctx, canvas, assetLoader, game) {
    const { width: w, height: h } = canvas;
    const worldW = window.GAME_CONSTANTS.OFFICE_WORLD_WIDTH;
    const offsetX = game.cameraOffsetX;

    this.drawAsset(ctx, assetLoader, 'office.background', -offsetX, 0, worldW, h, 'office');

    const doorW = w * 0.42;
    const doorH = h * 0.62;
    const doorY = h - doorH;
    const doorWorldX = { esquerda: 10, direita: worldW - doorW - 10 };

    Object.values(game.doors).forEach((door) => {
      const x = doorWorldX[door.id] - offsetX;
      if (x + doorW < 0 || x > w) return; // fora do campo de visão atual

      const enemyHere = game.enemies.getAtDoor(door.id);
      const revealed = enemyHere && enemyHere.isRevealedAtDoor(door.id, game.doors);

      if (revealed) {
        this.drawAsset(ctx, assetLoader, `enemies.${enemyHere.id}.naPorta`, x, doorY, doorW, doorH, 'enemies', true);
      } else if (door.lightOn) {
        ctx.fillStyle = '#4b5563';
        ctx.fillRect(x, doorY, doorW, doorH);
      } else {
        ctx.fillStyle = '#0b0d12';
        ctx.fillRect(x, doorY, doorW, doorH);
      }

      ctx.lineWidth = 6;
      ctx.strokeStyle = door.isClosed ? '#22c55e' : '#ef4444';
      ctx.strokeRect(x, doorY, doorW, doorH);

      ctx.fillStyle = '#e5e7eb';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(door.label.toUpperCase(), x + doorW / 2, doorY - 8);
    });

    this.drawLightingOverlay(ctx, w, h);

    if (game.power.isBlackedOut) {
      ctx.fillStyle = 'rgba(0,0,0,0.86)';
      ctx.fillRect(0, 0, w, h);
      const flicker = 0.5 + 0.5 * Math.sin(Date.now() / 180);
      ctx.fillStyle = `rgba(194,59,59,${0.4 + flicker * 0.6})`;
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SEM ENERGIA', w / 2, h / 2);
    }
  },

  // -------------------------------------------------------------------
  // TELA: MONITOR DE CÂMERAS
  // -------------------------------------------------------------------
  renderCameraMonitor(ctx, canvas, assetLoader, game) {
    const { width: w, height: h } = canvas;
    const roomId = game.cameras.currentRoomId;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    if (game.cameras.isFlashingStatic(window.GAME_CONSTANTS.CAMERA_STATIC_FLASH_MS)) {
      this.drawAsset(ctx, assetLoader, 'cameras.static', 0, 0, w, h, 'cameras');
      return;
    }

    this.drawAsset(ctx, assetLoader, `cameras.${roomId}`, 0, 0, w, h, 'cameras', true);

    game.enemies.getVisibleInRoom(roomId).forEach((enemy) => {
      this.drawAsset(ctx, assetLoader, `enemies.${enemy.id}.${roomId}`, w * 0.3, h * 0.25, w * 0.4, h * 0.6, 'enemies', true);
    });

    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    const label = (window.ROOMS.find((r) => r.id === roomId) || {}).label || roomId;
    ctx.fillText(`● REC   ${label}`, 16, 28);
  },

  // -------------------------------------------------------------------
  // TELA: JUMPSCARE
  // -------------------------------------------------------------------
  renderJumpscare(ctx, canvas, assetLoader, enemyId) {
    const { width: w, height: h } = canvas;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    this.drawAsset(ctx, assetLoader, `enemies.${enemyId}.jumpscare`, 0, 0, w, h, 'enemies');
  },

  // -------------------------------------------------------------------
  // HUD / DOM
  // -------------------------------------------------------------------
  updateHud({ powerPct, powerLow, clockLabel, nightLabel }) {
    const powerEl = document.getElementById('hud-power-value');
    const powerWrap = document.getElementById('hud-power');
    const clockEl = document.getElementById('hud-clock-value');
    const nightEl = document.getElementById('hud-night-value');

    if (powerEl) powerEl.textContent = `${powerPct}%`;
    if (powerWrap) powerWrap.classList.toggle('low', powerLow);
    if (clockEl) clockEl.textContent = clockLabel;
    if (nightEl) nightEl.textContent = nightLabel;
  },

  setDoorButtonsState(doors) {
    Object.values(doors).forEach((door) => {
      const closeBtn = document.querySelector(`[data-action="toggle-door"][data-door="${door.id}"]`);
      const lightBtn = document.querySelector(`[data-action="toggle-light"][data-door="${door.id}"]`);
      if (closeBtn) closeBtn.classList.toggle('active', door.isClosed);
      if (lightBtn) lightBtn.classList.toggle('active', door.lightOn);
    });
  },

  buildCameraTabs(rooms, onSelect) {
    const container = document.getElementById('camera-tabs');
    if (!container) return;
    container.innerHTML = '';
    rooms.forEach((room) => {
      const btn = document.createElement('button');
      btn.className = 'camera-tab';
      btn.textContent = room.label;
      btn.dataset.room = room.id;
      btn.addEventListener('click', () => onSelect(room.id));
      container.appendChild(btn);
    });
  },

  setActiveCameraTab(roomId) {
    document.querySelectorAll('.camera-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.room === roomId);
    });
  },

  showScreen(id) {
    document.querySelectorAll('.screen').forEach((el) => el.classList.add('hidden'));
    const target = document.getElementById(id);
    if (target) target.classList.remove('hidden');
  },

  hideAllScreens() {
    document.querySelectorAll('.screen').forEach((el) => el.classList.add('hidden'));
  },
};

window.UI = UI;
