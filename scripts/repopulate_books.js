const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const DB_PATH = path.join(__dirname, '../server/data/bookdahelo.db');
const db = new sqlite3.Database(DB_PATH);

const booksMetadata = [
  {
    file: "A Contadora Freida McFadden.pdf",
    title: "A Contadora",
    author: "Freida McFadden",
    genre: "Suspense",
    description: "Dawn Schiff é uma contadora excêntrica com uma rotina perfeita. Quando ela desaparece, sua colega Natalie Farrell se vê envolvida em um mistério sombrio onde ninguém é quem parece ser."
  },
  {
    file: "A Professora Freida McFadden.pdf",
    title: "A Professora",
    author: "Freida McFadden",
    genre: "Suspense",
    description: "Eve é uma professora cuja vida perfeita é abalada por um escândalo escolar envolvendo uma aluna. Enquanto investiga, segredos perturbadores revelam que a verdade é muito mais perversa."
  },
  {
    file: "A inquilina Freida McFadden.pdf",
    title: "A Inquilina",
    author: "Freida McFadden",
    genre: "Suspense",
    description: "Blake Porter aluga um quarto para a simpática Whitney. Mas logo a atmosfera da casa muda e ele percebe que a inquilina perfeita pode ser o seu pior pesadelo."
  },
  {
    file: "A mulher em silêncio Freida McFadden.pdf",
    title: "A Mulher em Silêncio",
    author: "Freida McFadden",
    genre: "Suspense",
    description: "Victoria Barnett está presa em seu próprio corpo após um acidente. Sua acompanhante Sylvia começa a suspeitar que o silêncio de Victoria esconde um pedido de socorro desesperado."
  },
  {
    file: "Até o Último de Nós Freida McFadden.pdf",
    title: "Até o Último de Nós",
    author: "Freida McFadden",
    genre: "Suspense",
    description: "Um grupo de amigos fica preso em uma mata isolada a caminho de uma pousada. O que era para ser uma viagem de renovação vira uma luta pela sobrevivência quando eles começam a desaparecer."
  },
  {
    file: "Jogo de amor para dois - Ali Hazelwood.pdf",
    title: "Jogo de amor para dois",
    author: "Ali Hazelwood",
    genre: "Romance",
    description: "Viola e Jesse são arqui-inimigos obrigados a trabalhar juntos em um videogame. Em um retiro de inverno, a tensão entre os dois se transforma em algo muito mais quente."
  },
  {
    file: "O Acidente Freida McFadden.pdf",
    title: "O Acidente",
    author: "Freida McFadden",
    genre: "Suspense",
    description: "Grávida e fugindo do passado, Tegan sofre um acidente em uma tempestade de neve. O abrigo oferecido por um casal em uma cabana remota logo se revela uma armadilha mortal."
  },
  {
    file: "O filho perfeito Freida McFadden.pdf",
    title: "O Filho Perfeito",
    author: "Freida McFadden",
    genre: "Suspense",
    description: "Erika sempre soube que havia algo de errado com seu filho Liam. Quando ele se torna suspeito de um crime, ela precisa decidir até onde vai para proteger quem ama."
  }
];

async function run() {
  console.log("🚀 Iniciando repopulação da biblioteca...");

  // Limpar tabelas
  const tables = ['books', 'book_reviews', 'book_pages', 'reading_progress', 'notes', 'saved_books'];
  for (const table of tables) {
    await new Promise((resolve, reject) => {
      db.run(`DELETE FROM ${table}`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
  console.log("✅ Tabelas limpas.");

  const pdfDir = path.join(__dirname, '../pdfs');

  for (const meta of booksMetadata) {
    const filePath = path.join(pdfDir, meta.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Arquivo não encontrado: ${meta.file}`);
      continue;
    }

    console.log(`📦 Carregando: ${meta.title}...`);
    const fileBuffer = fs.readFileSync(filePath);
    const id = `book-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const supabasePath = `pdfs/${id}.pdf`;

    // Upload para Supabase
    const { data, error } = await supabase.storage
      .from('bookzinhos')
      .upload(supabasePath, fileBuffer, { contentType: 'application/pdf', upsert: true });

    if (error) {
      console.error(`❌ Erro no upload de ${meta.title}:`, error.message);
      continue;
    }

    const { data: urlData } = supabase.storage.from('bookzinhos').getPublicUrl(supabasePath);
    const pdfUrl = urlData.publicUrl;

    // Inserir no banco
    const addedAt = Date.now();
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO books (id, title, author, description, genre, rating, review_count, is_public, cover_color, added_at, pdf_path, is_user_book)
         VALUES (?, ?, ?, ?, ?, 0, 0, 1, ?, ?, ?, 1)`,
        [id, meta.title, meta.author, meta.description, meta.genre, 'lavender-mint', addedAt, pdfUrl],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    console.log(`✅ Livro adicionado: ${meta.title}`);
  }

  db.close();
  console.log("🏁 Biblioteca repopulada com sucesso!");
}

run().catch(console.error);
