import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  setBookId,
  setResourceId,
  setNickname,
  setAllLanguageInfo,
  setLocalImport,
} from "../slice/projectInformationSlice";
import {
  setSelectedProjectFilename,
  setSourceProjectPath,
} from "../slice/localImportSlice";

const ReduxStateViewer = () => {
  const dispatch = useDispatch();
  const state = useSelector((state) => state);

  const [projectPath, setProjectPath] = useState("");
  const [projectName, setProjectName] = useState("");

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(state, null, 2));
  };

  const handleImport = () => {
    if (!projectPath || !projectName) return alert("Enter project path and name");

    // Update local import slice
    dispatch(setSourceProjectPath(projectPath));
    dispatch(setSelectedProjectFilename(projectName));

    // Update project info slice
    dispatch(setBookId("book123")); // Example: dynamically load from manifest
    dispatch(setResourceId("resource456"));
    dispatch(setNickname(projectName));
    dispatch(setAllLanguageInfo({ id: "en", name: "English", direction: "ltr" }));
    dispatch(setLocalImport(true));

    alert(`Project "${projectName}" imported successfully!`);
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

      {/* Project Import Form */}
      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Project Path"
          value={projectPath}
          onChange={(e) => setProjectPath(e.target.value)}
          style={{ marginRight: "10px", padding: "6px" }}
        />
        <input
          type="text"
          placeholder="Project Name"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          style={{ marginRight: "10px", padding: "6px" }}
        />
        <button
          onClick={handleImport}
          style={{
            padding: "6px 12px",
            border: "none",
            borderRadius: "4px",
            background: "#388e3c",
            color: "white",
            cursor: "pointer",
          }}
        >
          Import Project
        </button>
      </div>

      <button
        onClick={handleCopy}
        style={{
          marginBottom: "10px",
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

      <pre
        style={{
          background: "#1e1e1e",
          padding: "15px",
          borderRadius: "8px",
          overflowX: "auto",
        }}
      >
        {JSON.stringify(state, null, 2)}
      </pre>
    </div>
  );
};

export default ReduxStateViewer;
