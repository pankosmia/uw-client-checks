import { useEffect, useState, useMemo,  useContext } from "react";
import { Checker, TranslationUtils } from "tc-checking-tool-rcl";
import { useParams, useLocation, json } from "react-router-dom";
import { changeTnCategories, getTnData } from "../js/checkerUtils";
import {
  Box,
  Tabs,
  Tab,
  Fab,
  Typography,
  CircularProgress,
} from "@mui/material";
import ArrowBack from "@mui/icons-material/ArrowBack";
import yaml from "js-yaml";
import { buildLinkTitleMap } from "../js/checkerUtils";
import { fixOccurrences, fsGetRust, fsWriteRust } from "../js/serverUtils";
import { doI18n, i18nContext } from "pithekos-lib";
import { loadAlignment } from "../js/checkerUtils";
import { usfmVerseToJson } from "../wordAligner/utils/usfmHelpers";
import { updateAlignmentsToTargetVerse } from "../wordAligner/utils/alignmentHelpers";
import { VerseObjectUtils } from "word-aligner";
import { getWordListFromVerseObjects } from "../wordAligner/utils/alignmentHelpers";
import wordaligner from "word-aligner";

import {
  getBookFromName,
  getglTwData,
  getCheckingData,
  getLexiconData,
  changeDataFromtopBottomToNgramSourceNgram,
} from "../js/checkerUtils";
import { verseHelpers } from "@gabrielaillet/word-aligner-rcl";
import {
  addAlignmentsToTargetVerseUsingMerge,
  handleAddedWordsInNewText,
  handleDeletedWords,
} from "../wordAligner/utils/alignmentHelpers";

import { addAlignmentsToVerseUSFM } from "../wordAligner/utils/alignmentHelpers";
import { isOldTestament } from "../js/creatProject";
import { WordAlignmentTool } from "@gabrielaillet/word-aligner-rcl";
import { groupDataHelpers as grouphelpers } from "@gabrielaillet/word-aligner-rcl";
import { groupDataHelpers } from "word-aligner-lib";
import { toJSON } from "usfm-js";
import { tokenizeVerseObjects } from "../wordAligner/utils/verseObjects";
import BIBLE_BOOKS from "../common/BooksOfTheBible";
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
function addObjectPropertyToManifest(propertyName, value) {
  console.log(`addObjectPropertyToManifest - ${propertyName} = ${value}`);
  // TODO need to save setting in project manifest
}

function saveToolSettings(
  moduleNamespace,
  settingsPropertyName,
  toolSettingsData
) {
  return;
}

const editedTargetVerse =
  (
    chapterWithVerseEdit,
    verseWithVerseEdit,
    before,
    after,
    tags,
    username,
    gatewayLanguageCode,
    gatewayLanguageQuote,
    projectSaveLocation,
    currentToolName,
    translate,
    showAlert,
    closeAlert,
    showIgnorableAlert,
    updateTargetVerse,
    toolApi
  ) =>
  (dispatch, getState) => {
    // const state = getState();
    // const contextId = getContextId(state);
    // const currentCheckContextId = contextId;
    // const {
    //   bookId, chapter: currentCheckChapter, verse: currentCheckVerse,
    // } = currentCheckContextId.reference;
    // const contextIdWithVerseEdit = {
    //   ...currentCheckContextId,
    //   reference: {
    //     ...currentCheckContextId.reference,
    //     chapter: chapterWithVerseEdit,
    //     verse: verseWithVerseEdit,
    //   },
    // };
  };

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

