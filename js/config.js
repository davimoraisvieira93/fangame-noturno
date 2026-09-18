/**
 * config.js
 * ---------------------------------------------------------------------------
 * ARQUIVO MAIS IMPORTANTE PARA A PERSONALIZAÇÃO DO JOGO.
 *
 * Tudo o que é "visual" ou "sonoro" no jogo está mapeado aqui dentro do
 * objeto ASSETS. O código do jogo (js/*.js) nunca tem um caminho de imagem
 * ou som "hard-coded" fora deste arquivo — ele sempre pergunta a este
 * objeto qual arquivo usar.
 *
 * Isso significa que, para trocar qualquer sprite ou som pela foto da sua
 * casa/família/pets, você NÃO precisa mexer em nenhuma lógica do jogo:
 * basta colocar o arquivo novo na pasta indicada, com o mesmo nome, ou
 * mudar o caminho abaixo para apontar para o seu arquivo.
 *
 * Se um arquivo listado aqui não existir ainda, o jogo não quebra: o
 * assetLoader.js desenha um placeholder colorido com o nome do asset no
 * lugar, então o jogo roda de ponta a ponta mesmo antes de você inserir
 * uma única imagem sua.
 * ---------------------------------------------------------------------------
 */

const ASSETS = {
  images: {
    // Tela do "escritório"/quarto onde o jogador fica sentado.
    office: {
      background: 'assets/images/office/background.png',
      overlayDark: 'assets/images/office/overlay_dark.png', // vinheta escura opcional
    },

    // Uma imagem de fundo por cômodo mostrado nas câmeras.
    // Chave = id do cômodo (ver ROOMS mais abaixo).
    cameras: {
      quintal: 'assets/images/cameras/quintal.png',
      cozinha: 'assets/images/cameras/cozinha.png',
      sala: 'assets/images/cameras/sala.png',
      corredor: 'assets/images/cameras/corredor.png',
      static: 'assets/images/cameras/static.png', // ruído ao trocar de câmera
    },

    // Sprite do "inimigo" (o que vai substituir por uma foto de alguém
    // da família ou de um pet) em cada cômodo por onde ele passa, mais o
    // frame de jumpscare em tela cheia.
    enemies: {
      ent1: {
        quintal: 'assets/images/enemies/ent1_quintal.png',
        cozinha: 'assets/images/enemies/ent1_cozinha.png',
        corredor: 'assets/images/enemies/ent1_corredor.png',
        naPorta: 'assets/images/enemies/ent1_na_porta.png', // aparece ao acender a luz da porta
        jumpscare: 'assets/images/enemies/ent1_jumpscare.png',
      },
      ent2: {
        sala: 'assets/images/enemies/ent2_sala.png',
        corredor: 'assets/images/enemies/ent2_corredor.png',
        naPorta: 'assets/images/enemies/ent2_na_porta.png',
        jumpscare: 'assets/images/enemies/ent2_jumpscare.png',
      },
    },

    // Ícones de UI (HUD, botões).
    ui: {
      iconPower: 'assets/images/ui/icon_power.png',
      iconCamera: 'assets/images/ui/icon_camera.png',
      iconDoor: 'assets/images/ui/icon_door.png',
      iconLight: 'assets/images/ui/icon_light.png',
    },
  },

  audio: {
    ambience: 'assets/audio/ambience/ambience_loop.mp3',
    doorToggle: 'assets/audio/sfx/door_toggle.mp3',
    lightToggle: 'assets/audio/sfx/light_toggle.mp3',
    cameraStatic: 'assets/audio/sfx/camera_static.mp3',
    powerLow: 'assets/audio/sfx/power_low.mp3',
    blackout: 'assets/audio/sfx/blackout.mp3',
    knock: 'assets/audio/sfx/knock.mp3',
    jumpscare: 'assets/audio/sfx/jumpscare.mp3',
    victory: 'assets/audio/sfx/victory_6am.mp3',
  },
};

// -----------------------------------------------------------------------
// CÔMODOS (usados pelas câmeras e pelos caminhos dos inimigos)
// -----------------------------------------------------------------------
const ROOMS = [
  { id: 'quintal', label: 'Câm. 1 — Quintal' },
  { id: 'cozinha', label: 'Câm. 2 — Cozinha' },
  { id: 'sala', label: 'Câm. 3 — Sala' },
  { id: 'corredor', label: 'Câm. 4 — Corredor' },
];

