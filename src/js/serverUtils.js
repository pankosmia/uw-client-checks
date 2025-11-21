import { getJson, getText, postJson, postText } from "pithekos-lib";
import { EXIST_PATH, BASE_URL, IMPORTS_PATH } from "../common/constants";

let treeCache = []; // cache tree data across calls

/**
 * GET /ingredient/raw/<repo_path>?ipath=<ipath>
 * Simulates fs.readFile or fs.readJson
 * @param {string} repoPath - e.g. "ingredient/raw/git.door43.org/BurritoTruck/en_bsb"
 * @param {string} ipath - internal file path, e.g. "MAT.usfm" or "manifest.json"
 * @returns {Promise<string>} raw file content
 */
export async function fsGetRust(repoPath, ipath) {
  try {
    let typeSearch = getTailsOfWantedDocumentArray(ipath);
    if (typeSearch.length === 1) {
      if (treeCache.length <= 0) {
        const url = getUrlForExistDocumentInProject(repoPath);
        const res = await getJson(url);
        const data = res.json;
        treeCache = data;
      }
      // Filter to keep only items in or under this path
      const children = treeCache
        .filter((item) => item.startsWith(ipath + "/"))
        // Remove the ipath prefix
        .map((item) => item.replace(ipath + "/", ""));
      // Collect unique first-level entries only
      const inDirectory = new Set();

      for (const entry of children) {
        const firstPart = entry.split("/")[0];
        if (firstPart) inDirectory.add(firstPart);
      }

      return Array.from(inDirectory);
    } else {
      let url = getUrlForGetDocumentInProject(repoPath) + ipath;
      if (typeSearch[1].includes(".json")) {
        return getJson(url).then((res) => {
          if (!res.ok) {
            throw new Error(`GET failed: ${res.status} ${res.statusText}`);
          }
          return res.json;
        });
      } else {
        return getText(url).then((res) => {
          if (!res.ok) {
            throw new Error(`GET failed: ${res.status} ${res.statusText}`);
          }
          return res.text;
        });
      }
    }
  } catch (err) {
    console.error(`fsGetRust(${repoPath}, ${ipath}) error:`, err);
    throw err;
  }
}

/**
 * POST /ingredient/raw/<repo_path>?ipath=<ipath>
 * Simulates fs.outputFile or fs.outputJson
 * @param {string} repoPath - e.g. "ingredient/raw/git.door43.org/BurritoTruck/en_bsb"
 * @param {string} ipath - internal file path, e.g. "manifest.json"
 * @param {string|object} data - content to write
 * @returns {Promise<void>}
 */
export async function fsWriteRust(repoPath, ipath, data) {
  try {
    let url = getUrlForGetDocumentInProject(repoPath) + ipath;
    let typeSearch = getTailsOfWantedDocumentArray(ipath);
    let res;
    console.log(url)
    console.log(typeSearch);
    console.log(data)
    console.log(typeof data)
    let text = {"payload": JSON.stringify(data)}
    console.log(typeof text)
    const body = {
      payload: typeof data === "object" ? JSON.stringify(data, null, 2) : data,
    };
    if (typeSearch[1].includes(".json")) {
      res = await postJson(url, JSON.stringify(body));
    } else {
      res = await postText(url,body);
    }

    if (!res.ok) {
        console.log(res)
      throw new Error(`POST failed: ${res.status} ${res.statusText} ${res}`);
    }
  } catch (err) {
    console.error(`fsWriteRust(${repoPath}, ${ipath} ${err}$) error:`, err);
    throw err;
  }
}

export async function fsExistsRust(repoPath, ipath) {
  let typeSearch = getTailsOfWantedDocumentArray(ipath);
  try {
    if (treeCache.length <= 0) {
      let url = getUrlForExistDocumentInProject(repoPath)
      const res = await getJson(url);
      const data = await res.json;
      treeCache = data;
    }

    const found = treeCache.some((item) => item.includes(ipath));
    return found;
  } catch (err) {
    console.error(`fsExistsRust(${repoPath}, ${ipath}) error:`, err);
    return false;
  }
}

function getUrlForGetDocumentInProject(repoPath) {
  return BASE_URL+'/'+IMPORTS_PATH.replace("%Project%", `${repoPath}`);
}
function getUrlForExistDocumentInProject(repoPath) {
  return BASE_URL +'/'+ EXIST_PATH + repoPath;
}
function getTailsOfWantedDocumentArray(ipath) {
  return ipath
    .split("/")
    .pop()
    .split(/(\.json|\.usfm|\.md)$/)
    .filter(Boolean);
}
