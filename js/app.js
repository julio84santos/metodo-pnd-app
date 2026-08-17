/* ---------------- Estado persistente (localStorage) ---------------- */
const STORE_KEY = 'pnd_v1';

function loadState() {
  const defaults = {
    eixoStats: {},
    areaStats: {},
    discursivaScores: {},
    plannerDone: {},
    retaFinalDone: {},
    provaChecklistDone: {},
    reescritaNotas: {},
    counters: { questoesRespondidas: 0, discursivasEscritas: 0 }
  };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return Object.assign(defaults, JSON.parse(raw));
  } catch (e) {}
  return defaults;
}
let STATE = loadState();
function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(STATE));
}

function bump(map, key, correct) {
  if (!map[key]) map[key] = { acertos: 0, total: 0 };
  map[key].total += 1;
  if (correct) map[key].acertos += 1;
}

/* ---------------- Router ---------------- */
const app = document.getElementById('app');
const main = document.getElementById('main');
let ROUTE = { view: 'home', params: {} };

function go(view, params = {}) {
  ROUTE = { view, params };
  window.scrollTo(0, 0);
  render();
  updateTabbar();
}

function updateTabbar() {
  document.querySelectorAll('nav.tabbar button').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === ROUTE.view.split('-')[0]);
  });
}

