import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  resources: [],
  updateCount: 0,
};

const sourceContentUpdatesReducer = createSlice({
  name: "sourceContentUpdates",
  initialState,
  reducers: {
    setOutdatedResources: (state, action) => {
      state.resources = action.payload;
    },
    resetOutdatedResources: (state) => {
      state.resources = [];
    },
    incrementSourceUpdateCount: (state) => {
      state.updateCount += 1;
    },
  },
});

// === ACTIONS ===
export const {
  setOutdatedResources,
  resetOutdatedResources,
  incrementSourceUpdateCount,
} = sourceContentUpdatesReducer.actions;

// === REDUCER ===
export default sourceContentUpdatesReducer.reducer;

// ===================================================================================
// SELECTORS – Same behavior as the old reducer
// ===================================================================================

export const getListOfOutdatedSourceContent = (state) =>
  state.resources;

export const getSourceContentUpdateCount = (state) =>
  state.updateCount;
