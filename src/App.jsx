import React, { useState } from 'react';
import {Checker, TranslationUtils} from 'tc-checking-tool-rcl';
import { groupDataHelpers } from 'word-aligner-lib'

// Load sample data from fixtures
const LexiconData = require("./uwSrc/__tests__/fixtures/lexicon/lexicons.json");
const translations = require('./uwSrc/locales/English-en_US.json')
const glTn = require('./uwSrc/__tests__/fixtures/translationNotes/enTn_1JN.json')
const glTw = require('./uwSrc/__tests__/fixtures/translationWords/twl_1jn_parsed.json')
const glTaData = require('./uwSrc/__tests__/fixtures/translationAcademy/en_ta.json')
const glTwData = require('./uwSrc/__tests__/fixtures/translationWords/en_tw.json')
const ugntBible = require('./uwSrc/__tests__/fixtures/bibles/1jn/ugntBible.json')
const enGlBible = require('./uwSrc/__tests__/fixtures/bibles/1jn/enGlBible.json')
// Extract checking data from the translation notes
const checkingData = groupDataHelpers.extractGroupData(glTw)
const targetBible = require('./uwSrc/__tests__/fixtures/bibles/1jn/targetBible.json')

// Configuration settings
const checkingTranslationWords = 'translationWords';
const showDocument = true // set to false to disable showing ta or tw document
const bookId = "1jn"
const bookName = "1 John"
const targetLanguageId = 'en'
const targetLanguageName = "English"
const targetLanguageDirection = "ltr"
const gatewayLanguageId = "en"
const gatewayLanguageOwner = "unfoldingWord"

const checkingType = checkingTranslationWords ? Checker.translationNotes : Checker.translationNotes;

// Initial context for checking (verse and word to check)
const contextId_ =
  {
    "reference": {
      "bookId": bookId,
      "chapter": 2,
      "verse": 17
    },
    "tool": "translationWords",
    "groupId": "age",
    "quote": "αἰῶνα",
    "strong": [
      "G01650"
    ],
    "lemma": [
      "αἰών"
    ],
    "occurrence": 1
  }

// Target language metadata
const targetLanguageDetails = {
  id: targetLanguageId,
  name: targetLanguageName,
  direction: targetLanguageDirection,
  gatewayLanguageId,
  gatewayLanguageOwner,
  book: {
    id: bookId,
    name: bookName
  }
}

// Bible data configuration for all languages
const bibles = [
  {
    book: targetBible,
    languageId: 'targetLanguage',
    bibleId: 'targetBible',
    owner: 'unfoldingWord'
  },
  {
    book: enGlBible,
    languageId: 'en',
    bibleId: 'ult',
    owner: 'unfoldingWord'
  },
  {
    book: ugntBible,
    languageId: 'el-x-koine',
    bibleId: 'ugnt',
    owner: 'unfoldingWord'
  }
]

// Translation helper function for UI strings
const translate = (key) => {
  const translation = TranslationUtils.lookupTranslationForKey(translations, key)
  return translation
};

// Callback for when settings are saved
const saveSettings = (settings) => {
  console.log(`saveSettings`, settings)
};

// Callback for when checking data changes
const saveCheckingData = (newState) => {
  const selections = newState && newState.selections
  console.log(`saveCheckingData - new selections`, selections)
  const currentContextId = newState && newState.currentContextId
  console.log(`saveCheckingData - current context data`, currentContextId)
}

console.log('CheckerTN.md - startup')

const App = () => {
  // State management for current context
  const [contextId, setCcontextId] = useState(contextId_)

  // Lexicon lookup
  const getLexiconData_ = (lexiconId, entryId) => {
    console.log(`loadLexiconEntry(${lexiconId}, ${entryId})`)
    const entryData = (LexiconData && LexiconData[lexiconId]) ? LexiconData[lexiconId][entryId] : null;
    return { [lexiconId]: { [entryId]: entryData } };
  };
  console.log(glTwData)
  console.log(targetLanguageDetails)
  console.log(checkingTranslationWords)
  return (
    <>
      <div style={{ height: '600px', width: '1200px' }}>
        <Checker
          styles={{ width: '100%', height: '100%', overflowX: 'auto', overflowY: 'auto' }}
          alignedGlBible={enGlBible}
          bibles={bibles}
          checkingData={checkingData}
          checkType={checkingTranslationWords}
          contextId={contextId}
          getLexiconData={getLexiconData_}
          glWordsData={glTwData}
          saveCheckingData={saveCheckingData}
          saveSettings={saveSettings}
          showDocument={showDocument}
          targetBible={targetBible}
          targetLanguageDetails={targetLanguageDetails}
          translate={translate}
        />
      </div>
    </>
  );
};

export default App;