/* ---------------- Helpers ---------------- */
function daysUntil(dateStr) {
  const target = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0,0,0,0);
  const diff = Math.ceil((target - now) / 86400000);
  return diff;
}
function pct(obj) {
  if (!obj || !obj.total) return 0;
  return Math.round((obj.acertos / obj.total) * 100);
}
function barClass(p) {
  if (p >= 80) return '';
  if (p >= 50) return 'mid';
  return 'low';
}
function esc(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------------- Render root ---------------- */
function render() {
  const views = {
    home: renderHome,
    mapas: renderMapasList,
    'mapas-detail': renderMapaDetail,
    'mapas-flash': renderFlashcards,
    questoes: renderQuestoesHome,
    'questoes-quiz': renderQuiz,
    discursiva: renderDiscursivaList,
    'discursiva-detail': renderDiscursivaDetail,
    'discursiva-write': renderDiscursivaWrite,
    'discursiva-check': renderDiscursivaCheck,
    'discursiva-ia': renderDiscursivaIA,
    planner: renderPlanner,
    'planner-10dias': renderRetaFinal10,
    materiais: renderMateriais
  };
  const fn = views[ROUTE.view] || renderHome;
  main.innerHTML = `<div class="view">${fn(ROUTE.params)}</div>`;
  attachHandlers();
}

/* ================= HOME ================= */
function renderHome() {
  const dias = daysUntil(DATA.planner.data_prova);
  const totalQ = STATE.counters.questoesRespondidas;
  const totalD = STATE.counters.discursivasEscritas;

  const eixoRows = DATA.eixos.map(eixo => {
    const stat = STATE.eixoStats[eixo];
    const p = pct(stat);
    return `<div class="eixo-row">
      <div class="eixo-top"><b>${esc(eixo)}</b><span class="eixo-pct">${stat && stat.total ? p + '% · ' + stat.acertos + '/' + stat.total : 'sem dados'}</span></div>
      <div class="progress-track"><div class="progress-fill ${barClass(p)}" style="width:${stat && stat.total ? p : 0}%"></div></div>
    </div>`;
  }).join('');

  return `
    <span class="eyebrow">Painel de desempenho</span>
    <h1>Sua reta final</h1>
    <p class="mute">Meta: 80% de acerto por eixo. Estude primeiro os eixos abaixo da meta.</p>

    <div class="stat-grid">
      <div class="stat"><b>${dias >= 0 ? dias : 0}</b><span>dias até a prova</span></div>
      <div class="stat"><b>${totalQ}</b><span>questões feitas</span></div>
      <div class="stat"><b>${totalD}</b><span>discursivas escritas</span></div>
    </div>

    <div class="card">
      <h2>Eixos · Formação Geral</h2>
      ${eixoRows}
    </div>

    <div class="card tap" data-go="planner">
      <div class="card-row">
        <div><h3>Planner de hoje</h3><p class="mute">Veja a tarefa do dia, semana por semana.</p></div>
        <span class="badge alt">Abrir</span>
      </div>
    </div>
    <div class="card tap" data-go="questoes">
      <div class="card-row">
        <div><h3>Praticar questões</h3><p class="mute">490 questões comentadas, corrigidas na hora.</p></div>
        <span class="badge alt">Abrir</span>
      </div>
    </div>
    <div class="card tap" data-go="materiais">
      <div class="card-row">
        <div><h3>Materiais em PDF</h3><p class="mute">Os guias originais, para abrir ou baixar.</p></div>
        <span class="badge alt">Abrir</span>
      </div>
    </div>
  `;
}

/* ================= MATERIAIS ================= */
function renderMateriais() {
  const cards = DATA.materiais.map(m => `
    <a class="card tap" href="${esc(m.arquivo)}" target="_blank" rel="noopener" style="display:block;text-decoration:none;">
      <div class="card-row">
        <div><h3>${esc(m.titulo)}</h3><p class="mute">${esc(m.descricao)}</p></div>
        <span class="badge alt">${esc(m.tamanho)}</span>
      </div>
    </a>`).join('');
  return `
    <div class="back-link" data-go="home">&larr; Início</div>
    <span class="eyebrow">Guias originais</span>
    <h1>Materiais em PDF</h1>
    <p class="mute">Os documentos completos do Método PND, para ler offline ou imprimir.</p>
    ${cards}
  `;
}

/* ================= MAPAS ================= */
function renderMapasList() {
  const cards = DATA.mapas.map(m => `
    <div class="card tap" data-go="mapas-detail" data-id="${m.id}">
      <span class="eyebrow">Mapa ${String(m.id).padStart(2,'0')}</span>
      <h3>${esc(m.titulo)}</h3>
      <p class="mute">${esc(m.subtitulo)}</p>
    </div>`).join('');
  return `
    <span class="eyebrow">Mapas mentais</span>
    <h1>9 mapas · Formação Geral</h1>
    <div class="card tap" data-go="mapas-flash" style="background:var(--ink);border:none;">
      <div class="card-row">
        <div><h3 style="color:#fff">Modo flashcard</h3><p class="mute" style="color:var(--rust-soft)">27 pegadinhas da banca, uma por vez.</p></div>
        <span class="badge">Treinar</span>
      </div>
    </div>
    ${cards}
  `;
}

function renderMapaDetail(params) {
  const mapa = DATA.mapas.find(m => m.id == params.id);
  if (!mapa) return `<p>Mapa não encontrado.</p>`;
  const ramos = mapa.ramos.map(r => `
    <div class="ramo">
      <h3>${esc(r.nome)}</h3>
      <ul>${r.itens.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
    </div>`).join('');
  const pegs = mapa.pegadinhas.map((p, i) => `
    <div class="pegadinha">
      <span class="num">Pegadinha ${i+1}</span>
      <h3 style="margin-bottom:4px;">${esc(p.titulo)}</h3>
      <p style="margin:0">${esc(p.texto)}</p>
    </div>`).join('');
  return `
    <div class="back-link" data-go="mapas">&larr; Mapas</div>
    <span class="eyebrow">Mapa ${String(mapa.id).padStart(2,'0')}</span>
    <h1>${esc(mapa.titulo)}</h1>
    <p class="mute">${esc(mapa.subtitulo)}</p>
    <hr class="divider">
    ${ramos}
    <hr class="divider">
    <h2>Pegadinhas da banca</h2>
    ${pegs}
  `;
}

function allPegadinhas() {
  const list = [];
  DATA.mapas.forEach(m => m.pegadinhas.forEach(p => list.push({ ...p, mapa: m.titulo })));
  return list;
}

function renderFlashcards() {
  if (!STATE._flashDeck) STATE._flashDeck = shuffle(allPegadinhas());
  if (STATE._flashIdx === undefined) STATE._flashIdx = 0;
  const deck = STATE._flashDeck;
  const idx = STATE._flashIdx;
  if (idx >= deck.length) {
    return `
      <div class="back-link" data-go="mapas">&larr; Mapas</div>
      <div class="empty"><h2>Deck concluído</h2><p>Você revisou as ${deck.length} pegadinhas.</p>
      <button class="btn btn-primary" data-action="flash-restart">Embaralhar de novo</button></div>`;
  }
  const card = deck[idx];
  return `
    <div class="back-link" data-go="mapas">&larr; Mapas</div>
    <span class="eyebrow">Flashcard ${idx+1} / ${deck.length} · ${esc(card.mapa)}</span>
    <div class="flashcard-wrap">
      <div class="flashcard" id="fc">
        <div class="face front">
          <span class="label">Pegadinha</span>
          <p>${esc(card.titulo)}</p>
        </div>
        <div class="face back">
          <span class="label">Explicação</span>
          <p>${esc(card.texto)}</p>
        </div>
      </div>
    </div>
    <p class="mute" style="text-align:center;">Toque no cartão para virar</p>
    <div class="flash-controls">
      <button class="btn btn-ghost btn-block" data-action="flash-next">Próxima →</button>
    </div>
  `;
}

/* ================= QUESTÕES ================= */
function renderQuestoesHome(params) {
  const modo = params.modo || 'geral';
  const areas = DATA.areasEspecificas;
  const chipsModo = `
    <div style="margin-bottom:10px;">
      <span class="filter-chip ${modo==='geral'?'active':''}" data-action="qmodo" data-modo="geral">Formação Geral</span>
      <span class="filter-chip ${modo==='especifica'?'active':''}" data-action="qmodo" data-modo="especifica">Componente Específico</span>
    </div>`;

  let filtroArea = '';
  let qtdOptions = [10, 20, 30];
  let poolSize;
  if (modo === 'geral') {
    poolSize = DATA.questoes.filter(q => q.fonte !== 'vol').length;
  } else {
    filtroArea = `
      <div class="card">
        <h3>Escolha sua área</h3>
        <div>${areas.map(a => `<span class="filter-chip ${params.area===a?'active':''}" data-action="qarea" data-area="${esc(a)}">${esc(a)}</span>`).join('')}</div>
      </div>`;
    poolSize = params.area ? DATA.questoes.filter(q => q.fonte === 'vol' && q.area === params.area).length : 0;
  }

  return `
    <span class="eyebrow">Banco de questões</span>
    <h1>490 questões comentadas</h1>
    ${chipsModo}
    ${filtroArea}
    <div class="card">
      <h3>Quantidade</h3>
      <p class="mute">${poolSize} questões disponíveis neste filtro.</p>
      <div style="display:flex;gap:8px;margin-top:8px;">
        ${qtdOptions.map(n => `<button class="btn btn-ghost btn-sm" data-action="quiz-start" data-n="${n}" data-modo="${modo}" data-area="${esc(params.area||'')}" ${(modo==='especifica' && !params.area) ? 'disabled' : ''}>${n}</button>`).join('')}
        <button class="btn btn-ghost btn-sm" data-action="quiz-start" data-n="0" data-modo="${modo}" data-area="${esc(params.area||'')}" ${(modo==='especifica' && !params.area) ? 'disabled' : ''}>Tudo</button>
      </div>
      <button class="btn btn-primary btn-block" style="margin-top:12px;" data-action="quiz-start" data-n="10" data-modo="${modo}" data-area="${esc(params.area||'')}" ${(modo==='especifica' && !params.area) ? 'disabled' : ''}>
        Começar (10 questões)
      </button>
    </div>
  `;
}

function renderQuiz() {
  const q = STATE._quiz;
  if (!q || q.idx >= q.pool.length) {
    if (q) {
      return renderQuizSummary(q);
    }
    return `<p>Nenhum quiz ativo.</p>`;
  }
  const item = q.pool[q.idx];
  const answered = q.answered[q.idx];
  const optKeys = Object.keys(item.options);

  const options = optKeys.map(letter => {
    let cls = 'option';
    if (answered) {
      if (letter === item.correct) cls += ' correct';
      else if (letter === answered) cls += ' wrong';
      cls += ' disabled';
    }
    return `<button class="${cls}" data-action="answer" data-letter="${letter}"><b>${letter})</b>${esc(item.options[letter])}</button>`;
  }).join('');

  let explainHtml = '';
  if (answered) {
    const exp = item.explanations && (item.explanations[item.correct] || item.explanations['geral'] || item.explanations[answered]);
    const isCorrect = answered === item.correct;
    explainHtml = `<div class="explain ${isCorrect ? '' : 'wrong-box'}">
      <b>${isCorrect ? '✓ Você acertou.' : '✗ Resposta correta: ' + item.correct}</b><br>
      ${exp ? esc(exp) : ''}
    </div>
    <button class="btn btn-primary btn-block" style="margin-top:12px;" data-action="quiz-next">
      ${q.idx + 1 >= q.pool.length ? 'Ver resultado' : 'Próxima questão →'}
    </button>`;
  }

  return `
    <div class="back-link" data-action="quiz-exit">&larr; Sair do quiz</div>
    <div class="quiz-meta"><span>${item.area}</span><span>${q.idx+1} / ${q.pool.length}</span></div>
    <div class="progress-track" style="margin-bottom:14px;"><div class="progress-fill" style="width:${((q.idx)/q.pool.length)*100}%"></div></div>
    <div class="card">
      <p style="font-weight:500;">${esc(item.stem)}</p>
    </div>
    ${options}
    ${explainHtml}
  `;
}

function renderQuizSummary(q) {
  const acertos = q.answered.filter((a, i) => a === q.pool[i].correct).length;
  const p = Math.round((acertos / q.pool.length) * 100);
  return `
    <div class="empty">
      <span class="eyebrow">Resultado</span>
      <h1>${acertos} / ${q.pool.length}</h1>
      <p class="mute">${p}% de acerto neste bloco.</p>
      <div style="display:flex; gap:10px; justify-content:center; margin-top:16px;">
        <button class="btn btn-ghost" data-action="quiz-exit">Voltar</button>
        <button class="btn btn-primary" data-action="quiz-retry">Refazer</button>
      </div>
    </div>
  `;
}

/* ================= DISCURSIVA ================= */
function renderDiscursivaList() {
  const cards = DATA.discursiva.propostas.map(p => {
    const score = STATE.discursivaScores[p.id];
    return `<div class="card tap" data-go="discursiva-detail" data-id="${p.id}">
      <div class="card-row">
        <div><h3>${esc(p.titulo)}</h3><p class="mute">${esc(p.objetos)}</p></div>
        ${score ? `<span class="badge alt">${score.percentual}%</span>` : ''}
      </div>
    </div>`;
  }).join('');
  return `
    <span class="eyebrow">Kit da discursiva</span>
    <h1>6 propostas comentadas</h1>
    <p class="mute">Arquitetura de 5 blocos em 30 linhas. Escreva antes de ler o modelo.</p>
    ${cards}
  `;
}

function renderDiscursivaDetail(params) {
  const p = DATA.discursiva.propostas.find(x => x.id == params.id);
  if (!p) return '<p>Não encontrada.</p>';
  return `
    <div class="back-link" data-go="discursiva">&larr; Discursiva</div>
    <span class="eyebrow">${esc(p.objetos)}</span>
    <h1>${esc(p.titulo)}</h1>
    <div class="card">
      <h3>Textos motivadores</h3>
      ${p.textos_motivadores.map(t => `<p class="mute">${esc(t)}</p>`).join('<hr class="divider">')}
    </div>
    <div class="card" style="background:var(--ink); border:none;">
      <h3 style="color:#fff;">Comando</h3>
      <p style="color:var(--paper);">${esc(p.comando)}</p>
    </div>
    <button class="btn btn-primary btn-block" data-go="discursiva-write" data-id="${p.id}">Escrever (30 min)</button>
  `;
}

function renderDiscursivaWrite(params) {
  const p = DATA.discursiva.propostas.find(x => x.id == params.id);
  if (!p) return '<p>Não encontrada.</p>';
  return `
    <div class="back-link" data-go="discursiva-detail" data-id="${p.id}">&larr; Voltar</div>
    <span class="eyebrow">${esc(p.titulo)}</span>
    <div class="timer" id="timer">30:00</div>
    <p class="mute" style="text-align:center;">Alvo: 15 a 30 linhas · 380–420 palavras</p>
    <textarea id="texto-discursiva" placeholder="Escreva sua resposta aqui..."></textarea>
    <button class="btn btn-primary btn-block" data-action="corrigir-ia" data-id="${p.id}">✦ Corrigir com IA</button>
    <div style="display:flex; gap:10px; margin-top:10px;">
      <button class="btn btn-ghost btn-block" data-action="ver-modelo" data-id="${p.id}">Ver modelo</button>
      <button class="btn btn-ghost btn-block" data-go="discursiva-check" data-id="${p.id}">Autocorrigir manualmente</button>
    </div>
    <div id="modelo-box"></div>
  `;
}

function renderDiscursivaIA(params) {
  const p = DATA.discursiva.propostas.find(x => x.id == params.id);
  const r = STATE._iaResult;
  if (!p) return '<p>Não encontrada.</p>';
  if (!r || r.id != params.id) {
    return `
      <div class="back-link" data-go="discursiva-write" data-id="${p.id}">&larr; Voltar</div>
      <div class="empty"><p>Nenhuma correção por IA disponível ainda. Volte ao texto e peça a correção.</p></div>
    `;
  }
  const crits = DATA.discursiva.checklist_criterios;
  const corTexto = { sim: 'var(--ok)', parcial: 'var(--gold)', nao: 'var(--bad)' };
  const rotulo = { sim: 'Sim', parcial: 'Parcial', nao: 'Não' };
  const items = crits.map(c => {
    const val = (r.data.criterios && r.data.criterios[c.id]) || 'nao';
    return `<div class="checklist-item">
      <div style="flex:1;"><b style="font-size:.88rem;">${esc(c.nome)}</b><p class="mute" style="margin:2px 0 0;">${esc(c.pergunta)}</p></div>
      <span class="badge" style="background:${corTexto[val] || 'var(--bad)'};color:#fff;">${rotulo[val] || 'Não'}</span>
    </div>`;
  }).join('');
  const pontos = (r.data.pontos_fortes || []).map(x => `<li>${esc(x)}</li>`).join('');
  return `
    <div class="back-link" data-go="discursiva-write" data-id="${p.id}">&larr; Voltar ao texto</div>
    <span class="eyebrow">Correção por IA</span>
    <h1>${esc(p.titulo)}</h1>
    <div class="card">${items}</div>
    <div class="card">
      <h3>Pontos fortes</h3>
      <ul>${pontos}</ul>
      <h3>Principal fragilidade</h3>
      <p>${esc(r.data.principal_fragilidade || '')}</p>
      <h3>Sugestão de reescrita</h3>
      <p>${esc(r.data.sugestao_reescrita || '')}</p>
      <h3>Comentário geral</h3>
      <p>${esc(r.data.comentario_geral || '')}</p>
    </div>
    <button class="btn btn-primary btn-block" data-go="discursiva-check" data-id="${p.id}">Continuar para autocorreção manual →</button>
  `;
}

function renderDiscursivaCheck(params) {
  const p = DATA.discursiva.propostas.find(x => x.id == params.id);
  const crits = DATA.discursiva.checklist_criterios;
  const items = crits.map(c => `
    <div class="checklist-item">
      <div style="flex:1;">
        <b style="font-size:.88rem;">${esc(c.nome)}</b>
        <p class="mute" style="margin:2px 0 0;">${esc(c.pergunta)}</p>
      </div>
      <div class="seg" data-crit="${c.id}">
        <button data-val="sim">Sim</button>
        <button data-val="parcial">Parc.</button>
        <button data-val="nao">Não</button>
      </div>
    </div>`).join('');
  const notasSalvas = STATE.reescritaNotas[p.id] || {};
  const planoFields = (DATA.discursiva.plano_reescrita || []).map(f => `
    <div style="margin-bottom:12px;">
      <label class="mute" style="display:block;margin-bottom:4px;font-weight:600;">${esc(f.label)}:</label>
      <textarea data-plano="${f.id}" style="min-height:70px;">${esc(notasSalvas[f.id] || '')}</textarea>
    </div>`).join('');
  return `
    <div class="back-link" data-go="discursiva-write" data-id="${p.id}">&larr; Voltar ao texto</div>
    <span class="eyebrow">Checklist de autocorreção</span>
    <h1>${esc(p.titulo)}</h1>
    <div class="card">${items}</div>
    <div class="card">
      <h2>Plano de reescrita</h2>
      ${planoFields}
    </div>
    <button class="btn btn-primary btn-block" data-action="save-check" data-id="${p.id}">Salvar autocorreção</button>
  `;
}

/* ================= PLANNER ================= */
function renderPlanner() {
  const weeks = DATA.planner.semanas.map(w => {
    const days = w.dias.map((d, i) => {
      const key = `${w.n}-${i}`;
      const done = !!STATE.plannerDone[key];
      return `<div class="day-row ${done?'done':''}">
        <input type="checkbox" data-action="toggle-day" data-key="${key}" ${done?'checked':''}>
        <div><span class="day-name">${esc(d.dia)}</span><span class="day-task">${esc(d.tarefa)}</span></div>
      </div>`;
    }).join('');
    const totalDone = w.dias.filter((d,i) => STATE.plannerDone[`${w.n}-${i}`]).length;
    return `<div class="card">
      <span class="eyebrow">Semana ${w.n} de 7 · ${totalDone}/${w.dias.length}</span>
      <h3>${esc(w.titulo)}</h3>
      <p class="mute">${esc(w.resumo)}</p>
      <hr class="divider">
      ${days}
    </div>`;
  }).join('');
  const dias = daysUntil(DATA.planner.data_prova);
  const retaFinalCard = `
    <div class="card tap" data-go="planner-10dias" style="background:var(--rust);border:none;">
      <div class="card-row">
        <div><h3 style="color:#fff">Reta Final · últimos 10 dias</h3><p class="mute" style="color:var(--rust-soft)">${dias >= 0 && dias <= 10 ? 'Ative agora: faltam ' + dias + ' dias.' : 'Roteiro de emergência para quando faltar pouco tempo.'}</p></div>
        <span class="badge">Abrir</span>
      </div>
    </div>`;

  return `
    <span class="eyebrow">Planner adaptativo</span>
    <h1>7 semanas · 49 tarefas</h1>
    <p class="mute">Uma tarefa por dia. Domingo é revisão espaçada, sábado é discursiva.</p>
    ${retaFinalCard}
    ${weeks}
  `;
}

/* ================= RETA FINAL · 10 DIAS ================= */
function renderRetaFinal10() {
  const rf = DATA.retaFinal10;
  const dias = rf.dias.map(d => {
    const done = !!STATE.retaFinalDone[d.dia];
    return `<div class="day-row ${done ? 'done' : ''}">
      <input type="checkbox" data-action="toggle-rf-dia" data-key="${d.dia}" ${done ? 'checked' : ''}>
      <div><span class="day-name">${esc(d.dia)} · ${esc(d.titulo)}</span><span class="day-task">${esc(d.tarefa)}</span></div>
    </div>`;
  }).join('');

  const checklist = rf.checklist_prova.map((item, i) => {
    const done = !!STATE.provaChecklistDone[i];
    return `<div class="day-row ${done ? 'done' : ''}">
      <input type="checkbox" data-action="toggle-prova-item" data-key="${i}" ${done ? 'checked' : ''}>
      <div><span class="day-task">${esc(item)}</span></div>
    </div>`;
  }).join('');

  return `
    <div class="back-link" data-go="planner">&larr; Planner</div>
    <span class="eyebrow">Ativação final</span>
    <h1>Reta Final · 10 dias</h1>
    <p class="mute">${esc(rf.intro)}</p>
    <div class="card">
      <h2>Roteiro D-10 a D-1</h2>
      ${dias}
    </div>
    <div class="card">
      <h2>Checklist do dia da prova</h2>
      ${checklist}
    </div>
  `;
}

/* ---------------- Handlers ---------------- */
function attachHandlers() {
  main.querySelectorAll('[data-go]').forEach(el => {
    el.addEventListener('click', () => {
      const view = el.dataset.go;
      const params = {};
      if (el.dataset.id !== undefined) params.id = el.dataset.id;
      if (el.dataset.area) params.area = el.dataset.area;
      go(view, params);
    });
  });

  main.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', (e) => handleAction(el, e));
  });
}

