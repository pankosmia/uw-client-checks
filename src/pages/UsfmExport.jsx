import { useContext, useState, useEffect } from "react";
import {
  Box,
  DialogContent,
  DialogContentText,
  List,
  ListItem,
  ListItemText,
  Typography,
  ListItemButton,
} from "@mui/material";
import { getText, doI18n, getJson } from "pithekos-lib";
import { debugContext, i18nContext, Header } from "pankosmia-rcl";
import { usfmToJSON } from "usfm-js/lib/js/usfmToJson";
import { addAlignmentsToTargetVerseUsingMerge } from "../wordAligner/utils/alignmentHelpers";
import { enqueueSnackbar } from "notistack";
import { saveAs } from "file-saver";
import { PanDialog, PanDialogActions } from "pankosmia-rcl";
import { getBookFromName } from "../js/checkerUtils";
import { loadAlignment } from "../js/checkerUtils";
import { usfmVerseToJson } from "../wordAligner/utils/usfmHelpers";
import { verifyIsValidUsfmFile } from "../js/creatProject";
import { jsonToUSFM } from "usfm-js/lib/js/jsonToUsfm";
import { fsWriteRust, fsGetRust } from "../js/serverUtils";
async function getUsfmFromBible(projectName, repoPath, bookCode) {
  const tCoreName = (
    await fsGetRust(projectName, "book_projects", repoPath)
  ).find((e) => e.includes(bookCode.toLowerCase()));

  const usfmData = await verifyIsValidUsfmFile(
    projectName,
    `book_projects/${tCoreName}/`,
  );
  let jsonBook = usfmToJSON(usfmData);
  let targetBible = await getBookFromName(
    projectName,
    `book_projects/${tCoreName}`,
    tCoreName.split("_")[2],
    "target_language",
    "_local_/_local_",
    true,
  );
  let rest = await loadAlignment(projectName, tCoreName);

  for (let c of Object.keys(rest)) {
    for (let v of Object.keys(rest[c])) {
      let usfmResponce = usfmVerseToJson(
        addAlignmentsToTargetVerseUsingMerge(targetBible[c][v], rest[c][v]),
      );
      if (usfmResponce) {
        if (!jsonBook.chapters[c]) {
          jsonBook.chapters[c] = {};
        }
        if (!jsonBook.chapters[c][v]) {
          jsonBook.chapters[c][v] = {};
        }
        if (!jsonBook.chapters[c][v].verseObjects) {
          jsonBook.chapters[c][v].verseObjects = {};
        }
        jsonBook.chapters[c][v].verseObjects = usfmResponce;
      }
    }
  }
  let finalUsfm = jsonToUSFM(jsonBook);

  await fsWriteRust(
    projectName,
    `book_projects/${tCoreName}/${tCoreName.split("_")[2]}.usfm`,
    finalUsfm,
  );
  let blob = new Blob([finalUsfm], {
    type: "text/plain;charset=utf-8",
  });
  saveAs(blob, `${tCoreName.split("_")[2]}.usfm`);
  return finalUsfm;
}

function UsfmExport() {
  const { i18nRef } = useContext(i18nContext);
  const { debugRef } = useContext(debugContext);
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [bookCodes, setBookCodes] = useState([]);
  const [bookNames, setBookNames] = useState([]);
  const [open, setOpen] = useState(true);

  const [repoName, setRepoName] = useState(null);
  const [repoPath, setRepoPath] = useState(null);

  const getProjectLocation = async () => {
    const hash = window.location.hash;
    const query = hash.includes("?") ? hash.split("?")[1] : "";
    const params = new URLSearchParams(query);
    const paths = params.get("repoPath").split("/");
    setRepoPath(paths[0] + "/" + paths[1]);
    setRepoName(paths[2]);
  };
  const getProjectSummary = async () => {

    let booksProjectsList = await fsGetRust(
      repoName,
      "book_projects",
      repoPath,
    );

    const books = [
      ...new Set(booksProjectsList.map((e) => e.split("_")[2].toUpperCase())),
    ];
    setBookNames(books);
  };
  useEffect(() => {
    getProjectLocation();
  }, []);

  useEffect(() => {
    if (repoName && repoPath) {
      getProjectSummary();
    }
  }, [repoName, repoPath]);

  const handleToggle = (item) => {
    setSelectedBooks((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
    );
  };

  const handleClose = () => {
    setOpen(false);
    return (window.location.href = "/clients/content");
  };

  const handleCloseCreate = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    window.location.href = "/clients/content";
  };
  useEffect(() => {
    const doFetch = async () => {
      const versificationResponse = await getJson(
        "/content-utils/versification/eng",
        debugRef.current,
      );
      if (versificationResponse.ok) {
        setBookCodes(Object.keys(versificationResponse.json.maxVerses));
      }
    };
    if (bookCodes.length === 0) {
      doFetch().then();
    }
  }, []);

  return (
    <Box>
      <Box
        sx={{
          position: "absolute",
          width: "100%",
          height: "100%",
          backgroundSize: "cover",
          backgroundPosition: "center",
          zIndex: -1,
          backgroundImage:
            'url("/app-resources/pages/content/background_blur.png")',
          backgroundRepeat: "no-repeat",
          backdropFilter: "blur(3px)",
        }}
      />
      <PanDialog
        titleLabel={doI18n(
          "pages:core-contenthandler_text_translation:export_as_usfm",
          i18nRef.current,
        )}
        closeFn={() => handleClose()}
        isOpen={open}
        fullWidth={false}
      >
        <DialogContent sx={{ mt: 1 }} style={{ overflow: "hidden" }}>
          <Box sx={{ maxHeight: "269px" }}>
            <DialogContentText>
              <Typography>
                {doI18n(
                  "pages:core-contenthandler_text_translation:pick_one_or_more_books_export",
                  i18nRef.current,
                )}
              </Typography>
              {selectedBooks.length > 0 && (
                <Typography sx={{ ml: 2 }}>
                  <em>
                    {`${selectedBooks.length}/${bookNames.length} ${doI18n("pages:content:books_selected", i18nRef.current)}`}
                  </em>
                </Typography>
              )}
            </DialogContentText>
            <List dense style={{ maxHeight: 300, overflowY: "auto" }}>
              {bookCodes
                .filter((item) => bookNames.includes(item))
                .map((bookName) => (
                  <ListItemButton
                    selected={selectedBooks.includes(bookName)}
                    key={bookName}
                    button
                    onClick={() => handleToggle(bookName)}
                  >
                    <ListItemText
                      primary={
                        `${bookName} - ` +
                        doI18n(`scripture:books:${bookName}`, i18nRef.current)
                      }
                    />
                  </ListItemButton>
                ))}
            </List>
          </Box>
        </DialogContent>
        <PanDialogActions
          closeOnAction={false}
          closeFn={() => {
            setSelectedBooks([]);
            handleClose();
          }}
          closeLabel={doI18n("pages:content:cancel", i18nRef.current)}
          actionFn={async () => {
            if (!selectedBooks || selectedBooks.length === 0) {
              enqueueSnackbar(
                doI18n(
                  "pages:core-contenthandler_text_translation:no_books_selected",
                  i18nRef.current,
                ),
                { variant: "error" },
              );
            } else {
              for (let b of selectedBooks) {
                await getUsfmFromBible(repoName, repoPath, b);
              }
            }
            handleCloseCreate();
          }}
          actionLabel={doI18n(
            "pages:core-contenthandler_text_translation:export_label",
            i18nRef.current,
          )}
          isDisabled={selectedBooks.length === 0}
        />
      </PanDialog>
    </Box>
  );
}

export default UsfmExport;
