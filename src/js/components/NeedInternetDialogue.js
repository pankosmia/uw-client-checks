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
import { postEmptyJson } from "pithekos-lib";
import { deleteBookProject } from "../serverUtils";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useState, useContext } from "react";
import { doI18n, i18nContext } from "pithekos-lib";
import {Dialog, Chip, DialogTitle, DialogContent, DialogContentText,DialogActions} from "@mui/material";
const NeedInternetDialogue = ({compressed,netEnabled }) => {
  const { i18nRef } = useContext(i18nContext);

    const [internetDialogOpen, setInternetDialogOpen] = useState(false);
    const handleCloseDialog = () => {
        setInternetDialogOpen(false);
    };

    const disableInternet = () => {
        postEmptyJson('/net/disable', false)
    };

    const enableInternet = () => {
        postEmptyJson('/net/enable', false)
    };
    const handleInternetToggleClick = () => {
        if (!netEnabled) {
            setInternetDialogOpen(true);
        } else {
            disableInternet();
        }
    };

    return (
        <Box>
                 <Button
        variant="contained"
        onClick={() =>
          (window.location.href = `/clients/download#/subList?data=${compressed}`)
        }
      >
        {doI18n("pages:uw-client-checks:go_to_download", i18nRef.current)}
      </Button>
            <Dialog
                open={internetDialogOpen}
                onClose={handleCloseDialog}
                slotProps={{
                    paper: {
                        component: 'form',

                    },
                }}
            >
                <DialogTitle><b>{doI18n("components:header:internet_question_label", i18nRef.current)}</b></DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        <Typography>
                            {doI18n("components:header:internet_question", i18nRef.current)}
                        </Typography>
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>{doI18n("components:header:cancel", i18nRef.current)}</Button>
                    <Button onClick={() => {
                        enableInternet();
                        handleCloseDialog();
                    }}>{doI18n("components:header:accept", i18nRef.current)}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
};

export default NeedInternetDialogue;