function handleAction(el, e) {
  const action = el.dataset.action;
  if (!action) return;

  if (action === 'flash-next') {
    STATE._flashIdx = (STATE._flashIdx || 0) + 1;
    render();
  }
  if (action === 'flash-restart') {
    STATE._flashDeck = shuffle(allPegadinhas());
    STATE._flashIdx = 0;
    render();
  }

  if (action === 'qmodo') {
    go('questoes', { modo: el.dataset.modo });
  }
  if (action === 'qarea') {
    go('questoes', { modo: 'especifica', area: el.dataset.area });
  }
  if (action === 'quiz-start') {
    startQuiz(el.dataset.modo, el.dataset.area, parseInt(el.dataset.n, 10));
  }
  if (action === 'answer') {
    submitAnswer(el.dataset.letter);
  }
  if (action === 'quiz-next') {
    STATE._quiz.idx += 1;
    render();
  }
  if (action === 'quiz-exit') {
    STATE._quiz = null;
    go('questoes');
  }
  if (action === 'quiz-retry') {
    const modo = STATE._quiz.modo, area = STATE._quiz.area, n = STATE._quiz.pool.length;
    startQuiz(modo, area, n);
  }
  if (action === 'ver-modelo') {
    const p = DATA.discursiva.propostas.find(x => x.id == el.dataset.id);
    const box = document.getElementById('modelo-box');
    box.innerHTML = `<div class="card" style="margin-top:12px;"><h3>Modelo de resposta</h3><p style="white-space:pre-line; font-size:.88rem; line-height:1.6;">${esc(p.modelo)}</p></div>`;
  }
  if (action === 'save-check') {
    saveDiscursivaCheck(el.dataset.id);
  }
  if (action === 'corrigir-ia') {
    corrigirComIA(el.dataset.id, el);
  }
  if (action === 'toggle-day') {
    const key = el.dataset.key;
    STATE.plannerDone[key] = el.checked;
    saveState();
  }
  if (action === 'toggle-rf-dia') {
    STATE.retaFinalDone[el.dataset.key] = el.checked;
    saveState();
    render();
  }
  if (action === 'toggle-prova-item') {
    STATE.provaChecklistDone[el.dataset.key] = el.checked;
    saveState();
    render();
  }
}

