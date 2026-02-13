import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { setBusinessName, setToken } from "../auth";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.login({ username, password });
      setToken(data.token);
      setBusinessName(data.businessName);
      navigate("/billing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="header">
        <div className="brand">VaaniBill</div>
      </div>
      <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
        <h2>Welcome back</h2>
        <p style={{ color: "var(--muted)" }}>Sign in to manage your store.</p>
        <form onSubmit={handleSubmit} className="grid" style={{ marginTop: 18 }}>
          <input
            className="input"
            placeholder="Username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error && <span style={{ color: "#b42318" }}>{error}</span>}
          <button className="button" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
        <p style={{ marginTop: 14 }}>
          New here? <Link to="/signup">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
