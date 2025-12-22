import { LANG_CODE } from "../common/constants";
import { fixOccurrences, fsWriteRust } from "./serverUtils";
import { join } from "./creatProject";
import { toJSON } from "usfm-js";
import { fsGetManifest } from "./serverUtils";
import { fsExistsRust } from "./serverUtils";
import { fsGetRust } from "./serverUtils";
import yaml from "js-yaml";
import { convertOccurrences } from "../wordAligner/utils/alignmentHelpers";
import { usfmVerseToJson } from "../wordAligner/utils/usfmHelpers";
import { getWordListFromVerseObjects } from "../wordAligner/utils/alignmentHelpers";
import { getOriginalLanguageListForVerseData } from "../wordAligner/utils/migrateOriginalLanguageHelpers";

export const changeDataFromtopBottomToNgramSourceNgram = (
  alignments,
  targetVerse2,
  originVerse
) => {
  const targetVerse = usfmVerseToJson(targetVerse2);
  const targetTokens = getWordListFromVerseObjects(targetVerse);
  let originalLangWordList =
    originVerse && getOriginalLanguageListForVerseData(originVerse);
  const alignments_ = alignments.alignments.map((alignment) => {
    const topWords = convertOccurrences(alignment.topWords);
    const bottomWords = convertOccurrences(alignment.bottomWords);
    return {
      sourceNgram: topWords.map((topWord) => {
        // word aligner uses sourceNgram instead of topWord
        if (originalLangWordList) {
          const pos = originalLangWordList.findIndex(
            (item) => {
              return (
                topWord.word === (item.word || item.text) &&
                topWord.occurrence == item.occurrence
              );
            } //Tricky: we want to allow automatic conversion between string and integer because occurrence could be either
          );
          const newSource = {
            ...topWord,
            index: pos,
            text: topWord.text || topWord.word,
          };
          delete newSource.word;
          return newSource;
        }
        const newSource = {
          ...topWord,
          text: topWord.text || topWord.word,
        };
        delete newSource.word;
        delete newSource.position;
        return newSource;
      }),
      targetNgram: bottomWords.map((bottomWord) => {
        // word aligner uses targetNgram instead of bottomWords
        const word = bottomWord.text || bottomWord.word;
        // noinspection EqualityComparisonWithCoercionJS
        const pos = targetTokens.findIndex(
          (item) =>
            word === item.text &&
            // eslint-disable-next-line eqeqeq
            bottomWord.occurrence == item.occurrence
        );

        const newTarget = {
          ...bottomWord,
          index: pos,
          text: word,
        };
        delete newTarget.word;
        return newTarget;
      }),
    };
  });
  alignments.alignments = alignments_;
  return alignments;
};

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
  json["manifest"] = {
    language_id: "en",
    language_name: "English",
    direction: "ltr",
    resource_id: "targetLanguage",
    description: "Target Language",
  };
  return json;
};

export const getTnData = async (
  repoNameResources,
  repoNameProject,
  tCoreNameProject
) => {
  let json = {};
  const categories = await fsGetRust(
    repoNameResources,
    "",
    "git.door43.org/uW"
  );
  for (let c of categories) {
    if (!(c.split(".").length > 1)) {
      json[c] = {};
      const datas = await fsGetRust(repoNameResources, c, "git.door43.org/uW");
      for (let d of datas) {
        if (!(d.split(".").length > 1)) {
          let markD = await fsGetRust(
            repoNameResources,
            join(c, d, "01.md"),
            "git.door43.org/uW"
          );
          json[c][d] = markD;
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

const renameCategories = (tnData, linkTitleMap, group = true) => {
  const result = {};

  for (const [key, value] of Object.entries(tnData)) {
    if (group) {
      result[key] = { groups: {} };
      for (const [key2, value2] of Object.entries(tnData[key]["groups"])) {
        const newKey = linkTitleMap[key2] || key2;
        result[key]["groups"][newKey] = [];
        for (const item of value2) {
          let item2 = { ...item };
          item2["contextId"]["groupId"] = newKey;
          result[key]["groups"][newKey].push(item2);
        }
      }
    } else {
      result[key] = {};
      for (const [key2, value2] of Object.entries(tnData[key])) {
        {
          const newKey = linkTitleMap[key2] || key2;
          result[key][newKey] = value2;
        }
      }
    }
  }
  return result;
};
export const buildLinkTitleMap = (node, map = {}) => {
  if (Array.isArray(node)) {
    node.forEach((n) => buildLinkTitleMap(n, map));
    return map;
  }

  if (node?.link && node?.title) {
    map[node.link] = node.title;
  }

  if (node?.sections) {
    buildLinkTitleMap(node.sections, map);
  }

  return map;
};
export const changeTnCategories = async (
  repoName,
  originFolder,
  data,
  group = true
) => {
  let categories = await fsGetRust(
    repoName,
    "translate/toc.yaml",
    originFolder
  );
  let dataYaml = yaml.load(categories);
  // build { "figs-abstractnouns": "Abstract Nouns", ... }
  const linkTitleMap = buildLinkTitleMap(dataYaml.sections);
  const renamed = renameCategories(data, linkTitleMap, group);
  return renamed;
};

export const getCheckingData = async (repoName, nameArr, book, tool) => {
  let path = `${nameArr}/apps/translationCore/index/${tool}/${book}`;
  const json = {};
  const categories = await fsGetRust(
    repoName,
    path + "/categoryIndex",
    "_local_/_local_"
  );
  let checkingData = await fsGetRust(repoName, path,"_local_/_local_",false,true);
  for (let t of categories) {
    json[t.split(".")[0]] = { groups: {} };
    const folder = await fsGetRust(repoName, path + "/categoryIndex/" + t);
    for (const e of folder) {
      if (!e.includes("headers")) {
        json[t.split(".")[0]]["groups"][e] = JSON.parse(checkingData[e + ".json"]);
      }
    }
  }
  return json;
};
export const loadAlignment = async (reposName, nameArr) => {
  let book = nameArr.split("_")[2];
  let url = join(
    "book_projects",
    nameArr,
    "apps",
    "translationCore",
    "alignmentData",
    book
  );
  let chapter = await fsGetRust(reposName, url);
  let json = {};
  for (let c of chapter) {
    json[c.split(".")[0]] = await fsGetRust(reposName, join(url, c));
  }
  return json;
};
export const getLexiconData = async (repoName) => {
  let suffixe = "";
  if (repoName.includes("uhl")) {
    suffixe = "content/";
  }
  let exist = await fsExistsRust(
    repoName,
    suffixe + "all.json",
    "git.door43.org/uW"
  );
  if (exist) {
    let lexicon = await fsGetRust(
      repoName,
      suffixe + "all.json",
      "git.door43.org/uW"
    );
    return lexicon;
  }
  if (suffixe === "content/") {
    suffixe = "content";
  }
  const arb = repoName.split("_")[1];
  let json = { [arb]: {} };

  const list = await fsGetRust(repoName, suffixe, "git.door43.org/uW");
  for (let e of list) {
    if (suffixe === "content") {
      suffixe = "content/";
    }
    let res = await fsGetRust(repoName, suffixe + e, "git.door43.org/uW");
    json[arb][e.split(".")[0]] = res;
  }
  fsWriteRust(repoName, suffixe + "all.json", json, "git.door43.org/uW");
  return json;
};

export const getProgressChecker = async (
  toolName,
  selectedCategories,
  repoName,
  nameArr,
  book
) => {
  const checks = await getCheckingData(repoName, nameArr, book, toolName);
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
