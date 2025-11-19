import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  selectedTool: null,
  tools: {
    byName: {},   // map: toolName → index
    byObject: [], // array of tool objects [{ name, api, container, ... }]
  }
};

const toolsReducer = createSlice({
  name: 'tools',
  initialState,
  reducers: {
    addTool: (state, action) => {
      const { name, tool } = action.payload;
      const index = state.tools.byObject.length;

      state.tools.byName[name] = index;
      state.tools.byObject.push(tool);
    },

    openTool: (state, action) => {
      state.selectedTool = action.payload.name;
    },

    closeTool: (state) => {
      state.selectedTool = null;
    }
  }
});


/** Return array of all tool objects */
export const getTools = (state) => {
  return [...state.tools.byObject];
};

/** Return dictionary: name -> tool object */
export const getToolsByKey = (state) => {
  const tools = state.tools.byObject;
  const map = {};

  tools.forEach(tool => {
    map[tool.name] = tool;
  });

  return map;
};

/** Return array of tool names */
export const getToolNames = (state) => {
  return Object.keys(state.tools.byName);
};

/** Return selected tool name */
export const getCurrentToolName = (state) => {
  return state.tools.selectedTool || null;
};

/** Return selected tool object */
export const getSelectedTool = (state) => {
  const name = state.tools.selectedTool;
  if (!name) return null;

  const index = state.tools.tools.byName[name];
  return state.tools.byObject[index] || null;
};

/** Return title of selected tool */
export const getSelectedToolTitle = (state) => {
  const tool = getSelectedTool(state);
  return tool?.title || '';
};

/** Return selected tool container (React component) */
export const getSelectedToolContainer = (state) => {
  const tool = getSelectedTool(state);
  return tool?.container || null;
};

/** Return selected tool's API controller */
export const getSelectedToolApi = (state) => {
  const tool = getSelectedTool(state);
  return tool?.api || null;
};

/** Return all other tool APIs except the selected one */
export const getSupportingToolApis = (state) => {
  const selected = state.tools.selectedTool;
  const apis = {};

  state.tools.tools.byObject.forEach(tool => {
    if (tool.name !== selected) {
      apis[tool.name] = tool.api;
    }
  });

  return apis;
};

// Export actions
export const { addTool, openTool, closeTool } = toolsReducer.actions;

// Export reducer
export default toolsReducer.reducer;
