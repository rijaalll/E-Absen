// middleware/apikey.middleware.js

const verifyApiKey = (req, res, next) => {
  // Ambil API key dari header 'x-api-key'
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
      return res.status(401).send({ message: "Akses ditolak. API Key tidak disediakan." });
  }

  // Bandingkan dengan API key yang ada di .env
  if (apiKey !== process.env.WEBSITE_API_KEY) {
      return res.status(403).send({ message: "API Key tidak valid." });
  }

  next(); // Jika valid, lanjutkan
};

module.exports = verifyApiKey;
