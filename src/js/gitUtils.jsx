import { getJson, postJson, doI18n, postEmptyJson } from "pithekos-lib";
import { enqueueSnackbar } from "notistack";

export async function gitCheckout(pathVersion, i18nRef) {
  let branches = await getJson("/git/branches/" + pathVersion[0]);
  let ourBranch = branches.json.payload.branches.find(
    (e) => e.name === pathVersion[1],
  );
  let responce = { ok: false, json: "no branch" };
  if (ourBranch) {
    responce = { ok: true, json: "already on right branch" };
    if (!ourBranch.is_head) {
      responce = await postJson(
        `/git/branch/${pathVersion[1]}/${pathVersion[0]}`,
      );
      if (responce.ok) {
        enqueueSnackbar(
          `${doI18n(
            "pages:uw-client-checks:change_branch",
            i18nRef.current,
          )} : ${pathVersion[0]} ${pathVersion[1]}`,
          { variant: "success" },
        );
      } else {
        enqueueSnackbar(
          `${doI18n(
            "pages:uw-client-checks:could_not_change_branch",
            i18nRef.current,
          )} : ${pathVersion[0]} ${pathVersion[1]}`,

          { variant: "error" },
        );
        throw new Error(
          `${doI18n(
            "pages:uw-client-checks:could_not_change_branch",
            i18nRef.current,
          )}`,
        );
      }
    }
  }
  return responce;
}

export async function gitCreatBranch(pathVersion, i18nRef, debugRef) {
  let branch_url = `/git/new-branch/${pathVersion[1]}/${pathVersion[0]}`;
  let response = await postEmptyJson(branch_url, debugRef.current);
  if (response.ok) {
    enqueueSnackbar(
      `${doI18n(
        "pages:uw-client-checks:branche_created",
        i18nRef.current,
      )} : ${pathVersion[0]} ${pathVersion[1]}`,
      { variant: "success" },
    );
  } else {
    enqueueSnackbar(
      `${doI18n(
        "pages:uw-client-checks:could_not_create_branch",
        i18nRef.current,
      )} : ${pathVersion[0]} ${pathVersion[1]}`,
      { variant: "error" },
    );
    throw new Error(
      `${doI18n(
        "pages:uw-client-checks:could_not_change_branch",
        i18nRef.current,
      )}`,
    );
  }
  return response;
}
