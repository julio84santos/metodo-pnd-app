/* ---------------- Autenticação (Supabase) ---------------- */

(function () {

  const SUPABASE_URL =
    'https://bvopioeudscyrgxakbcm.supabase.co';

  const SUPABASE_ANON_KEY =
    'sb_publishable_r-OHCEFnO8T-YvSPVUGXYA_dEJE4LZx';


  const sb = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );


  window.SB = sb;


  const authScreen =
    document.getElementById('auth-screen');

  const authContent =
    document.getElementById('auth-content');

  const appRoot =
    document.getElementById('app');



  /* =====================================================
     UTILITÁRIOS
  ====================================================== */

  function showAuth() {

    if (appRoot) {
      appRoot.style.display = 'none';
    }

    if (authScreen) {
      authScreen.style.display = 'flex';
    }

  }



  function hideAuth() {

    if (authScreen) {
      authScreen.style.display = 'none';
    }

  }



  function showAppRoot() {

    hideAuth();

    if (appRoot) {
      appRoot.style.display = 'flex';
    }

  }



  function clearUserAccess() {

    window.USER_PLANO = null;

    window.USER_ROLE = 'user';

    window.IS_ADMIN = false;

  }



  /* =====================================================
     LEITURA E VALIDAÇÃO DE ACESSO
  ====================================================== */

  async function loadUserAccess() {

    const {
      data: { session },
      error
    } = await sb.auth.getSession();


    if (error) {

      console.error(
        'Erro ao recuperar sessão:',
        error
      );

      clearUserAccess();

      return {
        ok: false,
        reason: 'session_error'
      };

    }


    if (!session?.user) {

      clearUserAccess();

      return {
        ok: false,
        reason: 'no_session'
      };

    }


    const metadata =
      session.user.app_metadata || {};


    const plano =
      metadata.plano;


    const role =
      metadata.role === 'admin'
        ? 'admin'
        : 'user';


    const isAdmin =
      role === 'admin';


    /*
      Planos aceitos no sistema

      - essencial
      - completo

      Admin:
      - pode acessar independentemente do plano
    */

    const planosPermitidos = [
      'essencial',
      'completo'
    ];


    /*
      Administrador recebe acesso completo
      na interface do aplicativo.
    */

    if (isAdmin) {

      window.USER_PLANO = 'completo';

      window.USER_ROLE = 'admin';

      window.IS_ADMIN = true;


      return {
        ok: true,
        session,
        plano: 'completo',
        role: 'admin',
        isAdmin: true
      };

    }


    /*
      Usuário comum precisa obrigatoriamente
      possuir um plano válido.

      NÃO existe mais fallback para "completo".
    */

    if (
      !plano ||
      !planosPermitidos.includes(plano)
    ) {

      clearUserAccess();


      return {
        ok: false,
        reason: 'invalid_plan',
        session
      };

    }


    window.USER_PLANO =
      plano;


    window.USER_ROLE =
      role;


    window.IS_ADMIN =
      false;


    return {
      ok: true,
      session,
      plano,
      role,
      isAdmin: false
    };

  }



  /* =====================================================
     LIBERAÇÃO DO APP
  ====================================================== */

  async function showApp() {

    const access =
      await loadUserAccess();


    if (!access.ok) {

      /*
        Sem sessão:
        mostra login normalmente.
      */

      if (
        access.reason === 'no_session'
      ) {

        showAuth();

        renderLoginForm();

        return;

      }


      /*
        Usuário autenticado, mas sem plano válido.
        Desloga para impedir acesso acidental.
      */

      if (
        access.reason === 'invalid_plan'
      ) {

        await sb.auth.signOut();


        showAuth();


        renderLoginForm(
          'Seu acesso ainda não foi liberado. Verifique a confirmação da sua compra.'
        );


        return;

      }


      /*
        Erro ao consultar sessão
      */

      showAuth();


      renderLoginForm(
        'Não foi possível validar seu acesso. Tente entrar novamente.'
      );


      return;

    }


    showAppRoot();


    /*
      Impede startApp() de rodar
      várias vezes na mesma sessão.
    */

    if (!window._appStarted) {

      window._appStarted = true;


      if (
        typeof window.startApp ===
        'function'
      ) {

        window.startApp();

      } else {

        console.error(
          'startApp() não foi encontrada.'
        );

      }

    }

  }



  /* =====================================================
     LOGIN
  ====================================================== */

  function renderLoginForm(errorMsg) {

    showAuth();


    authContent.innerHTML = `

      <h1>Entrar</h1>

      <p class="mute">
        Acesso liberado após confirmação da compra.
      </p>

      ${
        errorMsg
          ? `<p class="auth-error">${errorMsg}</p>`
          : ''
      }

      <form id="login-form">

        <label for="login-email">
          E-mail
        </label>

        <input
          type="email"
          id="login-email"
          required
          autocomplete="email"
        >


        <label for="login-password">
          Senha
        </label>

        <input
          type="password"
          id="login-password"
          required
          minlength="6"
          autocomplete="current-password"
        >


        <button
          type="submit"
          class="btn btn-primary btn-block"
        >
          Entrar
        </button>

      </form>


      <button
        class="auth-link"
        id="forgot-link"
        type="button"
      >
        Esqueci minha senha
      </button>

    `;



    const loginForm =
      document.getElementById(
        'login-form'
      );


    loginForm.addEventListener(
      'submit',
      async (e) => {

        e.preventDefault();


        const email =
          document
            .getElementById(
              'login-email'
            )
            .value
            .trim();


        const password =
          document
            .getElementById(
              'login-password'
            )
            .value;


        const btn =
          e.target.querySelector(
            'button[type="submit"]'
          );


        btn.disabled = true;

        btn.textContent =
          'Entrando…';



        const {
          error
        } =
          await sb.auth.signInWithPassword({

            email,
            password

          });



        if (error) {

          renderLoginForm(
            'E-mail ou senha incorretos.'
          );

          return;

        }


        /*
          Após login,
          showApp() valida o plano.
        */

        await showApp();

      }

    );



    const forgotLink =
      document.getElementById(
        'forgot-link'
      );


    forgotLink.addEventListener(
      'click',
      () => {

        renderForgotForm();

      }
    );

  }



  /* =====================================================
     RECUPERAÇÃO DE SENHA
  ====================================================== */

  function renderForgotForm(
    msg,
    errorMsg
  ) {

    showAuth();


    authContent.innerHTML = `

      <h1>Recuperar senha</h1>

      <p class="mute">
        Enviaremos um link para redefinir sua senha.
      </p>


      ${
        msg
          ? `<p class="auth-ok">${msg}</p>`
          : ''
      }


      ${
        errorMsg
          ? `<p class="auth-error">${errorMsg}</p>`
          : ''
      }


      <form id="forgot-form">

        <label for="forgot-email">
          E-mail
        </label>

        <input
          type="email"
          id="forgot-email"
          required
          autocomplete="email"
        >


        <button
          type="submit"
          class="btn btn-primary btn-block"
        >
          Enviar link
        </button>

      </form>


      <button
        class="auth-link"
        id="back-link"
        type="button"
      >
        Voltar
      </button>

    `;



    const forgotForm =
      document.getElementById(
        'forgot-form'
      );


    forgotForm.addEventListener(
      'submit',
      async (e) => {

        e.preventDefault();


        const email =
          document
            .getElementById(
              'forgot-email'
            )
            .value
            .trim();


        const btn =
          e.target.querySelector(
            'button[type="submit"]'
          );


        btn.disabled = true;

        btn.textContent =
          'Enviando…';



        const {
          error
        } =
          await sb.auth.resetPasswordForEmail(

            email,

            {

              redirectTo:
                window.location.origin +
                window.location.pathname

            }

          );



        /*
          Evita revelar se o e-mail
          existe ou não no Supabase.
        */

        if (error) {

          renderForgotForm(
            null,
            'Não foi possível enviar o link agora. Tente novamente.'
          );

          return;

        }


        renderForgotForm(
          'Se esse e-mail estiver cadastrado, você receberá um link.'
        );

      }

    );



    const backLink =
      document.getElementById(
        'back-link'
      );


    backLink.addEventListener(
      'click',
      () => {

        renderLoginForm();

      }
    );

  }



  /* =====================================================
     DEFINIÇÃO / ALTERAÇÃO DE SENHA
  ====================================================== */

  function renderSetPasswordForm() {

    showAuth();


    authContent.innerHTML = `

      <h1>Defina sua senha</h1>

      <p class="mute">
        Essa senha será usada para entrar no app.
      </p>


      <form id="setpw-form">

        <label for="setpw-password">
          Nova senha
        </label>

        <input
          type="password"
          id="setpw-password"
          required
          minlength="8"
          autocomplete="new-password"
        >


        <button
          type="submit"
          class="btn btn-primary btn-block"
        >
          Salvar senha e entrar
        </button>

      </form>

    `;



    const setPasswordForm =
      document.getElementById(
        'setpw-form'
      );


    setPasswordForm.addEventListener(
      'submit',
      async (e) => {

        e.preventDefault();


        const password =
          document
            .getElementById(
              'setpw-password'
            )
            .value;


        const btn =
          e.target.querySelector(
            'button[type="submit"]'
          );


        btn.disabled = true;

        btn.textContent =
          'Salvando…';



        const {
          error
        } =
          await sb.auth.updateUser({

            password

          });



        if (error) {

          btn.disabled = false;

          btn.textContent =
            'Salvar senha e entrar';


          alert(
            'Não foi possível salvar a senha: ' +
            error.message
          );


          return;

        }


        /*
          Limpa parâmetros/hash
          usados pelo fluxo de recuperação.
        */

        history.replaceState(
          null,
          '',
          window.location.pathname
        );


        await showApp();

      }

    );

  }



  /* =====================================================
     INICIALIZAÇÃO
  ====================================================== */

  async function init() {

    /*
      Supabase pode enviar alguns fluxos
      antigos via hash.
    */

    const hash =
      window.location.hash || '';


    if (
      hash.includes('type=invite') ||
      hash.includes('type=recovery')
    ) {

      showAuth();

      renderSetPasswordForm();

      return;

    }


    const {
      data: { session },
      error
    } =
      await sb.auth.getSession();



    if (error) {

      console.error(
        'Erro ao iniciar autenticação:',
        error
      );


      showAuth();


      renderLoginForm(
        'Não foi possível verificar sua sessão.'
      );


      return;

    }



    if (session?.user) {

      await showApp();

    } else {

      showAuth();

      renderLoginForm();

    }

  }



  /* =====================================================
     ALTERAÇÕES DE ESTADO DA AUTENTICAÇÃO
  ====================================================== */

  sb.auth.onAuthStateChange(
    async (
      event,
      session
    ) => {

      /*
        Logout
      */

      if (
        event ===
        'SIGNED_OUT'
      ) {

        clearUserAccess();

        window._appStarted =
          false;


        /*
          Evita reload desnecessário
          durante alguns fluxos internos.
        */

        if (
          appRoot &&
          appRoot.style.display !==
            'none'
        ) {

          location.reload();

        }

        return;

      }


      /*
        Login feito em outra aba,
        sessão renovada etc.

        Não chamamos showApp em todo
        TOKEN_REFRESHED para evitar
        reinicialização da interface.
      */

      if (
        event ===
        'SIGNED_IN' &&
        session?.user &&
        !window._appStarted
      ) {

        await showApp();

      }

    }

  );



  /* =====================================================
     LOGOUT
  ====================================================== */

  const logoutBtn =
    document.getElementById(
      'logout-btn'
    );


  if (logoutBtn) {

    logoutBtn.addEventListener(
      'click',
      async () => {

        logoutBtn.disabled =
          true;


        logoutBtn.textContent =
          'Saindo…';


        const {
          error
        } =
          await sb.auth.signOut();


        if (error) {

          logoutBtn.disabled =
            false;


          logoutBtn.textContent =
            'Sair';


          alert(
            'Não foi possível sair da conta.'
          );

        }

      }

    );

  }



  /* =====================================================
     INICIA AUTENTICAÇÃO
  ====================================================== */

  clearUserAccess();

  init();



})();
