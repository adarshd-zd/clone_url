const express = require("express");
const {
  extractWebsite,
  downloadProject,
  getSavedProjects
} = require("../controllers/extractController");

const router = express.Router();

router.post("/extract-website", extractWebsite);
router.get("/download-project/:projectId", downloadProject);
router.get("/saved-projects", getSavedProjects);

module.exports = router;
