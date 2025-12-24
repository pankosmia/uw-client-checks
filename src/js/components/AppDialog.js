import {
  Dialog,
  AppBar,
  Toolbar,
  Typography,
  DialogActions,
  Box,
} from "@mui/material";

export default function AppDialog({
  open,
  onClose,
  title,
  children,
  actions,
  maxWidth = "sm",
  fullWidth = true,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth={fullWidth}
      maxWidth={maxWidth}
      sx={{ backdropFilter: "blur(3px)" }}
    >
      {/* Header */}
      <AppBar
        color="secondary"
        sx={{
          position: "relative",
          borderTopLeftRadius: 4,
          borderTopRightRadius: 4,
        }}
      >
        <Toolbar>
          <Typography variant="h6" sx={{fontWeight:500}}>{title}</Typography>
        </Toolbar>
      </AppBar>

      {/* Content */}
      <Box sx={{ p: 2 }}>{children}</Box>

      {/* Footer / Actions */}
      {actions && <DialogActions>{actions}</DialogActions>}
    </Dialog>
  );
}
