// --- 0. LÓGICA DE NAVEGAÇÃO DA PÁGINA ---

// Pega todos os links da barra lateral e todas as "páginas"
const navLinks = document.querySelectorAll('.nav-item a');
const pages = document.querySelectorAll('.page-content');
const headerTitle = document.getElementById('header-title');

// Adiciona um 'click listener' em cada link da barra lateral
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault(); // Impede que o link recarregue a página

        const targetId = link.getAttribute('data-target');
        const targetPage = document.getElementById(targetId);
        
        // Se a página alvo não existir (ex: link quebrado), não faz nada
        if (!targetPage) return;

        headerTitle.textContent = link.textContent;

        // Remove a classe 'active' de todos os links e páginas
        navLinks.forEach(navLink => navLink.parentElement.classList.remove('active'));
        pages.forEach(page => page.classList.remove('active'));

        // Adiciona a classe 'active' apenas no link clicado e na página alvo
        link.parentElement.classList.add('active');
        targetPage.classList.add('active');
    });
});


// --- 1. CONFIGURAÇÃO INICIAL (Lógica do Mapa/ESP32) ---

// Conecta ao nosso "servidor-ponte" (que ainda vamos criar)
const socket = io();

// Pega os elementos do HTML que vamos usar
const canvas = document.getElementById('mapa-canvas');
const ctx = canvas.getContext('2d'); // O "pincel" para desenhar no mapa
const listaAlertas = document.getElementById('lista-alertas');

// --- Pega os elementos do MODAL ---
const modalOverlay = document.getElementById('modal-despacho-overlay');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalTipo = document.getElementById('modal-tipo');
const modalLocalizacao = document.getElementById('modal-localizacao');
const modalAlertaTag = document.getElementById('modal-alerta-tag');

// Dicionário de Cores (para desenhar no canvas)
const DICIONARIO_CORES = {
    'vermelho': '#b91c1c', // Batida de Carro
    'laranja':  '#d97706', // Assalto
    'roxo':     '#7e22ce', // Briga
    'amarelo':  '#ca8a04', // Atividade Suspeita
    'azul':     '#3b82f6', // Viatura
    'verde':    '#10b981'  // Civil
};

// Dicionário de Nomes (para o painel de alertas)
const DICIONARIO_NOMES = {
    'vermelho': 'INCIDENTE GRAVE: Batida de Carro',
    'laranja':  'CRIME VIOLENTO: Assalto',
    'roxo':     'DESORDEM PÚBLICA: Briga',
    'amarelo':  'ALERTA: Atividade Suspeita'
};

// --- 2. LÓGICA PRINCIPAL (Lógica do Mapa/ESP32) ---

// Esta função "ouve" a mensagem 'detections' que o nosso servidor-ponte (Node.js) vai enviar.
socket.on('detections', (deteccoes) => {
    // 1. Limpa o mapa para o próximo "frame"
    limparMapa();

    // 2. Processa a lista de objetos que a IA detectou
    let viaturas = []; // Armazena as viaturas para o cálculo de rota
    let alertas = [];   // Armazena os incidentes para o cálculo de rota

    for (const det of deteccoes) {
        const cor = DICIONARIO_CORES[det.label] || '#FFFFFF'; 
        
        // Desenha o pino no mapa
        desenharPino(det.x, det.y, cor, det.label);

        // Separa o que é alerta e o que é viatura
        if (DICIONARIO_NOMES[det.label]) {
            dispararAlerta(det.label, { x: det.x, y: det.y });
            alertas.push({ x: det.x, y: det.y });
        } else if (det.label === 'azul') {
            viaturas.push({ x: det.x, y: det.y });
        }
    }

    // 3. Calcula a rota se houver um alerta e uma viatura
    if (alertas.length > 0 && viaturas.length > 0) {
        calcularRota(alertas[0], viaturas); 
    }
});

// Limpa o placeholder de "Aguardando detecções..."
socket.on('connect', () => {
    const placeholder = document.querySelector('.alerta-placeholder');
    if (placeholder) {
        placeholder.remove();
    }
});


// --- 3. FUNÇÕES AUXILIARES E LÓGICA DO MODAL ---

function limparMapa() {
    ctx.fillStyle = '#4b5563'; // Cor de "asfalto"
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function desenharPino(x, y, cor, label) {
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, 2 * Math.PI); 
    ctx.fill();

    // Escreve a etiqueta (opcional)
    ctx.fillStyle = '#FFF';
    ctx.font = '10px Arial';
    ctx.fillText(label, x + 15, y + 5);
}

function dispararAlerta(label, localizacao) {
    const nomeAlerta = DICIONARIO_NOMES[label];
    const corAlerta = label; 

    // Checa se o alerta já existe (para não floodar)
    const idAlerta = `alerta-${label}-${localizacao.x}-${localizacao.y}`;
    if (document.getElementById(idAlerta)) {
        return; // Alerta já está na lista
    }

    const itemAlerta = document.createElement('li');
    itemAlerta.id = idAlerta;
    itemAlerta.className = `alerta-${corAlerta}`; 
    itemAlerta.textContent = `${nomeAlerta} [${localizacao.x}, ${localizacao.y}]`;
    
    // Adiciona o "listener" de clique para abrir o modal
    itemAlerta.addEventListener('click', () => {
        abrirModalDeDespacho(nomeAlerta, localizacao, corAlerta);
    });

    listaAlertas.prepend(itemAlerta);
}

function calcularRota(alerta, viaturas) {
    // 1. Encontra a viatura mais próxima (matemática simples de distância)
    let viaturaMaisProxima = null;
    let menorDistancia = Infinity;

    for (const v of viaturas) {
        const dist = Math.sqrt(Math.pow(v.x - alerta.x, 2) + Math.pow(v.y - alerta.y, 2));
        if (dist < menorDistancia) {
            menorDistancia = dist;
            viaturaMaisProxima = v;
        }
    }

    // 2. Desenha a linha de rota no canvas
    if (viaturaMaisProxima) {
        ctx.strokeStyle = '#3b82f6'; // Linha da rota azul
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(viaturaMaisProxima.x, viaturaMaisProxima.y);
        ctx.lineTo(alerta.x, alerta.y);
        ctx.stroke();
    }
}

// --- NOVAS FUNÇÕES DO MODAL ---

function abrirModalDeDespacho(nome, localizacao, cor) {
    // 1. Preenche o modal com os dados do alerta clicado
    modalTipo.textContent = nome.split(': ')[1]; // Ex: "Batida de Carro"
    modalLocalizacao.textContent = `Maquete Coordenadas: [${localizacao.x}, ${localizacao.y}]`;
    modalAlertaTag.textContent = nome.split(':')[0]; // Ex: "INCIDENTE GRAVE"
    
    // 2. Mostra o modal
    modalOverlay.classList.add('active');
}

function fecharModalDeDespacho() {
    modalOverlay.classList.remove('active');
}

// Adiciona o evento para fechar o modal no botão "X"
modalCloseBtn.addEventListener('click', fecharModalDeDespacho);

// (Opcional) Fecha o modal se clicar fora dele
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
        fecharModalDeDespacho();
    }
});