import AppDialog from "./AppDialog";
import {
  FormControl,
  TextField,
  Button,
  Typography,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Box,
  Accordion,
  AccordionDetails,
  AccordionSummary,
} from "@mui/material";
import { deleteBookProject } from "../serverUtils";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useState, useContext } from "react";
import { doI18n, i18nContext } from "pithekos-lib";
const DeleteDialogueButton = ({ repoName, tCoreNameProject, callBack }) => {
  const [openResourcesDialog, setOpenResourcesDialog] = useState(false);

  const { i18nRef } = useContext(i18nContext);

  return (
    <>
      <Button
        color="error"
        sx={{
          height: 36,
          opacity: 1,
          pt: 1.5, // padding-top: 6px
          pr: 2, // padding-right: 16px
          pb: 1.5, // padding-bottom: 6px
          pl: 2, // padding-left: 16px
          borderRadius: 1, // or your theme's borderRadius value
          borderWidth: 1,
          borderStyle: "solid",
          transform: "rotate(0deg)",
          whiteSpace: "nowrap", // ✅ key
        }}
        onClick={() => setOpenResourcesDialog(true)}
      >
        <Typography>
          {doI18n(
            "pages:uw-client-checks:delete_book_project",
            i18nRef.current
          )}
        </Typography>
      </Button>
      {openResourcesDialog && (
        <AppDialog
          open={openResourcesDialog}
          onClose={() => setOpenResourcesDialog(false)}
          maxWidth="md"
          title={`${doI18n(
            "pages:uw-client-checks:delete_book_project",
            i18nRef.current
          )}  : ${tCoreNameProject}`}
          actions={
            <>
              <Button
                color="error"
                sx={{
                  height: 36,
                  pt: 1.5,
                  pr: 2,
                  pb: 1.5,
                  pl: 2,
                  borderRadius: 1,
                  borderWidth: 1,
                  borderStyle: "solid",
                  whiteSpace: "nowrap",
                }}
                onClick={() => {
                  deleteBookProject(repoName, tCoreNameProject);
                  callBack?.();
                  setOpenResourcesDialog(false);
                }}
              >
                {doI18n(
                  "pages:uw-client-checks:delete_book_project",
                  i18nRef.current
                )}
              </Button>
              <Button
                variant="contained"
                onClick={() => setOpenResourcesDialog(false)}
              >
                {doI18n("pages:uw-client-checks:cancel", i18nRef.current)}
              </Button>
            </>
          }
        >
          <Box display="flex" flexDirection="column" gap={3}>
            <Typography>
              {doI18n(
                "pages:uw-client-checks:delete_book_project_texte",
                i18nRef.current
              )}
            </Typography>
          </Box>
        </AppDialog>
      )}
    </>
  );
};

export default DeleteDialogueButton;
