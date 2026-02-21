const axios = require("axios");
const FormData = require("form-data");
const multer = require("multer");

module.exports.config = { api: { bodyParser: false } };

// Limit 5MB, memoryStorage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Helper to run middleware
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      resolve(result);
    });
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Use POST" });
  }

  try {
    await runMiddleware(req, res, upload.single("file"));

    if (!req.file) {
      return res.status(400).json({ ok: false, message: "No file uploaded" });
    }

    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("fileToUpload", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    const response = await axios.post("https://catbox.moe/user/api.php", form, {
      headers: form.getHeaders(),
      timeout: 30000
    });

    const fileUrl = response.data?.trim();

    return res.status(200).json({
      ok: fileUrl.startsWith("http"),
      url: fileUrl,
      creator: "CyberX Devs"
    });

  } catch (error) {
    console.error("Catbox Upload Error:", error.message);
    return res.status(500).json({
      ok: false,
      message: "Upload failed",
      error: error.message
    });
  }
};
