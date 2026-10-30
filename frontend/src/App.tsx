import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import TripsPage from "./pages/TripsPage";
import TripPage from "./pages/TripPage";
import Toaster from "./components/Toaster";

// HashRouter: funciona até abrindo o build direto do disco, sem servidor.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<TripsPage />} />
        <Route path="/trips/:tripId" element={<TripPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </HashRouter>
  );
}
