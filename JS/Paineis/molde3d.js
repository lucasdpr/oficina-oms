// 🆕 Molde MCC4 3D — visualização temporária, só pra apresentação do
// supervisor. Mostra as 4 placas do molde de lingotamento contínuo
// (2 placas largas + 2 placas estreitas, cobre, na estrutura cinza),
// com câmera girando sozinha, zoom e clique pra selecionar cada placa.
//
// Dimensões são ESTIMADAS (média de moldes de lingotamento contínuo
// padrão) — não são as medidas reais/confidenciais da MCC4 da CSN, que
// são internas e não estão disponíveis. Servem só pra dar noção visual
// de escala e proporção pra apresentação.
//
// Admin-only: a aba só fica visível quando ativarMolde3DSeAutorizado()
// (permissoes.js) libera o link do menu. Essa página inteira (esse
// arquivo, a seção no app.html e o link do menu) é feita pra ser
// removida depois que a apresentação acontecer.

let cena3dIniciada = false;

export function renderMolde3D() {
    if (cena3dIniciada) return;
    cena3dIniciada = true;
    iniciarCena().catch((erro) => {
        console.error('[Molde3D] Falha ao carregar visualização 3D:', erro);
        const loading = document.getElementById('molde3d-loading');
        if (loading) {
            loading.textContent = 'Não foi possível carregar o modelo 3D.';
        }
    });
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
    scene.fog = new THREE.FogExp2(0x0a0e15, 0.028);

    const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.1, 200);
    const startPos = new THREE.Vector3(3.2, 2.4, 3.6);
    camera.position.copy(startPos);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if (renderer.outputColorSpace !== undefined) renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.55, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 1.6;
    controls.maxDistance = 9;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.update();

    // ---- iluminação de estúdio ----
    scene.add(new THREE.AmbientLight(0x8fa3bf, 0.55));

    const key = new THREE.DirectionalLight(0xfff3e0, 1.6);
    key.position.set(3, 4.5, 2.2);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -3; key.shadow.camera.right = 3;
    key.shadow.camera.top = 3; key.shadow.camera.bottom = -3;
    key.shadow.camera.far = 14;
    key.shadow.bias = -0.0005;
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x4d7fc9, 0.9);
    rim.position.set(-3.5, 2, -3);
    scene.add(rim);

    const cobreFill = new THREE.PointLight(0xff9d52, 0.65, 8, 2);
    cobreFill.position.set(-1, 1.2, 1.8);
    scene.add(cobreFill);

    // ---- piso ----
    const floor = new THREE.Mesh(
        new THREE.CircleGeometry(6, 64),
        new THREE.MeshStandardMaterial({ color: 0x0d131e, roughness: 0.85, metalness: 0.15 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(12, 24, 0x233047, 0x162032);
    grid.position.y = 0.001;
    grid.material.transparent = true;
    grid.material.opacity = 0.45;
    scene.add(grid);

    // ---- materiais ----
    const estruturaMat = new THREE.MeshStandardMaterial({ color: 0x5a6a82, roughness: 0.45, metalness: 0.75 });
    const estruturaEscuraMat = new THREE.MeshStandardMaterial({ color: 0x333e52, roughness: 0.5, metalness: 0.7 });
    const parafusoMat = new THREE.MeshStandardMaterial({ color: 0x1a2029, roughness: 0.5, metalness: 0.7 });

    // cobre: cor quente, bem metálico, pouca rugosidade pra brilhar
    function materialCobre() {
        return new THREE.MeshPhysicalMaterial({
            color: 0xb5651d,
            roughness: 0.28,
            metalness: 0.95,
            clearcoat: 0.35,
            clearcoatRoughness: 0.25,
            reflectivity: 0.9,
        });
    }

    const molde = new THREE.Group();
    scene.add(molde);

    // ---- dimensões estimadas (metros) ----
    // Placa larga: ~1.5m largura x 0.9m altura x 0.05m espessura de cobre.
    // Placa estreita: ~0.25m largura (= espessura do slab) x 0.9m altura x 0.05m espessura de cobre.
    const ALTURA = 0.9;
    const ESPESSURA_COBRE = 0.05;
    const LARGURA_PLACA_LARGA = 1.5;
    const LARGURA_PLACA_ESTREITA = 0.25;
    const VAO_INTERNO = LARGURA_PLACA_ESTREITA + 0.02; // distância entre as duas placas largas

    // Placas largas: faces frente/trás do molde (eixo Z).
    // Placas estreitas: faces laterais, encaixadas entre as largas (eixo X).
    function criarPlaca(largura, altura, espessura, label, dimsLabel, x, z) {
        const geo = new THREE.BoxGeometry(largura, altura, espessura);
        const mesh = new THREE.Mesh(geo, materialCobre());
        mesh.position.set(x, altura / 2, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = {
            label,
            dims: {
                [dimsLabel]: `${((label === 'Placa larga' ? largura : VAO_INTERNO) * 1000).toFixed(0)} mm`,
                'Altura': `${(altura * 1000).toFixed(0)} mm`,
                'Espessura (cobre)': `${(espessura * 1000).toFixed(0)} mm`,
            },
        };
        return mesh;
    }

    const zPlacaLarga = VAO_INTERNO / 2 + ESPESSURA_COBRE / 2;
    const placaLarga1 = criarPlaca(LARGURA_PLACA_LARGA, ALTURA, ESPESSURA_COBRE, 'Placa larga', 'Largura', 0, zPlacaLarga);
    const placaLarga2 = criarPlaca(LARGURA_PLACA_LARGA, ALTURA, ESPESSURA_COBRE, 'Placa larga', 'Largura', 0, -zPlacaLarga);
    const placaEstreita1 = criarPlaca(ESPESSURA_COBRE, ALTURA, VAO_INTERNO, 'Placa estreita', 'Largura (espessura do veio)', LARGURA_PLACA_LARGA / 2, 0);
    const placaEstreita2 = criarPlaca(ESPESSURA_COBRE, ALTURA, VAO_INTERNO, 'Placa estreita', 'Largura (espessura do veio)', -LARGURA_PLACA_LARGA / 2, 0);

    [placaLarga1, placaLarga2, placaEstreita1, placaEstreita2].forEach((m) => molde.add(m));

    // ---- estrutura de suporte (cinza), atrás das placas ----
    function addViga(w, h, d, x, y, z, mat) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        m.position.set(x, y, z);
        m.castShadow = true;
        m.receiveShadow = true;
        molde.add(m);
        return m;
    }

    const larguraTotal = LARGURA_PLACA_LARGA + ESPESSURA_COBRE * 2;
    const profTotal = VAO_INTERNO + ESPESSURA_COBRE * 2;

    addViga(larguraTotal + 0.3, 0.12, profTotal + 0.3, 0, -0.06, 0, estruturaEscuraMat); // base
    addViga(0.1, ALTURA + 0.15, 0.1, -larguraTotal / 2 - 0.05, ALTURA / 2, -profTotal / 2 - 0.05, estruturaMat);
    addViga(0.1, ALTURA + 0.15, 0.1, larguraTotal / 2 + 0.05, ALTURA / 2, -profTotal / 2 - 0.05, estruturaMat);
    addViga(0.1, ALTURA + 0.15, 0.1, -larguraTotal / 2 - 0.05, ALTURA / 2, profTotal / 2 + 0.05, estruturaMat);
    addViga(0.1, ALTURA + 0.15, 0.1, larguraTotal / 2 + 0.05, ALTURA / 2, profTotal / 2 + 0.05, estruturaMat);
    addViga(larguraTotal + 0.3, 0.1, profTotal + 0.3, 0, ALTURA + 0.12, 0, estruturaEscuraMat); // topo (grampo)

    const parafusoGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.02, 10);
    for (let i = -1; i <= 1; i += 2) {
        for (let j = -1; j <= 1; j += 2) {
            const parafuso = new THREE.Mesh(parafusoGeo, parafusoMat);
            parafuso.position.set(i * (larguraTotal / 2 + 0.05), 0.005, j * (profTotal / 2 + 0.05));
            parafuso.castShadow = true;
            molde.add(parafuso);
        }
    }

    // ---- interação: clique nas placas mostra dimensão ----
    const clicaveis = [placaLarga1, placaLarga2, placaEstreita1, placaEstreita2];
    const originais = new Map(clicaveis.map((m) => [m.uuid, m.material]));
    const hoverMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    let selecionado = null;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    function aoClicar(e) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(clicaveis);
        if (!hits.length) return;
        if (selecionado) selecionado.material = originais.get(selecionado.uuid);
        selecionado = hits[0].object;
        selecionado.material = hoverMat;
    }
    renderer.domElement.addEventListener('click', aoClicar);

    // ---- auto-rotação da câmera ----
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
    const rotateSpeed = 0.18; // rad/s

    function animar() {
        requestAnimationFrame(animar);
        const dt = Math.min(clock.getDelta(), 0.05);

        if (autoRotacionar && !arrastando) {
            const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
            offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotateSpeed * dt);
            camera.position.copy(controls.target).add(offset);
        }

        controls.update();
        renderer.render(scene, camera);
    }
    animar();
}

window.renderMolde3D = renderMolde3D;
