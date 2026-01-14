import { getBookFromName, getProgressChecker } from "../checkerUtils";
import { useEffect, useState } from "react";
import {
  LinearProgress,
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";
import {Tooltip} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { getProgressAligment } from "../checkerUtils";
import { isOldTestament } from "../creatProject";
import InvalidatedIcon from "../ui_tool_kit/InvalidatedIcon";
import { doI18n, i18nContext } from "pithekos-lib";
import { useContext } from "react";
export const ButtonDashBoard = ({
  projectName,
  tCoreName,
  openedBooks,
  lexiconNameForProgress = "en_ta",
}) => {
  const { i18nRef } = useContext(i18nContext);

  const navigate = useNavigate();
  const [progressTranslationWords, setProgressTranslationWords] =
    useState(null);
  const [progressTranslationNotes, setProgressTranslationNotes] =
    useState(null);
  const [invalidatedTn, setInvalidatedTn] = useState(0);
  const [progressWordAlignment, setProgressWordAlignment] = useState(null);
  const [invalidatedTw, setInvalidatedTw] = useState(0);
  const [numberCategoriesTn,setNumberCategoriesTn] = useState(0)
  const [numberCategoriesTw,setNumberCategoriesTw] = useState(0)

  const tools = ["translationWords", "translationNotes", "wordAlignment"];
  const bookCode = tCoreName.split("_")[2];
  const getInvalidatedCount = (tool) => {
    switch (tool) {
      case "translationNotes":
        return invalidatedTn;
      case "translationWords":
        return invalidatedTw;
      case "wordAlignment":
        return 0;
      default:
        return 0;
    }
  };
  useEffect(() => {
    if (openedBooks.has(bookCode.toUpperCase())) {
      getProgressChecker(
        "translationNotes",
        ["discourse", "figures", "culture", "grammar", "other", "numbers"],
        projectName,
        `book_projects/${tCoreName}`,
        bookCode,
        lexiconNameForProgress
      ).then((e) => {
        setProgressTranslationNotes(e.selection || 0);
        setInvalidatedTn(e.invalidated);
      });

      getProgressChecker(
        "translationWords",
        ["names", "kt", "other"],
        projectName,
        `book_projects/${tCoreName}`,
        bookCode
      ).then((e) => {
        setProgressTranslationWords(e.selection || 0);
        setInvalidatedTw(e.invalidated);
      });
      isOldTestament(tCoreName.split("_")[2])
        ? getBookFromName(
            "hbo_uhb",
            "",
            tCoreName.split("_")[2],
            "original_language",
            "git.door43.org/uW"
          ).then((book) =>
            getProgressAligment(projectName, tCoreName, book).then((r) =>
              setProgressWordAlignment(r)
            )
          )
        : getBookFromName(
            "grc_ugnt",
            "",
            tCoreName.split("_")[2],
            "original_language",
            "git.door43.org/uW"
          ).then((book) =>
            getProgressAligment(projectName, tCoreName, book).then((r) =>
              setProgressWordAlignment(r)
            )
          );
    }
  }, [projectName, tCoreName, bookCode, openedBooks]);

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
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
        gap: 3,
        width: "100%",
      }}
    >
      {tools.map((tool) => (
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

            {getInvalidatedCount(tool) > 0 && (
              <Tooltip
                title={doI18n(
                  "pages:uw-client-checks:invalidate_checks",
                  i18nRef.current
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
    </Box>
  );
};

export default ButtonDashBoard;
