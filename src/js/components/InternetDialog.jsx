import { useState, useContext, useEffect } from "react";
import { Typography, DialogContent } from "@mui/material";

import { postEmptyJson } from "pankosmia-lib/http";
import { doI18n } from "pankosmia-lib/i18n";
import {
  i18nContext,
  netContext,
  PanDialog,
  PanDialogActions,
} from "pankosmia-rcl";

export default function InternetDialog({ callBack }) {
  const { i18nRef } = useContext(i18nContext);
  const { enabledRef } = useContext(netContext);
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
    postEmptyJson("/api/net/enable", true);
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
