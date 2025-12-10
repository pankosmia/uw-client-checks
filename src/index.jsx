import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider, Outlet } from "react-router-dom";
import { ToolWrapper } from "./pages/toolWrapper";
import WordAligner from "./wordAligner/WordAligner";
import { RedirectToContent } from "./pages/RedirectToContent";
// import ToolsManagementContainer from "./pages/ToolsManagementContainer";
// import ReduxStateViewer from "./pages/ReduxStateViewer";

import SpaContainer from "pithekos-lib/dist/components/SpaContainer";
import "./index.css";
import { Header } from "pithekos-lib";
import SelectBook from "./pages/SelectBook";

function AppLayout() {
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
      { index: true, element: <SelectBook /> },
      { path: ":optional_project", element: <SelectBook /> },
      { path: ":projectName/ToolWrapper/:tCoreName/*", element: <ToolWrapper /> },
      { path: "/WordAligner", element: <WordAligner /> },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <SpaContainer>
    <RouterProvider router={router} />
  </SpaContainer>
);
