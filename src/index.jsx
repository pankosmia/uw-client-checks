import { createRoot } from "react-dom/client";
import {
  createHashRouter,
  RouterProvider,
  Outlet,
  useNavigate,
  useLocation,
} from "react-router-dom";
import TwChecker from "./pages/tw";
import TnChecker from "./pages/tn";
import WordAligner from "./wordAligner/WordAligner"
// import ToolsManagementContainer from "./pages/ToolsManagementContainer";
// import ReduxStateViewer from "./pages/ReduxStateViewer";
import { doI18n,i18nContext } from 'pithekos-lib';
import { useContext } from 'react';

import Main from "./pages/main";
import SpaContainer from "pithekos-lib/dist/components/SpaContainer";
import "./index.css";
import { Header } from "pithekos-lib";
import SelectBook from "./pages/SelectBook";

function TabButtons() {
  
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { name: "Main", path: "/" },
    { name: "TN Checker", path: "TnChecker" },
    { name: "TW Checker", path: "TwChecker" },
  ];

  return (
    <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
      {tabs.map((tab) => (
        <button
          key={tab.path}
          onClick={() => navigate(tab.path)}
          style={{
            padding: "8px 16px",
            fontWeight: location.pathname.endsWith(tab.path)
              ? "bold"
              : "normal",
            backgroundColor: location.pathname.endsWith(tab.path)
              ? "#1976d2"
              : "#e0e0e0",
            color: location.pathname.endsWith(tab.path) ? "white" : "black",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {tab.name}
        </button>
      ))}
    </div>
  );
}

function AppLayout() {
  const { i18nRef } = useContext(i18nContext);

  return (
    <div>
      <Header
        titleKey="pages:uw-client-checks:title"
        requireNet={false}
        currentId="uw-client-checks"
      />
      <Outlet />
    </div>
  );
}

const router = createHashRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [

      { path: "TnChecker/*", element: <TnChecker /> },
      { path: "SelectBook/:name", element: <SelectBook /> }, // <-- NEW ROUTE
      { path: "TwChecker/*", element: <TwChecker /> },
      { path: "/", element: <WordAligner /> },

    ],
  },
]);

createRoot(document.getElementById("root")).render(
    <SpaContainer>
      <RouterProvider router={router} />
    </SpaContainer>
);
