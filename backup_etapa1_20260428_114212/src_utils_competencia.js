export function normalizarCompetencia(valor) {
  const raw = String(valor ?? "").trim();

  if (!raw) return "";

  if (/^\d{4}-\d{2}$/.test(raw)) {
    return raw;
  }

  const mapaEntrada = {
    "Abr/26": "2026-04",
    "Mai/26": "2026-05",
    "Jun/26": "2026-06",
    "Jul/26": "2026-07",
    "Ago/26": "2026-08",
    "Set/26": "2026-09",
    "Out/26": "2026-10",
    "Nov/26": "2026-11",
    "Dez/26": "2026-12",

    "26 de abril": "2026-04",
    "26 de maio": "2026-05",
    "26 de junho": "2026-06",
    "26/julho": "2026-07",
    "26 de agosto": "2026-08",
    "Conjunto/26": "2026-09",
    "Saída/26": "2026-10",
    "26/11": "2026-11",
    "26/12": "2026-12",
  };

  if (mapaEntrada[raw]) return mapaEntrada[raw];

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw.slice(0, 7);
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [, mm, yyyy] = raw.split("/");
    return `${yyyy}-${mm}`;
  }

  return "";
}

export function formatarCompetencia(valor) {
  const comp = normalizarCompetencia(valor);

  const mapaSaida = {
    "2026-04": "Abr/26",
    "2026-05": "Mai/26",
    "2026-06": "Jun/26",
    "2026-07": "Jul/26",
    "2026-08": "Ago/26",
    "2026-09": "Set/26",
    "2026-10": "Out/26",
    "2026-11": "Nov/26",
    "2026-12": "Dez/26",
  };

  return mapaSaida[comp] || "Sem mês";
}

export function ordenarCompetencias(lista = []) {
  return [...lista]
    .map((item) => normalizarCompetencia(item))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}