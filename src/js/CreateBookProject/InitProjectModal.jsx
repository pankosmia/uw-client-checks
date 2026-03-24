import { Button, Typography, DialogContent,Box } from "@mui/material";
import { DriveFolderUpload } from "@mui/icons-material";
import { FilePicker } from "react-file-picker";
import { useState, useContext, useEffect } from "react";
import { doI18n } from "pithekos-lib";
import {
  i18nContext,
  PanDialog,
  PanDialogActions,
  debugContext,
} from "pankosmia-rcl";
import { fsGetRust, fsWriteRust } from "../serverUtils";
import { PanDownload } from "pankosmia-rcl";
import { postEmptyJson } from "pithekos-lib";
import ImportZipProject from "./ImportZipProject/ImportZipProjectInternet";

export default function InitProjectModal({ repoName, nameBurito,callBack }) {
  const [openInitDialog, setOpenInitDialog] = useState(false);
  const { i18nRef } = useContext(i18nContext);

  useEffect(() => {
    async function isEmpty() {
      let isEmpty = await fsGetRust(repoName, nameBurito);
      setOpenInitDialog(isEmpty.length < 1);
    }
    isEmpty();
  });

  return (
    <PanDialog
      isOpen={false}
      loseFn={() => setOpenInitDialog(false)}
      size="md"
      titleLabel={`${doI18n(
        "pages:uw-client-checks:init_tc_project",
        i18nRef.current,
      )}`}
    >
      <DialogContent>
        <Box>
        <ImportZipProject
        repoName={repoName}
         nameBurito={nameBurito}
         callBack={callBack}
        ></ImportZipProject>
        </Box>

      </DialogContent>
    </PanDialog>
  );
}
