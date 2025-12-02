import { getProgressChecker } from "../checkerUtils";
import { doI18n, i18nContext } from "pithekos-lib";
import { useContext, useEffect, useState } from "react";
import {
  LinearProgress,
  Button,
  Box,
  Collapse,
  IconButton,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useNavigate } from "react-router-dom";

export const ButtonDashBoard = ({ projectName, tCoreName }) => {
  const navigate = useNavigate();
  const { i18nRef } = useContext(i18nContext);
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState(false);

  const tools = ["tanslationWords", "translationNotes", "wordAligner"];

  useEffect(() => {
    let mounted = true;

    getProgressChecker(
      "translationWords",
      ["name", "kt", "other"],
      projectName,
      `book_projects/${tCoreName}`,
      tCoreName.split("_")[2]
    ).then((e) => {
      if (mounted) setProgress(Number(e) || 0);
    });

    return () => {
      mounted = false;
    };
  }, [projectName, tCoreName]);

  return (
    <Box sx={{ width: "100%" }}>
      {/* Toggle button */}
      <Button
        variant="outlined"
        fullWidth
        onClick={() => setOpen((prev) => !prev)}
        endIcon={
          <ExpandMoreIcon
            sx={{
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "0.2s",
            }}
          />
        }
      >
        {open ? "Hide tools" : "Open tools"}
      </Button>

      {/* Collapsible content */}
      <Collapse in={open} timeout="auto" unmountOnExit>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 3,
            padding: 2,
          }}
        >
          {tools.map((data, idx) => (
            <Box key={idx}>
              <Typography fontWeight={600} sx={{ mb: 1 }}>
                {data}
              </Typography>

              <Button
                variant="contained"
                fullWidth
                disabled={data === "wordAligner"}
                onClick={() => {
                  if (data === "tanslationWords") {
                    navigate(`/${projectName}/TwChecker/${tCoreName}`);
                  } else if (data === "translationNotes") {
                    navigate(`/${projectName}/TnChecker/${tCoreName}`);
                  }
                }}
              >
                Open
              </Button>

              <Box sx={{ mt: 1 }}>
                <Typography variant="body2">
                  {progress < 1 && progress > 0
                    ? "<1%"
                    : Math.round(progress) + "%"}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, Math.max(0, progress))}
                />
              </Box>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
};

export default ButtonDashBoard;
