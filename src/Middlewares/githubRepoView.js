import fs from "fs";
import path from "node:path";
import { Service } from "../config/db.js";
import { asyncWrapp, buildFileTree, parseCookies } from "../help.js";
import { TreeViewPage } from "../page.js";





/**
 * @type {import('express').RequestHandler}
 */
export const githubRepoView = async (req, res, next) => {
    const { folder: folderId } = parseCookies(req.headers.cookie || "");

    if (!folderId) return res.redirect("/");

    const folder = (await Service.getFolderData(folderId))?.folderName;
    if (!folder) {
        res.clearCookie("folder");
        return res.redirect("/");
    }

    const decodedPath = decodeURIComponent(req.path);
    const projectPath = path.join(".cache", folder, decodedPath);

    // Security: Prevent directory traversal attacks
    const safePath = path.resolve(projectPath);
    const baseDir = path.resolve(".cache", folder);

    if (!safePath.startsWith(baseDir)) {
        return res.status(403).send(
            `<body><h1>403 Forbidden</h1><p>Access denied.</p><a href="/">Go to Home Page</a></body>`
        );
    }

    const [error, stat] = await asyncWrapp(fs.promises.stat(safePath));

    if (error) {
        // tree view even if path not exists
        const tree = buildFileTree(folder, path.join(".cache"))[1]
        const html = TreeViewPage(folder, tree);
        return res.send(html);
    }

    if (stat.isDirectory()) {
        if (!req.path.endsWith("/")) return res.redirect(req.path + "/");
        const indexPath = path.join(safePath, "index.html");
        if (fs.existsSync(indexPath)) {
            fs.readFile(indexPath, "utf-8", (err, data) => {
                if (err) {
                    return res.status(500).send("Server Error");
                }

                return res.send(data);
            });
            return;
        }

        // tree view
        const tree = buildFileTree(folder, path.join(".cache"))[1]
        const html = TreeViewPage(folder, tree);
        return res.send(html);
    }

    if (safePath.endsWith(".html") || safePath.endsWith(".htm")) {
        fs.readFile(safePath, "utf-8", (err, data) => {
            if (err) {
                return res.status(500).send("Server Error");
            }

            return res.send(data);
        });
        return;
    }

    res.sendFile(safePath, {
        dotfiles: 'allow',
        cacheControl: false,
    });
    return;
};
