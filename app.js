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

// Checa tema salvo ao iniciar
if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
}

// --- SISTEMA DE AUTENTICAÇÃO (MOCK VIA LOCALSTORAGE) ---
document.getElementById('auth-switch-btn').addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    document.getElementById('auth-title').innerText = isLoginMode ? "Entrar" : "Cadastrar";
    document.getElementById('auth-submit').innerText = isLoginMode ? "Entrar" : "Criar Conta";
    document.getElementById('auth-switch-text').innerText = isLoginMode ? "Não tem conta?" : "Já tem conta?";
});

document.getElementById('auth-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();
    
    let users = JSON.parse(localStorage.getItem('users')) || {};

    if (isLoginMode) {
        if (users[user] && users[user] === pass) {
            iniciarApp(user);
        } else {
            alert("Usuário ou senha incorretos!");
        }
    } else {
        if (users[user]) {
            alert("Este nome de usuário já existe! Escolha outro.");
        } else {
            users[user] = pass;
            localStorage.setItem('users', JSON.stringify(users));
            alert("Cadastro realizado com sucesso! Você já está logado.");
            iniciarApp(user);
        }
    }
});

btnLogout.addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    window.location.reload(); // Recarrega a página para voltar à tela de login
});

function iniciarApp(username) {
    localStorage.setItem('currentUser', username);
    authScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    btnLogout.classList.remove('hidden');
    
    // Inicia o download das questões somente após o login
    carregarDados();
}

// Verifica se a sessão já estava ativa
if (localStorage.getItem('currentUser')) {
    iniciarApp(localStorage.getItem('currentUser'));
}

// --- CARREGAMENTO DO BANCO DE DADOS EM PARTES ---
async function carregarDados() {
    const container = document.getElementById('questoes-container');
    
    // Interface de Carregamento (Loading state)
    container.innerHTML = `
        <div class="text-center py-12">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mb-4"></div>
            <p class="text-blue-600 dark:text-blue-400 font-bold text-lg" id="loading-text">Conectando ao banco de dados...</p>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">Isso pode levar alguns segundos dependendo da sua internet.</p>
        </div>
    `;
    
    try {
        // 1. Lê o índice (que diz quantos arquivos existem)
        const resIndice = await fetch('indice_questoes.json');
        
        if (!resIndice.ok) throw new Error("Arquivo indice_questoes.json não encontrado no servidor.");
        
        const indice = await resIndice.json();
        const arquivos = indice.arquivos;
        
        bancoQuestoes = [];
        
        // 2. Faz o download sequencial de cada arquivo JSON
        for (let i = 0; i < arquivos.length; i++) {
            document.getElementById('loading-text').innerText = `Baixando pacote ${i + 1} de ${arquivos.length}...`;
            
            const resQ = await fetch(arquivos[i]);
            if (!resQ.ok) continue; // Pula se der erro em um arquivo específico
            
            const questoesParte = await resQ.json();
            bancoQuestoes = bancoQuestoes.concat(questoesParte);
        }
        
        document.getElementById('loading-text').innerText = "Organizando filtros e temas...";
        
        // Finaliza renderizando a interface
        preencherFiltros();
        aplicarFiltros();
        
    } catch (error) {
        console.error("Erro no download das questões:", error);
        container.innerHTML = `
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <strong class="font-bold">Erro de conexão!</strong>
                <span class="block sm:inline">Não foi possível carregar o banco de questões.</span>
                <p class="text-sm mt-2">Certifique-se de que os arquivos <b>questao_X.json</b> e <b>indice_questoes.json</b> foram enviados para o repositório.</p>
            </div>
        `;
    }
}

