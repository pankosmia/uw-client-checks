import { configureStore } from "@reduxjs/toolkit";
import projectInformationSlice from "../slice/projectInformationSlice";
import localImportSlice from "../slice/localImportSlice";

const store = configureStore({
  reducer: {
    projectInformation: projectInformationSlice,
    localImport:localImportSlice

  },
});
export default store;
