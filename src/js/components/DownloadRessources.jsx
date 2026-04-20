import { useState, useContext, useEffect } from "react";
import { Box } from "@mui/material";

import { postEmptyJson, doI18n, postJson } from "pithekos-lib";
import {
  i18nContext,
  netContext,
  PanDownload,
  debugContext,
} from "pankosmia-rcl";
import { gitCreatBranch } from "../gitUtils";

const DownloadRessources = ({}) => {
  const { i18nRef } = useContext(i18nContext);
  const { enabledRef } = useContext(netContext);
  const { debugRef } = useContext(debugContext);

  async function DowloadBurrito(params, remoteRepoPath, postType) {
    let fetchUrl =
      postType === "clone"
        ? `/git/clone-repo/${remoteRepoPath}`
        : `/git/pull-repo/origin/${remoteRepoPath}`;

    if (
      params.row.topics.some((topic) =>
        ["pushing2sb", "tc-ready"].includes(topic),
      )
    ) {
      if (postType === "clone") fetchUrl += "?branch=main";
    }

    let response = await postEmptyJson(fetchUrl, debugRef.current);

    return response;
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

  let preSelected = { ...ListTc4 }["git.door43.org"]["unfoldingWord"].map(
    (e) => "git.door43.org/unfoldingWord/" + e,
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
