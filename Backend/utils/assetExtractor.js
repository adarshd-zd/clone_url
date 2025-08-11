const cheerio = require("cheerio");
const beautify = require("js-beautify");
const path = require("path");
const fs = require("fs").promises;

const { generateSafeFilename } = require("./fileUtils");

async function separateCodeAndAssets(html, baseUrl, projectDir) {
  const $ = cheerio.load(html);
  const extractedFiles = { html: "", css: [], js: [], images: [] };

  // Create asset folders
  await Promise.all([
    fs.mkdir(path.join(projectDir, "css"), { recursive: true }),
    fs.mkdir(path.join(projectDir, "js"), { recursive: true }),
    fs.mkdir(path.join(projectDir, "images"), { recursive: true })
  ]);

  /** ======================
   *  Process External CSS
   ====================== **/
  const externalCSS = [];
  const cssLinks = $('link[rel="stylesheet"]');
  for (let i = 0; i < cssLinks.length; i++) {
    const link = $(cssLinks[i]);
    const href = link.attr("href");
    if (href) {
      try {
        const cssUrl = new URL(href, baseUrl).href;
        const filename = `external-${i + 1}.css`;
        const filepath = path.join(projectDir, "css", filename);

        const res = await fetch(cssUrl);
        if (res.ok) {
          const cssContent = await res.text();
          const beautifiedCSS = beautify.css(cssContent, { indent_size: 2 });
          await fs.writeFile(filepath, beautifiedCSS);
          externalCSS.push(beautifiedCSS);
          link.attr("href", `css/${filename}`);
        }
      } catch {
        link.remove();
      }
    }
  }

  /** ======================
   *  Process Inline CSS
   ====================== **/
  const inlineStyles = [];
  $("style").each((i, elem) => {
    const cssContent = $(elem).html();
    if (cssContent?.trim()) {
      const beautifiedCSS = beautify.css(cssContent.trim(), { indent_size: 2 });
      inlineStyles.push(beautifiedCSS);
    }
    $(elem).remove();
  });

  inlineStyles.forEach(async (style, i) => {
    const filename = i === 0 ? "style.css" : `style-${i + 1}.css`;
    const filepath = path.join(projectDir, "css", filename);
    await fs.writeFile(filepath, style);
    $("head").append(`<link rel="stylesheet" href="css/${filename}">`);
  });

  /** ======================
   *  Process External JS
   ====================== **/
  const externalJS = [];
  const scriptTags = $("script[src]");
  for (let i = 0; i < scriptTags.length; i++) {
    const script = $(scriptTags[i]);
    const src = script.attr("src");

    if (src && !/google|facebook|analytics/.test(src)) {
      try {
        const jsUrl = new URL(src, baseUrl).href;
        const filename = `external-${i + 1}.js`;
        const filepath = path.join(projectDir, "js", filename);

        const res = await fetch(jsUrl);
        if (res.ok) {
          const jsContent = await res.text();
          const beautifiedJS = beautify.js(jsContent, { indent_size: 2 });
          await fs.writeFile(filepath, beautifiedJS);
          externalJS.push(beautifiedJS);
          script.attr("src", `js/${filename}`);
        }
      } catch {
        script.remove();
      }
    }
  }

  /** ======================
   *  Process Inline JS
   ====================== **/
  const inlineScripts = [];
  $("script").each((i, elem) => {
    if (!$(elem).attr("src")) {
      const jsContent = $(elem).html();
      if (jsContent?.trim()) {
        inlineScripts.push(beautify.js(jsContent.trim(), { indent_size: 2 }));
      }
      $(elem).remove();
    }
  });

  inlineScripts.forEach(async (script, i) => {
    const filename = i === 0 ? "script.js" : `script-${i + 1}.js`;
    const filepath = path.join(projectDir, "js", filename);
    await fs.writeFile(filepath, script);
    $("body").append(`<script src="js/${filename}"></script>`);
  });

  /** ======================
   *  Download Images
   ====================== **/
  const downloadedImages = [];
  const images = $("img");
  for (let i = 0; i < Math.min(images.length, 50); i++) {
    const img = $(images[i]);
    const src = img.attr("src");
    if (src && !src.startsWith("data:")) {
      try {
        const imgUrl = new URL(src, baseUrl).href;
        const filename = generateSafeFilename(imgUrl, i);
        const filepath = path.join(projectDir, "images", filename);
        const res = await fetch(imgUrl);
        if (res.ok) {
          const buffer = Buffer.from(await res.arrayBuffer());
          await fs.writeFile(filepath, buffer);
          downloadedImages.push(filename);
          img.attr("src", `images/${filename}`);
        }
      } catch {
        // Ignore failed image downloads
      }
    }
  }

  /** ======================
   *  Beautify HTML
   ====================== **/
  extractedFiles.html = beautify.html($.html(), { indent_size: 2 });
  extractedFiles.css = [...inlineStyles, ...externalCSS];
  extractedFiles.js = [...inlineScripts, ...externalJS];
  extractedFiles.images = downloadedImages;

  return extractedFiles;
}

async function createProjectStructure(projectId, siteName, files, baseUrl) {
  const downloadsDir = path.join(__dirname, "..", "downloads");
  const projectDir = path.join(downloadsDir, projectId);
  await fs.mkdir(projectDir, { recursive: true });

  const processedFiles = await separateCodeAndAssets(files.html, baseUrl, projectDir);
  await fs.writeFile(path.join(projectDir, "index.html"), processedFiles.html);

  const readme = `# ${siteName}\n\nExtracted with Website Code Extractor.\n`;
  await fs.writeFile(path.join(projectDir, "README.md"), readme);

  return { processedFiles, projectDir };
}

module.exports = { separateCodeAndAssets, createProjectStructure };
