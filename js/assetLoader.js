/**
 * assetLoader.js
 * ---------------------------------------------------------------------------
 * Responsável por carregar todas as imagens/sons listados em config.js.
 *
 * Ponto-chave da modularidade: se um arquivo de imagem ainda não existe
 * (por exemplo, você ainda não tirou a foto do "quintal"), o loader NÃO
 * trava o jogo. Ele marca aquele asset como "placeholder" e o desenho.js
 * (ui.js) desenha um retângulo colorido com o nome do asset escrito nele.
 *
 * Assim o jogo é 100% jogável desde o primeiro `git clone`, e cada imagem
 * some do modo "placeholder" automaticamente assim que você adiciona o
 * arquivo real com o mesmo nome/caminho.
 * ---------------------------------------------------------------------------
 */

class AssetLoader {
  constructor() {
    this.images = {}; // chave "grupo.subchave" -> HTMLImageElement | null
    this.placeholders = new Set(); // quais chaves caíram no fallback
    this.audio = {}; // chave -> HTMLAudioElement (sempre existe, mesmo sem arquivo)
  }

  /**
   * Percorre o objeto ASSETS.images recursivamente e tenta carregar cada
   * caminho. Retorna uma Promise que resolve quando TODAS as tentativas
   * terminarem (com sucesso ou fallback — nunca rejeita).
   */
  async loadAll(assets) {
    const imageJobs = [];
    this._collectImageJobs(assets.images, [], imageJobs);
    await Promise.all(imageJobs.map((job) => this._loadImage(job.key, job.path)));

    // Áudio: apenas instanciamos o <audio>; se o arquivo não existir, o
    // navegador vai disparar erro só quando tentarmos dar play, e o
    // helper playSfx() abaixo engole esse erro silenciosamente.
    Object.entries(assets.audio).forEach(([key, path]) => {
      const el = new Audio(path);
      el.preload = 'auto';
      this.audio[key] = el;
    });
  }

  _collectImageJobs(node, pathParts, out) {
    Object.entries(node).forEach(([key, value]) => {
      if (typeof value === 'string') {
        out.push({ key: [...pathParts, key].join('.'), path: value });
      } else if (value && typeof value === 'object') {
        this._collectImageJobs(value, [...pathParts, key], out);
      }
    });
  }

  _loadImage(key, path) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.images[key] = img;
        resolve();
      };
      img.onerror = () => {
        this.images[key] = null; // sinaliza placeholder
        this.placeholders.add(key);
        resolve(); // nunca falha o carregamento geral
      };
      img.src = path;
    });
  }

  /** Retorna a imagem carregada ou null se estiver em modo placeholder. */
  getImage(key) {
    return this.images[key] || null;
  }

  isPlaceholder(key) {
    return this.placeholders.has(key);
  }

  /** Toca um efeito sonoro sem travar o jogo caso o arquivo não exista. */
  playSfx(key, { loop = false, volume = 1 } = {}) {
    const base = this.audio[key];
    if (!base) return;
    // Clona o elemento para permitir sons sobrepostos (ex.: batidas rápidas).
    const el = loop ? base : base.cloneNode(true);
    el.loop = loop;
    el.volume = volume;
    el.play().catch(() => {
      /* arquivo ausente ou navegador bloqueou autoplay — ignorar */
    });
    return el;
  }

  stopSfx(el) {
    if (!el) return;
    el.pause();
    el.currentTime = 0;
  }
}

window.AssetLoader = AssetLoader;
