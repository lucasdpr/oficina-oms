// 🆕 Molde MCC2/3 3D — visualização temporária, só pra apresentação do
// supervisor. Exterior modelado a partir das fotos reais da MCC2/3 (face
// com o "15" vermelho, traseira com tampas redondas vermelhas, cotovelos
// grandes com flange nos cantos, base de vigas azuis, conduítes). Mesmos
// recursos do Molde MCC4 3D:
//   - "Ver interior": abre o molde ao meio e mostra as 4 placas de cobre,
//     a caixa d'água em T de cada placa larga (flanges amarelos + grade de
//     parafusos), o mecanismo das placas estreitas (caixas Benzer, fuso com
//     sanfona e porca de bronze, 2 telescópicos, cardans) e abre as portas
//     da caixa de válvulas Rexroth e da caixa de junção elétrica;
//   - clicar em qualquer peça isola ela (modo foco);
//   - segurar "Fechar/Abrir estreitas" move as placas estreitas;
//   - "Teste de água" enche os coletores e mostra a água circulando.
//
// Dimensões são ESTIMADAS a partir das proporções das fotos — não são as
// medidas reais/confidenciais da MCC2/3 da CSN.
//
// Página pública (MoldeMCC23d.html), sem gate de admin — pedido do
// usuário, mesmo padrão do Sinótico 3D. Pra ser removida depois da
// apresentação.

let cena3dIniciada = false;

