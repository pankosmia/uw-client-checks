import { useContext, useState, useCallback, useEffect } from 'react';
import { Grid2 } from "@mui/material";
import { i18nContext, doI18n } from "pithekos-lib";
import { getBookFromName } from '../pages/tw';
import SuggestingWordAligner from "./components/SuggestingWordAligner";

import {
    addAlignmentsToVerseUSFM,
    areAlgnmentsComplete,
    parseUsfmToWordAlignerData
} from "./utils/alignmentHelpers";


import {convertVerseDataToUSFM} from "./utils/UsfmFileConversionHelpers";
import {NT_ORIG_LANG} from "./common/constants";

// var alignedVerseJson = require('../__tests__/fixtures/alignments/en_ult_tit_1_1.json');
var alignedVerseJson = require('./__tests__/fixtures/alignments/en_ult_tit_1_1_partial.json');
var originalVerseJson = require('./__tests__/fixtures/alignments/grk_tit_1_1.json');
const LexiconData = require("./__tests__/fixtures/lexicon/lexicons.json");
const suggestionsOnly = true;  // set true to remove clear button and add suggestions label



const translate = (key) => {
    const lookup = {
        "suggestions.refresh_suggestions": "Refresh suggestions.",
        "suggestions.refresh"            : "Refresh",
        "suggestions.accept_suggestions" : "Accept all suggestions.",
        "suggestions.accept"             : "Accept",
        "suggestions.reject_suggestions" : "Reject all suggestions.",
        "suggestions.reject"             : "Reject",
        "alignments.clear_alignments"    : "Clear all alignments.",
        "alignments.clear"               : "Clear",
        "suggestions.title"              : "Suggestions:",
    };
    if( !(key in lookup) ){
        console.log(`translate(${key})`)
    }else{
        return lookup[key];
    }
};

const targetVerseUSFM = alignedVerseJson.usfm;
const sourceVerseUSFM = originalVerseJson.usfm;

const {targetWords, verseAlignments} = parseUsfmToWordAlignerData(targetVerseUSFM, sourceVerseUSFM);
console.log(targetWords,verseAlignments)
const alignmentComplete = areAlgnmentsComplete(targetWords, verseAlignments);
console.log(`Alignments are ${alignmentComplete ? 'COMPLETE!' : 'incomplete'}`);

function WordAligner() {
  const project = 'en_bsb_tit_book'
  const [targetBible, setTargetBible] = useState()

    useEffect(() => {
        async function loadBible() {
        const bible = await getBookFromName("book_projects/" + project, project.split('_')[2]);
        setTargetBible(bible);
        
        }
        loadBible();
    }, []);


  const [maxWindowHeight, setMaxWindowHeight] = useState(window.innerHeight - 64);
  const handleWindowResize = useCallback(event => {
    setMaxWindowHeight(window.innerHeight - 64);
  }, []);
  const {i18nRef} = useContext(i18nContext);

  useEffect(() => {
    window.addEventListener('resize', handleWindowResize);
    return () => {
        window.removeEventListener('resize', handleWindowResize);
    };
  }, [handleWindowResize]);

    const targetLanguageFont = '';
    const sourceLanguage = NT_ORIG_LANG;
    const lexicons = {};
    const contextId = {
        "reference": {
            "bookId": "tit",
            "chapter": 1,
            "verse": 1
        },
        "tool": "wordAlignment",
        "groupId": "chapter_1"
    };
    const showPopover = (PopoverTitle, wordDetails, positionCoord, rawData) => {
        console.log(`showPopover()`, rawData)
        window.prompt(`User clicked on ${JSON.stringify(rawData)}`)
    };
    const loadLexiconEntry = (key) => {
        console.log(`loadLexiconEntry(${key})`)
        return LexiconData
    };
    const getLexiconData_ = (lexiconId, entryId) => {
        console.log(`loadLexiconEntry(${lexiconId}, ${entryId})`)
        const entryData = (LexiconData && LexiconData[lexiconId]) ? LexiconData[lexiconId][entryId] : null;
        return {[lexiconId]: {[entryId]: entryData}};
    };

    function onChange(results) {
        console.log(`SuggestingWordAligner() - alignment changed, results`, results);// merge alignments into target verse and convert to USFM
        const {targetWords, verseAlignments} = results;
        const verseUsfm = addAlignmentsToVerseUSFM(targetWords, verseAlignments, targetVerseUSFM);
        console.log(verseUsfm);
        const alignmentComplete = areAlgnmentsComplete(targetWords, verseAlignments);
        console.log(`Alignments are ${alignmentComplete ? 'COMPLETE!' : 'incomplete'}`);
    }

  return <Grid2 container spacing={2} sx={{ maxHeight: maxWindowHeight }}>
      <Grid2 size={12}>
          <SuggestingWordAligner
              contextId={contextId}
              suggestionsOnly={suggestionsOnly}
              getLexiconData={getLexiconData_}
              lexicons={lexicons}
              loadLexiconEntry={loadLexiconEntry}
              onChange={onChange}
              showPopover={showPopover}
              sourceLanguage={sourceLanguage}
              styles={{ maxHeight: '450px', overflowY: 'auto' }}
              translate={translate}
              targetLanguageFont={targetLanguageFont}
              verseAlignments={verseAlignments}
              targetWords={targetWords}

          />
      </Grid2>
  </Grid2>
}

export default WordAligner;