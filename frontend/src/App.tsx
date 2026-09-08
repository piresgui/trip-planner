import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import RequireAuth from "./auth/RequireAuth";
import LoginPage from "./auth/LoginPage";
import RegisterPage from "./auth/RegisterPage";
import TripsListPage from "./trips/TripsListPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/trips"
            element={
              <RequireAuth>
                <TripsListPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/trips" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
