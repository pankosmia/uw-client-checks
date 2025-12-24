import { useParams } from "react-router-dom";
import { useState, useEffect, useContext } from "react";
import { doI18n, i18nContext } from "pithekos-lib";
import AddIcon from "@mui/icons-material/Add";
import CircularProgress from "@mui/material/CircularProgress";
import CheckerSetting from "../js/components/CheckerSetting";
import {
  Box,
  Button,
  Typography,
  FormControl,
  TextField,
  MenuItem,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Fab,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { convertToProjectFormat } from "../js/creatProject"; // <-- import your function
import { getJson } from "pithekos-lib";
import { BASE_URL } from "../common/constants";
import { fsGetRust, fsWriteRust } from "../js/serverUtils";
import { isOldTestament } from "../js/creatProject";
import ButtonDashBoard from "../js/components/ButtonDashBoard";
import AppDialog from "../js/components/AppDialog";

export default function SelectBook() {
  const [openResourcesDialog, setOpenResourcesDialog] = useState(false);
  const { i18nRef } = useContext(i18nContext);
  const [inDirectory, setInDirectory] = useState([]);
  const [tree, setTree] = useState([]);
  const [books, setBooks] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [manifestPath, setManifestPath] = useState("");
  const [openCheckModal, setOpenCheckModal] = useState(false);
  const [resourcesStatus, setResourcesStatus] = useState(null);
  const [pendingConvert, setPendingConvert] = useState(null);
  const [errorsData, setErrorsData] = useState([]);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [currentErrors, setCurrentErrors] = useState([]);
  const [burritos, setBurritos] = useState(null);
  const [globalResourcesStatus, setGlobalResourcesStatus] = useState(null);
  const [allResourcesPresent, setAllResourcesPresent] = useState(false);
  const [selectedBurrito, setSelectedBurrito] = useState();
  const [openedBooks, setOpenedBooks] = useState(new Set());

  const [initializing, setInitializing] = useState([]);

  const { optional_project } = useParams();
  console.log(initializing);
  useEffect(() => {
    if (globalResourcesStatus && !allResourcesPresent) {
      setOpenResourcesDialog(true);
    }
  }, [globalResourcesStatus, allResourcesPresent]);

  useEffect(() => {
    async function fetchSummaries() {
      if (optional_project) {
        try {
          const response = await getJson("/burrito/metadata/summaries");
          if (!response.ok) throw new Error(`HTTP error ${response.status}`);
          const data = await response.json;
          // Filter only those with flavor_type = scripture
          const burritoArray = Object.entries(data).map(([key, value]) => ({
            path: key,
            ...value,
          }));

          // Filter only scripture burritos
          const scriptures = burritoArray.find(
            (item) =>
              item?.flavor === "x-tcore" &&
              item?.abbreviation === optional_project
          );
          setSelectedBurrito(scriptures);
        } catch (err) {
          console.error("Error fetching summaries:", err);
        } finally {
        }
      }
    }
    fetchSummaries();
  }, []);
  useEffect(() => {
    async function runGlobalCheck() {
      const status = await checkRequiredResources();
      setGlobalResourcesStatus(status);
      setAllResourcesPresent(status.every((r) => r.exists));
    }

    runGlobalCheck();
  }, []);
  const REQUIRED_RESOURCES = [
    "git.door43.org/uW/en_tn",
    "git.door43.org/uW/en_tw",
    "git.door43.org/uW/en_ugl",
    "git.door43.org/uW/grc_ugnt",
    "git.door43.org/uW/hbo_uhb",
    "git.door43.org/uW/en_ust",
    "git.door43.org/uW/en_ult",
    "git.door43.org/uW/en_ta",
    "git.door43.org/uW/en_uhl",
  ];

  const handleSelectBurrito = (event) => {
    const name = event.target.value;
    const burrito = burritos.find((b) => b.name === name);
    setSelectedBurrito(burrito);
  };

  useEffect(() => {
    async function fetchSummaries() {
      try {
        const response = await getJson("/burrito/metadata/summaries");
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const data = await response.json;
        // Filter only those with flavor_type = scripture
        const burritoArray = Object.entries(data).map(([key, value]) => ({
          path: key,
          ...value,
        }));

        // Filter only scripture burritos
        const scriptures = burritoArray.filter(
          (item) => item?.flavor === "x-tcore"
        );
        if (scriptures.length < 1) {
          setBurritos(null);
        } else {
          setBurritos(scriptures);
        }
      } catch (err) {
        console.error("Error fetching summaries:", err);
      } finally {
      }
    }
    fetchSummaries();
  }, [selectedBurrito]);

  async function checkRequiredResources() {
    const manifests = (await getJson(BASE_URL + "/burrito/metadata/summaries"))
      .json;

    return REQUIRED_RESOURCES.map((path) => ({
      path,
      exists: Boolean(manifests[path]),
      name: manifests[path]?.name || null,
    }));
  }
  async function getPathFromOriginalResources(name) {
    const manifestsObj = (
      await getJson(BASE_URL + "/burrito/metadata/summaries")
    ).json;

    const AbrName = name.split("_")[0].toUpperCase();

    const entry = Object.entries(manifestsObj)
      .filter(([path]) => path.includes("_local_/_local_"))
      .find(
        ([, manifest]) =>
          manifest.abbreviation.toUpperCase() === AbrName.toUpperCase() ||
          manifest.abbreviation.toLowerCase() === AbrName.toLowerCase()
      );

    if (!entry) return null;

    return entry;
  }

  async function fetchData() {
    try {
      const url = `/burrito/paths/_local_/_local_/${selectedBurrito.abbreviation}`;
      const res = await getJson(url);
      const data = await res.json;
      const ipath = "book_projects";
      const children = data
        .filter((item) => item.startsWith(ipath + "/"))
        .map((item) => item.replace(ipath + "/", ""));
      setTree(children);
    } catch (err) {
      console.error(err);
    }
  }
  useEffect(() => {
    if (selectedBurrito) {
      fetchData();
    }
  }, [selectedBurrito]);

  const handleAddBook = async (
    bookCode,
    manifestPath,
    currentProject,
    projectExemple
  ) => {
    try {
      let projectExempleArray = projectExemple.split("_");
      projectExempleArray[2] = bookCode.toLowerCase();
      projectExempleArray = projectExempleArray.join("_");
      let nameProject = manifestPath.split("/")[2];
      let usfm = await fsGetRust(nameProject, `${bookCode}.usfm`);
      await fsWriteRust(
        currentProject,
        `book_projects/${projectExempleArray}/${bookCode.toLowerCase()}.usfm`,
        usfm
      );
      fetchData();
      setOpenModal(false);
    } catch (err) {
      alert(`Failed to add ${bookCode}`);
    }
  };
  function find_manifest(path) {
    return tree.includes(`${path}/manifest.json`);
  }
  const handleTryConvert = async (
    sourceProjectPath,
    selectedProjectFilename
  ) => {
    try {
      await convertToProjectFormat(
        sourceProjectPath,
        "book_projects/" + selectedProjectFilename + "/"
      );
      fetchData();
      setInitializing((prev) =>
        prev.filter(
          ([p2, t2]) =>
            !(p2 === sourceProjectPath && t2 === selectedProjectFilename)
        )
      );
    } catch (error) {
      alert("Conversion failed — see console for details.");
    }
  };
  useEffect(() => {
    const firstLevel = new Set();
    for (const entry of tree) {
      const firstPart = entry.split("/")[0];
      if (firstPart) firstLevel.add(firstPart);
    }
    setInDirectory(Array.from(firstLevel));
  }, [tree]);

  useEffect(() => {
    async function checkResourcesForBookCode(name) {
      const path = await getPathFromOriginalResources(name);
      setManifestPath(path);
      let errors = {};
      const manifestsObj = (
        await getJson(BASE_URL + "/burrito/metadata/summaries")
      ).json;
      const projectManifest = Object.values(manifestsObj).find(
        (e) => e.abbreviation === name.split("_")[0].toUpperCase()
      );

      for (let book of projectManifest.book_codes) {
        let isOldTestamentBook = isOldTestament(book.toLowerCase());

        errors[book] = [];
        for (let e of REQUIRED_RESOURCES) {
          if (isOldTestamentBook && e === "git.door43.org/uW/grc_ugnt") {
            continue;
          }
          if (!isOldTestamentBook && e === "git.door43.org/uW/hbo_uhb") {
            continue;
          }
          if (
            e === "git.door43.org/uW/en_ta" ||
            e === "git.door43.org/uW/en_uhl" ||
            e === "git.door43.org/uW/en_ugl"
          ) {
            continue;
          }
          if (!manifestsObj[e]) {
            errors[book].push(
              `${e} ${doI18n(
                "pages:uw-client-checks:required_ressources_check",
                i18nRef.current
              )}`
            );
          } else {
            if (!manifestsObj[e].book_codes.includes(book)) {
              errors[book].push(
                `${e} ${doI18n(
                  "pages:uw-client-checks:doesnt_have",
                  i18nRef.current
                )} ${book} ${doI18n(
                  "pages:uw-client-checks:scope",
                  i18nRef.current
                )}`
              );
            }
          }
        }
      }

      return errors;
    }
    if (selectedBurrito) {
      checkResourcesForBookCode(selectedBurrito.abbreviation).then(
        (responceError) => {
          setErrorsData(responceError);
        }
      );
    }
  }, [selectedBurrito]);

  const handleCloseModal = () => setOpenModal(false);

  useEffect(() => {
    setBooks(
      inDirectory.map((rep, n) => {
        const splitname = rep.split("_");
        return {
          id: n,
          tCoreName: rep,
          projectName: selectedBurrito.abbreviation,
          bookCode: splitname[2].toUpperCase(),
          language: splitname[0],
          hasManifest: find_manifest(rep),
        };
      })
    );
  }, [inDirectory, selectedBurrito]);

  return (
    <Box
      sx={{
      }}
    >
      {burritos ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-start",
            width: "100%",
            px: 2,
            py:1
          }}
        >
          <FormControl disabled={!allResourcesPresent} sx={{ minWidth: 320 }}>
            <TextField
              required
              disabled={!allResourcesPresent}
              id="burrito-select-label"
              select
              value={selectedBurrito?.name || ""}
              onChange={handleSelectBurrito}
              label={doI18n(
                "pages:uw-client-checks:choose_document",
                i18nRef.current
              )}
            >
              {burritos.map((burrito) => (
                <MenuItem key={burrito.name} value={burrito.name}>
                  {burrito.name}
                </MenuItem>
              ))}
            </TextField>
          </FormControl>

          {/* {selectedBurrito && (
            <CheckerSetting repoName={selectedBurrito.abbreviation} />
          )} */}
        </Box>
      ) : (
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: "8px",
            width: "100%",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {doI18n(
              "pages:uw-client-checks:no_tCoreProject_found",
              i18nRef.current
            )}
          </Typography>

          <Button
            onClick={() =>
              (window.location.href =
                "/clients/core-contenthandler_t_core#/createDocument/tCoreContent")
            }
          >
            {doI18n(
              "pages:uw-client-checks:creat_tCore_project",
              i18nRef.current
            )}
          </Button>
        </Box>
      )}
      <Divider
        sx={{
          my: 3,
          borderColor: "divider",
        }}
      />
      {selectedBurrito ? (
        <Box sx={{ px: 2 }}>
          <Box
            sx={{
              mb: 2,
            }}
          >
            <Fab
              variant="extended"
              color="primary"
              size="small"
              aria-label={doI18n("pages:content:fab_import", i18nRef.current)}
              onClick={(event) => setOpenModal(event.currentTarget)}
              sx={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                padding: "0px",

                width: "160px",
                height: "40px",

                backgroundColor: "#014263",
                boxShadow:
                  "0px 1px 18px rgba(0, 0, 0, 0.12), " +
                  "0px 6px 10px rgba(0, 0, 0, 0.14), " +
                  "0px 3px 5px -1px rgba(0, 0, 0, 0.2)",

                borderRadius: "100px",

                flex: "none",
                order: 3,
                flexGrow: 0,

                // optional: prevent MUI default hover color override
              }}
            >
              <AddIcon sx={{ mr: 1 }} />
              <Typography variant="body2">
                {doI18n("pages:uw-client-checks:add_book", i18nRef.current)}
              </Typography>
            </Fab>
            <Typography variant="h6" fontWeight={600}>
              {doI18n("pages:uw-client-checks:book", i18nRef.current)}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {books.map((book) => (
              <Accordion
                onChange={() => {
                  setOpenedBooks((prev) => {
                    const next = new Set(prev);

                    if (next.has(book.bookCode)) {
                      next.delete(book.bookCode); // close → remove
                    } else {
                      next.add(book.bookCode); // open → add
                    }

                    return next;
                  });
                }}
                key={book.id}
                sx={{
                  borderRadius: 2,
                  boxShadow: 2,
                  "&:before": { display: "none" },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {book.bookCode}
                      </Typography>
                    </Box>

                    <Box>
                      {book.hasManifest ? (
                        <Typography color="success.main" fontWeight={600}>
                          {doI18n(
                            `pages:uw-client-checks:ready`,
                            i18nRef.current
                          )}
                        </Typography>
                      ) : (
                        <Typography color="warning.main" fontWeight={600}>
                          {doI18n(
                            `pages:uw-client-checks:need_initalisation`,
                            i18nRef.current
                          )}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </AccordionSummary>

                <AccordionDetails>
                  <Divider sx={{ mb: 2 }} />
                  <Box>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        width: "100%",
                        minHeight: 80, // optional: gives breathing space
                      }}
                    >
                      {book.hasManifest ? (
                        <ButtonDashBoard
                          openedBooks={openedBooks}
                          projectName={book.projectName}
                          tCoreName={book.tCoreName}
                        />
                      ) : (
                        <Button
                          variant="contained"
                          color="warning"
                          disabled={initializing.some(
                            ([p2, t2]) =>
                              p2 === book.projectName && t2 === book.tCoreName
                          )}
                          onClick={async () => {
                            if (errorsData[book.bookCode]?.length > 0) {
                              setCurrentErrors(errorsData[book.bookCode]);
                              setErrorModalOpen(true);
                            } else {
                              setInitializing((prev) => [
                                ...prev,
                                [book.projectName, book.tCoreName],
                              ]);
                              await handleTryConvert(
                                book.projectName,
                                book.tCoreName
                              );
                            }
                          }}
                        >
                          {initializing.some(
                            ([p2, t2]) =>
                              p2 === book.projectName && t2 === book.tCoreName
                          ) ? (
                            <CircularProgress size={18} color="inherit" />
                          ) : (
                            doI18n(
                              "pages:uw-client-checks:to_initialised",
                              i18nRef.current
                            )
                          )}
                        </Button>
                      )}
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "flex-end", // ✅ right
                        width: "100%",
                        mt: 1,
                      }}
                    >
                      {" "}
                      <CheckerSetting
                        repoName={selectedBurrito.abbreviation}
                        tCoreNameProject={book.tCoreName}
                      />
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </Box>
      ) : (
        <Box sx={{ px: 2 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6" fontWeight={600}>
              {doI18n("pages:uw-client-checks:books", i18nRef.current)}
            </Typography>
          </Box>
        </Box>
      )}

      <AppDialog
        open={openModal}
        onClose={handleCloseModal}
        title={doI18n("pages:uw-client-checks:add_book_tCore", i18nRef.current)}
        actions={
          <Button variant="contained" onClick={handleCloseModal}>
            {doI18n("pages:uw-client-checks:close", i18nRef.current)}
          </Button>
        }
      >
        {manifestPath ? (
          <Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2 }}>
              {manifestPath[1].book_codes.map((code) => (
                <Button
                  key={code}
                  disabled={inDirectory
                    .map((e) => e.split("_")[2].toUpperCase())
                    .includes(code)}
                  variant="contained"
                  size="small"
                  color={errorsData[code]?.length > 0 ? "warning" : "primary"}
                  onClick={() => {
                    if (errorsData[code]?.length > 0) {
                      setCurrentErrors(errorsData[code]);
                      setErrorModalOpen(true);
                    } else {
                      handleAddBook(
                        code,
                        manifestPath[0],
                        selectedBurrito.abbreviation,
                        inDirectory[0]
                      );
                    }
                  }}
                >
                  {code}
                </Button>
              ))}
            </Box>
          </Box>
        ) : (
          doI18n("pages:uw-client-checks:no_manifest_found", i18nRef.current)
        )}
      </AppDialog>
      <AppDialog
        open={openCheckModal}
        onClose={() => setOpenCheckModal(false)}
        maxWidth="md"
        title={doI18n(
          "pages:uw-client-checks:required_ressources_check",
          i18nRef.current
        )}
        actions={
          <>
            <Button onClick={() => setOpenCheckModal(false)}>
              {doI18n("pages:uw-client-checks:cancel", i18nRef.current)}
            </Button>

            <Button
              variant="contained"
              disabled={resourcesStatus?.some((r) => !r.exists)}
              onClick={async () => {
                setOpenCheckModal(false);
                await handleTryConvert(
                  pendingConvert.sourceProjectPath,
                  pendingConvert.selectedProjectFilename
                );
              }}
            >
              {doI18n("pages:uw-client-checks:to_initialised", i18nRef.current)}
            </Button>
          </>
        }
      >
        {resourcesStatus ? (
          <Box sx={{ mt: 2 }}>
            {resourcesStatus.map((r) => (
              <Box
                key={r.path}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography>{r.path}</Typography>
                <Typography color={r.exists ? "success.main" : "error"}>
                  {r.exists
                    ? doI18n("pages:uw-client-checks:present", i18nRef.current)
                    : doI18n("pages:uw-client-checks:missing", i18nRef.current)}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography>
            {doI18n(
              "pages:uw-client-checks:checking_ressources",
              i18nRef.current
            )}
          </Typography>
        )}
      </AppDialog>
      <AppDialog
        open={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
        maxWidth="xs"
        title={doI18n("pages:uw-client-checks:book_errors", i18nRef.current)}
        actions={
          <Button variant="contained" onClick={() => setErrorModalOpen(false)}>
            {doI18n("pages:uw-client-checks:close", i18nRef.current)}
          </Button>
        }
      >
        <Box sx={{ mt: 2 }}>
          {currentErrors.map((err, idx) => (
            <Typography key={idx} sx={{ mb: 1 }}>
              - {err}
            </Typography>
          ))}
        </Box>
      </AppDialog>
      <AppDialog
        open={openResourcesDialog}
        onClose={() => (window.location.href = "/clients/content")}
        maxWidth="md"
        title={doI18n(
          "pages:uw-client-checks:required_ressources_check",
          i18nRef.current
        )}
        actions={
          <Button
            variant="contained"
            onClick={() => (window.location.href = "/clients/content")}
          >
            {doI18n("pages:uw-client-checks:manage_content", i18nRef.current)}
          </Button>
        }
      >
        <Typography sx={{ mb: 2 }}>
          {doI18n("pages:uw-client-checks:ressource_required", i18nRef.current)}
        </Typography>

        <Box>
          {globalResourcesStatus
            ?.filter((r) => !r.exists)
            .map((r) => (
              <Box
                key={r.path}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 1,
                  px: 1,
                }}
              >
                <Typography>{r.path}</Typography>
                {/* <Typography color="error" fontWeight={600}>
                  {doI18n("pages:uw-client-checks:missing", i18nRef.current)}
                </Typography> */}
              </Box>
            ))}
        </Box>
      </AppDialog>
    </Box>
  );
}
