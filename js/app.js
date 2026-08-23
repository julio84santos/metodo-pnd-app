/* =========================================================
   MÉTODO PND
   APP.JS

   Controle de interface, rotas, progresso e recursos.

   IMPORTANTE:
   - auth.js valida sessão e plano antes de chamar startApp()
   - este arquivo também revalida recursos premium no frontend
   - segurança definitiva de IA/PDFs precisa existir no backend
========================================================= */


/* =========================================================
   ESTADO PERSISTENTE
   Um armazenamento separado para cada usuário
========================================================= */

const STORE_KEY_BASE = 'pnd_v2';

let STORE_KEY = null;

let CURRENT_USER_ID = null;


function createDefaultState() {

  return {

    eixoStats: {},

    areaStats: {},

    discursivaScores: {},

    plannerDone: {},

    retaFinalDone: {},

    provaChecklistDone: {},

    reescritaNotas: {},

    counters: {

      questoesRespondidas: 0,

      discursivasEscritas: 0

    }

  };

}


let STATE = createDefaultState();



function loadState() {

  const defaults =
    createDefaultState();


  if (!STORE_KEY) {

    return defaults;

  }


  try {

    const raw =
      localStorage.getItem(
        STORE_KEY
      );


    if (!raw) {

      return defaults;

    }


    const saved =
      JSON.parse(raw);


    return {

      ...defaults,

      ...saved,

      counters: {

        ...defaults.counters,

        ...(saved.counters || {})

      }

    };


  } catch (error) {

    console.warn(
      'Não foi possível carregar o progresso.',
      error
    );


    return defaults;

  }

}



function saveState() {

  if (!STORE_KEY) {

    return;

  }


  try {

    localStorage.setItem(
      STORE_KEY,
      JSON.stringify(STATE)
    );


  } catch (error) {

    console.warn(
      'Não foi possível salvar o progresso.',
      error
    );

  }

}



async function initUserState() {

  if (
    !window.SB ||
    !window.SB.auth
  ) {

    throw new Error(
      'Supabase não disponível.'
    );

  }


  const {
    data: { session },
    error
  } =
    await window.SB.auth.getSession();


  if (
    error ||
    !session?.user
  ) {

    throw new Error(
      'Sessão inválida.'
    );

  }


  CURRENT_USER_ID =
    session.user.id;


  STORE_KEY =
    `${STORE_KEY_BASE}_${CURRENT_USER_ID}`;


  STATE =
    loadState();

}



/* =========================================================
   HELPERS DE ESTATÍSTICAS
========================================================= */

function bump(
  map,
  key,
  correct
) {

  if (!key) {

    return;

  }


  if (!map[key]) {

    map[key] = {

      acertos: 0,

      total: 0

    };

  }


  map[key].total += 1;


  if (correct) {

    map[key].acertos += 1;

  }

}



/* =========================================================
   CONTROLE DE PLANO
========================================================= */

function isAdmin() {

  return (
    window.IS_ADMIN === true ||
    window.USER_ROLE === 'admin'
  );

}



function isCompleto() {

  return (
    isAdmin() ||
    window.USER_PLANO === 'completo'
  );

}



function isEssencial() {

  return (
    !isAdmin() &&
    window.USER_PLANO === 'essencial'
  );

}



/* =========================================================
   ROTAS PREMIUM
========================================================= */

const COMPLETE_ONLY_VIEWS = [

  'materiais',

  'planner-10dias',

  'discursiva-ia'

];



function canAccessView(
  view,
  params = {}
) {

  if (isCompleto()) {

    return true;

  }


  if (
    COMPLETE_ONLY_VIEWS.includes(
      view
    )
  ) {

    return false;

  }


  /*
    Proteção adicional para quizzes específicos.
  */

  if (
    view === 'questoes-quiz' &&
    params.modo === 'especifica'
  ) {

    return false;

  }


  return true;

}



/* =========================================================
   ROUTER
========================================================= */

const app =
  document.getElementById('app');


const main =
  document.getElementById('main');


let ROUTE = {

  view: 'home',

  params: {}

};



function go(
  view,
  params = {}
) {

  /*
    Proteção central contra navegação
    direta para telas premium.
  */

  if (
    !canAccessView(
      view,
      params
    )
  ) {

    showPremiumBlocked(
      view
    );

    return;

  }


  ROUTE = {

    view,

    params

  };


  window.scrollTo(
    0,
    0
  );


  render();

  updateTabbar();

}



function showPremiumBlocked(
  requestedView
) {

  ROUTE = {

    view: 'home',

    params: {}

  };


  render();

  updateTabbar();


  setTimeout(
    () => {

      alert(
        'Este recurso faz parte do plano Completo.'
      );

    },
    10
  );

}



/* =========================================================
   TABBAR
========================================================= */

function updateTabbar() {

  document
    .querySelectorAll(
      'nav.tabbar button'
    )
    .forEach(

      button => {

        const active =
          button.dataset.tab ===
          ROUTE.view.split('-')[0];


        button.classList.toggle(
          'active',
          active
        );


        button.setAttribute(
          'aria-selected',
          active
            ? 'true'
            : 'false'
        );

      }

    );

}



/* =========================================================
   HELPERS
========================================================= */

function daysUntil(
  dateStr
) {

  if (!dateStr) {

    return 0;

  }


  const parts =
    String(dateStr)
      .split('-')
      .map(Number);


  if (
    parts.length !== 3 ||
    parts.some(Number.isNaN)
  ) {

    return 0;

  }


  /*
    Criamos a data no horário local para
    evitar diferença de um dia por UTC.
  */

  const target =
    new Date(
      parts[0],
      parts[1] - 1,
      parts[2]
    );


  const now =
    new Date();


  const today =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );


  return Math.ceil(
    (
      target.getTime() -
      today.getTime()
    ) /
    86400000
  );

}



function pct(obj) {

  if (
    !obj ||
    !obj.total
  ) {

    return 0;

  }


  return Math.round(
    (
      obj.acertos /
      obj.total
    ) *
    100
  );

}



function barClass(p) {

  if (p >= 80) {

    return '';

  }


  if (p >= 50) {

    return 'mid';

  }


  return 'low';

}



const EIXO_ICONS = {

  'LDB':
    '⚖️',

  'PNE e SNE':
    '🗺️',

  'ECA':
    '🧒',

  'BNCC e currículo':
    '📚',

  'Avaliação':
    '📝',

  'Inclusão':
    '🤝',

  'Didática':
    '🧑‍🏫',

  'Gestão e financiamento':
    '💰',

  'Diversidade e direitos humanos':
    '🌈'

};



function progressRing(
  p,
  cls
) {

  const size = 44;

  const stroke = 5;

  const r =
    (
      size -
      stroke
    ) /
    2;


  const c =
    2 *
    Math.PI *
    r;


  const dash =
    (
      p /
      100
    ) *
    c;


  return `

    <svg
      class="ring ${cls}"
      width="${size}"
      height="${size}"
      viewBox="0 0 ${size} ${size}"
    >

      <circle
        cx="${size / 2}"
        cy="${size / 2}"
        r="${r}"
        fill="none"
        stroke="var(--line)"
        stroke-width="${stroke}"
      />

      <circle
        cx="${size / 2}"
        cy="${size / 2}"
        r="${r}"
        fill="none"
        stroke="currentColor"
        stroke-width="${stroke}"
        stroke-linecap="round"
        stroke-dasharray="${dash} ${c}"
        transform="rotate(-90 ${size / 2} ${size / 2})"
      />

      <text
        x="50%"
        y="51%"
        text-anchor="middle"
        dominant-baseline="middle"
        font-size="11"
      >
        ${p}%
      </text>

    </svg>

  `;

}



