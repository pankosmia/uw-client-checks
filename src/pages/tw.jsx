import React, { useEffect, useState, useMemo } from "react";
import { Checker, TranslationUtils } from "tc-checking-tool-rcl";
import { groupDataHelpers } from "word-aligner-lib";
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

const changedCurrentCheck = (newContext) => {
  console.log(newContext);
};
export const getBookFromName = async (repoPath, nameArr, book) => {
  const all_part = await fsGetRust(repoPath, `${nameArr}/${book}`);
  const json = {};

  for (const e of all_part) {
    if (!e.includes("headers")) {
      json[e.split(".")[0]] = await fsGetRust(
        repoPath,
        `${nameArr}/${book}/${e}`
      );
    }
  }

  json["manifest"] = await fsGetRust(repoPath, `${nameArr}/manifest.json`);

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
  const [targetBible, setTargetBible] = useState();
  const [contextId, setContextId] = useState(contextId_);
  const [bibles, setBibles] = useState([]);
  const [elBibles, setElBibles] = useState();
  const [glTw, setGlTw] = useState();
  const [glTwData, setGlTwData] = useState();
  const [checkingData, setCheckingData] = useState();
  const [ugntBible, setUgntBible] = useState();

  const { state } = useLocation();
  const tCoreName = state?.tCoreName;
  const projectName = state?.projectName;

  const book = useMemo(() => tCoreName?.split("_")[2], [tCoreName]);

  const saveCheckingData = async (newState) => {
    // console.log(`saveCheckingData - new selections`, newState);
    // let data = newState.currentCheck;
    // let index = data.contextId.groupId;
    // let json2 = await fsGetRust(
    //   projectName,
    //   `book_projects/${tCoreName}/apps/translationCore/index/translationWords/${book}/${index}.json`
    // );

    // // Ensure it's an array with at least 1 item
    // if (!Array.isArray(json2) || json2.length === 0) {
    //   json2 = [{}];
    // }

    // const current = json2[0]; // the actual object stored in the file

    // const updates = {
    //   verseEdits: data.verseEdits,
    //   contextId: data.contextId,
    //   selections: data.selections,
    //   comment: data.comment,
    //   nothingToSelect: data.nothingToSelect,
    //   reminders: data.reminders,
    //   invalidated:false
    // };

    // // Merge into the inner object
    // json2[0] = {
    //   ...current,
    //   ...updates,
    // };

    // await fsWriteRust(
    //   projectName,
    //   `book_projects/${tCoreName}/apps/translationCore/index/translationWords/${book}/${index}.json`,
    //   json2
    // );
  };
  // Load all required data concurrently
  useEffect(() => {
    if (!book) return;

    const loadAll = async () => {
      const [
        glTwDataRes,
        glTwRes,
        checkingRes,
        targetBibleRes,
        elBibleRes,
        ugntBibleRes,
      ] = await Promise.all([
        getglTwData("Resources", "en", book),
        getResourcesFrom("Resources", "el-x-koine", book),
        getCheckingData(projectName, `book_projects/${tCoreName}`, book),
        getBookFromName(projectName, `book_projects/${tCoreName}`, book),
        getBookFromName(
          "Resources",
          "el-x-koine/bibles/ugnt/v0.34_unfoldingWord",
          book
        ),
        getBookFromName("Resources", "en/bibles/ult/v85.1_unfoldingWord", book),
      ]);

      setGlTwData(glTwDataRes);
      setGlTw(glTwRes);
      setCheckingData(groupDataHelpers.extractGroupData(checkingRes));
      setTargetBible(targetBibleRes);
      setElBibles(elBibleRes);
      setUgntBible(ugntBibleRes);
    };

    loadAll();
  }, [book, projectName, tCoreName]);

  // Build unified bibles list when dependencies update
  useEffect(() => {
    if (targetBible && elBibles && ugntBible) {
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
          book: elBibles,
          languageId: "el-x-koine",
          bibleId: "ugnt",
          owner: "unfoldingWord",
        },
      ]);
    }
  }, [targetBible, elBibles, ugntBible]);

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
  console.log(targetBible)
  const ready =
    Array.isArray(bibles) &&
    bibles.length === 3 &&
    targetBible != null &&
    elBibles != null &&
    ugntBible != null &&
    glTwData != null &&
    checkingData != null &&
    contextId != null;

  // if(ready){
  //   let verse = targetBible[2][12]
  //   console.log(verse)
  //   console.log(checkingData)
  //   let flattenedGroupData = groupDataHelpers.flattenGroupData(checkingData)
  //   console.log(flattenedGroupData)
  //   let check = checkingData['other']['age']
  //   let text = getVerseText(targetBible,check[0].contextId)
  //   console.log(text)
  //   let rm = removeMarker(text)
  //   console.log(JSON.stringify(rm))
  //   console.log(check)
  //   let test = selectionsHelpers.validateVerseSelections(rm,check[0].selections)
  //   console.log(test)
  //   let test2 = selectionsHelpers.validateSelectionsForAllChecks(targetBible, flattenedGroupData, (check, invalidated) => {
  //       if (check) {
  //         console.log(`tes2n changed`, check, invalidated)
  //       }
  //     })
  // }
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

export default TwChecker;
