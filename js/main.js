(function bootstrap() {
  const canvas = document.getElementById('game-canvas');
  const loader = new AssetLoader();
  let game = null;

  const BEATBOX_SRC = 'assets/audio/sfx/beatbox.mp3';
  const beatboxMusic = new Audio(BEATBOX_SRC);
  beatboxMusic.loop = true;
  beatboxMusic.volume = 0.6;
  let musicStopped = false;

  const loadingScreen = document.getElementById('loading-screen');
  const menuScreen = document.getElementById('menu-screen');

  function stopMenuMusic() {
    musicStopped = true;
    try {
      beatboxMusic.pause();
      beatboxMusic.currentTime = 0;
      beatboxMusic.muted = true;
      beatboxMusic.volume = 0;
      beatboxMusic.src = '';
    } catch (e) {
      console.log('Erro ao pausar:', e);
    }
  }
  window.stopMenuMusic = stopMenuMusic;

  function resumeMenuMusic() {
    if (musicStopped) {
      beatboxMusic.src = BEATBOX_SRC;
      beatboxMusic.volume = 0.6;
      musicStopped = false;
    }
    beatboxMusic.muted = false;
    beatboxMusic.play().catch(() => {});
  }

  function goToMenu() {
    resumeMenuMusic();
    if (window.refreshMenu) window.refreshMenu();
    UI.showScreen('menu-screen');
  }

  loader.loadAll(window.ASSETS).then(() => {
    game = new Game(canvas, loader);
    window.game = game;

    UI.hideAllScreens();
    UI.showScreen('menu-screen');
    loadingScreen.classList.add('hidden');
    if (window.refreshMenu) window.refreshMenu();

    setTimeout(() => {
      beatboxMusic.play().catch(() => {
        document.body.addEventListener('click', () => {
          if (!musicStopped && beatboxMusic.paused && menuScreen.style.display !== 'none') {
            beatboxMusic.play().catch(() => {});
          }
        }, { once: true });
      });
    }, 200);

    wireMenuButtons();
    wireOfficeControls();
    wireCameraMonitor();
    wireEndScreens();
    wireKeyboardShortcuts();
  });

  function wireMenuButtons() {
    document.getElementById('btn-start').addEventListener('click', () => {
      stopMenuMusic();
      game.startNight(0);
    });
  }

  function wireOfficeControls() {
    document.querySelectorAll('[data-action="toggle-door"]').forEach((btn) => {
      btn.addEventListener('click', () => game.toggleDoor(btn.dataset.door));
    });
    document.querySelectorAll('[data-action="toggle-light"]').forEach((btn) => {
      btn.addEventListener('click', () => game.toggleLight(btn.dataset.door));
    });
    document.getElementById('btn-open-monitor').addEventListener('click', () => {
      game.toggleMonitor();
    });
  }

  function wireCameraMonitor() {
    document.getElementById('btn-close-monitor').addEventListener('click', () => {
      game.toggleMonitor();
    });
  }

  function wireEndScreens() {
    document.getElementById('btn-retry').addEventListener('click', () => {
      game.restart();
    });
    document.getElementById('btn-menu-gameover').addEventListener('click', goToMenu);
    document.getElementById('btn-next-night').addEventListener('click', () => {
      game.startNight(game.nightIndex + 1);
    });
    document.getElementById('btn-menu-victory').addEventListener('click', goToMenu);
  }

  function wireKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (!game || game.state !== 'playing' || e.repeat) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowleft')  { e.preventDefault(); game.turn(-1); }
      if (k === 'arrowright') { e.preventDefault(); game.turn(1); }
      if (k === 'a') game.toggleDoor('esquerda');
      if (k === 'd') game.toggleDoor('direita');
      if (k === 'q') game.toggleLight('esquerda');
      if (k === 'e') game.toggleLight('direita');
      if (k === ' ') { e.preventDefault(); game.toggleMonitor(); }
    });
  }
})();
