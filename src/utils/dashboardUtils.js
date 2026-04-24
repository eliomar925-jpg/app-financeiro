const MONTH_LABELS = {
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

export function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

export function getMonthKey(value) {
  if (!value) return "";

  const raw = String(value).trim();

  if (/^\d{4}-\d{2}$/.test(raw)) {
    return raw;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw.slice(0, 7);
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [, mm, yyyy] = raw.split("/");
    return `${yyyy}-${mm}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 7);
  }

  return "";
}

export function getCompetencia(item) {
  const competencia = getMonthKey(item?.competencia);
  if (competencia) return competencia;

  return getMonthKey(item?.data);
}

export function getMonthLabel(monthKey) {
  return MONTH_LABELS[monthKey] || monthKey || "";
}

export function buildDashboardData(lancamentos = []) {
  const validos = lancamentos
    .map((item) => ({
      ...item,
      __monthKey: getCompetencia(item),
    }))
    .filter((item) => item.__monthKey);

  const monthKeys = Array.from(
    new Set(validos.map((item) => item.__monthKey))
  ).sort();

  const months = monthKeys.map((monthKey) => ({
    monthKey,
    mes: getMonthLabel(monthKey),
  }));

  let saldoAcumulado = 0;

  const chartData = monthKeys.map((monthKey) => {
    const items = validos.filter((item) => item.__monthKey === monthKey);

    let receitas = 0;
    let despesas = 0;

    items.forEach((item) => {
      const valor = Number(item.valor || 0);
      const tipo = String(item.tipo || "").toLowerCase();

      if (tipo === "receita") receitas += valor;
      else despesas += valor;
    });

    const saldoMes = receitas - despesas;
    saldoAcumulado += saldoMes;

    return {
      monthKey,
      mes: getMonthLabel(monthKey),
      receitas,
      despesas,
      saldoMes,
      saldoAcumulado,
    };
  });

  const totalReceitas = chartData.reduce((sum, item) => sum + item.receitas, 0);
  const totalDespesas = chartData.reduce((sum, item) => sum + item.despesas, 0);

  const ultimo = chartData[chartData.length - 1] || {
    saldoMes: 0,
    saldoAcumulado: 0,
  };

  return {
    months,
    chartData,
    resumoData: chartData,
    summary: {
      totalReceitas,
      totalDespesas,
      saldoMes: ultimo.saldoMes,
      saldoAcumulado: ultimo.saldoAcumulado,
    },
  };
}