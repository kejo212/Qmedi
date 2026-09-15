// --- ESTADO GLOBAL ---
let bancoQuestoes = [];
let questoesFiltradas = [];
let paginaAtual = 1;
const QUESTOES_POR_PAGINA = 20;
let isLoginMode = true;

// --- ELEMENTOS DO DOM ---
const themeToggle = document.getElementById('theme-toggle');
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const btnLogout = document.getElementById('btn-logout');

// --- MODO ESCURO ---
themeToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

// Checa tema salvo
if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
}

// --- SISTEMA DE AUTENTICAÇÃO (MOCK) ---
document.getElementById('auth-switch-btn').addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    document.getElementById('auth-title').innerText = isLoginMode ? "Entrar" : "Cadastrar";
    document.getElementById('auth-submit').innerText = isLoginMode ? "Entrar" : "Criar Conta";
    document.getElementById('auth-switch-text').innerText = isLoginMode ? "Não tem conta?" : "Já tem conta?";
});

document.getElementById('auth-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;

    let users = JSON.parse(localStorage.getItem('users')) || {};

    if (isLoginMode) {
        if (users[user] && users[user] === pass) {
            iniciarApp(user);
        } else {
            alert("Usuário ou senha incorretos!");
        }
    } else {
        if (users[user]) {
            alert("Usuário já existe!");
        } else {
            users[user] = pass;
            localStorage.setItem('users', JSON.stringify(users));
            alert("Cadastro realizado! Você já está logado.");
            iniciarApp(user);
        }
    }
});

btnLogout.addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    window.location.reload();
});

function iniciarApp(username) {
    localStorage.setItem('currentUser', username);
    authScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    btnLogout.classList.remove('hidden');
    carregarDados();
}

// Checa se já está logado ao abrir
if (localStorage.getItem('currentUser')) {
    iniciarApp(localStorage.getItem('currentUser'));
}

// --- CARREGAMENTO E FILTROS DE QUESTÕES ---
async function carregarDados() {
    try {
        // Assume que o arquivo json está na mesma pasta no GitHub Pages
        const response = await fetch('banco_de_questoes_completo.json');
        bancoQuestoes = await response.json();

        preencherFiltros();
        aplicarFiltros();
    } catch (error) {
        document.getElementById('questoes-container').innerHTML =
        `<p class="text-red-500 text-center py-10">Erro ao carregar questoes. Verifique se o arquivo JSON está na pasta correta.</p>`;
    }
}

function preencherFiltros() {
    const materias = new Set();
    bancoQuestoes.forEach(q => {
        if(q.temas_dinamicos && q.temas_dinamicos[0]) {
            materias.add(q.temas_dinamicos[0]);
        }
    });

    const selectMateria = document.getElementById('filtro-materia');
    materias.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        selectMateria.appendChild(opt);
    });

    selectMateria.addEventListener('change', () => {
        const mat = selectMateria.value;
        const selectAssunto = document.getElementById('filtro-assunto');

        if (mat === "Todos") {
            selectAssunto.disabled = true;
            selectAssunto.classList.add('opacity-50');
            selectAssunto.innerHTML = '<option value="Todos">Todos</option>';
            return;
        }

        const assuntos = new Set();
        bancoQuestoes.forEach(q => {
            if(q.temas_dinamicos && q.temas_dinamicos[0] === mat && q.temas_dinamicos[1]) {
                assuntos.add(q.temas_dinamicos[1]);
            }
        });

        selectAssunto.innerHTML = '<option value="Todos">Todos</option>';
        assuntos.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a;
            opt.textContent = a;
            selectAssunto.appendChild(opt);
        });

        selectAssunto.disabled = false;
        selectAssunto.classList.remove('opacity-50');
    });
}

document.getElementById('btn-filtrar').addEventListener('click', aplicarFiltros);

function aplicarFiltros() {
    const mat = document.getElementById('filtro-materia').value;
    const ass = document.getElementById('filtro-assunto').value;

    questoesFiltradas = bancoQuestoes.filter(q => {
        let matMatch = mat === "Todos" || (q.temas_dinamicos && q.temas_dinamicos[0] === mat);
        let assMatch = ass === "Todos" || (q.temas_dinamicos && q.temas_dinamicos[1] === ass);
        return matMatch && assMatch;
    });

    document.getElementById('contador-questoes').innerText = `${questoesFiltradas.length} encontradas`;
    paginaAtual = 1;
    document.getElementById('questoes-container').innerHTML = '';
    renderizarQuestoes();
}

