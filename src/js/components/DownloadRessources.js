import { useState, useContext, useEffect } from "react";
import { Button, Typography, Box, DialogContent } from "@mui/material";

import { doI18n, postEmptyJson } from "pithekos-lib";
import {
  i18nContext,
  netContext,
  PanDownload,
  PanDialog,
  PanDialogActions,
} from "pankosmia-rcl";

const DownloadRessources = ({
  downloadRessourcesDialogueOpen,
  setDownloadRessourcesDialogueOpen,
  setOpenResourcesDialog,
}) => {
  const { i18nRef } = useContext(i18nContext);
  const { enabledRef } = useContext(netContext);

  const [internetDialogOpen, setInternetDialogOpen] = useState(false);

  useEffect(() => {
    if (downloadRessourcesDialogueOpen) {
      if (!enabledRef.current) {
        setInternetDialogOpen(true);
      }
    }
  }, [downloadRessourcesDialogueOpen]);

  const handleCloseDialog = () => {
    setInternetDialogOpen(false);
    setDownloadRessourcesDialogueOpen(false);
    setOpenResourcesDialog(false);
  };

  const enableInternet = () => {
    postEmptyJson("/net/enable", true);
    setDownloadRessourcesDialogueOpen(true);
    setInternetDialogOpen(false);
  };

  const ListTc4 = {
    "git.door43.org": {
      uW: [
        "en_tn",
        "en_tw",
        "en_ugl",
        "grc_ugnt",
        "hbo_uhb",
        "en_ust",
        "en_ult",
        "en_ta",
        "en_uhl",
      ],
    },
  };

  return (
    <Box>
      <PanDialog
        titleLabel={doI18n(
          "pages:uw-client-checks:tCore_resources",
          i18nRef.current,
        )}
        isOpen={internetDialogOpen}
        closeFn={handleCloseDialog}
        fullWidth={true}
        size="md"
      >
        <DialogContent>
          <Typography>
            {doI18n(
              "pages:uw-client-checks:internet_question",
              i18nRef.current,
            )}
          </Typography>
        </DialogContent>
        <PanDialogActions
          closeFn={handleCloseDialog}
          closeOnAction={false}
          closeLabel={doI18n("pages:uw-client-checks:close", i18nRef.current)}
          actionFn={!enabledRef.current ? enableInternet : null}
          actionLabel={
            !enabledRef.current
              ? doI18n("pages:uw-client-checks:yes", i18nRef.current)
              : null
          }
        />
      </PanDialog>
      <PanDialog
        titleLabel={doI18n(
          "pages:uw-client-checks:tCore_resources",
          i18nRef.current,
        )}
        isOpen={downloadRessourcesDialogueOpen}
        closeFn={handleCloseDialog}
        fullWidth={true}
        size="md"
      >
        <DialogContent>
          {enabledRef.current && <PanDownload sources={ListTc4} />}
        </DialogContent>
        <PanDialogActions
          onlyCloseButton={true}
          closeFn={handleCloseDialog}
          closeLabel={doI18n("pages:uw-client-checks:close", i18nRef.current)}
        />
      </PanDialog>
    </Box>
  );
};

export default DownloadRessources;
