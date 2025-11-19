import React, { useEffect, useState } from "react";
import { Checker, TranslationUtils } from "tc-checking-tool-rcl";
import { groupDataHelpers } from "word-aligner-lib";
import { Box } from "@mui/material";
import { fsGetRust, fsWriteRust, fsExistsRust } from "../js/creatProject";
// Load sample data from fixtures
const LexiconData = require("../uwSrc/__tests__/fixtures/lexicon/lexicons.json");

const translations = require("../uwSrc/locales/English-en_US.json");

// const glTn = require("../uwSrc/__tests__/fixtures/translationNotes/enTn_1JN.json");
// const glTw = require("../uwSrc/__tests__/fixtures/translationWords/twl_1jn_parsed.json");

// const glTaData = require("../uwSrc/__tests__/fixtures/translationAcademy/en_ta.json");
// const glTwData = require("../uwSrc/__tests__/fixtures/translationWords/en_tw.json");
// const targetBible = require("../uwSrc/__tests__/fixtures/bibles/1jn/targetBible.json");
// console.log("target", targetBible);
const ugntBible = require("../uwSrc/__tests__/fixtures/bibles/1jn/ugntBible.json");
const enGlBible = require("../uwSrc/__tests__/fixtures/bibles/1jn/enGlBible.json");
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
  console.log(`saveCheckingData - new selections`, selections);
  const currentContextId = newState && newState.currentContextId;
  console.log(`saveCheckingData - current context data`, currentContextId);
};
let IMPORTS_PATH = "burrito/ingredient/raw/_local_/_local_/bsb_tcchecks?ipath=";

console.log("CheckerTN.md - startup");
export const getBookFromName = async (nameArr, book) => {
  console.log(IMPORTS_PATH + `${nameArr}/${book}`);
  const all_part = await fsGetRust(IMPORTS_PATH, `${nameArr}/${book}`);
  console.log(all_part);
  const json = {};

  for (const e of all_part) {
    if (!e.includes("headers")) {
      json[e.split(".")[0]] = JSON.parse(
        await fsGetRust(IMPORTS_PATH, `${nameArr}/${book}/${e}`)
      );
    }
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

export const getResourcesFrom = async (nameArr, book) => {
  console.log(IMPORTS_PATH + ``);
  const all_part = await fsGetRust(
    IMPORTS_PATH,
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
      IMPORTS_PATH,
      `${nameArr}/translationHelps/translationWords/${version}/${t}/groups/${book}`
    );
    for (const e of folder) {
      if (!e.includes("headers")) {
        json[t]["groups"][e.split(".")[0]] = JSON.parse(
          await fsGetRust(
            IMPORTS_PATH,
            `${nameArr}/translationHelps/translationWords/${version}/${t}/groups/${book}/${e}`
          )
        );
      }
    }
  }

  json["manifest"] = await fsGetRust(
    IMPORTS_PATH,
    `${nameArr}/translationHelps/translationWords/${version}/manifest.json`
  );
  return json;
};
export const getglTwData = async (nameArr, book) => {
  console.log(IMPORTS_PATH + ``);
  const all_part = await fsGetRust(
    IMPORTS_PATH,
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
      IMPORTS_PATH,
      `${nameArr}/translationHelps/translationWords/${version}/${t}/articles`
    );
    for (const e of folder) {
      if (!e.includes("headers")) {
        json[t]["articles"][e.split(".")[0]] = await fsGetRust(
          IMPORTS_PATH,
          `${nameArr}/translationHelps/translationWords/${version}/${t}/articles/${e}`
        );
      }
    }
    json[t]["index"] = JSON.parse(await fsGetRust(
      IMPORTS_PATH,
      `${nameArr}/translationHelps/translationWords/${version}/${t}/index.json`
    ))
  }

  json["manifest"] = await fsGetRust(
    IMPORTS_PATH,
    `${nameArr}/translationHelps/translationWords/${version}/manifest.json`
  );
  return json;
};

const TwChecker = () => {
  const [targetBible, setTargetBible] = useState(0);
  const [bibles, setBibles] = useState();
  const [elbibles, setElBibles] = useState();
  const [comp, setComp] = useState();
  const [glTw, setGlTw] = useState();
  const [glTwData, setGlTwData] = useState();
  const [checkingData, setCheckingData] = useState();
  let name = "en_bsb_tit_book";
  let book = name.split("_")[2];
  useEffect(() => {
    async function loadlexicon() {
      const gl = await getglTwData("en", book);
      setGlTwData(gl);
    }
    loadlexicon();
  }, []);
  console.log(glTwData)
  useEffect(() => {
    async function loadRessources() {
      const gl = await getResourcesFrom("el-x-koine", book);
      setGlTw(gl);
    }
    loadRessources();
  }, []);
  useEffect(() => {
    if (glTw) {
      setCheckingData(groupDataHelpers.extractGroupData(glTw));
    }
  }, [glTw]);

  useEffect(() => {
    async function loadBible() {
      const bible = await getBookFromName("book_projects/" + name, book);
      setTargetBible(bible);
      const el = await getBookFromName(
        "el-x-koine/bibles/ugnt/v0.34_unfoldingWord",
        book
      );
      setElBibles(el);
    }
    loadBible();
  }, []);

  useEffect(() => {
    setBibles([
      {
        book: targetBible,
        languageId: "targetLanguage",
        bibleId: "targetBible",
        owner: "unfoldingWord",
      },
      {
        book: enGlBible,
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
  }, [targetBible, elbibles]);

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
  console.log(targetBible);
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
          // bibles={bibles}
          checkingData={checkingData}
          checkType={checkingTranslationWords}
          // checkType={translationNotes}
          contextId={contextId_}
          getLexiconData={getLexiconData_}
          glWordsData={glTwData}
          //   glWordsData={glTaData}
          saveCheckingData={saveCheckingData}
          saveSettings={saveSettings}
          showDocument={showDocument}
          targetBible={targetBible}
          targetLanguageDetails={targetLanguageDetails}
          translate={translate}
        />
      );
    }
  }, [targetBible, bibles, glTwData, checkingData]);
  // State management for current context
  const [contextId, setCcontextId] = useState(contextId_);

  // Lexicon lookup
  const getLexiconData_ = (lexiconId, entryId) => {
    console.log(`loadLexiconEntry(${lexiconId}, ${entryId})`);
    const entryData =
      LexiconData && LexiconData[lexiconId]
        ? LexiconData[lexiconId][entryId]
        : null;
    return { [lexiconId]: { [entryId]: entryData } };
  };
  console.log(bibles);
  console.log(targetBible);
  return <div className="page">{comp}</div>;
};

export default TwChecker;
