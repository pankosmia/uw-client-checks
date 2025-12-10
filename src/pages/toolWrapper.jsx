import { useEffect, useState, useMemo, useContext } from "react";
import { Checker, TranslationUtils } from "tc-checking-tool-rcl";
import { groupDataHelpers } from "word-aligner-lib";
import { useParams, useLocation } from "react-router-dom";
import { changeTnCategories, getTnData } from "../js/checkerUtils";
import { Box, Tabs, Tab, Fab, Typography } from "@mui/material";
import ArrowBack from "@mui/icons-material/ArrowBack";
import yaml from "js-yaml";
import { buildLinkTitleMap } from "../js/checkerUtils";
import { fsGetRust, fsWriteRust } from "../js/serverUtils";
import { doI18n, i18nContext } from "pithekos-lib";
import {
  getBookFromName,
  getglTwData,
  getCheckingData,
  getLexiconData,
} from "../js/checkerUtils";
import { isOldTestament } from "../js/creatProject";
// Load sample data from fixtures
// const LexiconData = require("../uwSrc/__tests__/fixtures/lexicon/lexicons.json");
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
  if (typeof translation === String) {
    if (translation.includes("translate")) {
      return key;
    }
  }

  return translation;
};

// Callback for when settings are saved
const saveSettings = (settings) => {};

// Callback for when checking data changes

