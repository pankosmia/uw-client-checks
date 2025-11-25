import { useParams } from "react-router-dom";
import { useState, useEffect, useContext } from "react";
import { doI18n, i18nContext } from "pithekos-lib";
import { DataGrid } from "@mui/x-data-grid";
import { Box, Button, Typography, Modal } from "@mui/material";
import { convertToProjectFormat } from "../js/creatProject"; // <-- import your function
import { useNavigate } from "react-router-dom";
import { getJson } from "pithekos-lib";
import { BASE_URL } from "../common/constants";

async function getPathFromOriginalResources(name) {
  let manifests = await getJson(BASE_URL + "/burrito/metadata/summaries").json;
  console.log(manifests);
  const manifest = manifests.find((m) => m.abbreviation === name);
  if (!manifest) return null;

  const cleanedName = manifest.description
    .split("(")[0]
    .trim()
    .replace(/\)$/, "");
  console.log(cleanedName);
  const parentManifest = manifests.find((m) => m.name === cleanedName);
  console.log(parentManifest);
  return parentManifest.path;
}

export default function SelectBook() {
  const { name } = useParams();
  const { i18nRef } = useContext(i18nContext);
  const [inDirectory, setInDirectory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tree, setTree] = useState([]);
  const [rows, setRows] = useState([]);
  const navigate = useNavigate();
  const [openModal, setOpenModal] = useState(false);
  const [manifestPath, setManifestPath] = useState("");
  async function fetchData() {
    try {
      const url = `/burrito/paths/_local_/_local_/${name}`;
      const res = await getJson(url);
      const data = await res.json;
      const ipath = "book_projects";
      const children = data
        .filter((item) => item.startsWith(ipath + "/"))
        .map((item) => item.replace(ipath + "/", ""));
      setTree(children);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    fetchData();
  }, [name]);

  function find_manifest(path) {
    return tree.includes(`${path}/manifest.json`);
  }
  const handleTryConvert = async (
    sourceProjectPath,
    selectedProjectFilename
  ) => {
    try {
      await convertToProjectFormat(
        sourceProjectPath,
        "book_projects/" + selectedProjectFilename + "/"
      );
      fetchData();
    } catch (error) {
      console.error("❌ Conversion failed:", error);
      alert("Conversion failed — see console for details.");
    }
  };
  useEffect(() => {
    const firstLevel = new Set();
    for (const entry of tree) {
      const firstPart = entry.split("/")[0];
      if (firstPart) firstLevel.add(firstPart);
    }
    setInDirectory(Array.from(firstLevel));
  }, [tree]);

  const columns = [
    {
      field: "name",
      headerName: doI18n("pages:content:row_name", i18nRef.current),
      minWidth: 110,
      flex: 3,
    },
    {
      field: "language",
      headerName: doI18n("pages:content:row_language", i18nRef.current),
      minWidth: 120,
      flex: 0.75,
    },
    {
      field: "actions",
      headerName: doI18n("pages:content:row_actions", i18nRef.current),
      minWidth: 100,
      flex: 0.5,
      renderCell: (params) => {
        // params.row.actions is just a string or boolean
        const hasManifest = params.row.actions; // true/false
        return hasManifest ? (
          <Button
            variant="contained"
            onClick={() =>
              navigate("/TwChecker", {
                state: {
                  tCoreName: params.row.tCoreName,
                  projectName: params.row.projectName,
                },
              })
            }
          >
            TranslationWords
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={() =>
              handleTryConvert(params.row.projectName, params.row.tCoreName)
            }
          >
            isnot
          </Button>
        );
      },
    },
  ];
  const handleOpenModal = async () => {
    const path = await getPathFromOriginalResources(name);
    setManifestPath(path || "Not found");
    setOpenModal(true);
  };
  const handleCloseModal = () => setOpenModal(false);
  useEffect(() => {
    setRows(
      inDirectory.map((rep, n) => {
        const splitname = rep.split("_");
        return {
          id: n,
          tCoreName: rep,
          projectName: name,
          name: splitname[2],
          language: splitname[0],
          actions: find_manifest(rep),
          path: rep, // <-- ADD THIS
        }; // just a boolean
      })
    );
  }, [inDirectory]);

  return (
    <Box
      sx={{
        mb: 2,
        position: "fixed",
        top: "64px",
        bottom: 0,
        right: 0,
        overflow: "scroll",
        width: "100%",
      }}
    >
      <Button onClick={handleOpenModal}>add book</Button>
      <DataGrid
        autoHeight
        initialState={{
          sorting: {
            sortModel: [{ field: "name", sort: "asc" }],
          },
        }}
        rows={rows}
        columns={columns}
        sx={{ fontSize: "1rem" }}
      />
      <Modal open={openModal} onClose={handleCloseModal}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
            width: 500,
          }}
        >
          <Typography variant="h6" gutterBottom>
            Manifest Path
          </Typography>

          <Typography sx={{ wordWrap: "break-word" }}>
            {manifestPath || "Aucun manifest trouvé"}
          </Typography>

          <Box sx={{ textAlign: "right", mt: 2 }}>
            <Button variant="contained" onClick={() => setOpenModal(false)}>
              OK
            </Button>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
}
