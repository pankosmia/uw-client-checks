import { getJson, postJson } from "pithekos-lib";
import { fsGetRust } from "../../serverUtils";
import { Typography, Box, CircularProgress, Button } from "@mui/material";
import { useEffect, useState,useContext } from "react";
import { ArrowDownwardRounded, Done } from "@mui/icons-material";
import { gitCheckout } from "../../gitUtils";
import { i18nContext } from "pankosmia-rcl";
export default function ImportZipProjectNoInternet({
  setListDependancy,
  listDependancy,
  keysValue,
  setUsedRessources,
  summary
}) {
  const {i18nRef} = useContext(i18nContext)
  const [dependenciesDone, setDependaniesDone] = useState([]);
  const [canGoNext, setCanGoNext] = useState(false);
  useEffect(() => {
    if (!keysValue) return;

    setDependaniesDone(keysValue.map(() => "progress"));
  }, [keysValue]);
  useEffect(() => {
    async function noInternet() {
      let newKeysValues = [];
      for (let kvi = 0; kvi < keysValue.length; kvi++) {
        let path =
          keysValue[kvi][0] + "/" + keysValue[kvi][1] + "/" + keysValue[kvi][2];
        let version = keysValue[kvi][4].split(".zip")[0];
        if(version === 'master'){
          version = "main"
        }
        if (summary.json[path]) {
          let response = await gitCheckout([path, version], i18nRef);
          if (response.ok) {
            setDependaniesDone((prev) => {
              const copy = [...prev];
              copy[kvi] = true;
              return copy;
            });
            setUsedRessources((prev) => {
              let prevE = [...prev];
              prevE.push([
                keysValue[kvi][0] +
                  "/" +
                  keysValue[kvi][1] +
                  "/" +
                  keysValue[kvi][2],
                version,
              ]);

              return prevE;
            });
          }
        } else {
          newKeysValues.push(keysValue[kvi]);
          setDependaniesDone((prev) => {
            const copy = [...prev];
            copy[kvi] = false;
            return copy;
          });
        }
      }
      setListDependancy(newKeysValues);
      setCanGoNext(true);
    }
    noInternet();
  }, []);

  return (
    <Box>
      {keysValue.map((e, i) => (
        <Box>
          <Typography>{e}</Typography>
          {dependenciesDone[i] === "progress" && <CircularProgress />}
          {dependenciesDone[i] === true && <Done />}
          {dependenciesDone[i] === false && <ArrowDownwardRounded />}
        </Box>
      ))}
    </Box>
  );
}
