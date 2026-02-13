import { useEffect, useMemo, useRef, useState } from "react";
import NavBar from "../components/NavBar";
import { api } from "../api";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { getLanguage, onLanguageChange } from "../preferences";

type Product = { id: number; nameEn: string; nameGu: string; rate: number };

type BillItem = {
  id: number;
  name: string;
  rate: number;
  quantity: number;
  total: number;
};

const WORD_NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  half: 0.5
};

const GUJARATI_NUMBERS: Record<string, number> = {
  "૦": 0,
  "૧": 1,
  "૨": 2,
  "૩": 3,
  "૪": 4,
  "૫": 5,
  "૬": 6,
  "૭": 7,
  "૮": 8,
  "૯": 9,
  "એક": 1,
  "બે": 2,
  "ત્રણ": 3,
  "ચાર": 4,
  "પાંચ": 5,
  "છ": 6,
  "સાત": 7,
  "આઠ": 8,
  "નવ": 9,
  "દસ": 10,
  "અડધો": 0.5,
  "અડધી": 0.5
};

const UNITS = new Set([
  "kg",
  "kgs",
  "kilogram",
  "kilograms",
  "gm",
  "g",
  "gram",
  "grams",
  "litre",
  "liter",
  "liters",
  "litres"
]);

const GUJ_UNITS = ["કિલો", "કિલોગ્રામ", "ગ્રામ", "લિટર", "લીટર"];

