import React, { useEffect, useState } from "react";
import { Checker, TranslationUtils } from "tc-checking-tool-rcl";
import { groupDataHelpers } from "word-aligner-lib";
import { Box } from "@mui/material";
import { toJSON } from "usfm-js";
import { fsGetRust, fsWriteRust, fsExistsRust } from "../js/serverUtils";
import { useLocation } from "react-router-dom";
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
const translationNotes = "translationNotes";
const showDocument = true; // set to false to disable showing ta or tw document
const bookId = "tit";
const bookName = "Titus";
const targetLanguageId = "en";
const targetLanguageName = "English";
const targetLanguageDirection = "ltr";
const gatewayLanguageId = "en";
const gatewayLanguageOwner = "unfoldingWord";

const checkingType = checkingTranslationWords
  ? Checker.translationNotes
  : Checker.translationNotes;

// Initial context for checking (verse and word to check)

// Bible data configuration for all languages

// Translation helper function for UI strings
const translate = (key) => {
  const translation = TranslationUtils.lookupTranslationForKey(
    translations,
    key
  );
  return translation;
};

// Callback for when settings are saved
const saveSettings = (settings) => {
  console.log(`saveSettings`, settings);
};

// Callback for when checking data changes
const saveCheckingData = (newState) => {
  const selections = newState && newState.selections;
  console.log(`saveCheckingData - new selections`, newState);
  const currentContextId = newState && newState.currentContextId;
};
let IMPORTS_PATH = "burrito/ingredient/raw/_local_/_local_/bsb_tcchecks?ipath=";

