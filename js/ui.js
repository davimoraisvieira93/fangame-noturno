/**
 * ui.js
 * ---------------------------------------------------------------------------
 * Todo o desenho no <canvas> passa por aqui, e tudo passa primeiro pela
 * mesma pergunta: "existe uma imagem real carregada para esta chave?".
 * Se sim, desenha a imagem. Se não (placeholder), desenha um retângulo
 * colorido com o nome da chave escrito — assim dá pra jogar (e ver
 * exatamente o que falta substituir) mesmo sem nenhum asset seu ainda.
 *
 * As telas de texto (menu, fim de noite, game over) são <div> comuns em
 * HTML/CSS — é mais simples de estilizar e deixar acessível do que
 * desenhar texto de UI inteiro no canvas.
 * ---------------------------------------------------------------------------
 */

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

  /** Desenha assetKey (ex.: "cameras.cozinha") em (x,y,w,h), com fallback. */
  drawAsset(ctx, assetLoader, assetKey, x, y, w, h, group) {
    const img = assetLoader.getImage(assetKey);
    if (img) {
      ctx.drawImage(img, x, y, w, h);
    } else {
      this.drawPlaceholder(ctx, x, y, w, h, assetKey, group);
    }
  },

  // -------------------------------------------------------------------
  // TELA: ESCRITÓRIO (visão padrão do jogador)
  // -------------------------------------------------------------------
  renderOffice(ctx, canvas, assetLoader, game) {
    const { width: w, height: h } = canvas;
    this.drawAsset(ctx, assetLoader, 'office.background', 0, 0, w, h, 'office');

    // Duas "janelas de porta" nas laterais, cada uma mostrando o inimigo
    // SOMENTE se a luz daquela porta estiver acesa e ele estiver lá.
    const doorW = w * 0.22;
    const doorH = h * 0.5;
    const doorY = h - doorH - 20;
    const positions = { esquerda: 20, direita: w - doorW - 20 };

    Object.values(game.doors).forEach((door) => {
      const x = positions[door.id];
      const enemyHere = game.enemies.getAtDoor(door.id);
      const revealed = enemyHere && enemyHere.isRevealedAtDoor(door.id, game.doors);

      if (revealed) {
        this.drawAsset(
          ctx, assetLoader, `enemies.${enemyHere.id}.naPorta`,
          x, doorY, doorW, doorH, 'enemies',
        );
      } else if (door.lightOn) {
        // Luz acesa, ninguém lá: corredor vazio e iluminado.
        ctx.fillStyle = '#4b5563';
        ctx.fillRect(x, doorY, doorW, doorH);
      } else {
        // Escuro / sem checagem.
        ctx.fillStyle = '#0b0d12';
        ctx.fillRect(x, doorY, doorW, doorH);
      }

      // Moldura da porta: verde = fechada (segura), vermelha = aberta.
      ctx.lineWidth = 6;
      ctx.strokeStyle = door.isClosed ? '#22c55e' : '#ef4444';
      ctx.strokeRect(x, doorY, doorW, doorH);

      ctx.fillStyle = '#e5e7eb';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(door.label.toUpperCase(), x + doorW / 2, doorY - 8);
    });

    // Apagão: escurece a cena inteira e pisca um aviso — nada mais
    // funciona a partir daqui (ver game.js -> _onBlackout).
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

    // Breve "ruído" ao trocar de câmera, antes de assentar na imagem do cômodo.
    if (game.cameras.isFlashingStatic(window.GAME_CONSTANTS.CAMERA_STATIC_FLASH_MS)) {
      this.drawAsset(ctx, assetLoader, 'cameras.static', 0, 0, w, h, 'cameras');
      return;
    }

    this.drawAsset(ctx, assetLoader, `cameras.${roomId}`, 0, 0, w, h, 'cameras');

    // Inimigo(s) visível(is) nesse cômodo agora.
    game.enemies.getVisibleInRoom(roomId).forEach((enemy) => {
      this.drawAsset(
        ctx, assetLoader, `enemies.${enemy.id}.${roomId}`,
        w * 0.3, h * 0.25, w * 0.4, h * 0.6, 'enemies',
      );
    });

    // Moldura "modo câmera" + rótulo do cômodo.
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
  // HUD (textos fora do canvas)
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