// flip flashcard on tap (delegated, since card is re-rendered)
main.addEventListener('click', (e) => {
  const fc = e.target.closest('#fc');
  if (fc) fc.classList.toggle('flipped');
});

/* ---------------- Quiz engine ---------------- */
function startQuiz(modo, area, n) {
  let pool;
  if (modo === 'especifica') {
    pool = DATA.questoes.filter(q => q.fonte === 'vol' && q.area === area);
  } else {
    pool = DATA.questoes.filter(q => q.fonte !== 'vol');
  }
  pool = shuffle(pool);
  if (n && n > 0) pool = pool.slice(0, n);
  STATE._quiz = { modo, area, pool, idx: 0, answered: [] };
  go('questoes-quiz');
}

function submitAnswer(letter) {
  const q = STATE._quiz;
  if (q.answered[q.idx] !== undefined) return;
  const item = q.pool[q.idx];
  const correct = letter === item.correct;
  q.answered[q.idx] = letter;

  STATE.counters.questoesRespondidas += 1;
  if (item.eixo) bump(STATE.eixoStats, item.eixo, correct);
  if (item.fonte === 'vol') bump(STATE.areaStats, item.area, correct);
  saveState();
  render();
}

async function corrigirComIA(id, btn) {
  const p = DATA.discursiva.propostas.find(x => x.id == id);
  const textarea = document.getElementById('texto-discursiva');
  const texto = textarea ? textarea.value.trim() : '';
  if (texto.length < 50) {
    alert('Escreva pelo menos algumas linhas antes de pedir a correção por IA.');
    return;
  }
  const originalLabel = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Corrigindo com IA…'; }
  try {
    const resp = await fetch('/api/corrigir-discursiva', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ texto, comando: p.comando, titulo: p.titulo })
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Falha na correção.');
    STATE._iaResult = { id, data };
    go('discursiva-ia', { id });
  } catch (e) {
    alert('Não foi possível corrigir com IA agora: ' + e.message);
    if (btn) { btn.disabled = false; btn.textContent = originalLabel; }
  }
}

