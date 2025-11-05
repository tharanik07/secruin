import React, { useState } from "react";

function App() {
  const [days, setDays] = useState("");
  const [cveId, setCveId] = useState("");
  const [cveData, setCveData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch by modified days
  const handleFetchByDays = async () => {
    if (!days || isNaN(days)) {
      setError("⚠️ Please enter a valid number of days.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/cves/modified/${days}`);
      if (!res.ok) throw new Error("Failed to fetch CVE data");
      const data = await res.json();
      setCveData(Array.isArray(data) ? data : [data]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch by CVE ID
  const handleFetchById = async () => {
    if (!cveId.trim()) {
      setError("⚠️ Please enter a valid CVE ID (e.g., CVE-2007-2447).");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/cves/${cveId}`);
      if (!res.ok) throw new Error("Failed to fetch CVE details");
      const data = await res.json();
      setCveData([data]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Clear all fields and data
  const handleClear = () => {
    setDays("");
    setCveId("");
    setCveData([]);
    setError("");
  };

  return (
    <div
      style={{
        padding: "40px",
        fontFamily: "Segoe UI, sans-serif",
        backgroundColor: "#f7f9fb",
        minHeight: "100vh",
      }}
    >
      <h2
        style={{
          textAlign: "center",
          marginBottom: "30px",
          color: "#333",
          letterSpacing: "0.5px",
        }}
      >
        🔍 CVE Data Viewer
      </h2>

      {/* Fetch by Days */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "10px",
          marginBottom: "15px",
          flexWrap: "wrap",
        }}
      >
        <input
          type="number"
          placeholder="Enter days (e.g., 7)"
          value={days}
          onChange={(e) => setDays(e.target.value)}
          style={inputStyle}
        />
        <button onClick={handleFetchByDays} style={primaryButtonStyle}>
          Fetch by Days
        </button>
      </div>

      {/* Fetch by CVE ID */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "10px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          placeholder="Enter CVE ID (e.g., CVE-2007-2447)"
          value={cveId}
          onChange={(e) => setCveId(e.target.value)}
          style={inputStyle}
        />
        <button onClick={handleFetchById} style={primaryButtonStyle}>
          Fetch by ID
        </button>
        <button onClick={handleClear} style={secondaryButtonStyle}>
          Clear
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <p style={{ color: "red", textAlign: "center", fontWeight: "500" }}>
          Enter the Valid CVE ID
        </p>
      )}

      {/* Loading Indicator */}
      {loading && <p style={{ textAlign: "center" }}>Loading CVE data...</p>}

      {/* Data Table */}
      {!loading && cveData.length > 0 && (
        <div
          style={{
            overflowX: "auto",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            backgroundColor: "#fff",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead style={{ background: "#e6f2ff" }}>
              <tr>
                <th style={thStyle}>CVE ID</th>
                <th style={thStyle}>Source</th>
                <th style={thStyle}>Published</th>
                <th style={thStyle}>Last Modified</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Severity</th>
              </tr>
            </thead>
            <tbody>
              {cveData.map((item, index) => (
                <tr key={index} style={index % 2 ? trAltStyle : {}}>
                  <td style={tdStyle}>{item.cveId}</td>
                  <td style={tdStyle}>{item.sourceIdentifier}</td>
                  <td style={tdStyle}>
                    {item.published
                      ? new Date(item.published).toLocaleDateString()
                      : "-"}
                  </td>
                  <td style={tdStyle}>
                    {item.lastModified
                      ? new Date(item.lastModified).toLocaleDateString()
                      : "-"}
                  </td>
                  <td style={tdStyle}>{item.description}</td>
                  <td style={tdStyle}>{item.severity || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && cveData.length === 0 && !error && (
        <p style={{ textAlign: "center", color: "#555" }}>
          No data available. Enter days or CVE ID and click Fetch.
        </p>
      )}
    </div>
  );
}

// ===== Styles =====
const inputStyle = {
  padding: "10px",
  width: "250px",
  border: "1px solid #ccc",
  borderRadius: "6px",
  outline: "none",
};

const primaryButtonStyle = {
  padding: "10px 18px",
  cursor: "pointer",
  backgroundColor: "#0078d4",
  color: "white",
  border: "none",
  borderRadius: "6px",
};

const secondaryButtonStyle = {
  padding: "10px 18px",
  cursor: "pointer",
  backgroundColor: "#888",
  color: "white",
  border: "none",
  borderRadius: "6px",
};

const thStyle = {
  padding: "10px",
  border: "1px solid #ddd",
  textAlign: "left",
  fontWeight: "bold",
};

const tdStyle = {
  padding: "10px",
  border: "1px solid #ddd",
  verticalAlign: "top",
  fontSize: "14px",
  lineHeight: "1.5",
};

const trAltStyle = {
  backgroundColor: "#f9f9f9",
};

export default App;
