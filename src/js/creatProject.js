/* eslint-disable no-async-promise-executor, no-throw-literal */
import _ from "lodash";
// helpers
// actions
// constants
import * as Bible from "../common/BooksOfTheBible";
import usfm, { toJSON } from "usfm-js";
import wordaligner from "word-aligner";
import { fsExistsRust, fsWriteRust, fsGetRust,updateIngredients} from "./serverUtils";
import { USER_RESOURCES_PATH, T_NOTES_CATEGORIES } from "../common/constants";
/**
 * @description Function that count occurrences of a substring in a string
 * @param {String} string - The string to search in
 * @param {String} subString - The sub string to search for
 * @return {Integer} - the count of the occurrences
 * modified to fit our use cases, return zero for '' substring, and no use case for overlapping.
 */
export const occurrences = (string, subString) => {
  if (subString.length <= 0) return 0;
  let n = 0;
  let pos = 0;
  let step = subString.length;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    pos = string.indexOf(subString, pos);
    if (pos === -1) break;
    ++n;
    pos += step;
  }
  return n;
};

function creatWordList(text) {
  let setText = new Set(
    text
      .replace(/[^\p{L}\p{N}\s]/gu, "") // remove punctuation (keep letters, numbers, underscore, spaces)
      .split(/\s+/) // split by any whitespace (space, tab, newline)
      .filter(Boolean)
  );
  let arr = [];
  for (let e of setText) {
    arr.push({ occurrence: occurrences(text, e), word: e });
  }
  return arr;
}
export function getBookFromProjectFileName(selectedProjectFilename) {
  return selectedProjectFilename.split("/")[1].split("_")[2];
}

/**
 * search through verseAlignments for word and get occurrences
 * @param {object} verseAlignments
 * @param {string|number} matchVerse
 * @param {string} word
 * @return {number}
 */
export function getWordCountInVerse(verseAlignments, matchVerse, word) {
  let matchedAlignment = null;

  for (let alignment of verseAlignments[matchVerse]) {
    for (let topWord of alignment.topWords) {
      if (topWord.word === word) {
        matchedAlignment = topWord;
        break;
      }
    }

    if (matchedAlignment) {
      break;
    }
  }

  const wordCount = matchedAlignment && matchedAlignment.occurrences;
  return wordCount || 0;
}

/**
 * called in case of invalid alignment that is not valid for the verse span, Sets alignment occurrence to high value
 *    so that alignment will be invalidated and has to be reviewed.
 * @param alignment
 */
export function invalidateAlignment(alignment) {
  delete alignment.ref;
  alignment.occurrences = 100000;
  alignment.occurrence = 100000;
}

/**
 * get all the alignments for verse from nested array (finds zaln objects)
 * @param {array} verseSpanAlignments
 * @return {object[]}
 */
export function getVerseAlignments(verseSpanAlignments) {
  let alignments = [];

  if (verseSpanAlignments) {
    for (let alignment of verseSpanAlignments) {
      if (alignment.tag === "zaln") {
        alignments.push(alignment);
      }

      if (alignment.children) {
        const subAlignments = getVerseAlignments(alignment.children);

        if (subAlignments.length) {
          alignments = alignments.concat(subAlignments);
        }
      }
    }
  }
  return alignments;
}
/**
 * business logic for convertAlignmentFromVerseToVerseSpan:
 *     convert aligned data from mapped to verse to mapped to verse span
 * @param {object} originalVerseSpanData - original bible merged to verse span
 * @param {object} alignedVerseObjects - aligned verse objects for current verse
 * @param {number|string} chapter
 * @param {number} low - low verse number of span
 * @param {number} hi - high verse number of span
 * @param blankVerseAlignments - raw verse alignments for extracting word counts for each verse
 * @return {{verseObjects}}
 */
