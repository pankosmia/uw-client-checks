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
const DeleteDialogueButton = ({
  repoName,
  tCoreNameProject,
  callBack
}) => {
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
            "pages:uw-client-checks:delette_book_project",
            i18nRef.current
          )}
        </Typography>
      </Button>
      {openResourcesDialog && (
        <AppDialog
          open={openResourcesDialog}
          onClose={() => setOpenResourcesDialog(false)}
          maxWidth="md"
          title={doI18n(
            "pages:uw-client-checks:delette_book_project",
            i18nRef.current
          )}
          actions={
            <Button
              variant="contained"
              onClick={() => setOpenResourcesDialog(false)}
            >
              {doI18n("pages:uw-client-checks:close", i18nRef.current)}
            </Button>
          }
        >
          {doI18n("pages:uw-client-checks:delete_book_project_texte", i18nRef.current)}
          <Button
          onClick={() => {deleteBookProject(repoName,tCoreNameProject)
            callBack?.()
            setOpenResourcesDialog(false)
          }}
          color="error"
          >{doI18n(
            "pages:uw-client-checks:delette_book_project",
            i18nRef.current
          )}</Button>
        </AppDialog>
      )}
    </>
  );
};

export default DeleteDialogueButton;
