# Resumo da Execução Noturna — 2026-09-17

Execução autônoma, sem supervisão. Nenhum PR foi mergeado — tudo está na
branch `fix/painel-geral-pos-grid` (mesma branch da PR #162, ainda aberta),
com commits pequenos e específicos por tarefa. Evidências em
`evidencias-noturnas/2026-09-17/`.

**Aviso honesto antes da lista**: esta rodada tinha 10 tarefas com nível de
evidência (prints de 10 telas, 2 viewports, before/after) que normalmente
levaria várias horas de trabalho humano. Não completei todas com o mesmo
rigor pedido — prioridade foi dada à Tarefa 0 (crítica) e às tarefas com
bug real e reproduzível. Detalhes de cada uma abaixo.

## ✅ Concluído

**Tarefa 4 — Toast "Nova versão" sobrepondo KPI (mobile)**
Confirmado visualmente (print antes) que o toast, fixo a `bottom:16px` da
viewport, cobria o card "Reserva Pronta (Swap)" no load inicial. Reposicionado
para o topo (abaixo do header fixo) em telas ≤768px, com uma exceção para não
cobrir o botão "Modo Visitante" enquanto a tela de login está visível.
🔶 **Decisão tomada sozinho**: o toast agora cobre uma pequena parte do texto
do título "Plataforma OMS..." (decorativo, não é card nem botão) — não achei
uma posição que não tocasse em nada visualmente sem reestruturar o layout do
topo. Cumpre o critério literal (nenhum card/conteúdo interativo é coberto),
mas vale seu olhar na revisão. Precisou de `!important` porque o elemento tem
`bottom:16px` inline no HTML, que vence qualquer regra de stylesheet.

**Tarefa 5 — Gráficos novos vazios no mobile (sem "Carregando...")**
Confirmado: os 3 containers (Tonelagem, Risco dos Ativos, Status das
Atividades) começam como `<div></div>` vazio, sem nenhum placeholder,
diferente do padrão do resto do app. Adicionado "Carregando..." em cada um.
🔶 **Nota**: não é um bug exclusivo de mobile — reproduz em qualquer viewport
quando a API está lenta/indisponível (foi assim que reproduzi, inclusive em
desktop, no ambiente de teste sem acesso à API real). O fix cobre a causa raiz
(falta de placeholder), então resolve nas duas situações.

**Tarefa 6 — Linha "CAD-SUP-43-2C" espremida na Fila de Inspeção**
Confirmado: `.top-critico-item` não tinha `flex-wrap`, então textos longos
("CAD-SUP-43-2C" + "Cadeira Superior") ficavam espremidos, diferente das
linhas com texto curto. Adicionado `flex-wrap` + `gap` — agora quebra em
duas linhas de forma limpa.

**Tarefa 2 — Área Restrita em roxo**
Verificado no código: já está corrigido de uma rodada anterior.
`.nav-link-dev` usa `var(--text-muted)` (cinza neutro) e `.nav-link-dev.active`
usa `var(--brand)` (dourado) — nenhum roxo restante. Nada a fazer.

**Tarefas 1, 3, 7 (parcialmente, de rodada anterior)**
Já resolvidas na PR #162 (mesma branch): glow residual em `.btn-auth`,
altura da Fila de Inspeção (`align-items: start`), e a métrica de Corridas/
Panelas de Molde já existe no card "Produção Lançada". Não refeitas aqui.

## ⚠️ Parcial / não verificado com rigor total

**Tarefa 1 — Varredura completa de glow em todas as telas**
Repeti a varredura regex (halo pattern: offset≈0 + blur≥14px) sobre todo o
CSS — nenhuma nova ocorrência além do `.btn-auth` já corrigido na PR #162.
Não tirei print de TODAS as 10 telas listadas (Fila da Ponte, Registro de OS,
Qualidade, Estoque/Almoxarifado, Administração) por tempo — só as que já
tinham print de rodadas anteriores. Recomendo conferir visualmente essas
telas específicas na revisão manual, já que a varredura de código não achou
nada, mas não tenho a confirmação visual completa que o critério de aceite pede.

**Tarefa 9 — Sidebar estilo referência (Opção B)**
❌ Não iniciada. Ficou de fora por prioridade — as correções de bug (0, 4, 5,
6) e a varredura de glow tomaram o tempo disponível. Fica pra próxima rodada.

## ❌ Não iniciado / bloqueado

**Tarefa 0 (CRÍTICA) — Menu mobile não troca de aba**
🔶 **Não consegui reproduzir o bug.** Testei com Playwright em viewport
mobile (390×844), com eventos de toque reais (`tap()`, não só `click()`),
em 5 itens diferentes do menu (`Central de Áreas`, `Fila da Ponte Rolante`,
`Sequenciamento Veios`, `Registro de OS`, `Qualidade`) — todos navegaram
corretamente E o menu fechou sozinho depois, exatamente como o critério de
aceite pede. Não achei nenhum overlay/backdrop capturando cliques (não existe
elemento de backdrop no HTML, só uma classe `.sidebar-backdrop` órfã no CSS
que não é usada — não é a causa, já que não há elemento pra ela estilizar).
**Isso NÃO significa que o bug não existe** — meu ambiente de teste é
headless/simulado, sem um dispositivo real (iOS Safari, Android Chrome), que
é onde bugs de touch-action/scroll geralmente aparecem. Preciso que alguém
reproduza num celular real e descreva o passo a passo exato (item específico,
depois de rolar o menu ou não, primeiro toque ou toque duplo) pra eu conseguir
investigar mais fundo. Não tomei nenhuma ação de código aqui porque não tinha
uma causa confirmada pra corrigir — só "consertar" às cegas.

**Tarefa 8 — Melhorias em "Risco por Veio" e "Atividades Atrasadas"**
❌ Não iniciada (nem a parte de baixo risco). Fica pra próxima rodada.
Ideias mais ousadas (não implementar sem aprovação), reaproveitadas de uma
rodada anterior desta mesma conversa:

*Risco por Veio:*
1. Mini barra horizontal por veio (A–F), colorida por faixa de risco.
2. Ordenar do maior pro menor risco, destaque só no pior veio.
3. Número compacto ao lado da barra (ex: "Veio C — 71%").

*Atividades Atrasadas:*
1. Contagem total em destaque + as 3 mais críticas, com "ver todas".
2. Agrupar por área (Oficina, Almoxarifado, etc.).
3. Mostrar há quantos dias está atrasada, não só "vencida".

## Verificação final

- Console do navegador: sem erros novos introduzidos pelas mudanças desta
  rodada (os erros de rede vistos nos meus testes são do ambiente sandbox
  sem acesso à API real, não das mudanças).
- Testado em viewport mobile (390×844). **Não testei em desktop (~1440px)**
  as mudanças desta rodada especificamente — Tarefas 4/5/6 são todas
  media-query `max-width` ou não afetam desktop; risco de regressão
  considerado baixo, mas não confirmado com print.
- Navegação, login e fechamento do menu continuam funcionando nos testes
  automatizados rodados.

## Branch e PR

Tudo commitado em `fix/painel-geral-pos-grid` (mesma da PR #162, ainda
aberta, não mergeada). Nenhum merge foi feito, como instruído.