export function renderMolde23_3D() {
    if (cena3dIniciada) return;
    cena3dIniciada = true;
    iniciarCenaMCC23().catch((erro) => {
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

// Frente da placa: lisa, ~2/3 de cima cobre e 1/3 de baixo cinza/aço,
// com a borda de cima pintada de vermelho (foto real).
function criarTexturaPlacaFrente(THREE, larg = 512, alt = 256) {
    const [c, ctx] = novoCanvas(larg, alt);
    const corte = Math.round(alt * 0.62);
    const gc = ctx.createLinearGradient(0, 0, larg, 0);
    gc.addColorStop(0, '#c07f5b');
    gc.addColorStop(0.5, '#cf9068');
    gc.addColorStop(1, '#b97855');
    ctx.fillStyle = gc;
    ctx.fillRect(0, 0, larg, corte);
    const gs = ctx.createLinearGradient(0, corte, 0, alt);
    gs.addColorStop(0, '#5f6468');
    gs.addColorStop(1, '#4b4f53');
    ctx.fillStyle = gs;
    ctx.fillRect(0, corte, larg, alt - corte);
    ctx.fillStyle = 'rgba(220,70,40,0.9)';
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

// Traseira da placa (MCC2/3): grade de cabeças de parafuso cinza (foto).
function criarTexturaPlacaTras23(THREE, larg, alt, colunas, linhas) {
    const [c, ctx] = novoCanvas(larg, alt);
    ctx.fillStyle = '#b9bcbf';
    ctx.fillRect(0, 0, larg, alt);
    const px = larg / colunas;
    const py = alt / linhas;
    for (let col = 0; col < colunas; col++) {
        for (let lin = 0; lin < linhas; lin++) {
            const x = px / 2 + col * px;
            const y = py / 2 + lin * py;
            const r = Math.min(px, py) * 0.26;
            ctx.fillStyle = '#8d9195'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#5e6266'; ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, Math.PI * 2); ctx.fill();
        }
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

async function iniciarCenaMCC23() {
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
    camera.position.set(1.9, 1.35, 4.3);

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

    // ---- materiais (MCC2/3: aço pintado de cinza claro, detalhes vermelhos, base azul) ----
    function texturaPintura() {
        const [c, ctx] = novoCanvas(512, 512);
        ctx.fillStyle = '#6f7377';
        ctx.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 900; i++) {
            ctx.fillStyle = i % 3 ? 'rgba(90,95,100,0.08)' : 'rgba(255,255,255,0.10)';
            const r = 1 + Math.random() * 10;
            ctx.beginPath();
            ctx.arc(Math.random() * 512, Math.random() * 512, r, 0, Math.PI * 2);
            ctx.fill();
        }
        const t = texturaDeCanvas(THREE, c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        return t;
    }
    const texPint = texturaPintura();
    const acoMat = new THREE.MeshStandardMaterial({ map: texPint, roughness: 0.6, metalness: 0.3 });
    const acoEscuroMat = new THREE.MeshStandardMaterial({ map: texPint, color: 0xa9adb1, roughness: 0.65, metalness: 0.3 });
    const ferrugemMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3e, roughness: 0.85, metalness: 0.35 });
    const vermelhoMat = new THREE.MeshStandardMaterial({ color: 0xc8253a, roughness: 0.45, metalness: 0.2 });
    const laranjaMat = new THREE.MeshStandardMaterial({ color: 0xc0532f, roughness: 0.5, metalness: 0.3 });
    const azulMat = new THREE.MeshStandardMaterial({ color: 0x2c5aa8, roughness: 0.55, metalness: 0.35 });
    const buracoMat = new THREE.MeshStandardMaterial({ color: 0x1a1b1d, roughness: 1, metalness: 0 });
    const parafusoMat = new THREE.MeshStandardMaterial({ color: 0x2b2d30, roughness: 0.5, metalness: 0.7 });
    const canoMat = new THREE.MeshStandardMaterial({ color: 0x7e8287, roughness: 0.45, metalness: 0.45 });
    const canoInoxMat = new THREE.MeshStandardMaterial({ color: 0x9a9da3, roughness: 0.3, metalness: 0.9 });
    const conduiteMat = new THREE.MeshStandardMaterial({ color: 0x74787d, roughness: 0.55, metalness: 0.4 });
    const amareloMat = new THREE.MeshStandardMaterial({ color: 0xe0b52a, roughness: 0.5, metalness: 0.3 });
    const bronzeMat = new THREE.MeshStandardMaterial({ color: 0xc19a3a, roughness: 0.3, metalness: 0.85 });
    const sanfonaMat = new THREE.MeshStandardMaterial({ color: 0x3c3831, roughness: 0.95, metalness: 0.05 });
    const pinturaCinzaMat = new THREE.MeshStandardMaterial({ color: 0x8f959b, roughness: 0.7, metalness: 0.3 });
    const cardanMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.55, metalness: 0.3 });
    const etiquetaMat = new THREE.MeshStandardMaterial({ color: 0xd9822b, roughness: 0.6 });
    const valvulaAzulMat = new THREE.MeshStandardMaterial({ color: 0x1f4f8f, roughness: 0.5, metalness: 0.3 });
    const bobinaMat = new THREE.MeshStandardMaterial({ color: 0xcfcac0, roughness: 0.6, metalness: 0.1 });
    const pretoMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.6 });
    const sensorLaranjaMat = new THREE.MeshStandardMaterial({ color: 0xe8781c, roughness: 0.5 });
    const caboCinzaMat = new THREE.MeshStandardMaterial({ color: 0x9da1a5, roughness: 0.7 });
    const conectorOlivaMat = new THREE.MeshStandardMaterial({ color: 0x6b6a45, roughness: 0.55, metalness: 0.5 });
    const painelBrancoMat = new THREE.MeshStandardMaterial({ color: 0xdfe2e4, roughness: 0.5 });
    const filmeAzulMat = new THREE.MeshStandardMaterial({ color: 0x2c7fd6, roughness: 0.5 });
    const terraMat = new THREE.MeshStandardMaterial({ color: 0x9bb82a, roughness: 0.6 });
    // Coletores embaixo do corpo: ficam semitransparentes no teste de água
    // pra aparecer a água enchendo dentro deles.
    const coletorMat = new THREE.MeshStandardMaterial({ color: 0x2b2d30, roughness: 0.5, metalness: 0.7 });
    const teleLuvaMat = new THREE.MeshStandardMaterial({ color: 0x5c6066, roughness: 0.45, metalness: 0.7 });
    const teleInternoMat = canoInoxMat.clone();
    const aguaMat = new THREE.MeshStandardMaterial({ color: 0x4fb3ff, emissive: 0x1a6fd0, emissiveIntensity: 0.7, roughness: 0.2, metalness: 0, transparent: true, opacity: 0.9 });
    const aguaColetorMat = new THREE.MeshStandardMaterial({ color: 0x3d9cf0, emissive: 0x1557a8, emissiveIntensity: 0.5, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.75 });

    const cobreFrenteMat = new THREE.MeshPhysicalMaterial({ map: criarTexturaPlacaFrente(THREE), roughness: 0.38, metalness: 0.85, clearcoat: 0.2, clearcoatRoughness: 0.4 });
    const cobreTrasMat = new THREE.MeshStandardMaterial({ map: criarTexturaPlacaTras23(THREE, 1024, 272, 16, 4), roughness: 0.7, metalness: 0.4, emissive: 0x1d6fe0, emissiveIntensity: 0 });
    const cobreEstreitaFrenteMat = new THREE.MeshPhysicalMaterial({ map: criarTexturaPlacaFrente(THREE, 128, 384), roughness: 0.38, metalness: 0.85, clearcoat: 0.2, clearcoatRoughness: 0.4 });
    const cobreEstreitaTrasMat = new THREE.MeshStandardMaterial({ map: criarTexturaPlacaTras23(THREE, 256, 768, 2, 6), roughness: 0.7, metalness: 0.4, emissive: 0x1d6fe0, emissiveIntensity: 0 });
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
    function tubo(pai, pontos, r, mat, label) {
        const curva = new THREE.CatmullRomCurve3(pontos.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.2);
        const m = new THREE.Mesh(new THREE.TubeGeometry(curva, 64, r, 12, false), mat);
        m.castShadow = true;
        if (label) m.userData.label = label;
        pai.add(m);
        return curva;
    }
    function texto(pai, tex, w, h, x, y, z, rotY = 0) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6, metalness: 0.3 }));
        m.position.set(x, y, z);
        m.rotation.y = rotY;
        pai.add(m);
    }
    function grupo(pai, label) {
        const g = new THREE.Group();
        g.userData.label = label;
        pai.add(g);
        return g;
    }

    // ---- dimensões (proporções das fotos da MCC2/3) ----
    const D = 0.9;
    const CORPO_W = 1.9;
    const CORPO_Y0 = 0.39;   // em cima da plataforma cinza da base
    const CORPO_H = 0.48;
    const CORPO_TOPO = CORPO_Y0 + CORPO_H;
    const CORPO_CY = CORPO_Y0 + CORPO_H / 2;

    // ---- base: vigas AZUIS + plataforma cinza (fica parada ao abrir) ----
    const base = grupo(scene, 'Base / suporte azul');
    [-1.2, 1.2].forEach((x) => {
        [-1, 1].forEach((sz) => box(base, 0.14, 0.34, 0.1, x, 0.17, sz * 0.36, azulMat));
        box(base, 0.2, 0.02, D * 0.95, x, 0.01, 0, azulMat);
    });
    [-1, 1].forEach((sz) => {
        box(base, 2.3, 0.07, 0.05, 0, 0.23, sz * 0.43, azulMat);
        box(base, 2.3, 0.05, 0.04, 0, 0.1, sz * 0.43, azulMat);
    });
    box(base, 2.9, 0.035, D + 0.12, 0, 0.372, 0, acoEscuroMat).userData.label = 'Plataforma do molde';

    // Coletores de água escuros embaixo do corpo (fotos do "15" e da ponta).
    const COL_L = 0.8;
    const aguasColetor = [];
    [-0.45, 0.45].forEach((x) => {
        const g = grupo(base, 'Coletor de água (embaixo do corpo)');
        cilindro(g, 0.06, COL_L, x, 0.3, 0, coletorMat, 'x', 24);
        [x - COL_L / 2, x + COL_L / 2].forEach((xf) => cilindro(g, 0.066, 0.012, xf, 0.3, 0, parafusoMat, 'x', 24));
        const geo = new THREE.CylinderGeometry(0.054, 0.054, 1, 24);
        geo.translate(0, 0.5, 0);
        const agua = new THREE.Mesh(geo, aguaColetorMat);
        agua.rotation.z = -Math.PI / 2; // deitado, enche de x menor pra x maior
        agua.position.set(x - COL_L / 2 + 0.01, 0.3, 0);
        agua.visible = false;
        g.add(agua);
        aguasColetor.push(agua);
    });

    function construirMetade(sinal) {
        const g = new THREE.Group();
        const d = D / 2 - 0.004;
        const zc = sinal * (D / 4);
        const face = sinal * (D / 2);
        const fz = (off) => face + sinal * off;

        // corpo central
        box(g, CORPO_W, CORPO_H, d, 0, CORPO_CY, zc, acoMat).userData.label = 'Corpo central da carcaça';
        // tampo do topo, levemente mais largo
        box(g, CORPO_W + 0.06, 0.03, d, 0, CORPO_TOPO + 0.015, zc, acoEscuroMat).userData.label = 'Tampo da carcaça';
        // abertura do canal no topo
        box(g, 1.3, 0.006, 0.09, 0, CORPO_TOPO + 0.033, sinal * 0.045, buracoMat, false);

        // asas das pontas (blocos cinza com canto chanfrado, faixa vermelha e fenda)
        [-1, 1].forEach((lado) => {
            const x = lado * (CORPO_W / 2 + 0.17);
            box(g, 0.34, 0.3, d * 0.9, x, CORPO_Y0 + 0.15, sinal * (d * 0.9) / 2, acoMat).userData.label = 'Bloco da ponta';
            const chanfro = box(g, 0.2, 0.2, d * 0.9, x + lado * 0.05, CORPO_Y0 + 0.3, sinal * (d * 0.9) / 2, acoMat);
            chanfro.rotation.z = lado * -0.7;
            chanfro.userData.label = 'Bloco da ponta (chanfro)';
            box(g, 0.022, 0.13, 0.005, x + lado * 0.06, CORPO_Y0 + 0.2, sinal * (d * 0.9) + sinal * 0.003, vermelhoMat, false);
            box(g, 0.14, 0.04, 0.01, x + lado * 0.04, CORPO_Y0 + 0.03, sinal * (d * 0.9) + sinal * 0.004, buracoMat, false);
            // parafuso de ajuste em pé, perto da asa
            const aj = grupo(g, 'Parafuso de ajuste');
            cilindro(aj, 0.014, 0.1, lado * (CORPO_W / 2 - 0.12), CORPO_Y0 + 0.07, fz(0.04), parafusoMat, 'y', 8);
            box(aj, 0.06, 0.02, 0.06, lado * (CORPO_W / 2 - 0.12), CORPO_Y0 + 0.02, fz(0.04), acoEscuroMat);
        });

        // cotovelos grandes nos cantos de cima, com flange (entrada de água)
        const cotovelos = [];
        [-1, 1].forEach((lado) => {
            const x0 = lado * (CORPO_W / 2 - 0.05);
            const pts = [[x0, CORPO_TOPO - 0.05, sinal * 0.3], [x0 + lado * 0.1, CORPO_TOPO + 0.08, sinal * 0.3], [x0 + lado * 0.28, CORPO_TOPO + 0.06, sinal * 0.3], [x0 + lado * 0.36, CORPO_TOPO - 0.08, sinal * 0.3], [x0 + lado * 0.36, CORPO_Y0 + 0.2, sinal * 0.3]];
            cotovelos.push(tubo(g, pts, 0.055, canoMat, 'Cotovelo de água (entrada/saída)'));
            const fl = cilindro(g, 0.085, 0.025, x0 + lado * 0.02, CORPO_TOPO + 0.02, sinal * 0.3, canoMat, 'x', 20);
            fl.rotation.z = Math.PI / 2 + lado * 0.6;
            fl.userData.label = 'Flange do cotovelo';
        });
        g.userData.cotovelos = cotovelos;
        return g;
    }

    const frente = construirMetade(1);
    frente.userData.label = 'Carcaça — frente';
    const tras = construirMetade(-1);
    tras.userData.label = 'Carcaça — trás';
    scene.add(frente, tras);

    const zF = D / 2;

    // ---- FRENTE (foto do "15") ----
    texto(frente, criarTexturaTexto(THREE, '15', '#c8253a'), 0.24, 0.13, -0.1, 0.71, zF + 0.003);
    // caixa de comando
    const cxCmd = grupo(frente, 'Caixa de comando');
    box(cxCmd, 0.3, 0.26, 0.05, 0.38, 0.69, zF + 0.025, acoEscuroMat);
    box(cxCmd, 0.03, 0.06, 0.02, 0.54, 0.69, zF + 0.04, laranjaMat);
    // ---- pacotes de mola (lado fixo, onde ficam as caixas elétricas) ----
    // Um em cada um dos 4 furos da face (2 de cada lado, em cima e
    // embaixo): bucha de bronze (flange de 6 furos, corpo, pescoço e
    // sextavado — foto da peça) com a mola atrás, entrando no molde.
    // Fechado, fica escondido dentro da carcaça; no "Ver interior" desliza
    // pra fora da face interna pra aparecer.
    class Helice extends THREE.Curve {
        constructor(raio, voltas, comp) { super(); this.raio = raio; this.voltas = voltas; this.comp = comp; }
        getPoint(t, alvo = new THREE.Vector3()) {
            const a = t * this.voltas * Math.PI * 2;
            return alvo.set(Math.cos(a) * this.raio, Math.sin(a) * this.raio, -t * this.comp);
        }
    }
    const molaMat = new THREE.MeshStandardMaterial({ color: 0x3d4146, roughness: 0.4, metalness: 0.8 });
    const molaGeo = new THREE.TubeGeometry(new Helice(0.03, 9, 0.18), 360, 0.0055, 8, false);
    const pacotesMola = [];
    [[-0.5, 0.78], [-0.5, 0.5], [0.72, 0.78], [0.72, 0.5]].forEach(([x, y]) => {
        cilindro(frente, 0.036, 0.008, x, y, zF + 0.001, buracoMat, 'z', 24).userData.label = 'Furo do pacote de mola';
        const pm = grupo(frente, 'Pacote de mola (bucha de bronze + mola)');
        pm.position.set(x, y, zF - 0.01);
        const bucha = grupo(pm, 'Bucha de bronze do pacote de mola');
        cilindro(bucha, 0.04, 0.014, 0, 0, 0, bronzeMat, 'z', 28);
        cilindro(bucha, 0.016, 0.016, 0, 0, 0.001, buracoMat, 'z', 18);
        for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2;
            cilindro(bucha, 0.004, 0.016, Math.cos(a) * 0.031, Math.sin(a) * 0.031, 0.001, buracoMat, 'z', 8);
        }
        cilindro(bucha, 0.029, 0.05, 0, 0, -0.032, bronzeMat, 'z', 24);
        cilindro(bucha, 0.02, 0.03, 0, 0, -0.072, bronzeMat, 'z', 20);
        cilindro(bucha, 0.026, 0.025, 0, 0, -0.1, bronzeMat, 'z', 6);
        const mola = new THREE.Mesh(molaGeo, molaMat);
        mola.position.z = -0.115;
        mola.castShadow = true;
        mola.userData.label = 'Mola do pacote';
        pm.add(mola);
        cilindro(pm, 0.036, 0.01, 0, 0, -0.3, acoEscuroMat, 'z', 24).userData.label = 'Prato de apoio da mola';
        pacotesMola.push(pm);
    });
    // curvas em U na parte de baixo da frente
    [-0.3, -0.05, 0.22, 0.48].forEach((x) => {
        tubo(frente, [[x, 0.55, zF], [x, 0.47, zF + 0.06], [x + 0.05, 0.43, zF + 0.07], [x + 0.1, 0.47, zF + 0.06], [x + 0.1, 0.55, zF]], 0.03, canoMat, 'Curva em U de água');
    });
    // válvulas/parafusos em pé na borda de baixo
    [-0.72, 0.05, 0.12, 0.8].forEach((x) => {
        const v = grupo(frente, 'Válvula / parafuso de fixação');
        cilindro(v, 0.012, 0.12, x, 0.47, zF + 0.05, parafusoMat, 'y', 8);
        box(v, 0.06, 0.03, 0.05, x, 0.41, zF + 0.05, acoEscuroMat);
    });
    // conduítes verticais dos lados (esquerda e direita)
    [-0.85, -0.75, -0.66, 0.86, 0.94, 1.02].forEach((x, i) => {
        tubo(frente, [[x, CORPO_TOPO + 0.02, zF + 0.02], [x + (i % 2 ? 0.03 : -0.02), 0.7, zF + 0.04], [x, 0.45, zF + 0.03], [x, 0.41, zF + 0.01]], 0.018, conduiteMat, 'Conduíte elétrico');
    });
    // conduítes trançados passando por cima
    tubo(frente, [[-0.9, CORPO_TOPO + 0.03, zF - 0.02], [-0.4, CORPO_TOPO + 0.07, zF - 0.05], [0.1, CORPO_TOPO + 0.03, zF - 0.02], [0.6, CORPO_TOPO + 0.08, zF - 0.06], [0.95, CORPO_TOPO + 0.03, zF - 0.02]], 0.02, conduiteMat, 'Conduíte trançado');
    tubo(frente, [[-0.8, CORPO_TOPO + 0.02, zF - 0.1], [-0.2, CORPO_TOPO + 0.05, zF - 0.12], [0.4, CORPO_TOPO + 0.02, zF - 0.1], [0.9, CORPO_TOPO + 0.05, zF - 0.12]], 0.016, conduiteMat, 'Conduíte trançado');
    // tampas vermelhas meio escondidas atrás dos conduítes
    [-0.72, 0.9].forEach((x) => { cilindro(frente, 0.04, 0.012, x, 0.66, zF + 0.006, vermelhoMat, 'z', 18).userData.label = 'Tampa vermelha'; });

    // ---- TRASEIRA (foto das tampas redondas vermelhas) ----
    const zT = -D / 2;
    [[-0.62, 0.74, 0.045], [-0.35, 0.66, 0.06], [-0.62, 0.5, 0.04], [-0.95, 0.62, 0.04], [0.42, 0.66, 0.06], [0.6, 0.76, 0.045], [0.6, 0.5, 0.04], [0.95, 0.62, 0.04]].forEach(([x, y, r]) => {
        const t = grupo(tras, 'Tampa vermelha (inspeção)');
        cilindro(t, r, 0.02, x, y, zT - 0.01, vermelhoMat, 'z', 20);
        for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2;
            cilindro(t, 0.006, 0.01, x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, zT - 0.022, parafusoMat, 'z', 6);
        }
    });
    box(tras, 0.3, 0.17, 0.04, 0.02, 0.74, zT - 0.02, acoEscuroMat).userData.label = 'Caixa da traseira';
    cilindro(tras, 0.018, 0.06, -0.22, 0.83, zT - 0.03, vermelhoMat, 'y', 10);
    // linhas hidráulicas finas (horizontais e verticais)
    [0.44, 0.47, 0.83].forEach((y) => tubo(tras, [[-0.88, y, zT - 0.012], [0, y + 0.01, zT - 0.015], [0.88, y, zT - 0.012]], 0.008, conduiteMat, 'Linha hidráulica'));
    [-0.8, -0.2, 0.25, 0.8].forEach((x) => tubo(tras, [[x, 0.44, zT - 0.012], [x, 0.65, zT - 0.015], [x + 0.05, 0.83, zT - 0.012]], 0.008, conduiteMat, 'Linha hidráulica'));
    // mangueira laranja no canto
    tubo(tras, [[-0.95, 0.5, zT - 0.02], [-0.85, 0.72, zT - 0.06], [-0.55, 0.8, zT - 0.05], [-0.3, 0.72, zT - 0.03]], 0.014, laranjaMat, 'Mangueira hidráulica');

    // ---- PONTA: moldura com a caixa de válvulas e a caixa de junção ----
    // (foto de lado: moldura central com 2 caixas + junta laranja no cano)
    const xP = -(CORPO_W / 2 + 0.34);
    const moldura = grupo(frente, 'Moldura das caixas elétricas');
    [0.11, -0.11].forEach((z) => box(moldura, 0.03, 0.4, 0.025, xP - 0.02, CORPO_Y0 + 0.2, z, acoEscuroMat));
    box(moldura, 0.03, 0.025, 0.25, xP - 0.02, CORPO_Y0 + 0.4, 0.0, acoEscuroMat);
    box(moldura, 0.03, 0.025, 0.25, xP - 0.02, CORPO_Y0 + 0.19, 0.0, acoEscuroMat);
    cilindro(frente, 0.06, 0.06, -(CORPO_W / 2 + 0.2), CORPO_TOPO + 0.05, 0.3, laranjaMat, 'x', 20).userData.label = 'Junta laranja do cano';

    // Caixa com porta: a porta gira na dobradiça quando o molde abre,
    // igual às fotos das caixas abertas.
    const portas = [];
    function caixaComPorta(label, cx, cy, h, matCaixa) {
        const W = 0.2;      // largura (z)
        const P = 0.1;      // profundidade (x)
        const g = grupo(frente, label);
        g.position.set(cx, cy, 0);
        box(g, 0.008, h, W, P / 2 - 0.004, 0, 0, matCaixa);
        box(g, P, 0.008, W, 0, h / 2 - 0.004, 0, matCaixa);
        box(g, P, 0.008, W, 0, -h / 2 + 0.004, 0, matCaixa);
        box(g, P, h, 0.008, 0, 0, W / 2 - 0.004, matCaixa);
        box(g, P, h, 0.008, 0, 0, -W / 2 + 0.004, matCaixa);
        const dobradica = new THREE.Group();
        dobradica.position.set(-P / 2, 0, W / 2);
        g.add(dobradica);
        const porta = box(dobradica, 0.008, h + 0.006, W + 0.006, -0.004, 0, -W / 2, matCaixa);
        porta.userData.label = `Porta — ${label.toLowerCase()}`;
        portas.push(dobradica);
        return g;
    }

    // Caixa de válvulas (foto do "13"): bloco manifold com 3 válvulas
    // direcionais Rexroth (azuis, com bobina) e 4 sensores indutivos de
    // ponta laranja.
    const cxValv = caixaComPorta('Caixa de válvulas (Rexroth)', xP - 0.07, CORPO_Y0 + 0.3, 0.16, acoEscuroMat);
    box(cxValv, 0.01, 0.13, 0.18, 0.04, 0, 0, pinturaCinzaMat).userData.label = 'Bloco manifold hidráulico';
    [-0.055, 0, 0.055].forEach((z) => {
        const v = grupo(cxValv, 'Válvula direcional Rexroth (solenoide)');
        box(v, 0.03, 0.05, 0.042, 0.02, 0.018, z, valvulaAzulMat);
        cilindro(v, 0.014, 0.034, -0.008, -0.022, z, bobinaMat, 'x', 16);
        cilindro(v, 0.012, 0.01, -0.03, -0.022, z, pretoMat, 'x', 16);
        box(v, 0.012, 0.012, 0.02, 0.0, 0.03, z, bobinaMat);
    });
    [[0.055, 0.085], [0.055, -0.085], [-0.055, 0.085], [-0.055, -0.085]].forEach(([y, z]) => {
        const s = grupo(cxValv, 'Sensor indutivo');
        cilindro(s, 0.007, 0.03, 0.022, y, z, canoInoxMat, 'x', 12);
        cilindro(s, 0.0072, 0.012, 0.0, y, z, sensorLaranjaMat, 'x', 12);
    });
    tubo(cxValv, [[0.0, 0.055, 0.085], [-0.03, 0.05, 0.04], [-0.02, 0.0, 0.0], [-0.03, -0.05, -0.04], [0.0, -0.055, -0.085]], 0.003, caboCinzaMat, 'Cabo de sensor');
    tubo(cxValv, [[0.0, -0.055, 0.085], [-0.035, -0.03, 0.03], [-0.03, 0.04, -0.03], [0.0, 0.055, -0.085]], 0.003, caboCinzaMat, 'Cabo de sensor');

    // Caixa de junção inox: placa interna com filme azul, conectores
    // militares (verde-oliva) e prensa-cabos na lateral, fio terra na porta.
    const cxJun = caixaComPorta('Caixa de junção elétrica', xP - 0.07, CORPO_Y0 + 0.09, 0.15, canoInoxMat);
    box(cxJun, 0.02, 0.12, 0.13, 0.03, 0, -0.02, painelBrancoMat).userData.label = 'Placa de bornes';
    [0.03, -0.03].forEach((y) => box(cxJun, 0.002, 0.004, 0.13, 0.019, y, -0.02, filmeAzulMat, false));
    [0.045, 0.012, -0.022, -0.052].forEach((y, i) => {
        const c = grupo(cxJun, i % 2 ? 'Prensa-cabo' : 'Conector militar');
        if (i % 2) cilindro(c, 0.01, 0.025, 0.0, y, 0.105, canoInoxMat, 'z', 6);
        else cilindro(c, 0.017, 0.03, 0.0, y, 0.106, conectorOlivaMat, 'z', 18);
    });
    cilindro(cxJun, 0.003, 0.08, -0.045, 0.0, 0.07, terraMat, 'y', 8).userData.label = 'Fio terra';

    // ---- placas de cobre (dentro do corpo) ----
    const PLACA_LARGA_W = 1.6;
    const PLACA_ESTREITA_W = 0.14; // = espessura do veio
    const PLACA_H = 0.42;
    const COBRE_E = 0.045;
    const PLACA_CY = CORPO_Y0 + 0.03 + PLACA_H / 2;
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
        comAfastamento(placa(PLACA_LARGA_W, COBRE_E, 0, zPlacaLarga, 'z', 1, 'Placa larga — frente', cobreTrasMat, cobreFrenteMat), 'z', 1, ABERTURA_LARGA),
        comAfastamento(placa(PLACA_LARGA_W, COBRE_E, 0, -zPlacaLarga, 'z', -1, 'Placa larga — trás', cobreTrasMat, cobreFrenteMat), 'z', -1, ABERTURA_LARGA),
        comAfastamento(placa(COBRE_E, PLACA_ESTREITA_W, xPlacaEstreita, 0, 'x', 1, 'Placa estreita', cobreEstreitaTrasMat, cobreEstreitaFrenteMat), 'x', 1, ABERTURA_ESTREITA),
        comAfastamento(placa(COBRE_E, PLACA_ESTREITA_W, -xPlacaEstreita, 0, 'x', -1, 'Placa estreita', cobreEstreitaTrasMat, cobreEstreitaFrenteMat), 'x', -1, ABERTURA_ESTREITA),
    ];

    // ---- caixa d'água em T atrás de cada placa larga ----
    // Fotos da placa no cavalete azul: corpo cinza atrás do cobre, barra de
    // cima mais larga (formato T) com flange amarelo em cada ponta, e a
    // traseira coberta por uma grade de parafusos com arruela.
    const CX_LARGA_E = 0.06;
    // Proporções da foto (placa no cavalete azul): a barra de cima do T
    // atravessa tudo e tem ~45% da altura; a parte de baixo (a "perna" do
    // T) tem a largura do cobre.
    const T_ALT = PLACA_H + 0.04;
    const T_BARRA_ALT = T_ALT * 0.45;
    const T_BARRA_W = 2.2;
    const T_PERNA_W = PLACA_LARGA_W + 0.04;
    const T_TOPO = T_ALT / 2;
    const T_BARRA_CY = T_TOPO - T_BARRA_ALT / 2;
    function texturaOMS52() {
        const [c, ctx] = novoCanvas(512, 128);
        ctx.clearRect(0, 0, 512, 128);
        ctx.font = 'bold 84px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'rgba(70,72,75,0.9)';
        ctx.lineWidth = 4;
        ctx.strokeText('OMS 52', 256, 66);
        return texturaDeCanvas(THREE, c);
    }
    const texOMS52 = texturaOMS52();
    function parafusoArruela(pai, x, y, zFace, sp, r = 0.02) {
        cilindro(pai, r, 0.006, x, y, zFace + sp * 0.003, canoInoxMat, 'z', 16);
        cilindro(pai, r * 0.55, 0.016, x, y, zFace + sp * 0.012, parafusoMat, 'z', 6);
        cilindro(pai, r * 0.3, 0.03, x, y, zFace + sp * 0.02, canoInoxMat, 'z', 8);
    }
    function adicionarCaixaAguaLarga(p, sp) {
        const g = grupo(p, "Caixa d'água da placa larga (T)");
        const z0 = sp * (COBRE_E / 2 + CX_LARGA_E / 2);
        const zFace = z0 + sp * (CX_LARGA_E / 2);
        // barra de cima do T (atravessa tudo) + perna (largura do cobre)
        box(g, T_BARRA_W, T_BARRA_ALT, CX_LARGA_E, 0, T_BARRA_CY, z0, acoMat);
        box(g, T_PERNA_W, T_ALT - T_BARRA_ALT, CX_LARGA_E, 0, (T_BARRA_CY - T_BARRA_ALT / 2 - T_ALT / 2) / 2, z0, acoMat);

        // flanges amarelos nas duas pontas da barra
        [-1, 1].forEach((l) => {
            const fl = grupo(g, 'Flange amarelo (entrada de água da placa)');
            const xf = l * (T_BARRA_W / 2 + 0.015);
            cilindro(fl, 0.075, 0.03, xf, T_BARRA_CY, z0, amareloMat, 'x', 28);
            cilindro(fl, 0.03, 0.032, xf, T_BARRA_CY, z0, buracoMat, 'x', 20);
            for (let k = 0; k < 8; k++) {
                const a = (k / 8) * Math.PI * 2;
                cilindro(fl, 0.006, 0.04, xf, T_BARRA_CY + Math.cos(a) * 0.055, z0 + Math.sin(a) * 0.055, parafusoMat, 'x', 6);
            }
        });

        // grade de parafusos com arruela cobrindo o T inteiro
        const pf = grupo(g, "Grade de parafusos da caixa d'água");
        for (let c = 0; c < 13; c++) {
            const x = -0.96 + c * 0.16;
            [T_BARRA_CY + 0.045, T_BARRA_CY - 0.045].forEach((y) => {
                if (Math.abs(x) > T_PERNA_W / 2 - 0.02 || y > T_BARRA_CY) parafusoArruela(pf, x, y, zFace, sp);
            });
        }
        const yBaixo = -T_ALT / 2;
        for (let c = 0; c < 10; c++) {
            for (let r = 0; r < 3; r++) {
                parafusoArruela(pf, -0.72 + c * 0.16, T_BARRA_CY - 0.045 - r * 0.075 - 0.001, zFace, sp);
            }
        }
        for (let r = 0; r < 2; r++) {
            for (let c = 0; c < 10; c++) parafusoArruela(pf, -0.72 + c * 0.16, yBaixo + 0.035 + r * 0.06, zFace, sp, 0.017);
        }
        // coluna de parafusos na borda esquerda da perna
        for (let r = 0; r < 5; r++) parafusoArruela(pf, -T_PERNA_W / 2 + 0.03, yBaixo + 0.04 + r * 0.05, zFace, sp, 0.015);

        // 2 flanges redondos de 8 parafusos na parte de baixo
        [-0.5, 0.35].forEach((x) => {
            const fr = grupo(g, 'Flange redondo (tampa de inspeção)');
            const y = yBaixo + 0.09;
            cilindro(fr, 0.055, 0.01, x, y, zFace + sp * 0.005, acoEscuroMat, 'z', 28);
            for (let k = 0; k < 8; k++) {
                const a = (k / 8) * Math.PI * 2;
                cilindro(fr, 0.007, 0.016, x + Math.cos(a) * 0.042, y + Math.sin(a) * 0.042, zFace + sp * 0.014, parafusoMat, 'z', 6);
            }
        });

        // barra quadrada atravessada (canaleta de cabos)
        box(g, 0.9, 0.035, 0.03, -0.1, T_BARRA_CY - T_BARRA_ALT / 2 - 0.02, zFace + sp * 0.04, canoInoxMat).userData.label = 'Canaleta de cabos';

        // "OMS 52" gravado na ponta da barra
        const txt = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.085), new THREE.MeshStandardMaterial({ map: texOMS52, transparent: true, roughness: 0.7 }));
        txt.position.set(sp * 0.9, T_BARRA_CY + 0.02, zFace + sp * 0.002);
        txt.rotation.y = sp > 0 ? 0 : Math.PI;
        g.add(txt);
    }
    adicionarCaixaAguaLarga(placas[0], 1);
    adicionarCaixaAguaLarga(placas[1], -1);

    // ---- foot rolls e guias (fotos reais) ----
    const mancalMat = new THREE.MeshStandardMaterial({ color: 0x8e8b85, roughness: 0.85, metalness: 0.4 });
    const faixaVermelhaMat = new THREE.MeshStandardMaterial({ color: 0xc2343a, roughness: 0.6 });
    const rolinhoMat = new THREE.MeshStandardMaterial({ color: 0xa3a6ab, roughness: 0.35, metalness: 0.85 });
    const tampaRoloMat = new THREE.MeshStandardMaterial({ color: 0x2a2826, roughness: 0.6, metalness: 0.5 });

    // Foot roll: eixo inox comprido embaixo da placa larga, apoiado em 4
    // mancais de ferro fundido com faixa vermelha.
    function adicionarFootRoll(placaLarga, sinal) {
        const g = grupo(placaLarga, 'Foot roll');
        g.position.set(0, -PLACA_H / 2 - 0.035, -sinal * 0.025);
        cilindro(g, 0.028, PLACA_LARGA_W - 0.06, 0, 0, 0, canoInoxMat, 'x', 24);
        [-0.6, -0.2, 0.2, 0.6].forEach((x) => {
            box(g, 0.05, 0.062, 0.075, x, 0, 0, mancalMat);
            cilindro(g, 0.0295, 0.028, x + 0.042, 0, 0, faixaVermelhaMat, 'x', 24);
        });
    }

    // Guia: bloco de ferro embaixo da placa estreita, com os rolinhos
    // empilhados virados pro lado de dentro do molde.
    function adicionarGuia(placaEstreita, sinal) {
        const g = grupo(placaEstreita, 'Guia (rolinhos) da placa estreita');
        g.position.set(0, -PLACA_H / 2 - 0.12, 0);
        box(g, 0.05, 0.22, 0.13, sinal * 0.01, 0, 0, ferrugemMat);
        box(g, 0.07, 0.03, 0.15, sinal * 0.005, -0.12, 0, ferrugemMat);
        [0.06, 0.0, -0.06].forEach((y) => {
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

    // ---- mecanismo de cada placa estreita ----
    // Caixa d'água, porca de bronze e fuso são presos na placa (andam com
    // ela). O suporte com as 2 caixas Benzer fica parado — quando a placa
    // se move, o fuso atravessa a caixa Benzer e a sanfona e os 2
    // telescópicos esticam/encolhem, igual na máquina.
    const FUSO_Y = 0.12;
    const TELE_Y = [0.045, -0.045];
    const CX_AGUA_E = 0.05;
    const faceCaixaAgua = COBRE_E / 2 + CX_AGUA_E;
    const COMP_PORCA = 0.055;
    const Y_BASE_CARDAN = 0.12 - PLACA_CY;
    const mecanismos = [];
    const pecasGiratorias = [];

    // Sanfona: perfil em zigue-zague girado (1 unidade de comprimento no
    // eixo), esticada por scale a cada quadro.
    const perfilSanfona = [];
    for (let i = 0; i <= 24; i++) perfilSanfona.push(new THREE.Vector2(i % 2 ? 0.03 : 0.022, i / 24));
    const sanfonaGeo = new THREE.LatheGeometry(perfilSanfona, 18);

    function montarMecanismoEstreita(placaEstreita, s) {
        const fusos = [];
        box(placaEstreita, CX_AGUA_E, PLACA_H * 0.86, 0.1, s * (COBRE_E / 2 + CX_AGUA_E / 2), 0, 0, acoEscuroMat)
            .userData.label = "Caixa d'água da placa estreita";

        [FUSO_Y, -FUSO_Y].forEach((y) => {
            const x0 = s * faceCaixaAgua;
            const porca = grupo(placaEstreita, 'Porca de bronze do fuso');
            cilindro(porca, 0.042, 0.012, x0 + s * 0.006, y, 0, bronzeMat, 'x', 24);
            for (let k = 0; k < 6; k++) {
                const a = (k / 6) * Math.PI * 2;
                cilindro(porca, 0.004, 0.014, x0 + s * 0.006, y + Math.cos(a) * 0.033, Math.sin(a) * 0.033, parafusoMat, 'x', 6);
            }
            cilindro(porca, 0.03, 0.028, x0 + s * 0.026, y, 0, bronzeMat, 'x', 24);
            cilindro(porca, 0.027, 0.016, x0 + s * 0.047, y, 0, bronzeMat, 'x', 6);

            // Comprimento recalculado a cada quadro: sempre da porca até
            // passar da caixa Benzer, em qualquer posição da placa.
            const fuso = grupo(placaEstreita, 'Fuso (haste roscada) — move a placa estreita');
            const haste = cilindro(fuso, 0.013, 1, 0, y, 0, canoInoxMat, 'x', 16);
            const ponta = cilindro(fuso, 0.02, 0.012, 0, y, 0, parafusoMat, 'x', 6);
            pecasGiratorias.push(ponta);
            fusos.push({ haste, ponta, x0 });
        });

        const frameX = s * 1.12;
        const quadro = new THREE.Group();
        quadro.position.set(0, PLACA_CY, 0);
        grupoCobre.add(quadro);
        box(quadro, 0.025, 0.42, 0.16, frameX + s * 0.0125, 0, 0, acoEscuroMat).userData.label = 'Suporte das caixas Benzer';

        const sanfonas = [FUSO_Y, -FUSO_Y].map((y) => {
            const m = new THREE.Mesh(sanfonaGeo, sanfonaMat);
            m.rotation.z = s > 0 ? -Math.PI / 2 : Math.PI / 2; // eixo y da geometria → +x ou −x
            m.position.set(frameX, y, 0);
            m.castShadow = true;
            m.userData.label = 'Sanfona de proteção do fuso';
            quadro.add(m);
            return m;
        });

        [[FUSO_Y, 0.045], [-FUSO_Y, -0.045]].forEach(([y, zCardan]) => {
            const cb = grupo(quadro, 'Caixa Benzer — ajuste da placa estreita');
            const gx = frameX + s * (0.025 + 0.06);
            box(cb, 0.12, 0.1, 0.12, gx, y, 0, pinturaCinzaMat);
            cilindro(cb, 0.052, 0.022, gx, y, 0.071, pinturaCinzaMat, 'z', 28);
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2;
                cilindro(cb, 0.006, 0.006, gx + Math.cos(a) * 0.042, y + Math.sin(a) * 0.042, 0.084, parafusoMat, 'z', 6);
            }
            box(cb, 0.035, 0.022, 0.003, gx - s * 0.02, y + 0.025, 0.0615, etiquetaMat, false);

            const cardan = grupo(quadro, 'Cardan — aciona a caixa Benzer');
            const xc = frameX + s * 0.19;
            cilindro(cardan, 0.01, 0.05, frameX + s * 0.165, y, zCardan, canoInoxMat, 'x', 12);
            box(cardan, 0.035, 0.035, 0.035, xc, y, zCardan, parafusoMat);
            const junta = (yj) => {
                box(cardan, 0.03, 0.02, 0.012, xc, yj, zCardan, cardanMat, false);
                box(cardan, 0.012, 0.02, 0.03, xc, yj - 0.018, zCardan, cardanMat, false);
            };
            junta(y - 0.035);
            const topo = y - 0.06;
            const baseY = Y_BASE_CARDAN + 0.06;
            cilindro(cardan, 0.011, topo - baseY, xc, (topo + baseY) / 2, zCardan, canoInoxMat, 'y', 12);
            junta(Y_BASE_CARDAN + 0.05);
            box(cardan, 0.035, 0.035, 0.035, xc, Y_BASE_CARDAN, zCardan, parafusoMat);
        });

        const teles = TELE_Y.map((yt) => {
            const tele = grupo(quadro, 'Tubo telescópico — água da placa estreita');
            const luva = cilindro(tele, 0.022, 1, 0, yt, 0, teleLuvaMat, 'x', 20);
            const interno = cilindro(tele, 0.015, 1, 0, yt, 0, teleInternoMat, 'x', 20);
            return { luva, interno };
        });
        mecanismos.push({ s, placa: placaEstreita, frameX, teles, sanfonas, fusos, pontaPlaca: () => placaEstreita.position.x + s * faceCaixaAgua });
    }
    montarMecanismoEstreita(placas[2], 1);
    montarMecanismoEstreita(placas[3], -1);

    function atualizarMecanismos() {
        mecanismos.forEach((m) => {
            const pOut = m.pontaPlaca();
            const gap = Math.abs(m.frameX - pOut);
            const L = Math.max(0.01, gap * 0.62);
            m.teles.forEach(({ luva, interno }) => {
                luva.scale.y = L;
                luva.position.x = m.frameX - m.s * L / 2;
                interno.scale.y = L;
                interno.position.x = pOut + m.s * L / 2;
            });
            // sanfona vai da porca de bronze até o suporte
            const Lf = gap + 0.2;
            m.fusos.forEach(({ haste, ponta, x0 }) => {
                haste.scale.y = Lf;
                haste.position.x = x0 + m.s * Lf / 2;
                ponta.position.x = x0 + m.s * Lf;
            });
            const Ls = Math.max(0.01, gap - COMP_PORCA);
            m.sanfonas.forEach((sf) => {
                sf.scale.y = Ls;
                sf.position.x = pOut + m.s * COMP_PORCA;
            });
        });
    }

    // ---- teste de água: partículas correndo pelos caminhos ----
    const fluxos = [];
    const gotaGeo = new THREE.SphereGeometry(1, 8, 6);
    const dummy = new THREE.Object3D();
    function criarFluxo(pai, n, velocidade, tamanho, pontoEm, opcoes = {}) {
        const mesh = new THREE.InstancedMesh(gotaGeo, aguaMat, n);
        mesh.frustumCulled = false;
        mesh.visible = false;
        pai.add(mesh);
        fluxos.push({ mesh, n, velocidade, tamanho, pontoEm, v: new THREE.Vector3(), entrada: !!opcoes.entrada });
    }
    // 1) entrada: cotovelos grandes (de baixo pra dentro do corpo)
    [frente, tras].forEach((metade) => {
        metade.userData.cotovelos.forEach((curva) => {
            criarFluxo(metade, 20, 0.4, 0.016, (t, out) => curva.getPoint(1 - t, out), { entrada: true });
        });
    });
    // 2) caixas d'água das placas largas: água subindo pela grade
    [placas[0], placas[1]].forEach((p, i) => {
        const sp = i === 0 ? 1 : -1;
        const zp = sp * (COBRE_E / 2 + CX_LARGA_E + 0.03);
        [-0.56, -0.32, -0.08, 0.16, 0.4, 0.64].forEach((xc) => {
            criarFluxo(p, 8, 0.45, 0.01, (t, out) => out.set(xc, -0.18 + 0.36 * t, zp));
        });
        // e correndo pela barra do T até os flanges amarelos
        [-1, 1].forEach((l) => {
            criarFluxo(p, 10, 0.5, 0.011, (t, out) => out.set(l * t * (T_BARRA_W / 2), T_BARRA_CY, sp * (COBRE_E / 2 + CX_LARGA_E + 0.035)));
        });
    });
    // 3) telescópicos → caixa d'água da placa estreita, e subindo/descendo nela
    mecanismos.forEach((m) => {
        TELE_Y.forEach((yt) => criarFluxo(grupoCobre, 10, 0.6, 0.011, (t, out) => out.set(m.frameX + (m.pontaPlaca() - m.frameX) * t, PLACA_CY + yt, 0)));
        [1, -1].forEach((dir) => [0.035, -0.035].forEach((zc) => {
            criarFluxo(m.placa, 6, 0.55, 0.009, (t, out) => out.set(m.s * (faceCaixaAgua + 0.008), dir * 0.17 * t, zc));
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
                dummy.scale.setScalar(f.tamanho);
                dummy.updateMatrix();
                f.mesh.setMatrixAt(i, dummy.matrix);
            }
            f.mesh.instanceMatrix.needsUpdate = true;
        });
    }

    // ---- clique: modo foco ----
    // Clicou numa peça: some tudo em volta (inclusive o piso), a câmera
    // centraliza nela e libera girar por todos os ângulos. "Voltar ao
    // molde" (ou Esc) restaura a cena.
    const raycaster = new THREE.Raycaster();
    raycaster.params.Line.threshold = 0.001;
    const pointer = new THREE.Vector2();
    const hudPeca = document.getElementById('molde3d-peca');
    const btnSairFoco = document.getElementById('molde3d-btn-sair-foco');
    let foco = null;

    function entrarFoco(alvo, label) {
        const objs = new Set();
        if (alvo.isMesh) {
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
        // filhos, então dá pra isolar uma peça sem sumir junto com a
        // peça "pai" dela.
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
        const hit = raycaster.intersectObjects([frente, tras, grupoCobre, base], true)
            .find((h) => !h.object.isSprite && !h.object.isLine && !h.object.isInstancedMesh && h.object.visible);
        if (!hit) return;
        for (let o = hit.object; o; o = o.parent) {
            if (!o.userData.label) continue;
            // Achou só a metade inteira da carcaça: isola a peça clicada
            // em vez da metade toda.
            if (o === frente || o === tras) entrarFoco(hit.object, `Peça da ${o.userData.label.toLowerCase()}`);
            else entrarFoco(o, o.userData.label);
            return;
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
    // veio): as duas andam juntas, o fuso gira e sanfona/telescópicos
    // acompanham.
    const AJUSTE_MAX = 0.35;
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
            '1/3 · Enchendo os coletores e entrando pelos cotovelos…',
            '2/3 · Circulando: caixas d\'água → placas largas · telescópicos → placas estreitas',
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
            portas.forEach((p) => { p.rotation.y = 1.9 * kAtual; });
            pacotesMola.forEach((pm) => { pm.position.z = zF - 0.01 - 0.55 * kAtual; });
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
        atualizarMecanismos();

        if (testeAgua.ativo) testeAgua.t += dt;
        const encher = testeAgua.ativo ? Math.min(1, testeAgua.t / 2.5) : 0;
        aguasColetor.forEach((a) => {
            a.visible = encher > 0.01;
            a.scale.y = Math.max(0.001, encher * (COL_L - 0.02));
        });
        definirOpacidade(coletorMat, testeAgua.ativo ? 0.35 : 1);
        definirOpacidade(teleLuvaMat, testeAgua.ativo ? 0.4 : 1);
        definirOpacidade(teleInternoMat, testeAgua.ativo ? 0.4 : 1);
        const brilho = testeAgua.ativo && testeAgua.t > 1.6 ? 0.22 + 0.12 * Math.sin(tempo * 4) : 0;
        cobreTrasMat.emissiveIntensity = brilho;
        cobreEstreitaTrasMat.emissiveIntensity = brilho;
        atualizarFluxos(tempo);
        if (foco) {
            fluxos.forEach((f) => { f.mesh.visible = false; });
            aguasColetor.forEach((ag) => { if (!foco.objs.has(ag)) ag.visible = false; });
        }
        atualizarHudAgua();

        controls.update();
        renderer.render(scene, camera);
    }
    animar();
}

window.renderMolde23_3D = renderMolde23_3D;
