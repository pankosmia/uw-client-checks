import { getProgressChecker } from "../checkerUtils";
import { doI18n, i18nContext } from "pithekos-lib";
import { useContext, useEffect, useState } from "react";
import {
  LinearProgress,
  Button,
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

export const ButtonDashBoard = ({ projectName, tCoreName, openedBooks }) => {
  const navigate = useNavigate();
  const { i18nRef } = useContext(i18nContext);
  const [progressTranslationWords, setProgressTranslationWords] =
    useState(null);
  const [progressTranslationNotes, setProgressTranslationNotes] =
    useState(null);

  const tools = ["translationWords", "translationNotes", "wordAligner"];
  const bookCode = tCoreName.split("_")[2];

  useEffect(() => {
    if (openedBooks.has(bookCode.toUpperCase())) {
      getProgressChecker(
        "translationNotes",
        ["discourse", "figures", "culture", "grammar", "other", "numbers"],
        projectName,
        `book_projects/${tCoreName}`,
        bookCode
      ).then((e) => setProgressTranslationNotes(Number(e) || 0));

      getProgressChecker(
        "translationWords",
        ["name", "kt", "other"],
        projectName,
        `book_projects/${tCoreName}`,
        bookCode
      ).then((e) => setProgressTranslationWords(Number(e) || 0));
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
          }}
        >
          <Typography fontWeight={600} sx={{ mb: 1 }}>
            {tool}
          </Typography>

          <Button
            variant="contained"
            fullWidth
            // disabled={tool === "wordAligner"}
            onClick={() => {
              navigate(`/${projectName}/ToolWrapper/${tCoreName}`, {
                state: { toolName: tool === "wordAligner"?"wordAlignment" :tool },
              });
            }}
          >
            {doI18n("pages:uw-client-checks:open", i18nRef.current)}
          </Button>

          {tool === "translationWords" &&
            renderProgress(progressTranslationWords)}
          {tool === "translationNotes" &&
            renderProgress(progressTranslationNotes)}
        </Box>
      ))}
    </Box>
  );
};

export default ButtonDashBoard;
