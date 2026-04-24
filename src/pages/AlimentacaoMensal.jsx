import { useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import FormLancamento from "../components/FormLancamento";
import ListaLancamentos from "../components/ListaLancamentos";
import { useAuth } from "../context/AuthContext";
import { useLancamentos } from "../hooks/useLancamentos";
import {
  formatarCompetencia,
  normalizarCompetencia,
  ordenarCompetencias,
} from "../utils/competencia";

function formatCurrency(value = 0) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

export default function AlimentacaoMensal() {
  const { logout } = useAuth();
  const { lancamentos = [], erro, remover, recarregar } = useLancamentos();

  const [itemEditando, setItemEditando] = useState(null);
  const [mesSelecionado, setMesSelecionado] = useState("");
  const [tipoSelecionado, setTipoSelecionado] = useState("todos");
  const [buscaTexto, setBuscaTexto] = useState("");

  const mesesDisponiveis = useMemo(() => {
  return ordenarCompetencias(
    [...new Set(lancamentos.map((item) => item.competencia))]
  );
}, [lancamentos]);

  const lancamentosFiltrados = useMemo(() => {
    const busca = buscaTexto.trim().toLowerCase();

    return lancamentos
      .filter((item) => {
        const mesOk =
          !mesSelecionado ||
          normalizarCompetencia(item.competencia) === mesSelecionado;

        const tipoOk =
          !tipoSelecionado ||
          tipoSelecionado === "todos" ||
          String(item.tipo || "").toLowerCase() === tipoSelecionado;

        const buscaOk =
          !busca ||
          String(item.descricao || "").toLowerCase().includes(busca) ||
          String(item.categoria || "").toLowerCase().includes(busca) ||
          String(item.observacao || "").toLowerCase().includes(busca);

        return mesOk && tipoOk && buscaOk;
      })
      .sort((a, b) =>
        String(b?.competencia || b?.data || "").localeCompare(
          String(a?.competencia || a?.data || "")
        )
      );
  }, [lancamentos, mesSelecionado, tipoSelecionado, buscaTexto]);

  const resumo = useMemo(() => {
    let receitas = 0;
    let despesas = 0;

    lancamentosFiltrados.forEach((item) => {
      const valor = Number(item?.valor || 0);
      const tipo = String(item?.tipo || "").toLowerCase();

      if (tipo === "receita") receitas += valor;
      else despesas += valor;
    });

    return {
      receitas,
      despesas,
      saldo: receitas - despesas,
      total: lancamentosFiltrados.length,
    };
  }, [lancamentosFiltrados]);

  async function handleLogout() {
    try {
      await logout();
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  }

  function handleEditar(item) {
    setItemEditando(item);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleExcluir(id) {
    const confirmou = window.confirm("Deseja realmente excluir este lançamento?");
    if (!confirmou) return;

    try {
      await remover(id);
      if (itemEditando?.id === id) setItemEditando(null);
      await recarregar();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      alert("Erro ao excluir lançamento.");
    }
  }

  function handleLancamentoSalvo() {
    setItemEditando(null);
    recarregar();
  }

  function handleCancelarEdicao() {
    setItemEditando(null);
  }

  return (
    <div style={styles.page}>
      <Sidebar onLogout={handleLogout} />

      <main style={styles.content}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Alimentação Mensal</h1>
            <p style={styles.subtitle}>Lançamentos operacionais do período</p>
          </div>
        </div>

        {erro ? <div style={styles.errorBox}>{erro}</div> : null}

        <div style={styles.filtersCard}>
          <select
  value={mesSelecionado}
  onChange={(e) => setMesSelecionado(e.target.value)}
  style={styles.input}
>
  <option value="">Todos os meses</option>
  {mesesDisponiveis.map((mes) => (
    <option key={mes} value={mes}>
      {formatarCompetencia(mes)}
    </option>
  ))}
</select>

          <select
            value={tipoSelecionado}
            onChange={(e) => setTipoSelecionado(e.target.value)}
            style={styles.input}
          >
            <option value="todos">Todos os tipos</option>
            <option value="receita">Só receitas</option>
            <option value="despesa">Só despesas</option>
          </select>

          <input
            type="text"
            placeholder="Buscar descrição, categoria ou observação"
            value={buscaTexto}
            onChange={(e) => setBuscaTexto(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.cards}>
          <div style={{ ...styles.card, background: "#eefaf5" }}>
            <div style={styles.cardLabel}>Receitas</div>
            <div style={{ ...styles.cardValue, color: "#059669" }}>
              {formatCurrency(resumo.receitas)}
            </div>
          </div>

          <div style={{ ...styles.card, background: "#fff3f3" }}>
            <div style={styles.cardLabel}>Despesas</div>
            <div style={{ ...styles.cardValue, color: "#dc2626" }}>
              {formatCurrency(resumo.despesas)}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardLabel}>Saldo</div>
            <div
              style={{
                ...styles.cardValue,
                color: resumo.saldo >= 0 ? "#2563eb" : "#dc2626",
              }}
            >
              {formatCurrency(resumo.saldo)}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardLabel}>Qtde. lançamentos</div>
            <div style={styles.cardValue}>{resumo.total}</div>
          </div>
        </div>

        <div style={styles.grid}>
          <FormLancamento
            key={itemEditando?.id || "novo"}
            onLancamentoSalvo={handleLancamentoSalvo}
            itemEditando={itemEditando}
            onCancelarEdicao={handleCancelarEdicao}
          />

          <ListaLancamentos
            lancamentos={lancamentosFiltrados}
            onEditar={handleEditar}
            onExcluir={handleExcluir}
            titulo="Lançamentos filtrados"
          />
        </div>
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    background: "#f8fafc",
  },
  content: {
    flex: 1,
    padding: "40px",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    flexWrap: "wrap",
    marginBottom: "24px",
  },
  title: {
    marginTop: 0,
    marginBottom: "8px",
    fontSize: "30px",
  },
  subtitle: {
    color: "#64748b",
    marginTop: 0,
    marginBottom: 0,
  },
  filtersCard: {
    display: "grid",
    gridTemplateColumns: "220px 220px 1fr",
    gap: "12px",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "18px",
    marginBottom: "24px",
  },
  input: {
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #d1d5db",
    background: "#fff",
    fontSize: "15px",
  },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "18px",
    marginBottom: "24px",
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "22px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  },
  cardLabel: {
    color: "#64748b",
    fontSize: "15px",
    marginBottom: "12px",
  },
  cardValue: {
    fontSize: "28px",
    fontWeight: 700,
    color: "#111827",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "360px 1fr",
    gap: "24px",
    alignItems: "start",
  },
  errorBox: {
    background: "#fff1f2",
    color: "#b91c1c",
    border: "1px solid #fecdd3",
    padding: "16px",
    borderRadius: "12px",
    marginBottom: "24px",
  },
};