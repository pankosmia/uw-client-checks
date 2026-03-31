import { FormControl, InputLabel, Select, MenuItem, Box } from "@mui/material";
import { useState, useEffect, useContext } from "react";
import { i18nContext } from "pankosmia-rcl";
import { doI18n, getJson } from "pithekos-lib";
import BIBLE_BOOKS from "../../common/BooksOfTheBible";
const ALL_BOOKS = [
  ...Object.entries(BIBLE_BOOKS.oldTestament).map(([code, name]) => ({
    code,
    name,
    testament: "old",
  })),
  ...Object.entries(BIBLE_BOOKS.newTestament).map(([code, name]) => ({
    code,
    name,
    testament: "new",
  })),
];

export default function RessourcesPicker({
  setFinalVersionManager,
  book = null,
  prefLanguage = null,
  listPreSelected = null,
  setBook = null,
}) {
  const [values, setValues] = useState({
    "parascriptural/x-bcvarticles": ["", ""],
    "parascriptural/x-bcvnotes": ["", ""],
    "peripheral/x-lexicon": ["", ""],
    "peripheral/x-peripheralArticles": ["", ""],
    "scripture/textTranslation": ["", ""],
  });
  const [options, setOptions] = useState({});
  const [selectedBook, setSelectedBook] = useState(book || "");
  const [summaries, setSummaries] = useState(null);
  const { i18nRef } = useContext(i18nContext);
  useEffect(() => {
    if (setBook) {
      setBook(selectedBook);
    }
  }, [selectedBook]);
  useEffect(() => {
    setFinalVersionManager(values);
  }, [values]);
  const handleChange = (field) => (event) => {
    const selectedPath = event.target.value;

    setValues((prev) => ({
      ...prev,
      [field]: [selectedPath, summaries[selectedPath]?.version || "master"],
    }));
  };

  useEffect(() => {
    async function fetchSummaries() {
      const response = await getJson("/burrito/metadata/summaries");
      const data = await response.json;
      setSummaries(data);
    }
    fetchSummaries();
  }, []);

  // Apply preselected values (KEEP path/version)
  useEffect(() => {
    if (listPreSelected && summaries) {
      let normalized = { ...values };

      Object.keys(normalized).forEach((field) => {
        if (listPreSelected[field]) {
          normalized[field] = listPreSelected[field];
        }
      });

      setValues(normalized);
    }
  }, [summaries]);

  useEffect(() => {
    async function fetchFromBook() {
      if (!summaries) return;

      try {
        let burritoArray = Object.entries(summaries).map(([key, value]) => ({
          path: key,
          ...value,
        }));

        let newOptions = {};
        let newValues = {};

        Object.keys(values).forEach((t) => {
          let filtered = burritoArray.filter(
            (b) => `${b.flavor_type}/${b.flavor}` === t,
          );

          if (
            !(
              t === "peripheral/x-lexicon" ||
              t === "peripheral/x-peripheralArticles"
            )
          ) {
            filtered = filtered.filter((e) =>
              e.book_codes.includes(selectedBook?.toUpperCase()),
            );
          }

          let langFiltered =
            t === "scripture/textTranslation"
              ? filtered.filter((b) =>
                  ["grc", "hbo", "el-x-koine"].includes(b.language_code),
                )
              : filtered.filter((b) =>
                  prefLanguage ? prefLanguage.includes(b.language_code) : true,
                );

          newOptions[t] = langFiltered;

          if (!listPreSelected && langFiltered.length > 0) {
            const first = langFiltered[0];
            newValues[t] = [first.path, first.version || "master"];
          }
        });

        setOptions(newOptions);

        if (!listPreSelected) {
          setValues((prev) => ({ ...prev, ...newValues }));
        }
      } catch (err) {
        console.error("Error fetching summaries:", err);
      }
    }

    fetchFromBook();
  }, [summaries, selectedBook]);

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <FormControl fullWidth>
        <InputLabel id="book-label">Book</InputLabel>
        <Select
          labelId="book-label"
          value={selectedBook}
          disabled={book}
          label="Book"
          variant="filled"
          onChange={(e) => setSelectedBook(e.target.value)}
        >
          {ALL_BOOKS.map((b) => (
            <MenuItem key={b.code} value={b.code}>
              {b.name} ({b.testament === "old" ? "OT" : "NT"})
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {Object.keys(values).map((fieldKey) => {
        const selectedPath = values[fieldKey]?.[0];
        const selectedVersion =
          summaries?.[selectedPath]?.version || values[fieldKey]?.[1] || "";

        return (
          <Box key={fieldKey} display="flex" alignItems="center" gap={2}>
            <FormControl fullWidth>
              <InputLabel id={`${fieldKey}-label`}>
                {doI18n(`flavors:names:${fieldKey}`, i18nRef.current)}
              </InputLabel>

              <Select
                disabled={
                  !selectedBook ||
                  (options[fieldKey]?.some(
                    (e) => e.path === listPreSelected?.[fieldKey]?.[0],
                  ) &&
                    listPreSelected?.[fieldKey])
                }
                labelId={`${fieldKey}-label`}
                value={selectedPath || ""}
                onChange={handleChange(fieldKey)}
                label={doI18n(`flavors:names:${fieldKey}`, i18nRef.current)}
              >
                {options[fieldKey]?.map((option) => (
                  <MenuItem key={option.path} value={option.path}>
                    {option.name} ({option.language_name})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* VERSION DISPLAY */}
            <Box minWidth="80px">
              {selectedVersion && (
                <Box fontSize="0.9rem" color="gray">
                  {selectedVersion}
                </Box>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
