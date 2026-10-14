// Monta o projeto GDevelop 5 (game.json) do "Fantasma da Luz".
//
// Uso (dentro de fantasma-da-luz-gdevelop/tools):
//   npm install                 -> instala gdcore-tools (biblioteca oficial do GDevelop)
//   node render-sprites.mjs     -> (re)gera os PNGs em ../assets/sprites
//   node build-project.mjs      -> gera ../game.json e ../game-web.json
//
// A lógica do jogo é feita com eventos nativos do GDevelop (condições/ações),
// para que possa ser lida e editada no editor de eventos.
import { writeSync, readdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const W = 384, H = 240;

// Endereço público dos arquivos (usado só pelo game-web.json, que o editor web abre por link)
const WEB_BASE = process.env.WEB_BASE ||
  'https://raw.githubusercontent.com/lends007/TAREFA/refs/heads/claude/fantasma-da-luz-game-13koeg/fantasma-da-luz-gdevelop/';

/* ======================= ajudantes de eventos ======================= */
const str = s => JSON.stringify(s); // texto literal numa expressão do GDevelop
const instr = (value, params, inverted = false) => ({ type: { inverted, value }, parameters: params.map(String) });
const A = (value, ...params) => instr(value, params);
const C = (value, ...params) => instr(value, params);
const NOT = (value, ...params) => instr(value, params, true);
const OR = (...subs) => ({ type: { value: 'BuiltinCommonInstructions::Or' }, parameters: [], subInstructions: subs });
const ev = (conditions, actions, events = []) => ({ type: 'BuiltinCommonInstructions::Standard', conditions, actions, events });
const forEach = (object, conditions, actions, events = []) => ({ type: 'BuiltinCommonInstructions::ForEach', object, conditions, actions, events });
const repeat = (times, conditions, actions, events = []) => ({ type: 'BuiltinCommonInstructions::Repeat', repeatExpression: String(times), conditions, actions, events });
const comment = text => ({ type: 'BuiltinCommonInstructions::Comment', color: { b: 109, g: 230, r: 255, textB: 0, textG: 0, textR: 0 }, comment: text });
const group = (name, events, color = [74, 54, 133]) => ({
  type: 'BuiltinCommonInstructions::Group', name, source: '', creationTime: 0,
  colorR: color[0], colorG: color[1], colorB: color[2], events
});

// variáveis
const setVar = (name, op, value) => A('SetNumberVariable', name, op, value);
const ifVar = (name, op, value) => C('NumberVariable', name, op, value);
const cmp = (a, op, b) => C('BuiltinCommonInstructions::CompareNumbers', a, op, b);
// objetos
const create = (obj, x, y, layer = '""') => A('Create', '', obj, x, y, layer);
const del = obj => A('Delete', obj, '');
const setXY = (obj, x, y) => A('SetXY', obj, '=', x, '=', y);
const z = (obj, value) => A('ChangePlan', obj, '=', value);
const hide = obj => A('Cache', obj);
const show = obj => A('Montre', obj, '');
const text = (obj, value) => A('TextObject::String', obj, '=', value);
const anim = (obj, name) => A('SetAnimationName', obj, name);
const timerReset = name => A('ResetTimer', '', str(name));
const timerAtLeast = (name, value) => C('CompareTimer', '', str(name), '>=', value);
const objTimerReset = (obj, name) => A('ResetObjectTimer', obj, str(name));
const objTimerAtLeast = (obj, name, value) => C('CompareObjectTimer', obj, str(name), '>=', value);
const keyDown = key => C('KeyFromTextPressed', '', str(key));
const TD = 'TopDownMovement';

/* ======================= recursos ======================= */
const spriteFiles = readdirSync(join(root, 'assets', 'sprites')).filter(f => f.endsWith('.png')).sort();
const resources = spriteFiles.map(f => ({
  file: 'assets/sprites/' + f, kind: 'image', metadata: '', name: f, smoothed: false, userAdded: true
}));
const FONT = 'PressStart2P-Regular.ttf';
resources.push({ file: 'assets/fonte/' + FONT, kind: 'font', metadata: '', name: FONT, userAdded: true });

/* ======================= objetos ======================= */
const pt = (name, x, y) => ({ name, x, y });
const frames = prefix => spriteFiles
  .filter(f => f.startsWith(prefix + '_') && /^\d+$/.test(f.slice(prefix.length + 1, -4)))
  .sort((a, b) => parseInt(a.slice(prefix.length + 1)) - parseInt(b.slice(prefix.length + 1)));

function spriteObject(name, animations, { origin = [0, 0], center = null, mask = null, behaviors = [], variables = [] } = {}) {
  return {
    adaptCollisionMaskAutomatically: !mask,
    assetStoreId: '',
    name,
    type: 'Sprite',
    updateIfNotVisible: false,
    variables,
    effects: [],
    behaviors,
    animations: animations.map(a => ({
      name: a.name,
      useMultipleDirections: false,
      directions: [{
        looping: a.loop !== false,
        timeBetweenFrames: a.time || 0.1,
        sprites: a.images.map(image => ({
          hasCustomCollisionMask: !!mask,
          image,
          points: [],
          originPoint: pt('origine', origin[0], origin[1]),
          centerPoint: center ? { automatic: false, name: 'centre', x: center[0], y: center[1] } : { automatic: true, name: 'centre', x: 0, y: 0 },
          customCollisionMask: mask || []
        }))
      }]
    }))
  };
}

const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function textObject(name, string, color, { size = 8, align = 'left' } = {}) {
  const c = rgb(color).join(';');
  return {
    assetStoreId: '', bold: false, italic: false, name, smoothed: false,
    type: 'TextObject::Text', underlined: false, variables: [], effects: [], behaviors: [],
    string, font: FONT, textAlignment: align, characterSize: size,
    color: { r: rgb(color)[0], g: rgb(color)[1], b: rgb(color)[2] },
    content: {
      bold: false, isOutlineEnabled: false, isShadowEnabled: true, italic: false,
      outlineColor: '255;255;255', outlineThickness: 2,
      shadowAngle: 45, shadowBlurRadius: 0, shadowColor: '5;3;13', shadowDistance: 1.42, shadowOpacity: 255,
      smoothed: false, underlined: false, text: string, font: FONT,
      textAlignment: align, verticalTextAlignment: 'top', characterSize: size, lineHeight: 0, color: c
    }
  };
}

function particles(name, o) {
  const [r1, g1, b1] = rgb(o.color1), [r2, g2, b2] = rgb(o.color2 || o.color1);
  return {
    additive: false, assetStoreId: '', destroyWhenNoParticles: o.destroy !== false,
    emitterAngleA: 0, emitterAngleB: o.cone ?? 360,
    emitterForceMax: o.forceMax, emitterForceMin: o.forceMin,
    flow: o.flow ?? -1, jumpForwardInTimeOnCreation: o.jump || 0,
    maxParticleNb: o.max, name,
    particleAlpha1: o.alpha1 ?? 255, particleAlpha2: o.alpha2 ?? 0,
    particleAlphaRandomness1: 0, particleAlphaRandomness2: 0,
    particleAngle1: 0, particleAngle2: 0, particleAngleRandomness1: 0, particleAngleRandomness2: 0,
    particleBlue1: b1, particleBlue2: b2,
    particleColor1: `${r1};${g1};${b1}`, particleColor2: `${r2};${g2};${b2}`,
    particleGravityX: 0, particleGravityY: o.gravityY || 0,
    particleGreen1: g1, particleGreen2: g2,
    particleLifeTimeMax: o.lifeMax, particleLifeTimeMin: o.lifeMin,
    particleRed1: r1, particleRed2: r2,
    particleSize1: 100, particleSize2: 100, particleSizeRandomness1: 0, particleSizeRandomness2: 0,
    rendererParam1: o.size, rendererParam2: o.size, rendererType: 'Quad',
    tank: o.tank ?? o.max, textureParticleName: o.size === 1 ? 'particula_1.png' : 'particula_2.png',
    type: 'ParticleSystem::ParticleEmitter', zoneRadius: o.zone || 1,
    variables: [], effects: [], behaviors: []
  };
}

// colisões: círculo (raio 4) da bola de fogo e caixa do gelo, iguais às do jogo original
const octagon = (cx, cy) => [[
  { x: cx - 2, y: cy - 4 }, { x: cx + 2, y: cy - 4 }, { x: cx + 4, y: cy - 2 }, { x: cx + 4, y: cy + 2 },
  { x: cx + 2, y: cy + 4 }, { x: cx - 2, y: cy + 4 }, { x: cx - 4, y: cy + 2 }, { x: cx - 4, y: cy - 2 }
]];
const rect = (x0, y0, x1, y1) => [[{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }]];

const GHOST_TIME = (Math.PI * 2 / 5) / 10;
const ghostAnims = [{ name: 'Parado', images: frames('fantasma_parado'), time: GHOST_TIME }];
for (let i = 0; i < 8; i++) ghostAnims.push({ name: 'Mover' + i, images: frames('fantasma_mover' + i), time: GHOST_TIME });

const objects = [
  spriteObject('Cenario', [{ name: 'Cenario', images: ['cenario.png'] }]),
  { assetStoreId: '', height: H, name: 'NevoaFundo', texture: 'nevoa.png', type: 'TiledSpriteObject::TiledSprite', width: W, variables: [], effects: [], behaviors: [] },
  { assetStoreId: '', height: H, name: 'NevoaFrente', texture: 'nevoa.png', type: 'TiledSpriteObject::TiledSprite', width: W, variables: [], effects: [], behaviors: [] },
  spriteObject('Vinheta', [{ name: 'Vinheta', images: ['vinheta.png'] }]),
  spriteObject('Painel', [{ name: 'Painel', images: ['painel.png'] }]),
  spriteObject('Fantasma', ghostAnims, {
    origin: [19, 18], center: [19, 18],
    behaviors: [{
      name: TD, type: 'TopDownMovementBehavior::TopDownMovementBehavior',
      acceleration: 100000, allowDiagonals: true, angleOffset: 0, angularMaxSpeed: 180,
      customIsometryAngle: 30, deceleration: 100000, ignoreDefaultControls: false,
      maxSpeed: 82, movementAngleOffset: 0, rotateObject: false, useLegacyTurnBack: false, viewpoint: 'TopDown'
    }]
  }),
  spriteObject('BolaDeFogo', [
    { name: 'Centro', images: frames('fogo_centro'), time: 0.07 },
    { name: 'Esquerda', images: frames('fogo_esquerda'), time: 0.07 },
    { name: 'Direita', images: frames('fogo_direita'), time: 0.07 }
  ], { origin: [22, 26], center: [22, 26], mask: octagon(22, 26) }),
  spriteObject('Esfera', [{ name: 'Brilho', images: frames('esfera'), time: (Math.PI * 2 / 2.5) / 16 }], { origin: [16, 16], center: [16, 16] }),
  spriteObject('Espinho', [{
    name: 'Gelo', time: 0.33,
    images: ['espinho_1.png', 'espinho_0.png', 'espinho_0.png', 'espinho_0.png', 'espinho_0.png', 'espinho_0.png', 'espinho_0.png', 'espinho_0.png']
  }], { origin: [16, 19], center: [16, 13], mask: rect(8, 6, 24, 20) }),
  spriteObject('Aviso', [{ name: 'Surgindo', images: frames('aviso'), time: 0.075, loop: false }], { origin: [14, 9], center: [14, 9] }),

  particles('Rastro', { color1: '#bcd6f5', alpha1: 128, max: 60, tank: -1, flow: 0, lifeMin: 0.35, lifeMax: 0.6, forceMin: 2, forceMax: 6, size: 2, zone: 4, destroy: false }),
  particles('Brasas', { color1: '#ffd84a', color2: '#e8501a', max: 60, tank: -1, flow: 28, lifeMin: 0.5, lifeMax: 0.9, forceMin: 14, forceMax: 34, cone: 50, gravityY: -10, size: 1, zone: 4, destroy: false }),
  particles('BrilhoEsfera', { color1: '#fff6a8', color2: '#ffd84a', max: 18, lifeMin: 0.3, lifeMax: 0.7, forceMin: 18, forceMax: 60, size: 1 }),
  particles('ExplosaoFantasma', { color1: '#ffffff', color2: '#a9c6ec', max: 36, lifeMin: 0.3, lifeMax: 0.7, forceMin: 24, forceMax: 80, size: 2 }),
  particles('FaiscasFogo', { color1: '#ffd84a', color2: '#ff7a1a', max: 16, lifeMin: 0.3, lifeMax: 0.7, forceMin: 16, forceMax: 55, gravityY: -20, size: 1 }),
  particles('VaporGelo', { color1: '#ffffff', color2: '#8fe3ff', max: 22, lifeMin: 0.3, lifeMax: 0.7, forceMin: 21, forceMax: 70, size: 1 }),
  particles('Fumaca', { color1: '#8089ad', alpha1: 128, max: 8, lifeMin: 0.6, lifeMax: 1, forceMin: 10, forceMax: 26, cone: 60, gravityY: -6, size: 2, zone: 5 }),
  particles('Vagalumes', { color1: '#c9c2ff', alpha1: 110, alpha2: 0, max: 40, tank: -1, flow: 6, lifeMin: 4, lifeMax: 7, forceMin: 1, forceMax: 5, cone: 80, size: 1, zone: 210, jump: 6, destroy: false }),

  textObject('TextoPontos', 'PONTOS 0', '#ffd84a'),
  textObject('TextoRecorde', 'RECORDE 0', '#8fe3ff', { align: 'right' }),
  textObject('TextoMais1', '+1', '#fff6a8', { align: 'center' }),
  textObject('TituloFantasma', 'FANTASMA', '#eaf6ff', { size: 16, align: 'center' }),
  textObject('TituloDaLuz', 'DA LUZ', '#ffd84a', { size: 16, align: 'center' }),
  textObject('Instrucao1', 'COLETE AS ESFERAS DE LUZ', '#fff0a0', { align: 'center' }),
  textObject('Instrucao2', 'ATRAIA O FOGO PARA O GELO', '#8fe3ff', { align: 'center' }),
  textObject('Instrucao3', 'NAO DEIXE O FOGO TE ALCANCAR', '#ff9a1f', { align: 'center' }),
  textObject('TextoComecar', 'ENTER OU TOQUE PARA JOGAR', '#ffffff', { align: 'center' }),
  textObject('TextoFim', 'FIM DE JOGO', '#ff5a3a', { size: 16, align: 'center' }),
  textObject('TextoPontosFim', 'PONTOS 0', '#ffd84a', { align: 'center' }),
  textObject('TextoNovoRecorde', 'NOVO RECORDE!', '#8fe3ff', { align: 'center' }),
  textObject('TextoTentar', 'ENTER OU TOQUE PARA TENTAR', '#ffffff', { align: 'center' })
];

/* ======================= instâncias ======================= */
let uuid = 0;
const inst = (name, x, y, zOrder, o = {}) => ({
  angle: o.angle || 0, customSize: !!o.width, height: o.height || 0, keepRatio: true,
  layer: o.layer || '', name, persistentUuid: 'f0a5d000-0000-4000-8000-' + String(++uuid).padStart(12, '0'),
  width: o.width || 0, x, y, zOrder, ...(o.opacity !== undefined ? { opacity: o.opacity } : {}),
  numberProperties: [], stringProperties: [], initialVariables: []
});
const UI = 'Interface';
const scenery = () => [
  inst('Cenario', 0, 0, -100),
  inst('NevoaFundo', 0, 0, -90),
  inst('NevoaFrente', 0, 14, -89, { opacity: 178 }),
  inst('Vagalumes', W / 2, H / 2, 1500),
  inst('Vinheta', 0, 0, 0, { layer: UI })
];
const centered = (name, y, zOrder = 10) => inst(name, 0, y, zOrder, { layer: UI, width: W, height: 20 });

/* ======================= cenas ======================= */
const layer = name => ({
  ambientLightColorB: 200, ambientLightColorG: 200, ambientLightColorR: 200,
  camera2DPlaneMaxDrawingDistance: 5000, camera3DFarPlaneDistance: 10000, camera3DFieldOfView: 45, camera3DNearPlaneDistance: 3,
  cameraType: '', followBaseLayerCamera: false, isLightingLayer: false, isLocked: false, name, renderingType: '', visibility: true,
  cameras: [{ defaultSize: true, defaultViewport: true, height: 0, viewportBottom: 1, viewportLeft: 0, viewportRight: 1, viewportTop: 0, width: 0 }],
  effects: []
});
const numVar = (name, value = 0) => ({ name, type: 'number', value });
const scene = (name, instances, events, variables) => ({
  b: 13, disableInputWhenNotFocused: true, mangledName: name, name, r: 5, standardSortMethod: true,
  stopSoundsOnStartup: true, title: '', v: 3, uiSettings: {}, objectsGroups: [], variables,
  instances, objects: [], events, layers: [layer(''), layer(UI)], behaviorsSharedData: []
});

// --- eventos comuns às duas cenas ---
const fogEvents = group('Névoa', [
  comment('As duas camadas de névoa deslizam devagar, em velocidades diferentes.'),
  ev([], [
    A('TiledSpriteObject::XOffset', 'NevoaFundo', '=', 'mod(TimeFromStart() * 6, 768)'),
    A('TiledSpriteObject::XOffset', 'NevoaFrente', '=', 'mod(TimeFromStart() * 3.5 + 300, 768)')
  ])
]);
const loadRecord = ev([C('GroupExists', str('fantasma_da_luz'), str('recorde'))], [
  A('ReadNumberFromStorage', str('fantasma_da_luz'), str('recorde'), '', 'Recorde')
]);
const startKeys = () => OR(keyDown('Return'), keyDown('Space'), C('MouseButtonFromTextReleased', '', str('Left')));
const blink = (obj, extra = []) => [
  ev([...extra, cmp('mod(floor(TimeFromStart() * 2), 2)', '=', '0')], [show(obj)]),
  ev([...extra, cmp('mod(floor(TimeFromStart() * 2), 2)', '=', '1')], [hide(obj)])
];

/* ---------- Cena: Titulo ---------- */
const tituloEvents = [
  comment('FANTASMA DA LUZ — tela de título. Enter, Espaço ou um toque começam o jogo.'),
  ev([C('DepartScene', '')], [
    A('ActivateBehavior', 'Fantasma', TD, 'no'),
    anim('BolaDeFogo', str('Centro'))
  ], [loadRecord]),
  fogEvents,
  ev([], [A('MettreY', 'Fantasma', '=', 'round(112 + sin(TimeFromStart() * 2) * 3)')]),
  ...blink('TextoComecar'),
  ev([startKeys()], [A('Scene', '', str('Jogo'), 'no')])
];
const tituloInstances = [
  ...scenery(),
  inst('Fantasma', W / 2, 112, 120),
  inst('Esfera', 112, 108, 108),
  inst('BolaDeFogo', 276, 112, 112),
  inst('Espinho', 322, 126, 126),
  centered('TituloFantasma', 26), centered('TituloDaLuz', 48),
  centered('Instrucao1', 150), centered('Instrucao2', 164), centered('Instrucao3', 178),
  centered('TextoComecar', 205)
];

/* ---------- Cena: Jogo ---------- */
const DIST = (x1, y1, x2, y2) => `DistanceBetweenPositions(${x1}, ${y1}, ${x2}, ${y2})`;
const PLAYING = () => ifVar('Fim', '=', '0');

const jogoEvents = [
  comment('FANTASMA DA LUZ — colete as esferas de luz, atraia o fogo para os espinhos de gelo e não deixe o fogo te alcançar.'),

  group('Início da partida', [
    ev([C('DepartScene', '')], [
      timerReset('jogo'), timerReset('fogo'), timerReset('esfera'),
      hide('Painel'), hide('TextoFim'), hide('TextoPontosFim'), hide('TextoNovoRecorde'), hide('TextoTentar'),
      setVar('EsferasPedidas', '=', '3')
    ], [
      loadRecord,
      ev([], [text('TextoRecorde', '"RECORDE " + ToString(Recorde)')]),
      comment('Espalha 5 espinhos de gelo: longe do fantasma (60) e longe uns dos outros (80).'),
      repeat(800, [ifVar('EspinhosCriados', '<', '5')], [
        setVar('TX', '=', 'RandomInRange(24, 360)'),
        setVar('TY', '=', 'RandomInRange(40, 226)'),
        setVar('PosicaoLivre', '=', '1')
      ], [
        ev([cmp(DIST('TX', 'TY', 'Fantasma.X()', 'Fantasma.Y()'), '<', '60')], [setVar('PosicaoLivre', '=', '0')]),
        forEach('Espinho', [cmp(DIST('TX', 'TY', 'Espinho.X()', 'Espinho.Y()'), '<', '80')], [setVar('PosicaoLivre', '=', '0')]),
        ev([ifVar('PosicaoLivre', '=', '1')], [
          create('Espinho', 'TX', 'TY'),
          A('ChangeSprite', 'Espinho', '=', 'Random(7)'),
          z('Espinho', 'Espinho.Y()'),
          setVar('EspinhosCriados', '+', '1')
        ])
      ])
    ])
  ]),

  fogEvents,

  group('Controles do fantasma', [
    comment('Setas: controle padrão do comportamento "Movimento de cima para baixo". WASD simula as setas.'),
    ev([PLAYING(), keyDown('a')], [A('TopDownMovementBehavior::SimulateLeftKey', 'Fantasma', TD)]),
    ev([PLAYING(), keyDown('d')], [A('TopDownMovementBehavior::SimulateRightKey', 'Fantasma', TD)]),
    ev([PLAYING(), keyDown('w')], [A('TopDownMovementBehavior::SimulateUpKey', 'Fantasma', TD)]),
    ev([PLAYING(), keyDown('s')], [A('TopDownMovementBehavior::SimulateDownKey', 'Fantasma', TD)]),
    comment('Celular/mouse: arrastar o dedo funciona como um analógico virtual a partir do ponto tocado.'),
    ev([C('MouseButtonFromTextPressed', '', str('Left')), ifVar('ToqueAtivo', '=', '0')], [
      setVar('ToqueAtivo', '=', '1'),
      setVar('ToqueOX', '=', 'MouseX("", 0)'),
      setVar('ToqueOY', '=', 'MouseY("", 0)')
    ]),
    ev([NOT('MouseButtonFromTextPressed', '', str('Left'))], [setVar('ToqueAtivo', '=', '0')]),
    ev([ifVar('ToqueAtivo', '=', '1')], [
      setVar('ToqueDX', '=', 'MouseX("", 0) - ToqueOX'),
      setVar('ToqueDY', '=', 'MouseY("", 0) - ToqueOY'),
      setVar('ToqueDist', '=', 'sqrt(ToqueDX * ToqueDX + ToqueDY * ToqueDY)')
    ], [
      ev([ifVar('ToqueDist', '>', '20')], [
        setVar('ToqueOX', '+', 'ToqueDX * (ToqueDist - 20) / ToqueDist'),
        setVar('ToqueOY', '+', 'ToqueDY * (ToqueDist - 20) / ToqueDist'),
        setVar('ToqueDX', '=', 'MouseX("", 0) - ToqueOX'),
        setVar('ToqueDY', '=', 'MouseY("", 0) - ToqueOY'),
        setVar('ToqueDist', '=', '20')
      ]),
      ev([PLAYING(), ifVar('ToqueDist', '>', '3')], [
        A('TopDownMovementBehavior::SimulateStick', 'Fantasma', TD, 'ToDeg(atan2(ToqueDY, ToqueDX))', 'min(ToqueDist / 15, 1)')
      ])
    ]),
    comment('Mantém o fantasma dentro da tela.'),
    ev([], [
      A('MettreX', 'Fantasma', '=', `clamp(Fantasma.X(), 9, ${W - 9})`),
      A('MettreY', 'Fantasma', '=', `clamp(Fantasma.Y(), 11, ${H - 14})`),
      z('Fantasma', 'Fantasma.Y() + 8')
    ]),
    comment('Animação: parado, ou olhando para uma das 8 direções enquanto se move.'),
    ev([C('TopDownMovementBehavior::IsMoving', 'Fantasma', TD)], [
      anim('Fantasma', '"Mover" + ToString(mod(round(Fantasma.TopDownMovement::Angle() / 45) + 8, 8))'),
      setXY('Rastro', 'Fantasma.X()', 'Fantasma.Y() + 5'),
      A('ParticleSystem::Flow', 'Rastro', '=', '22')
    ]),
    ev([NOT('TopDownMovementBehavior::IsMoving', 'Fantasma', TD)], [
      anim('Fantasma', str('Parado')),
      A('ParticleSystem::Flow', 'Rastro', '=', '0')
    ])
  ]),

  group('Esferas de luz', [
    comment('Uma nova esfera a cada 1,2–2,2 s (no máximo 5 na tela).'),
    ev([PLAYING(), timerAtLeast('esfera', 'ProximaEsfera'), C('SceneInstancesCount', '', 'Esfera', '<', '5')], [
      setVar('EsferasPedidas', '+', '1'),
      timerReset('esfera'),
      setVar('ProximaEsfera', '=', 'RandomFloatInRange(1.2, 2.2)')
    ]),
    comment('Escolhe um lugar livre, longe dos espinhos de gelo.'),
    ev([ifVar('EsferasPedidas', '>', '0')], [], [
      repeat(120, [ifVar('EsferasPedidas', '>', '0')], [
        setVar('TX', '=', `RandomFloatInRange(14, ${W - 14})`),
        setVar('TY', '=', `RandomFloatInRange(24, ${H - 16})`),
        setVar('PosicaoLivre', '=', '1')
      ], [
        forEach('Espinho', [cmp(DIST('TX', 'TY', 'Espinho.X()', 'Espinho.Y() - 6'), '<', '22')], [setVar('PosicaoLivre', '=', '0')]),
        ev([ifVar('PosicaoLivre', '=', '1')], [
          create('Esfera', 'TX', 'TY'),
          objTimerReset('Esfera', 'vida'),
          A('ChangeSprite', 'Esfera', '=', 'Random(15)'),
          z('Esfera', '-50'),
          setVar('EsferasPedidas', '-', '1')
        ])
      ]),
      ev([], [setVar('EsferasPedidas', '=', '0')])
    ]),
    comment('Cada esfera dura 12 s e pisca nos 2 últimos segundos.'),
    ev([PLAYING(), objTimerAtLeast('Esfera', 'vida', '10')], [
      A('Opacity', 'Esfera', '=', 'mod(floor((12 - Esfera.ObjectTimerElapsedTime("vida")) * 8), 2) * 255')
    ]),
    ev([PLAYING(), objTimerAtLeast('Esfera', 'vida', '12')], [del('Esfera')]),
    comment('Coletar: +1 ponto.'),
    ev([PLAYING(), C('Distance', 'Fantasma', 'Esfera', '11', '')], [
      setVar('Pontos', '+', '1'),
      create('BrilhoEsfera', 'Esfera.X()', 'Esfera.Y()'),
      z('BrilhoEsfera', '2000'),
      create('TextoMais1', 'Esfera.X() - 20', 'Esfera.Y() - 10'),
      A('TextObject::SetWrapping', 'TextoMais1', 'yes'),
      A('TextObject::WrappingWidth', 'TextoMais1', '=', '40'),
      z('TextoMais1', '3000'),
      objTimerReset('TextoMais1', 'vida'),
      A('AddForceXY', 'TextoMais1', '0', '-18', '1'),
      del('Esfera')
    ]),
    ev([], [A('TextObject::Opacity', 'TextoMais1', '=', 'clamp((0.8 - TextoMais1.ObjectTimerElapsedTime("vida")) * 3, 0, 1) * 255')]),
    ev([objTimerAtLeast('TextoMais1', 'vida', '0.8')], [del('TextoMais1')])
  ], [140, 112, 30]),

  group('Bolas de fogo', [
    comment('Um aviso aparece a cada poucos segundos (cada vez mais rápido), longe do fantasma.'),
    ev([PLAYING(), timerAtLeast('fogo', 'ProximoFogo')], [
      timerReset('fogo'),
      setVar('ProximoFogo', '=', 'max(1.2, 3.4 - TimerElapsedTime("jogo") * 0.03)')
    ], [
      ev([cmp('SceneInstancesCount(BolaDeFogo) + SceneInstancesCount(Aviso)', '<', '16')], [setVar('FogosPedidos', '+', '1')])
    ]),
    ev([ifVar('FogosPedidos', '>', '0')], [], [
      repeat(40, [ifVar('FogosPedidos', '>', '0')], [
        setVar('TX', '=', `RandomFloatInRange(14, ${W - 14})`),
        setVar('TY', '=', `RandomFloatInRange(22, ${H - 14})`),
        setVar('PosicaoLivre', '=', '1')
      ], [
        ev([cmp(DIST('TX', 'TY', 'Fantasma.X()', 'Fantasma.Y()'), '<', '130')], [setVar('PosicaoLivre', '=', '0')]),
        forEach('Espinho', [cmp(DIST('TX', 'TY', 'Espinho.X()', 'Espinho.Y() - 6'), '<', '18')], [setVar('PosicaoLivre', '=', '0')]),
        ev([ifVar('PosicaoLivre', '=', '1')], [
          create('Aviso', 'TX', 'TY'),
          objTimerReset('Aviso', 't'),
          z('Aviso', '1000'),
          setVar('FogosPedidos', '-', '1')
        ])
      ]),
      ev([], [setVar('FogosPedidos', '=', '0')])
    ]),
    comment('Depois de 0,9 s o aviso vira uma bola de fogo (com um rastro de brasas ligado a ela).'),
    forEach('Aviso', [PLAYING(), objTimerAtLeast('Aviso', 't', '0.9')], [
      create('BolaDeFogo', 'Aviso.X()', 'Aviso.Y()'),
      anim('BolaDeFogo', str('Centro')),
      z('BolaDeFogo', 'BolaDeFogo.Y()'),
      create('Brasas', 'Aviso.X()', 'Aviso.Y() - 4'),
      A('SetAngle', 'Brasas', '=', '-90'),
      z('Brasas', '2000'),
      A('LinkedObjects::LinkObjects', '', 'BolaDeFogo', 'Brasas'),
      create('FaiscasFogo', 'Aviso.X()', 'Aviso.Y()'),
      z('FaiscasFogo', '2000'),
      del('Aviso')
    ]),
    comment('Perseguição: a velocidade cresce com os pontos e com o tempo (máx. 64).'),
    ev([PLAYING()], [setVar('VelocidadeFogo', '=', 'min(36 + Pontos + TimerElapsedTime("jogo") * 0.12, 64)')]),
    forEach('BolaDeFogo', [PLAYING()], [
      A('AddForceVersPos', 'BolaDeFogo', 'Fantasma.X()', 'Fantasma.Y()', 'VelocidadeFogo', '0'),
      z('BolaDeFogo', 'BolaDeFogo.Y()'),
      setVar('Inclinacao', '=', '(Fantasma.X() - BolaDeFogo.X()) / max(1, BolaDeFogo.Distance(Fantasma))')
    ], [
      ev([ifVar('Inclinacao', '>', '0.35')], [anim('BolaDeFogo', str('Direita'))]),
      ev([ifVar('Inclinacao', '<', '-0.35')], [anim('BolaDeFogo', str('Esquerda'))]),
      ev([ifVar('Inclinacao', '>=', '-0.35'), ifVar('Inclinacao', '<=', '0.35')], [anim('BolaDeFogo', str('Centro'))]),
      ev([C('LinkedObjects::PickObjectsLinkedTo', '', 'Brasas', 'BolaDeFogo', '')], [
        setXY('Brasas', 'BolaDeFogo.X()', 'BolaDeFogo.Y() - 4')
      ])
    ]),
    comment('Fogo que encosta no gelo se apaga (as últimas brasas somem em 1 s).'),
    ev([objTimerAtLeast('Brasas', 'apagando', '1')], [del('Brasas')]),
    forEach('BolaDeFogo', [PLAYING(), C('CollisionNP', 'BolaDeFogo', 'Espinho', '', '', '')], [
      create('VaporGelo', 'BolaDeFogo.X()', 'BolaDeFogo.Y()'),
      z('VaporGelo', '2000'),
      create('Fumaca', 'BolaDeFogo.X()', 'BolaDeFogo.Y()'),
      A('SetAngle', 'Fumaca', '=', '-90'),
      z('Fumaca', '2000')
    ], [
      ev([C('LinkedObjects::PickObjectsLinkedTo', '', 'Brasas', 'BolaDeFogo', '')], [
        A('ParticleSystem::StopEmission', 'Brasas'),
        objTimerReset('Brasas', 'apagando')
      ]),
      ev([], [del('BolaDeFogo')])
    ])
  ], [150, 50, 30]),

  group('Fim de jogo', [
    comment('Se o fogo alcança o fantasma, a partida acaba.'),
    ev([PLAYING(), C('Distance', 'Fantasma', 'BolaDeFogo', '9', '')], [
      setVar('Fim', '=', '1'),
      timerReset('fim'),
      setVar('Tremor', '=', '0.45'),
      create('ExplosaoFantasma', 'Fantasma.X()', 'Fantasma.Y()'),
      z('ExplosaoFantasma', '2000'),
      A('ParticleSystem::Flow', 'Rastro', '=', '0'),
      del('Fantasma'),
      show('Painel'), show('TextoFim'), show('TextoPontosFim'),
      text('TextoPontosFim', '"PONTOS " + ToString(Pontos)')
    ], [
      ev([ifVar('Pontos', '>', '0'), ifVar('Pontos', '>=', 'Recorde')], [show('TextoNovoRecorde')]),
      ev([ifVar('Pontos', '>', 'Recorde')], [
        setVar('Recorde', '=', 'Pontos'),
        A('EcrireFichierExp', str('fantasma_da_luz'), str('recorde'), 'Recorde')
      ])
    ]),
    comment('Tremida de câmera logo após a derrota.'),
    ev([ifVar('Tremor', '>', '0')], [
      setVar('Tremor', '-', 'TimeDelta()'),
      A('SetCameraCenterX', '', '=', `${W / 2} + round(RandomFloatInRange(-1, 1) * min(1, Tremor * 3) * 3)`, '""', '0'),
      A('SetCameraCenterY', '', '=', `${H / 2} + round(RandomFloatInRange(-1, 1) * min(1, Tremor * 3) * 3)`, '""', '0')
    ]),
    ev([ifVar('Tremor', '<=', '0')], [
      A('SetCameraCenterX', '', '=', String(W / 2), '""', '0'),
      A('SetCameraCenterY', '', '=', String(H / 2), '""', '0')
    ]),
    ...blink('TextoTentar', [ifVar('Fim', '=', '1'), timerAtLeast('fim', '0.6')]),
    ev([ifVar('Fim', '=', '1'), timerAtLeast('fim', '0.6'), startKeys()], [A('Scene', '', str('Jogo'), 'no')])
  ], [120, 30, 50]),

  group('Placar', [
    ev([], [
      text('TextoPontos', '"PONTOS " + ToString(Pontos)'),
      text('TextoRecorde', '"RECORDE " + ToString(Recorde)')
    ])
  ])
];

const jogoInstances = [
  ...scenery(),
  inst('Fantasma', W / 2, H / 2, H / 2 + 8),
  inst('Rastro', W / 2, H / 2 + 5, 2000),
  inst('TextoPontos', 8, 6, 10, { layer: UI }),
  inst('TextoRecorde', 0, 6, 10, { layer: UI, width: W - 8, height: 20 }),
  inst('Painel', 0, 84, 5, { layer: UI, width: W, height: 76, opacity: 166 }),
  centered('TextoFim', 94), centered('TextoPontosFim', 118), centered('TextoNovoRecorde', 131), centered('TextoTentar', 144)
];

const jogoVariables = [
  'Pontos', 'Fim', 'Tremor', 'TX', 'TY', 'PosicaoLivre', 'EspinhosCriados', 'EsferasPedidas', 'FogosPedidos',
  'ProximaEsfera', 'VelocidadeFogo', 'Inclinacao', 'ToqueAtivo', 'ToqueOX', 'ToqueOY', 'ToqueDX', 'ToqueDY', 'ToqueDist'
].map(n => numVar(n)).concat([numVar('ProximoFogo', 2.5)]);
jogoVariables.sort((a, b) => a.name.localeCompare(b.name));

/* ======================= projeto ======================= */
const project = {
  firstLayout: 'Titulo',
  gdVersion: { build: 269, major: 5, minor: 6, revision: 0 },
  properties: {
    adaptGameResolutionAtRuntime: false,
    antialiasingMode: 'none',
    antialisingEnabledOnMobile: false,
    folderProject: false,
    orientation: 'landscape',
    packageName: 'com.lends007.fantasmadaluz',
    pixelsRounding: true,
    projectUuid: '7e0b6c1e-3f7a-4e57-9a7e-fa57a5da1022',
    scaleMode: 'nearest',
    sizeOnStartupMode: '',
    templateSlug: '',
    version: '1.0.0',
    name: 'Fantasma da Luz',
    description: 'Colete as esferas de luz, atraia o fogo para os espinhos de gelo e não deixe o fogo te alcançar.',
    author: '',
    windowWidth: W,
    windowHeight: H,
    latestCompilationDirectory: '',
    maxFPS: 60,
    minFPS: 20,
    verticalSync: false,
    platformSpecificAssets: { 'liluo-thumbnail': '', 'desktop-icon-512': 'icone.png' },
    loadingScreen: {
      backgroundColor: 0x05030d, backgroundFadeInDuration: 0.2, backgroundImageResourceName: '',
      gdevelopLogoStyle: 'light', logoAndProgressFadeInDuration: 0.2, logoAndProgressLogoFadeInDelay: 0,
      minDuration: 0, progressBarColor: 0xffd84a, progressBarHeight: 8, progressBarMaxWidth: 200,
      progressBarMinWidth: 40, progressBarWidthPercent: 30, showGDevelopSplash: false, showProgressBar: true
    },
    watermark: { placement: 'bottom-left', showWatermark: false },
    authorIds: [], authorUsernames: [], categories: [], playableDevices: ['keyboard', 'mobile'],
    extensionProperties: [],
    platforms: [{ name: 'GDevelop JS platform' }],
    currentPlatform: 'GDevelop JS platform'
  },
  resources: { resources },
  objects,
  objectsFolderStructure: { folderName: '__ROOT', children: objects.map(o => ({ objectName: o.name })) },
  objectsGroups: [],
  variables: [numVar('Recorde')],
  layouts: [
    scene('Titulo', tituloInstances, tituloEvents, []),
    scene('Jogo', jogoInstances, jogoEvents, jogoVariables)
  ],
  externalEvents: [],
  eventsFunctionsExtensions: [],
  externalLayouts: []
};

// remove entradas nulas usadas só como marcação no código acima
const clean = o => Array.isArray(o) ? o.filter(x => x !== null).map(clean)
  : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, clean(v)])) : o;