function esc(value) {

  const div =
    document.createElement(
      'div'
    );


  div.textContent =
    value === null ||
    value === undefined
      ? ''
      : String(value);


  return div.innerHTML;

}



function shuffle(arr) {

  const copy =
    Array.isArray(arr)
      ? [...arr]
      : [];


  for (
    let i =
      copy.length - 1;

    i > 0;

    i--
  ) {

    const j =
      Math.floor(
        Math.random() *
        (
          i + 1
        )
      );


    [
      copy[i],
      copy[j]
    ] =
      [
        copy[j],
        copy[i]
      ];

  }


  return copy;

}



/* =========================================================
   RENDER ROOT
========================================================= */

function render() {

  if (!main) {

    return;

  }


  const views = {

    home:
      renderHome,

    mapas:
      renderMapasList,

    'mapas-detail':
      renderMapaDetail,

    'mapas-flash':
      renderFlashcards,

    questoes:
      renderQuestoesHome,

    'questoes-quiz':
      renderQuiz,

    discursiva:
      renderDiscursivaList,

    'discursiva-detail':
      renderDiscursivaDetail,

    'discursiva-write':
      renderDiscursivaWrite,

    'discursiva-check':
      renderDiscursivaCheck,

    'discursiva-ia':
      renderDiscursivaIA,

    planner:
      renderPlanner,

    'planner-10dias':
      renderRetaFinal10,

    materiais:
      renderMateriais,

    'instalar-ios':
      renderInstalarIOS

  };


  const fn =
    views[ROUTE.view] ||
    renderHome;


  main.innerHTML = `

    <div class="view">
      ${fn(ROUTE.params)}
    </div>

  `;


  attachHandlers();

}



/* =========================================================
   INSTALAÇÃO PWA
========================================================= */

function installCardHTML() {

  const pwa =
    window.PWA_INSTALL || {};


  if (pwa.isStandalone) {

    return '';

  }


  if (
    !pwa.deferredPrompt &&
    !pwa.isIOS
  ) {

    return '';

  }


  return `

    <div
      class="card"
      style="
        background:var(--ink);
        border:none;
      "
    >

      <div class="card-row">

        <div>

          <h3 style="color:#fff">
            📲 Instale o app no seu celular
          </h3>

          <p
            class="mute"
            style="color:var(--rust-soft)"
          >
            Acesso rápido direto da tela inicial,
            sem precisar abrir o navegador toda vez.
          </p>

        </div>

      </div>

      <button
        type="button"
        class="btn btn-block"
        style="
          margin-top:10px;
          background:var(--gold);
          color:var(--ink);
        "
        data-action="instalar-app"
      >
        Instalar agora
      </button>

    </div>

  `;

}



async function instalarApp() {

  const pwa =
    window.PWA_INSTALL || {};


  if (pwa.deferredPrompt) {

    pwa.deferredPrompt.prompt();


    await pwa
      .deferredPrompt
      .userChoice;


    pwa.deferredPrompt =
      null;


    render();


  } else if (pwa.isIOS) {

    go(
      'instalar-ios'
    );


  } else {

    alert(
      'Abra o menu do navegador e procure "Instalar app" ou "Adicionar à tela inicial".'
    );

  }

}



function renderInstalarIOS() {

  return `

    <div
      class="back-link"
      data-go="home"
    >
      &larr; Início
    </div>

    <span class="eyebrow">
      Instalar no iPhone
    </span>

    <h1>
      Adicionar à Tela de Início
    </h1>


    <div class="card">

      <div class="checklist-item">

        <div>
          <b>1.</b>
          Toque no ícone de compartilhar
          (o quadrado com a seta pra cima)
          na barra do Safari.
        </div>

      </div>


      <div class="checklist-item">

        <div>
          <b>2.</b>
          Role para baixo e toque em
          <b>"Adicionar à Tela de Início"</b>.
        </div>

      </div>


      <div class="checklist-item">

        <div>
          <b>3.</b>
          Toque em
          <b>"Adicionar"</b>
          no canto superior direito.
        </div>

      </div>

    </div>


    <p class="mute">
      O ícone do Método PND aparecerá
      na tela inicial e poderá funcionar
      como aplicativo instalado.
    </p>

  `;

}



/* =========================================================
   HOME
========================================================= */

function renderHome() {

  const dias =
    daysUntil(
      DATA.planner.data_prova
    );


  const totalQ =
    STATE.counters
      .questoesRespondidas;


  const totalD =
    STATE.counters
      .discursivasEscritas;


  const eixoRows =
    DATA.eixos.map(

      (
        eixo,
        idx
      ) => {

        const stat =
          STATE.eixoStats[eixo];


        const p =
          pct(stat);


        const mapa =
          DATA.mapas[idx];


        return `

          <div class="eixo-row">

            <div class="eixo-top">

              <b>

                <span class="eixo-icon">
                  ${EIXO_ICONS[eixo] || '📌'}
                </span>

                ${esc(eixo)}

              </b>

              ${progressRing(
                p,
                barClass(p)
              )}

            </div>


            <span class="eixo-pct">

              ${
                stat &&
                stat.total

                  ? `${stat.acertos}/${stat.total} respondidas`

                  : 'ainda sem respostas'
              }

            </span>


            <div
              style="
                display:flex;
                gap:8px;
                margin-top:8px;
              "
            >

              <button
                type="button"
                class="btn btn-ghost btn-sm"
                data-go="mapas-detail"
                data-id="${mapa ? mapa.id : ''}"
              >
                📘 Resumo teórico
              </button>


              <button
                type="button"
                class="btn btn-ghost btn-sm"
                data-action="praticar-eixo"
                data-eixo="${esc(eixo)}"
              >
                🎯 Praticar
              </button>

            </div>

          </div>

        `;

      }

    ).join('');


  return `

    <span class="eyebrow">
      Painel de desempenho
    </span>

    <h1>
      Sua reta final
    </h1>

    <p class="mute">
      Meta: 80% de acerto por eixo.
      Estude primeiro os eixos abaixo da meta.
    </p>


    ${installCardHTML()}


    <div class="stat-grid">

      <div class="stat">

        <b>
          ${dias >= 0 ? dias : 0}
        </b>

        <span>
          dias até a prova
        </span>

      </div>


      <div class="stat">

        <b>
          ${totalQ}
        </b>

        <span>
          questões feitas
        </span>

      </div>


      <div class="stat">

        <b>
          ${totalD}
        </b>

        <span>
          discursivas escritas
        </span>

      </div>

    </div>


    <div class="card">

      <h2>
        Eixos · Formação Geral
      </h2>

      ${eixoRows}

    </div>


    <div
      class="card tap"
      data-go="planner"
    >

      <div class="card-row">

        <div>

          <h3>
            Planner de hoje
          </h3>

          <p class="mute">
            Veja a tarefa do dia,
            semana por semana.
          </p>

        </div>

        <span class="badge alt">
          Abrir
        </span>

      </div>

    </div>


    <div
      class="card tap"
      data-go="questoes"
    >

      <div class="card-row">

        <div>

          <h3>
            Praticar questões
          </h3>

          <p class="mute">
            ${DATA.questoes.length}
            questões comentadas,
            corrigidas na hora.
          </p>

        </div>

        <span class="badge alt">
          Abrir
        </span>

      </div>

    </div>


    <div
      class="card tap"
      data-go="materiais"
    >

      <div class="card-row">

        <div>

          <h3>
            Materiais em PDF
          </h3>

          <p class="mute">
            ${
              isCompleto()

                ? 'Os guias originais para abrir ou baixar.'

                : 'Conteúdo disponível no plano Completo.'
            }
          </p>

        </div>

        <span class="badge alt">

          ${
            isCompleto()
              ? 'Abrir'
              : '🔒'
          }

        </span>

      </div>

    </div>

  `;

}



/* =========================================================
   UPSELL
========================================================= */

