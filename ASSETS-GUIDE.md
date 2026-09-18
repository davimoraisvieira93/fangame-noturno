# Guia de substituição de assets

Regra de ouro: **o nome e o caminho do arquivo importam, o conteúdo não.**
Se você colocar um arquivo com exatamente o nome/caminho abaixo, o jogo
passa a usá-lo automaticamente — nenhuma linha de código precisa mudar.
Se quiser usar outro nome, mude apenas o valor correspondente em
`js/config.js` (objeto `ASSETS`).

Enquanto um arquivo não existir, o jogo desenha um retângulo cinza/vermelho
com o nome do asset escrito — assim você sempre sabe o que falta.

## Imagens

| Onde entra | Caminho esperado | Sugestão de tamanho |
|---|---|---|
| Fundo do seu "quarto"/escritório | `assets/images/office/background.png` | 960×540 |
| Câmera — Quintal | `assets/images/cameras/quintal.png` | 960×540 |
| Câmera — Cozinha | `assets/images/cameras/cozinha.png` | 960×540 |
| Câmera — Sala | `assets/images/cameras/sala.png` | 960×540 |
| Câmera — Corredor | `assets/images/cameras/corredor.png` | 960×540 |
| Estática ao trocar de câmera | `assets/images/cameras/static.png` | 960×540 |
| Figura 1 no quintal | `assets/images/enemies/ent1_quintal.png` | fundo transparente (PNG) |
| Figura 1 na cozinha | `assets/images/enemies/ent1_cozinha.png` | fundo transparente |
| Figura 1 no corredor | `assets/images/enemies/ent1_corredor.png` | fundo transparente |
| Figura 1 parada na porta (revelada pela luz) | `assets/images/enemies/ent1_na_porta.png` | preenche a "janela" da porta |
| Figura 1 — jumpscare em tela cheia | `assets/images/enemies/ent1_jumpscare.png` | 960×540, close-up assustador |
| Figura 2 na sala | `assets/images/enemies/ent2_sala.png` | fundo transparente |
| Figura 2 no corredor | `assets/images/enemies/ent2_corredor.png` | fundo transparente |
| Figura 2 parada na porta | `assets/images/enemies/ent2_na_porta.png` | preenche a "janela" da porta |
| Figura 2 — jumpscare em tela cheia | `assets/images/enemies/ent2_jumpscare.png` | 960×540 |

*(Ícones em `assets/images/ui/` são opcionais — hoje a interface usa
emojis nos botões; adicione os arquivos e troque os emojis em
`index.html` se preferir ícones próprios.)*

## Sons

| Onde entra | Caminho esperado |
|---|---|
| Som ambiente contínuo | `assets/audio/ambience/ambience_loop.mp3` |
| Abrir/fechar porta | `assets/audio/sfx/door_toggle.mp3` |
| Ligar/desligar luz | `assets/audio/sfx/light_toggle.mp3` |
| Estática ao trocar câmera | `assets/audio/sfx/camera_static.mp3` |
| Aviso de energia baixa | `assets/audio/sfx/power_low.mp3` |
| Apagão | `assets/audio/sfx/blackout.mp3` |
| Batida na porta | `assets/audio/sfx/knock.mp3` |
| Jumpscare | `assets/audio/sfx/jumpscare.mp3` |
| Vitória (6 da manhã) | `assets/audio/sfx/victory_6am.mp3` |

## Adicionando mais cômodos, inimigos ou noites

Tudo isso é configuração, não código:

- **Novo cômodo de câmera:** adicione um item em `ROOMS` (`js/config.js`)
  e a imagem correspondente em `ASSETS.images.cameras`.
- **Novo morador/pet como "inimigo":** adicione um item em
  `ENEMIES_CONFIG` com seu próprio `path` (lista de cômodos até uma das
  portas) e as imagens dele em `ASSETS.images.enemies`.
- **Nova noite / dificuldade:** adicione um item em `NIGHTS_CONFIG` com
  a agressividade de cada inimigo e o multiplicador de consumo de
  energia daquela noite.
