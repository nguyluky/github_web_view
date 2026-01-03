import ejs from "ejs";
import fs from "fs";

const HomePageTemplate = fs.readFileSync(
  "src/templates/home.ejs",
  "utf-8"
);

const ClonePageTemplate = fs.readFileSync(
  "src/templates/clone.ejs",
  "utf-8"
);

const directoryViewTemplate = fs.readFileSync(
  "src/templates/directory.ejs",
  "utf-8"
);

const treeViewTemplate = fs.readFileSync(
  "src/templates/tree.ejs",
  "utf-8"
);

/**
 * 
 * @param {number} count 
 * @returns 
 */
export const HomePage = (count) => {
  return ejs.render(HomePageTemplate, {count});
}

/**
 * 
 * @param {string} folderName 
 * @returns 
 */
export const cloningPage = (folderName) => {
  return ejs.render(ClonePageTemplate, { folderName });
};


/**
 * 
 * @param {string[]} files 
 * @param {string} dir
 */
export const DirectoryViewPage = (files, dir) => {
    return ejs.render(directoryViewTemplate, { files, directoryPath: dir });
}


/**
 * 
 * @param {string} repoName 
 * @param {import("./help").TreeNode[]} tree 
 * @returns 
 */
export const TreeViewPage = (repoName, tree) => {
    return ejs.render(treeViewTemplate, { repoName, tree });
}