function upsellCardHTML(
  titulo,
  descricao
) {

  return `

    <div
      class="card"
      style="border-color:var(--gold);"
    >

      <span class="badge alt">
        🔒 Plano Completo
      </span>


      <h3 style="margin-top:10px;">
        ${esc(titulo)}
      </h3>


      <p class="mute">
        ${esc(descricao)}
      </p>


      <a
        class="btn btn-primary btn-block"
        style="margin-top:10px;"
        href="https://metodo-pnd-app-landing.vercel.app/#oferta"
        target="_blank"
        rel="noopener noreferrer"
      >
        Fazer upgrade para o Completo
      </a>

    </div>

  `;

}



/* =========================================================
   MATERIAIS
========================================================= */

function renderMateriais() {

  if (!isCompleto()) {

    return `

      <div
        class="back-link"
        data-go="home"
      >
        &larr; Início
      </div>


      <span class="eyebrow">
        Guias originais
      </span>


      <h1>
        Materiais em PDF
      </h1>


      ${upsellCardHTML(

        '7 materiais originais em PDF',

        'Os guias completos do Método PND para baixar e estudar offline fazem parte do plano Completo.'

      )}

    `;

  }


  const materiais =
    Array.isArray(DATA.materiais)
      ? DATA.materiais
      : [];


  const cards =
    materiais.map(

      material => `

        <a
          class="card tap"
          href="${esc(material.arquivo)}"
          target="_blank"
          rel="noopener noreferrer"
          style="
            display:block;
            text-decoration:none;
          "
        >

          <div class="card-row">

            <div>

              <h3>
                ${esc(material.titulo)}
              </h3>

              <p class="mute">
                ${esc(material.descricao)}
              </p>

            </div>


            <span class="badge alt">
              ${esc(material.tamanho)}
            </span>

          </div>

        </a>

      `

    ).join('');


  return `

    <div
      class="back-link"
      data-go="home"
    >
      &larr; Início
    </div>


    <span class="eyebrow">
      Guias originais
    </span>


    <h1>
      Materiais em PDF
    </h1>


    <p class="mute">
      Os documentos completos do Método PND,
      para ler offline ou imprimir.
    </p>


    ${
      cards ||
      '<div class="empty"><p>Nenhum material disponível.</p></div>'
    }

  `;

}



/* =========================================================
   RESUMOS
========================================================= */

function renderMapasList() {

  const cards =
    DATA.mapas.map(

      mapa => `

        <div
          class="card tap"
          data-go="mapas-detail"
          data-id="${mapa.id}"
        >

          <span class="eyebrow">
            Resumo
            ${String(mapa.id).padStart(2, '0')}
          </span>

          <h3>
            ${esc(mapa.titulo)}
          </h3>

          <p class="mute">
            ${esc(mapa.subtitulo)}
          </p>

        </div>

      `

    ).join('');


  return `

    <span class="eyebrow">
      Resumos teóricos
    </span>


    <h1>
      9 resumos · Formação Geral
    </h1>


    <div
      class="card tap"
      data-go="mapas-flash"
      style="
        background:var(--ink);
        border:none;
      "
    >

      <div class="card-row">

        <div>

          <h3 style="color:#fff">
            Modo flashcard
          </h3>

          <p
            class="mute"
            style="color:var(--rust-soft)"
          >
            27 pegadinhas da banca,
            uma por vez.
          </p>

        </div>


        <span class="badge">
          Treinar
        </span>

      </div>

    </div>


    ${cards}

  `;

}



function renderMapaDetail(
  params
) {

  const mapa =
    DATA.mapas.find(
      item =>
        item.id == params.id
    );


  if (!mapa) {

    return `
      <div class="empty">
        <p>Resumo não encontrado.</p>
      </div>
    `;

  }


  const ramos =
    mapa.ramos.map(

      ramo => `

        <div class="ramo">

          <h3>
            ${esc(ramo.nome)}
          </h3>

          <ul>

            ${
              ramo.itens.map(
                item =>
                  `<li>${esc(item)}</li>`
              ).join('')
            }

          </ul>

        </div>

      `

    ).join('');


  const pegs =
    mapa.pegadinhas.map(

      (
        pegadinha,
        index
      ) => `

        <div class="pegadinha">

          <span class="num">
            Pegadinha ${index + 1}
          </span>

          <h3 style="margin-bottom:4px;">
            ${esc(pegadinha.titulo)}
          </h3>

          <p style="margin:0">
            ${esc(pegadinha.texto)}
          </p>

        </div>

      `

    ).join('');


  return `

    <div
      class="back-link"
      data-go="mapas"
    >
      &larr; Resumos
    </div>


    <span class="eyebrow">
      Resumo
      ${String(mapa.id).padStart(2, '0')}
    </span>


    <h1>
      ${esc(mapa.titulo)}
    </h1>


    <p class="mute">
      ${esc(mapa.subtitulo)}
    </p>


    <hr class="divider">


    ${ramos}


    <hr class="divider">


    <h2>
      Pegadinhas da banca
    </h2>


    ${pegs}

  `;

}



/* =========================================================
   FLASHCARDS
========================================================= */

function allPegadinhas() {

  const list = [];


  DATA.mapas.forEach(

    mapa => {

      mapa.pegadinhas.forEach(

        pegadinha => {

          list.push({

            ...pegadinha,

            mapa:
              mapa.titulo

          });

        }

      );

    }

  );


  return list;

}



function renderFlashcards() {

  if (!STATE._flashDeck) {

    STATE._flashDeck =
      shuffle(
        allPegadinhas()
      );

  }


  if (
    STATE._flashIdx ===
    undefined
  ) {

    STATE._flashIdx = 0;

  }


  const deck =
    STATE._flashDeck;


  const idx =
    STATE._flashIdx;


  if (
    idx >=
    deck.length
  ) {

    return `

      <div
        class="back-link"
        data-go="mapas"
      >
        &larr; Resumos
      </div>


      <div class="empty">

        <h2>
          Deck concluído
        </h2>

        <p>
          Você revisou
          ${deck.length}
          pegadinhas.
        </p>

        <button
          type="button"
          class="btn btn-primary"
          data-action="flash-restart"
        >
          Embaralhar de novo
        </button>

      </div>

    `;

  }


  const card =
    deck[idx];


  return `

    <div
      class="back-link"
      data-go="mapas"
    >
      &larr; Resumos
    </div>


    <span class="eyebrow">
      Flashcard
      ${idx + 1}
      /
      ${deck.length}
      ·
      ${esc(card.mapa)}
    </span>


    <div class="flashcard-wrap">

      <div
        class="flashcard"
        id="fc"
      >

        <div class="face front">

          <span class="label">
            Pegadinha
          </span>

          <p>
            ${esc(card.titulo)}
          </p>

        </div>


        <div class="face back">

          <span class="label">
            Explicação
          </span>

          <p>
            ${esc(card.texto)}
          </p>

        </div>

      </div>

    </div>


    <p
      class="mute"
      style="text-align:center;"
    >
      Toque no cartão para virar
    </p>


    <div class="flash-controls">

      <button
        type="button"
        class="btn btn-ghost btn-block"
        data-action="flash-next"
      >
        Próxima →
      </button>

    </div>

  `;

}



/* =========================================================
   QUESTÕES
========================================================= */