const contextId_ = {};
export const ToolWrapper = () => {
  const tools = ["translationWords", "translationNotes", "wordAlignment"];
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
  const [toolSettings, _setToolSettings] = useState(null); // TODO: need to persist tools state, and read back state on startup

  const [alignmentTargetBible, setAlignementTargetBibles] = useState({});
  const [biblesForAligner, setBiblesForAligner] = useState();

  const location = useLocation();
  const { i18nRef } = useContext(i18nContext);


  const [toolName, setToolName] = useState(
    location.state?.toolName ?? "translationWords"
  );
  useEffect(() => {
    setBiblesForAligner(verseHelpers.getBibleObject(bibles));
  }, [bibles]);
  const changedCurrentCheck = (newContext) => {
    setContextId(newContext);
  };
  const changeCurrentVerse = async (
    chapter,
    verse,
    newVerseText,
    targetVerseObjects
  ) => {
    let changeFileVerse = await fsGetRust(
      projectName,
      `book_projects/${tCoreName}/${book}/${chapter}.json`
    );
    let changeFileAlignment = await fsGetRust(
      projectName,
      `book_projects/${tCoreName}/apps/translationCore/alignmentData/${book}/${chapter}.json`
    );
    let p = changeFileVerse[verse];
    let x = changeFileAlignment[verse];
    let a = addAlignmentsToTargetVerseUsingMerge(p, x);
    const targetVerseObjects2 = usfmVerseToJson(a);
    let t = updateAlignmentsToTargetVerse(targetVerseObjects2, newVerseText);
    setAlignementTargetBibles(t["targetVerseObjects"]);
    let m = wordaligner.unmerge(t["targetVerseObjects"]);
    fixOccurrences(m);
    m["alignments"] = m["alignment"];
    delete m["alignment"];

    changeFileVerse[verse] = newVerseText;
    changeFileAlignment[verse] = m;

    await fsWriteRust(
      projectName,
      `book_projects/${tCoreName}/${book}/${chapter}.json`,
      changeFileVerse
    );
    await fsWriteRust(
      projectName,
      `book_projects/${tCoreName}/apps/translationCore/alignmentData/${book}/${chapter}.json`,
      changeFileAlignment
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
  console.log(alignmentTargetBible);
  useEffect(() => {
    const getAlignment = async () => {
      if (targetBible) {
        let alignBible = {};
        let rest = await loadAlignment(projectName, tCoreName);
        for (let c of Object.keys(rest)) {
          alignBible[c] = {};
          for (let v of Object.keys(rest[c])) {
            alignBible[c][v] = {};
            alignBible[c][v]["verseObjects"] = usfmVerseToJson(
              addAlignmentsToTargetVerseUsingMerge(
                targetBible[c][v],
                rest[c][v]
              )
            );
          }
        }
        fixOccurrences(alignBible);
        setAlignementTargetBibles(alignBible);
      }
    };
    getAlignment();
  }, [toolName, targetBible]);

  console.log(alignmentTargetBible);
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
  useEffect(() => {
    _setToolSettings({
      paneSettings: bibles.map((bible) => ({
        bibleId: bible.bibleId,
        font: null,
        fontSize: 100,
        languageId: bible.languageId,
        owner: bible.owner,
        actualLanguage: false,
        isPreRelease: false,
      })),
      paneKeySettings: {},
      toolsSettings: {},
      manifest: {},
    });
  }, [bibles]);
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
        id: book,
        name: isOldTestament(book)
          ? BIBLE_BOOKS["oldTestament"][book]
          : BIBLE_BOOKS["newTestament"][book],
      },
    }),
    []
  );

  const getLexiconData_ = (lexiconId, entryId) => {
    const entryData = lexicon?.[lexiconId]?.[entryId] || null;
    return { [lexiconId]: { [entryId]: entryData } };
  };
  const loadLexiconEntry = (lexiconId) => {
    console.log(`loadLexiconEntry(${lexiconId})`);
    return lexicon;
  };
  function saveNewAlignments(results) {
    console.log(
      `WordAlignmentTool.saveNewAlignments() - alignment changed for `,
      results
    ); // merge alignments into target verse and convert to USFM
    // const ref = contextId.reference;
    // if (targetBible) {
    //   const targetChapter = targetBible[ref.chapter];
    //   if (targetChapter) {
    //     const targetVerse = targetChapter[ref.verse];
    //     if (targetVerse) {
    //       const newChapter = { ...targetChapter };
    //       newChapter[ref.verse] = { verseObjects: targetVerseJSON }; // replace with new verse
    //       targetBible[ref.chapter] = newChapter;
    //     } else {
    //       console.error(`Invalid verse '${ref.chapter}:${ref.verse}'`);
    //     }
    //   } else {
    //     console.error(`Invalid chapter  '${ref.chapter}'`);
    //   }
    // } else {
    //   console.error(`Missing book`, results);
    // }
  }
  const showPopover = (PopoverTitle, wordDetails, positionCoord, rawData) => {
    console.log(`showPopover()`, rawData);
    window.prompt(`User clicked on ${JSON.stringify(rawData)}`);
  };
  const { groupsData, groupsIndex } =
    grouphelpers.initializeGroupDataForScripture(
      book,
      targetBible,
      toolName,
      originBible,
      translate
    );
  console.log("alignmentTargetBible", alignmentTargetBible);

  console.log(groupsData);
  console.log(groupsIndex);
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
    toolSettings != null &&
    !loadingTool;
  console.log(toolSettings);
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
          aria-label={doI18n(
            "pages:uw-client-checks:book_projects",
            i18nRef.current
          )}
          onClick={() =>
            (window.location.href = `/clients/main/#/${projectName}`)
          }
        >
          <ArrowBack sx={{ mr: 1 }} />
          <Typography variant="body2">
            {doI18n("pages:uw-client-checks:back", i18nRef.current)}
          </Typography>
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
        <Box sx={{ width: 140 }}>
          <Typography variant="h4" fontWeight="bold">{isOldTestament(book)
          ? BIBLE_BOOKS["oldTestament"][book]
          : BIBLE_BOOKS["newTestament"][book]}</Typography>
        </Box>
      </Box>

      {!ready && (
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            bgcolor: "background.default",
          }}
        >
          <CircularProgress size={48} />
          <Typography variant="h6" color="text.secondary">
            {doI18n("pages:uw-client-checks:loading", i18nRef.current)}
          </Typography>
        </Box>
      )}
      {ready &&
        (toolName === "wordAlignment" ? (
          <WordAlignmentTool
            addObjectPropertyToManifest={addObjectPropertyToManifest}
            bibles={biblesForAligner}
            bookName={bookName}
            contextId={{
              reference: {
                bookId: book,
                chapter: 1,
                verse: 1,
              },
              tool: "wordAlignment",
              groupId: "chapter_1",
            }}
            editedTargetVerse={editedTargetVerse}
            gatewayBook={ultBible}
            getLexiconData={getLexiconData_}
            groupsData={groupsData}
            groupsIndex={groupsIndex}
            initialSettings={toolSettings}
            lexiconCache={lexicon}
            loadLexiconEntry={loadLexiconEntry}
            saveNewAlignments={saveNewAlignments}
            saveToolSettings={saveToolSettings}
            showPopover={showPopover}
            sourceBook={originBible}
            sourceLanguage={isOldTestament(book) ? "hbo" : "el-x-koine"}
            styles={{
              wordListContainer: {
                minWidth: "100px",
                // maxWidth: "400px",
                height: "60vh",
                display: "flex",
              },
            }}
            targetLanguageFont={""}
            targetBook={alignmentTargetBible}
            translate={translate}
            showDocument={showDocument}
          />
        ) : (
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
        ))}
    </div>
  );
};
