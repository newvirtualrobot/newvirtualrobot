import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { generatePost } from "./generatePost.js";
import { slugify, convertTextToHtml, formatDatePtBR } from "./utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIG BÁSICA DO SITE
const SITE_URL = "https://tgalter.github.io/autopost-site";
const SITE_NAME = "autopost-site";
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const POSTS_DIR = path.join(PUBLIC_DIR, "posts");

// carrega template base e post
async function loadTemplates() {
  const baseTpl = await fs.readFile(path.join(__dirname, "templates", "base.html"), "utf8");
  const postTpl = await fs.readFile(path.join(__dirname, "templates", "post.html"), "utf8");
  return { baseTpl, postTpl };
}

// lê keywords.txt e pega a próxima palavra
async function getNextKeyword() {
  const keywordsPath = path.join(__dirname, "keywords.txt");
  const raw = await fs.readFile(keywordsPath, "utf8");
  const all = raw
    .split(/\r?\n/)
    .map(k => k.trim())
    .filter(k => k.length > 0);

  if (all.length === 0) {
    throw new Error("Sem keywords em keywords.txt");
  }

  // usamos a primeira keyword disponível
  const keyword = all[0];

  // remove a primeira do arquivo (consumida)
  const remaining = all.slice(1).join("\n");
  await fs.writeFile(keywordsPath, remaining, "utf8");

  return keyword;
}

// monta uma página de post completa (HTML final)
function renderFullPage(baseTpl, innerHtml, {
  title,
  desc,
  canonicalUrl,
  isPost
}) {
  const navLinks = isPost
    ? `<a href="../index.html">Início</a> ·
       <a href="../about.html">Sobre</a> ·
       <a href="../privacy.html">Privacidade</a>`
    : `<a href="./index.html">Início</a> ·
       <a href="./about.html">Sobre</a> ·
       <a href="./privacy.html">Privacidade</a>`;

  const footer_sitemap = isPost ? "../sitemap.xml" : "./sitemap.xml";
  const footer_rss     = isPost ? "../rss.xml"     : "./rss.xml";
  const footer_privacy = isPost ? "../privacy.html": "./privacy.html";

  return baseTpl
    .replace("{{PAGE_TITLE}}", escapeHtml(title))
    .replace("{{PAGE_DESCRIPTION}}", escapeHtml(desc || title))
    .replace("{{CANONICAL_URL}}", canonicalUrl)
    .replace("{{SITE_NAME}}", escapeHtml(SITE_NAME))
    .replace("{{EXTRA_HEAD}}", "")
    .replace("{{NAV_LINKS}}", navLinks)
    .replace("{{FOOTER_SITEMAP}}", footer_sitemap)
    .replace("{{FOOTER_RSS}}", footer_rss)
    .replace("{{FOOTER_PRIVACY}}", footer_privacy)
    .replace("{{CONTENT_TOP}}", innerHtml)
    .replace("{{CONTENT_BOTTOM}}", "");
}

// gera/atualiza index.html
async function buildIndex(postsMeta, baseTpl) {
  // postsMeta = [{ title, url, dateISO, dateHuman }]
  const listHtml = postsMeta
    .map(
      p => `
<li>
  <a href="${p.url}">${escapeHtml(p.title)}</a>
  <div style="font-size:.8rem;color:#555;">${p.dateHuman}</div>
</li>`
    )
    .join("\n");

  const inner = `
<section>
  <h1>Artigos recentes</h1>
  <ul style="list-style:none;padding-left:0;">
    ${listHtml}
  </ul>
</section>`;

  const full = renderFullPage(baseTpl, inner, {
  title: "Início",
  desc: "Artigos recentes",
  canonicalUrl: SITE_URL + "/index.html",
  isPost: false
});

  await fs.writeFile(path.join(PUBLIC_DIR, "index.html"), full, "utf8");
}

// gera/atualiza sitemap.xml
async function buildSitemap(postsMeta) {
  // postsMeta = [{ title, url, dateISO, dateHuman }]

  // monta todas as URLs do site
  const urls = [
    {
      loc: `${SITE_URL}/index.html`,
      lastmod: new Date().toISOString().split("T")[0],
    },
    {
      loc: `${SITE_URL}/about.html`,
      lastmod: new Date().toISOString().split("T")[0],
    },
    {
      loc: `${SITE_URL}/privacy.html`,
      lastmod: new Date().toISOString().split("T")[0],
    },
    ...postsMeta.map(p => ({
      loc: SITE_URL + p.url,
      // p.dateISO vem de loadExistingPostsMeta; se não tiver data por post,
      // a gente cai pra hoje, só pra satisfazer o Google.
      lastmod: (p.dateISO || new Date().toISOString())
        .split("T")[0],
    })),
  ];

  // gera o XML final com header e lastmod
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
  </url>`
  )
  .join("\n")}
</urlset>
`;

  await fs.writeFile(path.join(PUBLIC_DIR, "sitemap.xml"), xml, "utf8");
}

