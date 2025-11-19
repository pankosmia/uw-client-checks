import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  loggedInUser: false, // or null if you prefer
};

const loginReducer = createSlice({
  name: 'login',
  initialState,
  reducers: {
    setLoggedInUser(state, action) {
      state.loggedInUser = action.payload; // true or false
    },
    logout(state) {
      state.loggedInUser = false;
    },
  },
});

// Selector: get the logged in state
export const getIsLoggedIn = (state) =>  state.loggedInUser;

export const { setLoggedInUser, logout } = loginReducer.actions;
export default loginReducer.reducer;
