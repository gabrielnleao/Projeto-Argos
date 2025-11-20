const { Pool } = require('pg');

let pool;

// Só tenta conectar se a variável existir
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
}

export default async function handler(req, res) {
  // VERIFICAÇÃO DE SEGURANÇA
  if (!pool) {
    console.error("DATABASE_URL não encontrada!");
    return res.status(500).json({ 
      error: 'Erro de Configuração', 
      detalhes: 'A variável DATABASE_URL não foi configurada corretamente na Vercel.' 
    });
  }
  
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
        console.error(error); // Mostra no log da Vercel
        res.status(500).json({ 
            error: 'Erro ao ler banco', 
            detalhes: error.message // <--- ISSO VAI MOSTRAR O MOTIVO REAL NA TELA
        });
    }
  }
}