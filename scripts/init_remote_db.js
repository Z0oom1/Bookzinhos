const path = require("path");
module.paths.push(path.join(__dirname, "../server/node_modules"));

require("dotenv").config({ path: path.join(__dirname, "../server/.env") });
const { initDB } = require("../server/db");

async function run() {
  console.log("🚀 Iniciando criação de tabelas no banco de dados remoto Turso...");
  try {
    await initDB();
    console.log("✅ Banco de dados remoto inicializado e tabelas criadas com sucesso!");
  } catch (err) {
    console.error("❌ Erro ao inicializar o banco de dados remoto:", err);
  }
}

run();
