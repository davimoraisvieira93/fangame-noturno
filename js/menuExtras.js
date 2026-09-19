(function () {
  function refreshMenu() {
    const unlocked = window.Progression ? window.Progression.isUnlocked() : true;
    const btnCustom = document.getElementById('btn-custom');
    const btnInfinite = document.getElementById('btn-infinite');
    const btnLeaderboard = document.getElementById('btn-leaderboard');

    if (btnCustom) btnCustom.classList.toggle('hidden', !unlocked);
    if (btnInfinite) btnInfinite.classList.toggle('hidden', !unlocked);
    if (btnLeaderboard) btnLeaderboard.classList.toggle('hidden', !unlocked);
  }
  window.refreshMenu = refreshMenu;

  window.addEventListener('DOMContentLoaded', () => {
    refreshMenu();

    const btnCustom = document.getElementById('btn-custom');
    if (btnCustom) {
      btnCustom.addEventListener('click', () => {
        if (window.stopMenuMusic) window.stopMenuMusic();
        buildCustomLevelsUI();
        UI.showScreen('custom-screen');
      });
    }

    const btnInfinite = document.getElementById('btn-infinite');
    if (btnInfinite) {
      btnInfinite.addEventListener('click', () => {
        if (window.stopMenuMusic) window.stopMenuMusic();
        if (window.game) window.game.startRun({ mode: 'infinite' });
      });
    }

    const btnLeaderboard = document.getElementById('btn-leaderboard');
    if (btnLeaderboard) {
      btnLeaderboard.addEventListener('click', () => {
        UI.renderLeaderboard(document.getElementById('menu-leaderboard-list'));
        UI.showScreen('leaderboard-screen');
      });
    }

    document.querySelectorAll('[data-action="back-to-menu"]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.stopMenuMusic) window.stopMenuMusic();
        if (window.refreshMenu) window.refreshMenu();
        UI.showScreen('menu-screen');
      });
    });

    const btnCustomStart = document.getElementById('btn-custom-start');
    if (btnCustomStart) {
      btnCustomStart.addEventListener('click', () => {
        const levels = {};
        document.querySelectorAll('.custom-level-input').forEach(input => {
          levels[input.dataset.enemy] = Number(input.value) || 0;
        });
        if (window.game) {
          window.game.startRun({ mode: 'custom', levels });
        }
      });
    }

    const btnClearLeaderboard = document.getElementById('btn-clear-leaderboard');
    if (btnClearLeaderboard) {
      btnClearLeaderboard.addEventListener('click', () => {
        if (window.Progression) {
          window.Progression.clearLeaderboard();
          UI.renderLeaderboard(document.getElementById('menu-leaderboard-list'));
        }
      });
    }
  });

  function buildCustomLevelsUI() {
    const container = document.getElementById('custom-levels');
    if (!container || !window.ENEMIES_CONFIG) return;
    container.innerHTML = '';
    window.ENEMIES_CONFIG.forEach(enemy => {
      const row = document.createElement('div');
      row.className = 'custom-row';
      row.innerHTML = `
        <span>${enemy.label || enemy.id}</span>
        <input type="number" min="0" max="20" value="0" class="custom-level-input" data-enemy="${enemy.id}" style="width: 60px; text-align: center;">
      `;
      container.appendChild(row);
    });
  }
})();
