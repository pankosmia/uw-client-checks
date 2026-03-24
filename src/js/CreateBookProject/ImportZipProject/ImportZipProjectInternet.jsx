import { useState, useContext, useEffect } from "react";
import { doI18n, getJson, postJson } from "pithekos-lib";
import { i18nContext, debugContext } from "pankosmia-rcl";
import { fsGetRust, fsWriteRust } from "../../serverUtils";
import { PanDownload } from "pankosmia-rcl";
import { postEmptyJson } from "pithekos-lib";
import { gitCheckout, gitCreatBranch } from "../../gitUtils";
import { enqueueSnackbar } from "notistack";
import { Button, CircularProgress, Tooltip } from "@mui/material";
const ImportZipProjectInternet = ({
  projectName,
  repoName,
  keysValue,
  setUsedRessources,
  callBack,
}) => {
  const { debugRef } = useContext(debugContext);
  const { i18nRef } = useContext(i18nContext);
  const [dependancyVersion, setDependancyVersion] = useState(null);
  const [listDependancy, setListDependancy] = useState(null);


  const uploadZip = async (keysValue) => {
    let door43_catalog = (
      await getJson("/gitea/remote-repos/qa.door43.org/Door43-Catalog")
    ).json;

    keysValue = keysValue.map((e) => {
      e[0] = e[0].replace("git", "qa");
      if (e[1] === "Door43-Catalog") {
        let catalogRepo = door43_catalog.find((p) => p.name === e[2]);
        if (catalogRepo) {
          if (
            !catalogRepo.topics.some((t) =>
              ["pushing2sb", "tc-ready"].includes(t),
            )
          ) {
            if (catalogRepo.parent_clone_url !== "") {
              e[1] = catalogRepo.parent_clone_url.split("/")[3];
            }
          }
        }
      }
      return e;
    });
    let summary = await getJson("/burrito/metadata/summaries");
    let newKeysValues = [];
    for (let kvi = 0; kvi < keysValue.length; kvi++) {
      let path =
        keysValue[kvi][0] + "/" + keysValue[kvi][1] + "/" + keysValue[kvi][2];
      let version = keysValue[kvi][4].split(".zip")[0];
      if (version === "master") {
        version = "main";
      }
      if (summary.json[path]) {
        let response = await gitCheckout([path, version], i18nRef);
        if (response.ok) {
          setUsedRessources((prev) => {
            let prevE = [...prev];
            prevE.push([
              keysValue[kvi][0] +
                "/" +
                keysValue[kvi][1] +
                "/" +
                keysValue[kvi][2],
              version,
            ]);
            return prevE;
          });
        } else if (response.json === "no branch") {
          let response = gitCreatBranch([path, version], i18nRef, debugRef);
          if (response) {
            let new_branch_zip = "https://" + path + "/sb/" + version + ".zip";
            const downloadResponse = await fetch(new_branch_zip);
            if (!downloadResponse.ok) {
              enqueueSnackbar(
                doI18n(
                  "pages:core-contenthandler_text_translation:could_not_fetch_sb",
                  i18nRef.current,
                ),
                { variant: "warning" },
              );
              throw new Error(
                doI18n(
                  "pages:core-client-rcl:failed_download",
                  i18nRef.current,
                ),
              );
            }
            const zipBlob = await downloadResponse.blob();
            const formData = new FormData();
            formData.append("file", zipBlob);
            let fetchResponse = await fetch("/temp/bytes", {
              method: "POST",
              body: formData,
            });
            if (!fetchResponse.ok) {
              enqueueSnackbar(
                doI18n(
                  "pages:core-contenthandler_text_translation:could_not_upload_sb_version",
                  i18nRef.current,
                ),
                { variant: "warning" },
              );
              throw new Error(
                doI18n(
                  "pages:core-client-rcl:could_not_upload_sb_version",
                  i18nRef.current,
                ),
              );
            }
            const data = await fetchResponse.json();
            const uuid = data.uuid;
            response = await postEmptyJson(
              `/burrito/remake_burrito_from_zip/${uuid}/${path}`,
            );
            if (response.ok) {

              setUsedRessources((prev) => {
                let prevE = [...prev];
                prevE.push([
                  keysValue[kvi][0] +
                    "/" +
                    keysValue[kvi][1] +
                    "/" +
                    keysValue[kvi][2],
                  keysValue[kvi][4],
                ]);
                return prevE;
              });
            } else {
              enqueueSnackbar(
                doI18n(
                  "pages:core-contenthandler_text_translation:could_no_remake_zip_project",
                  i18nRef.current,
                ),
                { variant: "warning" },
              );
              throw new Error(
                doI18n(
                  "pages:core-client-rcl:could_no_remake_zip_project",
                  i18nRef.current,
                ),
              );
            }
          }
        }
      } else {
        newKeysValues.push(keysValue[kvi]);
      }
    }
    let jsonList = {};
    for (let e of newKeysValues) {
      if (!jsonList[e[0]]) {
        jsonList[e[0]] = {};
      }
      if (!jsonList[e[0]][e[1]]) {
        jsonList[e[0]][e[1]] = [];
      }
      if (!jsonList[e[0]][e[1]].includes(e[2])) {
        jsonList[e[0]][e[1]].push(e[2]);
      }
    }

    setListDependancy(jsonList);

    let version_manager = [];
    for (let e of keysValue) {
      version_manager.push([`${e[0]}/${e[1]}/${e[2]}`, e[4].split(".zip")[0]]);
    }
    setDependancyVersion(version_manager);
  };

  useEffect(() => {
    if (keysValue) {
      uploadZip(keysValue);
    }
  }, [keysValue]);

  async function DowloadBurrito(params, remoteRepoPath, postType) {
    console.log(params);
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
    if (postType === "clone") {
      let versionRepo = dependancyVersion.find((e) => params.row.id === e[0]);
      response = gitCreatBranch(versionRepo, i18nRef, debugRef);
      if (response.ok) {
        let new_branch_zip =
          "https://" + versionRepo[0] + "/sb/" + versionRepo[1] + ".zip";
        const downloadResponse = await fetch(new_branch_zip);

        if (!downloadResponse.ok) {
          throw new Error(
            doI18n("pages:core-client-rcl:failed_download", i18nRef.current),
          );
        }

        const zipBlob = await downloadResponse.blob();
        const formData = new FormData();
        formData.append("file", zipBlob);
        let fetchResponse = await fetch("/temp/bytes", {
          method: "POST",
          body: formData,
        });
        if (!fetchResponse.ok) {
          throw new Error(
            doI18n("pages:core-client-rcl:upload_failed", i18nRef.current),
          );
        }
        const data = await fetchResponse.json();
        const uuid = data.uuid;
        response = await postEmptyJson(
          `/burrito/remake_burrito_from_zip/${uuid}/${versionRepo[0]}`,
        );

        const addAndCommitUrl = `/git/add-and-commit/${versionRepo[0]}`;
        const commitJson = JSON.stringify({
          commit_message: `${versionRepo[1]}`,
        });
        const addAndCommitResponse = await postJson(
          addAndCommitUrl,
          commitJson,
          debugRef.current,
        );

        setUsedRessources((prev) => {
          let prevE = [...prev];
          prevE.push([versionRepo[0], versionRepo[1]]);
          return prevE;
        });
      }
    }

    return response;
  }
  useEffect(() => {
    if (listDependancy) {
      if (Object.keys(listDependancy).length > 0) {
        callBack();
      }
    }
  }, [listDependancy]);

  return (
    <>
      {dependancyVersion && listDependancy ? (
        <PanDownload
          downloadedType="org"
          downloadFunction={DowloadBurrito}
          sources={listDependancy}
          sx={{ flex: 1 }}
        />
      ) : (
        <CircularProgress />
      )}
      {/* <Tooltip
        title={
          needDownload.every((v) => v === true)
            ? `missing ressources you can go next but be carefull`
            : "go next"
        }
      > */}
      <Button onClick={callBack}>Next</Button>
      {/* </Tooltip> */}
    </>
  );
};

export default ImportZipProjectInternet;
