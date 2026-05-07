import {
  Button,
  DialogContent,
  Typography,
  Box,
  Tooltip,
  IconButton,
  Divider,
} from "@mui/material";
import { useState, useContext, useEffect } from "react";
import { doI18n } from "pithekos-lib";
import {
  i18nContext,
  PanDialog,
  PanDialogActions,
  netContext,
} from "pankosmia-rcl";
import RessourcesPicker from "../RessourcesPicker";
import LangueConfig from "../LanguagePicker/LangueConfig";
import AddIcon from "@mui/icons-material/Add";
import { fsGetRust, fsWriteRust } from "../../serverUtils";
import { getJson } from "pithekos-lib";
import { BASE_URL } from "../../../common/constants";
import { convertToProjectFormat } from "../../creatProject";
import InternetDialog from "../../components/InternetDialog";
import DownloadRessources from "../../components/DownloadRessources";
import { Download, Info } from "@mui/icons-material";
import { useSearchParams } from "react-router-dom";

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
  parentBurritoProject,
}) {
  const { enabledRef } = useContext(netContext);
  const { i18nRef } = useContext(i18nContext);

  const [step, setStep] = useState(2);
  const [openResourcesDialog, setOpenResourcesDialog] = useState(false);
  const [languageChoices, setLanguageChoices] = useState(["en"]);
  const [finalVersionManager, setFinalVersionManager] = useState({});
  const [book, setBook] = useState("");
  const [listBookParentProject, setListBookParentProject] = useState(null);
  const [type, setType] = useState(null);
  const [uuid, setUuid] = useState(null);
  const [downloadRessourcesDialogueOpen, setDownloadRessourcesDialogueOpen] =
    useState(false);

  useEffect(() => {
    if (parentBurritoProject) {
      async function getListBookFromParentProject() {
        let summary = await getJson(
          `/burrito/metadata/summary/${parentBurritoProject.path}`,
        );
        if (summary.ok) {
          setListBookParentProject(
            summary.json.book_codes.map((e) => e.toLowerCase()),
          );
        }
      }
      getListBookFromParentProject();
    }
  }, [parentBurritoProject]);

  const [searchParams] = useSearchParams();

  const fileName = searchParams.get("fileName") || null;
  const fileUUID = searchParams.get("uuid") || null;

  useEffect(() => {
    if (fileName) {
      setType(fileName.split(".")[1]);
      setBook(fileName.split(".")[0]);
    }
    if (fileUUID) {
      setUuid(fileUUID);
    }
  }, []);

  useEffect(() => {
    if (uuid && type) {
      if (type === "usfm") {
        setOpenResourcesDialog(true);
      }
    }
  }, [type, uuid]);
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
      setStep(2);
      return;
    }
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
          showInternetSwitch={true}
          isOpen={openResourcesDialog}
          closeFn={() => setOpenResourcesDialog(false)}
          size="md"
          titleLabel={`${doI18n(
            "pages:uw-client-checks:add_book_tCore",
            i18nRef.current,
          )}`}
        >
          <DialogContent>
            {step === 1 && (
              <Box>
                <Typography>
                  {doI18n(
                    "pages:uw-client-checks:language_picker",
                    i18nRef.current,
                  )}
                </Typography>
                <Divider sx={{ m: 1 }} />
                <LangueConfig
                  languageChoices={languageChoices}
                  setLanguageChoices={setLanguageChoices}
                />
              </Box>
            )}
            {step === 2 && (
              <Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography>
                    {doI18n(
                      "pages:uw-client-checks:need_more_ressources",
                      i18nRef.current,
                    )}
                  </Typography>
                  <IconButton
                    disabled={!enabledRef.current}
                    onClick={() => {
                      setStep(3);
                    }}
                  >
                    <Download />
                  </IconButton>
                </Box>
                <Divider sx={{ m: 1 }} />

                <RessourcesPicker
                  book={
                    uuid && type === "usfm" ? book.toLocaleLowerCase() : null
                  }
                  setFinalVersionManager={setFinalVersionManager}
                  prefLanguage={languageChoices}
                  setBook={setBook}
                  bookList={listBookParentProject}
                />
              </Box>
            )}
            {step === 3 && (
              <Box>
                <Typography>
                  {doI18n(
                    "pages:uw-client-checks:preSelected_resources",
                    i18nRef.current,
                  )}
                </Typography>
                <Divider sx={{ m: 1 }} />
                <DownloadRessources
                  setOpenResourcesDialog={setOpenResourcesDialog}
                  downloadRessourcesDialogueOpen={
                    downloadRessourcesDialogueOpen
                  }
                  setDownloadRessourcesDialogueOpen={
                    setDownloadRessourcesDialogueOpen
                  }
                />
              </Box>
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