function renderQuestoesHome(
  params = {}
) {

  const modo =
    params.modo ||
    'geral';


  const areas =
    DATA.areasEspecificas || [];


  const chipsModo = `

    <div style="margin-bottom:10px;">

      <span
        class="filter-chip ${modo === 'geral' ? 'active' : ''}"
        data-action="qmodo"
        data-modo="geral"
      >
        Formação Geral
      </span>


      <span
        class="filter-chip ${modo === 'especifica' ? 'active' : ''}"
        data-action="qmodo"
        data-modo="especifica"
      >
        ${
          isCompleto()
            ? 'Componente Específico'
            : '🔒 Componente Específico'
        }
      </span>

    </div>

  `;


  if (
    modo === 'especifica' &&
    !isCompleto()
  ) {

    return `

      <span class="eyebrow">
        Banco de questões
      </span>


      <h1>
        ${DATA.questoes.length}
        questões comentadas
      </h1>


      ${chipsModo}


      ${upsellCardHTML(

        '630+ questões do Componente Específico',

        'As 21 áreas específicas fazem parte do plano Completo.'

      )}

    `;

  }


  let filtroArea = '';

  const qtdOptions =
    [
      10,
      20,
      30
    ];


  let poolSize = 0;


  if (
    modo === 'geral'
  ) {

    poolSize =
      DATA.questoes.filter(
        q =>
          q.fonte !== 'vol'
      ).length;


  } else {

    filtroArea = `

      <div class="card">

        <h3>
          Escolha sua área
        </h3>

        <div>

          ${
            areas.map(

              area => `

                <span
                  class="filter-chip ${params.area === area ? 'active' : ''}"
                  data-action="qarea"
                  data-area="${esc(area)}"
                >
                  ${esc(area)}
                </span>

              `

            ).join('')
          }

        </div>

      </div>

    `;


    poolSize =
      params.area

        ? DATA.questoes.filter(

            q =>
              q.fonte === 'vol' &&
              q.area === params.area

          ).length

        : 0;

  }


  const disabled =
    (
      modo === 'especifica' &&
      !params.area
    );


  return `

    <span class="eyebrow">
      Banco de questões
    </span>


    <h1>
      ${DATA.questoes.length}
      questões comentadas
    </h1>


    ${chipsModo}

    ${filtroArea}


    <div class="card">

      <h3>
        Quantidade
      </h3>


      <p class="mute">
        ${poolSize}
        questões disponíveis neste filtro.
      </p>


      <div
        style="
          display:flex;
          gap:8px;
          margin-top:8px;
          flex-wrap:wrap;
        "
      >

        ${
          qtdOptions
            .filter(
              number =>
                number <= poolSize
            )
            .map(

              number => `

                <button
                  type="button"
                  class="btn btn-ghost btn-sm"
                  data-action="quiz-start"
                  data-n="${number}"
                  data-modo="${modo}"
                  data-area="${esc(params.area || '')}"
                  ${disabled ? 'disabled' : ''}
                >
                  ${number}
                </button>

              `

            )
            .join('')
        }


        <button
          type="button"
          class="btn btn-ghost btn-sm"
          data-action="quiz-start"
          data-n="0"
          data-modo="${modo}"
          data-area="${esc(params.area || '')}"
          ${disabled || poolSize === 0 ? 'disabled' : ''}
        >
          Tudo
        </button>

      </div>


      <button
        type="button"
        class="btn btn-primary btn-block"
        style="margin-top:12px;"
        data-action="quiz-start"
        data-n="10"
        data-modo="${modo}"
        data-area="${esc(params.area || '')}"
        ${
          disabled ||
          poolSize === 0
            ? 'disabled'
            : ''
        }
      >

        Começar
        ${
          poolSize >= 10
            ? '(10 questões)'
            : ''
        }

      </button>

    </div>

  `;

}



/* =========================================================
   QUIZ
========================================================= */

function startQuiz(
  modo,
  area,
  n,
  eixo
) {

  /*
    SEGUNDA CAMADA DE PROTEÇÃO.

    Mesmo chamando startQuiz() manualmente
    pelo console, usuário Essencial não
    inicia conteúdo específico.
  */

  if (
    modo === 'especifica' &&
    !isCompleto()
  ) {

    alert(
      'O Componente Específico faz parte do plano Completo.'
    );


    go(
      'questoes',
      {
        modo:
          'especifica'
      }
    );


    return;

  }


  let pool;


  if (
    modo === 'especifica'
  ) {

    if (!area) {

      alert(
        'Escolha uma área antes de iniciar.'
      );

      return;

    }


    pool =
      DATA.questoes.filter(

        q =>
          q.fonte === 'vol' &&
          q.area === area

      );


  } else {

    pool =
      DATA.questoes.filter(

        q =>
          q.fonte !== 'vol'

      );


    if (eixo) {

      pool =
        pool.filter(

          q =>
            q.eixo === eixo

        );

    }

  }


  pool =
    shuffle(pool);


  if (
    n &&
    n > 0
  ) {

    pool =
      pool.slice(
        0,
        n
      );

  }


  if (!pool.length) {

    alert(
      'Nenhuma questão disponível neste filtro.'
    );

    return;

  }


  STATE._quiz = {

    modo,

    area,

    eixo,

    pool,

    idx: 0,

    answered: []

  };


  ROUTE = {

    view:
      'questoes-quiz',

    params: {

      modo,

      area

    }

  };


  window.scrollTo(
    0,
    0
  );


  render();

  updateTabbar();

}



function renderQuiz() {

  const q =
    STATE._quiz;


  /*
    Proteção contra manipulação manual
    do estado no navegador.
  */

  if (
    q?.modo === 'especifica' &&
    !isCompleto()
  ) {

    STATE._quiz =
      null;


    return `

      <div class="empty">

        <h2>
          🔒 Plano Completo
        </h2>

        <p>
          O Componente Específico
          está disponível apenas
          no plano Completo.
        </p>

      </div>

    `;

  }


  if (
    !q ||
    !Array.isArray(q.pool)
  ) {

    return `

      <div class="empty">
        <p>Nenhum quiz ativo.</p>
      </div>

    `;

  }


  if (
    q.idx >=
    q.pool.length
  ) {

    return renderQuizSummary(q);

  }


  const item =
    q.pool[q.idx];


  if (!item) {

    return `

      <div class="empty">
        <p>Questão não encontrada.</p>
      </div>

    `;

  }


  const answered =
    q.answered[q.idx];


  const optKeys =
    Object.keys(
      item.options || {}
    );


  const options =
    optKeys.map(

      letter => {

        let cls =
          'option';


        if (
          answered !==
          undefined
        ) {

          if (
            letter ===
            item.correct
          ) {

            cls +=
              ' correct';


          } else if (
            letter ===
            answered
          ) {

            cls +=
              ' wrong';

          }


          cls +=
            ' disabled';

        }


        return `

          <button
            type="button"
            class="${cls}"
            data-action="answer"
            data-letter="${esc(letter)}"
          >

            <b>
              ${esc(letter)})
            </b>

            ${esc(
              item.options[letter]
            )}

          </button>

        `;

      }

    ).join('');


  let explainHtml =
    '';


  if (
    answered !==
    undefined
  ) {

    const exp =
      item.explanations &&
      (
        item.explanations[
          item.correct
        ] ||

        item.explanations.geral ||

        item.explanations[
          answered
        ]
      );


    const correct =
      answered ===
      item.correct;


    explainHtml = `

      <div
        class="explain ${correct ? '' : 'wrong-box'}"
      >

        <b>

          ${
            correct

              ? '✓ Você acertou.'

              : `✗ Resposta correta: ${esc(item.correct)}`
          }

        </b>

        <br>

        ${exp ? esc(exp) : ''}

      </div>


      <button
        type="button"
        class="btn btn-primary btn-block"
        style="margin-top:12px;"
        data-action="quiz-next"
      >

        ${
          q.idx + 1 >=
          q.pool.length

            ? 'Ver resultado'

            : 'Próxima questão →'
        }

      </button>

    `;

  }


  return `

    <div
      class="back-link"
      data-action="quiz-exit"
    >
      &larr; Sair do quiz
    </div>


    <div class="quiz-meta">

      <span>
        ${esc(item.area || item.eixo || 'Formação Geral')}
      </span>

      <span>
        ${q.idx + 1}
        /
        ${q.pool.length}
      </span>

    </div>


    <div
      class="progress-track"
      style="margin-bottom:14px;"
    >

      <div
        class="progress-fill"
        style="
          width:
          ${
            (
              q.idx /
              q.pool.length
            ) *
            100
          }%
        "
      ></div>

    </div>


    <div class="card">

      <p style="font-weight:500;">
        ${esc(item.stem)}
      </p>

    </div>


    ${options}

    ${explainHtml}

  `;

}



