/* eslint-disable no-async-promise-executor, no-throw-literal */
import _ from "lodash";
// helpers
// actions
// constants
import * as Bible from "../common/BooksOfTheBible";
import usfm from "usfm-js";
import { verseHelpers } from "tc-ui-toolkit";
import wordaligner, { VerseObjectUtils } from "word-aligner";

let treeCache = []; // cache tree data across calls

let IMPORTS_PATH = "burrito/ingredient/raw/_local_/_local_/en_bsb?ipath=";
let USER_RESOURCES_PATH = IMPORTS_PATH;
let EXIST_PATH = "/burrito/paths/_local_/_local_/";
let BASE_URL = "http://127.0.0.1:19119";

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
  const { low, high } = verseHelpers.getVerseSpanRange(verseSpan);

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
    let bibleData;
    let bibleFolderPath = join(languageId, "bibles", bibleID); // ex. user/NAME/translationCore/resources/en/bibles/ult
    let exist = await fsExistsRust(USER_RESOURCES_PATH, bibleFolderPath);
    if (exist) {
      let versionNumbers;
      let result = await fsGetRust(USER_RESOURCES_PATH, bibleFolderPath);
      versionNumbers = result.filter(
        (
          folder // filter out .DS_Store
        ) => folder !== ".DS_Store"
      );

      // ex. v9}
      const versionNumber = versionNumbers[versionNumbers.length - 1];
      let bibleVersionPath = join(languageId, "bibles", bibleID, versionNumber);
      let fileName = chapter + ".json";
      let exist = await fsExistsRust(
        USER_RESOURCES_PATH,
        join(bibleVersionPath, bookId, fileName)
      );
      if (exist) {
        bibleData = {};
        let bibleChapterData = JSON.parse(
          await fsGetRust(
            USER_RESOURCES_PATH,
            join(bibleVersionPath, bookId, fileName)
          )
        );
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
        bibleData["manifest"] = await getBibleManifest(
          bibleVersionPath,
          bibleID
        );
      } else {
        console.log(
          "No such file or directory was found, " +
            join(bibleVersionPath, bookId, fileName)
        );
      }
    } else {
      console.log("Directory not found, " + bibleFolderPath);
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
    bibleId,
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
  selectedProjectFilename
) => {
  try {
    const chaptersObject = parsedUsfm.chapters;
    const bookID = manifest.project.id || selectedProjectFilename;
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
        let alignmentData = false;

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
        fsWriteRust(IMPORTS_PATH, join(bookID, filename), bibleChapter)
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
          fsWriteRust(IMPORTS_PATH, alignmentDataPath, chapterAlignments)
        );
      }
    }

    fsQueue.push(
      fsWriteRust(
        IMPORTS_PATH,
        join(bookID, "headers.json"),
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

/**
 * generate manifest from USFM data
 * @param {Object} parsedUsfm - The object containing usfm parsed by chapters
 * @param {string} sourceProjectPath
 * @param {string} selectedProjectFilename
 * @return {Promise<any>}
 */
export const generateManifestForUsfm = async (
  parsedUsfm,
  sourceProjectPath,
  selectedProjectFilename
) => {
  try {
    const manifest = generateManifestForUsfmProject(parsedUsfm);
    const manifestPath = sourceProjectPath;
    await fsWriteRust(manifestPath, "manifest.json", manifest);
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

export const verifyIsValidUsfmFile = async (sourceProjectPath) => {
  const usfmData = await loadUSFMFileAsync(pathJoin([sourceProjectPath]));

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
export async function loadUSFMFileAsync(usfmFilePath) {
  try {
    const usfmText = await fsGetRust(IMPORTS_PATH, usfmFilePath);
    if (!usfmText)
      throw new Error(
        `Failed to get USFM content from Rust endpoint: ${usfmFilePath}`
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

/**
 * GET /ingredient/raw/<repo_path>?ipath=<ipath>
 * Simulates fs.readFile or fs.readJson
 * @param {string} repoPath - e.g. "ingredient/raw/git.door43.org/BurritoTruck/en_bsb"
 * @param {string} ipath - internal file path, e.g. "MAT.usfm" or "manifest.json"
 * @returns {Promise<string>} raw file content
 */
export async function fsGetRust(repoPath, ipath) {
  try {
    if (ipath.split("/").slice(-1)[0].split('.').length === 1) {
      if (treeCache.length <= 0) {
        let repo = repoPath.split('/').slice(-1)[0].split('?')[0]
        const url = EXIST_PATH+repo;
        const res = await fetch(url);
        const data = await res.json();
        treeCache = data;
      }
      console.log(repoPath,ipath)
      // Filter to keep only items in or under this path
      const children = treeCache
        .filter((item) => item.startsWith(ipath + "/"))
        // Remove the ipath prefix
        .map((item) => item.replace(ipath + "/", ""));
      console.log(children)
      // Collect unique first-level entries only
      const inDirectory = new Set();

      for (const entry of children) {
        const firstPart = entry.split("/")[0];
        if (firstPart) inDirectory.add(firstPart);
      }
      
      return Array.from(inDirectory);
    } else {
      let url = `${BASE_URL}/${repoPath}${ipath}`;
      return fetch(url).then((res) => {
        if (!res.ok) {
          throw new Error(`GET failed: ${res.status} ${res.statusText}`);
        }
        return res.text();
      });
    }
  } catch (err) {
    console.error(`fsGetRust(${repoPath}, ${ipath}) error:`, err);
    throw err;
  }
}

/**
 * POST /ingredient/raw/<repo_path>?ipath=<ipath>
 * Simulates fs.outputFile or fs.outputJson
 * @param {string} repoPath - e.g. "ingredient/raw/git.door43.org/BurritoTruck/en_bsb"
 * @param {string} ipath - internal file path, e.g. "manifest.json"
 * @param {string|object} data - content to write
 * @returns {Promise<void>}
 */
export async function fsWriteRust(repoPath, ipath, data) {
  try {
    let url = `${BASE_URL}/${repoPath}${ipath}`;

    const body = {
      payload: typeof data === "object" ? JSON.stringify(data, null, 2) : data,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`POST failed: ${res.status} ${res.statusText}`);
    }
  } catch (err) {
    console.error(`fsWriteRust(${repoPath}, ${ipath}) error:`, err);
    throw err;
  }
}

export async function fsExistsRust(repoPath, ipath) {
  try {
    if (treeCache.length <= 0) {
      let repo = repoPath.split('/').slice(-1)[0].split('?')[0]
      let url = EXIST_PATH+repo;
      const res = await fetch(url);
      const data = await res.json();
      treeCache = data;
    }

    const found = treeCache.some((item) => item.includes(ipath));
    return found;
  } catch (err) {
    console.error(`fsExistsRust(${repoPath}, ${ipath}) error:`, err);
    return false;
  }
}
const join = (...args) => args.join("/").replace(/\/+/g, "/");

function pathJoin(table) {
  return table.join("/").replace(/\/+/g, "/");
}
/*################################################################*/
export const convertToProjectFormat = async (
  sourceProjectPath,
  selectedProjectFilename
) => {
  IMPORTS_PATH = sourceProjectPath;
  USER_RESOURCES_PATH = IMPORTS_PATH.split('=')[0] + '=';

  const usfmData = await verifyIsValidUsfmFile(selectedProjectFilename);
  const parsedUsfm = getParsedUSFM(usfmData);
  const manifest = await generateManifestForUsfm(
    parsedUsfm,
    sourceProjectPath,
    selectedProjectFilename
  );
  await moveUsfmFileFromSourceToImports(
    sourceProjectPath,
    manifest,
    selectedProjectFilename
  );
  await generateTargetLanguageBibleFromUsfm(
    parsedUsfm,
    manifest,
    selectedProjectFilename
  );
};