function renderizarQuestoes() {
    const container = document.getElementById('questoes-container');
    const inicio = (paginaAtual - 1) * QUESTOES_POR_PAGINA;
    const fim = inicio + QUESTOES_POR_PAGINA;
    const questoesPagina = questoesFiltradas.slice(inicio, fim);

    if (questoesFiltradas.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center">Nenhuma questão encontrada para este filtro.</p>';
        document.getElementById('btn-carregar-mais').classList.add('hidden');
        return;
    }

    questoesPagina.forEach((q, index) => {
        const div = document.createElement('div');
        div.className = "bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700";

        let temasBadge = q.temas_dinamicos ? q.temas_dinamicos.join(" > ") : "Sem Tema";

        // Alternativas
        let botoesAlternativas = '';
        if (q.alternativas && q.alternativas.length > 0) {
            botoesAlternativas = `<div class="mt-4 space-y-2">`;
            q.alternativas.forEach(alt => {
                const letra = alt.charAt(0).toUpperCase(); // Pega a letra A, B, C...
                botoesAlternativas += `
                <button onclick="verificarResposta(this, '${letra}', '${q.gabarito_letra}')"
                class="w-full text-left p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600 transition">
                ${alt}
                </button>`;
            });
            botoesAlternativas += `</div>`;
        }

        // Comentário
        let comentarioHtml = q.comentario ? `
        <div class="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg hidden" id="comentario-${q.id}">
        <p class="font-bold mb-2">Comentário / Gabarito (${q.gabarito_letra}):</p>
        <p class="text-sm">${q.comentario}</p>
        </div>
        ` : '';

        div.innerHTML = `
        <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
        <span>ID: ${q.id}</span>
        <span class="truncate ml-4">${temasBadge}</span>
        </div>
        <p class="text-lg font-medium whitespace-pre-wrap">${q.enunciado}</p>

        ${q.imagem ? `<img src="${q.imagem}" class="my-4 max-h-64 mx-auto rounded-lg" alt="Imagem da Questão">` : ''}

        ${botoesAlternativas}

        <button onclick="document.getElementById('comentario-${q.id}').classList.toggle('hidden')"
        class="mt-4 text-sm text-blue-600 dark:text-blue-400 font-semibold hover:underline">
        Mostrar/Esconder Gabarito
        </button>

        ${comentarioHtml}
        `;
        container.appendChild(div);
    });

    const btnCarregar = document.getElementById('btn-carregar-mais');
    if (fim >= questoesFiltradas.length) {
        btnCarregar.classList.add('hidden');
    } else {
        btnCarregar.classList.remove('hidden');
    }
}

document.getElementById('btn-carregar-mais').addEventListener('click', () => {
    paginaAtual++;
    renderizarQuestoes();
});

// Função chamada pelos botões das alternativas
function verificarResposta(botao, letraEscolhida, letraCorreta) {
    // Desabilita os outros botões da mesma questão
    const irmaos = botao.parentElement.children;
    for (let btn of irmaos) {
        btn.disabled = true;
        btn.classList.add('cursor-not-allowed', 'opacity-70');
    }

    if (letraEscolhida === letraCorreta) {
        botao.classList.remove('hover:bg-gray-50', 'dark:hover:bg-gray-700', 'border', 'dark:border-gray-600');
        botao.classList.add('bg-green-100', 'border-green-500', 'text-green-800', 'dark:bg-green-900', 'dark:text-green-100');
    } else {
        botao.classList.remove('hover:bg-gray-50', 'dark:hover:bg-gray-700', 'border', 'dark:border-gray-600');
        botao.classList.add('bg-red-100', 'border-red-500', 'text-red-800', 'dark:bg-red-900', 'dark:text-red-100');

        // Se errou, pinta a certa de verde (opcional, para feedback visual)
        for (let btn of irmaos) {
            if (btn.innerText.trim().toUpperCase().startsWith(letraCorreta)) {
                btn.classList.add('bg-green-50', 'border-green-300', 'dark:bg-green-900', 'dark:border-green-700');
            }
        }
    }
}
