import ImportZipProjectInternet from "./ImportZipProjectInternet";
import ImportZipProjectNoInternet from "./ImportZipProjectNoInternet";
import { FilePicker } from "react-file-picker";
import { Button, DialogContent } from "@mui/material";
import { useState, useContext, useEffect } from "react";
import { doI18n, getJson } from "pithekos-lib";
import { fsExistsRust, fsWriteRust } from "../../serverUtils";
import {
  i18nContext,
  PanDownload,
  PanDialog,
  PanDialogActions,
  netContext,
} from "pankosmia-rcl";
import { fsGetRust } from "../../serverUtils";
import InternetDialog from "../../components/InternetDialog";
import RessourcesPicker from "../RessourcesPicker";
import { enqueueSnackbar } from "notistack";
async function checkIfBookProjectExist(repoName, tCoreNameProject, i18nRef) {
  let bookProjects = await fsExistsRust(
    repoName,
    `book_projects/${tCoreNameProject}/manifest.json`,
  );
  console.log(bookProjects);
  if (bookProjects) {
    enqueueSnackbar(
      `${doI18n(
        "pages:core-contenthandler_text_translation:book_project_already_exist",
        i18nRef.current,
      )}`,
      { variant: "error" },
    );
    throw new Error(
      `${doI18n(
        "pages:core-contenthandler_text_translation:zip_is_no_valid",
        i18nRef.current,
      )}`,
    );
    return true;
  }
  return false;
}

function checkZipName(name, i18nRef) {
  let response = (name.split("_").length = 6 && name.includes("book"));
  if (response) {
    enqueueSnackbar(
      `${doI18n(
        "pages:core-contenthandler_text_translation:zip_selected",
        i18nRef.current,
      )} : ${name}`,
      { variant: "success" },
    );
  } else {
    enqueueSnackbar(
      `${doI18n(
        "pages:core-contenthandler_text_translation:zip_is_no_valid",
        i18nRef.current,
      )}`,
      { variant: "error" },
    );
    throw new Error(
      `${doI18n(
        "pages:core-contenthandler_text_translation:zip_is_no_valid",
        i18nRef.current,
      )}`,
    );
  }
  return response;
}

async function getZip(file, repoName, i18nRef) {
  let isValidZip = checkZipName(file.name, i18nRef);
  if (!isValidZip) return null;

  const projectNameResponse = encodeURIComponent(file.name.split("-")[0]);
  let already_exist = await checkIfBookProjectExist(
    repoName,
    projectNameResponse,
    i18nRef,
  );
  if (already_exist) return null;
  const url = `/burrito/ingredient/zipped/_local_/_local_/${repoName}?ipath=book_projects/${projectNameResponse}`;

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error("Upload failed");
  } else {
    let manifest = await fsGetRust(
      repoName,
      `book_projects/${projectNameResponse}/manifest.json`,
    );
    let externalResources = manifest.externalResources;

    delete externalResources.scriptures;
    const externalResourcesType = { ...externalResources };

    externalResources = Object.values(externalResources);
    let keysValue = externalResources.map((e) => {
      let splitArray = e.split("/").splice(2);
      splitArray[0] = splitArray[0].replace("git.", "qa.");
      return splitArray;
    });
    console.log(keysValue);
    return [keysValue, projectNameResponse, externalResourcesType];
  }
}

const convertionTable = {
  tWordsGateway: "parascriptural/x-bcvarticles",
  tNotesGateway: "parascriptural/x-bcvnotes",
  lexicon: "peripheral/x-lexicon",
  tAcademyGateway: "peripheral/x-peripheralArticles",
  waOriginalLang: "scripture/textTranslation",
  tWordsOriginalLang: "scripture/textTranslation",
  tNotesOriginalLang: "scripture/textTranslation",
};

export async function write_version_manager(keysValue, repoName, tCoreProjectName) {
  await fsWriteRust(
    repoName,
    `book_projects/${tCoreProjectName}/version_manager.json`,
    keysValue,
  );
}

