const MONTHS = {
  jan: "01", janeiro: "01", january: "01",
  fev: "02", fevereiro: "02", feb: "02", february: "02",
  mar: "03", marco: "03", march: "03",
  abr: "04", abril: "04", apr: "04", april: "04",
  mai: "05", maio: "05", may: "05",
  jun: "06", junho: "06", june: "06",
  jul: "07", julho: "07", july: "07",
  ago: "08", agosto: "08", aug: "08", august: "08",
  set: "09", setembro: "09", sep: "09", september: "09",
  out: "10", outubro: "10", oct: "10", october: "10",
  nov: "11", novembro: "11", november: "11",
  dez: "12", dezembro: "12", dec: "12", december: "12",
};

function clean(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizeYear(year) {
  if (!year) return "";
  const y = String(year).trim();
  return y.length === 2 ? `20${y}` : y;
}

export function normalizarCompetencia(valor) {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return valor.toISOString().slice(0, 7);
  }

  const rawOriginal = String(valor ?? "").trim();
  if (!rawOriginal) return "";

  if (/^\d{4}-\d{2}$/.test(rawOriginal)) return rawOriginal;
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawOriginal)) return rawOriginal.slice(0, 7);

  const raw = clean(rawOriginal).replace(/[\.\s]/g, "");

  let match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (match) {
    const mm = match[2].padStart(2, "0");
    return `${normalizeYear(match[3])}-${mm}`;
  }

  match = raw.match(/^(\d{1,2})\/(\d{2}|\d{4})$/);
  if (match) {
    const mm = match[1].padStart(2, "0");
    return `${normalizeYear(match[2])}-${mm}`;
  }

  match = raw.match(/^([a-z]+)[\/\-](\d{2}|\d{4})$/);
  if (match) {
    const mes = MONTHS[match[1].slice(0, 3)] || MONTHS[match[1]];
    return mes ? `${normalizeYear(match[2])}-${mes}` : "";
  }

  match = raw.match(/^([a-z]+)de(\d{4})$/);
  if (match) {
    const mes = MONTHS[match[1].slice(0, 3)] || MONTHS[match[1]];
    return mes ? `${match[2]}-${mes}` : "";
  }

  match = raw.match(/^(\d{1,2})de([a-z]+)de(\d{4})$/);
  if (match) {
    const mes = MONTHS[match[2].slice(0, 3)] || MONTHS[match[2]];
    return mes ? `${match[3]}-${mes}` : "";
  }

  return "";
}

export function formatarCompetencia(valor) {
  const comp = normalizarCompetencia(valor);
  if (!comp) return "Sem mes";

  const [yyyy, mm] = comp.split("-");
  const labels = {
    "01": "Jan",
    "02": "Fev",
    "03": "Mar",
    "04": "Abr",
    "05": "Mai",
    "06": "Jun",
    "07": "Jul",
    "08": "Ago",
    "09": "Set",
    "10": "O\u200But",
    "11": "Nov",
    "12": "Dez",
  };

  return `${labels[mm] || mm}/${yyyy.slice(-2)}`;
}

export function ordenarCompetencias(lista = []) {
  return [...lista]
    .map((item) => normalizarCompetencia(item))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}
