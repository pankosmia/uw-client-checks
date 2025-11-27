import { useParams } from "react-router-dom";
import { useState, useEffect, useContext } from "react";
import { doI18n, i18nContext } from "pithekos-lib";
import { DataGrid } from "@mui/x-data-grid";
import { Box, Button, Typography, Modal, Chip } from "@mui/material";
import { convertToProjectFormat } from "../js/creatProject"; // <-- import your function
import { useNavigate } from "react-router-dom";
import { getJson } from "pithekos-lib";
import { BASE_URL } from "../common/constants";
import { fsGetRust, fsWriteRust } from "../js/serverUtils";
import { isOldTestament } from "../js/creatProject";
export default function SelectBook() {
  const { name } = useParams();
  const { i18nRef } = useContext(i18nContext);
  const [inDirectory, setInDirectory] = useState([]);
  const [tree, setTree] = useState([]);
  const [rows, setRows] = useState([]);
  const navigate = useNavigate();
  const [openModal, setOpenModal] = useState(false);
  const [manifestPath, setManifestPath] = useState("");
  const [openCheckModal, setOpenCheckModal] = useState(false);
  const [resourcesStatus, setResourcesStatus] = useState(null);
  const [pendingConvert, setPendingConvert] = useState(null);
  const [errorsData, setErrorsData] = useState([]);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [currentErrors, setCurrentErrors] = useState([]);
  const REQUIRED_RESOURCES = [
    "git.door43.org/uW/en_tn",
    "git.door43.org/uW/en_tw",
    "git.door43.org/uW/en_ugl",
    "git.door43.org/uW/grc_ugnt",
    "git.door43.org/uW/hbo_uhb",
    "git.door43.org/uW/en_ust",
    "git.door43.org/uW/en_ult",
  ];
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
      .find(([, manifest]) => manifest.abbreviation === AbrName);

    if (!entry) return null;

    return entry;
  }

  async function fetchData() {
    try {
      const url = `/burrito/paths/_local_/_local_/${name}`;
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
    fetchData();
  }, [name]);

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
      alert(`${bookCode} added successfully`);
    } catch (err) {
      console.error(err);
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
    } catch (error) {
      console.error("❌ Conversion failed:", error);
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
          if (e === "git.door43.org/uW/en_ugl") {
            continue;
          }
          if (isOldTestamentBook && e === "git.door43.org/uW/grc_ugnt") {
            continue;
          }
          if (!isOldTestamentBook && e === "git.door43.org/uW/hbo_uhb") {
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
              errors[book].push(`${e} doesnt have ${book} scope`);
            }
          }
        }
      }

      return errors;
    }
    if (name) {
      checkResourcesForBookCode(name).then((responceError) => {
        setErrorsData(responceError);
      });
    }
  }, [name]);

  const columns = [
    {
      field: "name",
      headerName: doI18n("pages:content:row_name", i18nRef.current),
      minWidth: 110,
      flex: 3,
    },
    {
      field: "language",
      headerName: doI18n("pages:content:row_language", i18nRef.current),
      minWidth: 120,
      flex: 0.75,
    },
    {
      field: "actions",
      headerName: doI18n("pages:content:row_actions", i18nRef.current),
      minWidth: 100,
      flex: 0.5,
      renderCell: (params) => {
        // params.row.actions is just a string or boolean
        const hasManifest = params.row.actions; // true/false
        return hasManifest ? (
          <Button
            variant="contained"
            onClick={() =>
              navigate(
                `/${params.row.projectName}/TwChecker/${params.row.tCoreName}`
              )
            }
          >
            {doI18n("pages:uw-client-checks:translationWords", i18nRef.current)}
          </Button>
        ) : (
          <Button
            variant="contained"
            color="warning"
            onClick={async () => {
              if (errorsData[params.row.name.toUpperCase()]?.length > 0) {
                setCurrentErrors(errorsData[params.row.name.toUpperCase()]);
                setErrorModalOpen(true);
              } else {
                const status = await checkRequiredResources();
                setResourcesStatus(status);
                setPendingConvert({
                  sourceProjectPath: params.row.projectName,
                  selectedProjectFilename: params.row.tCoreName,
                });
                setOpenCheckModal(true);
              }
            }}
          >
            {doI18n("pages:uw-client-checks:to_initialised", i18nRef.current)}
          </Button>
        );
      },
    },
  ];

  const handleOpenModal = async () => {
    const path = await getPathFromOriginalResources(name);
    setManifestPath(path);
    setOpenModal(true);
  };
  const handleCloseModal = () => setOpenModal(false);

  useEffect(() => {
    setRows(
      inDirectory.map((rep, n) => {
        const splitname = rep.split("_");
        return {
          id: n,
          tCoreName: rep,
          projectName: name,
          name: splitname[2],
          language: splitname[0],
          actions: find_manifest(rep),
          path: rep,
        }; // just a boolean
      })
    );
  }, [inDirectory]);

  return (
    <Box
      sx={{
        mb: 2,
        position: "fixed",
        top: "64px",
        bottom: 0,
        right: 0,
        overflow: "scroll",
        width: "100%",
      }}
    >
      <Button onClick={handleOpenModal}>
        {doI18n("pages:uw-client-checks:add_book_tCore", i18nRef.current)}
      </Button>
      <DataGrid
        autoHeight
        initialState={{
          sorting: {
            sortModel: [{ field: "name", sort: "asc" }],
          },
        }}
        rows={rows}
        columns={columns}
        sx={{ fontSize: "1rem" }}
      />
      <Modal open={openModal} onClose={handleCloseModal}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
            width: 500,
          }}
        >
          <Typography variant="h6" gutterBottom>
            {doI18n("pages:uw-client-checks:add_book_tCore", i18nRef.current)}
          </Typography>

          <Typography sx={{ wordWrap: "break-word" }}>
            {(manifestPath && (
              <Box>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2 }}>
                  {manifestPath[1].book_codes.map((code) => {
                    return (
                      <>
                        <Button
                          disabled={inDirectory
                            .map((e) => {
                              return e.split("_")[2].toUpperCase();
                            })
                            .includes(code)}
                          key={code}
                          color={
                            errorsData[code]?.length > 0 ? "warning" : "primary"
                          }
                          variant="contained"
                          size="small"
                          onClick={() => {
                            if (errorsData[code]?.length > 0) {
                              setCurrentErrors(errorsData[code]);
                              setErrorModalOpen(true);
                            } else {
                              handleAddBook(
                                code,
                                manifestPath[0],
                                name,
                                inDirectory[0]
                              );
                            }
                          }}
                        >
                          {code}
                        </Button>
                      </>
                    );
                  })}
                </Box>
              </Box>
            )) ||
              "Aucun manifest trouvé"}
          </Typography>

          <Box sx={{ textAlign: "right", mt: 2 }}>
            <Button variant="contained" onClick={() => setOpenModal(false)}>
              {doI18n("pages:uw-client-checks:ok", i18nRef.current)}
            </Button>
          </Box>
        </Box>
      </Modal>
      <Modal open={openCheckModal} onClose={() => setOpenCheckModal(false)}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
            width: 600,
          }}
        >
          <Typography variant="h6" gutterBottom>
            {doI18n(
              "pages:uw-client-checks:required_ressources_check",
              i18nRef.current
            )}
          </Typography>

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
                  <Typography color={r.exists ? "green" : "error"}>
                    {r.exists
                      ? doI18n(
                          "pages:uw-client-checks:present",
                          i18nRef.current
                        )
                      : doI18n(
                          "pages:uw-client-checks:missing",
                          i18nRef.current
                        )}
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

          <Box sx={{ textAlign: "right", mt: 3 }}>
            <Button sx={{ mr: 2 }} onClick={() => setOpenCheckModal(false)}>
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
          </Box>
        </Box>
      </Modal>
      <Modal open={errorModalOpen} onClose={() => setErrorModalOpen(false)}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
            width: 400,
          }}
        >
          <Typography variant="h6" gutterBottom>
            {doI18n("pages:uw-client-checks:book_errors", i18nRef.current)}
          </Typography>

          <Box sx={{ mt: 2 }}>
            {currentErrors.map((err, idx) => (
              <Typography key={idx} sx={{ mb: 1 }}>
                - {err}
              </Typography>
            ))}
          </Box>

          <Box sx={{ textAlign: "right", mt: 2 }}>
            <Button
              variant="contained"
              onClick={() => setErrorModalOpen(false)}
            >
              {doI18n("pages:uw-client-checks:ok", i18nRef.current)}
            </Button>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
}
