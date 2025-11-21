// --- 0. LÓGICA DE NAVEGAÇÃO (Mantida igual) ---
const navLinks = document.querySelectorAll('.nav-item a');
const pages = document.querySelectorAll('.page-content');
const headerTitle = document.getElementById('header-title');

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('data-target');
        const targetPage = document.getElementById(targetId);
        if (!targetPage) return;
        headerTitle.textContent = link.textContent;
        navLinks.forEach(navLink => navLink.parentElement.classList.remove('active'));
        pages.forEach(page => page.classList.remove('active'));
        link.parentElement.classList.add('active');
        targetPage.classList.add('active');
    });
});

// --- 1. CONFIGURAÇÃO INICIAL ---
const canvas = document.getElementById('mapa-canvas');
const ctx = canvas.getContext('2d');
const listaAlertas = document.getElementById('lista-alertas');

// Elementos do Modal
const modalOverlay = document.getElementById('modal-despacho-overlay');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalTipo = document.getElementById('modal-tipo');
const modalLocalizacao = document.getElementById('modal-localizacao');
const modalAlertaTag = document.getElementById('modal-alerta-tag');

const DICIONARIO_CORES = {
    'vermelho': '#b91c1c',
    'laranja':  '#d97706',
    'roxo':     '#7e22ce',
    'amarelo':  '#ca8a04',
    'azul':     '#3b82f6',
    'verde':    '#10b981'
};

const DICIONARIO_NOMES = {
    'vermelho': 'INCIDENTE GRAVE: Batida de Carro',
    'laranja':  'CRIME VIOLENTO: Assalto',
    'roxo':     'DESORDEM PÚBLICA: Briga',
    'amarelo':  'ALERTA: Atividade Suspeita'
};

// --- 2. NOVA LÓGICA: BUSCAR DADOS DO BANCO (POLLING) ---

async function buscarDados() {
    try {
        // Pede para a API os últimos registros
        const response = await fetch('/api/registro');
        const dadosDoBanco = await response.json();

        if (Array.isArray(dadosDoBanco)) {
            atualizarTela(dadosDoBanco);
        }
    } catch (error) {
        console.error("Erro ao buscar dados:", error);
    }
}

// Chama a função buscarDados a cada 2 segundos (2000ms)
setInterval(buscarDados, 2000);

// --- 3. ATUALIZAR A TELA ---

function atualizarTela(dados) {
    limparMapa();
    
    // Limpa a lista de alertas antiga para não duplicar
    // (Ou mantém apenas se quiser histórico, aqui vamos limpar para simplificar o real-time)
    listaAlertas.innerHTML = ''; 

    let viaturas = []; 
    let alertas = [];   

    // O banco retorna colunas: tipo_incidente, coordenada_x, coordenada_y
    // Precisamos converter para o formato que usamos: label, x, y
    const deteccoes = dados.map(item => ({
        label: item.tipo_incidente,
        x: item.coordenada_x,
        y: item.coordenada_y,
        id: item.id_incidente // Importante para identificar
    }));

    // Como o banco traz histórico, vamos pegar apenas os mais recentes para desenhar
    // (Aqui você pode ajustar a lógica para mostrar só o último segundo, etc.)
    // Por simplicidade, vamos desenhar o que veio da API (últimos 10)
    
    for (const det of deteccoes) {
        const cor = DICIONARIO_CORES[det.label] || '#FFFFFF'; 
        
        // Desenha no mapa
        desenharPino(det.x, det.y, cor, det.label);

        // Lógica de Alerta vs Viatura
        if (DICIONARIO_NOMES[det.label]) {
            criarItemAlerta(det.label, { x: det.x, y: det.y });
            alertas.push(det);
        } else if (det.label === 'azul') {
            viaturas.push(det);
        }
    }

    // Calcula rota (pega o alerta mais recente, que é o primeiro da lista do banco)
    if (alertas.length > 0 && viaturas.length > 0) {
        // Se não tiver viatura real detectada, cria uma fixa para demonstração (opcional)
        // viaturas.push({x: 50, y: 50}); 
        calcularRota(alertas[0], viaturas); 
    }
    
    // Remove o placeholder se tiver dados
    if (deteccoes.length > 0) {
        const placeholder = document.querySelector('.alerta-placeholder');
        if (placeholder) placeholder.remove();
    }
}

// --- 4. FUNÇÕES AUXILIARES ---

function limparMapa() {
    ctx.fillStyle = '#4b5563'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function desenharPino(x, y, cor, label) {
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, 2 * Math.PI); 
    ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.font = '10px Arial';
    ctx.fillText(label, x + 15, y + 5);
}

function criarItemAlerta(label, localizacao) {
    const nomeAlerta = DICIONARIO_NOMES[label];
    const corAlerta = label; 

    const itemAlerta = document.createElement('li');
    itemAlerta.className = `alerta-${corAlerta}`; 
    itemAlerta.textContent = `${nomeAlerta} [${localizacao.x}, ${localizacao.y}]`;
    
    itemAlerta.addEventListener('click', () => {
        abrirModalDeDespacho(nomeAlerta, localizacao, corAlerta);
    });

    listaAlertas.appendChild(itemAlerta);
}

function calcularRota(alerta, viaturas) {
    let viaturaMaisProxima = null;
    let menorDistancia = Infinity;

    for (const v of viaturas) {
        const dist = Math.sqrt(Math.pow(v.x - alerta.x, 2) + Math.pow(v.y - alerta.y, 2));
        if (dist < menorDistancia) {
            menorDistancia = dist;
            viaturaMaisProxima = v;
        }
    }

    if (viaturaMaisProxima) {
        ctx.strokeStyle = '#3b82f6'; 
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(viaturaMaisProxima.x, viaturaMaisProxima.y);
        ctx.lineTo(alerta.x, alerta.y);
        ctx.stroke();
    }
}

function abrirModalDeDespacho(nome, localizacao, cor) {
    const partesNome = nome.split(': ');
    modalTipo.textContent = partesNome[1] || nome; 
    modalLocalizacao.textContent = `Maquete Coordenadas: [${localizacao.x}, ${localizacao.y}]`;
    modalAlertaTag.textContent = partesNome[0] || "ALERTA"; 
    modalOverlay.classList.add('active');
}

function fecharModalDeDespacho() {
    modalOverlay.classList.remove('active');
}

modalCloseBtn.addEventListener('click', fecharModalDeDespacho);
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) fecharModalDeDespacho();
});
