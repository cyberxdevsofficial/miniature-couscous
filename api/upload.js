const axios = require("axios");
const FormData = require("form-data");
const multer = require("multer");

module.exports.config = { api: { bodyParser: false } };

// Up to 50 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      resolve(result);
    });
  });
}

// Fetch remote file by URL
async function fetchFile(url) {
  const response = await axios.get(url, { responseType: "arraybuffer" });
  const contentType = response.headers["content-type"] || "application/octet-stream";
  const filename = url.split("/").pop() || "file";
  return { buffer: Buffer.from(response.data), filename, contentType };
}

module.exports = async (req, res) => {
  try {
    let fileBuffer, filename, contentType;

    if (req.method === "POST") {
      await runMiddleware(req, res, upload.single("file"));

      if (!req.file && !req.query.url) {
        return res.status(400).json({ ok: false, message: "Upload file or use ?url=" });
      }

      if (req.file) {
        fileBuffer = req.file.buffer;
        filename = req.file.originalname;
        contentType = req.file.mimetype;
      } else if (req.query.url) {
        const fetched = await fetchFile(req.query.url);
        fileBuffer = fetched.buffer;
        filename = fetched.filename;
        contentType = fetched.contentType;
      }
    } else if (req.method === "GET" && req.query.url) {
      const fetched = await fetchFile(req.query.url);
      fileBuffer = fetched.buffer;
      filename = fetched.filename;
      contentType = fetched.contentType;
    } else {
      return res.status(405).json({ ok: false, message: "Use POST (multipart) or GET ?url=" });
    }

    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("fileToUpload", fileBuffer, { filename, contentType });

    const catboxResp = await axios.post("https://catbox.moe/user/api.php", form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
      timeout: 60000
    });

    const fileUrl = catboxResp.data?.trim();

    return res.status(200).json({
      ok: fileUrl.startsWith("http"),
      url: fileUrl,
      creator: "CyberX Devs"
    });

  } catch (err) {
    console.error("Upload Error:", err.message);
    return res.status(500).json({ ok: false, message: "Upload failed", error: err.message });
  }
};
