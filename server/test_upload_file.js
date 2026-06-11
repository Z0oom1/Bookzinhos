const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function run() {
  try {
    const filePath = path.resolve(__dirname, "../Livros/A Contadora - Freida McFadden.pdf");
    console.log("File path:", filePath);
    console.log("Exists:", fs.existsSync(filePath));
    if (!fs.existsSync(filePath)) return;

    const fileBuffer = fs.readFileSync(filePath);
    console.log("File size:", fileBuffer.length, "bytes");

    console.log("Uploading to Supabase...");
    const start = Date.now();
    const { data, error } = await supabase.storage
      .from("bookzinhos")
      .upload("pdfs/test-contadora.pdf", fileBuffer, { contentType: "application/pdf", upsert: true });

    console.log("Time taken:", (Date.now() - start) / 1000, "seconds");

    if (error) {
      console.error("Upload error:", error);
    } else {
      console.log("Success! Upload data:", data);
    }
  } catch (err) {
    console.error("Exception occurred:", err);
  }
}

run();