export function ImportZipProject({ repoName, nameBurrito, reloadProject }) {
  const [openResourcesDialog, setOpenResourcesDialog] = useState(false);
  const { i18nRef } = useContext(i18nContext);
  const [step, setStep] = useState(0);
  const { enabledRef } = useContext(netContext);
  const [usedRessources, setUsedRessources] = useState([]);
  const [listDependancy, setListDependancy] = useState([]);
  const [externalResources, setExternalResources] = useState({});
  const [keysValue, setKeysValue] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [finalVersionManager, setFinalVersionManager] = useState({});
  async function write_version(values) {
    console.log(values);
    await write_version_manager(values, repoName, projectName);
  }
  async function goNext() {
    if (step === 1) {
      if (listDependancy.length === 0) {
        setStep(4);
      } else {
        if (enabledRef.current) {
          setStep(3);
        } else {
          setStep(2);
        }
      }
    }
    if (step === 2) {
      setStep(3);
    }
    if (step === 3) {
      setStep(4);
    }
    if (step === 4) {
      await write_version(finalVersionManager);
      setOpenResourcesDialog(false);
      reloadProject();
    }
  }
  function makeList() {
    let json = {};
    console.log("Used resources:", usedRessources);

    for (let e of usedRessources) {
      console.log("External resources:", externalResources);

      let pair = Object.entries(externalResources).find(([key, value]) =>
        value.replace("git.", "qa.").includes(e[0].split("/")[2]),
      );

      if (pair) {
        json[convertionTable[pair[0]]] = [e[0], e[1]];
      } else {
        console.warn("No match found for", e[0]);
      }
    }

    console.log("Resulting JSON:", json);
    return json;
  }
  return (
    <>
      <FilePicker
        extensions={["zip"]}
        onChange={async (fileObject) => {
          try {
            let zipResponse = await getZip(fileObject, repoName, i18nRef);
            if (zipResponse) {
              let [keysValue, projectNameResponse, externalResourcesType] =
                zipResponse;
              setOpenResourcesDialog(true);
              setKeysValue(keysValue);
              setProjectName(projectNameResponse);
              setExternalResources(externalResourcesType);
              setStep(1);
            }
          } catch (err) {
            console.error("Import failed", err);
          }
        }}
        onError={(errMsg) => {
          console.error(errMsg);
        }}
      >
        <Button
          sx={{
            height: 36,
            pt: 1.5,
            pr: 2,
            pb: 1.5,
            pl: 2,
            borderRadius: 1,
            borderWidth: 1,
            borderStyle: "solid",
            whiteSpace: "nowrap",
          }}
        >
          {doI18n("pages:uw-client-checks:import_book", i18nRef.current)}
        </Button>
      </FilePicker>
      {openResourcesDialog && (
        <PanDialog
          isOpen={openResourcesDialog}
          closeFn={() => setOpenResourcesDialog(false)}
          size="md"
          titleLabel={`${doI18n(
            "pages:uw-client-checks:import_zip_project",
            i18nRef.current,
          )}`}
        >
          <DialogContent>
            {step === 1 && (
              <ImportZipProjectNoInternet
                setListDependancy={setListDependancy}
                listDependancy={listDependancy}
                keysValue={keysValue}
                setUsedRessources={setUsedRessources}
              />
            )}
            {step === 2 && <InternetDialog callBack={goNext}/>}
            {step === 3 && (
              <ImportZipProjectInternet
                projectName={projectName}
                repoName={repoName}
                keysValue={listDependancy}
                setUsedRessources={setUsedRessources}
              />
            )}
            {step === 4 && (
              <RessourcesPicker
                listPreSelected={makeList()}
                book={projectName.split("_")[2]}
                setFinalVersionManager={setFinalVersionManager}
              />
            )}
          </DialogContent>
          <PanDialogActions
            closeFn={() => setOpenResourcesDialog(false)}
            closeLabel={doI18n(
              "pages:uw-client-checks:cancel",
              i18nRef.current,
            )}
            actionFn={() => {
              goNext();
            }}
            closeOnAction={false}
            actionLabel={step === 4 ? "finish" : "next"}
            onlyCloseButton={false}
          />
        </PanDialog>
      )}
    </>
  );
}
