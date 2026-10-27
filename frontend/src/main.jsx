import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { I18nProvider } from "./i18n/I18nContext.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { SettingsProvider } from "./context/SettingsContext.jsx";
import PracticePage from "./pages/PracticePage.jsx";
import ResultPage from "./pages/ResultPage.jsx";
import LeaderboardPage from "./pages/LeaderboardPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import DuelLobbyPage from "./pages/DuelLobbyPage.jsx";
import DuelRoomPage from "./pages/DuelRoomPage.jsx";
import "./styles.css";

// Страницы, доступные только после входа (и только администратору).
function Protected({ children, admin = false }) {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== "admin") return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<PracticePage />} />
      <Route path="/result" element={<ResultPage />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />
      <Route path="/admin" element={<Protected admin><AdminPage /></Protected>} />
      <Route path="/duel" element={<DuelLobbyPage />} />
      <Route path="/duel/:code" element={<DuelRoomPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <I18nProvider>
        <AuthProvider>
          <SettingsProvider>
            <App />
          </SettingsProvider>
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  </React.StrictMode>
);
