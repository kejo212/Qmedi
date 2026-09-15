let bancoQuestoes = [];
let questoesFiltradas = [];
let paginaAtual = 1;
const QUESTOES_POR_PAGINA = 10;
let isLoginMode = true;
let currentUser = "";
let progressoUsuario = {};

const themeToggle = document.getElementById('theme-toggle');
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const btnLogout = document.getElementById('btn-logout');
const userGreeting = document.getElementById('user-greeting');
const sidebarUserName = document.getElementById('sidebar-user-name');

themeToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
});
if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
}

document.getElementById('auth-switch-btn').addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    document.getElementById('auth-title').innerText = isLoginMode ? "Entrar" : "Cadastrar";
    document.getElementById('auth-submit').innerText = isLoginMode ? "Entrar" : "Criar Conta";
    document.getElementById('auth-switch-text').innerText = isLoginMode ? "Nao tem conta?" : "Ja tem conta?";
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
            alert("Usuario ou senha incorretos!");
        }
    } else {
        if (users[user]) {
            alert("Usuario ja existe!");
        } else {
            users[user] = pass;
            localStorage.setItem('users', JSON.stringify(users));
            iniciarApp(user);
        }
    }
});

btnLogout.addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    window.location.reload();
});

function iniciarApp(username) {
    currentUser = username;
    localStorage.setItem('currentUser', username);
    
    progressoUsuario = JSON.parse(localStorage.getItem(`progresso_${currentUser}`)) || {};
    
    userGreeting.innerText = `Ola, ${username}!`;
    sidebarUserName.innerText = username;
    userGreeting.classList.remove('hidden');
    authScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    btnLogout.classList.remove('hidden');
    
    carregarDados();
}

if (localStorage.getItem('currentUser')) {
    iniciarApp(localStorage.getItem('currentUser'));
}

async function carregarDados() {
    const container = document.getElementById('questoes-container');
    container.innerHTML = `<p class="text-center py-10 font-bold text-blue-600 animate-pulse text-justify">Conectando ao banco de dados...</p>`;
    
    try {
        const resIndice = await fetch('indice_questoes.json');
        if (!resIndice.ok) throw new Error("Indice nao encontrado.");
        
        const indice = await resIndice.json();
        const arquivos = indice.arquivos;
        bancoQuestoes = [];
        
        for (let i = 0; i < arquivos.length; i++) {
            container.innerHTML = `<p class="text-center py-10 font-bold text-blue-600 text-justify">Baixando pacote ${i + 1} de ${arquivos.length}...</p>`;
            const resQ = await fetch(arquivos[i]);
            if (resQ.ok) {
                const questoesParte = await resQ.json();
                bancoQuestoes = bancoQuestoes.concat(questoesParte);
            }
        }
        
        preencherDropdowns();
        aplicarFiltros();
        
    } catch (error) {
        container.innerHTML = `<p class="text-center py-10 text-red-600 font-bold text-justify">Erro ao carregar banco de dados.</p>`;
    }
}

function preencherDropdowns() {
    const selectMateria = document.getElementById('filtro-materia');
    const selectAssunto = document.getElementById('filtro-assunto');
    const selectSub = document.getElementById('filtro-subassunto');
    
    const materias = new Set();
    bancoQuestoes.forEach(q => { if(q.temas_dinamicos && q.temas_dinamicos[0]) materias.add(q.temas_dinamicos[0]); });

    Array.from(materias).sort().forEach(m => selectMateria.appendChild(new Option(m, m)));

    selectMateria.addEventListener('change', () => {
        const mat = selectMateria.value;
        selectAssunto.innerHTML = '<option value="Todos">Todos os Conteudos</option>';
        selectSub.innerHTML = '<option value="Todos">Todos os Assuntos</option>';
        selectSub.disabled = true; selectSub.classList.add('opacity-50');

        if (mat === "Todos") {
            selectAssunto.disabled = true; selectAssunto.classList.add('opacity-50');
            return;
        }

        const assuntos = new Set();
        bancoQuestoes.forEach(q => { if(q.temas_dinamicos && q.temas_dinamicos[0] === mat && q.temas_dinamicos[1]) assuntos.add(q.temas_dinamicos[1]); });
        
        Array.from(assuntos).sort().forEach(a => selectAssunto.appendChild(new Option(a, a)));
        selectAssunto.disabled = false; selectAssunto.classList.remove('opacity-50');
    });

    selectAssunto.addEventListener('change', () => {
        const mat = selectMateria.value;
        const ass = selectAssunto.value;
        selectSub.innerHTML = '<option value="Todos">Todos os Assuntos</option>';

        if (ass === "Todos") {
            selectSub.disabled = true; selectSub.classList.add('opacity-50');
            return;
        }

        const subs = new Set();
        bancoQuestoes.forEach(q => { if(q.temas_dinamicos && q.temas_dinamicos[0] === mat && q.temas_dinamicos[1] === ass && q.temas_dinamicos[2]) subs.add(q.temas_dinamicos[2]); });
        
        Array.from(subs).sort().forEach(s => selectSub.appendChild(new Option(s, s)));
        selectSub.disabled = false; selectSub.classList.remove('opacity-50');
    });
}

