// 🆕 Molde MCC4 3D — visualização temporária, só pra apresentação do
// supervisor. Exterior modelado a partir da foto frontal real do molde
// (corpo central com "OMS", 3 janelas, asas laterais escalonadas, olhais,
// pés, grade de refrigeração, canos em U, mangueiras com fita amarela,
// "06"). O botão "Ver interior" abre o molde ao meio: a metade da frente
// (lado móvel) vai pra frente e a de trás (lado fixo) vai pra trás,
// revelando as 4 placas de cobre e o que fica em volta delas:
//   - furos de água na face interna da carcaça (é por ali que a água sai
//     pra placa);
//   - 4 cilindros de avanço/retorno nos cantos da placa larga do lado fixo;
//   - tubulão de água deitado dentro das asas do lado móvel (1 de cada lado);
//   - em cada placa estreita: caixa d'água, 2 caixas Benzer (em cima e
//     embaixo, pra dar conicidade) com fuso roscado, tubo telescópico de
//     água entre elas (encolhe quando o molde abre) e cardan descendo.
// O botão "Teste de água" enche os tubulões e mostra a água circulando.
//
// Dimensões são ESTIMADAS a partir das proporções das fotos — não são as
// medidas reais/confidenciais da MCC4 da CSN.
//
// Página pública (Molde3d.html), sem gate de admin — pedido do usuário,
// mesmo padrão do Sinótico 3D. Esse arquivo, Molde3d.html e o link do
// menu (app.html) são pra ser removidos depois da apresentação.

let cena3dIniciada = false;

export function renderMolde3D() {
    if (cena3dIniciada) return;
    cena3dIniciada = true;
    iniciarCena().catch((erro) => {
        console.error('[Molde3D] Falha ao carregar visualização 3D:', erro);
        const loading = document.getElementById('molde3d-loading');
        if (loading) loading.textContent = 'Não foi possível carregar o modelo 3D.';
    });
}

function novoCanvas(larg, alt) {
    const c = document.createElement('canvas');
    c.width = larg;
    c.height = alt;
    return [c, c.getContext('2d')];
}

function texturaDeCanvas(THREE, canvas) {
    const t = new THREE.CanvasTexture(canvas);
    if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
}

function manchasCobre(ctx, larg, alt, qtd) {
    for (let i = 0; i < qtd; i++) {
        ctx.fillStyle = i % 2 ? 'rgba(120,70,40,0.25)' : 'rgba(40,32,28,0.25)';
        ctx.beginPath();
        ctx.arc(Math.random() * larg, Math.random() * alt, 3 + Math.random() * 14, 0, Math.PI * 2);
        ctx.fill();
    }
}

