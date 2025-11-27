import { useEffect, useState, useMemo } from "react";
import { Checker, TranslationUtils } from "tc-checking-tool-rcl";
import { groupDataHelpers } from "word-aligner-lib";
import { useParams } from "react-router-dom";
import {
  fsGetRust,
  fsWriteRust,
  fsExistsRust,
  fsGetManifest,
} from "../js/serverUtils";
import { useLocation } from "react-router-dom";
import { isOldTestament } from "../js/creatProject";
import { toJSON } from "usfm-js";
import { join } from "../js/creatProject";
import { LANG_CODE } from "../common/constants";
import { fixOccurrences } from "../js/serverUtils";
// Load sample data from fixtures
const LexiconData = require("../uwSrc/__tests__/fixtures/lexicon/lexicons.json");
const translations = require("../uwSrc/locales/English-en_US.json");

// const glTn = require("../uwSrc/__tests__/fixtures/translationNotes/enTn_1JN.json");
// const glTw = require("../uwSrc/__tests__/fixtures/translationWords/twl_1jn_parsed.json");
// const glTaData = require("../uwSrc/__tests__/fixtures/translationAcademy/en_ta.json");
// const glTwData = require("../uwSrc/__tests__/fixtures/translationWords/en_tw.json");
// const targetBible = require("../uwSrc/__tests__/fixtures/bibles/1jn/targetBible.json");
// const ugntBible = require("../uwSrc/__tests__/fixtures/bibles/1jn/ugntBible.json");
// const enGlBible = require("../uwSrc/__tests__/fixtures/bibles/1jn/enGlBible.json");
// Extract checking data from the translation notes
// const checkingData = groupDataHelpers.extractGroupData(glTn)

// Configuration settings
const checkingTranslationWords = "translationWords";
const showDocument = true; // set to false to disable showing ta or tw document
const bookId = "tit";
const bookName = "Titus";
const targetLanguageId = "en";
const targetLanguageName = "English";
const targetLanguageDirection = "ltr";
const gatewayLanguageId = "en";
const gatewayLanguageOwner = "unfoldingWord";

// Initial context for checking (verse and word to check)

// Bible data configuration for all languages

// Translation helper function for UI strings
const translate = (key) => {
  const translation = TranslationUtils.lookupTranslationForKey(
    translations,
    key
  );
  if (translation.includes("translate")) {
    return key;
  }
  return translation;
};

// Callback for when settings are saved
const saveSettings = (settings) => {
  console.log(`saveSettings`, settings);
};

// Callback for when checking data changes
const changedCurrentCheck = (newContext) => {
  console.log(newContext);
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

  return json;
};