export function convertAlignmentFromVerseToVerseSpanSub(
  originalVerseSpanData,
  alignedVerseObjects,
  chapter,
  low,
  hi,
  blankVerseAlignments
) {
  const bibleVerse = { verseObjects: originalVerseSpanData };
  const alignments = getVerseAlignments(alignedVerseObjects.verseObjects);

  for (let alignment of alignments) {
    const ref = alignment.ref || "";
    const refParts = ref.split(":");
    let verseRef;
    let chapterRef = chapter; // default to current chapter
    const word = alignment.content;
    let occurrence = alignment.occurrence;
    let occurrences = 0;

    if (refParts.length > 1) {
      // if both chapter and verse
      verseRef = parseInt(refParts[1]);
      chapterRef = refParts[0];
    } else {
      // verse only
      verseRef = parseInt(refParts[0]);
    }

    if (chapterRef.toString() !== chapter.toString()) {
      console.warn(
        `convertAlignmentFromVerseToVerseSpan() - alignment of word "${word}:${occurrence}" - chapter in ref "${ref}" does not match current chapter ${chapter} for verse span "${low}-${hi}" - skipping`
      );
      invalidateAlignment(alignment);
      continue;
    }

    if (!(occurrence > 0)) {
      console.warn(
        `convertAlignmentFromVerseToVerseSpan() - alignment of word "${word}:${occurrence}" - invalid occurrence in current verse span "${low}-${hi}" - skipping`
      );
      invalidateAlignment(alignment);
      continue;
    }

    if (!(verseRef >= low || verseRef <= hi)) {
      console.warn(
        `convertAlignmentFromVerseToVerseSpan() - alignment of word "${word}:${occurrence}" - verse in ref ${ref} is not within current verse span "${low}-${hi}" - skipping`
      );
      invalidateAlignment(alignment);
      continue;
    }

    // transform occurrence(s) from verse based to verse span
    for (let verse = low; verse <= hi; verse++) {
      const wordCount = getWordCountInVerse(blankVerseAlignments, verse, word);
      occurrences += wordCount;

      if (verse < verseRef) {
        occurrence += wordCount; // add word counts for lower verses to occurrence
      }
    }

    if (occurrence > occurrences) {
      console.warn(
        `convertAlignmentFromVerseToVerseSpan() - alignment of word "${word}:${occurrence}" - beyond ocurrences ${occurrences} in current verse span "${low}-${hi}" - skipping`
      );
      invalidateAlignment(alignment);
    } else {
      delete alignment.ref;
      alignment.occurrences = occurrences;
      alignment.occurrence = occurrence;
    }
  }
  return bibleVerse;
}

export function getVerseSpanRange(verseSpan) {
  let [low, high] = verseSpan.split("-");

  if (low && high) {
    low = parseInt(low, 10);
    high = parseInt(high, 10);

    if (low > 0 && high >= low) {
      return { low, high };
    }
  }
  return {};
}
/**
 * generate blank alignments for all the verses in a verse span
 * @param {string} verseSpan
 * @param {object} origLangChapterJson
 * @param {object} blankVerseAlignments - object to return verse alignments
 * @return {{low, hi}} get range of verses in verse span
 */
export function getRawAlignmentsForVerseSpan(
  verseSpan,
  origLangChapterJson,
  blankVerseAlignments
) {
  const { low, high } = getVerseSpanRange(verseSpan);

  // generate raw alignment data for each verse in range
  for (let verse = low; verse <= high; verse++) {
    const originalVerse = origLangChapterJson[verse];

    if (originalVerse) {
      const blankAlignments =
        wordaligner.generateBlankAlignments(originalVerse);
      blankVerseAlignments[verse] = blankAlignments;
    }
  }

  return { low, hi: high };
}

/**
 * convert aligned data from mapped to verse to mapped to verse span
 * @param {string} verseSpan - current verse
 * @param {object} originalChapterData
 * @param {object} alignedVerseObjects - aligned verse objects for current verse
 * @param {string|number} chapter - current data
 * @return {{verseObjects: object[]}} returns original language verses in verse span merged together
 */
function convertAlignmentFromVerseToVerseSpan(
  verseSpan,
  originalChapterData,
  alignedVerseObjects,
  chapter
) {
  const blankVerseAlignments = {};
  const { low, hi } = getRawAlignmentsForVerseSpan(
    verseSpan,
    originalChapterData,
    blankVerseAlignments
  );
  let originalVerseSpanData = [];

  // combine all original language verses into a verse span
  for (let verse_ = low; verse_ <= hi; verse_++) {
    const verseData = originalChapterData[verse_];
    originalVerseSpanData = originalVerseSpanData.concat(
      (verseData && verseData.verseObjects) || []
    );
  }

  const bibleVerse = convertAlignmentFromVerseToVerseSpanSub(
    originalVerseSpanData,
    alignedVerseObjects,
    chapter,
    low,
    hi,
    blankVerseAlignments
  );
  return bibleVerse;
}
/**
 * get chapter from specific resource
 * @param {String} bibleID
 * @param {String} bookId
 * @param {String} languageId
 * @param {String} chapter
 * @return {Object} contains chapter data
 */