function furoAberto(ctx, x, y, r) {
    ctx.fillStyle = '#9a5a3a';
    ctx.beginPath(); ctx.arc(x, y, r + 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1c1411';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

function tampaVermelha(ctx, x, y, r) {
    ctx.fillStyle = '#6b2a24';
    ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c23a3e';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

// Aço cinza-escuro com textura leve de fundido (pedido do usuário: o
// marrom com manchas de ferrugem deixava o molde com cara de sujo).
function criarTexturaAcoGasto(THREE) {
    const [c, ctx] = novoCanvas(512, 512);
    ctx.fillStyle = '#3b3e43';
    ctx.fillRect(0, 0, 512, 512);
    const manchas = ['rgba(255,255,255,0.035)', 'rgba(0,0,0,0.07)', 'rgba(120,128,138,0.06)', 'rgba(20,22,26,0.06)'];
    for (let i = 0; i < 900; i++) {
        ctx.fillStyle = manchas[i % manchas.length];
        const r = 1 + Math.random() * 10;
        ctx.beginPath();
        ctx.ellipse(Math.random() * 512, Math.random() * 512, r, r * (0.5 + Math.random()), Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }
    for (let i = 0; i < 4000; i++) {
        ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
    }
    const t = texturaDeCanvas(THREE, c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
}

// Frente da placa: lisa, ~2/3 de cima cobre e 1/3 de baixo cinza/aço,
// com a borda de cima pintada de vermelho (foto real).
function criarTexturaPlacaFrente(THREE, larg = 512, alt = 256) {
    const [c, ctx] = novoCanvas(larg, alt);
    const corte = Math.round(alt * 0.64);
    const gc = ctx.createLinearGradient(0, 0, larg, 0);
    gc.addColorStop(0, '#b87a55');
    gc.addColorStop(0.5, '#c98b62');
    gc.addColorStop(1, '#b17350');
    ctx.fillStyle = gc;
    ctx.fillRect(0, 0, larg, corte);
    const gs = ctx.createLinearGradient(0, corte, 0, alt);
    gs.addColorStop(0, '#9aa0a6');
    gs.addColorStop(1, '#7d838a');
    ctx.fillStyle = gs;
    ctx.fillRect(0, corte, larg, alt - corte);
    ctx.fillStyle = 'rgba(190,50,45,0.85)';
    ctx.fillRect(0, 0, larg, Math.max(4, alt * 0.023));
    for (let i = 0; i < 40; i++) {
        ctx.strokeStyle = 'rgba(255,230,210,0.05)';
        ctx.lineWidth = 8 + Math.random() * 20;
        ctx.beginPath();
        ctx.arc(Math.random() * larg, Math.random() * corte, 20 + Math.random() * 60, 0, Math.PI * 2);
        ctx.stroke();
    }
    return texturaDeCanvas(THREE, c);
}

// Traseira da placa larga: grade de furos de refrigeração — tampas
// vermelhas, furos abertos com anel de cobre (fileiras de cima e de
// baixo) e o chicote de fio amarelo passando no terço de cima.
function criarTexturaPlacaTras(THREE) {
    const [c, ctx] = novoCanvas(1024, 512);
    ctx.fillStyle = '#5b4b3f';
    ctx.fillRect(0, 0, 1024, 512);
    manchasCobre(ctx, 1024, 512, 300);
    const colunas = 22;
    const passo = 1024 / colunas;
    for (let col = 0; col < colunas; col++) {
        const x = passo / 2 + col * passo;
        furoAberto(ctx, x, 40, 17);
        furoAberto(ctx, x, 472, 17);
        for (let lin = 0; lin < 6; lin++) {
            const y = 100 + lin * 58;
            const xo = lin % 2 ? passo / 2 : 0;
            if (x + xo < 1010) tampaVermelha(ctx, x + xo, y, 12);
        }
    }
    ctx.strokeStyle = '#e2c23a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(60, 190);
    for (let x = 60; x < 1000; x += 160) {
        ctx.lineTo(x + 40, 190);
        ctx.lineTo(x + 40, 150);
        ctx.lineTo(x + 70, 150);
        ctx.lineTo(x + 70, 175);
        ctx.lineTo(x + 160, 175);
    }
    ctx.stroke();
    return texturaDeCanvas(THREE, c);
}

// 🔧 Traseira da placa ESTREITA com textura própria, na proporção dela
// (alta e fina) — antes ela reaproveitava a textura da placa larga, 22
// colunas de furos espremidas numa face de 14cm, que era o "tudo
// espremido/bugado" que aparecia.
function criarTexturaPlacaEstreitaTras(THREE) {
    const [c, ctx] = novoCanvas(256, 900);
    ctx.fillStyle = '#5b4b3f';
    ctx.fillRect(0, 0, 256, 900);
    manchasCobre(ctx, 256, 900, 120);
    [72, 184].forEach((x) => {
        furoAberto(ctx, x, 62, 24);
        furoAberto(ctx, x, 838, 24);
        for (let lin = 0; lin < 9; lin++) tampaVermelha(ctx, x, 150 + lin * 75, 16);
    });
    ctx.strokeStyle = '#e2c23a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(128, 120);
    for (let y = 120; y < 800; y += 110) {
        ctx.lineTo(128, y + 50);
        ctx.lineTo(112, y + 50);
        ctx.lineTo(112, y + 80);
        ctx.lineTo(128, y + 80);
    }
    ctx.stroke();
    return texturaDeCanvas(THREE, c);
}

// Furos de água na face interna da carcaça (mesma grade da traseira da
// placa larga, que é onde eles encostam). Fundo transparente — só os
// furos, colados na face da carcaça como um decalque.
function criarTexturaFurosCarcaca(THREE) {
    const [c, ctx] = novoCanvas(1024, 420);
    ctx.clearRect(0, 0, 1024, 420);
    const passo = 1024 / 22;
    function furo(x, y, r) {
        ctx.fillStyle = '#8f8a84';
        ctx.beginPath(); ctx.arc(x, y, r + 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#090807';
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    for (let col = 0; col < 22; col++) {
        const x = passo / 2 + col * passo;
        furo(x, 40, 15);
        furo(x, 380, 15);
        if (col % 2 === 0) [140, 210, 280].forEach((y) => furo(x + passo / 2, y, 8));
    }
    return texturaDeCanvas(THREE, c);
}

function criarTexturaTexto(THREE, texto, cor) {
    const [c, ctx] = novoCanvas(256, 128);
    ctx.clearRect(0, 0, 256, 128);
    ctx.font = 'bold 92px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText(texto, 131, 69);
    ctx.fillStyle = cor;
    ctx.fillText(texto, 128, 64);
    return texturaDeCanvas(THREE, c);
}

function definirOpacidade(mat, op) {
    const transp = op < 0.999;
    if (mat.transparent !== transp) {
        mat.transparent = transp;
        mat.needsUpdate = true;
    }
    mat.opacity = op;
    mat.depthWrite = !transp;
}

async function iniciarCena() {
    const [THREE, { OrbitControls }] = await Promise.all([
        import('three'),
        import('three/addons/controls/OrbitControls.js'),
    ]);

    const container = document.getElementById('molde3d-container');
    const loading = document.getElementById('molde3d-loading');
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e15);
    scene.fog = new THREE.FogExp2(0x0a0e15, 0.03);

    const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.05, 200);
    camera.position.set(1.6, 1.25, 3.9);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if (renderer.outputColorSpace !== undefined) renderer.outputColorSpace = THREE.SRGBColorSpace;
    // r160 usa luz física por padrão — as intensidades abaixo são no modo legado.
    if ('useLegacyLights' in renderer) renderer.useLegacyLights = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.5, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.8;
    controls.maxDistance = 9;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.update();

    // ---- luz ----
    scene.add(new THREE.AmbientLight(0xb8c0cc, 0.65));
    scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x2a241c, 0.55));
    const key = new THREE.DirectionalLight(0xfff1dd, 1.7);
    key.position.set(3, 5, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, far: 20 });
    key.shadow.bias = -0.0005;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x9ab8ff, 0.8);
    rim.position.set(-4, 3, -4);
    scene.add(rim);
    const fill = new THREE.PointLight(0xffe2c0, 0.8, 12, 2);
    fill.position.set(0, 1.8, 3);
    scene.add(fill);

    // ---- piso ----
    const floor = new THREE.Mesh(
        new THREE.CircleGeometry(5, 64),
        new THREE.MeshStandardMaterial({ color: 0x3a3c40, roughness: 0.95, metalness: 0.05 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const faixaPiso = new THREE.Mesh(new THREE.PlaneGeometry(10, 0.05), new THREE.MeshStandardMaterial({ color: 0xc9a52a, roughness: 0.8 }));
    faixaPiso.rotation.x = -Math.PI / 2;
    faixaPiso.position.set(0, 0.002, 1.05);
    scene.add(faixaPiso);

    // ---- materiais ----
    const texAco = criarTexturaAcoGasto(THREE);
    const acoMat = new THREE.MeshStandardMaterial({ map: texAco, roughness: 0.82, metalness: 0.45 });
    // Asas do lado móvel com material próprio: ficam semitransparentes no
    // "Ver interior" pra dar pra ver o tubulão de água dentro delas.
    const acoAsaMovelMat = acoMat.clone();
    const acoEscuroMat = new THREE.MeshStandardMaterial({ map: texAco, color: 0x9ea2a8, roughness: 0.85, metalness: 0.45 });
    const ferrugemMat = new THREE.MeshStandardMaterial({ color: 0x2c2f33, roughness: 0.8, metalness: 0.4 });
    const buracoMat = new THREE.MeshStandardMaterial({ color: 0x0c0b0a, roughness: 1, metalness: 0 });
    const parafusoMat = new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 0.6, metalness: 0.7 });
    const canoMat = new THREE.MeshStandardMaterial({ color: 0x3b3d42, roughness: 0.5, metalness: 0.6 });
    const canoInoxMat = new THREE.MeshStandardMaterial({ color: 0x9a9da3, roughness: 0.3, metalness: 0.9 });
    const fitaAmarelaMat = new THREE.MeshStandardMaterial({ color: 0xd9a830, roughness: 0.7 });
    const tampaPretaMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.6 });
    const pinturaCinzaMat = new THREE.MeshStandardMaterial({ color: 0x8f959b, roughness: 0.7, metalness: 0.3 });
    const fitaCremeMat = new THREE.MeshStandardMaterial({ color: 0xc8a27a, roughness: 0.85 });
    const cardanMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.55, metalness: 0.3 });
    const etiquetaMat = new THREE.MeshStandardMaterial({ color: 0xd9822b, roughness: 0.6 });
    const tubulaoMat = new THREE.MeshStandardMaterial({ color: 0x70747a, roughness: 0.45, metalness: 0.7 });
    const teleLuvaMat = new THREE.MeshStandardMaterial({ color: 0x5c6066, roughness: 0.45, metalness: 0.7 });
    const teleInternoMat = canoInoxMat.clone();
    const aguaMat = new THREE.MeshStandardMaterial({ color: 0x4fb3ff, emissive: 0x1a6fd0, emissiveIntensity: 0.7, roughness: 0.2, metalness: 0, transparent: true, opacity: 0.9 });
    const aguaTubulaoMat = new THREE.MeshStandardMaterial({ color: 0x3d9cf0, emissive: 0x1557a8, emissiveIntensity: 0.5, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.75 });
    const furosCarcacaMat = new THREE.MeshStandardMaterial({ map: criarTexturaFurosCarcaca(THREE), alphaTest: 0.5, roughness: 0.8, metalness: 0.3 });

    const cobreFrenteMat = new THREE.MeshPhysicalMaterial({ map: criarTexturaPlacaFrente(THREE), roughness: 0.38, metalness: 0.85, clearcoat: 0.2, clearcoatRoughness: 0.4 });
    const cobreTrasMat = new THREE.MeshStandardMaterial({ map: criarTexturaPlacaTras(THREE), roughness: 0.75, metalness: 0.4, emissive: 0x1d6fe0, emissiveIntensity: 0 });
    const cobreEstreitaFrenteMat = new THREE.MeshPhysicalMaterial({ map: criarTexturaPlacaFrente(THREE, 128, 450), roughness: 0.38, metalness: 0.85, clearcoat: 0.2, clearcoatRoughness: 0.4 });
    const cobreEstreitaTrasMat = new THREE.MeshStandardMaterial({ map: criarTexturaPlacaEstreitaTras(THREE), roughness: 0.75, metalness: 0.4, emissive: 0x1d6fe0, emissiveIntensity: 0 });
    const cobreBordaMat = new THREE.MeshStandardMaterial({ color: 0xa8674a, roughness: 0.5, metalness: 0.7 });

    // ---- helpers ----
    const linhaMat = new THREE.LineBasicMaterial({ color: 0x0a0908, transparent: true, opacity: 0.55 });
    function box(pai, w, h, d, x, y, z, mat, contorno = true) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);
        m.castShadow = true;
        m.receiveShadow = true;
        if (contorno) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), linhaMat));
        pai.add(m);
        return m;
    }
    function cilindro(pai, r, h, x, y, z, mat, eixo = 'z', seg = 16) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
        if (eixo === 'z') m.rotation.x = Math.PI / 2;
        if (eixo === 'x') m.rotation.z = Math.PI / 2;
        m.position.set(x, y, z);
        m.castShadow = true;
        pai.add(m);
        return m;
    }
    function tubo(pai, pontos, r, mat) {
        const curva = new THREE.CatmullRomCurve3(pontos.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.2);
        const m = new THREE.Mesh(new THREE.TubeGeometry(curva, 64, r, 12, false), mat);
        m.castShadow = true;
        pai.add(m);
        return curva;
    }
    function texto(pai, tex, w, h, x, y, z, rotY = 0) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6, metalness: 0.3 }));
        m.position.set(x, y, z);
        m.rotation.y = rotY;
        pai.add(m);
    }
    function olhal(pai, x, y, z) {
        box(pai, 0.11, 0.11, 0.07, x, y, z, ferrugemMat);
        const aro = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.012, 10, 24), ferrugemMat);
        aro.position.set(x, y + 0.02, z + 0.036);
        pai.add(aro);
        cilindro(pai, 0.022, 0.075, x, y + 0.02, z, buracoMat, 'z');
    }
    function grupo(pai, label) {
        const g = new THREE.Group();
        g.userData.label = label;
        pai.add(g);
        return g;
    }

    // ---- dimensões (tiradas das proporções da foto frontal) ----
    const D = 0.9;           // profundidade total do molde (frente → trás)
    const CORPO_W = 1.45;
    const CORPO_Y0 = 0.36;   // base do corpo (em cima dos pés)
    const CORPO_H = 0.56;
    const CORPO_TOPO = CORPO_Y0 + CORPO_H;
    const CORPO_CY = CORPO_Y0 + CORPO_H / 2;

    const PLACA_LARGA_W = 1.22;
    const PLACA_ESTREITA_W = 0.14; // = espessura do veio
    const PLACA_H = 0.5;
    const COBRE_E = 0.045;
    const PLACA_CY = CORPO_Y0 + 0.03 + PLACA_H / 2;

    // Colunas da grade de furos (mesmas da textura da placa larga) — usadas
    // pra alinhar os jatos de água do teste com os furos da carcaça.
    const xColuna = (col) => -PLACA_LARGA_W / 2 + (col + 0.5) * (PLACA_LARGA_W / 22);
    const FURO_DY = PLACA_H / 2 - PLACA_H * (40 / 420);
    const furosAmostra = [];
    [2, 6, 11, 15, 19].forEach((col) => [FURO_DY, -FURO_DY].forEach((dy) => furosAmostra.push([xColuna(col), PLACA_CY + dy])));

    // O molde é montado em duas metades — fechadas elas formam o bloco
    // inteiro; no "Ver interior" cada uma desliza pro seu lado e revela as
    // placas de cobre no meio. sinal +1 = frente (lado móvel), -1 = trás
    // (lado fixo).
    function construirMetade(sinal, asaMat) {
        const g = new THREE.Group();
        const d = D / 2 - 0.004;
        const zc = sinal * (D / 4);
        const face = sinal * (D / 2);    // z da face externa dessa metade
        const fz = (off) => face + sinal * off;

        // corpo central
        box(g, CORPO_W, CORPO_H, d, 0, CORPO_CY, zc, acoMat);
        // aba fina no topo, no centro
        box(g, 0.035, 0.06, 0.03, 0, CORPO_TOPO + 0.03, fz(-0.05), acoEscuroMat);
        // abertura do canal do molde no topo (cavidade entre as placas)
        box(g, 1.22, 0.006, 0.09, 0, CORPO_TOPO + 0.002, sinal * 0.045, buracoMat, false);

        // 🆕 furos de água na face interna da carcaça (onde a placa larga
        // encosta) — é por eles que a água sai pra placa.
        const faceInterna = zc - sinal * (d / 2);
        const furos = new THREE.Mesh(new THREE.PlaneGeometry(PLACA_LARGA_W, PLACA_H), furosCarcacaMat);
        furos.position.set(0, PLACA_CY, faceInterna - sinal * 0.0015);
        furos.rotation.y = sinal > 0 ? Math.PI : 0;
        furos.userData.label = 'Furos de água da carcaça';
        g.add(furos);

        // asas laterais escalonadas (esquerda e direita)
        [-1, 1].forEach((lado) => {
            // parte interna, mais alta, colada no corpo
            box(g, 0.46, 0.43, d * 0.86, lado * 0.95, 0.635, sinal * (d * 0.86) / 2, asaMat);
            // rampa entre a parte interna e a externa
            const rampa = box(g, 0.2, 0.06, d * 0.8, lado * 1.07, 0.745, sinal * (d * 0.8) / 2, asaMat);
            rampa.rotation.z = lado * 0.55;
            // parte externa, mais baixa
            box(g, 0.49, 0.29, d * 0.8, lado * 1.265, 0.555, sinal * (d * 0.8) / 2, asaMat);
            // aba de apoio embaixo da asa externa
            box(g, 0.5, 0.05, d * 0.7, lado * 1.25, 0.385, sinal * (d * 0.7) / 2, acoEscuroMat);
            // olhal de içamento em cima da asa externa
            olhal(g, lado * 1.38, 0.755, sinal * (d * 0.8 - 0.06));
            // bloco de trás em cima da asa interna
            box(g, 0.18, 0.08, 0.12, lado * 1.02, 0.89, sinal * 0.1, ferrugemMat);
        });

        // furos redondos nos cantos de cima, na junção corpo/asa
        [-0.79, 0.79].forEach((x) => cilindro(g, 0.028, 0.03, x, 0.76, fz(-0.005), buracoMat, 'z'));

        // 3 janelas retangulares (grande, pequena, grande) — rebaixo escuro
        // + soleira clara embaixo, igual à foto
        [[-0.40, 0.42], [-0.01, 0.22], [0.375, 0.43]].forEach(([x, w]) => {
            box(g, w, 0.14, 0.012, x, 0.61, fz(0.0), buracoMat, false);
            box(g, w, 0.022, 0.05, x, 0.54, fz(0.01), acoEscuroMat);
            box(g, w + 0.04, 0.018, 0.02, x, 0.69, fz(0.005), acoEscuroMat);
            box(g, 0.018, 0.16, 0.02, x - w / 2 - 0.009, 0.61, fz(0.005), acoEscuroMat);
            box(g, 0.018, 0.16, 0.02, x + w / 2 + 0.009, 0.61, fz(0.005), acoEscuroMat);
        });

        // parafusos espalhados na face
        [[-0.66, 0.84], [-0.66, 0.47], [0.66, 0.84], [0.66, 0.47], [-0.25, 0.86], [0.2, 0.86], [-0.84, 0.52], [0.84, 0.52], [-0.88, 0.8], [0.88, 0.8]]
            .forEach(([x, y]) => cilindro(g, 0.012, 0.02, x, y, fz(0.008), parafusoMat, 'z', 6));

        // ressalto horizontal (base do corpo) e grade de refrigeração embaixo
        box(g, 1.63, 0.03, d + 0.02, 0, 0.355, sinal * (d + 0.02) / 2, acoEscuroMat);
        box(g, 1.37, 0.14, d * 0.9, 0.015, 0.27, sinal * (d * 0.9) / 2, acoEscuroMat);
        for (let i = 0; i < 22; i++) {
            const x = -0.64 + i * (1.3 / 21);
            box(g, 0.012, 0.12, 0.02, x, 0.27, sinal * (d * 0.9 + 0.01), ferrugemMat, false);
        }

        // pés (grossos, com consolo em cima)
        [-0.67, 0.69].forEach((x) => {
            box(g, 0.11, 0.3, 0.1, x, 0.15, fz(-0.1), acoEscuroMat);
            box(g, 0.17, 0.05, 0.14, x, 0.315, fz(-0.1), acoEscuroMat);
            box(g, 0.14, 0.02, 0.13, x, 0.01, fz(-0.1), acoEscuroMat);
        });

        g.userData.faceInterna = faceInterna;
        return g;
    }

    const frente = construirMetade(1, acoAsaMovelMat);
    frente.userData.label = 'Carcaça — lado móvel';
    const tras = construirMetade(-1, acoMat);
    tras.userData.label = 'Carcaça — lado fixo';
    scene.add(frente, tras);

    // ---- detalhes só da face da frente (foto) ----
    const zF = D / 2;
    texto(frente, criarTexturaTexto(THREE, 'OMS', '#cfc8bd'), 0.22, 0.11, -0.48, 0.85, zF + 0.003);
    texto(frente, criarTexturaTexto(THREE, '06', '#e2d6c6'), 0.16, 0.08, 1.4, 0.66, (D / 2 - 0.004) * 0.8 + 0.003);
    // tampa pequena parafusada na asa esquerda
    box(frente, 0.08, 0.13, 0.015, -0.92, 0.59, (D / 2 - 0.004) * 0.86 + 0.008, ferrugemMat);
    // cano em U da esquerda
    tubo(frente, [[-1.5, 0.52, 0.34], [-1.2, 0.52, 0.36], [-1.08, 0.5, 0.38], [-1.05, 0.42, 0.38], [-1.05, 0.33, 0.36]], 0.028, canoMat);
    // mangueira da esquerda com ponta de fita amarela
    const mEsq = tubo(frente, [[-0.95, 0.36, 0.3], [-1.15, 0.37, 0.55], [-1.35, 0.38, 0.72]], 0.018, canoMat);
    const pEsq = mEsq.getPoint(1);
    cilindro(frente, 0.03, 0.08, pEsq.x, pEsq.y, pEsq.z, fitaAmarelaMat, 'x').rotation.y = 0.6;
    cilindro(frente, 0.034, 0.04, pEsq.x - 0.05, pEsq.y, pEsq.z + 0.03, tampaPretaMat, 'x').rotation.y = 0.6;
    // cano em U grande da direita (sobe, vai pra direita, desce)
    tubo(frente, [[0.9, 0.22, 0.34], [0.95, 0.4, 0.36], [0.98, 0.52, 0.38], [1.15, 0.54, 0.38], [1.5, 0.55, 0.36], [1.56, 0.5, 0.36], [1.56, 0.44, 0.36]], 0.03, canoMat);
    // cano inox horizontal passando embaixo do corpo
    tubo(frente, [[-0.4, 0.22, 0.42], [0.1, 0.22, 0.43], [0.5, 0.23, 0.43], [0.9, 0.22, 0.4]], 0.02, canoInoxMat);
    // mangueira da direita com ponta de fita amarela
    const mDir = tubo(frente, [[1.02, 0.4, 0.32], [1.2, 0.33, 0.55], [1.45, 0.24, 0.75]], 0.018, canoMat);
    const pDir = mDir.getPoint(1);
    cilindro(frente, 0.03, 0.08, pDir.x, pDir.y, pDir.z, fitaAmarelaMat, 'x').rotation.y = -0.6;
    cilindro(frente, 0.034, 0.04, pDir.x + 0.05, pDir.y, pDir.z + 0.03, tampaPretaMat, 'x').rotation.y = -0.6;

    // ---- tubulão de água (só no lado móvel, dentro de cada asa) ----
    const TUB_Y = 0.63;
    const TUB_ZC = 0.2;
    const TUB_L = 0.34;
    const aguasTubulao = [];
    const entradasTubulao = [];
    [-1, 1].forEach((lado) => {
        const g = grupo(frente, 'Tubulão de água (lado móvel)');
        const x = lado * 0.95;
        cilindro(g, 0.085, TUB_L, x, TUB_Y, TUB_ZC, tubulaoMat, 'x', 32);
        [x - TUB_L / 2, x + TUB_L / 2].forEach((xf) => cilindro(g, 0.105, 0.02, xf, TUB_Y, TUB_ZC, acoEscuroMat, 'x', 32));
        const geo = new THREE.CylinderGeometry(0.078, 0.078, 1, 28);
        geo.translate(0, 0.5, 0);
        const agua = new THREE.Mesh(geo, aguaTubulaoMat);
        agua.rotation.z = -Math.PI / 2; // deitado, enche da ponta de x menor pra x maior
        agua.position.set(x - TUB_L / 2 + 0.005, TUB_Y, TUB_ZC);
        agua.visible = false;
        g.add(agua);
        aguasTubulao.push(agua);
        // entrada de água por baixo, saindo pela frente do molde
        const pontos = [[x, 0.2, 0.56], [x, 0.21, 0.36], [x, 0.3, TUB_ZC], [x, TUB_Y - 0.085, TUB_ZC]];
        tubo(g, pontos, 0.03, canoMat);
        entradasTubulao.push({ x, pontos });
    });

    // ---- placas de cobre (dentro do corpo) ----
    const zPlacaLarga = PLACA_ESTREITA_W / 2 + COBRE_E / 2;
    const xPlacaEstreita = PLACA_LARGA_W / 2 - COBRE_E / 2;
    const grupoCobre = new THREE.Group();
    scene.add(grupoCobre);

    // BoxGeometry: ordem dos materiais = [+x, -x, +y, -y, +z, -z].
    // Face lisa bicolor pra dentro do canal, face furada pra fora.
    function placa(w, d, x, z, eixoFora, sinalFora, label, matFora, matDentro) {
        const mats = Array(6).fill(cobreBordaMat);
        const idxFora = eixoFora === 'x' ? (sinalFora > 0 ? 0 : 1) : (sinalFora > 0 ? 4 : 5);
        const idxDentro = eixoFora === 'x' ? (sinalFora > 0 ? 1 : 0) : (sinalFora > 0 ? 5 : 4);
        mats[idxFora] = matFora;
        mats[idxDentro] = matDentro;
        const geo = new THREE.BoxGeometry(w, PLACA_H, d);
        const m = new THREE.Mesh(geo, mats);
        m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), linhaMat));
        m.position.set(x, PLACA_CY, z);
        m.castShadow = true;
        m.receiveShadow = true;
        m.userData.label = label;
        grupoCobre.add(m);
        return m;
    }
    // Cada placa guarda o eixo/sinal/distância em que ela se afasta das
    // outras no "Ver interior". As estreitas se afastam mais, pra ficar
    // claro que são peças separadas das largas.
    function comAfastamento(mesh, eixo, sinal, abertura) {
        mesh.userData.eixoAfastamento = eixo;
        mesh.userData.sinalAfastamento = sinal;
        mesh.userData.aberturaAfastamento = abertura;
        mesh.userData.baseAfastamento = eixo === 'z' ? mesh.position.z : mesh.position.x;
        return mesh;
    }
    const ABERTURA_LARGA = 0.22;
    const ABERTURA_ESTREITA = 0.2;
    const placas = [
        comAfastamento(placa(PLACA_LARGA_W, COBRE_E, 0, zPlacaLarga, 'z', 1, 'Placa larga — lado móvel', cobreTrasMat, cobreFrenteMat), 'z', 1, ABERTURA_LARGA),
        comAfastamento(placa(PLACA_LARGA_W, COBRE_E, 0, -zPlacaLarga, 'z', -1, 'Placa larga — lado fixo', cobreTrasMat, cobreFrenteMat), 'z', -1, ABERTURA_LARGA),
        comAfastamento(placa(COBRE_E, PLACA_ESTREITA_W, xPlacaEstreita, 0, 'x', 1, 'Placa estreita', cobreEstreitaTrasMat, cobreEstreitaFrenteMat), 'x', 1, ABERTURA_ESTREITA),
        comAfastamento(placa(COBRE_E, PLACA_ESTREITA_W, -xPlacaEstreita, 0, 'x', -1, 'Placa estreita', cobreEstreitaTrasMat, cobreEstreitaFrenteMat), 'x', -1, ABERTURA_ESTREITA),
    ];

    // ---- foot rolls e guias (fotos reais) ----
    // Presos como filhos das placas, pra acompanharem a placa na abertura.
    const mancalMat = new THREE.MeshStandardMaterial({ color: 0x8e8b85, roughness: 0.85, metalness: 0.4 });
    const faixaVermelhaMat = new THREE.MeshStandardMaterial({ color: 0xc2343a, roughness: 0.6 });
    const rolinhoMat = new THREE.MeshStandardMaterial({ color: 0xa3a6ab, roughness: 0.35, metalness: 0.85 });
    const tampaRoloMat = new THREE.MeshStandardMaterial({ color: 0x2a2826, roughness: 0.6, metalness: 0.5 });

    // Foot roll: 3 eixos inox empilhados embaixo da placa larga, cada um
    // apoiado em 4 mancais de ferro fundido com faixa vermelha.
    function adicionarFootRoll(placaLarga, sinal) {
        const g = grupo(placaLarga, 'Foot roll');
        g.position.set(0, -PLACA_H / 2 - 0.035, -sinal * 0.025);
        [0, -0.068, -0.136].forEach((y) => {
            cilindro(g, 0.028, PLACA_LARGA_W - 0.06, 0, y, 0, canoInoxMat, 'x', 24);
            [-0.46, -0.15, 0.15, 0.46].forEach((x) => {
                box(g, 0.05, 0.062, 0.075, x, y, 0, mancalMat);
                cilindro(g, 0.0295, 0.028, x + 0.042, y, 0, faixaVermelhaMat, 'x', 24);
            });
        });
        [-0.46, -0.15, 0.15, 0.46].forEach((x) => box(g, 0.03, 0.05, 0.03, x, -0.19, sinal * 0.02, mancalMat));
    }

    // Guia: bloco de ferro enferrujado embaixo da placa estreita, com os
    // rolinhos empilhados virados pro lado de dentro do molde.
    function adicionarGuia(placaEstreita, sinal) {
        const g = grupo(placaEstreita, 'Guia (rolinhos) da placa estreita');
        g.position.set(0, -PLACA_H / 2 - 0.12, 0);
        box(g, 0.05, 0.22, 0.13, sinal * 0.01, 0, 0, ferrugemMat);
        box(g, 0.07, 0.03, 0.15, sinal * 0.005, -0.12, 0, ferrugemMat);
        [0.075, 0.025, -0.025, -0.075].forEach((y) => {
            const xr = -sinal * 0.035;
            cilindro(g, 0.021, 0.09, xr, y, 0, rolinhoMat, 'z', 20);
            box(g, 0.04, 0.042, 0.012, xr + sinal * 0.01, y, 0.051, mancalMat);
            box(g, 0.04, 0.042, 0.012, xr + sinal * 0.01, y, -0.051, mancalMat);
            cilindro(g, 0.011, 0.004, xr, y, 0.058, tampaRoloMat, 'z', 12);
        });
    }

    adicionarFootRoll(placas[0], 1);
    adicionarFootRoll(placas[1], -1);
    adicionarGuia(placas[2], 1);
    adicionarGuia(placas[3], -1);

    // ---- cilindros de avanço/retorno (nos cantos da placa larga do lado fixo, atrás) ----
    // Fotos reais: flange quadrada com bujões sextavados, camisa redonda
    // pintada de cinza, vedação com fita e haste com ponta roscada. A
    // ponta roscada vai na placa; a flange fica pro lado da carcaça.
    function adicionarCilindroAvanco(placaLarga, x, y) {
        const g = grupo(placaLarga, 'Cilindro de avanço/retorno');
        // placa de trás: gira 180° pra o cilindro apontar pra fora (-z)
        g.position.set(x, y, -COBRE_E / 2);
        g.rotation.y = Math.PI;
        cilindro(g, 0.019, 0.03, 0, 0, 0.005, canoInoxMat, 'z', 16);
        for (let i = 0; i < 4; i++) cilindro(g, 0.021, 0.003, 0, 0, i * 0.007, parafusoMat, 'z', 16);
        cilindro(g, 0.028, 0.02, 0, 0, 0.03, parafusoMat, 'z', 6);
        cilindro(g, 0.018, 0.1, 0, 0, 0.09, canoInoxMat, 'z', 20);
        cilindro(g, 0.031, 0.016, 0, 0, 0.148, fitaCremeMat, 'z', 20);
        cilindro(g, 0.05, 0.13, 0, 0, 0.221, pinturaCinzaMat, 'z', 28);
        cilindro(g, 0.007, 0.012, 0, 0.05, 0.2, buracoMat, 'y', 8);
        box(g, 0.13, 0.13, 0.03, 0, 0, 0.301, pinturaCinzaMat);
        [[-0.03, 0.03], [0.02, 0.035], [0.035, -0.01], [-0.035, -0.025], [0.0, -0.035]]
            .forEach(([px, py]) => cilindro(g, 0.011, 0.006, px, py, 0.319, parafusoMat, 'z', 6));
        [[-0.05, 0.05], [0.05, 0.05], [-0.05, -0.05], [0.05, -0.05]]
            .forEach(([px, py]) => cilindro(g, 0.012, 0.004, px, py, 0.317, buracoMat, 'z', 16));
        cilindro(g, 0.009, 0.02, 0, 0.075, 0.301, fitaCremeMat, 'y', 12);
        cilindro(g, 0.01, 0.02, (x > 0 ? 1 : -1) * 0.075, 0, 0.301, fitaCremeMat, 'x', 12);
    }
    [[-0.5, 0.17], [0.5, 0.17], [-0.5, -0.17], [0.5, -0.17]].forEach(([x, y]) => adicionarCilindroAvanco(placas[1], x, y));

    // ---- mecanismo de cada placa estreita ----
    // A caixa d'água e os fusos são presos na placa (andam com ela). O
    // suporte com as 2 caixas Benzer fica parado no grupo do cobre — então
    // quando a placa se afasta no "Ver interior" ela chega mais perto do
    // suporte, o fuso avança pela caixa Benzer e o tubo telescópico encolhe,
    // igual acontece de verdade quando o molde abre.
    const FUSO_Y = 0.13;
    const TELE_Y = [0.05, -0.05];
    const CX_AGUA_E = 0.05;
    const faceCaixaAgua = COBRE_E / 2 + CX_AGUA_E;
    const Y_BASE_CARDAN = 0.12 - PLACA_CY;
    const mecanismos = [];
    const pecasGiratorias = [];
    function montarMecanismoEstreita(placaEstreita, s) {
        box(placaEstreita, CX_AGUA_E, PLACA_H * 0.86, 0.1, s * (COBRE_E / 2 + CX_AGUA_E / 2), 0, 0, acoEscuroMat)
            .userData.label = "Caixa d'água da placa estreita";

        [FUSO_Y, -FUSO_Y].forEach((y) => {
            const fuso = grupo(placaEstreita, 'Fuso (haste roscada) — move a placa estreita');
            const x0 = s * faceCaixaAgua;
            cilindro(fuso, 0.013, 0.45, x0 + s * 0.225, y, 0, canoInoxMat, 'x', 16);
            for (let i = 0; i < 30; i++) cilindro(fuso, 0.016, 0.004, x0 + s * (0.03 + i * 0.014), y, 0, parafusoMat, 'x', 16);
            pecasGiratorias.push(cilindro(fuso, 0.03, 0.03, x0 + s * 0.015, y, 0, parafusoMat, 'x', 6));
            pecasGiratorias.push(cilindro(fuso, 0.02, 0.012, x0 + s * 0.45, y, 0, parafusoMat, 'x', 6));
        });

        const frameX = s * 0.95;
        const quadro = new THREE.Group();
        quadro.position.set(0, PLACA_CY, 0);
        grupoCobre.add(quadro);
        box(quadro, 0.025, 0.46, 0.16, frameX + s * 0.0125, 0, 0, acoEscuroMat).userData.label = 'Suporte das caixas Benzer';

        [[FUSO_Y, 0.045], [-FUSO_Y, -0.045]].forEach(([y, zCardan]) => {
            const cb = grupo(quadro, 'Caixa Benzer (A18601-02) — ajuste da placa estreita');
            const gx = frameX + s * (0.025 + 0.06);
            box(cb, 0.12, 0.1, 0.12, gx, y, 0, pinturaCinzaMat);
            cilindro(cb, 0.052, 0.022, gx, y, 0.071, pinturaCinzaMat, 'z', 28);
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2;
                cilindro(cb, 0.006, 0.006, gx + Math.cos(a) * 0.042, y + Math.sin(a) * 0.042, 0.084, parafusoMat, 'z', 6);
            }
            cilindro(cb, 0.032, 0.02, gx - s * 0.07, y, 0, pinturaCinzaMat, 'x', 20);
            box(cb, 0.035, 0.022, 0.003, gx - s * 0.02, y + 0.025, 0.0615, etiquetaMat, false);

            const cardan = grupo(quadro, 'Cardan — aciona a caixa Benzer');
            const xc = s * 1.14;
            cilindro(cardan, 0.01, 0.05, s * 1.115, y, zCardan, canoInoxMat, 'x', 12);
            box(cardan, 0.035, 0.035, 0.035, xc, y, zCardan, parafusoMat);
            const junta = (yj) => {
                box(cardan, 0.03, 0.02, 0.012, xc, yj, zCardan, cardanMat, false);
                box(cardan, 0.012, 0.02, 0.03, xc, yj - 0.018, zCardan, cardanMat, false);
            };
            junta(y - 0.035);
            const topo = y - 0.06;
            const base = Y_BASE_CARDAN + 0.06;
            cilindro(cardan, 0.011, topo - base, xc, (topo + base) / 2, zCardan, canoInoxMat, 'y', 12);
            junta(Y_BASE_CARDAN + 0.05);
            box(cardan, 0.035, 0.035, 0.035, xc, Y_BASE_CARDAN, zCardan, parafusoMat);
        });

        // Tubo telescópico de água: luva presa no suporte, tubo interno
        // preso na caixa d'água. Comprimento recalculado a cada quadro.
        // 2 telescópicos, um em cima do outro, entre os fusos.
        const teles = TELE_Y.map((yt) => {
            const tele = grupo(quadro, 'Tubo telescópico — água da placa estreita (encolhe ao abrir)');
            const luva = cilindro(tele, 0.026, 1, 0, yt, 0, teleLuvaMat, 'x', 20);
            const interno = cilindro(tele, 0.018, 1, 0, yt, 0, teleInternoMat, 'x', 20);
            return { luva, interno };
        });
        mecanismos.push({ s, placa: placaEstreita, frameX, teles, pontaPlaca: () => placaEstreita.position.x + s * faceCaixaAgua });
    }
    montarMecanismoEstreita(placas[2], 1);
    montarMecanismoEstreita(placas[3], -1);

    function atualizarTelescopicos() {
        mecanismos.forEach((m) => {
            const pOut = m.pontaPlaca();
            const L = Math.max(0.01, Math.abs(m.frameX - pOut) * 0.62);
            m.teles.forEach(({ luva, interno }) => {
                luva.scale.y = L;
                luva.position.x = m.frameX - m.s * L / 2;
                interno.scale.y = L;
                interno.position.x = pOut + m.s * L / 2;
            });
        });
    }
    atualizarTelescopicos();

    // ---- teste de água: partículas correndo pelos caminhos ----
    const fluxos = [];
    const gotaGeo = new THREE.SphereGeometry(1, 8, 6);
    const dummy = new THREE.Object3D();
    function criarFluxo(pai, n, velocidade, tamanho, pontoEm, opcoes = {}) {
        const mesh = new THREE.InstancedMesh(gotaGeo, aguaMat, n);
        mesh.frustumCulled = false;
        mesh.visible = false;
        pai.add(mesh);
        fluxos.push({ mesh, n, velocidade, tamanho, pontoEm, v: new THREE.Vector3(), entrada: !!opcoes.entrada, spray: !!opcoes.spray });
    }
    function fluxoCurva(pai, pontos, n, velocidade, tamanho, opcoes) {
        const curva = new THREE.CatmullRomCurve3(pontos.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.3);
        criarFluxo(pai, n, velocidade, tamanho, (t, out) => curva.getPoint(t, out), opcoes);
    }

    // 1) entrada → tubulão (e percorrendo o tubulão)
    entradasTubulao.forEach(({ x, pontos }) => {
        fluxoCurva(frente, [...pontos, [x - 0.1, TUB_Y, TUB_ZC], [x + 0.14, TUB_Y, TUB_ZC]], 18, 0.35, 0.014, { entrada: true });
    });
    // 2) tubulão → furos da carcaça do lado móvel
    furosAmostra.forEach(([hx, hy]) => {
        const lado = hx >= 0 ? 1 : -1;
        fluxoCurva(frente, [[lado * 0.95, TUB_Y, TUB_ZC], [lado * 0.72, TUB_Y, 0.12], [hx, hy, 0.06], [hx, hy, frente.userData.faceInterna]], 8, 0.5, 0.011);
    });
    // 3) jatos saindo dos furos da carcaça (os dois lados) em direção à placa
    [frente, tras].forEach((metade) => {
        const sinal = metade === frente ? 1 : -1;
        const z0 = metade.userData.faceInterna;
        furosAmostra.forEach(([hx, hy]) => {
            criarFluxo(metade, 7, 0.9, 0.011, (t, out) => out.set(hx, hy - 0.07 * t * t, z0 - sinal * 0.3 * t), { spray: true });
        });
    });
    // 4) água subindo pelos canais das placas largas
    [placas[0], placas[1]].forEach((p, i) => {
        const sp = i === 0 ? 1 : -1;
        [1, 5, 9, 13, 17, 21].forEach((col) => {
            const xc = xColuna(col);
            criarFluxo(p, 8, 0.45, 0.009, (t, out) => out.set(xc, -0.22 + 0.44 * t, sp * (COBRE_E / 2 + 0.008)));
        });
    });
    // 5) telescópicos → caixa d'água da placa estreita, e subindo/descendo nela
    mecanismos.forEach((m) => {
        TELE_Y.forEach((yt) => criarFluxo(grupoCobre, 10, 0.6, 0.012, (t, out) => out.set(m.frameX + (m.pontaPlaca() - m.frameX) * t, PLACA_CY + yt, 0)));
        [1, -1].forEach((dir) => [0.035, -0.035].forEach((zc) => {
            criarFluxo(m.placa, 6, 0.55, 0.009, (t, out) => out.set(m.s * (faceCaixaAgua + 0.008), dir * 0.2 * t, zc));
        }));
    });

    const testeAgua = { ativo: false, t: 0 };
    function atualizarFluxos(tempo) {
        const circulando = testeAgua.ativo && testeAgua.t > 1.6;
        fluxos.forEach((f) => {
            const ativo = testeAgua.ativo && (f.entrada || circulando);
            f.mesh.visible = ativo;
            if (!ativo) return;
            for (let i = 0; i < f.n; i++) {
                const t = (i / f.n + tempo * f.velocidade) % 1;
                f.pontoEm(t, f.v);
                dummy.position.copy(f.v);
                dummy.scale.setScalar(f.tamanho * (f.spray ? 1 - t * 0.6 : 1));
                dummy.updateMatrix();
                f.mesh.setMatrixAt(i, dummy.matrix);
            }
            f.mesh.instanceMatrix.needsUpdate = true;
        });
    }

    // ---- clique: modo foco ----
    // Clicou numa peça: some tudo em volta (inclusive o piso), a câmera
    // centraliza nela e libera girar por todos os ângulos, inclusive por
    // baixo. "Voltar ao molde" (ou Esc) restaura a cena.
    const raycaster = new THREE.Raycaster();
    raycaster.params.Line.threshold = 0.001;
    const pointer = new THREE.Vector2();
    const hudPeca = document.getElementById('molde3d-peca');
    const btnSairFoco = document.getElementById('molde3d-btn-sair-foco');
    let foco = null;

    function entrarFoco(alvo, label) {
        const objs = new Set();
        if (alvo.isMesh) {
            // placa (mesh com acessórios pendurados): só a própria placa
            objs.add(alvo);
            alvo.children.forEach((c) => { if (c.isLine) objs.add(c); });
        } else {
            alvo.traverse((o) => objs.add(o));
        }
        scene.updateMatrixWorld();
        const caixa = new THREE.Box3();
        const tmp = new THREE.Box3();
        objs.forEach((o) => {
            if (!o.isMesh || o.isInstancedMesh || !o.geometry) return;
            if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
            caixa.union(tmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld));
        });
        if (caixa.isEmpty()) return;
        const salvo = foco ? foco.salvo : { pos: camera.position.clone(), alvo: controls.target.clone() };
        foco = { objs, salvo };
        // Esconde via camada (não via .visible): a camada não passa pros
        // filhos, então dá pra isolar um foot roll sem sumir junto com a
        // placa que é "pai" dele.
        scene.traverse((o) => {
            if (o.isMesh || o.isLine || o.isSprite) o.layers.set(objs.has(o) ? 0 : 1);
        });
        const centro = caixa.getCenter(new THREE.Vector3());
        const raio = caixa.getSize(new THREE.Vector3()).length() / 2;
        const dir = camera.position.clone().sub(controls.target).normalize();
        controls.target.copy(centro);
        camera.position.copy(centro).addScaledVector(dir, Math.max(0.25, raio * 2.6));
        controls.minDistance = 0.05;
        controls.maxPolarAngle = Math.PI;
        if (btnSairFoco) btnSairFoco.style.display = 'inline-flex';
        if (hudPeca) {
            hudPeca.textContent = label;
            hudPeca.style.display = 'block';
        }
    }

    function sairFoco() {
        if (!foco) return;
        scene.traverse((o) => {
            if (o.isMesh || o.isLine || o.isSprite) o.layers.set(0);
        });
        camera.position.copy(foco.salvo.pos);
        controls.target.copy(foco.salvo.alvo);
        controls.minDistance = 0.8;
        controls.maxPolarAngle = Math.PI * 0.49;
        foco = null;
        if (btnSairFoco) btnSairFoco.style.display = 'none';
        if (hudPeca) hudPeca.style.display = 'none';
    }
    if (btnSairFoco) btnSairFoco.addEventListener('click', sairFoco);
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') sairFoco(); });

    // Só conta como clique se o dedo/mouse não arrastou (senão girar a
    // câmera já entrava em foco sem querer).
    let inicioToque = null;
    renderer.domElement.addEventListener('pointerdown', (e) => { inicioToque = [e.clientX, e.clientY]; });
    renderer.domElement.addEventListener('click', (e) => {
        if (inicioToque && Math.hypot(e.clientX - inicioToque[0], e.clientY - inicioToque[1]) > 6) return;
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects([frente, tras, grupoCobre], true)
            .find((h) => !h.object.isSprite && !h.object.isLine && !h.object.isInstancedMesh && h.object.visible);
        for (let o = hit && hit.object; o; o = o.parent) {
            if (o.userData.label) {
                entrarFoco(o, o.userData.label);
                return;
            }
        }
    });

    // ---- botões ----
    let autoRotacionar = true;
    const btnRotate = document.getElementById('molde3d-btn-rotate');
    if (btnRotate) {
        btnRotate.addEventListener('click', () => {
            autoRotacionar = !autoRotacionar;
            btnRotate.innerHTML = autoRotacionar
                ? '<i class="fas fa-sync"></i> Câmera girando'
                : '<i class="fas fa-sync" style="opacity:.5;"></i> Câmera parada';
        });
    }

    const ABERTURA = 1.1;
    let interiorAberto = false;
    let transicaoT = 1;
    const DURACAO = 1.1;
    const btnInterior = document.getElementById('molde3d-btn-interior');
    function alternarInterior(abrir) {
        if (abrir === interiorAberto) return;
        interiorAberto = abrir;
        transicaoT = 0;
        if (btnInterior) {
            btnInterior.innerHTML = interiorAberto
                ? '<i class="fas fa-layer-group"></i> Fechar molde'
                : '<i class="fas fa-layer-group"></i> Ver interior';
        }
    }
    if (btnInterior) btnInterior.addEventListener('click', () => alternarInterior(!interiorAberto));

    // Segurar o botão fecha/abre as placas estreitas (muda a largura do
    // veio): as duas andam juntas, o fuso gira e o telescópico acompanha.
    const AJUSTE_MAX = 0.3;
    const VEL_AJUSTE = 0.12;
    let ajusteEstreitas = 0;
    let direcaoEstreitas = 0;
    const hudLargura = document.getElementById('molde3d-largura');
    function atualizarHudLargura() {
        if (!hudLargura) return;
        const pct = Math.round(((xPlacaEstreita - ajusteEstreitas) / xPlacaEstreita) * 100);
        hudLargura.textContent = `Largura entre as estreitas: ${pct}% da máxima`;
    }
    [['molde3d-btn-fechar-estreitas', 1], ['molde3d-btn-abrir-estreitas', -1]].forEach(([id, dir]) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        const parar = () => { if (direcaoEstreitas === dir) direcaoEstreitas = 0; };
        btn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            if (btn.setPointerCapture) btn.setPointerCapture(e.pointerId);
            direcaoEstreitas = dir;
        });
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => btn.addEventListener(ev, parar));
        btn.addEventListener('contextmenu', (e) => e.preventDefault());
    });
    atualizarHudLargura();

    const btnAgua = document.getElementById('molde3d-btn-agua');
    const hudAgua = document.getElementById('molde3d-agua');
    if (btnAgua) {
        btnAgua.addEventListener('click', () => {
            testeAgua.ativo = !testeAgua.ativo;
            testeAgua.t = 0;
            if (testeAgua.ativo) alternarInterior(true);
            btnAgua.innerHTML = testeAgua.ativo
                ? '<i class="fas fa-tint-slash"></i> Parar teste de água'
                : '<i class="fas fa-tint"></i> Teste de água';
            if (hudAgua) hudAgua.style.display = testeAgua.ativo ? 'block' : 'none';
        });
    }
    let etapaHud = -1;
    function atualizarHudAgua() {
        if (!hudAgua || !testeAgua.ativo) return;
        const etapa = testeAgua.t < 1.6 ? 0 : testeAgua.t < 5 ? 1 : 2;
        if (etapa === etapaHud) return;
        etapaHud = etapa;
        hudAgua.textContent = [
            '1/3 · Enchendo os tubulões do lado móvel…',
            '2/3 · Circulando: carcaça → placas largas · telescópicos → placas estreitas',
            '3/3 · Circuito cheio — água chegando em todas as placas ✓ (simulação)',
        ][etapa];
    }

    let arrastando = false;
    renderer.domElement.addEventListener('pointerdown', () => { arrastando = true; });
    window.addEventListener('pointerup', () => { arrastando = false; });

    function aoRedimensionar() {
        if (!container.clientWidth || !container.clientHeight) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
    window.addEventListener('resize', aoRedimensionar);
    new ResizeObserver(aoRedimensionar).observe(container);

    if (loading) {
        loading.style.transition = 'opacity .4s';
        loading.style.opacity = '0';
        setTimeout(() => { loading.style.display = 'none'; }, 400);
    }

    const clock = new THREE.Clock();
    const eixoY = new THREE.Vector3(0, 1, 0);
    let tempo = 0;
    let kAtual = 0;
    function animar() {
        requestAnimationFrame(animar);
        const dt = Math.min(clock.getDelta(), 0.05);
        tempo += dt;

        if (autoRotacionar && !arrastando) {
            const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
            offset.applyAxisAngle(eixoY, 0.16 * dt);
            camera.position.copy(controls.target).add(offset);
        }

        if (transicaoT < 1) {
            transicaoT = Math.min(1, transicaoT + dt / DURACAO);
            const e = transicaoT < 0.5 ? 4 * transicaoT ** 3 : 1 - (-2 * transicaoT + 2) ** 3 / 2;
            kAtual = interiorAberto ? e : 1 - e;
            frente.position.z = ABERTURA * kAtual;
            tras.position.z = -ABERTURA * kAtual;
            grupoCobre.position.y = 0.6 * kAtual;
            definirOpacidade(acoAsaMovelMat, 1 - 0.72 * kAtual);
        }

        if (direcaoEstreitas !== 0) {
            const antes = ajusteEstreitas;
            ajusteEstreitas = Math.min(AJUSTE_MAX, Math.max(0, ajusteEstreitas + direcaoEstreitas * VEL_AJUSTE * dt));
            const girou = (ajusteEstreitas - antes) * 60;
            pecasGiratorias.forEach((m) => { m.rotation.x += girou; });
            atualizarHudLargura();
        }
        placas.forEach((p) => {
            const { eixoAfastamento, sinalAfastamento, baseAfastamento, aberturaAfastamento } = p.userData;
            let valor = baseAfastamento + aberturaAfastamento * kAtual * sinalAfastamento;
            if (eixoAfastamento === 'x') valor -= sinalAfastamento * ajusteEstreitas;
            if (eixoAfastamento === 'z') p.position.z = valor; else p.position.x = valor;
        });
        atualizarTelescopicos();

        if (testeAgua.ativo) testeAgua.t += dt;
        const encher = testeAgua.ativo ? Math.min(1, testeAgua.t / 2.5) : 0;
        aguasTubulao.forEach((a) => {
            a.visible = encher > 0.01;
            a.scale.y = Math.max(0.001, encher * (TUB_L - 0.01));
        });
        definirOpacidade(tubulaoMat, testeAgua.ativo ? 0.35 : 1);
        definirOpacidade(teleLuvaMat, testeAgua.ativo ? 0.4 : 1);
        definirOpacidade(teleInternoMat, testeAgua.ativo ? 0.4 : 1);
        const brilho = testeAgua.ativo && testeAgua.t > 1.6 ? 0.22 + 0.12 * Math.sin(tempo * 4) : 0;
        cobreTrasMat.emissiveIntensity = brilho;
        cobreEstreitaTrasMat.emissiveIntensity = brilho;
        atualizarFluxos(tempo);
        if (foco) {
            fluxos.forEach((f) => { f.mesh.visible = false; });
            aguasTubulao.forEach((ag) => { if (!foco.objs.has(ag)) ag.visible = false; });
        }
        atualizarHudAgua();

        controls.update();
        renderer.render(scene, camera);
    }
    animar();
}

window.renderMolde3D = renderMolde3D;
