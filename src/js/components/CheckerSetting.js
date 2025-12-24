import AppDialog from "./AppDialog";
import {
  FormControl,
  TextField,
  Button,
  Typography,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Box,
  Accordion,
  AccordionDetails,
  AccordionSummary,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useState, useContext, useEffect } from "react";
import { doI18n, i18nContext } from "pithekos-lib";
import { fsExistsRust, fsGetRust, fsWriteRust } from "../serverUtils";
import { getAllCheckingCategories } from "../checkerUtils";
import yaml from "js-yaml";
import { buildLinkTitleMap } from "../checkerUtils";
const CheckerSetting = ({ repoName, tCoreNameProject = null, lecixonName = 'en_ta' }) => {
  const [openResourcesDialog, setOpenResourcesDialog] = useState(false);

  const { i18nRef } = useContext(i18nContext);
  const tools = ["translationWords", "translationNotes", "wordAlignment"];

  const [translationWordsResourcesName, setTranslationWordsResourcesName] =
    useState("en_tw");
  const [translationWordsCategories, setTranslationWordsCategories] = useState(
    []
  );

  const [translationNotesCategories, setTranslationNotesCategories] = useState(
    []
  );
  const [settingJson, setSettingJson] = useState({});

  useEffect(() => {
    async function getTranslationNotesCategories() {
      let categories = await fsGetRust(
        "en_ta",
        "translate/toc.yaml",
        "git.door43.org/uW"
      );
      let dataYaml = yaml.load(categories);
      // build { "figs-abstractnouns": "Abstract Nouns", ... }
      const linkTitleMap = buildLinkTitleMap(dataYaml.sections);
      setTranslationNotesCategories(linkTitleMap);
    }
    getTranslationNotesCategories();
  }, []);

  //changeCategories TranslationWords
  
    

  //load setting file if exist
  useEffect(() => {
    async function getSettingJson() {
      let json = {};
      if (tCoreNameProject) {
        let exist = await fsExistsRust(
          repoName,
          `book_projects/${tCoreNameProject}/checker_setting.json`
        );
        if (exist) {
          setSettingJson(
            await fsGetRust(
              repoName,
              `book_projects/${tCoreNameProject}/checker_setting.json`
            )
          );
          return;
        }
      }
      let categoriesTN = await getAllCheckingCategories(
        repoName,
        "book_projects/" + tCoreNameProject,
        tCoreNameProject.split("_")[2],
        "translationNotes",
        lecixonName
      );
      console.log(categoriesTN)
      json["translationNotes"] = {};
      for (let [k, v] of Object.entries(categoriesTN)) {
        if (!json["translationNotes"][k]) {
          json["translationNotes"][k] = {};
        }
        for (let p of v) {
          json["translationNotes"][k][p.toLowerCase()] = true;
        }
      }
      let categoriesTW = await fsGetRust(
        translationWordsResourcesName,
        "payload",
        "git.door43.org/uW"
      );
       if (!json["translationWords"]) {
          json["translationWords"] = {};
        }
        for (let c of categoriesTW) {
          json["translationWords"][c] = true;
        }
        setSettingJson(json)
        return;
    }
    getSettingJson();
  }, []);

  //write settingJson
  async function writeSettingJson(json) {
    if (settingJson !== {}) {
      if (tCoreNameProject) {
        await fsWriteRust(
          repoName,
          `book_projects/${tCoreNameProject}/checker_setting.json`,
          json
        );
        return;
      }
      await fsWriteRust(repoName, `checker_setting.json`, json);
      return;
    }
  }

  const toggleTWCategory = async (tool, category) => {
    let newJson = {
      ...settingJson,
      [tool]: {
        ...(settingJson?.[tool] || {}),
        [category]: !settingJson?.[tool]?.[category],
      },
    };
    await writeSettingJson(newJson);

    setSettingJson(newJson);
  };
  const toggleTNCategory = async (group, category) => {
    let newJson = {
      ...settingJson,
      translationNotes: {
        ...(settingJson.translationNotes || {}),
        [group]: {
          ...(settingJson.translationNotes?.[group] || {}),
          [category]: !settingJson.translationNotes?.[group]?.[category],
        },
      },
    };
    await writeSettingJson(newJson);

    setSettingJson(newJson);
  };

  const toggleTNGroup = async (group, categories) => {
    const current = settingJson.translationNotes?.[group] || {};
    const enableAll = !categories.every((c) => current[c]);
    let newJson = {
      ...settingJson,
      translationNotes: {
        ...(settingJson.translationNotes || {}),
        [group]: Object.fromEntries(categories.map((c) => [c, enableAll])),
      },
    };

    await writeSettingJson(newJson);
    setSettingJson(newJson);
  };
  return (
    <>
      <Button
        sx={{
          height: 36,
          opacity: 1,
          pt: 1.5, // padding-top: 6px
          pr: 2, // padding-right: 16px
          pb: 1.5, // padding-bottom: 6px
          pl: 2, // padding-left: 16px
          borderRadius: 1, // or your theme's borderRadius value
          borderWidth: 1,
          borderStyle: "solid",
          transform: "rotate(0deg)",
          whiteSpace: "nowrap", // ✅ key
        }}
        onClick={() => setOpenResourcesDialog(true)}
      >
        <Typography>
          {tCoreNameProject
            ? doI18n(
                "pages:uw-client-checks:checks_settings_book",
                i18nRef.current
              )
            : doI18n("pages:uw-client-checks:checks_settings", i18nRef.current)}
        </Typography>
      </Button>
      {openResourcesDialog && (
        <AppDialog
          open={openResourcesDialog}
          onClose={() => setOpenResourcesDialog(false)}
          maxWidth="md"
          title={
            tCoreNameProject
              ? doI18n(
                  "pages:uw-client-checks:checks_settings_book",
                  i18nRef.current
                )
              : doI18n(
                  "pages:uw-client-checks:checks_settings",
                  i18nRef.current
                )
          }
          actions={
            <Button
              variant="contained"
              onClick={() => setOpenResourcesDialog(false)}
            >
              {doI18n("pages:uw-client-checks:close", i18nRef.current)}
            </Button>
          }
        >
          {tools.map((tool) => (
            <>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                {tool}
              </Typography>

              {tool === "translationWords" && settingJson[tool] && (
                <FormGroup>
                  {Object.keys(settingJson.translationWords).map((cat) => (
                    <Box
                      key={cat}
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                        mb: 1,
                        px: 2,
                        py: 1,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <FormControlLabel
                        sx={{ m: 0, width: "100%" }}
                        control={
                          <Checkbox
                            checked={settingJson[tool][cat] || false}
                            onChange={() => toggleTWCategory(tool, cat)}
                          />
                        }
                        label={
                          <Typography variant="body1" fontWeight={500}>
                            {cat.toUpperCase()}
                          </Typography>
                        }
                      />
                    </Box>
                  ))}
                </FormGroup>
              )}
              {tool === "translationNotes" &&
                settingJson.translationNotes &&
                translationNotesCategories && (
                  <Box>
                    {Object.entries(settingJson["translationNotes"]).map(
                      ([groupKey, categories]) => {
                        const categoryKeys = Object.keys(categories);
                        const values = settingJson.translationNotes || {};

                        const allChecked = categoryKeys.every(
                          (cat) => values?.[groupKey]?.[cat]
                        );

                        const someChecked =
                          !allChecked &&
                          categoryKeys.some((cat) => values?.[groupKey]?.[cat]);

                        return (
                          <Accordion key={groupKey}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <FormControlLabel
                                onClick={(e) => e.stopPropagation()}
                                onFocus={(e) => e.stopPropagation()}
                                control={
                                  <Checkbox
                                    checked={allChecked}
                                    indeterminate={someChecked}
                                    onChange={() =>
                                      toggleTNGroup(groupKey, categoryKeys)
                                    }
                                  />
                                }
                                label={
                                  <Typography fontWeight={500}>
                                    {groupKey.toUpperCase()}
                                  </Typography>
                                }
                              />
                            </AccordionSummary>

                            <AccordionDetails>
                              <FormGroup>
                                {categoryKeys.map((catKey) => (
                                  <FormControlLabel
                                    key={catKey}
                                    control={
                                      <Checkbox
                                        checked={!!values?.[groupKey]?.[catKey]}
                                        onChange={() =>
                                          toggleTNCategory(groupKey, catKey)
                                        }
                                      />
                                    }
                                    label={translationNotesCategories[catKey] || catKey}
                                  />
                                ))}
                              </FormGroup>
                            </AccordionDetails>
                          </Accordion>
                        );
                      }
                    )}
                  </Box>
                )}
              <Box sx={{ marginTop: 1 }} />
              <FormControl fullWidth sx={{ mt: 2 }}>
                <TextField
                  id="burrito-select-label"
                  select
                  //   value={}
                  //   onChange={}
                  label={doI18n(
                    "pages:uw-client-checks:gateway_language",
                    i18nRef.current
                  )}
                >
                  {}
                </TextField>
              </FormControl>
            </>
          ))}
        </AppDialog>
      )}
    </>
  );
};

export default CheckerSetting;
