import { createSlice } from "@reduxjs/toolkit";
// import { apiHelpers } from "tc-source-content-updater";
import * as Bible from "../../common/BooksOfTheBible";
// import { addOwner } from "../helpers/ResourcesHelpers";

const initialState = {
  bibles: {},
  translationHelps: {},
  lexicons: {},
};

const resourcesReducer = createSlice({
  name: "resources",
  initialState,
  reducers: {
    
    // addBibleToResources: (state, action) => {
    //   const { languageId, owner, bibleId, bibleData } = action.payload;

    //   const languageAndOwner = owner
    //     ? addOwner(languageId, owner)
    //     : languageId;

    //   if (!state.bibles[languageAndOwner]) {
    //     state.bibles[languageAndOwner] = {};
    //   }

    //   state.bibles[languageAndOwner][bibleId] = bibleData;

    //   // backward compatibility
    //   if (owner === apiHelpers.DOOR43_CATALOG) {
    //     if (!state.bibles[languageId]) {
    //       state.bibles[languageId] = {};
    //     }
    //     state.bibles[languageId][bibleId] = bibleData;
    //   }
    // },

    // updateTargetVerse: (state, action) => {
    //   const { chapter, verse, editedText } = action.payload;

    //   if (!state.bibles.targetLanguage) state.bibles.targetLanguage = {};
    //   if (!state.bibles.targetLanguage.targetBible)
    //     state.bibles.targetLanguage.targetBible = {};
    //   if (!state.bibles.targetLanguage.targetBible[chapter])
    //     state.bibles.targetLanguage.targetBible[chapter] = {};

    //   state.bibles.targetLanguage.targetBible[chapter][verse] = editedText;
    // },

    addTranslationHelpsArticle: (state, action) => {
      const { resourceType, articleId, articleData } = action.payload;

      if (!state.translationHelps[resourceType])
        state.translationHelps[resourceType] = {};

      state.translationHelps[resourceType][articleId] = articleData;
    },

    addLexiconEntry: (state, action) => {
      const { lexiconId, entryId, entryData } = action.payload;

      if (!state.lexicons[lexiconId]) state.lexicons[lexiconId] = {};

      state.lexicons[lexiconId][entryId] = entryData;
    },

    clearResources: () => initialState,
  },
});

// === ACTION EXPORTS ==========================================================
export const {
  // addBibleToResources,
  // updateTargetVerse,
  addTranslationHelpsArticle,
  addLexiconEntry,
  clearResources,
} = resourcesReducer.actions;

// === REDUCER ================================================================
export default resourcesReducer.reducer;

// === SELECTORS (unchanged, same behavior as old reducer) ====================
export const getTargetBook = (state) =>
  state.bibles.targetLanguage?.targetBible;

export const getTargetChapter = (state, chapter) =>
  state.bibles.targetLanguage?.targetBible?.[chapter + ""];

export const getTargetVerse = (state, chapter, verse) =>
  getTargetChapter(state, chapter)?.[verse + ""] || null;

export const getSourceBook = (state, owner) => {
  const origLangOwner = addOwner("originalLanguage", owner);
  const allOL = state.resources.bibles[origLangOwner];

  return (
    allOL?.[Bible.NT_ORIG_LANG_BIBLE] ||
    allOL?.[Bible.OT_ORIG_LANG_BIBLE] ||
    null
  );
};

export const getOriginalChapter = (state, chapter) =>
  getSourceBook(state)?.[chapter + ""] || null;

export const getOriginalVerse = (state, chapter, verse) =>
  getOriginalChapter(state, chapter)?.[verse + ""] || null;

export const getBibles = (state) => state.resources.bibles;

export const getSourceBookManifest = (state, owner) =>
  getSourceBook(state, owner)?.manifest || null;


/**
 * append owner to key
 * @param key
 * @param owner
 * @return {string}
 */
export function addOwner(key, owner) {
  const result = `${key}_${owner}`;
  return result;
}