const puppeteer = require("puppeteer");

exports.launchBrowserAndExtract = async (url) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    return await page.evaluate(() => ({
      html: document.documentElement.outerHTML,
      title: document.title,
      url: window.location.href,
    }));
  } finally {
    if (browser) await browser.close();
  }
};