function saveDiscursivaCheck(id) {
  const crits = DATA.discursiva.checklist_criterios;
  const vals = {};
  let score = 0;
  crits.forEach(c => {
    const seg = main.querySelector(`.seg[data-crit="${c.id}"]`);
    const selected = seg.querySelector('.sel-sim, .sel-parcial, .sel-nao');
    const val = selected ? (selected.classList.contains('sel-sim') ? 'sim' : selected.classList.contains('sel-parcial') ? 'parcial' : 'nao') : null;
    vals[c.id] = val;
    if (val === 'sim') score += 1;
    if (val === 'parcial') score += 0.5;
  });
  const percentual = Math.round((score / crits.length) * 100);
  const isNew = !STATE.discursivaScores[id];
  STATE.discursivaScores[id] = { criterios: vals, score, percentual, data: new Date().toISOString() };
  if (isNew) STATE.counters.discursivasEscritas += 1;

  const notas = {};
  main.querySelectorAll('[data-plano]').forEach(t => { notas[t.dataset.plano] = t.value; });
  STATE.reescritaNotas[id] = notas;

  saveState();
  go('discursiva');
}

// segment buttons (sim/parcial/não) — delegated because rendered dynamically
main.addEventListener('click', (e) => {
  const btn = e.target.closest('.seg button');
  if (!btn) return;
  const seg = btn.parentElement;
  seg.querySelectorAll('button').forEach(b => b.classList.remove('sel-sim', 'sel-parcial', 'sel-nao'));
  btn.classList.add('sel-' + btn.dataset.val);
});

/* ---------------- Timer (discursiva) ---------------- */
let timerInterval = null;
function startTimer() {
  clearInterval(timerInterval);
  let seconds = 30 * 60;
  const el = document.getElementById('timer');
  if (!el) return;
  timerInterval = setInterval(() => {
    seconds -= 1;
    if (seconds < 0) { clearInterval(timerInterval); return; }
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    el.textContent = `${m}:${s}`;
  }, 1000);
}

/* ---------------- Tabbar ---------------- */
document.querySelectorAll('nav.tabbar button').forEach(btn => {
  btn.addEventListener('click', () => {
    STATE._quiz = null;
    STATE._flashIdx = undefined;
    go(btn.dataset.tab);
  });
});

/* ---------------- Boot ---------------- */
async function boot() {
  await loadAllData();
  render();
  updateTabbar();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

const _origRender = render;
render = function () {
  _origRender();
  if (ROUTE.view === 'discursiva-write') startTimer();
};

boot();