export const loadChapterResource = async function (
  bibleID,
  bookId,
  languageId,
  chapter
) {
  try {
    let bibleData = {};
    let exist = await fsExistsRust(
      bibleID,
      `${bookId.toUpperCase()}.usfm`,
      "git.door43.org/uW"
    );
    if (exist) {
      let result = await fsGetRust(
        bibleID,
        `${bookId.toUpperCase()}.usfm`,
        "git.door43.org/uW"
      );
      let bibleChapterData = toJSON(result)["chapters"][chapter];
      for (
        let i = 0, len = Object.keys(bibleChapterData).length;
        i < len;
        i++
      ) {
        const verse = Object.keys(bibleChapterData)[i];
        if (typeof verse !== "string") {
          if (!verse.verseObjects) {
            // using old format so convert
            let newVerse = [];

            for (let word of verse) {
              if (word) {
                if (typeof word !== "string") {
                  newVerse.push(word);
                } else {
                  newVerse.push({
                    type: "text",
                    text: word,
                  });
                }
              }
            }
            bibleChapterData[i] = newVerse;
          }
        }
      }

      bibleData[chapter] = bibleChapterData;
      // get bibles manifest file
      bibleData["manifest"] = await bibleChapterData["manifest"];
    } else {
      console.log("No such file or directory was found, " + join(bookId));
    }

    return bibleData;
  } catch (error) {
    console.error(error);
  }
};

/**
 * determine Original Language and Original Language bible for book
 * @param bookId
 * @return {{resourceLanguage: string, bibleID: string}}
 */
export function getOrigLangforBook(bookId) {
  const isOT = isOldTestament(bookId);
  const languageId = isOT ? Bible.OT_ORIG_LANG : Bible.NT_ORIG_LANG;
  const bibleId = isOT ? Bible.OT_ORIG_LANG_BIBLE : Bible.NT_ORIG_LANG_BIBLE;
  return { languageId, bibleId };
}

//
/**
 * remove single trailing newline from end of string
 * @param text
 */
const trimNewLine = function (text) {
  if (text && text.length) {
    let lastChar = text.substr(-1);

    if (lastChar === "\n") {
      text = text.substr(0, text.length - 1);
    }
  }
  return text;
};
/**
 * get the original language chapter resources for project book
 * @param {string} projectBibleID
 * @param {string} chapter
 * @return {Object} resources for chapter
 */
export const getOriginalLanguageChapterResources = async function (
  projectBibleID,
  chapter
) {
  const { languageId, bibleId } = getOrigLangforBook(projectBibleID);

  return await loadChapterResource(
    bibleId === "ugnt" ? "grc_ugnt" : "hbo_uhb",
    projectBibleID,
    languageId,
    chapter
  );
};

/**
 * generate the target language bible from parsed USFM and manifest data
 * @param {Object} parsedUsfm - The object containing usfm parsed by chapters
 * @param {Object} manifest
 * @param {String} selectedProjectFilename
 * @return {Promise<any>}
 */
