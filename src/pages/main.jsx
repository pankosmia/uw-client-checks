import React from "react";
import { useNavigate } from "react-router-dom";

const Main = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: "2rem",
        backgroundColor: "#f9fafb",
      }}
    >
      <button
        onClick={() => navigate("/TnChecker")}
        style={{
          padding: "1rem 2rem",
          fontSize: "1.5rem",
          borderRadius: "1rem",
          border: "none",
          backgroundColor: "#2563eb",
          color: "white",
          cursor: "pointer",
          width: "250px",
        }}
      >
        TN Checker
      </button>

      <button
        onClick={() => navigate("/TwChecker")}
        style={{
          padding: "1rem 2rem",
          fontSize: "1.5rem",
          borderRadius: "1rem",
          border: "none",
          backgroundColor: "#16a34a",
          color: "white",
          cursor: "pointer",
          width: "250px",
        }}
      >
        TW Checker
      </button>

      <button
        onClick={() => alert("Pas encore disponible")}
        style={{
          padding: "1rem 2rem",
          fontSize: "1.5rem",
          borderRadius: "1rem",
          border: "none",
          backgroundColor: "#6b7280",
          color: "white",
          cursor: "not-allowed",
          width: "250px",
        }}
      >
        À venir
      </button>
    </div>
  );
};

export default Main;
