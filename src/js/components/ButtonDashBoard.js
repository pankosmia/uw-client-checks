import { getProgressChecker } from "../checkerUtils";
import { doI18n, i18nContext } from "pithekos-lib";
import { useContext, useEffect, useState } from "react";
import { LinearProgress, Button, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
export const ButtonDashBoard = ({ projectName, tCoreName }) => {
  const navigate = useNavigate();
  const { i18nRef } = useContext(i18nContext);
  const [progress, setProgress] = useState(0);
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
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 3, // spacing between columns
        padding: 2,
      }}
    >
      {tools.map((data, idx) => (
        <Box key={idx}>
          <div>{data}</div>
          <Button
            variant="contained"
            disabled={data === 'wordAligner'}
            onClick={() => {
              if (data === "tanslationWords") {
                return navigate(`/${projectName}/TwChecker/${tCoreName}`);
              } else if (data === "translationNotes") {
                return navigate(`/${projectName}/TnChecker/${tCoreName}`);
              }
            }}
          >
            {data}
            {/* {doI18n("pages:uw-client-checks:translationWords", i18nRef.current)} */}
          </Button>

          <div style={{ marginTop: 8 }}>
            <div>{progress}%</div>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, Math.max(0, progress))}
            />
          </div>
        </Box>
      ))}
    </Box>
  );
};

export default ButtonDashBoard;
