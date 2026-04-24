import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({ onLogout }) {
  const { user } = useAuth();
  const [nomePlanejamento, setNomePlanejamento] = useState("Planejamento 2026");

  useEffect(() => {
    async function carregarNome() {
      if (!user?.uid) return;

      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const dados = snap.data();
          if (dados.nomePlanejamento) {
            setNomePlanejamento(dados.nomePlanejamento);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar nome do planejamento:", error);
      }
    }

    carregarNome();
  }, [user]);

  const menu = [
    { label: "Painel", to: "/" },
    { label: "Planejamento Mensal", to: "/planejamento" },
    { label: "Alimentação Mensal", to: "/alimentacao" },
    { label: "Relatórios", to: "/relatorios" },
    { label: "Configurações", to: "/configuracoes" },
  ];

  return (
    <aside style={styles.sidebar}>
      <div>
        <h2 style={styles.brand}>Finanças Família</h2>
        <p style={styles.subbrand}>{nomePlanejamento}</p>

        <nav style={styles.nav}>
          {menu.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              style={({ isActive }) => ({
                ...styles.link,
                ...(isActive ? styles.linkActive : {}),
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <button onClick={onLogout} style={styles.logoutButton}>
        Sair
      </button>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: "260px",
    minHeight: "100vh",
    background: "#0f172a",
    color: "#ffffff",
    padding: "24px 20px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  brand: {
    margin: 0,
    fontSize: "20px",
    lineHeight: 1.2,
  },
  subbrand: {
    marginTop: "10px",
    color: "#cbd5e1",
    fontSize: "15px",
  },
  nav: {
    display: "grid",
    gap: "8px",
    marginTop: "28px",
  },
  link: {
    color: "#e2e8f0",
    textDecoration: "none",
    padding: "12px 14px",
    borderRadius: "10px",
  },
  linkActive: {
    background: "#1e293b",
    color: "#ffffff",
    fontWeight: 700,
  },
  logoutButton: {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "none",
    background: "#1e293b",
    color: "#ffffff",
    cursor: "pointer",
  },
};