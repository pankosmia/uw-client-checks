import { useContext } from "react";
import { Box } from "@mui/material";

import { postEmptyJson } from "pankosmia-lib/http";
import { netContext, PanDownload, debugContext } from "pankosmia-rcl";

const DownloadRessources = ({}) => {
  const { enabledRef } = useContext(netContext);
  const { debugRef } = useContext(debugContext);

  async function DowloadBurrito(params, remoteRepoPath, postType) {
    let fetchUrl =
      postType === "clone"
        ? `/api/git/clone-repo/${remoteRepoPath}`
        : `/api/git/pull-repo/origin/${remoteRepoPath}`;

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
        "en_ust",
        "en_ult",
        "en_ta",
        "el-x-koine_ugnt",
        "hbo_uhb",
      ],
      uW: ["en_ugl", "en_uhl"],
    },
  };

  const base = ListTc4["git.door43.org"];

  // merge both arrays, then map
  let preSelected = Object.entries(base).flatMap(([key, arr]) =>
    arr.map((e) => `git.door43.org/${key}/${e}`),
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