function renderQuizSummary(
  q
) {

  if (
    !q ||
    !q.pool ||
    !q.pool.length
  ) {

    return `

      <div class="empty">

        <h2>
          Quiz concluído
        </h2>

        <p>
          Nenhuma questão foi carregada.
        </p>

      </div>

    `;

  }


  const acertos =
    q.answered.filter(

      (
        answer,
        index
      ) =>
        answer ===
        q.pool[index].correct

    ).length;


  const p =
    Math.round(
      (
        acertos /
        q.pool.length
      ) *
      100
    );


  return `

    <div class="empty">

      <span class="eyebrow">
        Resultado
      </span>


      <h1>
        ${acertos}
        /
        ${q.pool.length}
      </h1>


      <p class="mute">
        ${p}%
        de acerto neste bloco.
      </p>


      <div
        style="
          display:flex;
          gap:10px;
          justify-content:center;
          margin-top:16px;
        "
      >

        <button
          type="button"
          class="btn btn-ghost"
          data-action="quiz-exit"
        >
          Voltar
        </button>


        <button
          type="button"
          class="btn btn-primary"
          data-action="quiz-retry"
        >
          Refazer
        </button>

      </div>

    </div>

  `;

}



function submitAnswer(
  letter
) {

  const q =
    STATE._quiz;


  if (
    !q ||
    !q.pool ||
    !q.pool[q.idx]
  ) {

    return;

  }


  if (
    q.modo === 'especifica' &&
    !isCompleto()
  ) {

    STATE._quiz =
      null;


    alert(
      'Este recurso faz parte do plano Completo.'
    );


    go(
      'questoes'
    );


    return;

  }


  if (
    q.answered[q.idx] !==
    undefined
  ) {

    return;

  }


  const item =
    q.pool[q.idx];


  const correct =
    letter ===
    item.correct;


  q.answered[q.idx] =
    letter;


  STATE.counters
    .questoesRespondidas +=
      1;


  if (item.eixo) {

    bump(
      STATE.eixoStats,
      item.eixo,
      correct
    );

  }


  if (
    item.fonte === 'vol' &&
    item.area
  ) {

    bump(
      STATE.areaStats,
      item.area,
      correct
    );

  }


  saveState();

  render();

}



/* =========================================================
   DISCURSIVA
========================================================= */

function renderDiscursivaList() {

  const propostas =
    DATA.discursiva
      ?.propostas || [];


  const cards =
    propostas.map(

      proposta => {

        const score =
          STATE.discursivaScores[
            proposta.id
          ];


        return `

          <div
            class="card tap"
            data-go="discursiva-detail"
            data-id="${proposta.id}"
          >

            <div class="card-row">

              <div>

                <h3>
                  ${esc(proposta.titulo)}
                </h3>

                <p class="mute">
                  ${esc(proposta.objetos)}
                </p>

              </div>


              ${
                score

                  ? `
                    <span class="badge alt">
                      ${score.percentual}%
                    </span>
                  `

                  : ''
              }

            </div>

          </div>

        `;

      }

    ).join('');


  return `

    <span class="eyebrow">
      Kit da discursiva
    </span>


    <h1>
      ${propostas.length}
      propostas comentadas
    </h1>


    <p class="mute">
      Arquitetura de 5 blocos em 30 linhas.
      Escreva antes de ler o modelo.
    </p>


    ${cards}

  `;

}



function renderDiscursivaDetail(
  params
) {

  const proposta =
    DATA.discursiva.propostas.find(

      item =>
        item.id == params.id

    );


  if (!proposta) {

    return `
      <p>Proposta não encontrada.</p>
    `;

  }


  return `

    <div
      class="back-link"
      data-go="discursiva"
    >
      &larr; Discursiva
    </div>


    <span class="eyebrow">
      ${esc(proposta.objetos)}
    </span>


    <h1>
      ${esc(proposta.titulo)}
    </h1>


    <div class="card">

      <h3>
        Textos motivadores
      </h3>

      ${
        proposta.textos_motivadores
          .map(

            texto =>
              `<p class="mute">${esc(texto)}</p>`

          )
          .join(
            '<hr class="divider">'
          )
      }

    </div>


    <div
      class="card"
      style="
        background:var(--ink);
        border:none;
      "
    >

      <h3 style="color:#fff;">
        Comando
      </h3>

      <p style="color:var(--paper);">
        ${esc(proposta.comando)}
      </p>

    </div>


    <button
      type="button"
      class="btn btn-primary btn-block"
      data-go="discursiva-write"
      data-id="${proposta.id}"
    >
      Escrever (30 min)
    </button>

  `;

}



function renderDiscursivaWrite(
  params
) {

  const proposta =
    DATA.discursiva.propostas.find(

      item =>
        item.id == params.id

    );


  if (!proposta) {

    return `
      <p>Proposta não encontrada.</p>
    `;

  }


  return `

    <div
      class="back-link"
      data-go="discursiva-detail"
      data-id="${proposta.id}"
    >
      &larr; Voltar
    </div>


    <span class="eyebrow">
      ${esc(proposta.titulo)}
    </span>


    <div
      class="timer"
      id="timer"
    >
      30:00
    </div>


    <p
      class="mute"
      style="text-align:center;"
    >
      Alvo:
      15 a 30 linhas ·
      380–420 palavras
    </p>


    <textarea
      id="texto-discursiva"
      placeholder="Escreva sua resposta aqui..."
    ></textarea>


    ${
      isCompleto()

        ? `

          <button
            type="button"
            class="btn btn-primary btn-block"
            data-action="corrigir-ia"
            data-id="${proposta.id}"
          >
            ✦ Corrigir com IA
          </button>

        `

        : `

          <a
            class="btn btn-primary btn-block"
            href="https://metodo-pnd-app-landing.vercel.app/#oferta"
            target="_blank"
            rel="noopener noreferrer"
          >
            🔒 Corrigir com IA · Plano Completo
          </a>

        `
    }


    <div
      style="
        display:flex;
        gap:10px;
        margin-top:10px;
      "
    >

      <button
        type="button"
        class="btn btn-ghost btn-block"
        data-action="ver-modelo"
        data-id="${proposta.id}"
      >
        Ver modelo
      </button>


      <button
        type="button"
        class="btn btn-ghost btn-block"
        data-go="discursiva-check"
        data-id="${proposta.id}"
      >
        Autocorrigir manualmente
      </button>

    </div>


    <div id="modelo-box"></div>

  `;

}



/* =========================================================
   CORREÇÃO POR IA
========================================================= */

