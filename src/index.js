import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";

import { githubRepoView } from "./Middlewares/githubRepoView.js";
import { performClone } from "./Middlewares/handleClone.js";
import { injectWsToReq } from "./Middlewares/injectWsToReq.js";
import { myCorsMiddleware } from "./Middlewares/myCorsMiddleware.js";
import { viewHomePage } from "./Middlewares/viewHomePage.js";

const app = express();
const server = createServer(app);

export const wss = new WebSocketServer({
    server,
    clientTracking: true,
});

app.locals.wss = wss;


wss.addListener('connection', (ws) => {
    ws.on('message', (message) => {
        console.log(`Received message => ${message}`);

        if (message.toString() === 'init') {
            ws.send('Connection initialized');
        }

        if (message.toString().startsWith('clone:')) {
            const gitLink = message.toString().substring(6);
            console.log('Starting clone for link:', gitLink);

            performClone(gitLink, ws);

        }

    });
});

app.use(express.json({ limit: '1mb' })); // Limit JSON payload size
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Security headers middleware
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.removeHeader('X-Powered-By');
    next();
});


// error handling middleware

/** @type {import("express").ErrorRequestHandler} */
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    // delete cookie folder if error occurs
    return res.clearCookie('folder').redirect('/');
};
app.use(errorHandler);


app.use(myCorsMiddleware);
app.use(injectWsToReq);

// 1. nếu có link trong query thì xử lý clone (gắn cookie folder)
// 2. nếu không có folder trong cookie thì hiển thị trang home
// 3. nếu có folder trong cookie thì hiển thị repo đã clone

app.use(viewHomePage);
app.use(githubRepoView);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
