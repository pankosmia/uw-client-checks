import {
  Button,
  Typography,
  Box,
  DialogContent,
  Grid2,
  Fab,
} from "@mui/material";
import { useState, useContext, useEffect } from "react";
import { doI18n } from "pithekos-lib";
import {
  PanDialog,
  debugContext,
  i18nContext,
  currentProjectContext,
  PanTable,
} from "pankosmia-rcl";
import { getJson } from "pithekos-lib";
import LayoutIcon from "../ui_tool_kit/LayoutIcon";

export default function AddScriptureModal({
  selectedResources,
  setSelectedResources,
  book,
}) {
  const { debugRef } = useContext(debugContext);
  const { i18nRef } = useContext(i18nContext);
  const { currentProjectRef } = useContext(currentProjectContext);

  const [openResourcesDialog, setOpenResourcesDialog] = useState(false);

  const [isoThreeLookup, setIsoThreeLookup] = useState([]);
  const [isoOneToThreeLookup, setIsoOneToThreeLookup] = useState([]);

  const [projectSummaries, setProjectSummaries] = useState({});

  const [_selectedResources, _setSelectedResources] = useState([]);
  const getProjectSummaries = async () => {
    const summariesResponse = await getJson(
      "/burrito/metadata/summaries",
      debugRef.current,
    );
    if (summariesResponse.ok) {
      setProjectSummaries(summariesResponse.json);
    }
  };

  useEffect(() => {
    getProjectSummaries().then();
  }, []);

  useEffect(() => {
    fetch("/app-resources/lookups/iso639-1-to-3.json") // ISO_639-1 codes mapped to ISO_639-3 codes
      .then((r) => r.json())
      .then((data) => setIsoOneToThreeLookup(data));
  }, []);

  useEffect(() => {
    fetch("/app-resources/lookups/iso639-3.json") // ISO_639-3 2025-02-21 from https://hisregistries.org/rol/ plus zht, zhs, nep
      .then((r) => r.json())
      .then((data) => setIsoThreeLookup(data));
  }, []);
  const filterChip = [
    {
      label: "Local",
      filter: (row) => row.path.toLowerCase().startsWith("_local_/_local_"),
    },

    {
      label: "SideLoad",
      filter: (row) => row.path.startsWith("_local_/_sideload_"),
    },
    {
      label: "Download",
      filter: (row) => !row.path.startsWith("_local_/"),
    },
  ];

  const columns = [
    {
      field: "name",
      headerName: doI18n("pages:uw-client-checks:row_name", i18nRef.current),
      // minWidth: 110,
      flex: 1,
    },
    {
      field: "description",
      headerName: doI18n(
        "pages:uw-client-checks:row_description",
        i18nRef.current,
      ),
      // minWidth: 130,
      flex: 1,
    },
    {
      field: "source",
      headerName: doI18n("pages:uw-client-checks:row_source", i18nRef.current),
      // minWidth: 110,
      flex: 0.5,
    },
    {
      field: "language",
      headerName: doI18n(
        "pages:uw-client-checks:row_language",
        i18nRef.current,
      ),
      // minWidth: 100,
      flex: 0.5,
    },
  ];

  const rows = Object.entries(projectSummaries)
    .map((e) => {
      return { ...e[1], path: e[0] };
    })
    .filter(
      (r) =>
        currentProjectRef.current &&
        projectSummaries[r.path].flavor === "textTranslation" &&
        projectSummaries[r.path].book_codes.includes(book.toUpperCase()),
    )

    .map((rep, n) => {
      return {
        ...rep,
        id: n,
        path: rep.path,
        name: `${rep.name} (${rep.abbreviation})`,
        description: rep.description !== rep.name ? rep.description : "",
        source: rep.path.startsWith("_local_")
          ? rep.path.startsWith("_local_/_sideloaded_")
            ? doI18n("pages:content:local_resource", i18nRef.current)
            : doI18n("pages:content:local_project", i18nRef.current)
          : `${rep.path.split("/")[1]} (${rep.path.split("/")[0]})`,
        type: rep.flavor,
        language:
          isoThreeLookup?.[
            isoOneToThreeLookup[rep.language_code] ?? rep.language_code
          ]?.en ?? rep.language_code,
      };
    });
  return (
    <>
      <Button
        variant="outlined"
        sx={{
          marginX: 1,
        }}
        onClick={() => setOpenResourcesDialog(true)}
      >
        <LayoutIcon />
      </Button>
      <PanDialog
        isOpen={openResourcesDialog}
        closeFn={() => setOpenResourcesDialog(false)}
        size="md"
        titleLabel={`${doI18n(
          "pages:uw-client-checks:import_zip_project",
          i18nRef.current,
        )}`}
      >
        <DialogContent>
          <Grid2
            sx={{ display: "flex", flexFlow: "row nowrap" }}
            container
            alignItems="center"
            justifyContent="space-between"
            width="100%"
          >
            <Grid2 display="flex" gap={1}>
              <Typography
                sx={{
                  overflow: "hide",
                  maxHeight: 48,
                }}
              >
                {doI18n(
                  "pages:uw-client-checks:choose_resources_tCore",
                  i18nRef.current,
                )}
              </Typography>
            </Grid2>
            <Grid2 display="flex" gap={1}>
              <Fab
                variant="extended"
                color="primary"
                length="small"
                aria-label={doI18n("pages:content:add", i18nRef.current)}
                onClick={() => {
                  setSelectedResources(_selectedResources);
                  setOpenResourcesDialog(false);
                }}
              >
                <Typography variant="body2">
                  {`${doI18n("pages:uw-client-checks:editing", i18nRef.current, debugRef.current)} ${currentProjectRef.current && currentProjectRef.current.project}`}
                </Typography>
                {/* <PlayArrowIcon /> */}
              </Fab>
            </Grid2>
          </Grid2>
          <Box sx={{ m: 2 }}>
            <Grid2 item size={12}>
              <Box
                sx={{
                  //   height: `${maxWindowHeight}px`,
                  display: "flex",
                  flexDirection: "column",
                  width: "100%",
                }}
              >
                <Box sx={{ flex: 1, minHeight: 0 }}>
                  <PanTable
                    checkboxSelection={true}
                    showColumnFilters
                    columns={columns}
                    rows={rows}
                    filterPreset={filterChip}
                    // preSelections={[0, 2]}
                    onRowSelectionModelChange={(ids) => {
                      _setSelectedResources(
                        rows
                          .filter((row) => ids.includes(row.id))
                          .map((row) => row.path),
                      );
                    }}
                  />
                </Box>
              </Box>
            </Grid2>
          </Box>
        </DialogContent>
      </PanDialog>
    </>
  );
}
