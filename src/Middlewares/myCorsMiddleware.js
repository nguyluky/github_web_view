/**
 * @type {import("express").RequestHandler}
 */
export const myCorsMiddleware = (req, resp, next) => {
  resp.setHeader("Access-Control-Allow-Origin", "*");
  
  resp.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );
  resp.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  resp.setHeader("Access-Control-Allow-Credentials", "true");
  return next();
};
