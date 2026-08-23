/* =========================================================
   MÉTODO PND
   DATA.JS

   Responsável pelo carregamento dos conteúdos do aplicativo.

   REGRA DE ACESSO:

   ESSENCIAL
   - Resumos / mapas
   - Formação Geral
   - Banco Turbo de Formação Geral
   - Discursiva
   - Planner de 7 semanas
   - Eixos

   COMPLETO / ADMIN
   - Tudo do Essencial
   - Questões específicas
   - Reta Final 10 dias
   - Materiais PDF

   IMPORTANTE:
   Isto impede o app Essencial de carregar os arquivos premium
   durante o uso normal.

   Para proteção definitiva, arquivos premium também devem
   deixar de ser públicos na hospedagem.
========================================================= */


/* =========================================================
   ESTRUTURA GLOBAL DE DADOS
========================================================= */

const DATA = {

  mapas: [],

  discursiva: null,

  planner: null,

  retaFinal10: null,

  materiais: [],

  eixos: [],

  meta: 0.8,

  questoes: [],

  areasEspecificas: []

};


window.DATA = DATA;



/* =========================================================
   CONTROLE DE PLANO
========================================================= */

function dataIsAdmin() {

  return (
    window.IS_ADMIN === true ||
    window.USER_ROLE === 'admin'
  );

}



function dataIsCompleto() {

  return (
    dataIsAdmin() ||
    window.USER_PLANO === 'completo'
  );

}



function dataHasValidPlan() {

  return (
    dataIsAdmin() ||
    window.USER_PLANO === 'essencial' ||
    window.USER_PLANO === 'completo'
  );

}



/* =========================================================
   CARREGAMENTO JSON
========================================================= */

async function loadJSON(path) {

  const response =
    await fetch(
      path,
      {
        credentials: 'same-origin'
      }
    );


  if (!response.ok) {

    throw new Error(
      `Falha ao carregar ${path} (${response.status})`
    );

  }


  try {

    return await response.json();

  } catch (error) {

    throw new Error(
      `JSON inválido em ${path}`
    );

  }

}



/* =========================================================
   MAPEAMENTO DOS EIXOS
========================================================= */

const EIXO_KEYWORDS = {

  'LDB': [
    'ldb',
    'trabalho docente',
    'gestão democrática',
    'ano letivo',
    'formação docente'
  ],

  'PNE e SNE': [
    'pne',
    'sne',
    'plano nacional',
    'sistema nacional'
  ],

  'ECA': [
    'eca',
    'evasão',
    'direito à educação',
    'estatuto da criança'
  ],

  'BNCC e currículo': [
    'bncc',
    'currículo',
    'temas transversais',
    'competências'
  ],

  'Avaliação': [
    'avaliação',
    'ideb',
    'saeb',
    'recuperação',
    'progressão'
  ],

  'Inclusão': [
    'inclusão',
    'aee',
    'lbi',
    'dua',
    'libras',
    'capacitismo'
  ],

  'Didática': [
    'didática',
    'psicologia',
    'teorias pedagógicas',
    'mediação',
    'letramento científico',
    'tendências pedagógicas'
  ],

  'Gestão e financiamento': [
    'ppp',
    'colegiados',
    'financiamento',
    'gestão',
    'fundeb'
  ],

  'Diversidade e direitos humanos': [
    'étnico',
    'diversidade',
    'convivência',
    'bullying',
    'socioambiental',
    'gênero'
  ]

};



function mapAreaToEixo(area) {

  const low =
    String(area || '')
      .toLowerCase();


  for (
    const [eixo, keywords]
    of Object.entries(EIXO_KEYWORDS)
  ) {

    if (
      keywords.some(
        keyword =>
          low.includes(keyword)
      )
    ) {

      return eixo;

    }

  }


  /*
    Questões específicas como Teatro,
    Matemática, Biologia etc. não entram
    no painel de Formação Geral.
  */

  return null;

}



/* =========================================================
   NORMALIZAÇÃO DAS QUESTÕES
========================================================= */

function normalizeQuestion(
  question,
  fonte
) {

  if (
    !question ||
    typeof question !== 'object'
  ) {

    return null;

  }


  return {

    id:
      question.id,

    /*
      fonte:

      comentado
      banco_turbo
      vol
    */

    fonte,

    area:
      question.area || '',

    eixo:
      fonte === 'vol'
        ? null
        : mapAreaToEixo(
            question.area
          ),

    title:
      question.title || '',

    stem:
      question.stem || '',

    options:
      question.options || {},

    correct:
      question.correct || null,

    explanations:
      question.explanations || {}

  };

}



/* =========================================================
   VALIDAÇÃO DAS QUESTÕES
========================================================= */

