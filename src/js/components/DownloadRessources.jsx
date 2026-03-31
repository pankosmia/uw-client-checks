import { useState, useContext, useEffect } from "react";
import {Box } from "@mui/material";

import { postEmptyJson } from "pithekos-lib";
import {
  i18nContext,
  netContext,
  PanDownload,
  debugContext,
} from "pankosmia-rcl";

const DownloadRessources = ({}) => {
  const { enabledRef } = useContext(netContext);
  const { debugRef } = useContext(debugContext);




  async function DowloadBurrito(params, remoteRepoPath, postType) {
    const fetchUrl =
      postType === "clone"
        ? `/git/clone-repo/${remoteRepoPath}`
        : `/git/pull-repo/origin/${remoteRepoPath}`;

    return await postEmptyJson(fetchUrl, debugRef.current);
  }

  const ListTc4 = {
    "git.door43.org": {
      unfoldingWord: [
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

  let preSelected = { ...ListTc4 }["git.door43.org"]["uW"].map(
    (e) => "git.door43.org/uW/" + e,
  );
  return (
    <Box>
      {enabledRef.current && (
        <PanDownload
          downloadedType="org"
          downloadFunction={DowloadBurrito}
          sources={ListTc4}
          sx={{ flex: 1 }}
          preSelected={preSelected}
        />
      )}
    </Box>
  );
};

export default DownloadRessources;