export const getResourcesFrom = async (repoName, nameArr, book) => {
  const all_part = await fsGetRust(
    repoName,
    `${nameArr}/translationHelps/translationWords`
  );
  const version = all_part[0];
  const json = {
    kt: { groups: {} },
    names: { groups: {} },
    other: { groups: {} },
  };
  const things = ["kt", "names", "other"];
  for (const t of things) {
    const folder = await fsGetRust(
      repoName,
      `${nameArr}/translationHelps/translationWords/${version}/${t}/groups/${book}`
    );
    for (const e of folder) {
      if (!e.includes("headers")) {
        json[t]["groups"][e.split(".")[0]] = await fsGetRust(
          repoName,
          `${nameArr}/translationHelps/translationWords/${version}/${t}/groups/${book}/${e}`
        );
      }
    }
  }

  json["manifest"] = await fsGetRust(
    repoName,
    `${nameArr}/translationHelps/translationWords/${version}/manifest.json`
  );
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

export const getCheckingData = async (repoName, nameArr, book) => {
  let path = `${nameArr}/apps/translationCore/index/translationWords/${book}/`;

  const json = {
    kt: { groups: {} },
    names: { groups: {} },
    other: { groups: {} },
  };
  const things = ["kt.json", "names.json", "other.json"];

  for (const t of things) {
    const folder = await fsGetRust(repoName, path + "categoryIndex/" + t);
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

const contextId_ = {};
export const TwChecker = () => {
  const [targetBible, setTargetBible] = useState();
  const [contextId, setContextId] = useState(contextId_);
  const [bibles, setBibles] = useState([]);
  const [originBible, setOriginBible] = useState();
  const [glTwData, setGlTwData] = useState();
  const [checkingData, setCheckingData] = useState();
  const [ultBible, setUltBible] = useState();
  const { projectName,tCoreName } = useParams();
  const book = useMemo(() => tCoreName?.split("_")[2], [tCoreName]);

  const changeCurrentVerse = async (
    chapter,
    verse,
    newVerseText,
    targetVerseObjects
  ) => {
    let changeFile = await fsGetRust(
      projectName,
      `book_projects/${tCoreName}/${book}/${chapter}.json`
    );
    changeFile[verse] = newVerseText;
    await fsWriteRust(
      projectName,
      `book_projects/${tCoreName}/${book}/${chapter}.json`,
      changeFile
    );
  };

  const saveCheckingData = async (newState) => {
    let data = newState.currentCheck;
    let id = data.contextId.checkId;
    let index = data.contextId.groupId;

    let json2 = await fsGetRust(
      projectName,
      `book_projects/${tCoreName}/apps/translationCore/index/translationWords/${book}/${index}.json`
    );

    // Ensure it's an array with at least 1 item
    if (!Array.isArray(json2) || json2.length === 0) {
      json2 = [{}];
    }

    // Find the object in the array
    let currentCheckIndex = json2.findIndex((e) => e.contextId.checkId === id);

    // If not found, create a new object
    if (currentCheckIndex === -1) {
      currentCheckIndex = json2.length;
      json2.push({});
    }

    // Merge updates
    const updatedCheck = {
      ...json2[currentCheckIndex],
      verseEdits: data.verseEdits,
      contextId: data.contextId,
      selections: data.selections,
      comment: data.comment,
      nothingToSelect: data.nothingToSelect,
      reminders: data.reminders,
      invalidated: data.invalidated,
    };

    // Override selections if empty
    if (!data.selections || data.selections.length === 0) {
      updatedCheck.selections = false;
    }

    // Replace the item in the array
    json2[currentCheckIndex] = updatedCheck;

    await fsWriteRust(
      projectName,
      `book_projects/${tCoreName}/apps/translationCore/index/translationWords/${book}/${index}.json`,
      json2
    );
  };
  // Load all required data concurrently
  useEffect(() => {
    if (!book) return;

    const loadAll = async () => {
      const [
        glTwDataRes,
        checkingRes,
        targetBibleRes,
        originBibleRes,
        ultBibleRes,
      ] = await Promise.all([
        getglTwData("en_tw", projectName, `book_projects/${tCoreName}`),
        getCheckingData(projectName, `book_projects/${tCoreName}`, book),
        getBookFromName(
          projectName,
          `book_projects/${tCoreName}`,
          book,
          "target_language"
        ),
        isOldTestament(book)
          ? getBookFromName(
              "hbo_uhb",
              "",
              book,
              "original_language",
              "git.door43.org/uW"
            )
          : getBookFromName(
              "grc_ugnt",
              "",
              book,
              "original_language",
              "git.door43.org/uW"
            ),
        getBookFromName(
          "en_ult",
          "",
          book,
          "gateway_language",
          "git.door43.org/uW"
        ),
      ]);

      setGlTwData(glTwDataRes);
      setCheckingData(groupDataHelpers.extractGroupData(checkingRes));
      setTargetBible(targetBibleRes);
      setOriginBible(originBibleRes);
      setUltBible(ultBibleRes);
    };

    loadAll();
  }, [book, projectName, tCoreName]);

  // Build unified bibles list when dependencies update
  useEffect(() => {
    if (targetBible && originBible && ultBible) {
      setBibles([
        {
          book: targetBible,
          description: "target_language",
          languageId: "target_language",
          bibleId: "targetBible",
          owner: "unfoldingWord",
        },
        {
          book: ultBible,
          description: "gateway_language",
          languageId: "gateway_language",
          bibleId: "ult",
          owner: "unfoldingWord",
        },
        {
          book: originBible,
          description: "original_language",
          languageId: "original_language",
          bibleId: "ugnt",
          owner: "unfoldingWord",
        },
      ]);
    }
  }, [targetBible, originBible, ultBible]);

  // Derived object — useMemo prevents rebuilding on every render
  const targetLanguageDetails = useMemo(
    () => ({
      id: targetLanguageId,
      name: targetLanguageName,
      direction: targetLanguageDirection,
      gatewayLanguageId,
      gatewayLanguageOwner,
      book: {
        id: bookId,
        name: bookName,
      },
    }),
    []
  );

  const getLexiconData_ = (lexiconId, entryId) => {
    const entryData = LexiconData?.[lexiconId]?.[entryId] || null;
    return { [lexiconId]: { [entryId]: entryData } };
  };
  const ready =
    Array.isArray(bibles) &&
    bibles.length === 3 &&
    targetBible != null &&
    originBible != null &&
    ultBible != null &&
    glTwData != null &&
    checkingData != null &&
    contextId != null;

  
  return (
    <div className="page">
      {!ready && <div>Loading translation checker…</div>}

      {ready && (
        <Checker
          styles={{
            width: "100%",
            height: "100%",
            overflowX: "scroll",
            overflowY: "auto",
          }}
          bibles={bibles}
          checkingData={checkingData}
          checkType={checkingTranslationWords}
          contextId={contextId}
          getLexiconData={getLexiconData_}
          changeTargetVerse={changeCurrentVerse}
          glWordsData={glTwData}
          changedCurrentCheck={changedCurrentCheck}
          saveCheckingData={saveCheckingData}
          saveSettings={saveSettings}
          showDocument={showDocument}
          targetBible={targetBible}
          targetLanguageDetails={targetLanguageDetails}
          translate={translate}
        />
      )}
    </div>
  );
};

