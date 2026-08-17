/* ---------------- Autenticação (Supabase) ---------------- */
(function () {
  const SUPABASE_URL = 'https://bvopioeudscyrgxakbcm.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_r-OHCEFnO8T-YvSPVUGXYA_dEJE4LZx';
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.SB = sb;

  const authScreen = document.getElementById('auth-screen');
  const authContent = document.getElementById('auth-content');
  const appRoot = document.getElementById('app');

  async function showApp() {
    const { data: { session } } = await sb.auth.getSession();
    // Contas sem "plano" definido (ex: criadas manualmente no painel) contam
    // como completo, pra nao travar acesso de administrador/teste.
    window.USER_PLANO = (session && session.user && session.user.app_metadata && session.user.app_metadata.plano) || 'completo';
    authScreen.style.display = 'none';
    appRoot.style.display = 'flex';
    if (!window._appStarted) {
      window._appStarted = true;
      window.startApp();
    }
  }

  function showAuth() {
    appRoot.style.display = 'none';
    authScreen.style.display = 'flex';
  }

  function renderLoginForm(errorMsg) {
    authContent.innerHTML = `
      <h1>Entrar</h1>
      <p class="mute">Acesso liberado após a confirmação da compra.</p>
      ${errorMsg ? `<p class="auth-error">${errorMsg}</p>` : ''}
      <form id="login-form">
        <label>E-mail</label>
        <input type="email" id="login-email" required autocomplete="email">
        <label>Senha</label>
        <input type="password" id="login-password" required autocomplete="current-password">
        <button type="submit" class="btn btn-primary btn-block">Entrar</button>
      </form>
      <button class="auth-link" id="forgot-link" type="button">Esqueci minha senha</button>
    `;
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const btn = e.target.querySelector('button[type=submit]');
      btn.disabled = true; btn.textContent = 'Entrando…';
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        renderLoginForm('E-mail ou senha incorretos.');
        return;
      }
      showApp();
    });
    document.getElementById('forgot-link').addEventListener('click', () => renderForgotForm());
  }

  function renderForgotForm(msg) {
    authContent.innerHTML = `
      <h1>Recuperar senha</h1>
      <p class="mute">Enviaremos um link para redefinir sua senha.</p>
      ${msg ? `<p class="auth-ok">${msg}</p>` : ''}
      <form id="forgot-form">
        <label>E-mail</label>
        <input type="email" id="forgot-email" required autocomplete="email">
        <button type="submit" class="btn btn-primary btn-block">Enviar link</button>
      </form>
      <button class="auth-link" id="back-link" type="button">Voltar para login</button>
    `;
    document.getElementById('forgot-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('forgot-email').value.trim();
      const btn = e.target.querySelector('button[type=submit]');
      btn.disabled = true; btn.textContent = 'Enviando…';
      await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname });
      renderForgotForm('Se esse e-mail estiver cadastrado, você vai receber um link em instantes.');
    });
    document.getElementById('back-link').addEventListener('click', () => renderLoginForm());
  }

  function renderSetPasswordForm() {
    authContent.innerHTML = `
      <h1>Defina sua senha</h1>
      <p class="mute">Essa senha será usada para entrar no app da próxima vez.</p>
      <p class="auth-error" id="setpw-error" style="display:none;"></p>
      <form id="setpw-form">
        <label>Nova senha</label>
        <input type="password" id="setpw-password" required minlength="6" autocomplete="new-password">
        <button type="submit" class="btn btn-primary btn-block">Salvar senha e entrar</button>
      </form>
    `;
    document.getElementById('setpw-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('setpw-password').value;
      const btn = e.target.querySelector('button[type=submit]');
      const errBox = document.getElementById('setpw-error');
      btn.disabled = true; btn.textContent = 'Salvando…';
      const { error } = await sb.auth.updateUser({ password });
      if (error) {
        errBox.textContent = error.message;
        errBox.style.display = 'block';
        btn.disabled = false; btn.textContent = 'Salvar senha e entrar';
        return;
      }
      history.replaceState(null, '', window.location.pathname);
      showApp();
    });
  }

  async function init() {
    // Links de convite/recuperação do Supabase chegam com #access_token=...&type=invite|recovery
    const hash = window.location.hash;
    if (hash.includes('type=invite') || hash.includes('type=recovery')) {
      showAuth();
      renderSetPasswordForm();
      return;
    }

    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      showApp();
    } else {
      showAuth();
      renderLoginForm();
    }
  }

  sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      window._appStarted = false;
      location.reload();
    }
  });

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => sb.auth.signOut());

  init();
})();
