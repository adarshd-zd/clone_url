const express = require("express")
const cors = require("cors")
const puppeteer = require("puppeteer")
const fs = require("fs").promises
const path = require("path")
const cheerio = require("cheerio")
const beautify = require("js-beautify")
const archiver = require("archiver")
const https = require("https")
const http = require("http")
const { URL } = require("url")

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Create downloads directory if it doesn't exist
const downloadsDir = path.join(__dirname, "downloads")
fs.mkdir(downloadsDir, { recursive: true }).catch(console.error)

// Helper function to download file from URL
async function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https:") ? https : http
    const file = require("fs").createWriteStream(filepath)

    protocol
      .get(url, (response) => {
        if (response.statusCode === 200) {
          response.pipe(file)
          file.on("finish", () => {
            file.close()
            resolve(filepath)
          })
        } else {
          file.close()
          require("fs").unlink(filepath, () => {}) // Delete the file on error
          reject(new Error(`Failed to download ${url}: ${response.statusCode}`))
        }
      })
      .on("error", (err) => {
        file.close()
        require("fs").unlink(filepath, () => {}) // Delete the file on error
        reject(err)
      })
  })
}

// Helper function to get file extension from URL
function getFileExtension(url) {
  try {
    const pathname = new URL(url).pathname
    const ext = path.extname(pathname).toLowerCase()
    return ext || ".jpg" // Default to .jpg for images without extension
  } catch {
    return ".jpg"
  }
}

// Helper function to generate safe filename
function generateSafeFilename(url, index = 0) {
  try {
    const urlObj = new URL(url)
    let filename = path.basename(urlObj.pathname) || `file-${index}`

    // Remove query parameters and clean filename
    filename = filename.split("?")[0].split("#")[0]
    filename = filename.replace(/[^a-zA-Z0-9.-]/g, "_")

    // Ensure it has an extension
    if (!path.extname(filename)) {
      const ext = getFileExtension(url)
      filename += ext
    }

    return filename
  } catch {
    return `file-${index}.jpg`
  }
}

