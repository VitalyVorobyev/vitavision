import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

import {
  Menu,
  Home,
  User,
  PenSquare,
  FlaskConical,
  Sun,
  Moon,
  Github,
  Linkedin,
  // Mail,
  // Download
} from "lucide-react";
import { classNames } from "../../utils/helpers";

import useTheme from "../../hooks/useTheme";


const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, setTheme } = useTheme();
  const [ drawer, setDrawer ] = useState(false);

  const NavLinkItem: React.FC<{ to: string; children: React.ReactNode; icon?: React.ReactNode }>
    = ({ to, children, icon }) => (
      <NavLink to={to} className={({ isActive }) => classNames("nav-link", isActive && "active") }>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>{icon}{children}</span>
      </NavLink>
    );

  return (
    <div>
      <header className="header">
        <div className="container header-inner">
          <Link to="/" className="brand">
            <div className="brand-logo">DV</div>
            <div>
              <div style={{ fontWeight: 600 }}>Vitaly V.</div>
              <div className="brand-sub">Computer Vision • 3D • Robotics</div>
            </div>
          </Link>

          <nav className="nav">
            <NavLinkItem to="/" icon={<Home size={16} />}>Home</NavLinkItem>
            <NavLinkItem to="/cv" icon={<User size={16} />}>CV</NavLinkItem>
            <NavLinkItem to="/blog" icon={<PenSquare size={16} />}>Blog</NavLinkItem>
            <NavLinkItem to="/demos" icon={<FlaskConical size={16} />}>Demos</NavLinkItem>
          </nav>

          <div className="actions">
            <a href="https://github.com/VitalyVorobyev" target="_blank" rel="noreferrer" className="icon-btn" aria-label="GitHub"><Github size={18} /></a>
            <a href="https://www.linkedin.com/in/vitaly-vorobyev" target="_blank" rel="noreferrer" className="icon-btn" aria-label="LinkedIn"><Linkedin size={18} /></a>
            <button className="icon-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="icon-btn hamburger" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu size={18} /></button>
          </div>
        </div>
      </header>

      {drawer && (
        <div className="drawer" role="dialog" aria-modal="true">
          <div className="backdrop" onClick={() => setDrawer(false)} />
          <div className="panel">
            <NavLink to="/" onClick={() => setDrawer(false)} className={({ isActive }) => classNames("nav-link", isActive && "active") }><Home size={16}/> Home</NavLink>
            <NavLink to="/cv" onClick={() => setDrawer(false)} className={({ isActive }) => classNames("nav-link", isActive && "active") }><User size={16}/> CV</NavLink>
            <NavLink to="/blog" onClick={() => setDrawer(false)} className={({ isActive }) => classNames("nav-link", isActive && "active") }><PenSquare size={16}/> Blog</NavLink>
            <NavLink to="/demos" onClick={() => setDrawer(false)} className={({ isActive }) => classNames("nav-link", isActive && "active") }><FlaskConical size={16}/> Demos</NavLink>
            <div style={{ marginTop: "auto", display: "flex", gap: 8 }}>
              <button className="btn btn-outline" onClick={() => setDrawer(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <main className="container main">{children}</main>

      <footer className="footer">
        <div className="container footer-inner">
          <p style={{ color: "var(--muted)", fontSize: 14 }}>© {new Date().getFullYear()} Vitaly V. All rights reserved.</p>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {/* <a href="mailto:hello@example.com" className="btn btn-outline"><Mail size={16}/> hello@example.com</a> */}
            {/* <a href={`${import.meta.env.BASE_URL}cv.pdf`} className="btn btn-outline"><Download size={16}/> Download CV</a> */}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AppShell;
