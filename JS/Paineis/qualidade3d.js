// Qualidade adaptativa dos 3D ("no PC de casa, mais forte, fica lento
// abaixo de 30 fps"): o custo do WebGL é quase todo por PIXEL, e um
// monitor grande (32" costuma ser 4K) tem 4x os pixels de um Full HD —
// o render fixo em devicePixelRatio até 2, com antialias e sombra, sem
// limite de fps, deixava máquina forte em cima de tela grande mais lenta
// que a do trabalho. Aqui o render se ajusta sozinho ao que a máquina
// aguenta:
//   1. limita a 60 fps (monitor de 120/144 Hz não gasta o dobro à toa);
//   2. mede o fps real a cada 1s e reduz a resolução interna quando cai
//      abaixo do alvo, e volta a subir (devagar) quando sobra folga;
//   3. começa já limitado a um orçamento de pixels, em vez de sofrer
//      alguns segundos antes de descobrir.
// Uso, no laço de animação:
//   const q = criarQualidade3D(renderer);
//   function animar() { requestAnimationFrame(animar); if (!q.deveRenderizar(performance.now())) return; ... }

const RATIO_MIN = 0.5;
const ORCAMENTO_PIXELS = 4.0e6; // ~2560x1560 de pixels reais

export function criarQualidade3D(renderer, { maxFps = 60, alvoFps = 45 } = {}) {
    const intervalo = 1000 / maxFps;
    const dprMax = Math.min(window.devicePixelRatio || 1, 2);
    const tam = { x: 0, y: 0, set(x, y) { this.x = x; this.y = y; return this; } };

    let ratio = dprMax;      // resolução interna atual
    let teto = dprMax;       // até onde já provou aguentar nesta sessão
    let areaRef = 0;
    let aquecendo = 5;       // primeiros quadros (compilação de shader) não contam
    let ultimoRAF = 0;
    let ultimoRender = 0;
    let janelaIni = 0;
    let quadros = 0;
    let bons = 0;

    function aplicar(r) {
        r = Math.max(RATIO_MIN, Math.min(r, dprMax));
        if (Math.abs(r - ratio) < 0.01) return;
        ratio = r;
        renderer.setPixelRatio(r); // reaplica o tamanho atual com o novo ratio
    }

    // Ao iniciar e sempre que a janela muda de tamanho: reparte o
    // orçamento de pixels e zera o que já foi aprendido.
    function ajustarAoTamanho() {
        renderer.getSize(tam);
        const area = tam.x * tam.y;
        if (!area) return;
        if (areaRef && Math.abs(area - areaRef) / areaRef < 0.05) return;
        areaRef = area;
        teto = dprMax;
        aplicar(Math.sqrt(ORCAMENTO_PIXELS / area));
    }

    function avaliar(fps) {
        if (fps < alvoFps && ratio > RATIO_MIN) {
            teto = Math.max(RATIO_MIN, ratio * 0.92); // esse nível já falhou
            aplicar(ratio * 0.85);
            bons = 0;
        } else if (fps >= maxFps - 4 && ratio < teto) {
            if (++bons >= 3) { aplicar(Math.min(teto, ratio * 1.08)); bons = 0; }
        } else {
            bons = 0;
        }
    }

    return {
        get pixelRatio() { return ratio; },
        // true = desenhe este quadro; false = pule (acima do limite de fps).
        deveRenderizar(agora) {
            const gapRAF = agora - ultimoRAF;
            ultimoRAF = agora;
            // aba escondida / travada: recomeça a medição, sem punir a qualidade
            if (gapRAF > 500) { janelaIni = agora; quadros = 0; ultimoRender = agora; return true; }

            const decorrido = agora - ultimoRender;
            if (decorrido < intervalo - 2) return false;
            // mantém o ritmo médio certo em telas de 120/144 Hz
            ultimoRender = agora - (decorrido % intervalo);

            if (aquecendo > 0) {
                if (--aquecendo === 0) ajustarAoTamanho();
                janelaIni = agora; quadros = 0;
                return true;
            }
            quadros++;
            const dur = agora - janelaIni;
            if (dur >= 1000) {
                ajustarAoTamanho();
                avaliar(quadros * 1000 / dur);
                janelaIni = agora; quadros = 0;
            }
            return true;
        },
    };
}
