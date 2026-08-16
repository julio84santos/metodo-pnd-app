// Carrega todos os arquivos JSON de conteúdo e expõe em window.DATA
const DATA = {
  mapas: [],
  discursiva: null,
  planner: null,
  retaFinal10: null,
  materiais: [],
  eixos: [],
  meta: 0.8,
  questoes: [] // unificação de simulado_comentado + questoes_especificas + banco_turbo
};

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error('Falha ao carregar ' + path);
  return res.json();
}

// Palavras-chave para mapear cada questão de Formação Geral a um dos 9 eixos do painel
const EIXO_KEYWORDS = {
  'LDB': ['ldb', 'trabalho docente', 'gestão democrática', 'ano letivo', 'formação docente'],
  'PNE e SNE': ['pne', 'sne', 'plano nacional', 'sistema nacional'],
  'ECA': ['eca', 'evasão', 'direito à educação', 'estatuto da criança'],
  'BNCC e currículo': ['bncc', 'currículo', 'temas transversais', 'competências'],
  'Avaliação': ['avaliação', 'ideb', 'saeb', 'recuperação', 'progressão'],
  'Inclusão': ['inclusão', 'aee', 'lbi', 'dua', 'libras', 'capacitismo'],
  'Didática': ['didática', 'psicologia', 'teorias pedagógicas', 'mediação', 'letramento científico', 'tendências pedagógicas'],
  'Gestão e financiamento': ['ppp', 'colegiados', 'financiamento', 'gestão', 'fundeb'],
  'Diversidade e direitos humanos': ['étnico', 'diversidade', 'convivência', 'bullying', 'socioambiental', 'gênero']
};

function mapAreaToEixo(area) {
  const low = (area || '').toLowerCase();
  for (const [eixo, kws] of Object.entries(EIXO_KEYWORDS)) {
    if (kws.some(k => low.includes(k))) return eixo;
  }
  return null; // questão de área específica (ex: Teatro, Dança) — não entra no painel geral
}

function normalizeQuestion(q, fonte) {
  return {
    id: q.id,
    fonte, // 'comentado' | 'vol' | 'banco_turbo'
    area: q.area,
    eixo: mapAreaToEixo(q.area),
    title: q.title,
    stem: q.stem,
    options: q.options,
    correct: q.correct,
    explanations: q.explanations || {}
  };
}

async function loadAllData() {
  const [mapas, discursiva, planner, retaFinal10, materiais, eixosData, comentado, especificas, bancoTurbo] = await Promise.all([
    loadJSON('data/mapas.json'),
    loadJSON('data/discursiva.json'),
    loadJSON('data/planner.json'),
    loadJSON('data/reta_final_10_dias.json'),
    loadJSON('data/materiais.json'),
    loadJSON('data/eixos.json'),
    loadJSON('data/simulado_comentado.json'),
    loadJSON('data/questoes_especificas.json'),
    loadJSON('data/banco_turbo.json')
  ]);

  DATA.mapas = mapas;
  DATA.discursiva = discursiva;
  DATA.planner = planner;
  DATA.retaFinal10 = retaFinal10;
  DATA.materiais = materiais;
  DATA.eixos = eixosData.eixos;
  DATA.meta = eixosData.meta;

  DATA.questoes = [
    ...comentado.map(q => normalizeQuestion(q, 'comentado')),
    ...bancoTurbo.map(q => normalizeQuestion(q, 'banco_turbo')),
    ...especificas.map(q => normalizeQuestion(q, 'vol'))
  ].filter(q => q.correct && q.options && Object.keys(q.options).length >= 4);

  DATA.areasEspecificas = [...new Set(especificas.map(q => q.area))].sort();

  return DATA;
}