const projectJson = clean(project);

/* ======================= gravação + validação ======================= */
const outFile = join(root, 'game.json');
writeFileSync(outFile, JSON.stringify(projectJson, null, 2) + '\n');

let gdTools = null;
try { gdTools = await import(process.env.GDCORE_TOOLS || 'gdcore-tools'); } catch (e) {
  console.warn('gdcore-tools não encontrado: game.json gravado sem normalização/validação.');
}
if (gdTools) {
  const { gd, loadProject } = gdTools;
  const loaded = await loadProject(outFile);
  const errors = validate(gd, loaded);
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  }
  // grava no formato exato do GDevelop
  const element = new gd.SerializerElement();
  loaded.serializeTo(element);
  const normalized = JSON.parse(gd.Serializer.toJSON(element));
  element.delete();
  delete normalized.properties.projectFile;
  writeFileSync(outFile, JSON.stringify(normalized, null, 2) + '\n');
  if (process.env.EXPORT_DIR) {
    gdTools.exportProject(loaded, process.env.EXPORT_DIR);
    console.log('Exportado para ' + process.env.EXPORT_DIR);
  }
  console.log(errors.length ? errors.length + ' problema(s) encontrados.' : 'Projeto validado com a biblioteca do GDevelop.');
}

// versão para o editor web: imagens/fonte com endereço completo (o editor web não lê arquivos locais)
const web = JSON.parse(readFileSync(outFile, 'utf8'));
for (const r of web.resources.resources) r.file = WEB_BASE + r.file;
writeFileSync(join(root, 'game-web.json'), JSON.stringify(web, null, 2) + '\n');
console.log('game.json e game-web.json gravados.');

