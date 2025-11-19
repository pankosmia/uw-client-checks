// projectDetailsSlice.js
import { createSlice } from "@reduxjs/toolkit";
import { DEFAULT_OWNER } from "../../common/constants.js";

const initialState = {
  projectSaveLocation: "",
  manifest: {
    project: {},
    resource: {},
    toolsSelectedGLs: {},
    toolsSelectedOwners: {},
  },
  settings: {},
  currentProjectToolsProgress: {},
  projectType: null,
  toolsCategories: {},
};

const projectDetailsReducer = createSlice({
  name: "projectDetails",
  initialState,
  reducers: {
    setCheckCategories: (state, action) => {
      const { toolName, selectedSubcategories } = action.payload;
      state.toolsCategories[toolName] = selectedSubcategories;
    },

    setSavePathLocation: (state, action) => {
      state.projectSaveLocation = action.payload;
    },

    storeManifest: (state, action) => {
      Object.assign(state.manifest, action.payload);
    },

    storeProjectSettings: (state, action) => {
      Object.assign(state.settings, action.payload);
    },

    setProjectProgressForTool: (state, action) => {
      const { toolName, progress } = action.payload;
      state.currentProjectToolsProgress[toolName] = progress;
    },

    setGLForTool: (state, action) => {
      const { toolName, selectedGL, selectedOwner } = action.payload;
      state.manifest.toolsSelectedGLs[toolName] = selectedGL;
      state.manifest.toolsSelectedOwners[toolName] = selectedOwner;
    },

    addManifestProperty: (state, action) => {
      const { propertyName, value } = action.payload;
      state.manifest[propertyName] = value;
    },

    saveBookIdAndBookName: (state, action) => {
      const { bookId, bookName } = action.payload;
      state.manifest.project.id = bookId;
      state.manifest.project.name = bookName;
    },

    saveResourceId: (state, action) => {
      state.manifest.resource.id = action.payload;
    },

    saveNickname: (state, action) => {
      state.manifest.resource.name = action.payload;
    },

    saveLanguageDetails: (state, action) => {
      const { languageId, languageName, languageDirection } = action.payload;
      state.manifest.target_language = {
        id: languageId,
        name: languageName,
        direction: languageDirection,
      };
    },

    saveCheckers: (state, action) => {
      state.manifest.checkers = action.payload;
    },

    saveTranslators: (state, action) => {
      state.manifest.translators = action.payload;
    },

    setProjectType: (state, action) => {
      state.projectType = action.payload;
    },

    resetProjectDetails: () => initialState,

    addProjectSettingsProperty: (state, action) => {
      const { propertyName, value } = action.payload;
      state.settings[propertyName] = value;
    },
  },
});

// === Actions ===
export const {
  setCheckCategories,
  setSavePathLocation,
  storeManifest,
  storeProjectSettings,
  setProjectProgressForTool,
  setGLForTool,
  addManifestProperty,
  saveBookIdAndBookName,
  saveResourceId,
  saveNickname,
  saveLanguageDetails,
  saveCheckers,
  saveTranslators,
  setProjectType,
  resetProjectDetails,
  addProjectSettingsProperty,
} = projectDetailsReducer.actions;

export default projectDetailsReducer.reducer;

// ===================================================================================
// SELECTORS – All identical to your old selectors
// ===================================================================================

export const getToolGatewayLanguage = (state, toolName) => {
  const gls = state.manifest.toolsSelectedGLs || {};
  return gls[toolName] || "en";
};

export const getToolGlOwner = (state, toolName) => {
  const owners = state.manifest.toolsSelectedOwners || {};
  return owners[toolName] || DEFAULT_OWNER;
};

export const getToolProgress = (state, toolName) => {
  return state.currentProjectToolsProgress[toolName] || 0;
};

export const getSaveLocation = (state) =>
  state.projectSaveLocation;

export const getName = (state) =>
  getSaveLocation(state).split('/').slice(-1)[0];

export const getManifest = (state) =>
  state.manifest;

export const getSettings = (state) =>
  state.settings;

export const getNickname = (state) =>
  state.manifest?.resource?.name || "";

export const getBookId = (state) =>
  state.manifest?.project?.id || null;

export const getToolCategories = (state, toolName) => {
  return state.toolsCategories[toolName] || [];
};

export const getToolsSelectedGLs = (state) =>
  state.manifest.toolsSelectedGLs;
