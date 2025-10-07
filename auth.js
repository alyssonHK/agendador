// Autenticação Firebase
let auth;
let currentUser = null;

// Elementos do DOM
const loginScreen = document.getElementById('login-screen');
const loginForm = document.getElementById('login-form');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const userEmailDisplay = document.getElementById('user-email');
const container = document.querySelector('.container');
const resetPasswordLink = document.getElementById('reset-password-link');

// Inicializar autenticação quando o Firebase estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Aguardar Firebase inicializar
    setTimeout(() => {
        auth = firebase.auth();
        setupAuthListeners();
    }, 100);
});

// Configurar listeners de autenticação
function setupAuthListeners() {
    // Observer de estado de autenticação
    auth.onAuthStateChanged((user) => {
        if (user) {
            // Usuário logado
            currentUser = user;
            showMainApp();
            updateUserDisplay(user.email);
        } else {
            // Usuário não logado
            currentUser = null;
            showLoginScreen();
        }
    });

    // Listener do formulário de login
    loginForm.addEventListener('submit', handleLogin);

    // Listener do botão de logout
    logoutBtn.addEventListener('click', handleLogout);

    // Listener do link de recuperação de senha
    resetPasswordLink.addEventListener('click', handlePasswordReset);
}

// Fazer login
async function handleLogin(e) {
    e.preventDefault();

    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    // Desabilitar botão durante o processo
    const submitBtn = loginForm.querySelector('.btn-login');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Entrando...';

    try {
        await auth.signInWithEmailAndPassword(email, password);
        // O onAuthStateChanged vai lidar com o redirecionamento
        hideError();
    } catch (error) {
        console.error('Erro no login:', error);
        showError(getErrorMessage(error.code));

        // Reabilitar botão
        submitBtn.disabled = false;
        submitBtn.textContent = 'Entrar';
    }
}

// Fazer logout
async function handleLogout() {
    if (!confirm('Deseja realmente sair?')) {
        return;
    }

    try {
        await auth.signOut();
        // O onAuthStateChanged vai lidar com o redirecionamento
    } catch (error) {
        console.error('Erro no logout:', error);
        alert('Erro ao fazer logout. Tente novamente.');
    }
}

// Recuperar senha
async function handlePasswordReset(e) {
    e.preventDefault();

    const email = prompt('Digite seu e-mail para recuperar a senha:');

    if (!email) {
        return;
    }

    try {
        await auth.sendPasswordResetEmail(email);
        alert('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
    } catch (error) {
        console.error('Erro ao recuperar senha:', error);
        alert(getErrorMessage(error.code));
    }
}

// Mostrar tela de login
function showLoginScreen() {
    loginScreen.classList.remove('hidden');
    container.style.display = 'none';
    loginForm.reset();
    hideError();
}

// Mostrar aplicação principal
function showMainApp() {
    loginScreen.classList.add('hidden');
    container.style.display = 'block';
}

// Atualizar display do usuário
function updateUserDisplay(email) {
    userEmailDisplay.textContent = email;
}

// Mostrar erro
function showError(message) {
    loginError.textContent = message;
    loginError.classList.add('show');
}

// Esconder erro
function hideError() {
    loginError.textContent = '';
    loginError.classList.remove('show');
}

// Traduzir mensagens de erro do Firebase
function getErrorMessage(errorCode) {
    const errorMessages = {
        'auth/invalid-email': 'E-mail inválido.',
        'auth/user-disabled': 'Esta conta foi desabilitada.',
        'auth/user-not-found': 'Usuário não encontrado.',
        'auth/wrong-password': 'Senha incorreta.',
        'auth/invalid-credential': 'E-mail ou senha incorretos.',
        'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
        'auth/network-request-failed': 'Erro de conexão. Verifique sua internet.',
        'auth/email-already-in-use': 'Este e-mail já está em uso.',
        'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
    };

    return errorMessages[errorCode] || 'Erro ao fazer login. Tente novamente.';
}

// Verificar se usuário está autenticado (para usar em app.js)
function isUserAuthenticated() {
    return currentUser !== null;
}

// Obter usuário atual
function getCurrentUser() {
    return currentUser;
}

console.log('Sistema de autenticação carregado!');
