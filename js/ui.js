const UI = {
  PLACEHOLDER_COLORS: { office: '#2b2f3a', cameras: '#1f2937', enemies: '#7f1d1d', ui: '#374151' },

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

  drawAsset(ctx, assetLoader, assetKey, x, y, w, h, group, jitter = false) {
    let dx = x, dy = y;
    if (jitter) {
      const j = window.GAME_CONSTANTS.JITTER_MAX_PX;
      dx += Math.random() * j * 2 - j;
      dy += Math.random() * j * 2 - j;
    }
    const img = assetLoader.getImage(assetKey);
    if (img) ctx.drawImage(img, dx, dy, w, h);
    else this.drawPlaceholder(ctx, dx, dy, w, h, assetKey, group);
  },

  drawLightingOverlay(ctx, w, h) {
    const gradient = ctx.createRadialGradient(w * 0.92, h * 0.05, 0, w * 0.92, h * 0.05, w * 0.8);
    gradient.addColorStop(0, 'rgba(255, 214, 140, 0.35)');
    gradient.addColorStop(1, 'rgba(255, 214, 140, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  },

  drawStaticNoise(ctx, w, h, density) {
    ctx.save();
    for (let i = 0; i < density; i += 1) {
      const x = Math.random() * w, y = Math.random() * h;
      const rw = Math.random() * 3 + 1, rh = Math.random() * 1.5 + 0.5;
      ctx.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.12).toFixed(3) + ')';
      ctx.fillRect(x, y, rw, rh);
    }
    if (Math.random() < 0.05) {
      const ly = Math.random() * h;
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(0, ly, w, 2);
    }
    ctx.restore();
  },

  assetPath(key) {
    const parts = key.split('.');
    let o = window.ASSETS.images;
    for (let i = 0; i < parts.length; i++) {
      if (o && o[parts[i]] !== undefined) {
        o = o[parts[i]];
      } else {
        return null;
      }
    }
    return typeof o === 'string' ? o : null;
  },

  setEnemyOverlays(srcs) {
    const layer = document.getElementById('enemy-layer');
    if (!layer) return;
    const list = srcs.filter(Boolean);
    const sig = list.join('|');
    if (layer.dataset.sig === sig) return;
    layer.dataset.sig = sig;
    layer.innerHTML = '';
    list.forEach(function(src) {
      const img = new Image();
      img.src = src;
      img.className = 'enemy-sprite';
      img.onerror = function() { img.remove(); };
      layer.appendChild(img);
    });
  },

  renderOffice(ctx, canvas, assetLoader, game) {
    const w = canvas.width;
    const h = canvas.height;
    const worldW = window.GAME_CONSTANTS.OFFICE_WORLD_WIDTH;
    const offsetX = game.cameraOffsetX;
    const overlays = [];

    this.drawAsset(ctx, assetLoader, 'office.background', -offsetX, 0, worldW, h, 'office');

    const doorsKeys = Object.keys(game.doors);
    for (let i = 0; i < doorsKeys.length; i++) {
      const doorId = doorsKeys[i];
      const door = game.doors[doorId];
      const b = window.DOOR_HITBOXES[door.id];
      const x = b.x * worldW - offsetX;
      const y = b.y * h;
      const bw = b.w * worldW;
      const bh = b.h * h;
      if (x + bw < 0 || x > w) continue;

      const cap = door.id.charAt(0).toUpperCase() + door.id.slice(1);
      const stateStr = door.isClosed ? 'Fechada' : 'Aberta';
      const spriteKey = 'office.door' + cap + stateStr;
      const sprite = assetLoader.getImage(spriteKey);
      
      if (sprite) {
        ctx.drawImage(sprite, x, y, bw, bh);
      } else if (door.isClosed) {
        ctx.fillStyle = 'rgba(34,197,94,0.22)';
        ctx.fillRect(x, y, bw, bh);
      }

      if (door.lightOn) {
        ctx.fillStyle = 'rgba(255,214,140,0.18)';
        ctx.fillRect(x, y, bw, bh);
      }

      const enemyHere = game.enemies.getAtDoor(door.id);
      if (enemyHere && enemyHere.isRevealedAtDoor(door.id, game.doors) && game.view === door.id) {
        const p = this.assetPath('enemies.' + enemyHere.id + '.naPorta');
        if (p) overlays.push(p);
      }

      const bob = Math.sin(Date.now() / 500) * 2;
      ctx.fillStyle = '#e5e7eb';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(door.label.toUpperCase(), x + bw / 2, y - 8 + bob);
    }

    this.drawLightingOverlay(ctx, w, h);

    if (game.power.isBlackedOut) {
      ctx.fillStyle = 'rgba(0,0,0,0.86)';
      ctx.fillRect(0, 0, w, h);
      const flicker = 0.5 + 0.5 * Math.sin(Date.now() / 180);
      ctx.fillStyle = 'rgba(194,59,59,' + (0.4 + flicker * 0.6) + ')';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SEM ENERGIA', w / 2, h / 2);
    }
    return overlays;
  },

  renderCameraMonitor(ctx, canvas, assetLoader, game) {
    const w = canvas.width;
    const h = canvas.height;
    const roomId = game.cameras.currentRoomId;
    const overlays = [];

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    if (game.cameras.isFlashingStatic(window.GAME_CONSTANTS.CAMERA_STATIC_FLASH_MS)) {
      this.drawAsset(ctx, assetLoader, 'cameras.static', 0, 0, w, h, 'cameras');
      return overlays;
    }

    this.drawAsset(ctx, assetLoader, 'cameras.' + roomId, 0, 0, w, h, 'cameras', true);

    const visibleEnemies = game.enemies.getVisibleInRoom(roomId);
    for (let i = 0; i < visibleEnemies.length; i++) {
      const enemy = visibleEnemies[i];
      const p = this.assetPath('enemies.' + enemy.id + '.' + roomId);
      if (p) overlays.push(p);
    }

    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    
    let roomLabel = roomId;
    for (let i = 0; i < window.ROOMS.length; i++) {
      if (window.ROOMS[i].id === roomId) {
        roomLabel = window.ROOMS[i].label;
        break;
      }
    }
    ctx.fillText('● REC   ' + roomLabel, 16, 28);
    return overlays;
  },

  renderJumpscare(ctx, canvas, assetLoader, enemyId) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return [this.assetPath('enemies.' + enemyId + '.jumpscare')];
  },

  updateHud({ powerPct, powerLow, clockLabel, nightLabel }) {
    const powerEl = document.getElementById('hud-power-value');
    const powerWrap = document.getElementById('hud-power');
    const clockEl = document.getElementById('hud-clock-value');
    const nightEl = document.getElementById('hud-night-value');
    if (powerEl) powerEl.textContent = powerPct + '%';
    if (powerWrap) powerWrap.classList.toggle('low', powerLow);
    if (clockEl) clockEl.textContent = clockLabel;
    if (nightEl) nightEl.textContent = nightLabel;
  },

  setDoorButtonsState(doors) {
    const doorKeys = Object.keys(doors);
    for (let i = 0; i < doorKeys.length; i++) {
      const door = doors[doorKeys[i]];
      const closeBtn = document.querySelector('[data-action="toggle-door"][data-door="' + door.id + '"]');
      const lightBtn = document.querySelector('[data-action="toggle-light"][data-door="' + door.id + '"]');
      if (closeBtn) closeBtn.classList.toggle('active', door.isClosed);
      if (lightBtn) lightBtn.classList.toggle('active', door.lightOn);
    }
  },

  syncControls(game) {
    const idx = game.viewIndex;
    const show = !game.cameras.isOpen && !game.power.isBlackedOut;
    const set = function(el, visible) { if (el) el.classList.toggle('hidden', !visible); };

    set(document.getElementById('nav-left'), show && idx > 0);
    set(document.getElementById('nav-right'), show && idx < window.VIEWS.length - 1);
    set(document.getElementById('btn-open-monitor'), show && game.view === 'centro');
    
    document.querySelectorAll('.door-panel').forEach(function(el) {
      set(el, show && game.view === el.dataset.door);
    });
  },

  buildCameraTabs(rooms, onSelect) {
    const container = document.getElementById('camera-tabs');
    if (!container) return;
    container.innerHTML = '';
    rooms.forEach(function(room) {
      const btn = document.createElement('button');
      btn.className = 'camera-tab';
      btn.textContent = room.label;
      btn.dataset.room = room.id;
      btn.addEventListener('click', function() { onSelect(room.id); });
      container.appendChild(btn);
    });
  },

  setActiveCameraTab(roomId) {
    document.querySelectorAll('.camera-tab').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.room === roomId);
    });
  },

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(function(el) { el.classList.add('hidden'); });
    const target = document.getElementById(id);
    if (target) target.classList.remove('hidden');
  },

  hideAllScreens() {
    document.querySelectorAll('.screen').forEach(function(el) { el.classList.add('hidden'); });
  },

  renderLeaderboard(listEl, highlightRank = null) {
    if (!listEl) return;
    const list = window.Progression.getLeaderboard();
    listEl.innerHTML = '';
    if (!list.length) { listEl.innerHTML = '<li class="empty">Sem registros ainda.</li>'; return; }
    list.forEach(function(e, i) {
      const li = document.createElement('li');
      li.textContent = window.Progression.formatTime(e.ms) + '  —  ' + new Date(e.date).toLocaleDateString('pt-BR');
      if (highlightRank === i + 1) li.classList.add('highlight');
      listEl.appendChild(li);
    });
  },
};

window.UI = UI;
