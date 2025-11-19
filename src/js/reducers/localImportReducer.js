import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  selectedProjectFilename: '',
  sourceProjectPath: '',
  oldSelectedProjectFileName: null,
};

const localImportReducer = createSlice({
  name: "localImport",
  initialState,
  reducers: {
    setSelectedProjectFilename: (state, action) => {
      state.selectedProjectFilename = action.payload;
    },
    setOldSelectedProjectFileName: (state, action) => {
      state.oldSelectedProjectFileName = action.payload;
    },
    setSourceProjectPath: (state, action) => {
      state.sourceProjectPath = action.payload;
    },
    resetLocalImport: () => initialState,
  },
});

export const {
  setSelectedProjectFilename,
  setOldSelectedProjectFileName,
  setSourceProjectPath,
  resetLocalImport,
} = localImportReducer.actions;

export default localImportReducer.reducer;

// === Selectors ===
export const getSelectedProjectFilename = (state) =>
  state.localImport.selectedProjectFilename;
export const getSourceProjectPath = (state) =>
  state.localImport.sourceProjectPath;
export const getOldSelectedProjectFileName = (state) =>
  state.localImport.oldSelectedProjectFileName;