// --- LÓGICA DE FILTROS E RENDERIZAÇÃO ---
function preencherFiltros() {
    const materias = new Set();
    
    // Captura todas as matérias únicas baseadas na extração dinâmica (índice 0 do array temas_dinamicos)
    bancoQuestoes.forEach(q => {
        if(q.temas_dinamicos && q.temas_dinamicos[0]) {
            materias.add(q.temas_dinamicos[0]);
        }
    });

    const selectMateria = document.getElementById('filtro-materia');
    
    // Ordena alfabeticamente para ficar mais organizado
    Array.from(materias).sort().forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        selectMateria.appendChild(opt);
    });

    // Quando seleciona a Matéria, habilita e preenche os Assuntos correspondentes
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
        Array.from(assuntos).sort().forEach(a => {
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
        container.innerHTML = '<p class="text-gray-500 text-center py-10">Nenhuma questão encontrada para este filtro.</p>';
        document.getElementById('btn-carregar-mais').classList.add('hidden');
        return;
    }

    questoesPagina.forEach(q => {
        const div = document.createElement('div');
        div.className = "bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700";
        
        let temasBadge = q.temas_dinamicos ? q.temas_dinamicos.join(" > ") : "Sem Tema";
        let imagemHtml = q.imagem ? `<img src="${q.imagem}" class="my-4 max-h-64 mx-auto rounded-lg shadow" alt="Imagem da Questão" loading="lazy">` : '';
        
        // Tratamento das Alternativas
        let botoesAlternativas = '';
        if (q.alternativas && q.alternativas.length > 0) {
            botoesAlternativas = `<div class="mt-4 space-y-2">`;
            q.alternativas.forEach(alt => {
                const letra = alt.charAt(0).toUpperCase(); 
                botoesAlternativas += `
                    <button onclick="verificarResposta(this, '${letra}', '${q.gabarito_letra}')" 
                    class="w-full text-left p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600 transition">
                        ${alt}
                    </button>`;
            });
            botoesAlternativas += `</div>`;
        }

        // Tratamento do Comentário
        let comentarioHtml = '';
        if (q.comentario || q.gabarito_letra) {
            comentarioHtml = `
                <button onclick="document.getElementById('comentario-${q.id}').classList.toggle('hidden')" 
                class="mt-4 text-sm text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                    Mostrar/Esconder Gabarito e Comentário
                </button>
                <div class="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg hidden" id="comentario-${q.id}">
                    <p class="font-bold text-green-600 dark:text-green-400 mb-2">Gabarito Oficial: ${q.gabarito_letra || 'N/A'}</p>
                    <p class="text-sm whitespace-pre-wrap">${q.comentario || 'Sem comentário disponível.'}</p>
                </div>
            `;
        }

        div.innerHTML = `
            <div class="flex flex-col md:flex-row justify-between text-xs text-gray-500 dark:text-gray-400 mb-4 pb-2 border-b dark:border-gray-700 gap-2">
                <span class="font-bold bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">ID: ${q.id}</span>
                <span class="truncate">${temasBadge}</span>
            </div>
            
            <p class="text-lg font-medium whitespace-pre-wrap text-justify">${q.enunciado}</p>
            
            ${imagemHtml}
            ${botoesAlternativas}
            ${comentarioHtml}
        `;
        container.appendChild(div);
    });

    // Mostra ou esconde o botão de carregar mais
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

// --- LÓGICA DE CORREÇÃO ---
function verificarResposta(botao, letraEscolhida, letraCorreta) {
    const alternativas = botao.parentElement.children;
    
    // Trava todas as opções após o primeiro clique
    for (let btn of alternativas) {
        btn.disabled = true;
        btn.classList.add('cursor-not-allowed', 'opacity-80');
        // Remove as classes de visual neutro
        btn.classList.remove('hover:bg-gray-50', 'dark:hover:bg-gray-700', 'border', 'dark:border-gray-600');
    }
    
    // Verifica se acertou
    if (letraEscolhida === letraCorreta) {
        botao.classList.add('bg-green-100', 'border-green-500', 'text-green-900', 'dark:bg-green-900', 'dark:border-green-600', 'dark:text-green-100', 'border-2', 'font-semibold');
    } else {
        botao.classList.add('bg-red-100', 'border-red-500', 'text-red-900', 'dark:bg-red-900', 'dark:border-red-600', 'dark:text-red-100', 'border-2');
        
        // Destaca a correta automaticamente
        for (let btn of alternativas) {
            if (btn.innerText.trim().toUpperCase().startsWith(letraCorreta)) {
                btn.classList.add('bg-green-100', 'border-green-500', 'text-green-900', 'dark:bg-green-900', 'dark:border-green-600', 'dark:text-green-100', 'border-2');
            }
        }
    }
}
