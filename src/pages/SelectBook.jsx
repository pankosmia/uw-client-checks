import { useParams } from "react-router-dom";
import { useState, useEffect, useContext } from "react";
import { doI18n, i18nContext } from "pithekos-lib";
import { DataGrid } from "@mui/x-data-grid";
import { Box, Button } from "@mui/material";
import { convertToProjectFormat } from "../js/creatProject"; // <-- import your function
import { useNavigate } from "react-router-dom";


export default function SelectBook() {
  const { name } = useParams();
  const { i18nRef } = useContext(i18nContext);
  const [inDirectory, setInDirectory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tree, setTree] = useState([]);
  const [rows, setRows] = useState([]);
  const navigate = useNavigate();
  
  async function fetchData() {
      try {
        const url = `/burrito/paths/_local_/_local_/${name}`;
        const res = await fetch(url);
        const data = await res.json();
        console.log(url);
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
  const handleTryConvert = async (path,book) => {
      const sourceProjectPath =
        `burrito/ingredient/raw/_local_/_local_/${name}?ipath=book_projects/${path}/`;
      const selectedProjectFilename = book;
  
      try {
        await convertToProjectFormat(sourceProjectPath, selectedProjectFilename);
        fetchData()        
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
        return hasManifest ? <Button variant="contained" onClick={() => navigate("/TwChecker",{ state: { name:  params.row.path} })}>TranslationWords</Button> : <Button
        variant="contained"
        onClick={() => handleTryConvert(params.row.path,`${params.row.name}.usfm`)}
        >isnot</Button>;
      },
    },
  ];

  useEffect(() => {
    setRows(
      inDirectory.map((rep, n) => {
        const splitname = rep.split("_");
        return {
          id: n,
          name: splitname[2],
          language: splitname[0],
          actions: find_manifest(rep),
          path: rep,                    // <-- ADD THIS
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
    </Box>
  );
}
