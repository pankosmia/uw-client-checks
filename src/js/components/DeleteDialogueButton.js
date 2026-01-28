import { Button, Typography, Box, DialogContent } from "@mui/material";
import { deleteBookProject } from "../serverUtils";
import { useState, useContext } from "react";
import { doI18n } from "pithekos-lib";
import { i18nContext, PanDialog, PanDialogActions } from "pankosmia-rcl";
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
            i18nRef.current,
          )}
        </Typography>
      </Button>
      {openResourcesDialog && (
        <PanDialog
          isOpen={openResourcesDialog}
          closeFn={() => setOpenResourcesDialog(false)}
          size="md"
          titleLabel={`${doI18n(
            "pages:uw-client-checks:delete_book_project",
            i18nRef.current,
          )}  - ${tCoreNameProject.split('_')[2].toUpperCase()}`}
        >
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={3}>
              <Typography>
                {doI18n(
                  "pages:uw-client-checks:delete_book_project_texte",
                  i18nRef.current,
                )}
              </Typography>
            </Box>
          </DialogContent>
          <PanDialogActions
            closeFn={() => setOpenResourcesDialog(false)}
            closeLabel={doI18n(
              "pages:uw-client-checks:cancel",
              i18nRef.current,
            )}
            onlyCloseButton={false}
            actionFn={() => {
              deleteBookProject(repoName, tCoreNameProject);
              callBack?.();
              setOpenResourcesDialog(false);
            }}
            actionLabel={doI18n(
              "pages:uw-client-checks:delete_book_project",
              i18nRef.current,
            )}
          />
        </PanDialog>
      )}
    </>
  );
};

export default DeleteDialogueButton;
