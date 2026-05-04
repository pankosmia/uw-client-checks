import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider, Outlet } from "react-router-dom";
import { ToolWrapper } from "./pages/toolWrapper";
import { Box } from "@mui/system";
// import ToolsManagementContainer from "./pages/ToolsManagementContainer";
// import ReduxStateViewer from "./pages/ReduxStateViewer";
import { useEffect, useState } from "react";
import { SpaContainer, Header, typographyContext } from "pankosmia-rcl";
import "./index.css";
import SelectBook from "./pages/SelectBook";
import { createTheme, ThemeProvider } from "@mui/material";
import { getAndSetJson } from "pithekos-lib";
import UsfmExport from "./pages/UsfmExport";
import { useContext, useMemo } from "react";
import GraphiteTest from "./js/ui_tool_kit/GraphiteTest";
import { styled } from "@mui/material/styles";

import {
  enqueueSnackbar,
  MaterialDesignContent,
  SnackbarProvider,
} from "notistack";
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
  const { typographyRef } = useContext(typographyContext);
  const [fontFamily, setFontFamily] = useState("");
  const [adjSelectedFontFamilies, setAdjSelectedFontFamilies] = useState(null);
  const [fontFamilyCorrespondance, setFontFamilyCorrespondance] =
    useState(null);
  const [theme, setTheme] = useState(null);
  const isGraphite = GraphiteTest();
  useEffect(() => {
    if (fontFamilyCorrespondance) {
      let stringFront = [];
      let newFont = {};
      let table = typographyRef.current.font_set.split("Pankosmia");
      table.shift();
      table = table.map((e) => "Pankosmia" + e);
      Object.entries(fontFamilyCorrespondance).forEach(([k, v]) => {
        let index = table.indexOf(k);
        if (index >= 0) {
          newFont[index] = v;
        }
      });
      for (let e = 0; e < Object.keys(table).length; e++) {
        if (newFont[e]) {
          stringFront.push(newFont[e]);
        }
      }
      setFontFamily(stringFront);
    }
  }, [typographyRef.current?.font_set, isGraphite, fontFamilyCorrespondance]);

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
  useEffect(() => {
    if (themeSpec && fontFamily) {
      setTheme(
        createTheme({
          ...themeSpec,
          typography: {
            ...themeSpec.typography,
            fontFamily: fontFamily.join(","),
          },
          components: {
            ...themeSpec.components,

            MuiTypography: {
              styleOverrides: {
                root: {
                  fontFamily: fontFamily.join(","),
                },
              },
            },

            MuiListItemText: {
              styleOverrides: {
                primary: {
                  fontFamily: fontFamily.join(","),
                },
                secondary: {
                  fontFamily: fontFamily.join(","),
                },
              },
            },
          },
        }),
      );
    }
  }, [themeSpec, fontFamily]);

  useEffect(() => {
    let cores = {};
    document.fonts.ready.then(() => {
      document.fonts.forEach((f) => {
        const cleanFamily = f.family
          .replace(/['"]/g, "") // remove quotes " or '
          .trim() // remove leading/trailing spaces
          .replace(/\s+/g, " "); // normalize multiple spaces

        console.log(cleanFamily);

        cores[cleanFamily.replaceAll(" ", "")] = cleanFamily;
      });

      setFontFamilyCorrespondance(cores);
    });
  }, []);
  useEffect(() => {
    if (theme) {
      document.body.style.setProperty(
        "--accent-color-dark",
        theme.palette.primary.main,
      );
      document.body.style.setProperty("--background-color-light", "#ffffff");
    }
  }, [theme]);

  useEffect(() => {
    if (!fontFamily?.length) return;

    const style = document.createElement("style");

    style.innerHTML = `
    .MuiTypography-root {
      font-family: ${fontFamily.join(",")} !important;
    }
  `;

    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [fontFamily]);

  const CustomSnackbarContent = styled(MaterialDesignContent)(() => ({
    "&.notistack-MuiContent-error": {
      backgroundColor: "#FDEDED",
      color: "#D32F2F",
    },
    "&.notistack-MuiContent-info": {
      backgroundColor: "#E5F6FD",
      color: "#0288D1",
    },
    "&.notistack-MuiContent-warning": {
      backgroundColor: "#FFF4E5",
      color: "#EF6C00",
    },
    "&.notistack-MuiContent-success": {
      backgroundColor: "#EDF7ED",
      color: "#2E7D32",
    },
  }));
  return theme ? (
    <SnackbarProvider
      Components={{
        error: CustomSnackbarContent,
        info: CustomSnackbarContent,
        warning: CustomSnackbarContent,
        success: CustomSnackbarContent,
      }}
      maxSnack={6}
    >
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
    </SnackbarProvider>
  ) : (
    <></>
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
      {
        path: ":export/usfm",
        element: <UsfmExport />,
      },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <SpaContainer>
    <RouterProvider router={router} />
  </SpaContainer>,
);
