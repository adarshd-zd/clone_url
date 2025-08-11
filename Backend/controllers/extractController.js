const path = require("path");
const fs = require("fs").promises;
const archiver = require("archiver");

const { launchBrowserAndExtract } = require("../utils/puppeteerUtils");
const { createProjectStructure } = require("../utils/assetExtractor");

const downloadsDir = path.join(__dirname, "..", "downloads");

exports.extractWebsite = async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    const pageData = await launchBrowserAndExtract(url);
    const projectId = `project_${Date.now()}`;
    const siteName = pageData.title || "Website";

    const result = await createProjectStructure(
      projectId,
      siteName,
      { html: pageData.html },
      pageData.url
    );

    res.json({
      success: true,
      projectId,
      siteName,
      title: pageData.title,
      stats: {
        htmlFiles: 1,
        cssFiles: result.processedFiles.css.length,
        jsFiles: result.processedFiles.js.length,
        images: result.processedFiles.images.length
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to extract website", details: err.message });
  }
};

exports.downloadProject = async (req, res) => {
  const { projectId } = req.params;
  const projectDir = path.join(downloadsDir, projectId);

  try {
    await fs.access(projectDir);

    const archive = archiver("zip", { zlib: { level: 9 } });
    res.attachment(`${projectId}.zip`);
    archive.pipe(res);
    archive.directory(projectDir, false);
    await archive.finalize();
  } catch {
    res.status(500).json({ error: "Failed to create project ZIP" });
  }
};

exports.getSavedProjects = async (req, res) => {
  try {
    const files = await fs.readdir(downloadsDir);
    const projects = [];

    for (const file of files) {
      const filepath = path.join(downloadsDir, file);
      const stats = await fs.stat(filepath);

      if (stats.isDirectory() && file.startsWith("project_")) {
        projects.push({ id: file, name: file, created: stats.birthtime });
      }
    }

    res.json({ projects });
  } catch {
    res.status(500).json({ error: "Failed to get saved projects" });
  }
};
