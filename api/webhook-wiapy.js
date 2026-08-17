// Vercel Serverless Function (Node runtime).
// Recebe o webhook de compra aprovada da Wiapy e libera o acesso do
// comprador criando/convidando a conta no Supabase Auth.
//
// Configuracao necessaria (Vercel -> Settings -> Environment Variables):
//   SUPABASE_URL              - URL do projeto Supabase (ex: https://xxxx.supabase.co)
//   SUPABASE_SERVICE_ROLE_KEY - a "Secret key" do Supabase (Settings -> API Keys).
//                               NUNCA vai para o navegador, so existe aqui no servidor.
//   WIAPY_WEBHOOK_SECRET      - um segredo escolhido por voce.
//
// Na Wiapy, configure a URL do webhook como:
//   https://SEU-APP.vercel.app/api/webhook-wiapy?token=SEU_SEGREDO

function extractEmail(body) {
  const candidates = [
    body?.email,
    body?.customer?.email,
    body?.buyer?.email,
    body?.data?.email,
    body?.data?.customer?.email,
    body?.data?.buyer?.email,
    body?.payload?.email,
    body?.payload?.customer?.email,
  ];
  return candidates.find((v) => typeof v === 'string' && v.includes('@'));
}

function extractStatus(body) {
  return (
    body?.status || body?.event || body?.data?.status || body?.payload?.status || ''
  ).toString().toLowerCase();
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  const secret = process.env.WIAPY_WEBHOOK_SECRET;
  if (secret && req.query.token !== secret) {
    res.status(401).json({ error: 'Token inválido.' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    res.status(500).json({ error: 'Supabase não configurado no servidor.' });
    return;
  }

  const body = req.body || {};
  console.log('Webhook Wiapy recebido:', JSON.stringify(body));

  const email = extractEmail(body);
  const status = extractStatus(body);

  if (!email) {
    res.status(400).json({ error: 'E-mail não encontrado no payload.', body });
    return;
  }

  // So libera acesso em eventos de compra aprovada/paga.
  const statusesAprovados = ['paid', 'approved', 'completed', 'complete', 'success', 'aprovada', 'aprovado', 'pago'];
  const isApproved = statusesAprovados.some((s) => status.includes(s));
  if (status && !isApproved) {
    res.status(200).json({ ok: true, skipped: true, reason: 'status não é de compra aprovada: ' + status });
    return;
  }

  try {
    const appUrl = process.env.APP_URL || 'https://metodo-pnd-app.vercel.app/';
    const inviteRes = await fetch(`${supabaseUrl}/auth/v1/invite?redirect_to=${encodeURIComponent(appUrl)}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ email }),
    });
    const result = await inviteRes.json();

    if (!inviteRes.ok) {
      const msg = (result && (result.msg || result.message)) || JSON.stringify(result);
      if (inviteRes.status === 422 || /already registered|already exists/i.test(msg)) {
        res.status(200).json({ ok: true, alreadyExists: true });
        return;
      }
      console.error('Erro ao convidar usuário:', msg);
      res.status(500).json({ error: msg });
      return;
    }

    res.status(200).json({ ok: true, userId: result?.id });
  } catch (e) {
    console.error('Erro no webhook:', e);
    res.status(500).json({ error: 'Erro ao processar o webhook.', detail: String(e) });
  }
};
