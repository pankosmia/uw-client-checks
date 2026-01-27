import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider, Outlet } from "react-router-dom";
import { ToolWrapper } from "./pages/toolWrapper";
import { Box } from "@mui/system";
// import ToolsManagementContainer from "./pages/ToolsManagementContainer";
// import ReduxStateViewer from "./pages/ReduxStateViewer";
import { useEffect, useState } from "react";
import { SpaContainer, Header } from "pankosmia-rcl";
import "./index.css";
import SelectBook from "./pages/SelectBook";
import { createTheme, ThemeProvider } from "@mui/material";
import { getAndSetJson } from "pithekos-lib";
function AppLayout() {
  const [themeSpec, setThemeSpec] = useState({
    palette: {
      primary: {
        main: "#666",
      },
      secondary: {
        main: "#888",
      },
    },
  });
  useEffect(() => {
    if (
      themeSpec.palette &&
      themeSpec.palette.primary &&
      themeSpec.palette.primary.main &&
      themeSpec.palette.primary.main === "#666"
    ) {
      getAndSetJson({
        url: "/app-resources/themes/default.json",
        setter: setThemeSpec,
      }).then();
    }
  });
  const theme = createTheme(themeSpec);

  useEffect(() => {
    document.body.style.setProperty(
      "--accent-color-dark",
      theme.palette.primary.main,
    );
    document.body.style.setProperty("--background-color-light", "#ffffff");
  }, [theme.palette.primary.main]);

  return (
    <ThemeProvider theme={theme}>
      <Box className="my-wrapper">
        <Header
          titleKey="pages:uw-client-checks:title"
          requireNet={false}
          currentId="uw-client-checks"
        />
        <Outlet />
      </Box>
    </ThemeProvider>
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
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <SpaContainer>
    <RouterProvider router={router} />
  </SpaContainer>,
);
