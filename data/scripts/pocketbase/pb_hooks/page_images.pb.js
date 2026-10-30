// Page images for the reader pages (unit RC2, round 65 answer 6: "Signed short link (Recommended)").
//
// Route: GET /page-images/{slug}/{file}?exp=<unix seconds>&sig=<hex>
//   slug  book folder, for example left_foot_full
//   file  page file, for example p048.webp (p0839.webp for a book of more than 999 pages)
//   sig   lower-case hex HMAC-SHA256 of the text "<slug>/<file>:<exp>" with the key PAGE_IMAGE_KEY
// The Next app signs the link after it checks the sign-in of the reader. This hook checks the signature and serves the file.
//
// Server settings (environment of the PocketBase process):
//   PAGE_IMAGE_KEY  the signing key, at least 32 characters (same value as VIEWER_PAGE_IMAGE_KEY of the app)
//   PAGE_IMAGE_DIR  folder of the images, with one subfolder for each book (on the server /opt/pocketbase-v2/page-images)
// PocketBase reads this file when it starts with --hooksDir=<folder of this file>.
//
// Answers: 503 no usable key or folder, 400 bad slug or file name, 403 bad or late exp or wrong sig, 404 no file, 200 the image.
// The hook never writes the key or the signature to the log or to a response. It changes no other route, rule, or collection.
//
// PocketBase runs each handler in its own context, so a handler cannot see a variable or a function that sits outside it.
// That is why every helper below is inside the handler.
routerAdd("GET", "/page-images/{slug}/{file}", (e) => {
  const MAX_AHEAD = 900; // seconds
  const MIN_KEY = 32; // characters

  const reply = (status, message) => e.json(status, { message: message });

  const key = $os.getenv("PAGE_IMAGE_KEY");
  const dir = $os.getenv("PAGE_IMAGE_DIR");
  if (!key || key.length < MIN_KEY) return reply(503, "Page images are not set up on this server.");
  let dirOk = false;
  try {
    dirOk = !!dir && $os.stat(dir).isDir();
  } catch (err) {
    dirOk = false;
  }
  if (!dirOk) return reply(503, "Page images are not set up on this server.");

  const slug = e.request.pathValue("slug");
  const file = e.request.pathValue("file");
  if (!/^[a-z0-9_]+$/.test(slug) || !/^p\d{3,4}\.webp$/.test(file)) return reply(400, "Bad image name.");

  const query = e.request.url.query();
  const expText = query.get("exp");
  const sig = query.get("sig");
  if (!/^[1-9]\d{0,11}$/.test(expText || "")) return reply(403, "The link is not valid.");
  const exp = parseInt(expText, 10);
  const now = Math.floor(Date.now() / 1000);
  if (exp <= now || exp > now + MAX_AHEAD) return reply(403, "The link is not valid or has expired.");
  const want = $security.hs256(slug + "/" + file + ":" + expText, key);
  if (!sig || !$security.equal(want, sig)) return reply(403, "The link is not valid.");

  const folder = dir.replace(/\/+$/, "") + "/" + slug;
  try {
    if ($os.stat(folder + "/" + file).isDir()) return reply(404, "No page image.");
  } catch (err) {
    return reply(404, "No page image.");
  }
  e.response.header().set("Content-Type", "image/webp");
  e.response.header().set("Cache-Control", "private, max-age=600");
  return e.fileFS($os.dirFS(folder), file);
});
