/* --- 1. CONFIGURAÇÃO DO SERVIDOR --- */
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORTA = 3000; // A porta que nosso site vai rodar

// Configura o Express para "entender" dados JSON vindos do ESP32
app.use(express.json());
// Configura o Express para "mostrar" nossos arquivos HTML, CSS, JS
app.use(express.static(__dirname)); 

/* --- 2. LÓGICA DO SERVIDOR-PONTE --- */

// PASSO A: O ESP32 (Olho) se comunica aqui
// Nós criamos uma "porta" (endpoint) chamada '/detections'
// O ESP32-CAM vai enviar os dados da IA para este endereço.
app.post('/detections', (req, res) => {
    
    // 1. Pega os dados JSON que o ESP32 enviou
    const deteccoes = req.body;
    
    // 2. Mostra no console do servidor o que o ESP32 está "vendo" (bom para testar)
    console.log('Dados recebidos do ESP32:', deteccoes);

    // 3. PASSO B: Retransmite esses dados para o Site (Cérebro)
    // Envia a lista de detecções para TODOS os sites conectados
    io.emit('detections', deteccoes); 

    // 4. Responde ao ESP32 que deu tudo certo
    res.status(200).send({ message: 'Dados recebidos com sucesso' });
});

// PASSO C: O Site (Cérebro) se conecta aqui
io.on('connection', (socket) => {
    console.log('Um operador (site) se conectou ao painel.');
    
    socket.on('disconnect', () => {
        console.log('Operador (site) desconectou.');
    });
});

/* --- 3. INICIANDO O SERVIDOR --- */
server.listen(PORTA, () => {
    console.log(`Servidor Projeto ARGOS rodando na porta ${PORTA}`);
    console.log('Acesse http://localhost:3000 no seu navegador');
});