import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { clearBusinessName, clearToken, getBusinessName } from "../auth";
import { getTheme, onThemeChange, setTheme as applyTheme } from "../preferences";

export default function NavBar() {
  const navigate = useNavigate();
  const businessName = getBusinessName();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const initialTheme = getTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);
    const unsubscribe = onThemeChange((nextTheme) => setTheme(nextTheme));
    return unsubscribe;
  }, []);

  const handleLogout = () => {
    clearToken();
    clearBusinessName();
    navigate("/login");
  };

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  return (
    <div className="header no-print">
      <div>
        <div className="brand">VaaniBill</div>
        {businessName && <div className="badge">{businessName}</div>}
      </div>
      <div className="nav-links">
        <Link className="button outline" to="/dashboard">
          Dashboard
        </Link>
        <Link className="button outline" to="/products">
          Products
        </Link>
        <Link className="button outline" to="/billing">
          Billing
        </Link>
        <Link className="button outline" to="/reports">
          Reports
        </Link>
        <Link className="button outline" to="/settings">
          Settings
        </Link>
        <Link className="button outline" to="/help">
          Help
        </Link>
        <button className="button ghost" onClick={toggleTheme}>
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        <button className="button secondary" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}