// -----------------------------------------------------------------------
// PORTAS (o jogador defende exatamente estas duas entradas)
// -----------------------------------------------------------------------
const DOORS_CONFIG = [
  { id: 'esquerda', label: 'Porta Esquerda' },
  { id: 'direita', label: 'Porta Direita' },
];

// -----------------------------------------------------------------------
// INIMIGOS: cada um tem um "caminho" de cômodos até uma porta específica.
// O último elemento do path SEMPRE é 'porta:<id-da-porta>'.
// -----------------------------------------------------------------------
const ENEMIES_CONFIG = [
  {
    id: 'ent1',
    label: 'Figura 1',
    path: ['quintal', 'cozinha', 'corredor', 'porta:esquerda'],
    // tempo mínimo (ms) que ele fica "parado" observável antes de poder
    // avançar de novo, mesmo com sorte no dado — evita saltos bruscos.
    minTicksBetweenMoves: 1,
  },
  {
    id: 'ent2',
    label: 'Figura 2',
    path: ['sala', 'corredor', 'porta:direita'],
    minTicksBetweenMoves: 1,
  },
];

// -----------------------------------------------------------------------
// DIFICULDADE POR NOITE
// "aggression" vai de 0 a 20 — é a chance em 20 (0 a 19) do inimigo
// avançar um passo no seu caminho a cada tick de IA. É o mesmo esquema
// de "AI level" clássico do gênero point-and-click de terror noturno.
// -----------------------------------------------------------------------
const NIGHTS_CONFIG = [
  { label: 'Noite 1', aggression: { ent1: 1, ent2: 1 }, powerDrainMultiplier: 1.0 },
  { label: 'Noite 2', aggression: { ent1: 2, ent2: 2 }, powerDrainMultiplier: 1.1 },
  { label: 'Noite 3', aggression: { ent1: 3, ent2: 4 }, powerDrainMultiplier: 1.2 },
  { label: 'Noite 4', aggression: { ent1: 5, ent2: 5 }, powerDrainMultiplier: 1.35 },
  { label: 'Noite 5', aggression: { ent1: 7, ent2: 7 }, powerDrainMultiplier: 1.5 },
];

// -----------------------------------------------------------------------
// CONSTANTES GERAIS DE JOGO — ajuste o "balanceamento" aqui.
// -----------------------------------------------------------------------
const GAME_CONSTANTS = {
  HOURS_PER_NIGHT: 6, // meia-noite às 6h
  NIGHT_DURATION_MS: 5 * 60 * 1000, // duração real de uma noite inteira

  CAMERA_STATIC_FLASH_MS: 220, // duração do "ruído" visual ao trocar de câmera

  AI_TICK_INTERVAL_MS: 5000, // a cada 5s, cada inimigo "rola o dado"
  AI_NOT_WATCHED_BONUS: 2, // chance extra (+2/20) se a câmera dele não é vista há muito tempo
  AI_NOT_WATCHED_THRESHOLD_MS: 15000, // "muito tempo" sem checar aquele cômodo

  // Energia
  POWER_MAX: 100,
  POWER_DRAIN_BASE_PER_SEC: 0.04, // drena mesmo com tudo desligado
  POWER_DRAIN_PER_DOOR_CLOSED_PER_SEC: 0.10,
  POWER_DRAIN_PER_LIGHT_ON_PER_SEC: 0.12,
  POWER_DRAIN_MONITOR_OPEN_PER_SEC: 0.16,
  POWER_LOW_WARNING_THRESHOLD: 20,

  // Janela de perigo na porta
  DOOR_ATTACK_GRACE_MS: 4000, // tempo até o jumpscare depois que ele chega e a porta está aberta
  DOOR_KNOCK_RETREAT_MS: 3000, // tempo batendo na porta fechada antes de recuar
  ENEMY_RETREAT_COOLDOWN_MS: 8000, // tempo até tentar de novo após recuar
};

// Exposto globalmente (sem módulos ES, de propósito — roda direto no
// GitHub Pages ou abrindo o index.html localmente, sem servidor).
window.ASSETS = ASSETS;
window.ROOMS = ROOMS;
window.DOORS_CONFIG = DOORS_CONFIG;
window.ENEMIES_CONFIG = ENEMIES_CONFIG;
window.NIGHTS_CONFIG = NIGHTS_CONFIG;
window.GAME_CONSTANTS = GAME_CONSTANTS;
