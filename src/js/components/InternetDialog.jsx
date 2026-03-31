import { useState, useContext, useEffect } from "react";
import { Button, Typography, Box, DialogContent } from "@mui/material";

import { doI18n, postEmptyJson } from "pithekos-lib";
import {
  i18nContext,
  netContext,
  PanDownload,
  PanDialog,
  PanDialogActions,
  debugContext,
} from "pankosmia-rcl";

export default function InternetDialog({ callBack }) {
  const { i18nRef } = useContext(i18nContext);
  const { enabledRef } = useContext(netContext);
  const { debugRef } = useContext(debugContext);
  const [internetDialogOpen, setInternetDialogOpen] = useState(false);
  useEffect(() => {
    if (!enabledRef.current) {
      setInternetDialogOpen(true);
    } else {
      if (callBack) {
        callBack();
      }
    }
  }, []);

  const handleCloseDialog = () => {
    if (enabledRef.current) {
      setInternetDialogOpen(false);
      if (callBack) {
        callBack();
      }
    }
  };

  const enableInternet = () => {
    postEmptyJson("/net/enable", true);
    setInternetDialogOpen(false);
    if (callBack) {
      callBack();
    }
  };
  return (
    <PanDialog
      titleLabel={doI18n(
        "pages:uw-client-checks:tCore_resources",
        i18nRef.current,
      )}
      isOpen={internetDialogOpen}
      closeFn={handleCloseDialog}
      fullWidth={true}
      size="sm"
    >
      <DialogContent>
        <Typography>
          {doI18n("pages:uw-client-checks:internet_question", i18nRef.current)}
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
  );
}
