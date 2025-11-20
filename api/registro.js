const { Pool } = require('pg');

// Inicia a conexão (agora sabemos que funciona!)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

module.exports = async function handler(req, res) {
  // Configura CORS para permitir que seu site (frontend) acesse a API
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // --- 1. RECEBER DADOS DO ESP32 (POST) ---
  if (req.method === 'POST') {
    const { label, x, y } = req.body;

    try {
      // Só salva se for um alerta de interesse (ignora verde/azul/background)
      // (Você pode ajustar essa lista conforme sua necessidade)
      if (['vermelho', 'laranja', 'roxo', 'amarelo'].includes(label)) {
          const query = 'INSERT INTO Emergencia (tipo_incidente, coordenada_x, coordenada_y) VALUES ($1, $2, $3)';
          const values = [label, x, y];
          await pool.query(query, values);
          console.log(`Alerta ${label} salvo!`);
      }
      
      res.status(200).json({ message: 'Dados processados com sucesso.' });
    } catch (error) {
      console.error("Erro ao salvar:", error);
      res.status(500).json({ error: "Erro ao salvar no banco." });
    }
  } 
  
  // --- 2. ENVIAR DADOS PARA O SITE (GET) ---
  else if (req.method === 'GET') {
    try {
      // Pega os últimos 10 alertas (do mais recente para o mais antigo)
      const result = await pool.query('SELECT * FROM Emergencia ORDER BY id_incidente DESC LIMIT 10');
      res.status(200).json(result.rows);
    } catch (error) {
      console.error("Erro ao ler:", error);
      res.status(500).json({ error: "Erro ao ler o banco de dados." });
    }
  } else {
    res.status(405).json({ error: "Método não permitido" });
  }
};