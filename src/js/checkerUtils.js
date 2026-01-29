import { LANG_CODE } from "../common/constants";
import { fixOccurrences, fsWriteRust } from "./serverUtils";
import { join } from "./creatProject";
import { toJSON } from "usfm-js";
import { fsGetManifest } from "./serverUtils";
import { fsExistsRust } from "./serverUtils";
import { fsGetRust } from "./serverUtils";
import yaml from "js-yaml";
import { parseUsfmToWordAlignerData } from "../wordAligner/utils/alignmentHelpers";
import { groupDataHelpers } from "@gabrielaillet/word-aligner-rcl";
import { areAlgnmentsComplete } from "../wordAligner/utils/alignmentHelpers";
import { convertOccurrences } from "../wordAligner/utils/alignmentHelpers";
import { usfmVerseToJson } from "../wordAligner/utils/usfmHelpers";
import { getWordListFromVerseObjects } from "../wordAligner/utils/alignmentHelpers";
import { getOriginalLanguageListForVerseData } from "../wordAligner/utils/migrateOriginalLanguageHelpers";
import { addAlignmentsToTargetVerseUsingMerge } from "../wordAligner/utils/alignmentHelpers";
export const changeDataFromtopBottomToNgramSourceNgram = (
  alignments,
  targetVerse2,
  originVerse,
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
                topWord.occurrence === item.occurrence
              );
            }, //Tricky: we want to allow automatic conversion between string and integer because occurrence could be either
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
            bottomWord.occurrence == item.occurrence,
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
  insidePath = "_local_/_local_",
  getManifestFromBookProject = null,
) => {
  let json = {};
  let isBookUsfmOnly = await fsExistsRust(
    repoPath,
    `${nameArr}/${book}/1.json`,
    insidePath,
  );
  if (!isBookUsfmOnly) {
    let usfmBook = await fsGetRust(
      repoPath,
      `${book.toUpperCase()}.usfm`,
      insidePath,
    );
    json = toJSON(usfmBook).chapters;
    fixOccurrences(json);
  } else {
    const all_part = await fsGetRust(
      repoPath,
      `${nameArr}/${book}`,
      insidePath,
    );

    for (const e of all_part) {
      if (!e.includes("headers")) {
        json[e.split(".")[0]] = await fsGetRust(
          repoPath,
          `${nameArr}/${book}/${e}`,
          insidePath,
        );
      }
    }
  }

  json["manifest"] = (
    await fsGetManifest(
      insidePath.split("/")[0],
      insidePath.split("/")[1],
      repoPath,
    )
  ).json;

  if (getManifestFromBookProject) {
    let newManifest = await fsGetRust(
      repoPath,
      nameArr + "/manifest.json",
      insidePath,
    );
    json["manifest"] = { ...json["manifest"], ...newManifest };
  }
  json["manifest"]["language_id"] = json.manifest.language_code;
  if (LANG_CODE[json.manifest.language_code]) {
    json["manifest"]["language_name"] = LANG_CODE[json.manifest.language_code];
  } else {
    json["manifest"]["language_name"] = json.manifest.language_code;
  }
  if (json.manifest.script_direction === "?") {
    json.manifest.script_direction = "ltr";
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
  tCoreNameProject,
) => {
  let json = {};
  const categories = await fsGetRust(
    repoNameResources,
    "",
    "git.door43.org/uW",
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
            "git.door43.org/uW",
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
  tCoreNameProject,
) => {
  const json = {
    kt: { articles: {}, index: [] },
    names: { articles: {}, index: [] },
    other: { articles: {}, index: [] },
  };
  const things = ["kt", "names", "other"];
  // let responce_batch_md = await fsGetRust(
  //   repoNameResources,
  //   join(`payload`),
  //   "git.door43.org/uW",
  //   false,
  //   true
  // );
  for (const t of things) {
    const folder = await fsGetRust(
      repoNameResources,
      join(`payload`, t),
      "git.door43.org/uW",
      false,
      true
    );

    for (const e of Object.keys(folder)) {
      if (!e.includes("headers")) {
        let p = folder[e]
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
    repoNameResources,
  ).json;
  return json;
};

const renameCategories = (tnData, linkTitleMap, group = true) => {
  const result = {};

  for (let key of Object.keys(tnData)) {
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
        const newKey = linkTitleMap[key2] || key2;
        result[key][newKey] = value2;
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
    map[node.link.toLowerCase()] = node.title;
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
  group = true,
) => {
  let categories = await fsGetRust(
    repoName,
    "translate/toc.yaml",
    originFolder,
  );
  let dataYaml = yaml.load(categories);
  // build { "figs-abstractnouns": "Abstract Nouns", ... }
  const linkTitleMap = buildLinkTitleMap(dataYaml.sections);
  const renamed = renameCategories(data, linkTitleMap, group);
  return renamed;
};

export async function removeNotServiceTNCategories(
  repoName,
  originFolder,
  data,
) {
  let categories = await fsGetRust(
    repoName,
    "translate/toc.yaml",
    originFolder,
  );
  let dataYaml = yaml.load(categories);
  // build { "figs-abstractnouns": "Abstract Nouns", ... }
  const linkTitleMap = buildLinkTitleMap(dataYaml.sections);
  let json = {};
  for (let c1 of Object.keys(data)) {
    json[c1] = { groups: {} };
    for (let [c2, v2] of Object.entries(data[c1]["groups"])) {
      if (Object.prototype.hasOwnProperty.call(linkTitleMap, c2)) {
        json[c1]["groups"][c2] = v2;
      }
    }
  }
  return json;
}
export async function getSelectedChecksCategories(repoName, nameArr) {
  let objectCategories;
  let existLocalSetting = await fsExistsRust(
    repoName,
    `${nameArr}/checker_setting.json`,
  );
  if (existLocalSetting) {
    objectCategories = await fsGetRust(
      repoName,
      `${nameArr}/checker_setting.json`,
    );
  }
  console.log(repoName, nameArr);
  return objectCategories;
}

export const getCheckingData = async (repoName, nameArr, book, tool) => {
  let path = `${nameArr}/apps/translationCore/index/${tool}/${book}`;
  const json = {};
  let checkingData = await fsGetRust(
    repoName,
    path,
    "_local_/_local_",
    false,
    true,
  );
  let categories;
  let objectCategories;
  let existLocalSetting = await fsExistsRust(
    repoName,
    `${nameArr}/checker_setting.json`,
  );
  if (existLocalSetting) {
    objectCategories = await fsGetRust(
      repoName,
      `${nameArr}/checker_setting.json`,
    );
  } else {
    let existSetting = await fsExistsRust(repoName, `checker_setting.json`);
    if (existSetting) {
      objectCategories = await fsGetRust(repoName, `checker_setting.json`);
    }
  }
  if (objectCategories) {
    for (let [ocKeys, ocValues] of Object.entries(objectCategories[tool])) {
      if (typeof ocValues === typeof true) {
        if (ocValues) {
          json[ocKeys] = { groups: {} };
          const folder = await fsGetRust(
            repoName,
            path + "/categoryIndex/" + ocKeys + ".json",
          );
          for (const e of folder) {
            if (!e.includes("headers")) {
              json[ocKeys]["groups"][e] = JSON.parse(checkingData[e + ".json"]);
            }
          }
        }
      } else {
        json[ocKeys] = { groups: {} };
        for (let [oc2Keys, ocValues2] of Object.entries(ocValues)) {
          if (ocValues2 && checkingData[oc2Keys + ".json"]) {
            json[ocKeys]["groups"][oc2Keys] = JSON.parse(
              checkingData[oc2Keys + ".json"],
            );
          }
        }
      }
    }
  } else {
    categories = await fsGetRust(
      repoName,
      path + "/categoryIndex",
      "_local_/_local_",
    );
    for (let t of categories) {
      json[t.split(".")[0]] = { groups: {} };
      const folder = await fsGetRust(repoName, path + "/categoryIndex/" + t);
      for (const e of folder) {
        if (!e.includes("headers")) {
          json[t.split(".")[0]]["groups"][e] = JSON.parse(
            checkingData[e + ".json"],
          );
        }
      }
    }
  }

  return json;
};

export const getAllCheckingCategories = async (
  repoName,
  nameArr,
  book,
  tool,
  lecixonName = null,
) => {
  let path = `${nameArr}/apps/translationCore/index/${tool}/${book}`;
  const json = {};
  let categories;

  categories = await fsGetRust(
    repoName,
    path + "/categoryIndex",
    "_local_/_local_",
  );
  if (tool === "translationWords") {
    return tool;
  }
  let linkTitleMap;
  if (lecixonName) {
    let categories = await fsGetRust(
      lecixonName,
      "translate/toc.yaml",
      "git.door43.org/uW",
    );
    let dataYaml = yaml.load(categories);
    // build { "figs-abstractnouns": "Abstract Nouns", ... }
    linkTitleMap = buildLinkTitleMap(dataYaml.sections);
  }
  for (let t of categories) {
    const folder = await fsGetRust(repoName, path + "/categoryIndex/" + t);
    if (linkTitleMap) {
      json[t.split(".")[0]] = [];
      for (let e of folder) {
        if (Object.prototype.hasOwnProperty.call(linkTitleMap, e)) {
          json[t.split(".")[0]].push(e);
        }
      }
    } else {
      json[t.split(".")[0]] = folder;
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
    book,
  );
  let chapter = await fsGetRust(reposName, url);
  let json = {};
  for (let c of chapter) {
    json[c.split(".")[0]] = await fsGetRust(reposName, join(url, c));
  }
  return json;
};
export const getLexiconData = async (repoName) => {
  const arb = repoName.split("_")[1];
  let json = { [arb]: {} };
  let lexiconData = await fsGetRust(
    repoName,
    "content",
    "git.door43.org/uW",
    false,
    true,
  );
  for (let [k, v] of Object.entries(lexiconData)) {
    json[arb][k.split(".")[0]] = JSON.parse(v);
  }
  console.log(json)
  return json;
};

export const getProgressChecker = async (
  toolName,
  selectedCategories,
  repoName,
  nameArr,
  book,
  lexiconNameForProgress = null,
) => {
  let checks = await getCheckingData(repoName, nameArr, book, toolName);
  if (lexiconNameForProgress) {
    checks = await removeNotServiceTNCategories(
      lexiconNameForProgress,
      "git.door43.org/uW",
      checks,
    );
  }
  const filteredChecks = Object.fromEntries(
    Object.entries(checks).filter(([key]) => selectedCategories.includes(key)),
  );
  console.log(checks);
  let isDone = 0;
  let isInvalidated = 0;
  let TotalCount = 0;

  for (let cat of Object.keys(filteredChecks)) {
    for (let context of Object.values(filteredChecks[cat]["groups"])) {
      for (let e of context) {
        if (
          (e.nothingToSelect || Boolean(e.selections)) &&
          !Boolean(e.invalidated)
        ) {
          isDone += 1;
        }
        if (e.invalidated) {
          isInvalidated += 1;
        }
        TotalCount += 1;
      }
    }
  }
  return {
    selection: TotalCount === 0 ? 0 : (isDone / TotalCount) * 100,
    invalidated: isInvalidated,
  };
};

export const getProgressAligment = async (repoName, nameArr, originBible) => {
  let alignBible = {};
  let targetBible = await getBookFromName(
    repoName,
    `book_projects/${nameArr}`,
    nameArr.split("_")[2],
  );
  let invalidated_number = 0;
  let chapter = await fsGetRust(
    repoName,
    "book_projects/" +
      nameArr +
      "/apps/translationCore/tools/wordAlignment/invalid",
  );
  for (let c of chapter) {
    let verses = await fsGetRust(
      repoName,
      "book_projects/" +
        nameArr +
        `/apps/translationCore/tools/wordAlignment/invalid/${c}`,
      "_local_/_local_",
      false,
      true,
    );
    console.log(verses);
    invalidated_number += Object.entries(verses).length;
  }
  if (targetBible) {
    let rest = await loadAlignment(repoName, nameArr);
    for (let c of Object.keys(rest)) {
      alignBible[c] = {};
      for (let v of Object.keys(rest[c])) {
        alignBible[c][v] = {};
        alignBible[c][v]["verseObjects"] = usfmVerseToJson(
          addAlignmentsToTargetVerseUsingMerge(targetBible[c][v], rest[c][v]),
        );
      }
    }
    fixOccurrences(alignBible);
  }
  let totalNumber = 0;
  let number = 0;
  for (let chapter of Object.keys(alignBible)) {
    for (let verse of Object.keys(alignBible[chapter])) {
      if (verse != "front") {
        const targetVerseUSFM = groupDataHelpers.getVerseUSFM(
          alignBible,
          chapter,
          verse,
        );
        const sourceVerseUSFM = groupDataHelpers.getVerseUSFM(
          originBible,
          chapter,
          verse,
        );

        if (targetVerseUSFM && sourceVerseUSFM) {
          const { targetWords, verseAlignments } = parseUsfmToWordAlignerData(
            targetVerseUSFM,
            sourceVerseUSFM,
          );

          const alignmentComplete = areAlgnmentsComplete(
            targetWords,
            verseAlignments,
          );

          totalNumber += 1;
          if (alignmentComplete) {
            number += 1;
          }
        }
      }
    }
  }
  return {
    selection: totalNumber === 0 ? 0 : (number / totalNumber) * 100,
    invalidated: invalidated_number,
  };
};
