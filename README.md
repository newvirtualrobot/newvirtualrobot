# autopost-site

Gerador estático simples que cria posts diários otimizados para SEO usando templates EJS-like.

## O que é

Este projeto gera um site estático em `public/` a partir de templates em `src/templates/`. O conteúdo dos posts é criado automaticamente (via IA) pelo script `src/generatePost.js` e o site é montado por `src/buildSite.js`.

## Estrutura principal

- `src/` - código-fonte do gerador
  - `buildSite.js` - script principal que gera `public/`
  - `generatePost.js` - integração/geração do conteúdo (IA)
  - `templates/` - templates base, index e post
  - `keywords.txt` - lista de keywords (uma por linha)
- `public/` - site gerado (HTML, sitemap, rss, robots, posts)
- `.github/workflows/publish.yml` - workflow para publicar em GitHub Pages

## Pré-requisitos

- Node.js (recomendo 16+)
- npm ou yarn

## Instalação

Abra um terminal na raiz do projeto e execute:

```bash
npm install
```

## Variáveis de ambiente

Crie um arquivo `.env` (não comite) com as variáveis necessárias, por exemplo:

```
OPENAI_API_KEY=sk_xxx          # (se generatePost usar OpenAI)
GITHUB_TOKEN=ghp_xxx           # (se for usar o workflow e precisar empurrar automaticamente)
GA_MEASUREMENT_ID=G-XXXXXXXX   # (opcional) Google Analytics
ADSENSE_CLIENT=ca-pub-XXXXXXXX # (opcional) anuncios
```

O build utiliza `dotenv` (quando presente) — não inclua o `.env` no repositório.

## Como rodar localmente

Gerar o site localmente (gera/atualiza `public/`):

```bash
node src/buildSite.js
```

- Os posts são consumidos de `src/keywords.txt` (o gerador remove a primeira keyword ao usar).
- Os arquivos gerados ficam em `public/`.

## Configurar o domínio/base URL

O site usa a constante `SITE_URL` em `src/buildSite.js` para montar URLs canônicos, sitemap e RSS. Se você publicar o repositório na raiz do GitHub Pages (ex: `https://<user>.github.io`), garanta que `SITE_URL` esteja definido sem sufixo de repositório (ex: `https://newvirtualrobot.github.io`).

Se publicar em um repositório que usa caminho (`<user>.github.io/<repo>`), ajuste `SITE_URL` para incluir o sufixo `/repo`.

## Deploy (GitHub Pages)

O repositório já inclui um workflow em `.github/workflows/publish.yml` que pode publicar o conteúdo (ex.: branch `gh-pages`). Configure o `GITHUB_TOKEN` como segredo no repositório se necessário.

Alternativamente, você pode publicar manualmente:

```bash
# gerar
node src/buildSite.js
# adicionar, commitar e push (exemplo)
git add public/
git commit -m "Atualiza site gerado"
git push origin main
```

## Observações e boas práticas

- Os arquivos em `public/` são derivados — escolha se quer mantê-los versionados ou apenas gerar no CI antes do deploy.
- `src/keywords.txt` é consumido pelo build: a primeira keyword é removida no consumo. Faça backup se necessário.
- Teste templates em `src/templates/` antes de rodar builds automatizados.

## Problemas comuns

- Links quebrados: verifique `SITE_URL` em `src/buildSite.js` e a forma como os `href` nos templates usam caminhos relativos (`./` ou `../`).
- SEO/canonical incorreto: ajuste `SITE_URL` e regenere `public/`.

---

Se quiser, eu posso criar um commit com o `README.md` e empurrar para o repositório — deseja que eu faça isso agora? Caso prefira, também posso abrir um PR em vez de commitar direto na `main`.