// Enhanced function to separate and clean code with asset downloading
async function separateCodeAndAssets(html, baseUrl, projectDir) {
  const $ = cheerio.load(html)
  const extractedFiles = {
    html: "",
    css: [],
    js: [],
    images: [],
  }

  // Create directories
  await fs.mkdir(path.join(projectDir, "css"), { recursive: true })
  await fs.mkdir(path.join(projectDir, "js"), { recursive: true })
  await fs.mkdir(path.join(projectDir, "images"), { recursive: true })

  // Extract and download external CSS
  const externalCSS = []
  const cssLinks = $('link[rel="stylesheet"]')

  for (let i = 0; i < cssLinks.length; i++) {
    const link = $(cssLinks[i])
    const href = link.attr("href")

    if (href) {
      try {
        const cssUrl = new URL(href, baseUrl).href
        const filename = `external-${i + 1}.css`
        const filepath = path.join(projectDir, "css", filename)

        // Download CSS file
        const response = await fetch(cssUrl)
        if (response.ok) {
          const cssContent = await response.text()
          const beautifiedCSS = beautify.css(cssContent, {
            indent_size: 2,
            indent_char: " ",
            max_preserve_newlines: 2,
          })

          await fs.writeFile(filepath, beautifiedCSS, "utf8")
          externalCSS.push(beautifiedCSS)

          // Update link to point to local file
          link.attr("href", `css/${filename}`)
        }
      } catch (error) {
        console.log(`Failed to download CSS: ${href}`)
        // Remove the link if it can't be downloaded
        link.remove()
      }
    }
  }

  // Extract inline CSS
  const inlineStyles = []
  $("style").each((i, elem) => {
    const cssContent = $(elem).html()
    if (cssContent && cssContent.trim()) {
      const cleanCSS = cssContent
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\s+/g, " ")
        .trim()

      if (cleanCSS) {
        const beautifiedCSS = beautify.css(cleanCSS, {
          indent_size: 2,
          indent_char: " ",
          max_preserve_newlines: 2,
        })
        inlineStyles.push(beautifiedCSS)
      }
    }
    $(elem).remove()
  })

  // Save inline CSS to files
  for (let i = 0; i < inlineStyles.length; i++) {
    const filename = i === 0 ? "style.css" : `style-${i + 1}.css`
    const filepath = path.join(projectDir, "css", filename)
    await fs.writeFile(filepath, inlineStyles[i], "utf8")

    // Add link to head
    $("head").append(`<link rel="stylesheet" href="css/${filename}">`)
  }

  // Extract and download external JavaScript
  const externalJS = []
  const scriptTags = $("script[src]")

  for (let i = 0; i < scriptTags.length; i++) {
    const script = $(scriptTags[i])
    const src = script.attr("src")

    if (src && !src.includes("google") && !src.includes("facebook") && !src.includes("analytics")) {
      try {
        const jsUrl = new URL(src, baseUrl).href
        const filename = `external-${i + 1}.js`
        const filepath = path.join(projectDir, "js", filename)

        // Download JS file
        const response = await fetch(jsUrl)
        if (response.ok) {
          const jsContent = await response.text()
          let beautifiedJS
          try {
            beautifiedJS = beautify.js(jsContent, {
              indent_size: 2,
              indent_char: " ",
              max_preserve_newlines: 2,
            })
          } catch {
            beautifiedJS = jsContent
          }

          await fs.writeFile(filepath, beautifiedJS, "utf8")
          externalJS.push(beautifiedJS)

          // Update script to point to local file
          script.attr("src", `js/${filename}`)
        }
      } catch (error) {
        console.log(`Failed to download JS: ${src}`)
        // Remove the script if it can't be downloaded
        script.remove()
      }
    }
  }

  // Extract inline JavaScript
  const inlineScripts = []
  $("script").each((i, elem) => {
    const script = $(elem)
    const src = script.attr("src")

    if (!src) {
      const jsContent = script.html()
      if (jsContent && jsContent.trim()) {
        try {
          const cleanJS = jsContent.trim()
          const beautifiedJS = beautify.js(cleanJS, {
            indent_size: 2,
            indent_char: " ",
            max_preserve_newlines: 2,
          })
          inlineScripts.push(beautifiedJS)
        } catch (error) {
          inlineScripts.push(jsContent)
        }
      }
      script.remove()
    }
  })

  // Save inline JavaScript to files
  for (let i = 0; i < inlineScripts.length; i++) {
    const filename = i === 0 ? "script.js" : `script-${i + 1}.js`
    const filepath = path.join(projectDir, "js", filename)
    await fs.writeFile(filepath, inlineScripts[i], "utf8")

    // Add script tag to body
    $("body").append(`<script src="js/${filename}"></script>`)
  }

  // Download and update images
  const images = $("img")
  const downloadedImages = []

  for (let i = 0; i < Math.min(images.length, 50); i++) {
    // Limit to 50 images
    const img = $(images[i])
    const src = img.attr("src")

    if (src && !src.startsWith("data:")) {
      try {
        const imgUrl = new URL(src, baseUrl).href
        const filename = generateSafeFilename(imgUrl, i)
        const filepath = path.join(projectDir, "images", filename)

        // Download image
        const response = await fetch(imgUrl)
        if (response.ok) {
          const buffer = await response.arrayBuffer()
          await fs.writeFile(filepath, Buffer.from(buffer))
          downloadedImages.push(filename)

          // Update img src to point to local file
          img.attr("src", `images/${filename}`)
        }
      } catch (error) {
        console.log(`Failed to download image: ${src}`)
        // Keep original src if download fails
      }
    }
  }

  // Update background images in CSS
  $("*").each((i, elem) => {
    const $elem = $(elem)
    const style = $elem.attr("style")

    if (style && style.includes("background-image")) {
      // This is a simplified approach - in production you'd want more robust CSS parsing
      const updatedStyle = style.replace(/url$$['"]?([^'"]+)['"]?$$/g, (match, url) => {
        try {
          if (!url.startsWith("data:") && !url.startsWith("images/")) {
            const fullUrl = new URL(url, baseUrl).href
            const filename = generateSafeFilename(fullUrl)
            return `url('images/${filename}')`
          }
        } catch (error) {
          // Keep original if URL parsing fails
        }
        return match
      })
      $elem.attr("style", updatedStyle)
    }
  })

  // Clean up HTML attributes and structure
  $("*").each((i, elem) => {
    const $elem = $(elem)

    // Remove auto-generated classes and IDs
    const classAttr = $elem.attr("class")
    if (classAttr) {
      const cleanClasses = classAttr
        .split(" ")
        .filter(
          (cls) => !cls.startsWith("css-") && !cls.match(/^[a-z0-9]{6,}$/) && cls.length > 1 && !cls.startsWith("Mui"),
        )
        .join(" ")

      if (cleanClasses) {
        $elem.attr("class", cleanClasses)
      } else {
        $elem.removeAttr("class")
      }
    }

    // Clean up auto-generated IDs
    const idAttr = $elem.attr("id")
    if (idAttr && (idAttr.match(/^:r\d+:?$/) || idAttr.match(/^[a-z0-9]{6,}$/))) {
      $elem.removeAttr("id")
    }

    // Remove unnecessary attributes
    $elem.removeAttr("data-testid")
    $elem.removeAttr("data-shrink")
    $elem.removeAttr("focusable")

    // Clean up inline styles with CSS variables
    const styleAttr = $elem.attr("style")
    if (styleAttr && styleAttr.includes("--")) {
      const cleanStyle = styleAttr
        .split(";")
        .filter((style) => !style.trim().startsWith("--"))
        .join(";")

      if (cleanStyle.trim()) {
        $elem.attr("style", cleanStyle)
      } else {
        $elem.removeAttr("style")
      }
    }
  })

  // Clean and beautify HTML
  const cleanHtml = beautify.html($.html(), {
    indent_size: 2,
    indent_char: " ",
    max_preserve_newlines: 2,
    preserve_newlines: true,
    end_with_newline: true,
    wrap_line_length: 120,
    indent_inner_html: true,
    indent_body_inner_html: true,
    indent_head_inner_html: true,
  })

  extractedFiles.html = cleanHtml
  extractedFiles.css = [...inlineStyles, ...externalCSS]
  extractedFiles.js = [...inlineScripts, ...externalJS]
  extractedFiles.images = downloadedImages

  return extractedFiles
}

