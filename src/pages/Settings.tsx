import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import { api } from "../api";
import { getLanguage, onLanguageChange, setLanguage } from "../preferences";

export default function Settings() {
  const [businessName, setBusinessName] = useState("");
  const [username, setUsername] = useState("");
  const [language, setLanguageState] = useState<"en-IN" | "gu-IN">("en-IN");

  useEffect(() => {
    api
      .me()
      .then((data) => {
        setBusinessName(data.businessName);
        setUsername(data.username);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLanguageState(getLanguage());
    const unsubscribe = onLanguageChange((nextLanguage) => setLanguageState(nextLanguage));
    return unsubscribe;
  }, []);

  const handleLanguageChange = (value: "en-IN" | "gu-IN") => {
    setLanguageState(value);
    setLanguage(value);
  };

  return (
    <div className="page">
      <NavBar />
      <div className="grid two">
        <div className="card">
          <h2>Business profile</h2>
          <p style={{ color: "var(--muted)" }}>Your store information.</p>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 600 }}>Business name</div>
            <div style={{ color: "var(--muted)" }}>{businessName || "Not set"}</div>
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 600 }}>Username</div>
            <div style={{ color: "var(--muted)" }}>{username || "Not set"}</div>
          </div>
        </div>
        <div className="card">
          <h2>Preferences</h2>
          <p style={{ color: "var(--muted)" }}>
            Use the theme switch in the top bar to change between light and dark.
          </p>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 600 }}>Billing language</div>
            <select
              value={language}
              onChange={(event) => handleLanguageChange(event.target.value as "en-IN" | "gu-IN")}
              style={{ marginTop: 8 }}
            >
              <option value="en-IN">English</option>
              <option value="gu-IN">Gujarati</option>
            </select>
            <p style={{ color: "var(--muted)", marginTop: 8 }}>
              This sets speech recognition and product matching for billing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
