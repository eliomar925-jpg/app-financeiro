import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  criarHousehold,
  entrarEmHousehold,
} from "../services/householdService";

export default function Compartilhamento() {
  const { user, userProfile, refreshUserProfile, logout } = useAuth();

  const [nomeFamilia, setNomeFamilia] = useState("");
  const [codigoFamilia, setCodigoFamilia] = useState("");
  const [codigoCriado, setCodigoCriado] = useState("");
  const [erro, setErro] = useState("");
  const [loadingCriar, setLoadingCriar] = useState(false);
  const [loadingEntrar, setLoadingEntrar] = useState(false);

  async function handleCriar() {
    setErro("");
    setLoadingCriar(true);

    try {
      const id = await criarHousehold(nomeFamilia, user.uid);
      setCodigoCriado(id);
    } catch (error) {
      setErro(error.message || "Erro ao criar família.");
      console.error(error);
    } finally {
      setLoadingCriar(false);
    }
  }

  async function handleEntrar() {
    setErro("");
    setLoadingEntrar(true);

    try {
      await entrarEmHousehold(codigoFamilia, user.uid);
      await refreshUserProfile();
    } catch (error) {
      setErro(error.message || "Erro ao entrar na família.");
      console.error(error);
    } finally {
      setLoadingEntrar(false);
    }
  }

  async function handleContinuar() {
    await refreshUserProfile();
  }

  async function copiarCodigo() {
    if (!codigoCriado) return;
    await navigator.clipboard.writeText(codigoCriado);
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Compartilhamento Familiar</h1>
        <p style={styles.subtitle}>
          Conta: {userProfile?.displayName || user?.email}
        </p>

        {erro && <p style={styles.error}>{erro}</p>}

        {!codigoCriado ? (
          <>
            <div style={styles.block}>
              <h2 style={styles.blockTitle}>1. Criar nova família</h2>
              <input
                type="text"
                placeholder="Ex.: Família Eliomar"
                value={nomeFamilia}
                onChange={(e) => setNomeFamilia(e.target.value)}
                style={styles.input}
              />
              <button
                onClick={handleCriar}
                style={styles.primaryButton}
                disabled={loadingCriar}
              >
                {loadingCriar ? "Criando..." : "Criar família"}
              </button>
            </div>

            <div style={styles.divider} />

            <div style={styles.block}>
              <h2 style={styles.blockTitle}>2. Entrar em família existente</h2>
              <input
                type="text"
                placeholder="Cole o código da família"
                value={codigoFamilia}
                onChange={(e) => setCodigoFamilia(e.target.value)}
                style={styles.input}
              />
              <button
                onClick={handleEntrar}
                style={styles.secondaryButton}
                disabled={loadingEntrar}
              >
                {loadingEntrar ? "Entrando..." : "Entrar com código"}
              </button>
            </div>
          </>
        ) : (
          <div style={styles.block}>
            <h2 style={styles.blockTitle}>Família criada</h2>
            <p style={styles.label}>Código para sua esposa:</p>
            <div style={styles.codeBox}>{codigoCriado}</div>

            <div style={styles.actionsRow}>
              <button onClick={copiarCodigo} style={styles.secondaryButton}>
                Copiar código
              </button>
              <button onClick={handleContinuar} style={styles.primaryButton}>
                Continuar
              </button>
            </div>
          </div>
        )}

        <button onClick={logout} style={styles.linkButton}>
          Sair
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0f172a",
    padding: "24px",
  },
  card: {
    width: "100%",
    maxWidth: "680px",
    background: "#fff",
    borderRadius: "18px",
    padding: "28px",
    boxShadow: "0 12px 36px rgba(0,0,0,0.18)",
  },
  title: {
    margin: 0,
    fontSize: "30px",
    color: "#111827",
  },
  subtitle: {
    marginTop: "8px",
    color: "#6b7280",
  },
  block: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginTop: "18px",
  },
  blockTitle: {
    margin: 0,
    fontSize: "20px",
    color: "#111827",
  },
  input: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    fontSize: "16px",
  },
  primaryButton: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontSize: "16px",
    cursor: "pointer",
  },
  secondaryButton: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#111827",
    fontSize: "16px",
    cursor: "pointer",
  },
  linkButton: {
    marginTop: "18px",
    border: "none",
    background: "transparent",
    color: "#2563eb",
    cursor: "pointer",
    padding: 0,
  },
  divider: {
    height: "1px",
    background: "#e5e7eb",
    marginTop: "24px",
    marginBottom: "8px",
  },
  error: {
    color: "#dc2626",
    marginTop: "12px",
    marginBottom: 0,
  },
  codeBox: {
    background: "#f3f4f6",
    border: "1px dashed #9ca3af",
    borderRadius: "10px",
    padding: "14px",
    fontSize: "18px",
    fontWeight: 700,
    wordBreak: "break-all",
  },
  label: {
    margin: 0,
    color: "#374151",
  },
  actionsRow: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
};