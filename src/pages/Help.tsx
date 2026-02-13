import NavBar from "../components/NavBar";

export default function Help() {
  return (
    <div className="page">
      <NavBar />
      <div className="card">
        <h2>Help</h2>
        <p style={{ color: "var(--muted)" }}>
          Quick guide to start billing with VaaniBill.
        </p>
        <div className="grid two" style={{ marginTop: 20 }}>
          <div className="card">
            <h3>Voice billing</h3>
            <p style={{ color: "var(--muted)" }}>
              Hold the mic button and say items like "two kg sugar". Each
              completed phrase adds a line item to the bill.
            </p>
          </div>
          <div className="card">
            <h3>Product master</h3>
            <p style={{ color: "var(--muted)" }}>
              Add or update product names and rates to keep billing accurate.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