/* ---------- checagem das instruções e expressões com a biblioteca do GDevelop ---------- */
function validate(gd, project) {
  const platform = gd.JsPlatform.get();
  const errors = [];
  for (let i = 0; i < project.getLayoutsCount(); i++) {
    const layout = project.getLayoutAt(i);
    const containers = gd.ProjectScopedContainers.makeNewProjectScopedContainersForProjectAndLayout(project, layout);
    const visit = (list, where) => {
      for (let e = 0; e < list.getEventsCount(); e++) {
        const event = list.getEventAt(e);
        const vectors = [];
        if (event.getType() === 'BuiltinCommonInstructions::Standard' || event.getType() === 'BuiltinCommonInstructions::ForEach' || event.getType() === 'BuiltinCommonInstructions::Repeat') {
          const ev = event.getType() === 'BuiltinCommonInstructions::Standard' ? gd.asStandardEvent(event)
            : event.getType() === 'BuiltinCommonInstructions::ForEach' ? gd.asForEachEvent(event) : gd.asRepeatEvent(event);
          vectors.push([ev.getConditions(), true], [ev.getActions(), false]);
        }
        const checkList = (instrs, isCond) => {
          for (let k = 0; k < instrs.size(); k++) {
            const ins = instrs.get(k);
            const type = ins.getType();
            if (type === 'BuiltinCommonInstructions::Or') { checkList(ins.getSubInstructions(), true); continue; }
            const meta = isCond ? gd.MetadataProvider.getConditionMetadata(platform, type) : gd.MetadataProvider.getActionMetadata(platform, type);
            if (gd.MetadataProvider.isBadInstructionMetadata(meta)) { errors.push(`${layout.getName()} ${where}: instrução desconhecida ${type}`); continue; }
            if (ins.getParametersCount() !== meta.getParametersCount())
              errors.push(`${layout.getName()} ${where}: ${type} tem ${ins.getParametersCount()} parâmetros, esperado ${meta.getParametersCount()}`);
            for (let p = 0; p < meta.getParametersCount(); p++) {
              const pm = meta.getParameter(p);
              const value = p < ins.getParametersCount() ? ins.getParameter(p).getPlainString() : '';
              if (pm.isCodeOnly()) continue;
              const t = pm.getType();
              if (gd.ParameterMetadata.isExpression('number', t)) checkExpr(value, 'number', `${where} ${type}#${p}`);
              else if (gd.ParameterMetadata.isExpression('string', t)) checkExpr(value, 'string', `${where} ${type}#${p}`);
            }
          }
        };
        for (const [v, c] of vectors) checkList(v, c);
        if (event.canHaveSubEvents()) visit(event.getSubEvents(), where + '>' + e);
      }
    };
    const checkExpr = (text, type, where) => {
      if (process.env.DEBUG) writeSync(2, "check " + where + " " + text + "\n");
      if (text === '') return;
      const parser = new gd.ExpressionParser2();
      const node = parser.parseExpression(text).get();
      const validator = new gd.ExpressionValidator(platform, containers, type);
      node.visit(validator);
      const errs = validator.getAllErrors();
      for (let k = 0; k < errs.size(); k++) errors.push(`${layout.getName()} ${where}: "${text}" -> ${errs.at(k).getMessage()}`);
      validator.delete(); parser.delete();
    };
    visit(layout.getEvents(), '#');

  }
  return errors;
}
