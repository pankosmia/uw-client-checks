import {
  getBookFromName,
  getProgressChecker,
  getSelectedChecksCategories,
} from "../checkerUtils";
import { useEffect, useState } from "react";
import {
  LinearProgress,
  Box,
  Typography,
  CircularProgress,
  DialogContent,
  Button,
} from "@mui/material";
import { Tooltip } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { getProgressAligment } from "../checkerUtils";
import { isOldTestament } from "../creatProject";
import InvalidatedIcon from "../ui_tool_kit/InvalidatedIcon";
import { doI18n, getJson } from "pithekos-lib";
import { i18nContext } from "pankosmia-rcl";
import { useContext } from "react";
import { PanDialog, PanDialogActions } from "pankosmia-rcl";
import RessourcesPicker from "../CreateBookProject/RessourcesPicker";
import {
  write_version_manager,
  checkKeysVersion,
} from "../CreateBookProject/ImportZipProject/ImportZipProject";
import { enqueueSnackbar } from "notistack";
import { fsExistsRust, fsGetRust } from "../serverUtils";

export const ButtonDashBoard = ({
  projectName,
  tCoreName,
  openedBooks,
  setOpenedBooks,
  missingRessourcesCheckBook,
  callBack,
}) => {
  const { i18nRef } = useContext(i18nContext);
  const navigate = useNavigate();
  const [progressTranslationWords, setProgressTranslationWords] =
    useState(null);
  const [progressTranslationNotes, setProgressTranslationNotes] =
    useState(null);
  const [progressWordAlignment, setProgressWordAlignment] = useState(null);

  const [invalidatedTn, setInvalidatedTn] = useState(0);
  const [invalidatedTw, setInvalidatedTw] = useState(0);
  const [invalidatedAlignment, setInvalidatedAlignment] = useState(0);

  const [numberCategoriesTn, setNumberCategoriesTn] = useState([]);
  const [numberCategoriesTw, setNumberCategoriesTw] = useState([]);

  const [ressourcesToFetch, setRessourcesToFetch] = useState(null);
  const [needRessourcesForVersionManager, setNeedRessourcesForVersionManager] =
    useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [finalVersionManager, setFinalVersionManager] = useState({});
  const [oldVersionManager, setOldVersionManager] = useState({});
  function handleCloseModal() {
    if (!needRessourcesForVersionManager) {
      setOpenModal(false);
    } else {
      // setOpenedBooks((prev) => {
      //   let newS = new Set(prev);
      //   newS.delete(tCoreName.split("_")[2].toUpperCase());
      //   return newS;
      // });
      setOpenModal(false);
    }
  }
  useEffect(() => {
    async function getRessources() {
      if (!(missingRessourcesCheckBook === "null")) {
        if (missingRessourcesCheckBook.length < 1) {
          let existVM = await fsExistsRust(
            projectName,
            `book_projects/${tCoreName}/version_manager.json`,
          );
          if (existVM) {
            let response = await fsGetRust(
              projectName,
              `book_projects/${tCoreName}/version_manager.json`,
            );
            if (checkKeysVersion(response)) {
              setRessourcesToFetch(response);
              return;
            } else {
              setOldVersionManager(response);
              setNeedRessourcesForVersionManager(true);
              return;
            }
          } else {
            setNeedRessourcesForVersionManager(true);
            return;
          }
        } else {
          let response = await fsGetRust(
            projectName,
            `book_projects/${tCoreName}/version_manager.json`,
          );
          let keysToRemove = { ...response };
          Object.entries(response).forEach((k, v) => {
            let keyToRemoved = missingRessourcesCheckBook.find(
              (e) => e[0] === v[0],
            );
            if (keyToRemoved) {
              keysToRemove.delete(k);
            }
          });
          setOldVersionManager(keysToRemove);
          setNeedRessourcesForVersionManager(true);
          return;
        }
      }
      setNeedRessourcesForVersionManager(true);
      return;
    }
    getRessources();
  }, [missingRessourcesCheckBook]);

  async function getCategories() {
    let categories = await getSelectedChecksCategories(
      projectName,
      "book_projects/" + tCoreName,
    );
    if (categories) {
      let maxtn = 0;
      let maxtw = 0;
      let numbertn = 0;
      let numbertw = 0;
      for (let [values, entries] of Object.entries(
        categories["translationWords"],
      )) {
        if (entries) {
          numbertw += 1;
        }
        maxtw += 1;
      }
      for (let [values, entries] of Object.entries(
        categories["translationNotes"],
      )) {
        for (let [v2, e2] of Object.entries(entries)) {
          if (e2) {
            numbertn += 1;
          }
          maxtn += 1;
        }
      }

      setNumberCategoriesTn([numbertn, maxtn]);
      setNumberCategoriesTw([numbertw, maxtw]);
    }
  }

  const tools = ["translationWords", "translationNotes", "wordAlignment"];
  const bookCode = tCoreName.split("_")[2];

  const getNumberCategories = (tool) => {
    switch (tool) {
      case "translationNotes":
        if (numberCategoriesTn.length > 0) {
          return (
            doI18n("pages:uw-client-checks:categories", i18nRef.current) +
            " " +
            numberCategoriesTn[0] +
            "/" +
            numberCategoriesTn[1]
          );
        } else {
          return "";
        }
      case "translationWords":
        if (numberCategoriesTw.length > 0) {
          return (
            doI18n("pages:uw-client-checks:categories", i18nRef.current) +
            " " +
            numberCategoriesTw[0] +
            "/" +
            numberCategoriesTw[1]
          );
        } else {
          return "";
        }
      case "wordAlignment":
        return "";
      default:
        return 0;
    }
  };

  const getInvalidatedCount = (tool) => {
    switch (tool) {
      case "translationNotes":
        return invalidatedTn;
      case "translationWords":
        return invalidatedTw;
      case "wordAlignment":
        return invalidatedAlignment;
      default:
        return 0;
    }
  };
  useEffect(() => {
    if (!ressourcesToFetch) {
      if (openedBooks.has(bookCode.toUpperCase())) {
        if (needRessourcesForVersionManager) {
          return;
        }
      }
      return;
    } else if (openedBooks.has(bookCode.toUpperCase())) {
      if (needRessourcesForVersionManager) {
        return;
      }

      getProgressChecker(
        "translationNotes",
        ["discourse", "figures", "culture", "grammar", "other", "numbers"],
        projectName,
        `book_projects/${tCoreName}`,
        bookCode,
        ressourcesToFetch["peripheral/x-peripheralArticles"],
      ).then((e) => {
        setProgressTranslationNotes(e.selection || 0);
        setInvalidatedTn(e.invalidated);
      });

      getProgressChecker(
        "translationWords",
        ["names", "kt", "other"],
        projectName,
        `book_projects/${tCoreName}`,
        bookCode,
      ).then((e) => {
        setProgressTranslationWords(e.selection || 0);
        setInvalidatedTw(e.invalidated);
      });
      getBookFromName(
        ressourcesToFetch["scripture/textTranslation"][0].split("/")[2],
        "",
        tCoreName.split("_")[2],
        "original_language",
        ressourcesToFetch["scripture/textTranslation"][0]
          .split("/")
          .slice(0, 2)
          .join("/"),
      ).then((book) =>
        getProgressAligment(projectName, tCoreName, book).then((r) => {
          setProgressWordAlignment(r.selection || 0);
          setInvalidatedAlignment(r.invalidated);
        }),
      );
      getCategories();
    }
  }, [
    projectName,
    tCoreName,
    bookCode,
    openedBooks,
    ressourcesToFetch,
    needRessourcesForVersionManager,
  ]);

  const renderProgress = (progress) => {
    return progress === null ? (
      <Box
        sx={{
          mt: 2,
          height: 32, // reserve space for progress + percentage
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress size={23} />
      </Box>
    ) : (
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          {progress < 1 && progress > 0 ? "<1%" : Math.round(progress) + "%"}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={Math.min(100, Math.max(0, progress))}
        />
      </Box>
    );
  };

  return (
    <Box
      sx={
        needRessourcesForVersionManager
          ? { width: "100%", justifyContent: "center" }
          : {
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
              gap: 3,
              width: "100%",
            }
      }
    >
      {!needRessourcesForVersionManager &&
        tools.map((tool) => (
          <Box
            key={tool}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              p: 2,
              cursor: "pointer",

              // 👇 hover styles
              transition: "background-color 0.2s ease, box-shadow 0.2s ease",
              "&:hover": {
                backgroundColor: "action.hover",
                boxShadow: 3,
              },
            }}
            onClick={() => {
              navigate(`/${projectName}/ToolWrapper/${tCoreName}`, {
                state: {
                  toolName: tool === "wordAlignment" ? "wordAlignment" : tool,
                },
              });
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 1,
              }}
            >
              <Typography fontWeight={600}>{tool}</Typography>
              <Typography>{getNumberCategories(tool)}</Typography>
              {getInvalidatedCount(tool) > 0 && (
                <Tooltip
                  title={doI18n(
                    "pages:uw-client-checks:invalidate_checks",
                    i18nRef.current,
                  )}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Typography variant="body2">
                      {getInvalidatedCount(tool)}
                    </Typography>
                    <InvalidatedIcon />
                  </Box>
                </Tooltip>
              )}
            </Box>
            {tool === "translationWords" &&
              renderProgress(progressTranslationWords)}
            {tool === "translationNotes" &&
              renderProgress(progressTranslationNotes)}
            {tool === "wordAlignment" && renderProgress(progressWordAlignment)}
          </Box>
        ))}
      {needRessourcesForVersionManager && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2, // spacing between elements
          }}
        >
          <Typography>
            {doI18n(
              "pages:uw-client-checks:missing_ressources_manager",
              i18nRef.current,
            )}
          </Typography>

          <Button variant="outlined" onClick={() => setOpenModal(true)}>
            <Typography>
              {doI18n(
                "pages:uw-client-checks:config_ressources",
                i18nRef.current,
              )}
            </Typography>
          </Button>
        </Box>
      )}
      {openModal && (
        <PanDialog
          isOpen={openModal}
          closeFn={handleCloseModal}
          titleLabel={doI18n(
            "pages:uw-client-checks:add_version_manager",
            i18nRef.current,
          )}
        >
          <DialogContent>
            <RessourcesPicker
              book={tCoreName.split("_")[2]}
              listPreSelected={oldVersionManager}
              setFinalVersionManager={setFinalVersionManager}
            />
          </DialogContent>
          <PanDialogActions
            closeFn={handleCloseModal}
            closeLabel={doI18n("pages:uw-client-checks:close", i18nRef.current)}
            actionLabel={doI18n(
              "pages:uw-client-checks:write_version",
              i18nRef.current,
            )}
            actionFn={async () => {
              if (checkKeysVersion(finalVersionManager)) {
                await write_version_manager(
                  finalVersionManager,
                  projectName,
                  tCoreName,
                );
                setNeedRessourcesForVersionManager(false);
                setOpenModal(false);
                callBack();
              } else {
                enqueueSnackbar(
                  `${doI18n(
                    "pages:uw-client-checks:missing_ressources",
                    i18nRef.current,
                  )}`,
                  { variant: "error" },
                );
              }
            }}
          />
        </PanDialog>
      )}
    </Box>
  );
};

export default ButtonDashBoard;
