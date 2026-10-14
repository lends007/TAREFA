# Fantasma da Luz: projeto GDevelop 5

Versão para **GDevelop 5** do jogo *Fantasma da Luz* (feito antes em HTML/canvas).
A lógica usa só **eventos nativos** do GDevelop (condições e ações), então dá
para ler e editar tudo no editor de eventos.

## Abrir no editor web (editor.gdevelop.io)

O editor web abre um projeto direto por link. Abra este endereço:

```
https://editor.gdevelop.io/?project=https://raw.githubusercontent.com/lends007/TAREFA/refs/heads/claude/fantasma-da-luz-game-13koeg/fantasma-da-luz-gdevelop/game-web.json
```

Depois clique em **Pré-visualizar** (▶) para jogar. Para guardar suas
alterações, use **Arquivo → Salvar como** e salve na nuvem do GDevelop. Para
isso você precisa de uma conta gratuita.

> O `game-web.json` aponta as imagens e a fonte para os arquivos deste
> repositório no GitHub, porque o editor web não lê arquivos do seu computador.
> Se a branch mudar de nome ou for apagada, gere de novo com
> `WEB_BASE=<novo endereço> node tools/build-project.mjs`.

## Abrir no GDevelop instalado (Windows/Mac/Linux)

1. Baixe o repositório (botão **Code → Download ZIP** no GitHub) e descompacte.
2. No GDevelop: **Abrir projeto** e escolha `fantasma-da-luz-gdevelop/game.json`.

## Como jogar

- **Setas** ou **WASD** movem o fantasma. No celular, **arraste o dedo** na tela.
- Colete as **esferas de luz**: cada uma vale +1 ponto e some depois de 12 s.
- Bolas de fogo surgem (primeiro aparece um aviso) e perseguem você.
- Atraia o fogo até os **espinhos de gelo** para apagá-lo.
- **Enter**, **Espaço** ou um toque começam o jogo e reiniciam depois do fim.
- O recorde fica salvo no aparelho.

## O que tem no projeto

| Cena | Função |
|---|---|
| `Titulo` | Tela inicial com o fantasma flutuando e as instruções |
| `Jogo` | A partida e a tela de fim de jogo |

Os grupos de eventos da cena `Jogo` são **Início da partida**, **Névoa**,
**Controles do fantasma**, **Esferas de luz**, **Bolas de fogo**,
**Fim de jogo** e **Placar**.

Objetos principais:

- `Fantasma`: comportamento *Movimento de cima para baixo* (velocidade 82). Tem
  uma animação `Parado` e 8 animações `Mover0`…`Mover7` em que os olhos olham
  para a direção do movimento.
- `BolaDeFogo`: animações `Centro`, `Esquerda` e `Direita` (a chama inclina
  para o lado do fantasma) e máscara de colisão redonda.
- `Esfera`, `Espinho` (máscara de colisão retangular) e `Aviso`.
- Partículas: `Rastro`, `Brasas` (ligadas a cada bola de fogo), `BrilhoEsfera`,
  `FaiscasFogo`, `VaporGelo`, `Fumaca`, `ExplosaoFantasma` e `Vagalumes`.
- Textos com a fonte *Press Start 2P*, que está em `assets/fonte/` com a
  licença OFL.

A resolução é 384×240 com escala "pixel art" (sem suavização), igual ao original.

## Regerar os arquivos

As imagens são desenhadas com o mesmo código de desenho do jogo original, em
`tools/sprites.html`. Para gerar tudo de novo (precisa de Node.js 18+ e Playwright):

```bash
cd fantasma-da-luz-gdevelop/tools
npm install                 # instala o gdcore-tools (biblioteca oficial do GDevelop)
node render-sprites.mjs     # gera assets/sprites/*.png
node build-project.mjs      # gera game.json e game-web.json e valida os eventos
```

O `build-project.mjs` passa cada instrução e expressão pelo validador do
próprio GDevelop. Se aparecer algum erro, ele mostra qual é.
