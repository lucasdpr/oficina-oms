# OMS — Oficina de Moldes e Segmentos (CSN)

### Sistema de Gestão de Manutenção — MCC 2/3 e MCC 4

Aplicação web (PWA) para digitalização, gestão e rastreabilidade completa da manutenção de moldes e segmentos industriais. Substitui o controle manual por um fluxo digital único: cadastro de peças, alocação em veio, checklists de manutenção (folhões) com geração automática de laudo em PDF, e visualização 3D em tempo real do estado de cada máquina.

## 🚀 Funcionalidades Principais

- **Sequenciamento de Veios** — painel em tempo real com o desgaste (tonelagem / meta) de cada peça instalada, por veio (C, D, E, F — MCC 2/3; G, H — MCC 4).
- **Sinótico Visual 3D** — visualização tridimensional (Three.js) de cada veio, com o status de desgaste de cada posição codificado por cor, atualizado a partir do mesmo banco de dados do painel principal.
- **Estoque Reserva e Swap Automático** — cadastro de peças reservas e troca guiada (Swap): tira a peça desgastada da linha, manda pra Oficina/Reparo e instala a peça reserva no lugar, tudo em uma ação.
- **Folhões de Manutenção** — checklist digital completo (chegada, execução, ajustes técnicos, inspeção final) para cada tipo de equipamento, com geração automática de laudo em PDF no padrão oficial da engenharia.
- **Prontuário por Peça** — linha do tempo completa de cada peça: quando entrou em cada veio, quem instalou, folhões concluídos, observações manuais.
- **Auditoria Global** — rastreabilidade de todas as ações do sistema (restrita a matrículas autorizadas).
- **Painel do Técnico** — atalhos rápidos para o fluxo do dia a dia na oficina.
- **Estoque de Rolos, Hidráulica e Almoxarifado Central** — controle complementar de materiais e componentes.
- **Login por matrícula** (com definição de senha no primeiro acesso) ou **Modo Visitante** (acesso só leitura, mediante identificação por nome).
- **PWA instalável** — funciona offline (cache local via Service Worker) e pode ser instalado na tela inicial do celular.

## 🏗️ Arquitetura

```
┌─────────────────────┐        HTTPS/JSON        ┌──────────────────────┐        ┌──────────────┐
│   Front-end (PWA)    │  ───────────────────────▶│   Backend (FastAPI)   │───────▶│  PostgreSQL   │
│  HTML + JS (ES Mod.)  │◀──────────────────────── │       main.py         │◀───────│    (Neon)     │
└─────────────────────┘                           └──────────────────────┘        └──────────────┘
       ▲
       │ cache offline
┌─────────────────────┐
│   Service Worker      │
└─────────────────────┘
```

O front-end não guarda o estado das peças localmente — cada tela sincroniza com a API a cada carregamento. O `localStorage` é usado só como cache de leitura rápida (primeira renderização instantânea) e como fallback offline; a fonte de verdade é sempre o Postgres.

## 🛠️ Tecnologias

**Front-end**

