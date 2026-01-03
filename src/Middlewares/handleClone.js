// import fs from "fs";
// import path from "node:path";
// import WebSocket from "ws";
// import { maxRequests, timeOffline, windowSize } from "../config/constant.js";
// import { Service } from "../config/db.js";
// import { handleDownload } from "../help.js";
// import { cloningPage as CloningPage } from "../page.js";

import path from "path";
import { Service } from "../config/db.js";
import { handleDownload } from "../help.js";

// /**
//  * 
//  * 
//  * 1. nếu có link trong query thì xử lý clone không thì next()
//  * 2. tạo folder ID (UUID)
//  * 3. lưu thông tin link và folder ID vào DB
//  * 4. gắn cookie folder ID vào response
//  * 5. nếu đã clone rồi thì redirect về home
//  * 6. nếu chưa clone thì bắt đầu clone repo
//  * 7. trong quá trình clone thì gửi thông báo tiến trình về client qua WebSocket
//  * 
//  * @type {import("express").RequestHandler}
//  */
// export const handleClone = async (req, res, next) => {
//   const { wss } = /** @type {import("express").Application & { locals: { wss: WebSocket.Server } }} */ (req.app).locals;
//   const link = /** @type {string} */ (req.query.repo);

//   if (!link) return next();

//   // Validate URL input to prevent injection
//   try {
//     const url = new URL(link);
//     const allowedHosts = ['github.com', 'gitlab.com', 'bitbucket.org', 'drive.google.com'];
//     if (!allowedHosts.includes(url.hostname)) {
//       return res.status(400).json({
//         error: "Invalid repository URL",
//         message: "Only GitHub, GitLab, Bitbucket, and Google Drive URLs are allowed"
//       });
//     }
//   } catch (e) {
//     return res.status(400).json({
//       error: "Invalid URL format",
//       message: "Please provide a valid repository URL"
//     });
//   }

//   // generate folder ID (UUID)
//   const folderID = Date.now().toString(36) + Math.random().toString(36).substring(2);
//   const folderName = link.replace(/[^a-zA-Z0-9]/g, "_");

//   // Get real IP address (không trust x-forwarded-for để tránh spoofing)
//   const ipAddress = req.socket.remoteAddress || req.connection.remoteAddress;

//   const now = Date.now();

//   // Get existing requests in current window
//   const requests = await Service.getRequestHistory(ipAddress || "guest");

//   // Filter requests within current window
//   const validRequests = requests.filter(
//     timestamp => now - timestamp < windowSize
//   );

//   // Check if exceeded rate limit
//   if (validRequests.length >= maxRequests) {
//     const oldestRequest = Math.min(...validRequests);
//     const resetTime = Math.ceil((oldestRequest + windowSize - now) / 1000);

//     res.set('Retry-After', resetTime.toString());
//     return res.status(429).json({
//       error: "Rate limit exceeded",
//       message: `Too many requests. Try again in ${resetTime} seconds.`,
//       resetTime: resetTime
//     });
//   }

//   // Add current request to window
//   await Service.updateRequestHistory(ipAddress || "guest", now);

//   await Service.setFolderData(folderID, {
//     link,
//     folderName,
//     ipAddress: ipAddress || "guest",
//     timestamp: Date.now(),
//   });

//   res.cookie("folder", folderID, { 
//     maxAge: timeOffline
//   });

//   if (fs.existsSync(path.join(".cache", folderName))) {
//     return res.redirect("/");
//   }

//   handleDownload(link, path.join(".cache", folderName), (mess) => {
//     wss.clients.forEach((client) => {
//       if (client.readyState === WebSocket.OPEN) {
//         client.send(`${folderID}:${mess}`);
//       }
//     });
//   })
//     .catch(() => { })
//     .finally(() => {
//       wss.clients.forEach((client) => {
//         if (client.readyState === WebSocket.OPEN)
//             client.send(`${folderID}:clone_complete`);
//       });
//     });

//   const htmlResponse = CloningPage(folderID);
//   return res.send(htmlResponse);
// };


const allowedHosts = [
    'github.com',
    'gitlab.com',
    // 'bitbucket.org',
    'drive.google.com'
]

/**
 * 
 * @param {string} link 
 * @param {import("ws").WebSocket} ws
 */
export function performClone(link, ws) {

    if (!link) {
        ws.send('error:No link provided');
        return;
    }

    try {
        const url = new URL(link);
        if (!allowedHosts.includes(url.hostname)) {
            ws.send('error:Allowed hosts are github.com, gitlab.com, drive.google.com');
            return;
        }
    } catch (e) {
        ws.send('error:Invalid URL format');
        return;
    }

    const folderID = Date.now().toString(36) + Math.random().toString(36).substring(2);
    const folderName = link.replace(/[^a-zA-Z0-9]/g, "_");

    // TODO: add rate limiting per IP if necessary

    const ipAddress = /**@type {*} */(ws)._socket.remoteAddress || "guest";

    handleDownload(
        link, 
        path.join(".cache", folderName), 
        (progress) => {
            ws.send(`loading:${progress}`)
        }, 
        async () => {


            await Service.setFolderData(folderID, {
                link,
                folderName,
                ipAddress: ipAddress,
                timestamp: Date.now(),
            });

            ws.send(`clone_complete:${folderID}`);

        }
    ).catch((err) => {
        ws.send(`error:${err.message}`);
    })


}