function validQuestion(question) {

  if (!question) {

    return false;

  }


  if (!question.correct) {

    return false;

  }


  if (
    !question.options ||
    typeof question.options !== 'object'
  ) {

    return false;

  }


  const options =
    Object.keys(
      question.options
    );


  /*
    Mantém a regra atual:
    pelo menos 4 alternativas.
  */

  if (
    options.length < 4
  ) {

    return false;

  }


  /*
    A alternativa correta precisa existir.
  */

  if (
    !Object.prototype.hasOwnProperty.call(
      question.options,
      question.correct
    )
  ) {

    return false;

  }


  return true;

}



/* =========================================================
   LIMPA DADOS PREMIUM

   Importante caso algum estado anterior tenha ficado
   na memória da página.
========================================================= */

function clearPremiumData() {

  DATA.retaFinal10 =
    null;


  DATA.materiais =
    [];


  DATA.areasEspecificas =
    [];


  DATA.questoes =
    DATA.questoes.filter(
      question =>
        question.fonte !== 'vol'
    );

}



/* =========================================================
   CARREGAMENTO DO PLANO ESSENCIAL
========================================================= */

async function loadEssentialData() {

  const [

    mapas,

    discursiva,

    planner,

    eixosData,

    comentado,

    bancoTurbo

  ] =
    await Promise.all([

      loadJSON(
        'data/mapas.json'
      ),

      loadJSON(
        'data/discursiva.json'
      ),

      loadJSON(
        'data/planner.json'
      ),

      loadJSON(
        'data/eixos.json'
      ),

      loadJSON(
        'data/simulado_comentado.json'
      ),

      loadJSON(
        'data/banco_turbo.json'
      )

    ]);


  DATA.mapas =
    Array.isArray(mapas)
      ? mapas
      : [];


  DATA.discursiva =
    discursiva || {
      propostas: [],
      checklist_criterios: [],
      plano_reescrita: []
    };


  DATA.planner =
    planner || {
      semanas: [],
      data_prova: null
    };


  DATA.eixos =
    Array.isArray(
      eixosData?.eixos
    )
      ? eixosData.eixos
      : [];


  DATA.meta =
    Number.isFinite(
      Number(eixosData?.meta)
    )
      ? Number(eixosData.meta)
      : 0.8;


  const gerais = [

    ...(
      Array.isArray(comentado)
        ? comentado
        : []
    ).map(
      question =>
        normalizeQuestion(
          question,
          'comentado'
        )
    ),

    ...(
      Array.isArray(bancoTurbo)
        ? bancoTurbo
        : []
    ).map(
      question =>
        normalizeQuestion(
          question,
          'banco_turbo'
        )
    )

  ];


  DATA.questoes =
    gerais.filter(
      validQuestion
    );


  /*
    Recursos do Completo começam vazios.
  */

  DATA.retaFinal10 =
    null;


  DATA.materiais =
    [];


  DATA.areasEspecificas =
    [];

}



/* =========================================================
   CARREGAMENTO DOS RECURSOS DO PLANO COMPLETO
========================================================= */

async function loadCompleteData() {

  if (!dataIsCompleto()) {

    clearPremiumData();

    return;

  }


  const [

    retaFinal10,

    materiais,

    especificas

  ] =
    await Promise.all([

      loadJSON(
        'data/reta_final_10_dias.json'
      ),

      loadJSON(
        'data/materiais.json'
      ),

      loadJSON(
        'data/questoes_especificas.json'
      )

    ]);


  DATA.retaFinal10 =
    retaFinal10 || null;


  DATA.materiais =
    Array.isArray(materiais)
      ? materiais
      : [];


  const specificQuestions =
    (
      Array.isArray(especificas)
        ? especificas
        : []
    )
      .map(
        question =>
          normalizeQuestion(
            question,
            'vol'
          )
      )
      .filter(
        validQuestion
      );


  DATA.questoes.push(
    ...specificQuestions
  );


  DATA.areasEspecificas = [

    ...new Set(

      specificQuestions

        .map(
          question =>
            question.area
        )

        .filter(Boolean)

    )

  ].sort(
    (
      a,
      b
    ) =>
      String(a).localeCompare(
        String(b),
        'pt-BR'
      )
  );

}



/* =========================================================
   FUNÇÃO PRINCIPAL
========================================================= */

async function loadAllData() {

  /*
    O auth.js já deve ter validado isso.

    Mesmo assim fazemos outra validação
    defensiva antes de baixar conteúdo.
  */

  if (!dataHasValidPlan()) {

    throw new Error(
      'Plano de acesso inválido ou não definido.'
    );

  }


  /*
    Primeiro carrega apenas os conteúdos
    permitidos para todos os compradores.
  */

  await loadEssentialData();


  /*
    Só usuários Completo/Admin chegam aqui
    e baixam os arquivos premium.
  */

  if (dataIsCompleto()) {

    await loadCompleteData();


  } else {

    clearPremiumData();

  }


  return DATA;

}



/* =========================================================
   EXPOSIÇÃO CONTROLADA
========================================================= */

window.loadAllData =
  loadAllData;
