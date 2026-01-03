/**
 * @type {import("express").RequestHandler}
 */
export const injectWsToReq = (req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  const sendOrigin = res.send;
  res.send = function (body) {
    if (typeof body === "string")
      body = body.replace(
        "</body>",
                /* html */ `
      <script>
        function delete_cookie(name) {
          document.cookie = name +'=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        }

        document.addEventListener("keydown", (e) => {
          if (e.key === "Escape") {
            delete_cookie("folder");
            location.reload();
          }
        });
      </script>
    </body>`
      );
    return sendOrigin.call(this, body);
  };
  return next();
};
