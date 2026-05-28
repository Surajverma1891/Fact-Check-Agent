import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import "./App.css";
import About from "./pages/about";
import Dashboard from "./pages/dashboard";
import History from "./pages/history";
import Home from "./pages/home";
import Navbar from "./pages/navbar";
import Processing from "./pages/processing";
import Upload from "./pages/upload";

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <div className="app-backdrop" aria-hidden="true" />
        <Navbar />

        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/processing" element={<Processing />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/:analysisId" element={<Dashboard />} />
            <Route path="/history" element={<History />} />
            <Route path="/about" element={<About />} />
            <Route path="/review" element={<Navigate to="/upload" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