async function corrigirComIA(
  id,
  btn
) {

  /*
    Proteção frontend.

    A API também DEVE validar plano
    no servidor.
  */

  if (!isCompleto()) {

    alert(
      'A correção por IA faz parte do plano Completo.'
    );

    return;

  }


  const proposta =
    DATA.discursiva.propostas.find(

      item =>
        item.id == id

    );


  if (!proposta) {

    alert(
      'Proposta não encontrada.'
    );

    return;

  }


  const textarea =
    document.getElementById(
      'texto-discursiva'
    );


  const texto =
    textarea
      ? textarea.value.trim()
      : '';


  if (
    texto.length <
    50
  ) {

    alert(
      'Escreva pelo menos algumas linhas antes de pedir a correção por IA.'
    );

    return;

  }


  const originalLabel =
    btn
      ? btn.textContent
      : '';


  if (btn) {

    btn.disabled =
      true;


    btn.textContent =
      'Corrigindo com IA…';

  }


  try {

    const {
      data: { session },
      error:
        sessionError
    } =
      await window.SB.auth
        .getSession();


    if (
      sessionError ||
      !session?.access_token
    ) {

      throw new Error(
        'Sua sessão expirou. Entre novamente.'
      );

    }


    const response =
      await fetch(

        '/api/corrigir-discursiva',

        {

          method:
            'POST',

          headers: {

            'Content-Type':
              'application/json',

            Authorization:
              `Bearer ${session.access_token}`

          },

          body:
            JSON.stringify({

              texto,

              comando:
                proposta.comando,

              titulo:
                proposta.titulo

            })

        }

      );


    let data;


    try {

      data =
        await response.json();


    } catch (_) {

      throw new Error(
        'Resposta inválida do servidor.'
      );

    }


    if (!response.ok) {

      /*
        Backend pode retornar 401/403
        caso plano ou sessão não sejam válidos.
      */

      throw new Error(

        data?.error ||
        'Falha na correção.'

      );

    }


    STATE._iaResult = {

      id,

      data

    };


    ROUTE = {

      view:
        'discursiva-ia',

      params: {

        id

      }

    };


    render();

    updateTabbar();


  } catch (error) {

    alert(

      'Não foi possível corrigir com IA agora: ' +
      error.message

    );


    if (btn) {

      btn.disabled =
        false;


      btn.textContent =
        originalLabel;

    }

  }

}



function renderDiscursivaIA(
  params
) {

  if (!isCompleto()) {

    return `

      <div
        class="back-link"
        data-go="discursiva"
      >
        &larr; Discursiva
      </div>


      ${upsellCardHTML(

        'Correção da discursiva por IA',

        'A correção automatizada faz parte do plano Completo.'

      )}

    `;

  }


  const proposta =
    DATA.discursiva.propostas.find(

      item =>
        item.id == params.id

    );


  const result =
    STATE._iaResult;


  if (!proposta) {

    return `
      <p>Proposta não encontrada.</p>
    `;

  }


  if (
    !result ||
    result.id !=
    params.id
  ) {

    return `

      <div
        class="back-link"
        data-go="discursiva-write"
        data-id="${proposta.id}"
      >
        &larr; Voltar
      </div>


      <div class="empty">

        <p>
          Nenhuma correção por IA
          disponível ainda.
        </p>

      </div>

    `;

  }


  const criterios =
    DATA.discursiva
      .checklist_criterios;


  const corTexto = {

    sim:
      'var(--ok)',

    parcial:
      'var(--gold)',

    nao:
      'var(--bad)'

  };


  const rotulo = {

    sim:
      'Sim',

    parcial:
      'Parcial',

    nao:
      'Não'

  };


  const items =
    criterios.map(

      criterio => {

        const value =
          (
            result.data.criterios &&
            result.data.criterios[
              criterio.id
            ]
          ) ||
          'nao';


        return `

          <div class="checklist-item">

            <div style="flex:1;">

              <b style="font-size:.88rem;">
                ${esc(criterio.nome)}
              </b>

              <p
                class="mute"
                style="margin:2px 0 0;"
              >
                ${esc(criterio.pergunta)}
              </p>

            </div>


            <span
              class="badge"
              style="
                background:${corTexto[value] || 'var(--bad)'};
                color:#fff;
              "
            >
              ${rotulo[value] || 'Não'}
            </span>

          </div>

        `;

      }

    ).join('');


  const pontos =
    (
      result.data
        .pontos_fortes ||
      []
    )
      .map(
        item =>
          `<li>${esc(item)}</li>`
      )
      .join('');


  return `

    <div
      class="back-link"
      data-go="discursiva-write"
      data-id="${proposta.id}"
    >
      &larr; Voltar ao texto
    </div>


    <span class="eyebrow">
      Correção por IA
    </span>


    <h1>
      ${esc(proposta.titulo)}
    </h1>


    <div class="card">
      ${items}
    </div>


    <div class="card">

      <h3>
        Pontos fortes
      </h3>

      <ul>
        ${pontos}
      </ul>


      <h3>
        Principal fragilidade
      </h3>

      <p>
        ${esc(
          result.data
            .principal_fragilidade ||
          ''
        )}
      </p>


      <h3>
        Sugestão de reescrita
      </h3>

      <p>
        ${esc(
          result.data
            .sugestao_reescrita ||
          ''
        )}
      </p>


      <h3>
        Comentário geral
      </h3>

      <p>
        ${esc(
          result.data
            .comentario_geral ||
          ''
        )}
      </p>

    </div>


    <button
      type="button"
      class="btn btn-primary btn-block"
      data-go="discursiva-check"
      data-id="${proposta.id}"
    >
      Continuar para autocorreção manual →
    </button>

  `;

}



/* =========================================================
   AUTOCORREÇÃO
========================================================= */

function renderDiscursivaCheck(
  params
) {

  const proposta =
    DATA.discursiva.propostas.find(

      item =>
        item.id == params.id

    );


  if (!proposta) {

    return `
      <p>Proposta não encontrada.</p>
    `;

  }


  const criterios =
    DATA.discursiva
      .checklist_criterios;


  const items =
    criterios.map(

      criterio => `

        <div class="checklist-item">

          <div style="flex:1;">

            <b style="font-size:.88rem;">
              ${esc(criterio.nome)}
            </b>

            <p
              class="mute"
              style="margin:2px 0 0;"
            >
              ${esc(criterio.pergunta)}
            </p>

          </div>


          <div
            class="seg"
            data-crit="${criterio.id}"
          >

            <button
              type="button"
              data-val="sim"
            >
              Sim
            </button>

            <button
              type="button"
              data-val="parcial"
            >
              Parc.
            </button>

            <button
              type="button"
              data-val="nao"
            >
              Não
            </button>

          </div>

        </div>

      `

    ).join('');


  const notasSalvas =
    STATE.reescritaNotas[
      proposta.id
    ] || {};


  const planoFields =
    (
      DATA.discursiva
        .plano_reescrita ||
      []
    ).map(

      field => `

        <div style="margin-bottom:12px;">

          <label
            class="mute"
            style="
              display:block;
              margin-bottom:4px;
              font-weight:600;
            "
          >
            ${esc(field.label)}:
          </label>


          <textarea
            data-plano="${field.id}"
            style="min-height:70px;"
          >${esc(notasSalvas[field.id] || '')}</textarea>

        </div>

      `

    ).join('');


  return `

    <div
      class="back-link"
      data-go="discursiva-write"
      data-id="${proposta.id}"
    >
      &larr; Voltar ao texto
    </div>


    <span class="eyebrow">
      Checklist de autocorreção
    </span>


    <h1>
      ${esc(proposta.titulo)}
    </h1>


    <div class="card">
      ${items}
    </div>


    <div class="card">

      <h2>
        Plano de reescrita
      </h2>

      ${planoFields}

    </div>


    <button
      type="button"
      class="btn btn-primary btn-block"
      data-action="save-check"
      data-id="${proposta.id}"
    >
      Salvar autocorreção
    </button>

  `;

}



