export function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .normalize("NFD")                // remove acentos
    .replace(/[\u0300-\u036f]/g, "") // continua removendo acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// bem simples: linhas em branco separam parágrafos.
// linhas que parecem subtítulo viram <h2>.
export function convertTextToHtml(raw) {
  const lines = raw
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0); // remove linhas vazias duplicadas

  return lines
    .map(l => {
      // heurística de subtítulo:
      // se a linha é curta (<60 chars) e tem poucas pontuações finais,
      // tratamos como <h2>
      const isSubtitle =
        l.length < 60 &&
        !/[.!?]$/.test(l) &&
        /^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(l);

      if (isSubtitle) {
        return `<h2>${escapeHtml(l)}</h2>`;
      }

      return `<p>${escapeHtml(l)}</p>`;
    })
    .join("\n\n");
}

export function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// data tipo "25 de outubro de 2025"
export function formatDatePtBR(dateObj) {
  return dateObj.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