// Create project structure for vanilla files
async function createProjectStructure(projectId, siteName, files, baseUrl) {
  const projectDir = path.join(downloadsDir, projectId)

  // Create main project directory
  await fs.mkdir(projectDir, { recursive: true })

  // Process the HTML and download assets
  const processedFiles = await separateCodeAndAssets(files.html, baseUrl, projectDir)

  // Write the processed HTML file
  await fs.writeFile(path.join(projectDir, "index.html"), processedFiles.html, "utf8")

  // Create a README file
  const readme = `# ${siteName} - Extracted Website

This website was extracted using the Website Code Extractor.

## Files Structure

- \`index.html\` - Main HTML file (ready to open in browser)
- \`css/\` - Stylesheets directory
- \`js/\` - JavaScript files directory  
- \`images/\` - Images directory

## How to Use

1. **Open in Browser**: Double-click \`index.html\` to open in your web browser
2. **Edit Files**: Modify HTML, CSS, and JS files as needed
3. **Host Online**: Upload entire folder to any web server

## File Details

- **HTML Files**: 1
- **CSS Files**: ${processedFiles.css.length}
- **JavaScript Files**: ${processedFiles.js.length}
- **Images**: ${processedFiles.images.length}

## Notes

- All external resources have been downloaded locally
- All links updated to point to local files
- Code has been formatted for better readability
- Images are stored in the images/ directory
- Ready to work offline!

## Original Website
- **Source**: ${baseUrl}
- **Extracted**: ${new Date().toLocaleString()}
`

  await fs.writeFile(path.join(projectDir, "README.md"), readme, "utf8")

  return {
    processedFiles,
    projectDir,
  }
}

