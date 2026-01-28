import { useEffect, useState, useMemo, useContext } from "react";
import { Checker, TranslationUtils } from "tc-checking-tool-rcl";
import { useParams, useLocation, json } from "react-router-dom";
import { selectionsHelpers } from "word-aligner-lib";
import { deleteBookProject, deleteIngredient } from "../js/serverUtils";
import {
  changeTnCategories,
  getTnData,
  removeNotServiceTNCategories,
} from "../js/checkerUtils";
import "./test.css";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  CircularProgress,
  Divider,
  Button,
} from "@mui/material";

import ArrowBack from "@mui/icons-material/ArrowBack";
import yaml from "js-yaml";
import { buildLinkTitleMap } from "../js/checkerUtils";
import { fixOccurrences, fsGetRust, fsWriteRust } from "../js/serverUtils";
import { doI18n } from "pithekos-lib";
import {i18nContext} from "pankosmia-rcl"
import { loadAlignment } from "../js/checkerUtils";
import { usfmVerseToJson } from "../wordAligner/utils/usfmHelpers";
import { updateAlignmentsToTargetVerse } from "../wordAligner/utils/alignmentHelpers";
import { VerseObjectUtils } from "word-aligner";
import { getWordListFromVerseObjects } from "../wordAligner/utils/alignmentHelpers";
import wordaligner from "word-aligner";
import { toUSFM } from "usfm-js";
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

// Configuration settings
const showDocument = true; // set to false to disable showing ta or tw document
const bookName = "Titus";
const targetLanguageId = "en";
const targetLanguageName = "English";
const targetLanguageDirection = "ltr";
const gatewayLanguageId = "en";
const gatewayLanguageOwner = "unfoldingWord";

// Initial context for checking (verse and word to check)
function changeToolName(tool) {
  if (tool === "translationWords") {
    return "Words";
  }
  if (tool === "translationNotes") {
    return "Notes";
  }
  if (tool === "wordAlignment") {
    return "Aligner";
  }
  return "None";
}

// Bible data configuration for all languages
function addObjectPropertyToManifest(propertyName, value) {
  // TODO need to save setting in project manifest
}

