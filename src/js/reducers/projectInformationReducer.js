import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  bookId: "",
  resourceId: "",
  nickname: "",
  languageId: "",
  languageName: "",
  languageDirection: "",
  contributors: [],
  checkers: [],
  alreadyImported: false,
  usfmProject: false,
  localImport: false,
  overwritePermitted: false,
  skipProjectNameCheck: false,
  projectFont: "default",
};

const projectInformationReducer = createSlice({
  name: "projectInformation",
  initialState,
  reducers: {
    setBookId: (state, action) => {
      state.bookId = action.payload;
    },
    setResourceId: (state, action) => {
      state.resourceId = action.payload;
    },
    setNickname: (state, action) => {
      state.nickname = action.payload;
    },
    setLanguageId: (state, action) => {
      state.languageId = action.payload;
    },
    setLanguageName: (state, action) => {
      state.languageName = action.payload;
    },
    setLanguageDirection: (state, action) => {
      state.languageDirection = action.payload;
    },
    setAllLanguageInfo: (state, action) => {
      const { id, name, direction } = action.payload;
      state.languageId = id;
      state.languageName = name;
      state.languageDirection = direction;
    },
    setContributors: (state, action) => {
      state.contributors = action.payload;
    },
    setCheckers: (state, action) => {
      state.checkers = action.payload;
    },
    setAlreadyImported: (state, action) => {
      state.alreadyImported = action.payload;
    },
    setUsfmProject: (state, action) => {
      state.usfmProject = action.payload;
    },
    setLocalImport: (state, action) => {
      state.localImport = action.payload;
    },
    setOverwritePermitted: (state, action) => {
      state.overwritePermitted = action.payload;
    },
    setSkipProjectNameCheck: (state, action) => {
      state.skipProjectNameCheck = action.payload;
    },
    setProjectFont: (state, action) => {
      state.projectFont = action.payload;
    },
    clearProjectInformation: () => initialState,
  },
});

export const {
  setBookId,
  setResourceId,
  setNickname,
  setLanguageId,
  setLanguageName,
  setLanguageDirection,
  setAllLanguageInfo,
  setContributors,
  setCheckers,
  setAlreadyImported,
  setUsfmProject,
  setLocalImport,
  setOverwritePermitted,
  setSkipProjectNameCheck,
  setProjectFont,
  clearProjectInformation,
} = projectInformationReducer.actions;

export default projectInformationReducer.reducer;

// === Selectors ===
// === New thunk to load manifest into project information ===
export const loadProjectFromManifest = (manifest) => (dispatch) => {
  const targetLanguage = manifest.target_language || {};
  dispatch(setLanguageName(targetLanguage.name || ""));
  dispatch(setLanguageId(targetLanguage.id || ""));
  dispatch(setLanguageDirection(targetLanguage.direction || ""));
  dispatch(setProjectFont(manifest.projectFont || "default"));

  const project = manifest.project || {};
  const resource = manifest.resource || {};
  dispatch(setBookId(project.id || ""));
  dispatch(setResourceId(resource.id || ""));
  dispatch(setNickname(resource.name || ""));
  dispatch(setContributors(manifest.translators || []));
  dispatch(setCheckers(manifest.checkers || []));
};
export const getIsUsfmProject = (state) => state.projectInformation.usfmProject;
export const getIsOverwritePermitted = (state) =>
  state.overwritePermitted;
export const getIsProjectAlreadyImported = (state) =>
  state.alreadyImported;