// Generate file structure visualization
function generateFileStructure(stats) {
  return `📁 website-project/
├── 📄 index.html (ready to open!)
├── 📄 README.md
├── 📁 css/
${
  stats.cssFiles > 0
    ? Array.from(
        { length: Math.min(stats.cssFiles, 5) },
        (_, i) =>
          `│   ${i === Math.min(stats.cssFiles, 5) - 1 ? "└──" : "├──"} 📄 ${i === 0 ? "style.css" : `style-${i + 1}.css`}`,
      ).join("\n") + (stats.cssFiles > 5 ? "\n│   └── ... and more" : "")
    : "│   └── (no CSS files)"
}
├── 📁 js/
${
  stats.jsFiles > 0
    ? Array.from(
        { length: Math.min(stats.jsFiles, 5) },
        (_, i) =>
          `│   ${i === Math.min(stats.jsFiles, 5) - 1 ? "└──" : "├──"} 📄 ${i === 0 ? "script.js" : `script-${i + 1}.js`}`,
      ).join("\n") + (stats.jsFiles > 5 ? "\n│   └── ... and more" : "")
    : "│   └── (no JS files)"
}
└── 📁 images/
${
  stats.images > 0
    ? `    ├── 📄 ${stats.images} downloaded images` + (stats.images > 1 ? "\n    └── (all images work offline!)" : "")
    : "    └── (no images)"
}`
}

// Extract website code endpoint
app.post("/api/extract-website", async (req, res) => {
  const { url } = req.body

  if (!url) {
    return res.status(400).json({ error: "URL is required" })
  }

  let browser
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })

    const page = await browser.newPage()

    // Set user agent to avoid blocking
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    )

    // Navigate to the URL
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    })

    // Extract page content
    const pageData = await page.evaluate(() => {
      return {
        html: document.documentElement.outerHTML,
        title: document.title,
        url: window.location.href,
      }
    })

    // Generate project ID and site name
    const projectId = `project_${Date.now()}`
    const siteName = pageData.title ? pageData.title.replace(/[^a-zA-Z0-9\s]/g, "").trim() : "Website"

    // Create project structure with asset downloading
    const result = await createProjectStructure(projectId, siteName, { html: pageData.html }, pageData.url)

    // Prepare response
    const stats = {
      htmlFiles: 1,
      cssFiles: result.processedFiles.css.length,
      jsFiles: result.processedFiles.js.length,
      images: result.processedFiles.images.length,
      totalFiles:
        1 +
        result.processedFiles.css.length +
        result.processedFiles.js.length +
        result.processedFiles.images.length +
        1, // +1 for README
    }

    const response = {
      success: true,
      projectId: projectId,
      siteName: siteName,
      title: pageData.title,
      fileStructure: generateFileStructure(stats),
      stats: stats,
      keyFiles: {
        "index.html": result.processedFiles.html.substring(0, 1500),
        ...(result.processedFiles.css.length > 0 && {
          "css/style.css": result.processedFiles.css[0].substring(0, 1500),
        }),
        ...(result.processedFiles.js.length > 0 && { "js/script.js": result.processedFiles.js[0].substring(0, 1500) }),
      },
    }

    res.json(response)
  } catch (error) {
    console.error("Error extracting website:", error)
    res.status(500).json({
      error: "Failed to extract website code",
      details: error.message,
    })
  } finally {
    if (browser) {
      await browser.close()
    }
  }
})

// Download project as ZIP endpoint
app.get("/api/download-project/:projectId", async (req, res) => {
  const { projectId } = req.params
  const projectDir = path.join(downloadsDir, projectId)

  try {
    // Check if project directory exists
    await fs.access(projectDir)

    // Create ZIP archive
    const archive = archiver("zip", {
      zlib: { level: 9 },
    })

    res.attachment(`${projectId}.zip`)
    archive.pipe(res)

    // Add all files from project directory to archive
    archive.directory(projectDir, false)

    await archive.finalize()
  } catch (error) {
    console.error("Error creating ZIP:", error)
    res.status(500).json({ error: "Failed to create project ZIP" })
  }
})

// Get saved projects endpoint
app.get("/api/saved-projects", async (req, res) => {
  try {
    const files = await fs.readdir(downloadsDir)
    const projects = []

    for (const file of files) {
      const filepath = path.join(downloadsDir, file)
      const stats = await fs.stat(filepath)

      if (stats.isDirectory() && file.startsWith("project_")) {
        projects.push({
          id: file,
          name: file,
          created: stats.birthtime,
          size: stats.size,
        })
      }
    }

    res.json({ projects })
  } catch (error) {
    res.status(500).json({ error: "Failed to get saved projects" })
  }
})

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Website Code Extractor API is running" })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Downloads will be saved to: ${downloadsDir}`)
})