export default function Billing() {
  const [products, setProducts] = useState<Product[]>([]);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [spokenText, setSpokenText] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [language, setLanguage] = useState<"en-IN" | "gu-IN">("en-IN");
  const [listening, setListening] = useState(false);
  const billRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    api
      .listProducts()
      .then((data) => setProducts(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLanguage(getLanguage());
    const unsubscribe = onLanguageChange((nextLanguage) => setLanguage(nextLanguage));
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, [language]);

  const totalAmount = useMemo(
    () => billItems.reduce((sum, item) => sum + item.total, 0),
    [billItems]
  );

  const normalizeText = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

  const normalizeGujarati = (value: string) =>
    value.replace(/[^\u0A80-\u0AFF ]/g, "").replace(/\s+/g, " ").trim();

  const matchProduct = (query: string) => {
    const normalizedQuery = language === "gu-IN" ? normalizeGujarati(query) : normalizeText(query);
    if (!normalizedQuery) return null;
    return (
      products.find((product) => {
        const candidate = language === "gu-IN"
          ? normalizeGujarati(product.nameGu)
          : normalizeText(product.nameEn);
        return candidate && normalizedQuery.includes(candidate);
      }) || null
    );
  };

  const parseInput = (text: string) => {
    const tokens = text
      .toLowerCase()
      .split(/\s+/)
      .map((token) => token.replace(/[^a-z0-9.]/g, ""))
      .filter(Boolean);

    let quantity: number | null = null;
    for (const token of tokens) {
      if (!Number.isNaN(Number(token))) {
        quantity = Number(token);
        break;
      }
      if (token in WORD_NUMBERS) {
        quantity = WORD_NUMBERS[token];
        break;
      }
    }

    if (quantity === null) {
      for (const token of text.split(/\s+/)) {
        const clean = token.trim();
        if (clean in GUJARATI_NUMBERS) {
          quantity = GUJARATI_NUMBERS[clean];
          break;
        }
      }
    }

    let name = "";
    if (language === "gu-IN") {
      const cleaned = text
        .replace(/[0-9]/g, " ")
        .replace(/[\u0AE6-\u0AEF]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      let withoutUnits = cleaned;
      GUJ_UNITS.forEach((unit) => {
        withoutUnits = withoutUnits.replace(new RegExp(unit, "g"), " ");
      });
      withoutUnits = withoutUnits.replace(/\s+/g, " ").trim();
      name = withoutUnits || cleaned;
    } else {
      const nameTokens = tokens.filter(
        (token) => !(token in WORD_NUMBERS) && Number.isNaN(Number(token)) && !UNITS.has(token)
      );
      name = nameTokens.join(" ");
    }

    return {
      quantity: quantity ?? 1,
      name
    };
  };

  const addBillItem = (text: string) => {
    setError("");
    setSavedMessage("");
    const parsed = parseInput(text);
    if (!parsed.name) {
      setError("Say a product name like 'two kg sugar'.");
      return;
    }

    const product = matchProduct(parsed.name);
    if (!product) {
      setError("Product not found in your catalog.");
      return;
    }

    const quantity = parsed.quantity || 1;
    const total = product.rate * quantity;
    setBillItems((items) => [
      ...items,
      {
        id: Date.now(),
        name: language === "gu-IN" && product.nameGu ? product.nameGu : product.nameEn,
        rate: product.rate,
        quantity,
        total
      }
    ]);
  };

  const updateBillItem = (id: number, patch: Partial<BillItem>) => {
    setBillItems((items) =>
      items.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...patch };
        const quantity = Number(next.quantity) || 0;
        const rate = Number(next.rate) || 0;
        return {
          ...next,
          quantity,
          rate,
          total: Number((quantity * rate).toFixed(2))
        };
      })
    );
  };

  const removeBillItem = (id: number) => {
    setBillItems((items) => items.filter((item) => item.id !== id));
  };

  const getRecognition = () => {
    if (recognitionRef.current) return recognitionRef.current;
    const SpeechRecognitionConstructor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionConstructor) return null;

    const recognition = new SpeechRecognitionConstructor();
    recognition.lang = language;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      setError("Could not capture speech. Try again.");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (!result.isFinal) continue;
        const transcript = result[0].transcript;
        setSpokenText(transcript);
        addBillItem(transcript);
      }
    };

    recognitionRef.current = recognition;
    return recognition;
  };

  const handlePressStart = () => {
    setError("");
    const recognition = getRecognition();
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

  const handlePressEnd = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    recognition.stop();
  };

  const handleDownloadPdf = async () => {
    if (!billRef.current) return;
    const canvas = await html2canvas(billRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, width, height);
    pdf.save("vaanibill.pdf");
  };

  const handleCompleteBill = async () => {
    if (billItems.length === 0) {
      setError("Add at least one item before completing the bill.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const saved = await api.saveBill({
        items: billItems.map((item) => ({
          name: item.name,
          rate: item.rate,
          quantity: item.quantity,
          total: item.total
        })),
        total: totalAmount
      });
      setSavedMessage(`Bill saved as ${saved.billNumber}.`);
      setBillItems([]);
      setSpokenText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save bill.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <NavBar />
      <div className="grid two">
        <div className="card">
          <h2>Voice billing</h2>
          <p style={{ color: "var(--muted)" }}>
            Tap the mic and say items like "two kg sugar".
          </p>
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 16 }}>
            <button
              className={`mic ${listening ? "active" : ""}`}
              onPointerDown={handlePressStart}
              onPointerUp={handlePressEnd}
              onPointerLeave={handlePressEnd}
              onPointerCancel={handlePressEnd}
            >
              {listening ? "Listening" : "Hold"}
            </button>
            <div>
              <div style={{ fontWeight: 600 }}>Heard</div>
              <div style={{ color: "var(--muted)" }}>{spokenText || ""}</div>
              <div className="badge" style={{ marginTop: 6 }}>
                {language === "gu-IN" ? "Gujarati" : "English"}
              </div>
            </div>
          </div>
          {error && <div style={{ color: "#b42318", marginTop: 12 }}>{error}</div>}
          {savedMessage && <div style={{ color: "#027a48", marginTop: 12 }}>{savedMessage}</div>}
          <div style={{ marginTop: 18 }}>
            <input
              className="input"
              placeholder="Type manual input (e.g. 2 kg sugar)"
              value={spokenText}
              onChange={(event) => setSpokenText(event.target.value)}
            />
            <button
              className="button outline"
              style={{ marginTop: 10 }}
              onClick={() => spokenText && addBillItem(spokenText)}
            >
              Add manually
            </button>
          </div>
        </div>
        <div className="card" ref={billRef}>
          <h3>Current bill</h3>
          <table className="table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {billItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      className="input"
                      value={item.name}
                      onChange={(event) => updateBillItem(item.id, { name: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="input"
                      type="number"
                      step="0.1"
                      min="0"
                      value={item.quantity}
                      onChange={(event) =>
                        updateBillItem(item.id, { quantity: Number(event.target.value) })
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.rate}
                      onChange={(event) =>
                        updateBillItem(item.id, { rate: Number(event.target.value) })
                      }
                    />
                  </td>
                  <td>{item.total.toFixed(2)}</td>
                  <td>
                    <button className="button ghost" onClick={() => removeBillItem(item.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {billItems.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ color: "var(--muted)" }}>
                    No items yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
            <strong>Total</strong>
            <strong>{totalAmount.toFixed(2)}</strong>
          </div>
          <div className="no-print" style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button className="button" onClick={handleCompleteBill} disabled={saving}>
              {saving ? "Saving..." : "Complete & save"}
            </button>
            <button className="button" onClick={handleDownloadPdf}>
              Download PDF
            </button>
            <button className="button outline" onClick={() => window.print()}>
              Print
            </button>
            <button className="button secondary" onClick={() => setBillItems([])}>
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
