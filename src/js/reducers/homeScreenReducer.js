import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // empty but required to exist
};

const homeScreenReducer = createSlice({
  name: 'homeScreen',
  initialState,
  reducers: {
    // no reducers for now
  }
});

export default homeScreenReducer.reducer;