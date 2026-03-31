import { PanDialog } from "pankosmia-rcl";
import {
  DialogContent,
  ListItem,
  List,
  IconButton,
  ListItemText,
  Tooltip,
  FormControl,
  Select,
  MenuItem,
  FormHelperText,
} from "@mui/material";
import LanguageMenuItem from "./LanguageMenuItem";
import { useEffect, useState, useContext } from "react";
import { i18nContext } from "pankosmia-rcl";
import { getAndSetJson, doI18n } from "pithekos-lib";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { DragIndicator } from "@mui/icons-material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

export default function LangueConfigModal({
  languageChoices,
  setLanguageChoices,
}) {
  const { i18nRef } = useContext(i18nContext);

  const [languageLookup, setLanguageLookup] = useState([]);

  // Build draggable items from ids
  const items = languageChoices.map((id) => {
    const lang = languageLookup.find((l) => l.id === id);
    return { id, content: lang?.endonym || id };
  });

  const enIndex = languageChoices.indexOf("en");

  // load lookup
  useEffect(() => {
    fetch("/app-resources/lookups/languages.json")
      .then((r) => r.json())
      .then((data) => setLanguageLookup(data));
  }, []);

  // load used languages
  // useEffect(() => {
  //   getAndSetJson({
  //     url: "/i18n/used-languages",
  //     setter: setLanguageChoices,
  //   });
  // }, []);

  const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const reordered = reorder(
      languageChoices,
      result.source.index,
      result.destination.index,
    );

    setLanguageChoices(reordered);
  };

  const removeLanguage = (langId) => {
    if (langId === "en") return;

    setLanguageChoices((prev) => prev.filter((id) => id !== langId));
  };

  const doChange = (selected) => {
    setLanguageChoices((prev) => {
      let updated = [...prev];

      if (!updated.includes(selected)) {
        updated.unshift(selected);
      }

      if (!updated.includes("en")) {
        updated.unshift("en");
      }

      return updated;
    });
  };

  const availableLanguages = languageLookup.filter(
    (lang) => !languageChoices.includes(lang.id),
  );

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="droppable">
        {(provided) => (
          <List ref={provided.innerRef} {...provided.droppableProps}>
            {items.map((item, index) => (
              <Draggable key={item.id} draggableId={item.id} index={index}>
                {(provided, snapshot) => (
                  <ListItem
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    secondaryAction={
                      <IconButton
                        disabled={item.id === "en"}
                        edge="end"
                        onClick={() => removeLanguage(item.id)}
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    }
                    sx={{
                      transition: "background-color 0.2s ease",
                      "&:hover": { backgroundColor: "grey.100" },
                      "&:active": { backgroundColor: "grey.300" },
                      ...(snapshot.isDragging && {
                        backgroundColor: "grey.300",
                      }),
                    }}
                  >
                    <IconButton
                      {...provided.dragHandleProps}
                      size="small"
                      sx={{ cursor: "grab" }}
                    >
                      <DragIndicator />
                    </IconButton>

                    <Tooltip
                      title={
                        item.id === "en"
                          ? doI18n(
                              "pages:core-settings:tooltip_en",
                              i18nRef.current,
                            )
                          : ""
                      }
                    >
                      <ListItemText
                        secondary={
                          item.id === "en" && enIndex < items.length - 1
                            ? doI18n(
                                "pages:core-settings:tooltip_languages",
                                i18nRef.current,
                              )
                            : null
                        }
                        style={{
                          color: index > enIndex ? "gray" : "black",
                        }}
                      >
                        {item.content} ({item.id})
                      </ListItemText>
                    </Tooltip>
                  </ListItem>
                )}
              </Draggable>
            ))}

            {provided.placeholder}
          </List>
        )}
      </Droppable>

      <FormControl size="small" fullWidth>
        <Select value="" onChange={(ev) => doChange(ev.target.value)}>
          {availableLanguages.map((language) => (
            <MenuItem key={language.id} value={language.id}>
              <LanguageMenuItem language={language} />
            </MenuItem>
          ))}
        </Select>

        <FormHelperText>
          {doI18n("pages:core-settings:add_language", i18nRef.current)}
        </FormHelperText>
      </FormControl>
    </DragDropContext>
  );
}
