import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { loadProjectFromManifest } from "../slice/projectInformationSlice";
import { setSourceProjectPath, setSelectedProjectFilename } from "../slice/localImportSlice";
import { convertToProjectFormat } from "../slice/creatProject"; // <-- import your function

const ReduxStateViewer = () => {
  const dispatch = useDispatch();
  const state = useSelector((state) => state);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(state, null, 2));
  };

  const handleManifestUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const manifest = JSON.parse(text);
      dispatch(loadProjectFromManifest(manifest));
    } catch (err) {
      console.error(err);
      alert("Failed to load manifest JSON: " + err.message);
    }
  };

  // 👉 this will run your convertToProjectFormat
  const handleTryConvert = async () => {
    const sourceProjectPath =
      "burrito/ingredient/raw/git.door43.org/BurritoTruck/en_bsb?ipath=";
    const selectedProjectFilename = "MAT.usfm";

    try {
      console.log("🧩 Starting conversion...");
      await convertToProjectFormat(sourceProjectPath, selectedProjectFilename);
      alert("✅ Project conversion complete!");
    } catch (error) {
      console.error("❌ Conversion failed:", error);
      alert("Conversion failed — see console for details.");
    }
  };

  return (
    <div
      style={{
        padding: "20px",
        background: "#121212",
        color: "#f1f1f1",
        fontFamily: "monospace",
        minHeight: "100vh",
      }}
    >
      <h2 style={{ color: "#90caf9" }}>🧠 Redux Live State Viewer</h2>

      {/* File input for manifest */}
      <div style={{ marginBottom: "20px" }}>
        <input type="file" accept=".json" onChange={handleManifestUpload} />
      </div>

      <button
        onClick={handleCopy}
        style={{
          marginRight: "10px",
          padding: "6px 12px",
          border: "none",
          borderRadius: "4px",
          background: "#1976d2",
          color: "white",
          cursor: "pointer",
        }}
      >
        Copy JSON
      </button>

      {/* 🧩 Button to run convertToProjectFormat */}
      <button
        onClick={handleTryConvert}
        style={{
          padding: "6px 12px",
          border: "none",
          borderRadius: "4px",
          background: "#43a047",
          color: "white",
          cursor: "pointer",
        }}
      >
        Try ConvertToProject
      </button>

      <pre
        style={{
          background: "#1e1e1e",
          padding: "15px",
          borderRadius: "8px",
          overflowX: "auto",
          marginTop: "20px",
        }}
      >
        {JSON.stringify(state, null, 2)}
      </pre>
    </div>
  );
};

export default ReduxStateViewer;