export const generateTargetLanguageBibleFromUsfm = async (
  parsedUsfm,
  manifest,
  sourceProjectPath,
  selectedProjectFilename
) => {
  try {
    const chaptersObject = parsedUsfm.chapters;
    const bookID =
      manifest.project.id ||
      getBookFromProjectFileName(selectedProjectFilename);
    let verseFound = false;

    let fsQueue = [];
    const alignQueue = [];

    for (const chapter of Object.keys(chaptersObject)) {
      let chapterAlignments = {};
      const bibleChapter = {};
      const verses = Object.keys(chaptersObject[chapter]);

      // check if chapter has alignment data
      const alignmentIndex = verses.findIndex((verse) => {
        const verseParts = chaptersObject[chapter][verse];
        let alignmentData = true;

        for (let part of verseParts.verseObjects) {
          if (part.type === "milestone") {
            alignmentData = true;
            break;
          }
        }
        return alignmentData;
      });
      const alignmentData = alignmentIndex >= 0;
      let bibleData;
      if (alignmentData) {
        bibleData = await getOriginalLanguageChapterResources(bookID, chapter);
      }

      verses.forEach((verse) => {
        const verseParts = chaptersObject[chapter][verse];
        let verseText;

        if (alignmentData) {
          verseText = getUsfmForVerseContent(verseParts);
        } else {
          verseText = convertVerseDataToUSFM(verseParts);
        }
        bibleChapter[verse] = trimNewLine(verseText);

        if (alignmentData && bibleData && bibleData[chapter]) {
          const chapterData = bibleData[chapter];
          let bibleVerse = chapterData[verse];

          if (isVerseSpan(verse)) {
            bibleVerse = convertAlignmentFromVerseToVerseSpan(
              verse,
              chapterData,
              verseParts,
              chapter
            );
          }

          const object = wordaligner.unmerge(verseParts, bibleVerse);

          chapterAlignments[verse] = {
            alignments: object.alignment,
            wordBank: object.wordBank,
          };
        }
        verseFound = true;
      });

      const filename = parseInt(chapter, 10) + ".json";
      fsQueue.push(
        fsWriteRust(
          sourceProjectPath,
          selectedProjectFilename + join(bookID, filename),
          bibleChapter
        )
      );

      if (alignmentData) {
        const alignmentDataPath = join(
          "apps",
          "translationCore",
          "alignmentData",
          bookID,
          filename
        );
        alignQueue.push(
          fsWriteRust(
            sourceProjectPath,
            selectedProjectFilename + alignmentDataPath,
            chapterAlignments
          )
        );
      }
    }

    fsQueue.push(
      fsWriteRust(
        sourceProjectPath,
        selectedProjectFilename + join(bookID, "headers.json"),
        parsedUsfm.headers
      )
    );

    if (alignQueue.length) {
      fsQueue.push.apply(fsQueue, alignQueue); // fast concat
    }

    if (!verseFound) {
      throw (
        <div>
          {selectedProjectFilename
            ? `No chapter & verse found in project (${selectedProjectFilename}).`
            : `No chapter & verse found in your project.`}
        </div>
      );
    }
    await Promise.all(fsQueue);
  } catch (error) {
    console.log("generateTargetLanguageBibleFromUsfm() error:", error);
    throw error;
  }
};

//
/**
 * dive down into milestone to extract words and text
 * @param {Object} verseObject - milestone to parse
 * @return {string} text content of milestone
 */
const parseMilestone = (verseObject) => {
  let text = verseObject.text || "";
  let wordSpacing = "";
  const length = verseObject.children ? verseObject.children.length : 0;

  for (let i = 0; i < length; i++) {
    let child = verseObject.children[i];

    switch (child.type) {
      case "word":
        text += wordSpacing + child.text;
        wordSpacing = " ";
        break;

      case "milestone":
        text += wordSpacing + parseMilestone(child);
        wordSpacing = " ";
        break;

      default:
        if (child.text) {
          text += child.text;
          const lastChar = text.substr(-1);

          if (
            lastChar !== "," &&
            lastChar !== "." &&
            lastChar !== "?" &&
            lastChar !== ";"
          ) {
            // legacy support, make sure padding before word
            wordSpacing = "";
          }
        }
        break;
    }
  }
  return text;
};

/**
 * test to see if verse is a verseSpan
 * @param {string|number} verse
 * @return {boolean}
 */
export function isVerseSpan(verse) {
  return verse.toString().includes("-");
}

/**
 * get text from word and milestone markers
 * @param {Object} verseObject - to parse
 * @param {String} wordSpacing - spacing to use before next word
 * @return {*} new verseObject and word spacing
 */
