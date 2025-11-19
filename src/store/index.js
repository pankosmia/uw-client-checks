import { configureStore } from "@reduxjs/toolkit";
import projectInformationReducer from "../js/reducers/projectInformationReducer";
import localImportReducer from "../js/reducers/localImportReducer";
import homeScreenReducer from "../js/reducers/homeScreenReducer"
import loginReducer from "../js/reducers/loginReducer"
import sourceConnterUpdateReducer from "../js/reducers/sourceContentUpdatesReducer"
import projectDetailsReducer from "../js/reducers/projectDetailsReducer"
import toolsReducer from "../js/reducers/toolsReducer"
const store = configureStore({
  reducer: {
    projectInformationReducer: projectInformationReducer,
    localImportReducer:localImportReducer,
    homeScreenReducer:homeScreenReducer,
    loginReducer:loginReducer,
    projectDetailsReducer:projectDetailsReducer,
    toolsReducer:toolsReducer,
    sourceContentUpdatesReducer:sourceConnterUpdateReducer
  },
});
export default store;
