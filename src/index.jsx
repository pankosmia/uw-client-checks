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
import ReduxStateViewer from "./pages/ReduxStateViewer";

import Main from "./pages/main";
import SpaContainer from "pithekos-lib/dist/components/SpaContainer";
import "./index.css";
import { Provider } from "react-redux";
import store from "./store";
import { Header } from "pithekos-lib";
function TabButtons() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { name: "Main", path: "/" },
    { name: "ReduxStateViewer", path: "/" },

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
  return (
    <div>
      <Header
        titleKey="pages:uw-client-checks:title"
        requireNet={false}
        currentId="uw-client-checks"
      />
      <h1 style={{ marginBottom: "20px" }}>Dashboard</h1>
      <TabButtons />
      <div style={{ marginTop: "20px" }}>
        <Outlet />
      </div>
    </div>
  );
}

const router = createHashRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { path: "/", element: <ReduxStateViewer /> },
      { path: "TnChecker/*", element: <TnChecker /> },
      { path: "TwChecker/*", element: <TwChecker /> },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <SpaContainer>
      <RouterProvider router={router} />
    </SpaContainer>
  </Provider>
);
