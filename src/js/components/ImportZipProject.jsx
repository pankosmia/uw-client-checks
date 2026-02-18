import {
  Button,
  Typography,
  DialogContent,
} from "@mui/material";
import { DriveFolderUpload } from "@mui/icons-material";
import { FilePicker } from "react-file-picker";
import { useState, useContext } from "react";
import { doI18n } from "pithekos-lib";
import { i18nContext, PanDialog, PanDialogActions } from "pankosmia-rcl";

const ImportZipProject = ({ repoName, nameBurito, callBack }) => {
  const [openResourcesDialog, setOpenResourcesDialog] = useState(false);

  const { i18nRef } = useContext(i18nContext);
  const uploadZip = async (file) => {
    const projectName = encodeURIComponent(file.name.split("-")[0]);

    const url = `/burrito/ingredient/zipped/_local_/_local_/${repoName}?ipath=book_projects/${projectName}`;

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });
    callBack();
    if (!response.ok) {
      throw new Error("Upload failed");
    }

    return response.json();
  };
  return (
    <>
      <Button
        variant="outlined"
        sx={{
          marginX: 1,
        }}
        onClick={() => setOpenResourcesDialog(true)}
      >
        <DriveFolderUpload sx={{ mr: 1 }} />

        <Typography variant="body2">
          {doI18n("pages:uw-client-checks:import_book", i18nRef.current)}
        </Typography>
      </Button>
      {openResourcesDialog && (
        <PanDialog
          isOpen={openResourcesDialog}
          closeFn={() => setOpenResourcesDialog(false)}
          size="md"
          titleLabel={`${doI18n(
            "pages:uw-client-checks:import_zip_project",
            i18nRef.current,
          )}  : ${nameBurito}`}
        >
          <DialogContent>
            <FilePicker
              extensions={["zip"]}
              onChange={async (fileObject) => {
                try {
                  const result = await uploadZip(fileObject);
                  setOpenResourcesDialog(false);
                  callBack?.(); // refresh si besoin
                } catch (err) {
                  console.error("Import failed", err);
                }
              }}
              onError={(errMsg) => {
                console.error(errMsg);
              }}
            >
              <Button
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
              >
                {doI18n(
                  "pages:uw-client-checks:import_book",
                  i18nRef.current,
                )}
              </Button>
            </FilePicker>
          </DialogContent>
          <PanDialogActions
            closeFn={() => setOpenResourcesDialog(false)}
            closeLabel={doI18n(
              "pages:uw-client-checks:cancel",
              i18nRef.current,
            )}
            onlyCloseButton={true}
          />
        </PanDialog>
      )}
    </>
  );
};

export default ImportZipProject;