const replaceWordsAndMilestones = (verseObject, wordSpacing) => {
  let text = "";

  if (verseObject.type === "word") {
    text = wordSpacing + verseObject.text;
  } else if (verseObject.type === "milestone") {
    text = wordSpacing + parseMilestone(verseObject);
  }

  if (text) {
    // replace with text object
    verseObject = {
      type: "text",
      text,
    };
    wordSpacing = " ";
  } else {
    wordSpacing = " ";

    if (verseObject.nextChar) {
      wordSpacing = ""; // no need for spacing before next word if this item has it
    } else if (verseObject.text) {
      const lastChar = verseObject.text.substr(-1);

      if (![",", ".", "?", ";"].includes(lastChar)) {
        // legacy support, make sure padding before next word if punctuation
        wordSpacing = "";
      }
    }

    if (verseObject.children) {
      // handle nested
      const verseObject_ = _.cloneDeep(verseObject);
      let wordSpacing_ = "";
      const length = verseObject.children.length;

      for (let i = 0; i < length; i++) {
        const flattened = replaceWordsAndMilestones(
          verseObject.children[i],
          wordSpacing_
        );
        wordSpacing_ = flattened.wordSpacing;
        verseObject_.children[i] = flattened.verseObject;
      }
      verseObject = verseObject_;
    }
  }
  return { verseObject, wordSpacing };
};

/**
 * converts verse from verse objects to USFM string
 * @param verseData
 * @return {string}
 */
function convertVerseDataToUSFM(verseData) {
  const outputData = {
    chapters: {},
    headers: [],
    verses: { 1: verseData },
  };
  const USFM = usfm.toUSFM(outputData, { chunk: true });
  const split = USFM.split("\\v 1");

  if (split.length > 1) {
    let content = split[1];

    if (content.substr(0, 1) === " ") {
      // remove space separator
      content = content.substr(1);
    }
    return content;
  }
  return ""; // error on JSON to USFM
}

/**
 * @description convert verse from verse objects to USFM string, removing milestones and word markers
 * @param {Object|Array} verseData
 * @return {String}
 */
export const getUsfmForVerseContent = (verseData) => {
  if (verseData.verseObjects) {
    let wordSpacing = "";
    const flattenedData = [];
    const length = verseData.verseObjects.length;

    for (let i = 0; i < length; i++) {
      const verseObject = verseData.verseObjects[i];
      const flattened = replaceWordsAndMilestones(verseObject, wordSpacing);
      wordSpacing = flattened.wordSpacing;
      flattenedData.push(flattened.verseObject);
    }
    verseData = {
      // use flattened data
      verseObjects: flattenedData,
    };
  }
  return convertVerseDataToUSFM(verseData);
};

/**
 * tests if book is a Old Testament book
 * @param bookId
 * @return {boolean}
 */
export function isOldTestament(bookId) {
  return bookId in Bible.BIBLE_BOOKS.oldTestament;
}

/**
 * @description Helper function to get a bibles manifest file from the bible resources folder.
 * @param {string} bibleVersionPath - path to a bibles version folder.
 * @param {string} bibleID - bible name. ex. bhp, uhb, udt, ult.
 */
export async function getBibleManifest(bibleVersionPath, bibleID) {
  let fileName = "manifest.json";
  let bibleManifestPath = pathJoin([bibleVersionPath, fileName]);
  let manifest;
  let exist = await fsExistsRust(USER_RESOURCES_PATH, bibleManifestPath);
  if (exist) {
    manifest = await fsGetRust(USER_RESOURCES_PATH, bibleManifestPath);
  } else {
    console.error(
      `getBibleManifest() - Could not find manifest for ${bibleID} at ${bibleManifestPath}`
    );
  }
  return manifest;
}

export function convertToFullBookName(bookAbbr) {
  if (!bookAbbr) {
    return;
  }
  return Bible.ALL_BIBLE_BOOKS[bookAbbr.toString().toLowerCase()];
}

/**
 * @description get tag item from headers array
 * @param headers
 * @param tag
 * @return {String} content of tag if found, else null
 */
export function getHeaderTag(headers, tag) {
  if (headers) {
    const retVal = headers.find((header) => header.tag === tag);

    if (retVal) {
      return retVal.content;
    }
  }
  return null;
}

/**
 * @description Sets up a USFM project manifest according to tC standards.
 * @param {object} parsedUSFM - The object containing usfm parsed by header/chapters
 */
