require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

// Configuração Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const BUCKET = "bookzinhos";

// Banco de Dados Local
const dbPath = path.join(__dirname, "../server/data/bookdahelo.db");
const db = new sqlite3.Database(dbPath);

const booksData = [
  {
    file: "A Contadora Freida McFadden.pdf",
    title: "A Contadora",
    author: "Freida McFadden",
    genre: "Suspense",
    description: "Dawn Schiff é estranha. Pelo menos é o que todos na Vixed, a empresa de suplementos nutricionais, pensam dela. Mas quando Dawn não chega ao trabalho, sua colega Natalie começa a suspeitar que algo terrível aconteceu.",
    coverUrl: "https://m.media-amazon.com/images/I/71R2H2XyE1L.jpg"
  },
  {
    file: "A Professora Freida McFadden.pdf",
    title: "A Professora",
    author: "Freida McFadden",
    genre: "Suspense",
    description: "Eve é uma professora dedicada em uma escola secundária, mas ela esconde segredos obscuros sobre seu passado e sobre o que realmente acontece nas salas de aula.",
    coverUrl: "https://m.media-amazon.com/images/I/71-k9OQWzML.jpg"
  },
  {
    file: "A inquilina Freida McFadden.pdf",
    title: "A Inquilina",
    author: "Freida McFadden",
    genre: "Suspense",
    description: "Uma mulher se muda para uma nova casa e começa a suspeitar que a inquilina anterior não saiu por vontade própria. Um jogo de gato e rato começa.",
    coverUrl: "https://m.media-amazon.com/images/I/81S6lP7XmML.jpg"
  },
  {
    file: "A mulher em silêncio Freida McFadden.pdf",
    title: "A Mulher em Silêncio",
    author: "Freida McFadden",
    genre: "Suspense",
    description: "Um suspense psicológico sobre uma mulher que parou de falar após um evento traumático, e o médico que tenta descobrir a verdade por trás do seu silêncio.",
    coverUrl: "https://m.media-amazon.com/images/I/71a6xM6D1yL.jpg"
  },
  {
    file: "Até o Último de Nós Freida McFadden.pdf",
    title: "Até o Último de Nós",
    author: "Freida McFadden",
    genre: "Suspense",
    description: "Um grupo de amigos fica preso em uma nevasca em uma cabana isolada. Um a um, eles começam a desaparecer. Quem será o último?",
    coverUrl: "https://m.media-amazon.com/images/I/81X0xLzV-rL.jpg"
  },
  {
    file: "Jogo de amor para dois - Ali Hazelwood.pdf",
    title: "Jogo de Amor para Dois",
    author: "Ali Hazelwood",
    genre: "Romance",
    description: "Uma história de amor leve e divertida entre dois cientistas que precisam fingir um relacionamento durante um feriado em família.",
    coverUrl: "https://m.media-amazon.com/images/I/71U8GvKk+TL.jpg"
  },
  {
    file: "O Acidente Freida McFadden.pdf",
    title: "O Acidente",
    author: "Freida McFadden",
    genre: "Suspense",
    description: "O que parecia ser um trágico acidente de carro revela uma teia de mentiras e traições que mudará a vida de todos os envolvidos para sempre.",
    coverUrl: "https://m.media-amazon.com/images/I/71zB-W7-tWL.jpg"
  },
  {
    file: "O filho perfeito Freida McFadden.pdf",
    title: "O Filho Perfeito",
    author: "Freida McFadden",
    genre: "Suspense",
    description: "Uma mãe faria qualquer coisa pelo seu filho. Mas e se o seu filho perfeito for, na verdade, um monstro?",
    coverUrl: "https://m.media-amazon.com/images/I/71X8k4C4+FL.jpg"
  }
];

function normalizeFileName(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-zA-Z0-9.\-_]/g, "_") // Substitui espaços e outros por _
    .replace(/_{2,}/g, "_"); // Remove múltiplos underscores
}

async function uploadFile(filePath, fileName) {
  const fileBuffer = fs.readFileSync(filePath);
  const safeName = normalizeFileName(fileName);
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(`pdfs/${safeName}`, fileBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) throw error;
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(`pdfs/${safeName}`);
  return urlData.publicUrl;
}

async function run() {
  console.log("🧹 Limpando biblioteca...");
  const tables = ['books', 'book_reviews', 'book_pages', 'reading_progress', 'notes', 'saved_books'];
  for (const table of tables) {
    await new Promise((res) => db.run(`DELETE FROM ${table}`, res));
  }

  console.log("🚀 Iniciando repopulação com capas e nomes seguros...");
  const pdfDir = path.join(__dirname, "../pdfs");

  for (const book of booksData) {
    const pdfPath = path.join(pdfDir, book.file);
    if (!fs.existsSync(pdfPath)) {
      console.log(`⚠️ Arquivo não encontrado: ${book.file}`);
      continue;
    }

    try {
      console.log(`📤 Subindo ${book.title}...`);
      const publicPdfUrl = await uploadFile(pdfPath, book.file);
      
      const id = `book-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const query = `
        INSERT INTO books (id, title, author, description, genre, rating, review_count, is_public, cover_color, added_at, pdf_path, cover_image_path, is_user_book)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await new Promise((res, rej) => {
        db.run(query, [
          id,
          book.title,
          book.author,
          book.description,
          book.genre,
          4.5,
          1,
          1,
          "lavender-mint",
          Date.now(),
          publicPdfUrl,
          book.coverUrl,
          0
        ], (err) => err ? rej(err) : res());
      });
      console.log(`✅ ${book.title} cadastrado com sucesso!`);
    } catch (err) {
      console.error(`❌ Erro ao processar ${book.title}:`, err.message);
    }
  }

  console.log("\n✨ Repopulação concluída!");
  db.close();
}

run();
