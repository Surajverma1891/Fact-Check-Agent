import { NavLink, useLocation } from "react-router-dom";

import logo from "../assets/gemini-svg.svg";

function Navbar() {
  const location = useLocation();

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <NavLink className="brandmark" to="/">
          <img className="brandmark__logo" src={logo} alt="FactCheck Agent logo" />
          <div>
            <span className="brandmark__title">FactCheck Agent</span>
            <span className="brandmark__subtitle">PDF truth layer for marketing content</span>
          </div>
        </NavLink>

        <nav className="topbar__nav" aria-label="Primary">
          <NavLink className="topbar__link" to="/">
            Home
          </NavLink>
          <NavLink className="topbar__link" to="/history">
            History
          </NavLink>
          <NavLink className="topbar__link" to="/about">
            About
          </NavLink>
        </nav>

        <NavLink className="topbar__cta" to={location.pathname === "/upload" ? "/dashboard" : "/upload"}>
          {location.pathname === "/upload" ? "Latest Report" : "Upload PDF"}
        </NavLink>
      </div>
    </header>
  );
}

export default Navbar;
