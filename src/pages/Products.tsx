import { FormEvent, useEffect, useRef, useState } from "react";
import NavBar from "../components/NavBar";
import { api } from "../api";

type Product = { id: number; nameEn: string; nameGu: string; rate: number };

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [nameEn, setNameEn] = useState("");
  const [nameGu, setNameGu] = useState("");
  const [rate, setRate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [listeningGu, setListeningGu] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const loadProducts = () => {
    api
      .listProducts()
      .then((data) => setProducts(data))
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"));
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    const parsedRate = Number(rate);
    if (!nameEn.trim() || Number.isNaN(parsedRate)) {
      setError("Enter English name and numeric rate.");
      setLoading(false);
      return;
    }

    try {
      await api.addProduct({
        nameEn: nameEn.trim(),
        nameGu: nameGu.trim(),
        rate: parsedRate
      });
      setNameEn("");
      setNameGu("");
      setRate("");
      loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add failed");
    } finally {
      setLoading(false);
    }
  };

  const getGujaratiRecognition = () => {
    if (recognitionRef.current) return recognitionRef.current;
    const SpeechRecognitionConstructor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionConstructor) return null;

    const recognition = new SpeechRecognitionConstructor();
    recognition.lang = "gu-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListeningGu(true);
    recognition.onend = () => setListeningGu(false);
    recognition.onerror = () => {
      setListeningGu(false);
      setError("Could not capture Gujarati speech. Try again.");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setNameGu(transcript);
    };

    recognitionRef.current = recognition;
    return recognition;
  };

  const handleGujaratiMic = () => {
    setError("");
    const recognition = getGujaratiRecognition();
    if (!recognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }
    try {
      recognition.start();
    } catch {
      // Ignore repeated start calls when already listening.
    }
  };

  const handleUpdate = async (product: Product) => {
    const newNameEn = window.prompt("Update English name", product.nameEn);
    if (!newNameEn) return;
    const newNameGu = window.prompt("Update Gujarati name", product.nameGu || "");
    const newRateInput = window.prompt("Update rate", String(product.rate));
    if (!newRateInput) return;
    const newRate = Number(newRateInput);
    if (Number.isNaN(newRate)) {
      setError("Rate must be a number.");
      return;
    }
    await api.updateProduct(product.id, {
      nameEn: newNameEn.trim(),
      nameGu: (newNameGu || "").trim(),
      rate: newRate
    });
    loadProducts();
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Delete ${product.nameEn}?`)) return;
    await api.deleteProduct(product.id);
    loadProducts();
  };

  return (
    <div className="page">
      <NavBar />
      <div className="grid two">
        <div className="card">
          <h2>Product master</h2>
          <p style={{ color: "var(--muted)" }}>Add English and Gujarati names with rate.</p>
          <form onSubmit={handleSubmit} className="grid" style={{ marginTop: 16 }}>
            <input
              className="input"
              placeholder="English name"
              value={nameEn}
              onChange={(event) => setNameEn(event.target.value)}
              required
            />
            <input
              className="input"
              placeholder="Gujarati name (optional)"
              value={nameGu}
              onChange={(event) => setNameGu(event.target.value)}
            />
            <button
              className="button outline"
              type="button"
              onClick={handleGujaratiMic}
              disabled={listeningGu}
            >
              {listeningGu ? "Listening..." : "Gujarati mic"}
            </button>
            <input
              className="input"
              placeholder="Rate"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
              required
            />
            {error && <span style={{ color: "#b42318" }}>{error}</span>}
            <button className="button" type="submit" disabled={loading}>
              {loading ? "Saving..." : "Add product"}
            </button>
          </form>
        </div>
        <div className="card">
          <h3>All products</h3>
          <table className="table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>English</th>
                <th>Gujarati</th>
                <th>Rate</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>{product.nameEn}</td>
                  <td>{product.nameGu || "-"}</td>
                  <td>{product.rate}</td>
                  <td style={{ display: "flex", gap: 8 }}>
                    <button className="button outline" onClick={() => handleUpdate(product)}>
                      Edit
                    </button>
                    <button className="button secondary" onClick={() => handleDelete(product)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ color: "var(--muted)" }}>
                    No products yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