const contextId_ = {
  checkId: "sda6",
  occurrenceNote: "",
  reference: {
    bookId: "tit",
    chapter: 1,
    verse: 1,
  },
  tool: "translationWords",
  groupId: "apostle",
  quote: "ἀπόστολος",
  quoteString: "ἀπόστολος",
  glQuote: "",
  occurrence: 1,
};
export const ToolWrapper = () => {
  const tools = ["translationWords", "translationNotes", "wordAligner"];
  const [targetBible, setTargetBible] = useState();
  const [bibles, setBibles] = useState([]);
  const [originBible, setOriginBible] = useState();
  const [dataTw, setDataTW] = useState();
  const [dataTn, setDataTn] = useState();
  const [checkingData, setCheckingData] = useState();
  const [ultBible, setUltBible] = useState();
  const { projectName, tCoreName } = useParams();
  const [lexicon, setLexicon] = useState();
  const [contextId, setContextId] = useState({});
  const [loadingTool, setLoadingTool] = useState(false);
  const book = useMemo(() => tCoreName?.split("_")[2], [tCoreName]);
  const location = useLocation();
  console.log(contextId);
  const { i18nRef } = useContext(i18nContext);

  const [toolName, setToolName] = useState(
    location.state?.toolName ?? "translationWords"
  );
  const changedCurrentCheck = (newContext) => {
    setContextId(newContext);
  };
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
    const data = structuredClone(newState.currentCheck);
    let id = data.contextId.checkId;
    let index = data.contextId.groupId;
    if (toolName === "translationNotes") {
      let categories = await fsGetRust(
        "en_ta",
        "translate/toc.yaml",
        "git.door43.org/uW"
      );
      let dataYaml = yaml.load(categories);
      // build { "figs-abstractnouns": "Abstract Nouns", ... }
      const linkTitleMap = buildLinkTitleMap(dataYaml.sections);
      let p = {};
      for (let [key, value] of Object.entries(linkTitleMap)) {
        p[value] = key;
      }
      index = p[index] || index;
    }
    let json2 = await fsGetRust(
      projectName,
      `book_projects/${tCoreName}/apps/translationCore/index/${toolName}/${book}/${index}.json`
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
      comments: data.comments,
      nothingToSelect: data.nothingToSelect,
      reminders: data.reminders,
      invalidated: data.invalidated,
    };
    updatedCheck.contextId.groupId = index;
    // Override selections if empty
    if (!data.selections || data.selections.length === 0) {
      updatedCheck.selections = false;
    }
    // Replace the item in the array
    json2[currentCheckIndex] = updatedCheck;

    await fsWriteRust(
      projectName,
      `book_projects/${tCoreName}/apps/translationCore/index/${toolName}/${book}/${index}.json`,
      json2
    );
  };

  // Load all required data concurrently
  useEffect(() => {
    if (!book) return;

    const loadAll = async () => {
      const [targetBibleRes, originBibleRes, ultBibleRes, lexiconRes] =
        await Promise.all([
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
          getLexiconData(isOldTestament(book) ? "en_uhl" : "en_ugl"),
        ]);

      setTargetBible(targetBibleRes);
      setOriginBible(originBibleRes);
      setUltBible(ultBibleRes);
      setLexicon(lexiconRes);
    };

    loadAll();
  }, [book, projectName, tCoreName]);

  useEffect(() => {
    if (!book) return;

    const loadData = async () => {
      setLoadingTool(true);
      setTargetBible(
        await getBookFromName(
          projectName,
          `book_projects/${tCoreName}`,
          book,
          "target_language"
        )
      );
      let toolData;
      if (toolName === "translationWords") {
        if (!dataTw) {
          toolData = await getglTwData(
            "en_tw",
            projectName,
            `book_projects/${tCoreName}`
          );
          setDataTW(toolData);
        }
      } else if (toolName === "translationNotes") {
        if (!dataTn) {
          toolData = await getTnData("en_ta", projectName, tCoreName);
          toolData = await changeTnCategories(
            "en_ta",
            "git.door43.org/uW",
            toolData,
            false
          );

          setDataTn(toolData);
        }
      }

      let checkingRes = await getCheckingData(
        projectName,
        `book_projects/${tCoreName}`,
        book,
        toolName
      );
      if (toolName === "translationNotes") {
        checkingRes = await changeTnCategories(
          "en_ta",
          "git.door43.org/uW",
          checkingRes
        );
      }
      setCheckingData(groupDataHelpers.extractGroupData(checkingRes));
    };
    loadData();
  }, [book, projectName, tCoreName, toolName]);

  // Build unified bibles list when dependencies update
  useEffect(() => {
    if (targetBible && originBible && ultBible) {
      setBibles([
        {
          book: targetBible,
          description: "target_language",
          languageId: "targetLanguage",
          bibleId: "targetBible",
          owner: "unfoldingWord",
        },
        {
          book: ultBible,
          description: "gateway_language",
          languageId: "en",
          bibleId: "ult",
          owner: "unfoldingWord",
        },
        {
          book: originBible,
          description: "original_language",
          languageId: isOldTestament(book) ? "hbo" : "el-x-koine",
          bibleId: isOldTestament(book) ? "uhb" : "ugnt",
          owner: "unfoldingWord",
        },
      ]);
    }
  }, [targetBible, originBible, ultBible]);

  useEffect(() => {
    setLoadingTool(false);
  }, [checkingData]);

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
    const entryData = lexicon?.[lexiconId]?.[entryId] || null;
    return { [lexiconId]: { [entryId]: entryData } };
  };

  const ready =
    Array.isArray(bibles) &&
    bibles.length === 3 &&
    targetBible != null &&
    originBible != null &&
    ultBible != null &&
    checkingData != null &&
    contextId_ != null &&
    lexicon != null &&
    saveCheckingData != null &&
    !loadingTool;

  return (
    <div className="page">
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          px: 2,
        }}
      >
        {/* LEFT: Back button */}
        <Fab
          variant="extended"
          color="primary"
          size="small"
          aria-label={doI18n(
            "pages:uw-client-checks:book_projects",
            i18nRef.current
          )}
          onClick={() =>
            (window.location.href = `/clients/main/#/${projectName}`)
          }
        >
          <ArrowBack sx={{ mr: 1 }} />
          <Typography variant="body2">Change book project</Typography>
        </Fab>

        {/* CENTER: Tabs */}
        <Box sx={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <Tabs
            value={toolName}
            onChange={(event, newValue) => setToolName(newValue)}
            indicatorColor="primary"
            textColor="primary"
            variant="standard"
          >
            {tools.map((tool) => (
              <Tab key={tool} value={tool} label={tool} />
            ))}
          </Tabs>
        </Box>

        {/* RIGHT spacer to keep tabs centered */}
        <Box sx={{ width: 140 }} />
      </Box>

      {!ready && <div>Loading translation checker…</div>}

      {ready && (
        <Checker
          styles={{
            width: "100%",
            height: "100%",
            overflowX: "scroll",
            overflowY: "auto",
          }}
          alignedGlBible={ultBible}
          bibles={bibles}
          checkingData={checkingData}
          checkType={toolName}
          contextId={contextId}
          getLexiconData={getLexiconData_}
          changeTargetVerse={changeCurrentVerse}
          glWordsData={toolName === "translationWords" ? dataTw : dataTn}
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
