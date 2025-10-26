import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
dotenv.config();

// Suporte a __dirname em ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicializa cliente Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const MODEL_NAME = "gemini-2.5-flash";

export async function generatePost(keyword) {
  const prompt = `
  Escreva um artigo de blog em português (600–900 palavras) otimizado para SEO sobre "${keyword}".
  Estrutura:
  - Título com a palavra-chave principal.
  - Introdução envolvente (2 parágrafos curtos).
  - 3 a 5 subtítulos (variações semânticas da keyword).
  - Parágrafos curtos e claros.
  - Conclusão com chamada para ação leve.
  Retorne texto puro (sem markdown nem HTML).
  `;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
  });

  return response.text;
}

async function saveDebugFile(keyword, content) {
  const outDir = path.join(__dirname, "..", "public");
  await fs.ensureDir(outDir);

  const safeName = keyword.toLowerCase().replace(/[^a-z0-9\-]+/gi, "-");
  const outPath = path.join(outDir, `${safeName}.txt`);

  await fs.writeFile(outPath, content, "utf8");
  console.log(`✅ Post salvo em: ${outPath}`);
}

async function main() {
  try {
    const keyword = process.argv[2] || "benefícios do café para saúde";
    console.log("➡️  Usando keyword:", keyword);

    if (!process.env.GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEY não encontrada no .env");
      process.exit(1);
    }

    const article = await generatePost(keyword);

    console.log("📝 Conteúdo gerado (primeiras linhas):");
    console.log(article.slice(0, 200) + "...\n");

    await saveDebugFile(keyword, article);
  } catch (err) {
    console.error("💥 Erro ao gerar post:");
    console.error(err);
  }
}

main();
