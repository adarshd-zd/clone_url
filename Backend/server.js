const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs").promises;

const extractRoutes = require("./routes/extract");

const app = express();
const PORT = process.env.PORT || 3001;
const downloadsDir = path.join(__dirname, "downloads");

app.use(cors());
app.use(express.json());

// Ensure downloads directory exists
fs.mkdir(downloadsDir, { recursive: true }).catch(console.error);

// Routes
app.use("/api", extractRoutes);

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Website Code Extractor API is running" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Downloads will be saved to: ${downloadsDir}`);
});