export function generateManifestForUsfmProject(parsedUSFM) {
  let usfmDetails = getUSFMDetails(parsedUSFM);
  return {
    generator: {
      name: "tc-desktop",
      build: "",
    },
    target_language: {
      id: usfmDetails.language.id || "",
      name: usfmDetails.language.name || "",
      direction: usfmDetails.language.direction || "",
      book: { name: usfmDetails.target_languge.book.name || "" },
    },
    ts_project: {
      id: usfmDetails.book.id || "",
      name: usfmDetails.book.name || "",
    },
    project: {
      id: usfmDetails.book.id || "",
      name: usfmDetails.book.name || "",
    },
    type: {
      id: "text",
      name: "Text",
    },
    source_translations: [
      {
        language_id: "en",
        resource_id: "ult",
        checking_level: "",
        date_modified: new Date(),
        version: "",
      },
    ],
    resource: {
      id: "",
      name: "",
    },
    translators: [],
    checkers: [],
    time_created: new Date(),
    tools: [],
    repo: "",
    tcInitialized: true,
  };
}
/**
 * Most important function for creating a project from a USFM file alone. This function gets the
 * book name, id, language name and direction for starting a tC project.
 * @param {object} usfmObject - Object created by USFM to JSON module. Contains information
 * for parsing and using in tC such as book name.
 */
export function getUSFMDetails(usfmObject) {
  let details = {
    book: {
      id: undefined,
      name: undefined,
    },
    language: {
      id: undefined,
      name: undefined,
      direction: "ltr",
    },
    target_languge: { book: { name: undefined } },
  };

  // adding target language book name from usfm headers
  const targetLangugeBookName = getHeaderTag(usfmObject.headers, "h");
  details.target_languge.book.name = targetLangugeBookName;

  let headerIDArray = [];
  const tag = "id";
  const id = getHeaderTag(usfmObject.headers, tag);

  if (id) {
    // Conditional to determine how USFM should be parsed.
    let isSpaceDelimited = id.split(" ").length > 1;
    let isCommaDelimited = id.split(",").length > 1;

    if (isSpaceDelimited) {
      // i.e. TIT EN_ULB sw_Kiswahili_ltr Wed Jul 26 2017 22:14:55 GMT-0700 (PDT) tc.
      // Could have attached commas if both comma delimited and space delimited
      headerIDArray = id.split(" ");
      headerIDArray.forEach((element, index) => {
        headerIDArray[index] = element.replace(",", "");
      });
      details.book.id = headerIDArray[0].trim().toLowerCase();
    } else if (isCommaDelimited) {
      // i.e. TIT, sw_Kiswahili_ltr, EN_ULB, Thu Jul 20 2017 16:03:48 GMT-0700 (PDT), tc.
      headerIDArray = id.split(",");
      details.book.id = headerIDArray[0].trim().toLowerCase();
    } else {
      // i.e. EPH
      details.book.id = id.toLowerCase();
    }

    let fullBookName = convertToFullBookName(details.book.id);

    if (fullBookName) {
      details.book.name = fullBookName;
    } else {
      fullBookName = convertToFullBookName(usfmObject.book);

      if (fullBookName) {
        details.book.name = fullBookName;
      } else {
        details.book.id = null;
      }
    }

    let tcField = headerIDArray[headerIDArray.length - 1] || "";

    if (tcField.trim() === "tc") {
      details.repo = headerIDArray[1];

      // Checking for tC field to parse with more information than standard usfm.
      for (let index in headerIDArray) {
        let languageCodeArray = headerIDArray[index].trim().split("_");

        if (languageCodeArray.length === 3) {
          details.language.id = languageCodeArray[0].toLowerCase();
          details.language.name = languageCodeArray[1].split("⋅").join(" "); // restore spaces
          details.language.direction = languageCodeArray[2].toLowerCase();
        }
      }
    }
  }
  return details;
}

/**
 * @description Parses the usfm file using usfm-parse library.
 * @param {string} usfmData - USFM data to parse
 */
export function getParsedUSFM(usfmData) {
  try {
    if (usfmData) {
      return usfm.toJSON(usfmData, {
        convertToInt: ["occurrence", "occurrences"],
      });
    }
  } catch (e) {
    console.error(e);
  }
}

const findCategoriesForTn = (groupId) => {
  let result = "other";

  Object.keys(T_NOTES_CATEGORIES).forEach((category) => {
    if (T_NOTES_CATEGORIES[category][groupId]) {
      result = category;
    }
  });

  return result;
};

