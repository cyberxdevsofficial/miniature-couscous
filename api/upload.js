const axios = require("axios");
const FormData = require("form-data");
const multer = require("multer");

export const config = {
  api: {
    bodyParser: false
  }
};

const upload = multer({
  storage: multer.memoryStorage()
});

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

module.exports = async (req, res) => {

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      message: "Method not allowed. Use POST."
    });
  }

  try {

    await runMiddleware(req, res, upload.single("file"));

    if (!req.file) {
      return res.status(400).json({
        ok: false,
        message: "No file uploaded. Use form-data with key 'file'."
      });
    }

    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("fileToUpload", req.file.buffer, {
      filename: req.file.originalname
    });

    const response = await axios.post(
      "https://catbox.moe/user/api.php",
      form,
      {
        headers: form.getHeaders(),
        timeout: 60000
      }
    );

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
