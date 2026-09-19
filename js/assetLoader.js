const AssetLoader = {
  images: {},
  audio: {},

  loadAll(onProgress, onComplete) {
    let total = 0;
    let loaded = 0;
    let finished = false;

    const checkDone = () => {
      if (finished) return;
      loaded++;
      if (onProgress) onProgress(loaded, total);
      if (loaded >= total) {
        finished = true;
        if (onComplete) onComplete();
      }
    };

    // Conta quantas imagens existem na config
    if (window.ASSETS && window.ASSETS.images) {
      const countImages = (obj) => {
        for (let k in obj) {
          if (typeof obj[k] === 'string') total++;
          else if (typeof obj[k] === 'object' && obj[k] !== null) countImages(obj[k]);
        }
      };
      countImages(window.ASSETS.images);
    }

    // Conta quantos áudios existem na config
    if (window.ASSETS && window.ASSETS.audio) {
      for (let k in window.ASSETS.audio) {
        total++;
      }
    }

    if (total === 0) {
      if (onComplete) onComplete();
      return;
    }

    // Carrega imagens com segurança (se falhar 404, avança do mesmo jeito)
    const loadImagesRecursive = (obj, targetObj) => {
      for (let k in obj) {
        if (typeof obj[k] === 'string') {
          const img = new Image();
          targetObj[k] = img;
          
          let resolved = false;
          const resolveOnce = () => {
            if (!resolved) {
              resolved = true;
              checkDone();
            }
          };

          img.onload = resolveOnce;
          img.onerror = resolveOnce; // Se der 404, pula e não trava o jogo
          img.src = obj[k];

          // Segurança extra: se demorar mais de 1.5s, força continuar
          setTimeout(resolveOnce, 1500);

        } else if (typeof obj[k] === 'object' && obj[k] !== null) {
          targetObj[k] = {};
          loadImagesRecursive(obj[k], targetObj[k]);
        }
      }
    };

    if (window.ASSETS && window.ASSETS.images) {
      loadImagesRecursive(window.ASSETS.images, this.images);
    }

    // Carrega áudios com segurança
    if (window.ASSETS && window.ASSETS.audio) {
      for (let k in window.ASSETS.audio) {
        const snd = new Audio();
        this.audio[k] = snd;

        let resolved = false;
        const resolveOnce = () => {
          if (!resolved) {
            resolved = true;
            checkDone();
          }
        };

        snd.oncanplaythrough = resolveOnce;
        snd.onerror = resolveOnce; // Se falhar o som, pula e não trava
        snd.src = window.ASSETS.audio[k];

        setTimeout(resolveOnce, 1500);
      }
    }
  },

  getImage(keyPath) {
    const parts = keyPath.split('.');
    let curr = this.images;
    for (let i = 0; i < parts.length; i++) {
      if (curr && curr[parts[i]] !== undefined) {
        curr = curr[parts[i]];
      } else {
        return null;
      }
    }
    return curr instanceof HTMLImageElement ? curr : null;
  },

  getAudio(key) {
    return this.audio[key] || null;
  }
};

window.AssetLoader = AssetLoader;