document.getElementById('btn-filtrar').addEventListener('click', aplicarFiltros);

function aplicarFiltros() {
    const palavraChave = document.getElementById('filtro-busca').value.toLowerCase();
    const chkIneditas = document.getElementById('chk-ineditas').checked;
    const chkAcertos = document.getElementById('chk-acertos').checked;
    const chkErradas = document.getElementById('chk-erradas').checked;
    
    const mat = document.getElementById('filtro-materia').value;
    const ass = document.getElementById('filtro-assunto').value;
    const sub = document.getElementById('filtro-subassunto').value;

    questoesFiltradas = bancoQuestoes.filter(q => {
        if (palavraChave && !(q.enunciado.toLowerCase().includes(palavraChave) || (q.comentario && q.comentario.toLowerCase().includes(palavraChave)))) return false;
        
        if (mat !== "Todos" && (!q.temas_dinamicos || q.temas_dinamicos[0] !== mat)) return false;
        if (ass !== "Todos" && (!q.temas_dinamicos || q.temas_dinamicos[1] !== ass)) return false;
        if (sub !== "Todos" && (!q.temas_dinamicos || q.temas_dinamicos[2] !== sub)) return false;

        const status = progressoUsuario[q.id];
        const isRespondida = !!status;
        const isCorreta = isRespondida && status.acertou;
        const isErrada = isRespondida && !status.acertou;
        const isInedita = !isRespondida;

        if (chkIneditas || chkAcertos || chkErradas) {
            if (!( 
                (chkIneditas && isInedita) || 
                (chkAcertos && isCorreta) || 
                (chkErradas && isErrada)
            )) {
                return false;
            }
        }

        return true;
    });

    document.getElementById('contador-questoes').innerText = `${questoesFiltradas.length} encontradas`;
    paginaAtual = 1;
    renderizarQuestoes();
}

