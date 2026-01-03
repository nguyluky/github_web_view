import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import readline from "readline";
import simpleGit from "simple-git";
import unzupper from "unzipper";


/**
 *
 * @param {string} cookieHeader
 * @returns
 */
export function parseCookies(cookieHeader) {
    /**
     * @type {{[key: string]: string}}
     */
    const cookies = {};
    if (cookieHeader) {
        const cookiePairs = cookieHeader.split(";");
        for (const pair of cookiePairs) {
            const [key, value] = pair.trim().split("=");
            cookies[key] = value;
        }
    }
    return cookies;
}

/**
 * nếu là link của google drive thì tải file từ google drive
 * xong giải nén
 * tìm thư mục gốc bên trong và di chuyển ra destPath
 *
 * - thư mục gốc là thư mục đầu tiên có chứa file html
 */

/**
 *
 * @param {string} fileId
 * @param {string} destPath
 * @param {(process: number) => void} processCb
 * @param {() => void} doneCb
 */
export async function dowGoogleDriveFile(fileId, destPath, processCb, doneCb) {
    console.log("Downloading Google Drive file:", fileId);
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId.trim()}`;
    const res = await fetch(downloadUrl);

    const contextLength = +(res.headers.get("Content-Length") || 0);

    let downloaded = 0;
    const fileStream = fs.createWriteStream(destPath + ".zip");
    await new Promise((resolve, reject) => {
        if (!res.body) {
            return reject(new Error("No response body"));
        }
        res.body.pipeTo(
            new WritableStream({
                write(chunk) {
                    fileStream.write(chunk);
                    downloaded += chunk.length;

                    if (processCb && contextLength) {
                        const progress = (downloaded / contextLength) * 50;
                        processCb(progress);
                    }
                    // nếu không có content-length thì sao
                },
                close() {
                    fileStream.end();
                    resolve("");
                },
                abort(err) {
                    reject(err);
                },
            })
        );
    });


    await new Promise((r) => setTimeout(r, 1000)); // đợi 1 giây trước khi giải nén
    // giải nén file zip
    const zipPath = path.resolve(destPath + ".zip");
    const tem_destPath = path.resolve(destPath + "_dir");
    // console.log("Unzipping file:", zipPath);
    // await new Promise((resolve, reject) => {
    //     exec(`unzip -o ${zipPath} -d ${tem_destPath}`, (error, stdout, stderr) => {
    //         if (error) {
    //             console.error(`Error unzipping file: ${error}`);
    //             return reject(error);
    //         }
    //         console.log(`File unzipped: ${stdout}`);
    //         resolve("");
    //     });
    // });

    const stats = fs.statSync(zipPath);
    const totalSize = stats.size;
    let completedSize = 0;

    await fs.createReadStream(zipPath)
    .on('data', (chunk) => {
        completedSize += chunk.length;
        if (processCb) {
            const progress = 50 + (completedSize / totalSize) * 30; // từ 50% đến 80%
            processCb(progress);
        }
    })
    .pipe(unzupper.Extract({ path: tem_destPath }))
    .promise();

    if (processCb) {
        processCb(80);
    }

    await new Promise((r) => setTimeout(r, 500)); // đợi nửa giây trước khi tìm thư mục gốc

    if (processCb) {
        processCb(90);
    }

    // xoá file zip
    fs.unlinkSync(destPath + ".zip");


    // tìm thư mục gốc
    /**
     * 
     * @param {string} dir 
     * @returns {string | null}
     */
    const findRootFolder = (dir) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = `${dir}/${file}`;
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                const innerFiles = fs.readdirSync(fullPath);
                if (innerFiles.some((f) => f.endsWith(".html"))) {
                    return fullPath;
                } else {
                    const result = findRootFolder(fullPath);
                    if (result) {
                        return result;
                    }
                }
            }
        }
        return null;
    };

    if (processCb) {
        processCb(95);
    }

    const rootFolder = findRootFolder(`${destPath}_dir`);
    if (rootFolder) {
        // di chuyển thư mục gốc ra destPath
        fs.renameSync(rootFolder, destPath);
        // xoá thư mục tạm
        fs.rmdirSync(`${destPath}_dir`, { recursive: true });
        if (processCb) {
            processCb(100);
        }
        if (doneCb) {
            doneCb();
        }
    } else {
        throw new Error("Root folder not found in the unzipped content");
    }
}

/**
 * 
 * @param {string} link 
 * @param {string} folderPath 
 * @param {(mess: string) => void} cb 
 * @returns 
 */
export async function cloneGitRepo(link, folderPath, cb) {
    await new Promise((resolve, reject) => {
        const gitProcess = spawn("git", ["clone", link, folderPath]);

        const rl = readline.createInterface({
            input: gitProcess.stdout,
            terminal: false,
        });

        rl.on("line", (line) => {
            if (cb) {
                cb(line);
            }
        });

        gitProcess.stderr.on("data", (data) => {
            if (cb) {
                cb(`Error: ${data}`);
            }
        });

        gitProcess.on("close", (code) => {
            if (code === 0) {
                if (cb) {
                    cb("Clone complete");
                }
                resolve("");
            } else {
                reject(new Error(`Git clone exited with code ${code}`));
            }
        });
    });
}


/**
 * 
 * @param {string} url 
 * @param {string} destPath 
 * @param {(progress: number) => void} psCb
 * @param {() => void} donCb
 */
export async function handleDownload(url, destPath, psCb, donCb) {
    console.log("Handling download for URL:", url, "to", destPath);
    if (url.includes("drive.google.com")) {
        const fileId = url.split("/d/")[1].split("/")[0];
        await dowGoogleDriveFile(fileId, destPath, psCb, donCb);
    } else if (url.startsWith("http") || url.startsWith("git@")) {
        await cloneWithProgress(url, destPath, psCb, donCb);
    } else {
        throw new Error("Unsupported URL");
    }
}


/**
 * @template {any} T
 * @param {Promise<T>} fn
 * @returns {Promise<[Error, null] | [null, T]>}
 */
export async function asyncWrapp(fn) {
    try {
        return [null, await fn];
    }
    catch (err) {

        return [ /** @type {Error} */ (err), null];
    }
}


/**
 * 
 * @typedef {{
 *  name: string,
 *  path: string, // relative path
 *  isDirectory: boolean,
 * }} FileInfo
 * 
 * @typedef {[
 * FileInfo,
 * TreeNode[]
 * ]} TreeNode
 * 
 */



const fileIgnoreList = [
    ".git",
    "node_modules",
    ".DS_Store",
    "thumbs.db"
]

/**
 * 
 * @param {string} dirPath 
 * @param {string?} basePath 
 * @returns {[FileInfo, TreeNode[]]}
 */
export function buildFileTree(dirPath, basePath) {
    const path_ = path.resolve(basePath ? path.join(basePath, dirPath) : dirPath)
    const name = path.basename(path_);
    const stat = fs.statSync(path_);
    const isDirectory = stat.isDirectory();

    if (!isDirectory) {
        return [
            {
                name,
                path: dirPath,
                isDirectory: false
            },
            []
        ]
    };

    const children = fs.readdirSync(path_)
        .filter((childName) => !fileIgnoreList.includes(childName))
        .map((childName) => {
            const childPath = path.join(dirPath, childName);
            const item = buildFileTree(childPath, basePath);
            return item;
        });


    return [
        {
            name,
            path: dirPath,
            isDirectory: true
        },
        children
    ];
}


/**
 * 
 * @param {string} link 
 * @param {string} folderPath 
 * @param {(process: number) => void} processCb
 * @param {() => void} doneCb 
 */
export async function cloneWithProgress(link, folderPath, processCb, doneCb) {

    const generated = simpleGit({
        progress: ({ stage, progress }) => {
            // method: 'clone', 'fetch', 'pull', 'push'
            // The type of progress being reported, note that any one task may emit many stages - for example git clone emits both receiving and resolving
            // progress: percentage (0-100)
            if (processCb) {
                let adjustedProgress = progress;
                if (stage === 'resolving') {
                    adjustedProgress = 50 + (progress / 2); // from 50% to 100%
                } else if (stage === 'receiving') {
                    adjustedProgress = progress / 2; // from 0% to 50%
                }
                processCb(adjustedProgress);
            }
        }
    });

    // clone if exits folderPath then skip
    if (fs.existsSync(folderPath)) {
        if (processCb) {
            processCb(100);
        }
        if (doneCb) {
            doneCb();
        }
        return;
    }
    await generated.clone(link, folderPath, );

    if (doneCb) {
        doneCb();
    }
}
