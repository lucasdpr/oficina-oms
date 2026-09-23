// 🆕 Molde MCC4 3D — visualização temporária, só pra apresentação do
// supervisor. Exterior modelado a partir da foto frontal real do molde
// (corpo central com "OMS", 3 janelas, asas laterais escalonadas, olhais,
// pés, grade de refrigeração, canos em U, mangueiras com fita amarela,
// "06"). O botão "Ver interior" abre o molde ao meio (metade da frente
// vai pra frente, metade de trás vai pra trás) e mostra as 4 placas de
// cobre, cada uma se afastando das outras: frente lisa bicolor (cobre em
// cima, cinza embaixo) e traseira com a grade de furos de refrigeração
// (tampas vermelhas, furos abertos, chicote de fio amarelo) — tudo
// copiado das fotos reais das placas.
//
// Dimensões são ESTIMADAS a partir das proporções das fotos — não são as
// medidas reais/confidenciais da MCC4 da CSN.
//
// Página pública (Molde3d.html), sem gate de admin — pedido do usuário,
// mesmo padrão do Sinótico 3D. Esse arquivo, Molde3d.html e o link do
// menu (app.html) são pra ser removidos depois da apresentação.

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

// Aço fundido gasto: base marrom-acinzentada + manchas de ferrugem +
// escorridos verticais (igual à superfície das fotos).
function criarTexturaAcoGasto(THREE) {
    const [c, ctx] = novoCanvas(512, 512);
    ctx.fillStyle = '#4a453f';
    ctx.fillRect(0, 0, 512, 512);
    const manchas = ['rgba(110,74,44,0.12)', 'rgba(60,55,50,0.15)', 'rgba(130,88,52,0.09)', 'rgba(35,33,31,0.12)', 'rgba(90,82,72,0.12)'];
    for (let i = 0; i < 700; i++) {
        ctx.fillStyle = manchas[i % manchas.length];
        const r = 2 + Math.random() * 18;
        ctx.beginPath();
        ctx.ellipse(Math.random() * 512, Math.random() * 512, r, r * (0.5 + Math.random()), Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }
    for (let i = 0; i < 70; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 400;
        const g = ctx.createLinearGradient(x, y, x, y + 60 + Math.random() * 120);
        g.addColorStop(0, 'rgba(120,78,45,0.18)');
        g.addColorStop(1, 'rgba(120,78,45,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x, y, 2 + Math.random() * 5, 180);
    }
    const t = texturaDeCanvas(THREE, c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
}

// Frente da placa: lisa, ~2/3 de cima cobre e 1/3 de baixo cinza/aço,
// com a borda de cima pintada de vermelho (foto real).
function criarTexturaPlacaFrente(THREE) {
    const [c, ctx] = novoCanvas(512, 256);
    const corte = Math.round(256 * 0.64);
    const gc = ctx.createLinearGradient(0, 0, 512, 0);
    gc.addColorStop(0, '#b87a55');
    gc.addColorStop(0.5, '#c98b62');
    gc.addColorStop(1, '#b17350');
    ctx.fillStyle = gc;
    ctx.fillRect(0, 0, 512, corte);
    const gs = ctx.createLinearGradient(0, corte, 0, 256);
    gs.addColorStop(0, '#9aa0a6');
    gs.addColorStop(1, '#7d838a');
    ctx.fillStyle = gs;
    ctx.fillRect(0, corte, 512, 256 - corte);
    ctx.fillStyle = 'rgba(190,50,45,0.85)';
    ctx.fillRect(0, 0, 512, 6);
    for (let i = 0; i < 40; i++) {
        ctx.strokeStyle = 'rgba(255,230,210,0.05)';
        ctx.lineWidth = 8 + Math.random() * 20;
        ctx.beginPath();
        ctx.arc(Math.random() * 512, Math.random() * corte, 20 + Math.random() * 60, 0, Math.PI * 2);
        ctx.stroke();
    }
    return texturaDeCanvas(THREE, c);
}

// Traseira da placa: grade de furos de refrigeração — tampas vermelhas,
// furos abertos com anel de cobre (maiores nas fileiras de cima e de
// baixo), e o chicote de fio amarelo passando no terço de cima.
function criarTexturaPlacaTras(THREE) {
    const [c, ctx] = novoCanvas(1024, 512);
    ctx.fillStyle = '#5b4b3f';
    ctx.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 300; i++) {
        ctx.fillStyle = i % 2 ? 'rgba(120,70,40,0.25)' : 'rgba(40,32,28,0.25)';
        ctx.beginPath();
        ctx.arc(Math.random() * 1024, Math.random() * 512, 3 + Math.random() * 14, 0, Math.PI * 2);
        ctx.fill();
    }
    function furoAberto(x, y, r) {
        ctx.fillStyle = '#9a5a3a';
        ctx.beginPath(); ctx.arc(x, y, r + 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1c1411';
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    function tampaVermelha(x, y, r) {
        ctx.fillStyle = '#6b2a24';
        ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#c23a3e';
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    const colunas = 22;
    const passo = 1024 / colunas;
    for (let col = 0; col < colunas; col++) {
        const x = passo / 2 + col * passo;
        furoAberto(x, 40, 17);
        furoAberto(x, 472, 17);
        for (let lin = 0; lin < 6; lin++) {
            const y = 100 + lin * 58;
            const xo = lin % 2 ? passo / 2 : 0;
            if (x + xo < 1010) tampaVermelha(x + xo, y, 12);
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

    // ---- materiais (MCC2/3: aço pintado de cinza claro, detalhes vermelhos, base azul) ----
    function texturaPintura() {
        const [c, ctx] = novoCanvas(512, 512);
        ctx.fillStyle = '#878b8f';
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
    // traseira da placa larga da MCC2/3: grade de cabeças de parafuso cinza (foto)
    function texturaPlacaTras23() {
        const [c, ctx] = novoCanvas(1024, 512);
        ctx.fillStyle = '#b9bcbf';
        ctx.fillRect(0, 0, 1024, 512);
        for (let col = 0; col < 12; col++) {
            for (let lin = 0; lin < 5; lin++) {
                const x = 60 + col * 82, y = 60 + lin * 98;
                ctx.fillStyle = '#8d9195'; ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#5e6266'; ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill();
            }
        }
        [[300, 300], [760, 250]].forEach(([x, y]) => {
            ctx.strokeStyle = '#7d8185'; ctx.lineWidth = 6;
            ctx.beginPath(); ctx.arc(x, y, 60, 0, Math.PI * 2); ctx.stroke();
        });
        ctx.strokeStyle = '#b34a2e'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(560, 470);
        ctx.bezierCurveTo(700, 200, 1000, 150, 950, 420); ctx.stroke();
        return texturaDeCanvas(THREE, c);
    }
    const texPint = texturaPintura();
    const acoMat = new THREE.MeshStandardMaterial({ map: texPint, roughness: 0.6, metalness: 0.3 });
    const acoEscuroMat = new THREE.MeshStandardMaterial({ map: texPint, color: 0xa9adb1, roughness: 0.65, metalness: 0.3 });
    const ferrugemMat = new THREE.MeshStandardMaterial({ color: 0x6e4a33, roughness: 0.9, metalness: 0.3 });
    const vermelhoMat = new THREE.MeshStandardMaterial({ color: 0xc8253a, roughness: 0.45, metalness: 0.2 });
    const laranjaMat = new THREE.MeshStandardMaterial({ color: 0xc0532f, roughness: 0.5, metalness: 0.3 });
    const azulMat = new THREE.MeshStandardMaterial({ color: 0x2c5aa8, roughness: 0.55, metalness: 0.35 });
    const buracoMat = new THREE.MeshStandardMaterial({ color: 0x1a1b1d, roughness: 1, metalness: 0 });
    const parafusoMat = new THREE.MeshStandardMaterial({ color: 0x2b2d30, roughness: 0.5, metalness: 0.7 });
    const canoMat = new THREE.MeshStandardMaterial({ color: 0x979ba0, roughness: 0.45, metalness: 0.45 });
    const canoInoxMat = new THREE.MeshStandardMaterial({ color: 0x9a9da3, roughness: 0.3, metalness: 0.9 });
    const conduiteMat = new THREE.MeshStandardMaterial({ color: 0x8c9095, roughness: 0.55, metalness: 0.4 });

    const texFrente = criarTexturaPlacaFrente(THREE);
    const texTras = texturaPlacaTras23();
    const cobreFrenteMat = new THREE.MeshPhysicalMaterial({ map: texFrente, roughness: 0.38, metalness: 0.85, clearcoat: 0.2, clearcoatRoughness: 0.4 });
    const cobreTrasMat = new THREE.MeshStandardMaterial({ map: texTras, roughness: 0.7, metalness: 0.4 });
    const cobreBordaMat = new THREE.MeshStandardMaterial({ color: 0xa8674a, roughness: 0.5, metalness: 0.7 });

    // ---- helpers ----
    function box(pai, w, h, d, x, y, z, mat, contorno = true) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);
        m.castShadow = true;
        m.receiveShadow = true;
        if (contorno) {
            const linhas = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), new THREE.LineBasicMaterial({ color: 0x0a0908, transparent: true, opacity: 0.55 }));
            m.add(linhas);
        }
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

    // ---- dimensões (proporções das fotos da MCC2/3) ----
    const D = 0.9;
    const CORPO_W = 1.9;
    const CORPO_Y0 = 0.39;   // em cima da plataforma cinza da base
    const CORPO_H = 0.48;
    const CORPO_TOPO = CORPO_Y0 + CORPO_H;
    const CORPO_CY = CORPO_Y0 + CORPO_H / 2;

    // ---- base: vigas AZUIS + plataforma cinza (fica parada ao abrir) ----
    const base = new THREE.Group();
    scene.add(base);
    [-1.2, 1.2].forEach((x) => {
        [-1, 1].forEach((sz) => box(base, 0.14, 0.34, 0.1, x, 0.17, sz * 0.36, azulMat));
        box(base, 0.2, 0.02, D * 0.95, x, 0.01, 0, azulMat);
    });
    [-1, 1].forEach((sz) => {
        box(base, 2.3, 0.07, 0.05, 0, 0.23, sz * 0.43, azulMat);
        box(base, 2.3, 0.05, 0.04, 0, 0.1, sz * 0.43, azulMat);
    });
    box(base, 2.9, 0.035, D + 0.12, 0, 0.372, 0, acoEscuroMat);
    // tanques/coletores escuros embaixo do corpo
    [-0.45, 0.45].forEach((x) => cilindro(base, 0.06, 0.8, x, 0.3, 0, parafusoMat, 'x', 20));

    function construirMetade(sinal) {
        const g = new THREE.Group();
        const d = D / 2 - 0.004;
        const zc = sinal * (D / 4);
        const face = sinal * (D / 2);
        const fz = (off) => face + sinal * off;

        // corpo central
        box(g, CORPO_W, CORPO_H, d, 0, CORPO_CY, zc, acoMat);
        // tampo do topo, levemente mais largo
        box(g, CORPO_W + 0.06, 0.03, d, 0, CORPO_TOPO + 0.015, zc, acoEscuroMat);
        // abertura do canal no topo
        box(g, 1.3, 0.006, 0.09, 0, CORPO_TOPO + 0.033, sinal * 0.045, buracoMat, false);

        // asas das pontas (blocos cinza com canto chanfrado, faixa vermelha e fenda)
        [-1, 1].forEach((lado) => {
            const x = lado * (CORPO_W / 2 + 0.17);
            box(g, 0.34, 0.3, d * 0.9, x, CORPO_Y0 + 0.15, sinal * (d * 0.9) / 2, acoMat);
            const chanfro = box(g, 0.2, 0.2, d * 0.9, x + lado * 0.05, CORPO_Y0 + 0.3, sinal * (d * 0.9) / 2, acoMat);
            chanfro.rotation.z = lado * -0.7;
            box(g, 0.022, 0.13, 0.005, x + lado * 0.06, CORPO_Y0 + 0.2, sinal * (d * 0.9) + sinal * 0.003, vermelhoMat, false);
            box(g, 0.14, 0.04, 0.01, x + lado * 0.04, CORPO_Y0 + 0.03, sinal * (d * 0.9) + sinal * 0.004, buracoMat, false);
            // parafuso de ajuste em pé, perto da asa
            cilindro(g, 0.014, 0.1, lado * (CORPO_W / 2 - 0.12), CORPO_Y0 + 0.07, fz(0.04), parafusoMat, 'y', 8);
            box(g, 0.06, 0.02, 0.06, lado * (CORPO_W / 2 - 0.12), CORPO_Y0 + 0.02, fz(0.04), acoEscuroMat);
        });

        // cotovelos grandes nos cantos de cima, com flange
        [-1, 1].forEach((lado) => {
            const x0 = lado * (CORPO_W / 2 - 0.05);
            tubo(g, [[x0, CORPO_TOPO - 0.05, sinal * 0.3], [x0 + lado * 0.1, CORPO_TOPO + 0.08, sinal * 0.3], [x0 + lado * 0.28, CORPO_TOPO + 0.06, sinal * 0.3], [x0 + lado * 0.36, CORPO_TOPO - 0.08, sinal * 0.3], [x0 + lado * 0.36, CORPO_Y0 + 0.2, sinal * 0.3]], 0.055, canoMat);
            cilindro(g, 0.085, 0.025, x0 + lado * 0.02, CORPO_TOPO + 0.02, sinal * 0.3, canoMat, 'x', 20).rotation.z = Math.PI / 2 + lado * 0.6;
        });
        return g;
    }

    const frente = construirMetade(1);
    const tras = construirMetade(-1);
    scene.add(frente, tras);

    const zF = D / 2;

    // ---- FRENTE (foto do "15") ----
    texto(frente, criarTexturaTexto(THREE, '15', '#c8253a'), 0.24, 0.13, -0.1, 0.71, zF + 0.003);
    // caixa de comando
    box(frente, 0.3, 0.26, 0.05, 0.38, 0.69, zF + 0.025, acoEscuroMat);
    box(frente, 0.03, 0.06, 0.02, 0.54, 0.69, zF + 0.04, laranjaMat);
    // parafusos grandes do painel
    [[-0.5, 0.78], [-0.5, 0.5], [0.72, 0.78], [0.72, 0.5]].forEach(([x, y]) => cilindro(frente, 0.028, 0.025, x, y, zF + 0.012, parafusoMat, 'z', 6));
    // curvas em U na parte de baixo da frente
    [-0.3, -0.05, 0.22, 0.48].forEach((x) => {
        tubo(frente, [[x, 0.55, zF], [x, 0.47, zF + 0.06], [x + 0.05, 0.43, zF + 0.07], [x + 0.1, 0.47, zF + 0.06], [x + 0.1, 0.55, zF]], 0.03, canoMat);
    });
    // válvulas/parafusos em pé na borda de baixo
    [-0.72, 0.05, 0.12, 0.8].forEach((x) => {
        cilindro(frente, 0.012, 0.12, x, 0.47, zF + 0.05, parafusoMat, 'y', 8);
        box(frente, 0.06, 0.03, 0.05, x, 0.41, zF + 0.05, acoEscuroMat);
    });
    // conduítes verticais dos lados (esquerda e direita)
    [-0.85, -0.75, -0.66, 0.86, 0.94, 1.02].forEach((x, i) => {
        tubo(frente, [[x, CORPO_TOPO + 0.02, zF + 0.02], [x + (i % 2 ? 0.03 : -0.02), 0.7, zF + 0.04], [x, 0.45, zF + 0.03], [x, 0.41, zF + 0.01]], 0.018, conduiteMat);
    });
    // conduítes trançados passando por cima
    tubo(frente, [[-0.9, CORPO_TOPO + 0.03, zF - 0.02], [-0.4, CORPO_TOPO + 0.07, zF - 0.05], [0.1, CORPO_TOPO + 0.03, zF - 0.02], [0.6, CORPO_TOPO + 0.08, zF - 0.06], [0.95, CORPO_TOPO + 0.03, zF - 0.02]], 0.02, conduiteMat);
    tubo(frente, [[-0.8, CORPO_TOPO + 0.02, zF - 0.1], [-0.2, CORPO_TOPO + 0.05, zF - 0.12], [0.4, CORPO_TOPO + 0.02, zF - 0.1], [0.9, CORPO_TOPO + 0.05, zF - 0.12]], 0.016, conduiteMat);
    // tampas vermelhas meio escondidas atrás dos conduítes
    [-0.72, 0.9].forEach((x) => cilindro(frente, 0.04, 0.012, x, 0.66, zF + 0.006, vermelhoMat, 'z', 18));

    // ---- TRASEIRA (foto das tampas redondas vermelhas) ----
    const zT = -D / 2;
    [[-0.62, 0.74, 0.045], [-0.35, 0.66, 0.06], [-0.62, 0.5, 0.04], [-0.95, 0.62, 0.04], [0.42, 0.66, 0.06], [0.6, 0.76, 0.045], [0.6, 0.5, 0.04], [0.95, 0.62, 0.04]].forEach(([x, y, r]) => {
        cilindro(tras, r, 0.02, x, y, zT - 0.01, vermelhoMat, 'z', 20);
        for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2;
            cilindro(tras, 0.006, 0.01, x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, zT - 0.022, parafusoMat, 'z', 6);
        }
    });
    box(tras, 0.3, 0.17, 0.04, 0.02, 0.74, zT - 0.02, acoEscuroMat);
    cilindro(tras, 0.018, 0.06, -0.22, 0.83, zT - 0.03, vermelhoMat, 'y', 10);
    // linhas hidráulicas finas (horizontais e verticais)
    [0.44, 0.47, 0.83].forEach((y) => tubo(tras, [[-0.88, y, zT - 0.012], [0, y + 0.01, zT - 0.015], [0.88, y, zT - 0.012]], 0.008, conduiteMat));
    [-0.8, -0.2, 0.25, 0.8].forEach((x) => tubo(tras, [[x, 0.44, zT - 0.012], [x, 0.65, zT - 0.015], [x + 0.05, 0.83, zT - 0.012]], 0.008, conduiteMat));
    // mangueira laranja no canto
    tubo(tras, [[-0.95, 0.5, zT - 0.02], [-0.85, 0.72, zT - 0.06], [-0.55, 0.8, zT - 0.05], [-0.3, 0.72, zT - 0.03]], 0.014, laranjaMat);

    // ---- PONTA (foto de lado: moldura com 2 caixas + junta laranja no cano) ----
    const xP = -(CORPO_W / 2 + 0.34);
    [[0.22, 0.36], [-0.22, 0.36]].forEach(([z, h]) => box(frente, 0.03, h, 0.025, xP - 0.02, CORPO_Y0 + h / 2, z * 0.5, acoEscuroMat));
    box(frente, 0.03, 0.025, 0.25, xP - 0.02, CORPO_Y0 + 0.36, 0.0, acoEscuroMat);
    box(frente, 0.05, 0.1, 0.13, xP - 0.04, CORPO_Y0 + 0.27, 0.0, acoMat);
    box(frente, 0.05, 0.09, 0.13, xP - 0.04, CORPO_Y0 + 0.08, 0.0, acoMat);
    cilindro(frente, 0.06, 0.06, -(CORPO_W / 2 + 0.2), CORPO_TOPO + 0.05, 0.3, laranjaMat, 'x', 20);

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
    function placa(w, d, x, z, eixoFora, sinalFora, label) {
        const mats = Array(6).fill(cobreBordaMat);
        const idxFora = eixoFora === 'x' ? (sinalFora > 0 ? 0 : 1) : (sinalFora > 0 ? 4 : 5);
        const idxDentro = eixoFora === 'x' ? (sinalFora > 0 ? 1 : 0) : (sinalFora > 0 ? 5 : 4);
        mats[idxFora] = cobreTrasMat;
        mats[idxDentro] = cobreFrenteMat;
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, PLACA_H, d), mats);
        m.position.set(x, PLACA_CY, z);
        m.castShadow = true;
        m.receiveShadow = true;
        m.userData.label = label;
        grupoCobre.add(m);
        return m;
    }
    // 🆕 Cada placa guarda o eixo/sinal em que ela se afasta das outras no
    // "Ver interior" — pedido do usuário pra dar uma abertura entre as
    // largas e as estreitas (senão formam um bloco só, difícil de
    // distinguir uma peça da outra).
    function comAfastamento(mesh, eixo, sinal) {
        mesh.userData.eixoAfastamento = eixo;
        mesh.userData.sinalAfastamento = sinal;
        mesh.userData.baseAfastamento = eixo === 'z' ? mesh.position.z : mesh.position.x;
        return mesh;
    }
    const placas = [
        comAfastamento(placa(PLACA_LARGA_W, COBRE_E, 0, zPlacaLarga, 'z', 1, 'Placa larga'), 'z', 1),
        comAfastamento(placa(PLACA_LARGA_W, COBRE_E, 0, -zPlacaLarga, 'z', -1, 'Placa larga'), 'z', -1),
        comAfastamento(placa(COBRE_E, PLACA_ESTREITA_W, xPlacaEstreita, 0, 'x', 1, 'Placa estreita'), 'x', 1),
        comAfastamento(placa(COBRE_E, PLACA_ESTREITA_W, -xPlacaEstreita, 0, 'x', -1, 'Placa estreita'), 'x', -1),
    ];
    const ABERTURA_PLACAS = 0.22;

    // ---- foot rolls e guias (fotos reais) ----
    // Presos como filhos das placas, pra acompanharem a placa na abertura.
    const mancalMat = new THREE.MeshStandardMaterial({ color: 0x8e8b85, roughness: 0.85, metalness: 0.4 });
    const faixaVermelhaMat = new THREE.MeshStandardMaterial({ color: 0xc2343a, roughness: 0.6 });
    const rolinhoMat = new THREE.MeshStandardMaterial({ color: 0xa3a6ab, roughness: 0.35, metalness: 0.85 });
    const tampaRoloMat = new THREE.MeshStandardMaterial({ color: 0x2a2826, roughness: 0.6, metalness: 0.5 });

    // Foot roll: eixo inox comprido embaixo da placa larga, virado pro
// interior, apoiado em 4 mancais de ferro fundido com faixa vermelha.
function adicionarFootRoll(placaLarga, sinal) {
    const g = new THREE.Group();
    g.position.set(0, -PLACA_H / 2 - 0.035, -sinal * 0.025);
    placaLarga.add(g);

    // 3 rolos empilhados (foto real), cada um com seus 4 mancais
    [0].forEach((y) => {
        cilindro(g, 0.028, PLACA_LARGA_W - 0.06, 0, y, 0, canoInoxMat, 'x', 24);
        
        [-0.46, -0.15, 0.15, 0.46].forEach((x) => {
            box(g, 0.05, 0.062, 0.075, x, y, 0, mancalMat);
            cilindro(g, 0.0295, 0.028, x + 0.042, y, 0, faixaVermelhaMat, 'x', 24);
        });
    });

}

    // Guia: bloco de ferro enferrujado embaixo da placa estreita, com os
    // rolinhos empilhados virados pro lado de dentro do molde.
    function adicionarGuia(placaEstreita, sinal) {
        const g = new THREE.Group();
        g.position.set(0, -PLACA_H / 2 - 0.12, 0);
        placaEstreita.add(g);
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

    // ---- clique numa placa: destaca ----
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let selecionada = null;
    renderer.domElement.addEventListener('click', (e) => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects([frente, tras, ...placas], true)[0];
        if (selecionada) selecionada.scale.set(1, 1, 1);
        selecionada = hit && placas.includes(hit.object) ? hit.object : null;
        if (selecionada) selecionada.scale.set(1.02, 1.04, 1.02);
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
    if (btnInterior) {
        btnInterior.addEventListener('click', () => {
            interiorAberto = !interiorAberto;
            transicaoT = 0;
            btnInterior.innerHTML = interiorAberto
                ? '<i class="fas fa-layer-group"></i> Fechar molde'
                : '<i class="fas fa-layer-group"></i> Ver interior';
        });
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
    function animar() {
        requestAnimationFrame(animar);
        const dt = Math.min(clock.getDelta(), 0.05);

        if (autoRotacionar && !arrastando) {
            const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
            offset.applyAxisAngle(eixoY, 0.16 * dt);
            camera.position.copy(controls.target).add(offset);
        }

        if (transicaoT < 1) {
            transicaoT = Math.min(1, transicaoT + dt / DURACAO);
            const e = transicaoT < 0.5 ? 4 * transicaoT ** 3 : 1 - (-2 * transicaoT + 2) ** 3 / 2;
            const k = interiorAberto ? e : 1 - e;
            frente.position.z = ABERTURA * k;
            tras.position.z = -ABERTURA * k;
            grupoCobre.position.y = 0.6 * k;
            placas.forEach((p) => {
                const { eixoAfastamento, sinalAfastamento, baseAfastamento } = p.userData;
                const valor = baseAfastamento + ABERTURA_PLACAS * k * sinalAfastamento;
                if (eixoAfastamento === 'z') p.position.z = valor; else p.position.x = valor;
            });
        }

        controls.update();
        renderer.render(scene, camera);
    }
    animar();
}

window.renderMolde23_3D = renderMolde23_3D;