function saveDiscursivaCheck(
  id
) {

  const proposta =
    DATA.discursiva.propostas.find(

      item =>
        item.id == id

    );


  if (!proposta) {

    return;

  }


  const criterios =
    DATA.discursiva
      .checklist_criterios;


  if (
    !criterios ||
    !criterios.length
  ) {

    return;

  }


  const values = {};

  let score = 0;


  criterios.forEach(

    criterio => {

      const seg =
        main.querySelector(
          `.seg[data-crit="${criterio.id}"]`
        );


      if (!seg) {

        values[criterio.id] =
          null;

        return;

      }


      const selected =
        seg.querySelector(
          '.sel-sim, .sel-parcial, .sel-nao'
        );


      const value =
        selected

          ? (
              selected.classList.contains(
                'sel-sim'
              )

                ? 'sim'

                : selected.classList.contains(
                    'sel-parcial'
                  )

                  ? 'parcial'

                  : 'nao'
            )

          : null;


      values[criterio.id] =
        value;


      if (
        value === 'sim'
      ) {

        score += 1;

      }


      if (
        value === 'parcial'
      ) {

        score +=
          0.5;

      }

    }

  );


  const percentual =
    Math.round(
      (
        score /
        criterios.length
      ) *
      100
    );


  const isNew =
    !STATE.discursivaScores[id];


  STATE.discursivaScores[id] = {

    criterios:
      values,

    score,

    percentual,

    data:
      new Date()
        .toISOString()

  };


  if (isNew) {

    STATE.counters
      .discursivasEscritas +=
        1;

  }


  const notas = {};


  main
    .querySelectorAll(
      '[data-plano]'
    )
    .forEach(

      textarea => {

        notas[
          textarea.dataset.plano
        ] =
          textarea.value;

      }

    );


  STATE.reescritaNotas[id] =
    notas;


  saveState();


  go(
    'discursiva'
  );

}



/* =========================================================
   PLANNER
========================================================= */

function renderPlanner() {

  const semanas =
    DATA.planner.semanas || [];


  const weeks =
    semanas.map(

      semana => {

        const days =
          semana.dias.map(

            (
              day,
              index
            ) => {

              const key =
                `${semana.n}-${index}`;


              const done =
                !!STATE.plannerDone[
                  key
                ];


              return `

                <div
                  class="day-row ${done ? 'done' : ''}"
                >

                  <input
                    type="checkbox"
                    data-action="toggle-day"
                    data-key="${key}"
                    ${done ? 'checked' : ''}
                  >


                  <div>

                    <span class="day-name">
                      ${esc(day.dia)}
                    </span>

                    <span class="day-task">
                      ${esc(day.tarefa)}
                    </span>

                  </div>

                </div>

              `;

            }

          ).join('');


        const totalDone =
          semana.dias.filter(

            (
              _,
              index
            ) =>
              STATE.plannerDone[
                `${semana.n}-${index}`
              ]

          ).length;


        return `

          <div class="card">

            <span class="eyebrow">

              Semana
              ${semana.n}
              de
              ${semanas.length}

              ·

              ${totalDone}
              /
              ${semana.dias.length}

            </span>


            <h3>
              ${esc(semana.titulo)}
            </h3>


            <p class="mute">
              ${esc(semana.resumo)}
            </p>


            <hr class="divider">


            ${days}

          </div>

        `;

      }

    ).join('');


  const dias =
    daysUntil(
      DATA.planner.data_prova
    );


  const retaFinalCard =
    isCompleto()

      ? `

        <div
          class="card tap"
          data-go="planner-10dias"
          style="
            background:var(--rust);
            border:none;
          "
        >

          <div class="card-row">

            <div>

              <h3 style="color:#fff">
                Reta Final · últimos 10 dias
              </h3>

              <p
                class="mute"
                style="color:var(--rust-soft)"
              >

                ${
                  dias >= 0 &&
                  dias <= 10

                    ? `Ative agora: faltam ${dias} dias.`

                    : 'Roteiro de emergência para quando faltar pouco tempo.'
                }

              </p>

            </div>

            <span class="badge">
              Abrir
            </span>

          </div>

        </div>

      `

      : `

        <div class="card">

          <div class="card-row">

            <div>

              <h3>
                🔒 Reta Final · últimos 10 dias
              </h3>

              <p class="mute">
                Recurso exclusivo do plano Completo.
              </p>

            </div>

          </div>

        </div>

      `;


  return `

    <span class="eyebrow">
      Planner adaptativo
    </span>


    <h1>
      ${semanas.length}
      semanas
    </h1>


    <p class="mute">
      Uma tarefa por dia.
      Domingo é revisão espaçada,
      sábado é discursiva.
    </p>


    ${retaFinalCard}

    ${weeks}

  `;

}



/* =========================================================
   RETA FINAL 10 DIAS
========================================================= */

function renderRetaFinal10() {

  if (!isCompleto()) {

    return `

      <div
        class="back-link"
        data-go="planner"
      >
        &larr; Planner
      </div>


      <span class="eyebrow">
        Ativação final
      </span>


      <h1>
        Reta Final · 10 dias
      </h1>


      ${upsellCardHTML(

        'Roteiro Reta Final · últimos 10 dias',

        'O plano dia a dia para os últimos dias antes da prova faz parte do plano Completo.'

      )}

    `;

  }


  const rf =
    DATA.retaFinal10;


  if (!rf) {

    return `
      <p>Roteiro não disponível.</p>
    `;

  }


  const dias =
    rf.dias.map(

      day => {

        const done =
          !!STATE.retaFinalDone[
            day.dia
          ];


        return `

          <div
            class="day-row ${done ? 'done' : ''}"
          >

            <input
              type="checkbox"
              data-action="toggle-rf-dia"
              data-key="${esc(day.dia)}"
              ${done ? 'checked' : ''}
            >


            <div>

              <span class="day-name">
                ${esc(day.dia)}
                ·
                ${esc(day.titulo)}
              </span>

              <span class="day-task">
                ${esc(day.tarefa)}
              </span>

            </div>

          </div>

        `;

      }

    ).join('');


  const checklist =
    rf.checklist_prova.map(

      (
        item,
        index
      ) => {

        const done =
          !!STATE.provaChecklistDone[
            index
          ];


        return `

          <div
            class="day-row ${done ? 'done' : ''}"
          >

            <input
              type="checkbox"
              data-action="toggle-prova-item"
              data-key="${index}"
              ${done ? 'checked' : ''}
            >


            <div>

              <span class="day-task">
                ${esc(item)}
              </span>

            </div>

          </div>

        `;

      }

    ).join('');


  return `

    <div
      class="back-link"
      data-go="planner"
    >
      &larr; Planner
    </div>


    <span class="eyebrow">
      Ativação final
    </span>


    <h1>
      Reta Final · 10 dias
    </h1>


    <p class="mute">
      ${esc(rf.intro)}
    </p>


    <div class="card">

      <h2>
        Roteiro D-10 a D-1
      </h2>

      ${dias}

    </div>


    <div class="card">

      <h2>
        Checklist do dia da prova
      </h2>

      ${checklist}

    </div>

  `;

}



/* =========================================================
   HANDLERS
========================================================= */

function attachHandlers() {

  main
    .querySelectorAll(
      '[data-go]'
    )
    .forEach(

      element => {

        element.addEventListener(

          'click',

          () => {

            const view =
              element.dataset.go;


            const params = {};


            if (
              element.dataset.id !==
              undefined
            ) {

              params.id =
                element.dataset.id;

            }


            if (
              element.dataset.area
            ) {

              params.area =
                element.dataset.area;

            }


            if (
              element.dataset.modo
            ) {

              params.modo =
                element.dataset.modo;

            }


            go(
              view,
              params
            );

          }

        );

      }

    );


  main
    .querySelectorAll(
      '[data-action]'
    )
    .forEach(

      element => {

        element.addEventListener(

          'click',

          event => {

            handleAction(
              element,
              event
            );

          }

        );

      }

    );

}



