import { LANG_CODE } from "../common/constants";
import { fixOccurrences, fsWriteRust } from "./serverUtils";
import { join } from "./creatProject";
import { toJSON } from "usfm-js";
import { fsGetManifest } from "./serverUtils";
import { fsExistsRust } from "./serverUtils";
import { fsGetRust } from "./serverUtils";

export const getBookFromName = async (
  repoPath,
  nameArr,
  book,
  typeBible,
  insidePath = "_local_/_local_"
) => {
  let json = {};
  let isBookUsfmOnly = await fsExistsRust(
    repoPath,
    `${book}/1.json`,
    insidePath
  );
  if (!isBookUsfmOnly) {
    let usfmBook = await fsGetRust(
      repoPath,
      `${book.toUpperCase()}.usfm`,
      insidePath
    );
    json = toJSON(usfmBook).chapters;
    fixOccurrences(json);
  } else {
    const all_part = await fsGetRust(
      repoPath,
      `${nameArr}/${book}`,
      insidePath
    );

    for (const e of all_part) {
      if (!e.includes("headers")) {
        json[e.split(".")[0]] = await fsGetRust(
          repoPath,
          `${nameArr}/${book}/${e}`,
          insidePath
        );
      }
    }
  }

  json["manifest"] = (
    await fsGetManifest(
      insidePath.split("/")[0],
      insidePath.split("/")[1],
      repoPath
    )
  ).json;
  json["manifest"]["language_id"] = json.manifest.language_code;
  if (LANG_CODE[json.manifest.language_code]) {
    json["manifest"]["language_name"] = LANG_CODE[json.manifest.language_code];
  } else {
    json["manifest"]["language_name"] = json.manifest.language_code;
  }
  json["manifest"]["direction"] = json.manifest.script_direction;
  json["manifest"]["resource_id"] = json.manifest.abbreviation;
  if (typeBible === "target_language") {
    json["manifest"]["description"] = "target_language";
  } else if (typeBible === "gateway_language") {
    json["manifest"]["description"] = "gateway_language";
  } else if (typeBible === "original_language") {
    json["manifest"]["description"] = "original_language";
  }

  return json;
};

export const getTnData = async (
  repoNameResources,
  repoNameProject,
  tCoreNameProject
) => {
  let json = {};
  const categories = await fsGetRust(repoNameResources, "","git.door43.org/uW");
  for (let c of categories) {
    if (!(c.split(".").length > 1)) {
      json[c] = {}
      const datas = await fsGetRust(repoNameResources, c ,"git.door43.org/uW");
      for (let d of datas) {
        if (!(d.split(".").length > 1)) {
          let markD = await fsGetRust(repoNameResources, join(c, d, "01.md"),"git.door43.org/uW");
          json[c][d] = markD
        }
      }
    }
  }
  return json;
};

export const getglTwData = async (
  repoNameResources,
  repoNameProject,
  tCoreNameProject
) => {
  const json = {
    kt: { articles: {}, index: [] },
    names: { articles: {}, index: [] },
    other: { articles: {}, index: [] },
  };
  const things = ["kt", "names", "other"];
  for (const t of things) {
    const folder = await fsGetRust(
      repoNameResources,
      join(`payload`, t),
      "git.door43.org/uW"
    );
    for (const e of folder) {
      if (!e.includes("headers")) {
        let p = await fsGetRust(
          repoNameResources,
          join(`payload`, t, `${e}`),
          "git.door43.org/uW"
        );
        json[t]["articles"][e.split(".")[0]] = p;
        json[t]["index"].push({
          id: e.split(".")[0],
          name: p.split("\n")[0].replace(/^#\s*/, "").trim(),
        });
      }
    }
  }
  json["manifest"] = await fsGetManifest(
    "git.door43.org",
    "uW",
    repoNameResources
  ).json;
  return json;
};

export const getCheckingData = async (repoName, nameArr, book,tool) => {
  let path = `${nameArr}/apps/translationCore/index/${tool}/${book}/`;
  console.log(repoName,path+"categoryIndex")
  const json = {};
  const categories = await fsGetRust(repoName, path+"categoryIndex","_local_/_local_",true)
  console.log(categories)
  for (let t of categories) {
    console.log(t)
    json[t.split(".")[0]] = {"groups" : {}}
    const folder = await fsGetRust(repoName, path + "categoryIndex/" + t);
    console.log(folder)
    for (const e of folder) {
      if (!e.includes("headers")) {
        let arr = e.split(".");
        if (arr.length > 1) {
          json[t.split(".")[0]]["groups"][e.split(".")[0]] = await fsGetRust(
            repoName,
            path + e
          );
        }
      }
    }
  }
  return json;
};

export const getLexiconData = async (repoName) => {
  let suffixe = ""
  if(repoName.includes("uhl")){
    suffixe = "content/"
  }
  let exist = await fsExistsRust(repoName,suffixe+"all.json","git.door43.org/uW")
  if(exist){
    let lexicon = await fsGetRust(repoName,suffixe+"all.json","git.door43.org/uW")
    return lexicon
  }
  if (suffixe === "content/"){
    suffixe = "content"
  }
  const arb = repoName.split("_")[1];
  let json = { [arb]: {} };
  
  const list = await fsGetRust(repoName, suffixe, "git.door43.org/uW");
  for (let e of list) {
    if(suffixe === "content"){
      suffixe = "content/"
    }
    let res = await fsGetRust(repoName, suffixe+e, "git.door43.org/uW");
    json[arb][e.split(".")[0]] = res;
  }
  fsWriteRust(repoName,suffixe+"all.json",json,"git.door43.org/uW")
  return json;
};

export const getProgressChecker = async (
  toolName,
  selectedCategories,
  repoName,
  nameArr,
  book
) => {
  const checks = await getCheckingData(repoName, nameArr, book,toolName);
  const filteredChecks = Object.fromEntries(
    Object.entries(checks).filter(([key]) => selectedCategories.includes(key))
  );
  let isDone = 1;
  let maxCount = 1;
  for (let cat of Object.keys(filteredChecks)) {
    for (let context of Object.values(filteredChecks[cat]["groups"])) {
      for (let e of context) {
        if (e.nothingToSelect || Boolean(e.selections)) {
          isDone += 1;
        }
        maxCount += 1;
      }
    }
  }
  return (isDone / maxCount) * 100;
};

// export const getResourcesFrom = async (repoName, nameArr, book) => {
//   const all_part = await fsGetRust(
//     repoName,
//     `${nameArr}/translationHelps/translationWords`
//   );
//   const version = all_part[0];
//   const json = {
//     kt: { groups: {} },
//     names: { groups: {} },
//     other: { groups: {} },
//   };
//   const things = ["kt", "names", "other"];
//   for (const t of things) {
//     const folder = await fsGetRust(
//       repoName,
//       `${nameArr}/translationHelps/translationWords/${version}/${t}/groups/${book}`
//     );
//     for (const e of folder) {
//       if (!e.includes("headers")) {
//         json[t]["groups"][e.split(".")[0]] = await fsGetRust(
//           repoName,
//           `${nameArr}/translationHelps/translationWords/${version}/${t}/groups/${book}/${e}`
//         );
//       }
//     }
//   }

//   json["manifest"] = await fsGetRust(
//     repoName,
//     `${nameArr}/translationHelps/translationWords/${version}/manifest.json`
//   );
//   return json;
// };
