import { useEffect, useMemo, useRef, useState } from "react";
import NavBar from "../components/NavBar";
import { api } from "../api";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type ReportsData = {
  totals: { all: number; today: number; week: number };
  counts: { bills: number; items: number; todayBills: number; weekBills: number };
  topItems: Array<{ name: string; quantity: number; revenue: number }>;
};

type BillItem = { name: string; rate: number; quantity: number; total: number };
type Bill = {
  id: number;
  billNumber: string;
  createdAt: string;
  total: number;
  items: BillItem[];
};

export default function Reports() {
  const [reports, setReports] = useState<ReportsData | null>(null);
  const [error, setError] = useState("");
  const [bills, setBills] = useState<Bill[]>([]);
  const [editingBillId, setEditingBillId] = useState<number | null>(null);
  const [expandedBillId, setExpandedBillId] = useState<number | null>(null);
  const [draftItems, setDraftItems] = useState<BillItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemQuery, setItemQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [minTotal, setMinTotal] = useState("");
  const [maxTotalValue, setMaxTotalValue] = useState("");
  const exportRef = useRef<HTMLDivElement | null>(null);

  const chartTotals = reports
    ? [
        { label: "Today", value: reports.totals.today },
        { label: "Week", value: reports.totals.week },
        { label: "All time", value: reports.totals.all }
      ]
    : [];
  const chartMax = chartTotals.reduce((max, item) => Math.max(max, item.value), 0) || 1;

  const filteredBills = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const itemTerm = itemQuery.trim().toLowerCase();
    const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const to = toDate ? new Date(`${toDate}T23:59:59`) : null;
    const min = minTotal ? Number(minTotal) : null;
    const max = maxTotalValue ? Number(maxTotalValue) : null;

    return bills.filter((bill) => {
      const createdAt = new Date(bill.createdAt);
      if (from && createdAt < from) return false;
      if (to && createdAt > to) return false;
      if (min !== null && bill.total < min) return false;
      if (max !== null && bill.total > max) return false;
      if (term) {
        const inNumber = bill.billNumber.toLowerCase().includes(term);
        const inItems = bill.items.some((item) => item.name.toLowerCase().includes(term));
        if (!inNumber && !inItems) return false;
      }
      if (itemTerm) {
        const inItems = bill.items.some((item) => item.name.toLowerCase().includes(itemTerm));
        if (!inItems) return false;
      }
      return true;
    });
  }, [bills, searchTerm, itemQuery, fromDate, toDate, minTotal, maxTotalValue]);

  const itemAnalytics = useMemo(() => {
    const term = itemQuery.trim().toLowerCase();
    if (!term) return null;
    let revenue = 0;
    let quantity = 0;
    let billCount = 0;
    filteredBills.forEach((bill) => {
      let matched = false;
      bill.items.forEach((item) => {
        if (item.name.toLowerCase().includes(term)) {
          revenue += item.total;
          quantity += item.quantity;
          matched = true;
        }
      });
      if (matched) billCount += 1;
    });
    return { revenue, quantity, billCount };
  }, [filteredBills, itemQuery]);

  const loadReports = () =>
    api
      .getReports()
      .then((data) => setReports(data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load reports"));

  const loadBills = () =>
    api
      .listBills()
      .then((data) => setBills(data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load bills"));

  useEffect(() => {
    loadReports();
    loadBills();
  }, []);

  const startEdit = (bill: Bill) => {
    setEditingBillId(bill.id);
    setDraftItems(bill.items.map((item) => ({ ...item })));
  };

  const cancelEdit = () => {
    setEditingBillId(null);
    setDraftItems([]);
  };

  const toggleExpand = (billId: number) => {
    setExpandedBillId((current) => (current === billId ? null : billId));
  };

  const updateDraftItem = (index: number, patch: Partial<BillItem>) => {
    setDraftItems((items) =>
      items.map((item, idx) => {
        if (idx !== index) return item;
        const next = { ...item, ...patch };
        const quantity = Number(next.quantity) || 0;
        const rate = Number(next.rate) || 0;
        return { ...next, quantity, rate, total: Number((quantity * rate).toFixed(2)) };
      })
    );
  };

  const saveEdit = async (billId: number) => {
    if (draftItems.length === 0) {
      setError("Bill must have at least one item.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const total = draftItems.reduce((sum, item) => sum + item.total, 0);
      await api.updateBill(billId, { items: draftItems, total });
      cancelEdit();
      loadBills();
      loadReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update bill");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (billId: number) => {
    if (!window.confirm("Delete this bill?")) return;
    setSaving(true);
    setError("");
    try {
      await api.deleteBill(billId);
      loadBills();
      loadReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete bill");
    } finally {
      setSaving(false);
    }
  };

  const handleExportCsv = () => {
    const rows = [
      ["Bill Number", "Date", "Total", "Items"],
      ...filteredBills.map((bill) => [
        bill.billNumber,
        new Date(bill.createdAt).toLocaleString(),
        bill.total.toFixed(2),
        bill.items.map((item) => `${item.name} x${item.quantity}`).join(" | ")
      ])
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "vaanibill-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    if (!exportRef.current) return;
    const canvas = await html2canvas(exportRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, width, height);
    pdf.save("vaanibill-report.pdf");
  };

  const handlePrintBill = (bill: Bill) => {
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;
    const rows = bill.items
      .map(
        (item) =>
          `<tr><td>${item.name}</td><td>${item.quantity}</td><td>${item.rate}</td><td>${item.total.toFixed(2)}</td></tr>`
      )
      .join("");
    printWindow.document.write(`
      <html>
        <head>
          <title>${bill.billNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; }
          </style>
        </head>
        <body>
          <h2>${bill.billNumber}</h2>
          <div>${new Date(bill.createdAt).toLocaleString()}</div>
          <table>
            <thead>
              <tr><th>Item</th><th>Qty</th><th>Rate</th><th>Total</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <h3 style="text-align:right;">Total: Rs ${bill.total.toFixed(2)}</h3>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="page">
      <NavBar />
      <div className="card dashboard-hero">
        <div>
          <span className="badge">Analytics</span>
          <h2 style={{ marginTop: 10 }}>Reports</h2>
          <p style={{ color: "var(--muted)" }}>
            Review totals, recent performance, and top-selling items.
          </p>
        </div>
        <div className="hero-kpi">
          <div className="hero-kpi-value">
            {reports ? `Rs ${reports.totals.all.toFixed(2)}` : "Rs 0"}
          </div>
          <div className="hero-kpi-label">All-time sales</div>
        </div>
        {error && <div style={{ color: "#b42318", marginTop: 12 }}>{error}</div>}
      </div>
      <div className="grid three" style={{ marginTop: 20 }}>
        <div className="card dash-card" style={{ ["--delay" as never]: "0.05s" }}>
          <div className="stat-label">Today</div>
          <div className="stat-value">
            {reports ? `Rs ${reports.totals.today.toFixed(2)}` : "Rs 0"}
          </div>
          <div className="stat-sub">
            {reports ? `${reports.counts.todayBills} bills` : "Total sales and bill count."}
          </div>
        </div>
        <div className="card dash-card" style={{ ["--delay" as never]: "0.1s" }}>
          <div className="stat-label">This week</div>
          <div className="stat-value">
            {reports ? `Rs ${reports.totals.week.toFixed(2)}` : "Rs 0"}
          </div>
          <div className="stat-sub">
            {reports ? `${reports.counts.weekBills} bills` : "Weekly trend snapshot."}
          </div>
        </div>
        <div className="card dash-card" style={{ ["--delay" as never]: "0.15s" }}>
          <div className="stat-label">Top items</div>
          {reports && reports.topItems.length > 0 ? (
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {reports.topItems.map((item) => (
                <div key={item.name} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{item.name}</span>
                  <span>{`Rs ${item.revenue.toFixed(2)}`}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="stat-sub">Best-selling products.</div>
          )}
        </div>
      </div>
      <div className="grid two" style={{ marginTop: 20 }}>
        <div className="card dash-card" style={{ ["--delay" as never]: "0.2s" }}>
          <div className="stat-label">All-time totals</div>
          <div className="stat-value">
            {reports ? `Rs ${reports.totals.all.toFixed(2)}` : "Rs 0"}
          </div>
          <div className="stat-sub">
            {reports ? `${reports.counts.bills} bills` : "Your lifetime sales totals."}
          </div>
        </div>
        <div className="card dash-card" style={{ ["--delay" as never]: "0.25s" }}>
          <div className="stat-label">Items sold</div>
          <div className="stat-value">{reports ? `${reports.counts.items}` : "0"}</div>
          <div className="stat-sub">Items sold so far</div>
        </div>
      </div>
      <div className="card" style={{ marginTop: 20 }}>
        <h3>Filters & exports</h3>
        <div className="filters" style={{ marginTop: 12 }}>
          <input
            className="input"
            placeholder="Search bill number or item"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <input
            className="input"
            placeholder="Item analytics (e.g. dairymilk)"
            value={itemQuery}
            onChange={(event) => setItemQuery(event.target.value)}
          />
          <input
            className="input"
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
          <input
            className="input"
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
          />
          <input
            className="input"
            type="number"
            placeholder="Min total"
            value={minTotal}
            onChange={(event) => setMinTotal(event.target.value)}
          />
          <input
            className="input"
            type="number"
            placeholder="Max total"
            value={maxTotalValue}
            onChange={(event) => setMaxTotalValue(event.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <button className="button outline" onClick={handleExportCsv}>
            Export CSV
          </button>
          <button className="button outline" onClick={handleExportPdf}>
            Export PDF
          </button>
        </div>
        {itemAnalytics && (
          <div className="filter-summary" style={{ marginTop: 12 }}>
            <div><strong>Item:</strong> {itemQuery}</div>
            <div><strong>Total revenue:</strong> Rs {itemAnalytics.revenue.toFixed(2)}</div>
            <div><strong>Quantity sold:</strong> {itemAnalytics.quantity}</div>
            <div><strong>Bills with item:</strong> {itemAnalytics.billCount}</div>
          </div>
        )}
      </div>
      <div className="grid two" style={{ marginTop: 20 }}>
        <div className="card chart-card">
          <h3>Sales chart</h3>
          {reports ? (
            <div className="chart" style={{ marginTop: 12 }}>
              {chartTotals.map((item) => (
                <div key={item.label} className="chart-row">
                  <div className="chart-label">{item.label}</div>
                  <div className="chart-bar">
                    <div
                      className="chart-fill"
                      style={{
                        ["--bar-value" as never]: `${(item.value / chartMax) * 100}%`
                      }}
                    />
                  </div>
                  <div className="chart-value">Rs {item.value.toFixed(2)}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--muted)" }}>Chart will appear after billing.</p>
          )}
        </div>
        <div className="card chart-card">
          <h3>Top items chart</h3>
          {reports && reports.topItems.length > 0 ? (
            <div className="chart" style={{ marginTop: 12 }}>
              {reports.topItems.map((item) => (
                <div key={item.name} className="chart-row">
                  <div className="chart-label">{item.name}</div>
                  <div className="chart-bar">
                    <div
                      className="chart-fill"
                      style={{
                        ["--bar-value" as never]: `${
                          (item.revenue /
                            Math.max(...reports.topItems.map((entry) => entry.revenue), 1)) *
                          100
                        }%`
                      }}
                    />
                  </div>
                  <div className="chart-value">Rs {item.revenue.toFixed(2)}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--muted)" }}>Top items chart will appear here.</p>
          )}
        </div>
      </div>
      <div className="card" style={{ marginTop: 20 }}>
        <h3>All bills</h3>
        {filteredBills.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No bills yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {filteredBills.map((bill) => {
              const isEditing = editingBillId === bill.id;
              const isExpanded = expandedBillId === bill.id || isEditing;
              const items = isEditing ? draftItems : bill.items;
              const total = isEditing
                ? items.reduce((sum, item) => sum + item.total, 0)
                : bill.total;
              return (
                <div key={bill.id} className="card" style={{ padding: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center"
                    }}
                  >
                    <button
                      className="button ghost bill-toggle"
                      onClick={() => toggleExpand(bill.id)}
                      style={{ textAlign: "left", flex: 1 }}
                    >
                      <div style={{ fontWeight: 600 }}>{bill.billNumber}</div>
                      <div style={{ color: "var(--muted)", fontSize: 13 }}>
                        {new Date(bill.createdAt).toLocaleString()} · Rs {total.toFixed(2)}
                      </div>
                    </button>
                    <div style={{ display: "flex", gap: 8 }}>
                      {isEditing ? (
                        <>
                          <button
                            className="button"
                            onClick={() => saveEdit(bill.id)}
                            disabled={saving}
                          >
                            Save
                          </button>
                          <button className="button ghost" onClick={cancelEdit}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="button ghost" onClick={() => handlePrintBill(bill)}>
                            Print
                          </button>
                          <button className="button outline" onClick={() => startEdit(bill)}>
                            Edit
                          </button>
                          <button
                            className="button secondary"
                            onClick={() => handleDelete(bill.id)}
                            disabled={saving}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {isExpanded && (
                    <>
                      <table className="table" style={{ marginTop: 12 }}>
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Rate</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, index) => (
                            <tr key={`${bill.id}-${index}`}>
                              <td>
                                {isEditing ? (
                                  <input
                                    className="input"
                                    value={item.name}
                                    onChange={(event) =>
                                      updateDraftItem(index, { name: event.target.value })
                                    }
                                  />
                                ) : (
                                  item.name
                                )}
                              </td>
                              <td>
                                {isEditing ? (
                                  <input
                                    className="input"
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={item.quantity}
                                    onChange={(event) =>
                                      updateDraftItem(index, { quantity: Number(event.target.value) })
                                    }
                                  />
                                ) : (
                                  item.quantity
                                )}
                              </td>
                              <td>
                                {isEditing ? (
                                  <input
                                    className="input"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.rate}
                                    onChange={(event) =>
                                      updateDraftItem(index, { rate: Number(event.target.value) })
                                    }
                                  />
                                ) : (
                                  item.rate
                                )}
                              </td>
                              <td>{item.total.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div
                        style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}
                      >
                        <strong>Total</strong>
                        <strong>{total.toFixed(2)}</strong>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="print-area" ref={exportRef}>
        <h2>VaaniBill report</h2>
        <div>Generated: {new Date().toLocaleString()}</div>
        <div style={{ marginTop: 12 }}>
          <strong>Filtered bills:</strong> {filteredBills.length}
        </div>
        <table className="table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Bill number</th>
              <th>Date</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {filteredBills.map((bill) => (
              <tr key={`export-${bill.id}`}>
                <td>{bill.billNumber}</td>
                <td>{new Date(bill.createdAt).toLocaleString()}</td>
                <td>{bill.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