const changedCurrentCheck = (newContext) => {
  console.log(newContext);
};
export const getBookFromName = async (repoPath, nameArr, book) => {
  const all_part = await fsGetRust(repoPath, `${nameArr}/${book}`);
  const json = {};

  for (const e of all_part) {
    if (!e.includes("headers")) {
      json[e.split(".")[0]] = await fsGetRust(repoPath, `${nameArr}/${book}/${e}`)
      
    }
  }

  json["manifest"] = await fsGetRust(repoPath, `${nameArr}/manifest.json`)

  // if(json["manifest"]["source_translation"]){
  json["manifest"] = {
    language_id: "en",
    language_name: "English",
    direction: "ltr",
    resource_id: "targetLanguage",
    description: "Target Language",
  };
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
export const getglTwData = async (repoName, nameArr, book) => {
  const all_part = await fsGetRust(
    repoName,
    `${nameArr}/translationHelps/translationWords`
  );
  const version = all_part[0];
  const json = {
    kt: { articles: {} },
    names: { articles: {} },
    other: { articles: {} },
  };
  const things = ["kt", "names", "other"];
  for (const t of things) {
    const folder = await fsGetRust(
      repoName,
      `${nameArr}/translationHelps/translationWords/${version}/${t}/articles`
    );
    for (const e of folder) {
      if (!e.includes("headers")) {
        let p = await fsGetRust(
          repoName,
          `${nameArr}/translationHelps/translationWords/${version}/${t}/articles/${e}`
        );
        json[t]["articles"][e.split(".")[0]] = p;
      }
    }
    json[t]["index"] = await fsGetRust(
        repoName,
        `${nameArr}/translationHelps/translationWords/${version}/${t}/index.json`
      
    );
  }

  json["manifest"] = await fsGetRust(
    repoName,
    `${nameArr}/translationHelps/translationWords/${version}/manifest.json`
  );
  return json;
};

export const getCheckingData = async (repoName, nameArr, book) => {
  let path = `${nameArr}/apps/translationCore/index/TranslationWords/${book}/`;

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
          json[t.split('.')[0]]["groups"][e.split(".")[0]] = await fsGetRust(
            repoName,
            path + e
          );
        }
      }
    }
  }
  return json;
};
const changeCurrentVerse = (
  chapter,
  verse,
  newVerseText,
  targetVerseObjects
) => {
  console.log(chapter, verse, newVerseText, targetVerseObjects);
};
const contextId_ = {
  checkId: "sy96",
  occurrenceNote: "",
  reference: {
    bookId: "tit",
    chapter: 3,
    verse: 13,
  },
  tool: "translationWords",
  groupId: "apollos",
  quote: "Ἀπολλῶν",
  quoteString: "Ἀπολλῶν",
  glQuote: "",
  occurrence: 1,
};
const TwChecker = () => {
  const [targetBible, setTargetBible] = useState(0);
  const [contextId, setCcontextId] = useState(contextId_);
  const [bibles, setBibles] = useState();
  const [elbibles, setElBibles] = useState();
  const [comp, setComp] = useState();
  const [glTw, setGlTw] = useState();
  const [glTwData, setGlTwData] = useState();
  const [checkingData, setCheckingData] = useState();
  const [ugntBible, setUgntBible] = useState();
  const { state } = useLocation();

  const tCoreName = state?.tCoreName; // ← your passed value
  const projectName = state?.projectName;
  let book = tCoreName.split("_")[2];

  useEffect(() => {
    async function loadlexicon() {
      const gl = await getglTwData("Resources", "en", book);
      setGlTwData(gl);
    }
    loadlexicon();
    async function loadRessources() {
      const gl = await getResourcesFrom("Resources", "el-x-koine", book);
      setGlTw(gl);
    }
    loadRessources();
    async function loadCheckingData() {
      const gl = await getCheckingData(
        projectName,
        `book_projects/${tCoreName}`,
        book
      );
      setCheckingData(groupDataHelpers.extractGroupData(gl));
    }
    loadCheckingData();
    async function loadBible() {
      const bible = await getBookFromName(
        projectName,
        "book_projects/" + tCoreName,
        book
      );
      setTargetBible(bible);
      const el = await getBookFromName(
        "Resources",
        "el-x-koine/bibles/ugnt/v0.34_unfoldingWord",
        book
      );
      setElBibles(el);
    }
    loadBible();
    async function ugntBibleLoad() {
      const ugntBible = await getBookFromName(
        "Resources",
        "en/bibles/ult/v85.1_unfoldingWord",
        book
      );
      setUgntBible(ugntBible);
    }
    ugntBibleLoad();
  }, []);

  useEffect(() => {
    if (glTw) {
      setCheckingData(groupDataHelpers.extractGroupData(glTw));
    }
  }, [glTw]);
  console.log(bibles);
  useEffect(() => {
    setBibles([
      {
        book: targetBible,
        languageId: "targetLanguage",
        bibleId: "targetBible",
        owner: "unfoldingWord",
      },
      {
        book: ugntBible,
        languageId: "en",
        bibleId: "ult",
        owner: "unfoldingWord",
      },
      {
        book: elbibles,
        languageId: "el-x-koine",
        bibleId: "ugnt",
        owner: "unfoldingWord",
      },
    ]);
  }, [targetBible, elbibles, ugntBible]);

  // Target language metadata
  const targetLanguageDetails = {
    id: targetLanguageId,
    name: targetLanguageName,
    direction: targetLanguageDirection,
    gatewayLanguageId,
    gatewayLanguageOwner,
    book: {
      id: bookId,
      name: bookName,
    },
  };
  useEffect(() => {
    if (bibles && targetBible && glTwData && checkingData) {
      setComp(
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
          // checkType={translationNotes}
          contextId={contextId}
          getLexiconData={getLexiconData_}
          changeTargetVerse={changeCurrentVerse}
          glWordsData={glTwData}
          //   glWordsData={glTaData}
          changedCurrentCheck={changedCurrentCheck}
          saveCheckingData={saveCheckingData}
          saveSettings={saveSettings}
          showDocument={showDocument}
          targetBible={targetBible}
          targetLanguageDetails={targetLanguageDetails}
          translate={translate}
        />
      );
    }
  }, [targetBible, bibles, glTwData, checkingData, contextId]);
  // State management for current context
  // Lexicon lookup
  const getLexiconData_ = (lexiconId, entryId) => {
    const entryData =
      LexiconData && LexiconData[lexiconId]
        ? LexiconData[lexiconId][entryId]
        : null;
    return { [lexiconId]: { [entryId]: entryData } };
  };
  return <div className="page">{comp}</div>;
};

export default TwChecker;
