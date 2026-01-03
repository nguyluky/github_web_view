import ejs from "ejs";
import fs from "fs";

// is dev
const isDev = process.env.NODE_ENV !== "production";

let HomePageTemplate = fs.readFileSync(
    "src/templates/home.ejs",
    "utf-8"
);

let ClonePageTemplate = fs.readFileSync(
    "src/templates/clone.ejs",
    "utf-8"
);

let directoryViewTemplate = fs.readFileSync(
    "src/templates/directory.ejs",
    "utf-8"
);

let treeViewTemplate = fs.readFileSync(
    "src/templates/tree.ejs",
    "utf-8"
);

/**
 * 
 * @param {number} count 
 * @returns 
 */
export const HomePage = (count) => {
    if (isDev) {
        HomePageTemplate = fs.readFileSync(
            "src/templates/home.ejs",
            "utf-8"
        );
    }

    return ejs.render(HomePageTemplate, { count });
}

/**
 * 
 * @param {string} folderName 
 * @returns 
 */
export const cloningPage = (folderName) => {
    if (isDev) {
        ClonePageTemplate = fs.readFileSync(
            "src/templates/clone.ejs",
            "utf-8"
        );
    }
    return ejs.render(ClonePageTemplate, { folderName });
};


/**
 * 
 * @param {string[]} files 
 * @param {string} dir
 */
export const DirectoryViewPage = (files, dir) => {

    if (isDev) {
        directoryViewTemplate = fs.readFileSync(
            "src/templates/directory.ejs",
            "utf-8"
        );
    }

    return ejs.render(directoryViewTemplate, { files, directoryPath: dir });
}


/**
 * 
 * @param {string} repoName 
 * @param {import("./help").TreeNode[]} tree 
 * @returns 
 */
export const TreeViewPage = (repoName, tree) => {
    if (isDev) {
        treeViewTemplate = fs.readFileSync(
            "src/templates/tree.ejs",
            "utf-8"
        );
    }
    return ejs.render(treeViewTemplate, { repoName, tree });
}