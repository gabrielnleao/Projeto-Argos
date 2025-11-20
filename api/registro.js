const { Pool } = require('pg');

let pool = null;

// Tenta iniciar o banco de forma segura
try {
  if (process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  } else {
    console.log("⚠️ AVISO: A variável DATABASE_URL não foi encontrada no ambiente.");
  }
} catch (err) {
  console.error("❌ Erro fatal ao iniciar o Pool do Postgres:", err);
}

// --- AQUI ESTÁ A CORREÇÃO (module.exports) ---
module.exports = async function handler(req, res) {
  
  // 1. DEBUG: Mostrar na tela se a variável existe
  if (!pool) {
    return res.status(500).json({
      erro: "Configuração Ausente",
      mensagem: "O site não conseguiu ler a variável DATABASE_URL.",
      dica: "Verifique em Settings > Environment Variables se o nome está exato e se fez Redeploy.",
      debug_variavel_existe: !!process.env.DATABASE_URL 
    });
  }

  // 2. Se chegou aqui, o banco está configurado. Vamos tentar salvar.
  if (req.method === 'POST') {
    const { label, x, y } = req.body;

    try {
      const query = 'INSERT INTO Emergencia (tipo_incidente, coordenada_x, coordenada_y) VALUES ($1, $2, $3)';
      const values = [label, x, y];
      
      await pool.query(query, values);
      res.status(200).json({ message: 'Sucesso! Salvo no banco.' });

    } catch (error) {
      console.error("Erro SQL:", error);
      res.status(500).json({ error: "Erro ao salvar no banco", detalhes: error.message });
    }
  } else {
    // Método GET (Teste de leitura)
    try {
      const result = await pool.query('SELECT NOW()'); 
      res.status(200).json({ 
        status: "Online", 
        hora_banco: result.rows[0],
        mensagem: "Conexão com o banco está perfeita!" 
      });
    } catch (error) {
      console.error("Erro SQL:", error);
      res.status(500).json({ error: "Erro ao ler do banco", detalhes: error.message });
    }
  }
};