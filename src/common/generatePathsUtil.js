const join = (...args) => args.join("/").replace(/\/+/g, "/");

const CHECKDATA_DIRECTORY = join('.apps', 'translationCore', 'checkData');

export const getCheckDataFolderPath = (projectSaveLocation, bookAbbreviation, checkDataName) => join(projectSaveLocation, CHECKDATA_DIRECTORY, checkDataName, bookAbbreviation);
