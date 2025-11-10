/* eslint-disable no-async-promise-executor, no-throw-literal */
import _ from 'lodash';
// helpers
// actions
// constants
import * as Bible from '../common/BooksOfTheBible';
import usfm from 'usfm-js';
const IMPORTS_PATH = "burrito/ingredient/raw/git.door43.org/BurritoTruck/en_bsb?ipath=MAT.usfm";

/**
 * dive down into milestone to extract words and text
 * @param {Object} verseObject - milestone to parse
 * @return {string} text content of milestone
 */
const parseMilestone = verseObject => {
  let text = verseObject.text || '';
  let wordSpacing = '';
  const length = verseObject.children ? verseObject.children.length : 0;

  for (let i = 0; i < length; i++) {
    let child = verseObject.children[i];

    switch (child.type) {
    case 'word':
      text += wordSpacing + child.text;
      wordSpacing = ' ';
      break;

    case 'milestone':
      text += wordSpacing + parseMilestone(child);
      wordSpacing = ' ';
      break;

    default:
      if (child.text) {
        text += child.text;
        const lastChar = text.substr(-1);

        if ((lastChar !== ',') && (lastChar !== '.') && (lastChar !== '?') && (lastChar !== ';')) { // legacy support, make sure padding before word
          wordSpacing = '';
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
  return verse.toString().includes('-');
}


/**
 * get text from word and milestone markers
 * @param {Object} verseObject - to parse
 * @param {String} wordSpacing - spacing to use before next word
 * @return {*} new verseObject and word spacing
 */
const replaceWordsAndMilestones = (verseObject, wordSpacing) => {
  let text = '';

  if (verseObject.type === 'word') {
    text = wordSpacing + verseObject.text;
  } else if (verseObject.type === 'milestone') {
    text = wordSpacing + parseMilestone(verseObject);
  }

  if (text) { // replace with text object
    verseObject = {
      type: 'text',
      text,
    };
    wordSpacing = ' ';
  } else {
    wordSpacing = ' ';

    if (verseObject.nextChar) {
      wordSpacing = ''; // no need for spacing before next word if this item has it
    } else if (verseObject.text) {
      const lastChar = verseObject.text.substr(-1);

      if (![',', '.', '?', ';'].includes(lastChar)) { // legacy support, make sure padding before next word if punctuation
        wordSpacing = '';
      }
    }

    if (verseObject.children) { // handle nested
      const verseObject_ = _.cloneDeep(verseObject);
      let wordSpacing_ = '';
      const length = verseObject.children.length;

      for (let i = 0; i < length; i++) {
        const flattened =
          replaceWordsAndMilestones(verseObject.children[i], wordSpacing_);
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
    'chapters': {},
    'headers': [],
    'verses': { '1': verseData },
  };
  const USFM = usfm.toUSFM(outputData, { chunk: true });
  const split = USFM.split('\\v 1');

  if (split.length > 1) {
    let content = split[1];

    if (content.substr(0, 1) === ' ') { // remove space separator
      content = content.substr(1);
    }
    return content;
  }
  return ''; // error on JSON to USFM
}


/**
 * @description convert verse from verse objects to USFM string, removing milestones and word markers
 * @param {Object|Array} verseData
 * @return {String}
 */
export const getUsfmForVerseContent = (verseData) => {
  if (verseData.verseObjects) {
    let wordSpacing = '';
    const flattenedData = [];
    const length = verseData.verseObjects.length;

    for (let i = 0; i < length; i++) {
      const verseObject = verseData.verseObjects[i];
      const flattened = replaceWordsAndMilestones(verseObject, wordSpacing);
      wordSpacing = flattened.wordSpacing;
      flattenedData.push(flattened.verseObject);
    }
    verseData = { // use flattened data
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
export function getBibleManifest(bibleVersionPath, bibleID) {
  let fileName = 'manifest.json';
  let bibleManifestPath = pathJoin([bibleVersionPath, fileName]);
  let manifest;

  if (fsExistsRust(bibleManifestPath)) {
    manifest = fsGetRust(bibleManifestPath,"");
  } else {
    console.error(
      `getBibleManifest() - Could not find manifest for ${bibleID} at ${bibleManifestPath}`);
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
    const retVal = headers.find(header => header.tag === tag);

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
      name: 'tc-desktop',
      build: '',
    },
    target_language: {
      id: usfmDetails.language.id || '',
      name: usfmDetails.language.name || '',
      direction: usfmDetails.language.direction || '',
      book: { name: usfmDetails.target_languge.book.name || '' },
    },
    ts_project: {
      id: usfmDetails.book.id || '',
      name: usfmDetails.book.name || '',
    },
    project: {
      id: usfmDetails.book.id || '',
      name: usfmDetails.book.name || '',
    },
    type: {
      id: 'text',
      name: 'Text',
    },
    source_translations: [
      {
        language_id: 'en',
        resource_id: 'ult',
        checking_level: '',
        date_modified: new Date(),
        version: '',
      },
    ],
    resource: {
      id: '',
      name: '',
    },
    translators: [],
    checkers: [],
    time_created: new Date(),
    tools: [],
    repo: '',
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
      direction: 'ltr',
    },
    target_languge: { book: { name: undefined } },
  };

  // adding target language book name from usfm headers
  const targetLangugeBookName = getHeaderTag(usfmObject.headers, 'h');
  details.target_languge.book.name = targetLangugeBookName;

  let headerIDArray = [];
  const tag = 'id';
  const id = getHeaderTag(usfmObject.headers, tag);

  if (id) {
    // Conditional to determine how USFM should be parsed.
    let isSpaceDelimited = id.split(' ').length > 1;
    let isCommaDelimited = id.split(',').length > 1;

    if (isSpaceDelimited) {
      // i.e. TIT EN_ULB sw_Kiswahili_ltr Wed Jul 26 2017 22:14:55 GMT-0700 (PDT) tc.
      // Could have attached commas if both comma delimited and space delimited
      headerIDArray = id.split(' ');
      headerIDArray.forEach((element, index) => {
        headerIDArray[index] = element.replace(',', '');
      });
      details.book.id = headerIDArray[0].trim().toLowerCase();
    } else if (isCommaDelimited) {
      // i.e. TIT, sw_Kiswahili_ltr, EN_ULB, Thu Jul 20 2017 16:03:48 GMT-0700 (PDT), tc.
      headerIDArray = id.split(',');
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

    let tcField = headerIDArray[headerIDArray.length - 1] || '';

    if (tcField.trim() === 'tc') {
      details.repo = headerIDArray[1];

      // Checking for tC field to parse with more information than standard usfm.
      for (let index in headerIDArray) {
        let languageCodeArray = headerIDArray[index].trim().split('_');

        if (languageCodeArray.length === 3) {
          details.language.id = languageCodeArray[0].toLowerCase();
          details.language.name = languageCodeArray[1].split('⋅').join(' '); // restore spaces
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
      return usfm.toJSON(usfmData, { convertToInt: ['occurrence', 'occurrences'] });
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
export const generateManifestForUsfm = async (parsedUsfm, sourceProjectPath, selectedProjectFilename) => {
  try {
    const manifest = generateManifestForUsfmProject(parsedUsfm);
    console.log(manifest)
    const manifestPath = sourceProjectPath;
    await fsWriteRust(manifestPath,'manifest.json',manifest);
    return manifest;
  } catch (error) {
    console.log(error);
    throw (
      <div>
          Something went wrong when generating a manifest for ({sourceProjectPath}).
      </div>
    );
  }
};

/*############################verifyIsValidUsfmFile####################################*/

export const verifyIsValidUsfmFile = async (sourceProjectPath) => {
  const usfmData = await loadUSFMFileAsync(pathJoin([sourceProjectPath]));

  if (usfmData.includes('\\h ') || usfmData.includes('\\id ')) { // moved verse checking to generateTargetLanguageBibleFromUsfm
    return usfmData;
  } else {
    throw (
      <div>
          The project you selected ({sourceProjectPath}) is an invalid usfm project. <br/>
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
    const usfmText = await fsGetRust(usfmFilePath,"");
    if (!usfmText) throw new Error(`Failed to get USFM content from Rust endpoint: ${usfmFilePath}`);
    return usfmText;
  } catch (e) {
    console.error('Error loading USFM via Rust:', e);
    return null;
  }
}



/*
##########################################moveUsfmFileFromSourceToImports########################*/
export const moveUsfmFileFromSourceToImports = async (sourceProjectPath, manifest, selectedProjectFilename) => {
  try {
    const usfmData = await fetch(sourceProjectPath);
    const projectId = manifest && manifest.project && manifest.project.id ? manifest.project.id : undefined;
    const usfmFilename = projectId ? projectId + '.usfm' : selectedProjectFilename + '.usfm';
    const newUsfmProjectImportsPath = pathJoin([IMPORTS_PATH, selectedProjectFilename]);
    await fsWriteRust(newUsfmProjectImportsPath,usfmFilename,usfmData);
  } catch (error) {
    console.log('moveUsfmFileFromSourceToImports()', error);
    throw (
      <div>
        {
          sourceProjectPath ?
            `Something went wrong when importing (${sourceProjectPath}).`
            :
            `Something went wrong when importing your project.`
        }
      </div>
    );
  }
};


const BASE_URL = "http://127.0.0.1:19119";

/**
 * GET /ingredient/raw/<repo_path>?ipath=<ipath>
 * Simulates fs.readFile or fs.readJson
 * @param {string} repoPath - e.g. "ingredient/raw/git.door43.org/BurritoTruck/en_bsb"
 * @param {string} ipath - internal file path, e.g. "MAT.usfm" or "manifest.json"
 * @returns {Promise<string>} raw file content
 */
export async function fsGetRust(repoPath, ipath) {
  try {
    let url = `${BASE_URL}/${repoPath}${ipath}`

    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`GET failed: ${res.status} ${res.statusText}`);
    }

    return await res.text();
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
    let url = `${BASE_URL}/${repoPath}${ipath}`
    
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
    console.log(url)
    console.log(`✅ fsWriteRust: Wrote ${ipath} successfully`);
  } catch (err) {
    console.error(`fsWriteRust(${repoPath}, ${ipath}) error:`, err);
    throw err;
  }
}

export async function fsExistsRust(repoPath, ipath) {
  try {
    await fsGetRust(repoPath, ipath);
    return true;
  } catch {
    return false;
  }
}
const join = (...args) => args.join("/").replace(/\/+/g, "/");

function pathJoin(table){
  return table.join("/").replace(/\/+/g, "/");
}
/*################################################################*/
export const convertToProjectFormat = async (sourceProjectPath, selectedProjectFilename) => {
  const usfmData = await verifyIsValidUsfmFile(sourceProjectPath+selectedProjectFilename);
  const parsedUsfm = getParsedUSFM(usfmData);
  const manifest = await generateManifestForUsfm(parsedUsfm, sourceProjectPath, selectedProjectFilename);
  // await moveUsfmFileFromSourceToImports(sourceProjectPath, manifest, selectedProjectFilename);
  // await generateTargetLanguageBibleFromUsfm(parsedUsfm, manifest, selectedProjectFilename);
};
