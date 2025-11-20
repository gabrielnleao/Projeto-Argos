// Arquivo: api/registro.js
const { Pool } = require('pg');

// Usa a URL que você pegou no Supabase (vamos configurar a variável depois)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Necessário para Supabase
});

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { label, x, y } = req.body; // O ESP32 vai mandar isso

    try {
      // 1. Salva no Banco de Dados
      const query = 'INSERT INTO Emergencia (tipo_incidente, coordenada_x, coordenada_y) VALUES ($1, $2, $3)';
      const values = [label, x, y];
      
      await pool.query(query, values);

      // 2. Responde para o ESP32
      res.status(200).json({ message: 'Recebido e salvo na nuvem!' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao salvar no banco' });
    }
  } else {
    // Se o site tentar ler os dados (Polling)
    try {
        // Pega os últimos 5 registros
        const result = await pool.query('SELECT * FROM Emergencia ORDER BY id_incidente DESC LIMIT 5');
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao ler banco' });
    }
  }
}