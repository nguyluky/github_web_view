import { maxRequests, windowSize } from "../config/constant.js";
import { Service } from "../config/db.js";
import { parseCookies } from "../help.js";
import { HomePage } from "../page.js";

/**
 * @type {import('express').RequestHandler}
 */
export const viewHomePage = async (req, res, next) => {
  const { folder: folderId } = parseCookies(req.headers.cookie || "");
  console.log("Cookie folder ID:", folderId);

  if (folderId) return next();

  // Get rate limit info using same sliding window logic
  const ipAddress = req.socket.remoteAddress || req.connection.remoteAddress;
  const rateLimitKey = `rate_limit:${ipAddress}`;
  const now = Date.now();
  
  const requests = await Service.getRequestHistory(ipAddress || "guest");
  const validRequests = requests.filter(
    timestamp => now - timestamp < windowSize
  );
  
  const remainingRequests = Math.max(0, maxRequests - validRequests.length);
  
  const homePage = HomePage(remainingRequests);
  
  // Clear cookie with secure options
  res.clearCookie('folder', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }).send(homePage);
  return;
};
