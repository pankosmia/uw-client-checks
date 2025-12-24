import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider, Outlet } from "react-router-dom";
import { ToolWrapper } from "./pages/toolWrapper";
import WordAligner from "./wordAligner/WordAligner";
import { Box } from "@mui/system";
import { RedirectToContent } from "./pages/RedirectToContent";
// import ToolsManagementContainer from "./pages/ToolsManagementContainer";
// import ReduxStateViewer from "./pages/ReduxStateViewer";
import { useEffect } from "react";
import SpaContainer from "pithekos-lib/dist/components/SpaContainer";
import "./index.css";
import { Header } from "pithekos-lib";
import SelectBook from "./pages/SelectBook";
import { useTheme } from "@mui/material/styles";

function AppLayout() {
  const theme = useTheme();

  useEffect(() => {
    document.body.style.setProperty(
      "--accent-color-dark",
      theme.palette.primary.main
    );
    document.body.style.setProperty(
      "--background-color-light",
      "#ffffff"
    );
  }, [theme.palette.primary.main]);

  return (
    <Box
      className="my-wrapper"
    >
      <Header
        titleKey="pages:uw-client-checks:title"
        requireNet={false}
        currentId="uw-client-checks"
      />
      <Outlet />
    </Box>
  );
}

const router = createHashRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <SelectBook /> },
      { path: ":optional_project", element: <SelectBook /> },
      {
        path: ":projectName/ToolWrapper/:tCoreName/*",
        element: <ToolWrapper />,
      },
      { path: "/WordAligner", element: <WordAligner /> },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <SpaContainer>
    <RouterProvider router={router} />
  </SpaContainer>
);
