import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";

import { myCorsMiddleware } from "./Middlewares/myCorsMiddleware.js";
import { injectWsToReq } from "./Middlewares/injectWsToReq.js";
import { handleClone } from "./Middlewares/handleClone.js";
import { viewHomePage } from "./Middlewares/viewHomePage.js";
import { githubRepoView } from "./Middlewares/githubRepoView.js";

const app = express();
const server = createServer(app);

export const wss = new WebSocketServer({
  server,
  clientTracking: true,
});

app.locals.wss = wss;

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



app.use(myCorsMiddleware);
app.use(injectWsToReq);

// 1. nếu có link trong query thì xử lý clone (gắn cookie folder)
// 2. nếu không có folder trong cookie thì hiển thị trang home
// 3. nếu có folder trong cookie thì hiển thị repo đã clone

app.use(handleClone);
app.use(viewHomePage);
app.use(githubRepoView);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