function saveToolSettings(
  moduleNamespace,
  settingsPropertyName,
  toolSettingsData,
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
    toolApi,
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
    key,
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
  const location = useLocation();
  const { i18nRef } = useContext(i18nContext);

  const tools = ["translationWords", "translationNotes", "wordAlignment"];
  const [loadingTool, setLoadingTool] = useState(false);
  const [toolName, setToolName] = useState(
    location.state?.toolName ?? "translationWords",
  );

  const [targetBible, setTargetBible] = useState(null);
  const [bibles, setBibles] = useState([]);
  const [originBible, setOriginBible] = useState(null);
  const [dataTw, setDataTW] = useState(null);
  const [dataTn, setDataTn] = useState(null);
  const [checkingData, setCheckingData] = useState(null);
  const [ultBible, setUltBible] = useState(null);
  const { projectName, tCoreName } = useParams();
  const [lexicon, setLexicon] = useState(null);
  const [contextId, setContextId] = useState({});
  const book = useMemo(() => tCoreName?.split("_")[2], [tCoreName]);
  const [toolSettings, _setToolSettings] = useState(null); // TODO: need to persist tools state, and read back state on startup
  const [groupsData, setGroupsData] = useState({});
  const [groupsIndex, setGroupsIndex] = useState({});
  const [alignmentTargetBible, setAlignementTargetBibles] = useState({});
  const [biblesForAligner, setBiblesForAligner] = useState(null);
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
    targetVerseObjects,
  ) => {
    let changeFileVerse = await fsGetRust(
      projectName,
      `book_projects/${tCoreName}/${book}/${parseInt(chapter)}.json`,
    );
    let changeFileAlignment = await fsGetRust(
      projectName,
      `book_projects/${tCoreName}/apps/translationCore/alignmentData/${book}/${chapter}.json`,
    );
    let p = changeFileVerse[verse];
    let x = changeFileAlignment[verse];
    let a = addAlignmentsToTargetVerseUsingMerge(p, x);
    const targetVerseObjects2 = usfmVerseToJson(a);
    let t = updateAlignmentsToTargetVerse(
      targetVerseObjects2,
      typeof targetVerseObjects === typeof {}
        ? newVerseText
        : targetVerseObjects,
    );

    if (Object.keys(alignmentTargetBible).length > 0) {
      setAlignementTargetBibles((x) => {
        let p = { ...x };
        p[chapter][verse]["verseObjects"] = t["targetVerseObjects"];
        return p;
      });
    }

    let m = wordaligner.unmerge(t["targetVerseObjects"]);
    fixOccurrences(m);
    m["alignments"] = m["alignment"];
    delete m["alignment"];
    changeFileVerse[verse] =
      typeof targetVerseObjects === typeof {}
        ? newVerseText
        : targetVerseObjects;
    changeFileAlignment[verse] = m;

    await fsWriteRust(
      projectName,
      `book_projects/${tCoreName}/${book}/${parseInt(chapter)}.json`,
      changeFileVerse,
    );
    await fsWriteRust(
      projectName,
      `book_projects/${tCoreName}/apps/translationCore/alignmentData/${book}/${parseInt(
        chapter,
      )}.json`,
      changeFileAlignment,
    );
    setTargetBible((prev) => {
      let p = { ...prev };
      p[chapter] = changeFileVerse;
      return p;
    });
    let p2 = targetBible;
    p2[chapter] = changeFileVerse;
    for (let tool of ["translationWords", "translationNotes"]) {
      if (toolName !== tool) {
        let cat;
        let batch = await fsGetRust(
          projectName,
          `book_projects/${tCoreName}/apps/translationCore/index/${tool}/${book}`,
          "_local_/_local_",
          false,
          true,
        );
        let isVerseSpan = verseHelpers.isVerseSpan(verse);
        if (isVerseSpan) {
          let { low, high } = verseHelpers.getVerseSpanRange(verse);
          cat = Object.fromEntries(
            Object.entries(batch)
              .map(([key, val]) => [key, JSON.parse(val)])
              .filter(
                ([key, parsed]) =>
                  !key.endsWith(".bak") &&
                  parsed.some(
                    (e) =>
                      e.contextId.reference.chapter === parseInt(chapter) &&
                      e.contextId.reference.verse >= parseInt(low) &&
                      e.contextId.reference.verse <= parseInt(high),
                  ),
              ),
          );

          for (let [nameFile, values] of Object.entries(cat)) {
            let newValues = values;
            for (let i = 0; i < values.length; i++) {
              if (
                newValues[i].contextId.reference.chapter ===
                  parseInt(chapter) &&
                newValues[i].contextId.reference.verse >= parseInt(low) &&
                newValues[i].contextId.reference.verse <= parseInt(high)
              ) {
                newValues[i].verseEdits = true;
                if (newValues[i].selections) {
                  let { selectionsChanged } =
                    selectionsHelpers.validateVerseSelections(
                      changeFileVerse[verse],
                      newValues[i].selections,
                    );
                  if (selectionsChanged) {
                    newValues[i].invalidated = true;
                  }
                }
              }
            }
            await fsWriteRust(
              projectName,
              `book_projects/${tCoreName}/apps/translationCore/index/${tool}/${book}/${nameFile}`,
              newValues,
            );
          }
        } else {
          cat = Object.fromEntries(
            Object.entries(batch)
              .map(([key, val]) => [key, JSON.parse(val)])
              .filter(
                ([key, parsed]) =>
                  !key.endsWith(".bak") &&
                  parsed.some(
                    (e) =>
                      e.contextId.reference.chapter === chapter &&
                      e.contextId.reference.verse === parseInt(verse),
                  ),
              ),
          );
          for (let [nameFile, values] of Object.entries(cat)) {
            let newValues = values;
            for (let i = 0; i < values.length; i++) {
              if (
                newValues[i].contextId.reference.chapter === chapter &&
                newValues[i].contextId.reference.verse === parseInt(verse)
              ) {
                newValues[i].verseEdits = true;
                if (newValues[i].selections) {
                  let { selectionsChanged } =
                    selectionsHelpers.validateVerseSelections(
                      changeFileVerse[verse],
                      newValues[i].selections,
                    );
                  if (selectionsChanged) {
                    newValues[i].invalidated = true;
                  }
                }
              }
            }
            await fsWriteRust(
              projectName,
              `book_projects/${tCoreName}/apps/translationCore/index/${tool}/${book}/${nameFile}`,
              newValues,
            );
          }
        }
        await fsWriteRust(
          projectName,
          `book_projects/${tCoreName}/apps/translationCore/tools/wordAlignment/invalid/${chapter}/${verse}.json`,
          { timestamp: new Date().toISOString() },
        );
      }
    }
  };

  const saveCheckingData = async (newState) => {
    const data = structuredClone(newState.currentCheck);

    let id = data.contextId.checkId;
    let index = data.contextId.groupId;
    if (toolName === "translationNotes") {
      let categories = await fsGetRust(
        "en_ta",
        "translate/toc.yaml",
        "git.door43.org/uW",
      );
      let dataYaml = yaml.load(categories);
      const linkTitleMap = buildLinkTitleMap(dataYaml.sections);
      let p = {};
      for (let [key, value] of Object.entries(linkTitleMap)) {
        p[value] = key;
      }
      index = p[index] || index;
    }

    let json2 = await fsGetRust(
      projectName,
      `book_projects/${tCoreName}/apps/translationCore/index/${toolName}/${book}/${index}.json`,
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
    // if(updatedCheck[selections].length <= 0 && updatedCheck[])
    await fsWriteRust(
      projectName,
      `book_projects/${tCoreName}/apps/translationCore/index/${toolName}/${book}/${index}.json`,
      json2,
    );
    // for (let [e, val] of Object.entries(checkingData)) {
    //   for (let k of Object.keys(val)) {
    //     if (k === index) {
    //       setCheckingData((prev) => {
    //         let last = { ...prev };
    //         last[e][k] = json2;
    //         return last;
    //       });
    //       break;
    //     }
    //   }
    // }
  };
  useEffect(() => {
    if (toolName === "wordAlignment") {
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
                  rest[c][v],
                ),
              );
            }
          }
          fixOccurrences(alignBible);
          setAlignementTargetBibles(alignBible);
          setLoadingTool(false);
        }
      };

      getAlignment();
    }
  }, [toolName, targetBible]);

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
            "target_language",
            "_local_/_local_",
            true,
          ),
          isOldTestament(book)
            ? getBookFromName(
                "hbo_uhb",
                "",
                book,
                "original_language",
                "git.door43.org/uW",
              )
            : getBookFromName(
                "grc_ugnt",
                "",
                book,
                "original_language",
                "git.door43.org/uW",
              ),
          getBookFromName(
            "en_ult",
            "",
            book,
            "gateway_language",
            "git.door43.org/uW",
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
          "target_language",
        ),
      );
      let toolData;
      if (toolName === "translationWords") {
        if (!dataTw) {
          toolData = await getglTwData(
            "en_tw",
            projectName,
            `book_projects/${tCoreName}`,
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
            false,
          );

          setDataTn(toolData);
        }
      }
      if (toolName != "wordAlignment") {
        let checkingRes = await getCheckingData(
          projectName,
          `book_projects/${tCoreName}`,
          book,
          toolName,
        );
        if (toolName === "translationNotes") {
          checkingRes = await removeNotServiceTNCategories(
            "en_ta",
            "git.door43.org/uW",
            checkingRes,
          );

          checkingRes = await changeTnCategories(
            "en_ta",
            "git.door43.org/uW",
            checkingRes,
          );
        }

        setCheckingData(groupDataHelpers.extractGroupData(checkingRes));
      }
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
  const targetLanguageDetails = {
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
  };
  const getLexiconData_ = (lexiconId, entryId) => {
    const entryData = lexicon?.[lexiconId]?.[entryId] || null;
    return { [lexiconId]: { [entryId]: entryData } };
  };
  const loadLexiconEntry = (lexiconId) => {
    return lexicon;
  };
  async function saveNewAlignments(results) {
    let newVerseAlignment = wordaligner.unmerge(results.targetVerseJSON);
    newVerseAlignment["alignments"] = newVerseAlignment["alignment"];
    delete newVerseAlignment["alignment"];
    let alignment = await fsGetRust(
      projectName,
      `book_projects/${tCoreName}/apps/translationCore/alignmentData/${book}/${results.contextId.reference.chapter}.json`,
    );
    setAlignementTargetBibles((prev) => {
      const chapter = results.contextId.reference.chapter;
      const verse = results.contextId.reference.verse;

      return {
        ...prev,
        [chapter]: {
          ...prev[chapter],
          [verse]: {
            ...prev[chapter][verse],
            verseObjects: results.targetVerseJSON,
          },
        },
      };
    });
    alignment[results.contextId.reference.verse] = newVerseAlignment;
    fixOccurrences(alignment);
    await fsWriteRust(
      projectName,
      `book_projects/${tCoreName}/apps/translationCore/alignmentData/${book}/${results.contextId.reference.chapter}.json`,
      alignment,
    );
    await deleteIngredient(
      projectName,
      `book_projects/${tCoreName}/apps/translationCore/tools/wordAlignment/invalid/${results.contextId.reference.chapter}/${results.contextId.reference.verse}.json`,
      true,
    );
  }
  const showPopover = (PopoverTitle, wordDetails, positionCoord, rawData) => {
    window.prompt(`User clicked on ${JSON.stringify(rawData)}`);
  };
  useEffect(() => {
    async function setAlignmentData() {
      if (
        book &&
        alignmentTargetBible &&
        toolName &&
        originBible &&
        translate
      ) {
        const { groupsData, groupsIndex } =
          grouphelpers.initializeGroupDataForScripture(
            book,
            alignmentTargetBible,
            toolName,
            originBible,
            translate,
          );

        let invalidAlignmentChapter = await fsGetRust(
          projectName,
          `book_projects/${tCoreName}/apps/translationCore/tools/wordAlignment/invalid`,
        );
        for (let c of invalidAlignmentChapter) {
          let invVerse = await fsGetRust(
            projectName,
            `book_projects/${tCoreName}/apps/translationCore/tools/wordAlignment/invalid/${c}`,
            "_local_/_local_",
            false,
            true,
          );
          for (let v of Object.keys(invVerse)) {
            if (groupsData[`chapter_${c}`]) {
              let index = groupsData[`chapter_${c}`].findIndex(
                (e) =>
                  e.contextId.reference.verse === v.split(".")[0] &&
                  !v.endsWith(".bak"),
              );
              if (index >= 0) {
                groupsData[`chapter_${c}`][index]["invalid"] = true;
              }
            }
          }
        }

        setGroupsData(groupsData);
        setGroupsIndex(groupsIndex);
      }
    }
    setAlignmentData();
  }, [book, alignmentTargetBible, toolName, originBible, translate]);

  const ready =
    Array.isArray(bibles) &&
    bibles.length === 3 &&
    targetBible != null &&
    originBible != null &&
    ultBible != null &&
    (toolName === "wordAlignment"
      ? alignmentTargetBible && Object.keys(alignmentTargetBible).length > 0
      : checkingData != null) &&
    (toolName === "translationWords"
      ? dataTw != null
      : toolName === "translationNotes"
        ? dataTn != null
        : true) &&
    contextId != null &&
    lexicon != null &&
    saveCheckingData != null &&
    toolSettings != null &&
    !loadingTool;

  return (
    <div style={{ height: "calc(100vh - 100px)" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          px: 2,
          height: "48px",
          marginTop: "4px",
        }}
      >
        {/* LEFT: Back button */}
        <Button
          color="primary"
          size="small"
          sx={{ marginX: 1 }}
          onClick={() => (window.location.href = `/clients/uw-client-checks#`)}
        >
          <ArrowBack sx={{ mr: 1 }} />
          <Typography variant="body2">
            {doI18n("pages:uw-client-checks:back", i18nRef.current)}
          </Typography>
        </Button>
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
              <Tab key={tool} value={tool} label={changeToolName(tool)} />
            ))}
          </Tabs>
        </Box>

        {/* RIGHT spacer to keep tabs centered */}
        <Box sx={{ width: 140 }}>
          <Typography variant="h5" fontWeight="bold">
            {isOldTestament(book)
              ? BIBLE_BOOKS["oldTestament"][book]
              : BIBLE_BOOKS["newTestament"][book]}
          </Typography>
        </Box>
      </Box>
      <Divider />

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
            editedTargetVerse={changeCurrentVerse}
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