const generateHelperForTool = async (
  helperFolderName,
  sourceProjectPath,
  selectedProjectFilename,
  typeOfTools
) => {
  let book = getBookFromProjectFileName(selectedProjectFilename);
  let tsv = parseTsv(
    await fsGetRust(
      helperFolderName,
      `${book.toUpperCase()}.tsv`,
      "git.door43.org/uW"
    )
  );
  const emptyJson = {
    comments: false,
    reminders: false,
    selections: false,
    verseEdits: false,
    nothingToSelect: false,
    contextId: {
      checkId: "",
      occurrenceNote: "",
      reference: { bookId: "", chapter: null, verse: null },
      tool: typeOfTools,
      groupId: "",
      quote: "",
      quoteString: "",
      glQuote: "",
      occurrence: 1,
    },
  };
  let categories = {};
  for (let i = 1; i < tsv.length; i++) {
    let category = "";
    if (typeOfTools === "translationNotes") {
      if (tsv[i][3] === "") {
        continue;
      }
      category = findCategoriesForTn(tsv[i][3].split("/").slice(-1)[0].trim());
    } else {
      category = tsv[i][5].split("/")[2].trim();
    }
    let newJson = { ...emptyJson };
    newJson.contextId.reference = {
      bookId: book,
      chapter: parseInt(tsv[i][0].split(":")[0]),
      verse: parseInt(tsv[i][0].split(":")[1]),
    };

    newJson.contextId.checkId = tsv[i][1];

    let url = "";
    if (typeOfTools === "translationNotes") {
      newJson.contextId.groupId = tsv[i][3].split("/").slice(-1)[0];
      newJson.contextId.quote = creatWordList(tsv[i][4]);
      newJson.contextId.occurrence = parseInt(tsv[i][5]);

      newJson.contextId.quoteString = tsv[i][4];
      newJson.contextId.occurrenceNote = tsv[i][6];
      url = join(
        selectedProjectFilename,
        "apps",
        "translationCore",
        "index",
        typeOfTools,
        book,
        `${tsv[i][3].split("/").slice(-1)[0].trim()}.json`
      );
    } else {
      newJson.contextId.quoteString = tsv[i][3];
      newJson.contextId.groupId = tsv[i][5].split("/").slice(-1)[0];
      newJson.contextId.quote = tsv[i][3];
      newJson.contextId.occurrence = parseInt(tsv[i][4]);

      url = join(
        selectedProjectFilename,
        "apps",
        "translationCore",
        "index",
        typeOfTools,
        book,
        `${tsv[i][5].split("/")[3].trim()}.json`
      );
    }

    let exist = await fsExistsRust(
      sourceProjectPath,
      url,
      "_local_/_local_",
      true
    );

    if (exist) {
      let alreadyHereJsonFile = await fsGetRust(sourceProjectPath, url);
      alreadyHereJsonFile.push(newJson);
      await fsWriteRust(sourceProjectPath, url, alreadyHereJsonFile);
    } else {
      await fsWriteRust(sourceProjectPath, url, [newJson]);
    }
    if (categories[category]) {
      if (typeOfTools === "translationNotes") {
        categories[category].push(`${tsv[i][3].split("/").slice(-1)[0].trim()}`);
      } else {
        categories[category].push(`${tsv[i][5].split("/")[3].trim()}`);
      }
    } else {
      if (typeOfTools === "translationNotes") {
        categories[category] = [`${tsv[i][3].split("/").slice(-1)[0].trim()}`];
      } else {
        categories[category] = [`${tsv[i][5].split("/")[3].trim()}`];
      }
    }
  }
  for (let c of Object.keys(categories)) {
    await fsWriteRust(
      sourceProjectPath,
      join(
        selectedProjectFilename,
        "apps",
        "translationCore",
        "index",
        typeOfTools,
        book,
        "categoryIndex",
        `${c}.json`
      ),
      categories[c]
    );
  }
};

/**
 * generate manifest from USFM data
 * @param {Object} parsedUsfm - The object containing usfm parsed by chapters
 * @param {string} sourceProjectPath
 * @param {string} selectedProjectFilename
 * @return {Promise<any>}
 */
