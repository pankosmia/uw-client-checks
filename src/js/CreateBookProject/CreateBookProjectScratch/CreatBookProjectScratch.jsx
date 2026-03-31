import {
  Button,
  DialogContent,
  Typography,
  Box,
  Tooltip,
  IconButton,
} from "@mui/material";
import { useState, useContext } from "react";
import { doI18n } from "pithekos-lib";
import { i18nContext, PanDialog, PanDialogActions } from "pankosmia-rcl";
import RessourcesPicker from "../RessourcesPicker";
import LangueConfig from "../LanguagePicker/LangueConfig";
import AddIcon from "@mui/icons-material/Add";
import { fsGetRust, fsWriteRust } from "../../serverUtils";
import { getJson } from "pithekos-lib";
import { BASE_URL } from "../../../common/constants";
import { convertToProjectFormat } from "../../creatProject";
import InternetDialog from "../../components/InternetDialog";
import DownloadRessources from "../../components/DownloadRessources";
import { Info } from "@mui/icons-material";

async function initialiseProject(sourceProjectPath, selectedProjectFilename) {
  await convertToProjectFormat(
    sourceProjectPath,
    "book_projects/" + selectedProjectFilename + "/",
  );
}

async function getPathFromOriginalResources(name) {
  const manifestsObj = (await getJson(BASE_URL + "/burrito/metadata/summaries"))
    .json;

  const AbrName = name.split("_")[0].toUpperCase();

  const entry = Object.entries(manifestsObj)
    .filter(([path]) => path.includes("_local_/_local_"))
    .find(
      ([, manifest]) =>
        manifest.abbreviation.toUpperCase() === AbrName.toUpperCase() ||
        manifest.abbreviation.toLowerCase() === AbrName.toLowerCase(),
    );

  if (!entry) return null;

  return entry;
}
const copyOriginUsfmToProject = async (
  bookCode,
  currentProject,
  selectedBurrito,
) => {
  try {
    let originManifest = await getPathFromOriginalResources(currentProject);
    let OriginNameProject = originManifest[0].split("/")[2];
    let lang = selectedBurrito.language_code;
    let abr = selectedBurrito.abbreviation.split("_")[0];
    let nameBook = bookCode.toLowerCase();
    let name = lang + "_" + abr + "_" + nameBook + "_book";
    let usfm = await fsGetRust(
      OriginNameProject,
      `${bookCode.toUpperCase()}.usfm`,
    );
    await fsWriteRust(
      currentProject,
      `book_projects/${name}/${bookCode.toLowerCase()}.usfm`,
      usfm,
    );
    return name;
  } catch (err) {
    console.log(`Failed to add ${bookCode}, ${err}`);
  }
};

export default function CreateBookProjectScratch({
  repoName,
  nameBurrito,
  reloadProject,
  selectedBurrito,
}) {
  const [step, setStep] = useState(1);
  const [openResourcesDialog, setOpenResourcesDialog] = useState(false);
  const [languageChoices, setLanguageChoices] = useState(["en"]);
  const [finalVersionManager, setFinalVersionManager] = useState({});
  const [book, setBook] = useState("");
  const { i18nRef } = useContext(i18nContext);
  const [downloadRessourcesDialogueOpen, setDownloadRessourcesDialogueOpen] =
    useState(false);

  console.log(finalVersionManager);
  async function goNext() {
    if (step === 1) {
      setStep(2);
    }
    if (step === 2) {
      let tCoreProject = await copyOriginUsfmToProject(
        book,
        repoName,
        selectedBurrito,
      );
      await convertToProjectFormat(
        repoName,
        "book_projects/" + tCoreProject + "/",
        finalVersionManager,
      );
      setOpenResourcesDialog(false);
      reloadProject();
    }
    if (step === 3) {
      return;
    }
    if (step === 4) setStep(2);
  }
  return (
    <Box>
      <Button
        sx={{ marginX: 1 }}
        variant="outlined"
        aria-label={doI18n("pages:content:fab_import", i18nRef.current)}
        onClick={(event) => {
          setStep(1);
          setOpenResourcesDialog(event.currentTarget);
        }}
      >
        <AddIcon sx={{ mr: 1 }} />
        <Typography variant="body2">
          {doI18n("pages:uw-client-checks:add_book", i18nRef.current)}
        </Typography>
      </Button>
      {openResourcesDialog && (
        <PanDialog
          isOpen={openResourcesDialog}
          closeFn={() => setOpenResourcesDialog(false)}
          size="md"
          titleLabel={`${doI18n(
            "pages:uw-client-checks:add_book_zip",
            i18nRef.current,
          )}`}
        >
          <DialogContent>
            {step === 1 && (
              <LangueConfig
                languageChoices={languageChoices}
                setLanguageChoices={setLanguageChoices}
              />
            )}
            {step === 2 && (
              <Box>
                <Tooltip title={"need more ressources?"}>
                  <IconButton
                    onClick={() => {
                      setStep(3);
                    }}
                  >
                    <Info />
                  </IconButton>
                </Tooltip>
                <RessourcesPicker
                  setFinalVersionManager={setFinalVersionManager}
                  prefLanguage={languageChoices}
                  setBook={setBook}
                />
              </Box>
            )}
            {step === 3 && <InternetDialog callBack={() => setStep(4)} />}
            {step === 4 && (
              <DownloadRessources
                setOpenResourcesDialog={setOpenResourcesDialog}
                downloadRessourcesDialogueOpen={downloadRessourcesDialogueOpen}
                setDownloadRessourcesDialogueOpen={
                  setDownloadRessourcesDialogueOpen
                }
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
            actionLabel={step === 2 ? "finish" : "next"}
            onlyCloseButton={false}
          />
        </PanDialog>
      )}
    </Box>
  );
}
