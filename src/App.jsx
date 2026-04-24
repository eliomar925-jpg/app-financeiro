import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PlanejamentoMensal from "./pages/PlanejamentoMensal";
import AlimentacaoMensal from "./pages/AlimentacaoMensal";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";
import Compartilhamento from "./pages/Compartilhamento";

function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f172a",
        color: "#fff",
        fontSize: "18px",
      }}
    >
      Carregando...
    </div>
  );
}

export default function App() {
  const { user, userProfile, loadingProfile } = useAuth();

  if (!user) {
    return <Login />;
  }

  if (loadingProfile) {
    return <LoadingScreen />;
  }

  if (!userProfile?.householdId) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/compartilhamento" element={<Compartilhamento />} />
          <Route path="*" element={<Navigate to="/compartilhamento" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/planejamento" element={<PlanejamentoMensal />} />
        <Route path="/alimentacao" element={<AlimentacaoMensal />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}