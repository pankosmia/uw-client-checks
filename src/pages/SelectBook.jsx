import { useState, useEffect, useContext } from "react";
import { doI18n } from "pithekos-lib";
import { i18nContext, currentProjectContext } from "pankosmia-rcl";

import CircularProgress from "@mui/material/CircularProgress";
import DeleteDialogueButton from "../js/components/DeleteDialogueButton";
import ArrowBack from "@mui/icons-material/ArrowBack";
import CheckerSetting from "../js/components/CheckerSetting";
import {
  Box,
  Button,
  Typography,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { ImportZipProject } from "../js/CreateBookProject/ImportZipProject/ImportZipProject";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { convertToProjectFormat } from "../js/creatProject"; // <-- import your function
import { getJson } from "pithekos-lib";
import { BASE_URL } from "../common/constants";
import ButtonDashBoard from "../js/components/ButtonDashBoard";
import CreateBookProjectScratch from "../js/CreateBookProject/CreateBookProjectScratch/CreatBookProjectScratch";

export default function SelectBook() {
  const { currentProjectRef } = useContext(currentProjectContext);

  const { i18nRef } = useContext(i18nContext);

  const [inDirectory, setInDirectory] = useState([]);
  const [tree, setTree] = useState([]);
  const [books, setBooks] = useState([]);
  const [errorsData, setErrorsData] = useState([]);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [currentErrors, setCurrentErrors] = useState([]);
  const [burritos, setBurritos] = useState(null);
  const [selectedBurrito, setSelectedBurrito] = useState();
  const [openedBooks, setOpenedBooks] = useState(new Set());
  const [initializing, setInitializing] = useState([]);

  useEffect(() => {
    async function fetchSummaries() {
      if (currentProjectRef.current) {
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
              item?.path ===
                currentProjectRef.current.source +
                  "/" +
                  currentProjectRef.current.organization +
                  "/" +
                  currentProjectRef.current.project,
          );
          setSelectedBurrito(scriptures);
        } catch (err) {
          console.error("Error fetching summaries:", err);
        } finally {
        }
      }
    }
    fetchSummaries();
  }, [currentProjectRef.current]);

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
          (item) => item?.flavor === "x-tcore",
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

  async function fetchData() {
    try {
      if (selectedBurrito) {
        const url = `/burrito/paths/_local_/_local_/${selectedBurrito.abbreviation}`;
        const res = await getJson(url);
        const data = await res.json;
        const ipath = "book_projects";
        const children = data
          .filter((item) => item.startsWith(ipath + "/"))
          .map((item) => item.replace(ipath + "/", ""));
        setTree(children);
      }
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    if (selectedBurrito) {
      fetchData();
    }
  }, [selectedBurrito]);

  function find_manifest(path) {
    return tree.includes(`${path}/manifest.json`);
  }
  const handleTryConvert = async (
    sourceProjectPath,
    selectedProjectFilename,
  ) => {
    try {
      await convertToProjectFormat(
        sourceProjectPath,
        "book_projects/" + selectedProjectFilename + "/",
      );
      fetchData();
      setInitializing((prev) =>
        prev.filter(
          ([p2, t2]) =>
            !(p2 === sourceProjectPath && t2 === selectedProjectFilename),
        ),
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
      }),
    );
  }, [inDirectory, selectedBurrito]);
  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          px: 2,
          height: "48px",
          marginTop: "4px",
          flexShrink: 0,
        }}
      >
        {/* LEFT: Back button */}
        <Button
          color="primary"
          size="small"
          sx={{ marginX: 1 }}
          aria-label={doI18n(
            "pages:uw-client-checks:book_projects",
            i18nRef.current,
          )}
          onClick={() => (window.location.href = `/clients/main/`)}
        >
          <ArrowBack sx={{ mr: 1 }} />
          <Typography variant="body2">
            {doI18n("pages:uw-client-checks:back", i18nRef.current)}
          </Typography>
        </Button>
        <Box>
          {selectedBurrito && (
            <CreateBookProjectScratch
              repoName={selectedBurrito.abbreviation}
              nameBurito={selectedBurrito.name}
              reloadProject={() => fetchData()}
              selectedBurrito={selectedBurrito}
            />
          )}
        </Box>
        {selectedBurrito && (
          <ImportZipProject
            repoName={selectedBurrito.abbreviation}
            nameBurito={selectedBurrito.name}
            reloadProject={() => fetchData()}
          />
        )}
      </Box>
      {burritos ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-start",
            width: "100%",
            px: 2,
            py: 1,
          }}
        ></Box>
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
              i18nRef.current,
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
              i18nRef.current,
            )}
          </Button>
        </Box>
      )}
      {selectedBurrito ? (
        <Box sx={{ display: "contents" }}>
          <Box
            sx={{
              mb: 2,
              px: 2,
            }}
          >
            <Typography variant="h6" fontWeight={600}>
              {selectedBurrito.name}
              {/* {doI18n("pages:uw-client-checks:book", i18nRef.current)} */}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              px: 2,
              flexGrow: 1, // ⬅️ take remaining space
              minHeight: 0, // ⬅️ REQUIRED for flex scrolling
              overflowY: "auto",
            }}
          >
            {books.map((book) => (
              <Accordion
                expanded={openedBooks.has(book.bookCode)}
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
                        <></>
                      ) : (
                        // <Typography color="success.main" fontWeight={600}>
                        //   {doI18n(
                        //     `pages:uw-client-checks:ready`,
                        //     i18nRef.current,
                        //   )}
                        // </Typography>
                        <Typography color="warning.main" fontWeight={600}>
                          {doI18n(
                            `pages:uw-client-checks:need_initalisation`,
                            i18nRef.current,
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
                          setOpenedBooks={setOpenedBooks}
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
                              p2 === book.projectName && t2 === book.tCoreName,
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
                                book.tCoreName,
                              );
                            }
                          }}
                        >
                          {initializing.some(
                            ([p2, t2]) =>
                              p2 === book.projectName && t2 === book.tCoreName,
                          ) ? (
                            <CircularProgress size={18} color="inherit" />
                          ) : (
                            doI18n(
                              "pages:uw-client-checks:to_initialised",
                              i18nRef.current,
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
                      <Box sx={{ gap: 1, display: "flex" }}>
                        {book.hasManifest ? (
                          <>
                            <CheckerSetting
                              repoName={selectedBurrito.abbreviation}
                              tCoreNameProject={book.tCoreName}
                              callBack={() => {
                                setOpenedBooks((prev) => {
                                  const next = new Set(prev);

                                  if (next.has(book.bookCode)) {
                                    next.delete(book.bookCode); // close → remove
                                  } else {
                                    next.add(book.bookCode); // open → add
                                  }

                                  return next;
                                });
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
                            />
                          </>
                        ) : (
                          <></>
                        )}
                        <DeleteDialogueButton
                          repoName={selectedBurrito.abbreviation}
                          tCoreNameProject={book.tCoreName}
                          callBack={() => fetchData()}
                        />
                      </Box>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </Box>
      ) : (
        <></>
      )}
    </Box>
  );
}
