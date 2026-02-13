import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import { api } from "../api";
import { setBusinessName } from "../auth";

export default function Dashboard() {
  const [businessName, setBusinessNameState] = useState("");

  useEffect(() => {
    api
      .me()
      .then((data) => {
        setBusinessNameState(data.businessName);
        setBusinessName(data.businessName);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="page">
      <NavBar />
      <div className="card dashboard-hero" style={{ alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="badge">Welcome</span>
          </div>
          <h1 style={{ marginTop: 10 }}>{businessName ? businessName : "Your shop"}</h1>
          <p style={{ color: "var(--muted)" }}>Manage your catalog and voice billing.</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
            <Link className="button" to="/products">
              <span className="icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </span>
              Product master
            </Link>
            <Link className="button outline" to="/billing">
              <span className="icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3v18" />
                  <path d="M7 8h10" />
                  <path d="M7 12h10" />
                  <path d="M7 16h6" />
                </svg>
              </span>
              Start billing
            </Link>
            <Link className="button outline" to="/reports">
              <span className="icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19V5" />
                  <path d="M8 19V9" />
                  <path d="M12 19V13" />
                  <path d="M16 19V7" />
                  <path d="M20 19V11" />
                </svg>
              </span>
              View reports
            </Link>
          </div>
        </div>
        <div className="hero-kpi" style={{ textAlign: "right" }}>
          <div className="hero-kpi-label">VaaniBill Suite</div>
        </div>
      </div>
      <div className="grid three" style={{ marginTop: 22 }}>
        <div className="card dash-card" style={{ ["--delay" as never]: "0.05s" }}>
          <div className="stat-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
              <path d="M8 6v12" />
            </svg>
          </div>
          <div className="stat-label">Products</div>
          <div className="stat-value">Catalog</div>
          <div className="stat-sub">Add English + Gujarati names and rates.</div>
        </div>
        <div className="card dash-card" style={{ ["--delay" as never]: "0.1s" }}>
          <div className="stat-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3a4 4 0 0 0-4 4v5" />
              <path d="M16 12V7a4 4 0 0 0-8 0" />
              <rect x="6" y="12" width="12" height="8" rx="2" />
            </svg>
          </div>
          <div className="stat-label">Voice billing</div>
          <div className="stat-value">Hands-free</div>
          <div className="stat-sub">Speak items and build bills in seconds.</div>
        </div>
        <div className="card dash-card" style={{ ["--delay" as never]: "0.15s" }}>
          <div className="stat-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19h16" />
              <path d="M6 17V9" />
              <path d="M12 17V5" />
              <path d="M18 17v-6" />
            </svg>
          </div>
          <div className="stat-label">Reports</div>
          <div className="stat-value">Analytics</div>
          <div className="stat-sub">Daily, weekly, and top-item trends.</div>
        </div>
      </div>
      <div style={{ marginTop: 22, textAlign: "center", color: "var(--muted)" }}>
        Developed By DTech
      </div>
    </div>
  );
}