export const generateManifestForUsfm = async (
  sourceProjectPath,
  selectedProjectFilename,
  parsedUsfm
) => {
  try {
    const manifest = generateManifestForUsfmProject(parsedUsfm);
    await fsWriteRust(
      sourceProjectPath,
      selectedProjectFilename + "manifest.json",
      manifest
    );
    return manifest;
  } catch (error) {
    console.log(error);
    throw (
      <div>
        Something went wrong when generating a manifest for ({sourceProjectPath}
        ).
      </div>
    );
  }
};

/*############################verifyIsValidUsfmFile####################################*/

export const verifyIsValidUsfmFile = async (
  sourceProjectPath,
  selectedProjectFilename
) => {
  const usfmName =
    getBookFromProjectFileName(selectedProjectFilename) + ".usfm";
  const usfmData = await loadUSFMFileAsync(
    sourceProjectPath,
    selectedProjectFilename + usfmName
  );

  if (usfmData.includes("\\h ") || usfmData.includes("\\id ")) {
    // moved verse checking to generateTargetLanguageBibleFromUsfm
    return usfmData;
  } else {
    throw (
      <div>
        The project you selected ({sourceProjectPath}) is an invalid usfm
        project. <br />
        Please verify the project you selected is a valid usfm file.
      </div>
    );
  }
};

/**
 * @description Loads a USFM file using the Rust backend endpoint
 * @param {String} usfmFilePath - Path of the USFM file that has been loaded
 */
export async function loadUSFMFileAsync(
  sourceProjectPath,
  selectedProjectFilename
) {
  try {
    const usfmText = await fsGetRust(
      sourceProjectPath,
      selectedProjectFilename
    );
    if (!usfmText)
      throw new Error(
        `Failed to get USFM content from Rust endpoint: ${selectedProjectFilename}`
      );
    return usfmText;
  } catch (e) {
    console.error("Error loading USFM via Rust:", e);
    return null;
  }
}

/*
##########################################moveUsfmFileFromSourceToImports########################*/
export const moveUsfmFileFromSourceToImports = async (
  sourceProjectPath,
  manifest,
  selectedProjectFilename
) => {
  try {
    const usfmData = await fsGetRust(
      sourceProjectPath,
      selectedProjectFilename
    );
    const projectId =
      manifest && manifest.project && manifest.project.id
        ? manifest.project.id
        : undefined;
    const usfmFilename = projectId
      ? projectId + ".usfm"
      : selectedProjectFilename + ".usfm";
    await fsWriteRust(sourceProjectPath, usfmFilename, usfmData);
  } catch (error) {
    console.log("moveUsfmFileFromSourceToImports()", error);
    throw (
      <div>
        {sourceProjectPath
          ? `Something went wrong when importing (${sourceProjectPath}).`
          : `Something went wrong when importing your project.`}
      </div>
    );
  }
};

export const join = (...args) => args.join("/").replace(/\/+/g, "/");
const parseTsv = (tsv) => {
  return tsv
    .split("\n")
    .filter((e) => e.trim() !== "")
    .map((e) => e.split("\t"));
};
function pathJoin(table) {
  return table.join("/").replace(/\/+/g, "/");
}
/*################################################################*/
export const convertToProjectFormat = async (
  sourceProjectPath,
  selectedProjectFilename
) => {
  // let book = selectedProjectFilename.split('_')[2]+
  const usfmData = await verifyIsValidUsfmFile(
    sourceProjectPath,
    selectedProjectFilename
  );
  await generateHelperForTool(
    "en_tw",
    sourceProjectPath,
    selectedProjectFilename,
    "translationWords"
  );
  await generateHelperForTool(
    "en_tn",
    sourceProjectPath,
    selectedProjectFilename,
    "translationNotes"
  );
  const parsedUsfm = getParsedUSFM(usfmData);
  const manifest = await generateManifestForUsfm(
    sourceProjectPath,
    selectedProjectFilename,
    parsedUsfm
  );
  // await moveUsfmFileFromSourceToImports(
  //   sourceProjectPath,
  //   manifest,
  //   selectedProjectFilename
  // );
  await generateTargetLanguageBibleFromUsfm(
    parsedUsfm,
    manifest,
    sourceProjectPath,
    selectedProjectFilename
  );
  await updateIngredients(sourceProjectPath)
};
