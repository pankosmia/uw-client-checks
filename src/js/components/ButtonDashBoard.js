import { getProgressChecker } from "../checkerUtils";
import { doI18n, i18nContext } from "pithekos-lib";
import { useContext, useEffect, useState } from "react";
import { LinearProgress, Button, Box, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

export const ButtonDashBoard = ({ projectName, tCoreName, openedBooks }) => {
  const navigate = useNavigate();
  const { i18nRef } = useContext(i18nContext);
  const [progressTranslationWords, setProgressTranslationWords] = useState(0);
  const [progressTranslationNotes, setProgressTranslationNotes] = useState(0);
  console.log(openedBooks)
  const tools = ["translationWords", "translationNotes", "wordAligner"];
  const bookCode = tCoreName.split("_")[2];
  console.log(progressTranslationNotes);
  useEffect(() => {
    if (openedBooks.has(bookCode.toUpperCase())) {
      getProgressChecker(
        "translationNotes",
        ["discourse", "figures", "culture", "grammar", "other", "numbers"],
        projectName,
        `book_projects/${tCoreName}`,
        bookCode
      ).then((e) => {
        setProgressTranslationNotes(Number(e) || 0);
      });

      getProgressChecker(
        "translationWords",
        ["name", "kt", "other"],
        projectName,
        `book_projects/${tCoreName}`,
        bookCode
      ).then((e) => {
        setProgressTranslationWords(Number(e) || 0);
      });
    }
  }, [projectName, tCoreName, bookCode, openedBooks]);

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
            disabled={tool === "wordAligner"}
            onClick={() => {
              if (tool === "translationWords") {
                navigate(`/${projectName}/TwChecker/${tCoreName}`);
              }
              if (tool === "translationNotes") {
                navigate(`/${projectName}/TnChecker/${tCoreName}`);
              }
            }}
          >
            {doI18n("pages:common:open", i18nRef.current)}
          </Button>
          {tool === "translationWords" && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                {progressTranslationWords < 1 && progressTranslationWords > 0
                  ? "<1%"
                  : Math.round(progressTranslationWords) + "%"}
              </Typography>

              <LinearProgress
                variant="determinate"
                value={Math.min(100, Math.max(0, progressTranslationWords))}
              />
            </Box>
          )}

          {tool === "translationNotes" && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                {progressTranslationNotes < 1 && progressTranslationNotes > 0
                  ? "<1%"
                  : Math.round(progressTranslationNotes) + "%"}
              </Typography>

              <LinearProgress
                variant="determinate"
                value={Math.min(100, Math.max(0, progressTranslationNotes))}
              />
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
};

export default ButtonDashBoard;