// gera/atualiza rss.xml (RSS 2.0 bem simples)
async function buildRss(postsMeta) {
  const items = postsMeta
    .map(
      p => `
  <item>
    <title><![CDATA[${p.title}]]></title>
    <link>${SITE_URL + p.url}</link>
    <guid>${SITE_URL + p.url}</guid>
    <pubDate>${new Date(p.dateISO).toUTCString()}</pubDate>
    <description><![CDATA[${p.title}]]></description>
  </item>`
    )
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
  <title>${SITE_NAME}</title>
  <link>${SITE_URL}</link>
  <description>${SITE_NAME}</description>
  ${items}
</channel>
</rss>`;

  await fs.writeFile(path.join(PUBLIC_DIR, "rss.xml"), rss, "utf8");
}

// gera/atualiza robots.txt
async function buildRobots() {
  const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
  await fs.writeFile(path.join(PUBLIC_DIR, "robots.txt"), robots, "utf8");
}

// garante about.html e privacy.html existam
async function ensureStaticPages(baseTpl) {
  const aboutPath = path.join(PUBLIC_DIR, "about.html");
  const privacyPath = path.join(PUBLIC_DIR, "privacy.html");

  if (!(await fs.pathExists(aboutPath))) {
    const inner = `
<section>
  <h1>Sobre</h1>
  <p>Este site publica conteúdo informativo diariamente usando automação e IA.</p>
  <p>Nosso objetivo é oferecer conteúdo útil e acessível.</p>
</section>`;
    const full = renderFullPage(baseTpl, inner, {
      title: "Sobre",
      desc: "Sobre o site",
      canonicalUrl: SITE_URL + "/about.html",
    });
    await fs.writeFile(aboutPath, full, "utf8");
  }

  if (!(await fs.pathExists(privacyPath))) {
    const inner = `
<section>
  <h1>Política de Privacidade</h1>
  <p>Podemos usar cookies, pixels e serviços de terceiros (ex: Google) para métricas de tráfego e anúncios.</p>
  <p>Ao usar este site, você concorda com essa coleta estatística.</p>
</section>`;
    const full = renderFullPage(baseTpl, inner, {
      title: "Privacidade",
      desc: "Política de Privacidade",
      canonicalUrl: SITE_URL + "/privacy.html",
    });
    await fs.writeFile(privacyPath, full, "utf8");
  }
}

// carrega metadados existentes dos posts já gerados
async function loadExistingPostsMeta() {
  await fs.ensureDir(POSTS_DIR);
  const files = (await fs.readdir(POSTS_DIR))
    .filter(f => f.endsWith(".html"));

  const meta = [];
  for (const file of files) {
    const fullPath = path.join(POSTS_DIR, file);
    const html = await fs.readFile(fullPath, "utf8");

    // pega title e published date de atributos que vamos inserir
    const matchTitle = html.match(/<h1>([^<]+)<\/h1>/i);
    const matchDate = html.match(/Publicado em ([^<]+)</i);

    const title = matchTitle ? matchTitle[1].trim() : file.replace(".html", "");
    const dateHuman = matchDate ? matchDate[1].trim() : "";
    // vamos converter dateHuman pra ISO aproximado só pra ordenar
    const dateISO = new Date().toISOString();

    meta.push({
      title,
      url: "/posts/" + file,
      dateISO,
      dateHuman,
    });
  }

  // ordem mais recente primeiro (assumindo geração diária, pode melhorar depois)
  meta.sort((a, b) => b.dateISO.localeCompare(a.dateISO));
  return meta;
}

// MAIN
async function main() {
  // 1. carrega templates
  const { baseTpl, postTpl } = await loadTemplates();

  // 2. garante dirs
  await fs.ensureDir(PUBLIC_DIR);
  await fs.ensureDir(POSTS_DIR);

  // 3. keyword do dia
  const keyword = await getNextKeyword();

  console.log("⚙️ Gerando post para keyword:", keyword);

  // 4. gera texto bruto com IA
  const rawArticle = await generatePost(keyword);

  // 5. converte texto bruto em HTML simples
  const articleHtml = convertTextToHtml(rawArticle);

  // 6. define título -> primeira linha até quebra ou usa keyword
  const firstLine = rawArticle.split(/\r?\n/).find(l => l.trim().length > 0) || keyword;
  const postTitle = firstLine.trim();

  // datas
  const now = new Date();
  const dateHuman = formatDatePtBR(now);
  const slug = slugify(postTitle);

  // 7. injeta no template de post
  const postInner = postTpl
    .replace("{{POST_TITLE}}", escapeHtml(postTitle))
    .replace("{{PUBLISHED_DATE}}", dateHuman)
    .replace("{{POST_HTML}}", articleHtml);

  // 8. envelopa com base.html
  const fullPostPage = renderFullPage(baseTpl, postInner, {
    title: postTitle,
    desc: postTitle,
    canonicalUrl: `${SITE_URL}/posts/${slug}.html`,
    isPost: true
  });

  // 9. salva post individual
  const postPath = path.join(POSTS_DIR, `${slug}.html`);
  await fs.writeFile(postPath, fullPostPage, "utf8");
  console.log("✅ Post salvo em:", postPath);

  // 10. recarrega todos os posts (já incluindo o novo)
  const postsMeta = await loadExistingPostsMeta();

  // 11. gera/atualiza páginas globais
  await ensureStaticPages(baseTpl);
  await buildIndex(postsMeta, baseTpl);
  await buildSitemap(postsMeta);
  await buildRss(postsMeta);
  await buildRobots();

  console.log("🎉 Site atualizado em /public");
}

// precisamos de escapeHtml aqui também
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

main().catch(err => {
  console.error("💥 Erro no buildSite:");
  console.error(err);
  process.exit(1);
});
