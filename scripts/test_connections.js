const path = require("path");
// Adiciona o diretório node_modules do servidor ao caminho de busca do Node
module.paths.push(path.join(__dirname, "../server/node_modules"));

require("dotenv").config({ path: path.join(__dirname, "../server/.env") });
const { db, sql } = require("../server/db");

async function testDatabase() {
  console.log("=== TESTANDO BANCO DE DADOS ===");
  try {
    const isTurso = !!process.env.TURSO_DATABASE_URL;
    console.log(`Modo detectado: ${isTurso ? "Remoto (Turso)" : "Local (SQLite)"}`);
    
    // Executa uma query simples de teste
    const res = await db.query(sql`SELECT 1 + 1 as result`);
    console.log("Resultado da query simples:", res);
    
    if (res && res[0] && (res[0].result === 2 || res[0]["1 + 1"] === 2)) {
      console.log("✅ Conexão e execução de query OK!");
    } else {
      console.warn("⚠️ Resultado inesperado da query:", res);
    }
  } catch (err) {
    console.error("❌ Falha no teste de banco de dados:", err.message);
  }
}

async function testS3Storage() {
  console.log("\n=== TESTANDO ARMAZENAMENTO S3 ===");
  if (!process.env.S3_ACCESS_KEY_ID) {
    console.log("⚠️ Variáveis S3_ACCESS_KEY_ID não encontradas no .env. Ignorando teste S3.");
    return;
  }
  
  try {
    const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
    const BUCKET = process.env.S3_BUCKET_NAME || "bookzinhos";
    
    console.log("Inicializando cliente S3 com endpoint:", process.env.S3_ENDPOINT);
    const s3Client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    });
    
    const testKey = `test-connection-${Date.now()}.txt`;
    console.log(`Tentando subir arquivo de teste para o bucket "${BUCKET}" com chave "${testKey}"...`);
    
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: testKey,
      Body: Buffer.from("Conexão S3 myBooks funcionando! 🐼"),
      ContentType: "text/plain"
    });
    
    await s3Client.send(command);
    console.log("✅ Upload S3 enviado com sucesso!");
    
    let downloadUrl = "";
    if (process.env.S3_PUBLIC_URL_PREFIX) {
      downloadUrl = `${process.env.S3_PUBLIC_URL_PREFIX}/${testKey}`;
    } else {
      downloadUrl = `${process.env.S3_ENDPOINT}/${BUCKET}/${testKey}`;
    }
    console.log("🔗 URL Pública gerada:", downloadUrl);
    console.log("✅ Conexão S3 OK!");
  } catch (err) {
    console.error("❌ Falha no teste de armazenamento S3:", err.message);
  }
}

async function run() {
  await testDatabase();
  await testS3Storage();
  console.log("\n=== FIM DOS TESTES ===");
}

run();
