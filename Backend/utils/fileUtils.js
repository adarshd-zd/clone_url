const path = require("path");
const fs = require("fs").promises;
const https = require("https");
const http = require("http");
const { URL } = require("url");

// Download a file from a URL
async function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https:") ? https : http;
    const fileStream = require("fs").createWriteStream(filepath);

    protocol
      .get(url, (response) => {
        if (response.statusCode === 200) {
          response.pipe(fileStream);
          fileStream.on("finish", () => {
            fileStream.close();
            resolve(filepath);
          });
        } else {
          fileStream.close();
          require("fs").unlink(filepath, () => {});
          reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        }
      })
      .on("error", (err) => {
        fileStream.close();
        require("fs").unlink(filepath, () => {});
        reject(err);
      });
  });
}

// Get file extension from URL
function getFileExtension(url) {
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname).toLowerCase();
    return ext || ".jpg"; // Default if no extension
  } catch {
    return ".jpg";
  }
}

// Generate a safe filename from URL
function generateSafeFilename(url, index = 0) {
  try {
    const urlObj = new URL(url);
    let filename = path.basename(urlObj.pathname) || `file-${index}`;

    filename = filename.split("?")[0].split("#")[0];
    filename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");

    if (!path.extname(filename)) {
      filename += getFileExtension(url);
    }
    return filename;
  } catch {
    return `file-${index}.jpg`;
  }
}

module.exports = {
  downloadFile,
  getFileExtension,
  generateSafeFilename
};
