/**
 * main.js
 * ---------------------------------------------------------------------------
 * Ponto de entrada. Só faz três coisas:
 *   1) Pré-carrega todos os assets (com fallback para placeholders).
 *   2) Cria a instância única de Game.
 *   3) Liga cada botão/tecla da interface a um método público de Game.
 * ---------------------------------------------------------------------------
 */

(function bootstrap() {
  const canvas = document.getElementById('game-canvas');
  const loader = new AssetLoader();
  let game = null;

  const loadingScreen = document.getElementById('loading-screen');
  const menuScreen = document.getElementById('menu-screen');

  loader.loadAll(window.ASSETS).then(() => {
    game = new Game(canvas, loader);
    UI.hideAllScreens();
    UI.showScreen('menu-screen');
    loadingScreen.classList.add('hidden');

    wireMenuButtons();
    wireOfficeControls();
    wireCameraMonitor();
    wireEndScreens();
    wireKeyboardShortcuts();
  });

  function wireMenuButtons() {
    document.getElementById('btn-start').addEventListener('click', () => {
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
      game.startNight(game.nightIndex);
    });
    document.getElementById('btn-menu-gameover').addEventListener('click', () => {
      UI.showScreen('menu-screen');
    });
    document.getElementById('btn-next-night').addEventListener('click', () => {
      game.startNight(game.nightIndex + 1);
    });
    document.getElementById('btn-menu-victory').addEventListener('click', () => {
      UI.showScreen('menu-screen');
    });
  }

  // Atalhos de teclado opcionais (comente esta função se não quiser usá-los).
  function wireKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (!game || game.state !== 'playing') return;
      if (e.key === 'a') game.toggleDoor('esquerda');
      if (e.key === 'd') game.toggleDoor('direita');
      if (e.key === 'q') game.toggleLight('esquerda');
      if (e.key === 'e') game.toggleLight('direita');
      if (e.key === ' ') { e.preventDefault(); game.toggleMonitor(); }
    });
  }
})();