function renderizarQuestoes() {
    const container = document.getElementById('questoes-container');
    container.innerHTML = '';
    
    const inicio = (paginaAtual - 1) * QUESTOES_POR_PAGINA;
    const fim = inicio + QUESTOES_POR_PAGINA;
    const questoesPagina = questoesFiltradas.slice(inicio, fim);

    if (questoesFiltradas.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-10 text-justify">Nenhuma questao encontrada com estes filtros.</p>';
        document.getElementById('paginacao-container').innerHTML = '';
        return;
    }

    questoesPagina.forEach(q => {
        const statusAnterior = progressoUsuario[q.id]; 
        
        const div = document.createElement('div');
        div.className = "bg-white dark:bg-gray-800 p-6 md:p-8 rounded-xl shadow-sm border dark:border-gray-700";
        
        let temasBadge = q.temas_dinamicos ? q.temas_dinamicos.join(" > ") : "Sem Tema";
        let imagemHtml = q.imagem ? `<img src="${q.imagem}" class="my-6 max-h-80 mx-auto rounded-lg shadow" loading="lazy">` : '';
        
        let enunciadoLimpo = q.enunciado;
        if (enunciadoLimpo.toLowerCase().startsWith('enunciado:')) {
            enunciadoLimpo = enunciadoLimpo.substring(10).trim();
        }
        
        let botoesAlternativas = `<div class="mt-6 space-y-3">`;
        if (q.alternativas && q.alternativas.length > 0) {
            q.alternativas.forEach(alt => {
                const letra = alt.charAt(0).toUpperCase();
                
                let classesBotao = "w-full text-justify leading-relaxed p-4 border rounded-lg transition ";
                let isDisabled = "";
                
                if (statusAnterior) {
                    isDisabled = "disabled";
                    if (letra === q.gabarito_letra) {
                        classesBotao += "bg-green-100 border-green-500 text-green-900 dark:bg-green-900/50 dark:border-green-500 dark:text-green-100 font-bold border-2";
                    } else if (letra === statusAnterior.escolhida && !statusAnterior.acertou) {
                        classesBotao += "bg-red-100 border-red-500 text-red-900 dark:bg-red-900/50 dark:border-red-500 dark:text-red-100 border-2";
                    } else {
                        classesBotao += "opacity-50 dark:border-gray-600";
                    }
                } else {
                    classesBotao += "hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600 cursor-pointer";
                }

                botoesAlternativas += `<button ${isDisabled} onclick="responderQuestao(this, '${q.id}', '${letra}', '${q.gabarito_letra}')" class="${classesBotao}">${alt}</button>`;
            });
        }
        botoesAlternativas += `</div>`;

        let comentarioHtml = '';
        if (q.comentario || q.gabarito_letra) {
            const showComentario = statusAnterior ? 'block' : 'hidden';
            
            comentarioHtml = `
                <div class="${showComentario} mt-6 p-5 bg-blue-50/50 dark:bg-gray-700/50 border dark:border-gray-600 rounded-lg text-justify" id="comentario-${q.id}">
                    <p class="font-bold text-green-700 dark:text-green-400 mb-3">Gabarito Oficial: ${q.gabarito_letra || 'N/A'}</p>
                    <p class="text-sm md:text-base leading-relaxed text-justify">${q.comentario || 'Sem comentario.'}</p>
                </div>
            `;
        }

        div.innerHTML = `
            <div class="flex flex-col md:flex-row justify-between text-xs text-gray-500 dark:text-gray-400 mb-5 pb-3 border-b dark:border-gray-700 gap-2 text-justify">
                <span class="font-bold bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded w-fit">ID: ${q.id}</span>
                <span class="truncate italic">${temasBadge}</span>
            </div>
            <p class="text-base md:text-lg text-justify leading-relaxed font-medium">${enunciadoLimpo}</p>
            ${imagemHtml}
            ${botoesAlternativas}
            ${comentarioHtml}
        `;
        container.appendChild(div);
    });

    renderizarPaginacao();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function responderQuestao(botao, idQuestao, letraEscolhida, letraCorreta) {
    const alternativas = botao.parentElement.children;
    const acertou = (letraEscolhida === letraCorreta);
    
    for (let btn of alternativas) {
        btn.disabled = true;
        btn.classList.add('opacity-60', 'cursor-not-allowed');
        btn.classList.remove('hover:bg-gray-50', 'dark:hover:bg-gray-700');
    }
    
    botao.classList.remove('opacity-60');
    if (acertou) {
        botao.classList.add('bg-green-100', 'border-green-500', 'text-green-900', 'dark:bg-green-900/50', 'dark:border-green-500', 'dark:text-green-100', 'border-2', 'font-bold');
    } else {
        botao.classList.add('bg-red-100', 'border-red-500', 'text-red-900', 'dark:bg-red-900/50', 'dark:border-red-500', 'dark:text-red-100', 'border-2');
        for (let btn of alternativas) {
            if (btn.innerText.trim().toUpperCase().startsWith(letraCorreta)) {
                btn.classList.remove('opacity-60');
                btn.classList.add('bg-green-100', 'border-green-500', 'text-green-900', 'dark:bg-green-900/50', 'dark:border-green-500', 'dark:text-green-100', 'border-2', 'font-bold');
            }
        }
    }

    progressoUsuario[idQuestao] = {
        respondida: true,
        acertou: acertou,
        escolhida: letraEscolhida
    };
    localStorage.setItem(`progresso_${currentUser}`, JSON.stringify(progressoUsuario));
    
    const comentarioDiv = document.getElementById(`comentario-${idQuestao}`);
    if(comentarioDiv) {
        comentarioDiv.classList.remove('hidden');
        comentarioDiv.classList.add('block');
    }
}

function renderizarPaginacao() {
    const container = document.getElementById('paginacao-container');
    container.innerHTML = '';
    const totalPaginas = Math.ceil(questoesFiltradas.length / QUESTOES_POR_PAGINA);
    
    if (totalPaginas <= 1) return;

    if (paginaAtual > 1) {
        container.innerHTML += `<button onclick="mudarPagina(${paginaAtual - 1})" class="page-link bg-white dark:bg-gray-800 text-justify">Anterior</button>`;
    }

    let inicio = Math.max(1, paginaAtual - 2);
    let fim = Math.min(totalPaginas, inicio + 4);
    if (fim - inicio < 4) inicio = Math.max(1, fim - 4);

    if (inicio > 1) container.innerHTML += `<span class="px-2 py-1 text-gray-500 text-justify">...</span>`;

    for (let i = inicio; i <= fim; i++) {
        const activeClass = (i === paginaAtual) ? 'active' : 'bg-white dark:bg-gray-800';
        container.innerHTML += `<button onclick="mudarPagina(${i})" class="page-link ${activeClass} text-justify">${i}</button>`;
    }

    if (fim < totalPaginas) container.innerHTML += `<span class="px-2 py-1 text-gray-500 text-justify">...</span>`;

    if (paginaAtual < totalPaginas) {
        container.innerHTML += `<button onclick="mudarPagina(${paginaAtual + 1})" class="page-link bg-white dark:bg-gray-800 text-justify">Proxima</button>`;
    }
}

function mudarPagina(novaPagina) {
    paginaAtual = novaPagina;
    renderizarQuestoes();
}