function handleAction(
  el,
  event
) {

  const action =
    el.dataset.action;


  if (!action) {

    return;

  }


  if (
    action ===
    'flash-next'
  ) {

    STATE._flashIdx =
      (
        STATE._flashIdx ||
        0
      ) +
      1;


    render();

    return;

  }


  if (
    action ===
    'flash-restart'
  ) {

    STATE._flashDeck =
      shuffle(
        allPegadinhas()
      );


    STATE._flashIdx =
      0;


    render();

    return;

  }


  if (
    action ===
    'qmodo'
  ) {

    const modo =
      el.dataset.modo;


    if (
      modo === 'especifica' &&
      !isCompleto()
    ) {

      go(
        'questoes',
        {
          modo:
            'especifica'
        }
      );

      return;

    }


    go(
      'questoes',
      {
        modo
      }
    );

    return;

  }


  if (
    action ===
    'qarea'
  ) {

    if (!isCompleto()) {

      alert(
        'O Componente Específico faz parte do plano Completo.'
      );

      return;

    }


    go(
      'questoes',
      {
        modo:
          'especifica',

        area:
          el.dataset.area
      }
    );

    return;

  }


  if (
    action ===
    'quiz-start'
  ) {

    startQuiz(

      el.dataset.modo,

      el.dataset.area,

      parseInt(
        el.dataset.n,
        10
      )

    );

    return;

  }


  if (
    action ===
    'answer'
  ) {

    submitAnswer(
      el.dataset.letter
    );

    return;

  }


  if (
    action ===
    'quiz-next'
  ) {

    if (STATE._quiz) {

      STATE._quiz.idx +=
        1;


      render();

    }

    return;

  }


  if (
    action ===
    'quiz-exit'
  ) {

    STATE._quiz =
      null;


    go(
      'questoes'
    );

    return;

  }


  if (
    action ===
    'quiz-retry'
  ) {

    if (!STATE._quiz) {

      return;

    }


    const modo =
      STATE._quiz.modo;


    const area =
      STATE._quiz.area;


    const eixo =
      STATE._quiz.eixo;


    const n =
      STATE._quiz.pool.length;


    startQuiz(
      modo,
      area,
      n,
      eixo
    );

    return;

  }


  if (
    action ===
    'ver-modelo'
  ) {

    const proposta =
      DATA.discursiva.propostas.find(

        item =>
          item.id ==
          el.dataset.id

      );


    if (!proposta) {

      return;

    }


    const box =
      document.getElementById(
        'modelo-box'
      );


    if (!box) {

      return;

    }


    box.innerHTML = `

      <div
        class="card"
        style="margin-top:12px;"
      >

        <h3>
          Modelo de resposta
        </h3>

        <p
          style="
            white-space:pre-line;
            font-size:.88rem;
            line-height:1.6;
          "
        >
          ${esc(proposta.modelo)}
        </p>

      </div>

    `;

    return;

  }


  if (
    action ===
    'save-check'
  ) {

    saveDiscursivaCheck(
      el.dataset.id
    );

    return;

  }


  if (
    action ===
    'corrigir-ia'
  ) {

    corrigirComIA(
      el.dataset.id,
      el
    );

    return;

  }


  if (
    action ===
    'instalar-app'
  ) {

    instalarApp();

    return;

  }


  if (
    action ===
    'praticar-eixo'
  ) {

    const pool =
      DATA.questoes.filter(

        q =>
          q.fonte !== 'vol' &&
          q.eixo ===
            el.dataset.eixo

      );


    if (!pool.length) {

      alert(
        'Ainda não há questões cadastradas para este eixo.'
      );

      return;

    }


    startQuiz(

      'geral',

      null,

      15,

      el.dataset.eixo

    );

    return;

  }


  if (
    action ===
    'toggle-day'
  ) {

    const key =
      el.dataset.key;


    STATE.plannerDone[
      key
    ] =
      el.checked;


    saveState();

    return;

  }


  if (
    action ===
    'toggle-rf-dia'
  ) {

    if (!isCompleto()) {

      return;

    }


    STATE.retaFinalDone[
      el.dataset.key
    ] =
      el.checked;


    saveState();

    render();

    return;

  }


  if (
    action ===
    'toggle-prova-item'
  ) {

    if (!isCompleto()) {

      return;

    }


    STATE.provaChecklistDone[
      el.dataset.key
    ] =
      el.checked;


    saveState();

    render();

    return;

  }

}



/* =========================================================
   EVENTOS DELEGADOS
========================================================= */

main.addEventListener(

  'click',

  event => {

    const flashcard =
      event.target.closest(
        '#fc'
      );


    if (flashcard) {

      flashcard.classList.toggle(
        'flipped'
      );

    }

  }

);



main.addEventListener(

  'click',

  event => {

    const btn =
      event.target.closest(
        '.seg button'
      );


    if (!btn) {

      return;

    }


    const seg =
      btn.parentElement;


    seg
      .querySelectorAll(
        'button'
      )
      .forEach(

        button => {

          button.classList.remove(

            'sel-sim',

            'sel-parcial',

            'sel-nao'

          );

        }

      );


    btn.classList.add(
      'sel-' +
      btn.dataset.val
    );

  }

);



/* =========================================================
   TIMER DA DISCURSIVA
========================================================= */

let timerInterval =
  null;



function startTimer() {

  clearInterval(
    timerInterval
  );


  let seconds =
    30 *
    60;


  const el =
    document.getElementById(
      'timer'
    );


  if (!el) {

    return;

  }


  timerInterval =
    setInterval(

      () => {

        seconds -=
          1;


        if (
          seconds <
          0
        ) {

          clearInterval(
            timerInterval
          );

          return;

        }


        const minutes =
          String(
            Math.floor(
              seconds /
              60
            )
          ).padStart(
            2,
            '0'
          );


        const secs =
          String(
            seconds %
            60
          ).padStart(
            2,
            '0'
          );


        el.textContent =
          `${minutes}:${secs}`;

      },

      1000

    );

}



/* =========================================================
   TABBAR PRINCIPAL
========================================================= */

document
  .querySelectorAll(
    'nav.tabbar button'
  )
  .forEach(

    btn => {

      btn.addEventListener(

        'click',

        () => {

          STATE._quiz =
            null;


          STATE._flashIdx =
            undefined;


          go(
            btn.dataset.tab
          );

        }

      );

    }

  );



/* =========================================================
   RENDER + TIMER
========================================================= */

const originalRender =
  render;


render = function () {

  originalRender();


  if (
    ROUTE.view ===
    'discursiva-write'
  ) {

    startTimer();


  } else {

    clearInterval(
      timerInterval
    );

  }

};



/* =========================================================
   BOOT
========================================================= */

async function boot() {

  try {

    /*
      Confirma novamente que existe
      sessão válida e cria o storage
      individual daquele usuário.
    */

    await initUserState();


    /*
      Validação defensiva do plano.

      auth.js já faz isso,
      mas nunca devemos assumir
      "completo" por ausência de valor.
    */

    if (
      !isAdmin() &&
      ![
        'essencial',
        'completo'
      ].includes(
        window.USER_PLANO
      )
    ) {

      throw new Error(
        'Plano de acesso inválido.'
      );

    }


    /*
      Carrega os dados do aplicativo.
    */

    await loadAllData();


    render();

    updateTabbar();


    /*
      Service Worker
    */

    if (
      'serviceWorker'
      in navigator
    ) {

      navigator
        .serviceWorker
        .register(
          'sw.js'
        )
        .catch(

          error => {

            console.warn(
              'Service Worker não registrado.',
              error
            );

          }

        );

    }


  } catch (error) {

    console.error(
      'Erro ao iniciar o app:',
      error
    );


    if (main) {

      main.innerHTML = `

        <div class="view">

          <div class="empty">

            <h2>
              Não foi possível abrir o aplicativo
            </h2>

            <p>
              Sua sessão não pôde ser validada.
              Saia da conta e entre novamente.
            </p>

          </div>

        </div>

      `;

    }

  }

}



/* =========================================================
   O AUTH.JS É QUEM CHAMA ESTE MÉTODO
========================================================= */

window.startApp =
  boot;
