import { useMemo, useState } from "react";
import { collection, deleteDoc, getDocs, query, where } from "firebase/firestore";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { useLancamentos } from "../hooks/useLancamentos";
import { db } from "../firebase";

function isCompetenciaValida(value) {
  return /^\d{4}-\d{2}$/.test(String(value || "").trim());
}

export default function Configuracoes() {
  const { user, userProfile, logout } = useAuth();
  const { lancamentos = [], loading = false, recarregar } = useLancamentos();
  const [processing, setProcessing] = useState(false);

  const householdId = userProfile?.householdId || null;

  const stats = useMemo(() => {
    const total = lancamentos.length;
    const importados = lancamentos.filter(
      (item) => String(item?.source || "").toLowerCase() === "importacao"
    ).length;
    const mesesInvalidos = lancamentos.filter(
      (item) => !isCompetenciaValida(item?.competencia)
    ).length;

    return {
      total,
      importados,
      mesesInvalidos,
    };
  }, [lancamentos]);

  async function handleLogout() {
    try {
      await logout();
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  }

  async function excluirDocs(snapshot) {
    for (const item of snapshot.docs) {
      await deleteDoc(item.ref);
    }
  }

  async function handleExcluirTodos() {
    if (!householdId) {
      alert("Residência não identificada.");
      return;
    }

    const ok = window.confirm(
      `ATENÇÃO: isso vai apagar TODOS os ${stats.total} lançamentos da base atual.\n\nDeseja continuar?`
    );
    if (!ok) return;

    try {
      setProcessing(true);

      const q = query(
        collection(db, "lancamentos"),
        where("householdId", "==", householdId)
      );

      const snapshot = await getDocs(q);
      await excluirDocs(snapshot);
      await recarregar();

      alert("Todos os lançamentos foram excluídos.");
    } catch (error) {
      console.error(error);
      alert("Erro ao excluir todos os lançamentos.");
    } finally {
      setProcessing(false);
    }
  }

  async function handleExcluirImportacaoAnterior() {
    if (!householdId) {
      alert("Residência não identificada.");
      return;
    }

    const ok = window.confirm(
      `Isso vai apagar ${stats.importados} lançamentos importados.\n\nDeseja continuar?`
    );
    if (!ok) return;

    try {
      setProcessing(true);

      const q = query(
        collection(db, "lancamentos"),
        where("householdId", "==", householdId),
        where("source", "==", "importacao")
      );

      const snapshot = await getDocs(q);
      await excluirDocs(snapshot);
      await recarregar();

      alert("Importação anterior excluída.");
    } catch (error) {
      console.error(error);
      alert("Erro ao excluir importação anterior.");
    } finally {
      setProcessing(false);
    }
  }

  async function handleExcluirMesesInvalidos() {
    if (!householdId) {
      alert("Residência não identificada.");
      return;
    }

    const ok = window.confirm(
      `Isso vai apagar ${stats.mesesInvalidos} lançamentos com mês inválido.\n\nDeseja continuar?`
    );
    if (!ok) return;

    try {
      setProcessing(true);

      const q = query(
        collection(db, "lancamentos"),
        where("householdId", "==", householdId)
      );

      const snapshot = await getDocs(q);
      const invalidos = snapshot.docs.filter(
        (item) => !isCompetenciaValida(item.data()?.competencia)
      );

      for (const item of invalidos) {
        await deleteDoc(item.ref);
      }

      await recarregar();
      alert("Meses inválidos excluídos.");
    } catch (error) {
      console.error(error);
      alert("Erro ao excluir meses inválidos.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div style={styles.page}>
      <Sidebar onLogout={handleLogout} />

      <main style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.title}>Configurações</h1>
          <p style={styles.subtitle}>Manutenção da base financeira</p>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Usuário</h2>
          <div style={styles.userInfo}>
            <div>
              <strong>E-mail:</strong> {user?.email || "-"}
            </div>
            <div>
              <strong>Nome:</strong> {userProfile?.displayName || "-"}
            </div>
            <div>
              <strong>Residência:</strong> {householdId || "-"}
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Base de lançamentos</h2>

          <div style={styles.stats}>
            <div>
              <strong>Total de lançamentos:</strong>{" "}
              {loading ? "carregando..." : stats.total}
            </div>
            <div>
              <strong>Importados:</strong>{" "}
              {loading ? "carregando..." : stats.importados}
            </div>
            <div>
              <strong>Mês inválido:</strong>{" "}
              {loading ? "carregando..." : stats.mesesInvalidos}
            </div>
          </div>

          <div style={styles.actions}>
            <button
              type="button"
              style={{ ...styles.button, ...styles.redButton }}
              onClick={handleExcluirImportacaoAnterior}
              disabled={processing || loading}
            >
              Excluir importação anterior
            </button>

            <button
              type="button"
              style={{ ...styles.button, ...styles.yellowButton }}
              onClick={handleExcluirMesesInvalidos}
              disabled={processing || loading}
            >
              Excluir meses inválidos
            </button>

            <button
              type="button"
              style={{ ...styles.button, ...styles.darkButton }}
              onClick={handleExcluirTodos}
              disabled={processing || loading}
            >
              Excluir todos os lançamentos
            </button>
          </div>
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
    textAlign: "center",
    marginBottom: "24px",
  },
  title: {
    margin: 0,
    fontSize: "30px",
  },
  subtitle: {
    marginTop: "8px",
    color: "#64748b",
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "28px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
    marginBottom: "24px",
  },
  cardTitle: {
    marginTop: 0,
    marginBottom: "20px",
    fontSize: "22px",
    textAlign: "center",
  },
  userInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    alignItems: "center",
    color: "#475569",
    fontSize: "16px",
  },
  stats: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    alignItems: "center",
    marginBottom: "24px",
    color: "#475569",
    fontSize: "16px",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    justifyContent: "center",
  },
  button: {
    padding: "14px 18px",
    borderRadius: "12px",
    border: "none",
    color: "#fff",
    fontWeight: 700,
    fontSize: "15px",
    cursor: "pointer",
  },
  redButton: {
    background: "#ef4444",
  },
  yellowButton: {
    background: "#f59e0b",
  },
  darkButton: {
    background: "#0f172a",
  },
};