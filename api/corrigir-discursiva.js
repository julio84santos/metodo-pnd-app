// Vercel Serverless Function (Node runtime).
// Recebe o texto da discursiva e devolve uma correcao estruturada gerada por IA.
// Requer a variavel de ambiente ANTHROPIC_API_KEY configurada no painel da Vercel.

const CRITERIOS = [
  { id: 'comando', nome: 'Atendimento ao comando', pergunta: 'Respondeu a todos os verbos e recortes solicitados?' },
  { id: 'tese', nome: 'Tese', pergunta: 'A posição do autor aparece no primeiro parágrafo?' },
  { id: 'analise', nome: 'Análise', pergunta: 'Explicou causas, efeitos ou tensões do problema?' },
  { id: 'contexto', nome: 'Contexto escolar', pergunta: 'Concretizou a discussão em práticas e relações escolares?' },
  { id: 'fundamentacao', nome: 'Fundamentação', pergunta: 'Usou legislação, conceito ou autor pertinente?' },
  { id: 'intervencao', nome: 'Intervenção', pergunta: 'Indicou agente, ação, meio e finalidade viáveis?' },
  { id: 'coesao', nome: 'Coesão', pergunta: 'Conectivos mostram relações entre ideias?' },
  { id: 'vocabulario', nome: 'Precisão vocabular', pergunta: 'Empregou termos pedagógicos corretamente?' },
  { id: 'norma', nome: 'Norma padrão', pergunta: 'Concordância, pontuação e ortografia estão corretas?' },
  { id: 'extensao', nome: 'Extensão e legibilidade', pergunta: 'Manteve entre 15 e 30 linhas, com estrutura legível?' }
];

// Confere se o token de sessao enviado pertence a uma conta do plano Completo.
// Evita que alguem chame esse endpoint (que tem custo real de IA) sem passar
// pelo botao, mesmo que ele esteja escondido na tela pra quem e Essencial.
async function usuarioTemPlanoCompleto(token) {
  const supabaseUrl = process.env.SUPABASE_URL;
  // Chave publica (mesma usada no navegador em js/auth.js) -- segura para expor.
  const anonKey = 'sb_publishable_r-OHCEFnO8T-YvSPVUGXYA_dEJE4LZx';
  if (!token || !supabaseUrl) return false;
  try {
    const r = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return false;
    const user = await r.json();
    const plano = user?.app_metadata?.plano || 'completo';
    return plano === 'completo';
  } catch (e) {
    return false;
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY não configurada no servidor.' });
    return;
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const liberado = await usuarioTemPlanoCompleto(token);
  if (!liberado) {
    res.status(403).json({ error: 'A correção por IA faz parte do plano Completo.' });
    return;
  }

  const { texto, comando, titulo } = req.body || {};
  if (!texto || typeof texto !== 'string' || texto.trim().length < 50) {
    res.status(400).json({ error: 'Envie um texto com pelo menos 50 caracteres.' });
    return;
  }

  const criteriosLista = CRITERIOS.map(c => `- ${c.id}: ${c.nome} — ${c.pergunta}`).join('\n');

  const systemPrompt = `Você é um corretor especialista em bancas de concurso público, avaliando redações dissertativo-argumentativas de Formação Pedagógica Geral para a Prova Nacional Docente (PND) 2026.

Avalie o texto do candidato exclusivamente segundo os 10 critérios abaixo, cada um classificado como "sim", "parcial" ou "nao":
${criteriosLista}

Responda ESTRITAMENTE em JSON válido, sem markdown, sem texto fora do JSON, no formato:
{
  "criterios": { "comando": "sim|parcial|nao", "tese": "sim|parcial|nao", "analise": "sim|parcial|nao", "contexto": "sim|parcial|nao", "fundamentacao": "sim|parcial|nao", "intervencao": "sim|parcial|nao", "coesao": "sim|parcial|nao", "vocabulario": "sim|parcial|nao", "norma": "sim|parcial|nao", "extensao": "sim|parcial|nao" },
  "pontos_fortes": ["...", "..."],
  "principal_fragilidade": "descrição objetiva do maior problema do texto",
  "sugestao_reescrita": "uma ação concreta e específica para a próxima versão",
  "comentario_geral": "2 a 4 frases de devolutiva direta e construtiva"
}`;

  const userPrompt = `Comando da proposta (${titulo || 'sem título'}): ${comando || 'não informado'}

Texto do candidato:
"""
${texto.trim()}
"""`;

  try {
    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      res.status(502).json({ error: 'Falha ao consultar a IA.', detail: errText });
      return;
    }

    const data = await apiRes.json();
    const raw = (data.content && data.content[0] && data.content[0].text) || '';
    let parsed;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch (e) {
      res.status(502).json({ error: 'Resposta da IA em formato inesperado.', raw });
      return;
    }

    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao processar a correção.', detail: String(e) });
  }
};