- HTML5, CSS3, JavaScript (ES6 Modules, sem framework/build step)
- [Three.js](https://threejs.org/) — Sinótico Visual 3D
- [html2pdf.js](https://github.com/eKoopmans/html2PDF.js) — geração de laudos em PDF
- Service Worker + Web App Manifest — PWA instalável e com suporte offline

**Back-end**

- [FastAPI](https://fastapi.tiangolo.com/) (Python) — API REST
- [PostgreSQL](https://www.postgresql.org/) hospedado no [Neon](https://neon.tech/)
- `psycopg2` — driver de banco de dados
- `pandas` / `openpyxl` — importação de planilhas Excel (carga inicial de dados)
- `bcrypt` — hash de senha dos colaboradores

**Infraestrutura**

- Deploy do back-end no [Render](https://render.com/) (ver `Procfile`)
- `cron-job.org` (ou equivalente) faz ping periódico em `/api/ping_db` para manter o banco Neon ativo

## 📂 Estrutura do Projeto

```
├── index.html                    # Tela de entrada (splash / redirecionamento)
├── app.html                      # Aplicação principal — todas as abas do sistema
├── Sinotico3d.html                # Sinótico Visual 3D (aba independente, MCC 2/3 e MCC 4)
├── manifest.json                  # Manifesto do PWA (ícones, tema, modo standalone)
├── service-worker.js              # Cache offline e ciclo de vida do PWA
│
├── script.js                      # Lógica principal: login, navegação, Swap, Auditoria,
│                                   # Prontuário, Painel do Técnico, folhões (roteamento)
├── ui.js                          # Renderização de Estoque Reserva e ações de equipamento
├── banco.js                       # Camada de acesso à API — sincroniza BANCO_ATIVOS com o Postgres
├── tema.js                        # Alternância entre tema claro/escuro
├── dados.js                       # Bibliotecas de checklists e motivos de retiro
├── dadosMateriaisSegmentoGrupo.js  # Listas de materiais por tipo de segmento
│
├── folhaoPersistencia.js          # Módulo genérico de "salvar progresso" (rascunho) do folhão,
│                                   # usado por todos os folhões abaixo
├── folhaoMolde4.js                # Folhão — Molde (MCC 4)
├── folhaoMolde23.js               # Folhão — Molde (MCC 2/3)
├── folhao_bender.js               # Folhão — Bender
├── folhaoBow.js                   # Folhão — Bow
├── folhaoHorizontal.js            # Folhão — Segmento Horizontal
├── folhaoStraightenerR1.js        # Folhão — Straightener R1/R2
├── folhaoR2.js                    # Folhão — R2 (variação)
├── folhaoDesempenadeira.js        # Folhão — Desempenadeira
├── folhaoSegmentoZero.js          # Folhão — Segmento Zero
├── folhaoSegmentoGrupo.js         # Folhão — Segmento Grupo 1/2/3
│
├── main.py                        # API (FastAPI) — todos os endpoints REST
├── requirements.txt                # Dependências Python
├── Procfile                        # Comando de start pro Render
│
├── importar_excel.py               # Carga inicial dos equipamentos a partir da planilha mestre
├── importar_colaboradores.py       # Carga/atualização da lista de colaboradores autorizados
├── importar_materiais.py           # Carga do estoque de materiais (Almoxarifado)
├── restringir_acesso.py            # Desativa todos os colaboradores, exceto os informados
├── reativartodos.py                # Reativa todos os colaboradores e normaliza o cargo
└── resetar_colaboradores.py        # ⚠️ Apaga e recadastra a lista de colaboradores do zero
```

## 💻 Como Rodar o Projeto

O sistema tem duas partes que precisam estar de pé: o **back-end** (API) e o **front-end** (arquivos estáticos). O front-end não funciona sozinho — ele depende da API pra carregar e salvar qualquer dado.

### 1. Back-end (API)

```bash
# Instale as dependências
pip install -r requirements.txt

# Configure a connection string do Postgres (Neon)
export DATABASE_URL="postgresql://usuario:senha@host/banco"   # Windows: set DATABASE_URL=...

# Suba a API localmente
uvicorn main:app --reload
```

Na primeira execução, `main.py` cria automaticamente as tabelas que ainda não existirem. Para popular os dados iniciais (equipamentos, colaboradores, materiais), rode os scripts `importar_*.py` correspondentes, com a planilha de origem na mesma pasta.

### 2. Front-end

Os arquivos HTML/JS/CSS são estáticos — sirva a pasta com qualquer servidor HTTP simples (não abra o `app.html` direto como `file://`, pois módulos ES6 e o Service Worker exigem um servidor):

```bash
python -m http.server 8000
```

Depois, acesse `http://localhost:8000/index.html`. Em produção, o back-end fica no Render e o front-end pode ser hospedado como site estático separado (ex: Render Static Site) apontando `resolverApiBase()` (em `banco.js`) para a URL pública da API.

## 🔐 Acesso

- **Login por matrícula**: senha temporária é a própria matrícula no primeiro acesso; o sistema pede a criação de uma senha definitiva.
- **Modo Visitante**: acesso somente leitura, sem matrícula — pede só um nome de identificação, que fica registrado na Auditoria.
- **Auditoria Global** e **Teste de Folhões**: restritos a matrículas específicas, configuradas em `script.js`.

## 🖨️ Laudos em PDF

Cada folhão gera um laudo em PDF com o layout oficial de engenharia (cabeçalho, tabelas de medição, assinaturas), renderizado inteiramente no navegador — não depende de nenhum serviço externo de conversão.

## 📝 Licença

Sistema de uso interno da equipe de manutenção da Oficina de Moldes e Segmentos — CSN.

---

_Desenvolvido para digitalizar o controle de manutenção, reduzir erro manual e dar rastreabilidade completa a cada peça, do cadastro até o descarte._
