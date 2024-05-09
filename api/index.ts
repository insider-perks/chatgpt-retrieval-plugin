const express = require('express');
const puppeteer = require('puppeteer');
const nodeFetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

let browser: any;

// Initialize Puppeteer browser instance
async function initBrowser() {
    browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true,
    });
}

// Function to load SVG content from URL
async function loadSVG(svgUrl: any) {
    try {
        const response = await nodeFetch(svgUrl);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return await response.text();
    } catch (error) {
        console.error('Error fetching SVG:', error);
        throw error;
    }
}

// Function to generate the full HTML content including the SVG
function createHTMLContent(svgContent: any, location: any) {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Interactive Resort Map</title>
            <style>
                #mapContainer svg {
                    width: 100%;
                    max-width: 800px;
                    height: auto;
                    display: block;
                    margin: 0 auto;
                }
                #${location} {
                    fill: red !important;
                }
            </style>
        </head>
        <body>
            <div id="mapContainer">
                ${svgContent}
            </div>
        </body>
        </html>       
    `;
}

// Function to capture a screenshot of the SVG
async function getSVGMap(page: any, htmlContent: any, svgSelector: any) {
    try {
        await page.setContent(htmlContent);
        await page.evaluate(() => document.fonts.ready);
        await page.waitForSelector(svgSelector, { visible: true });

        const dimensions = await page.evaluate((selector: any) => {
            const element = document.querySelector(selector);
            if (!element) {
                throw new Error("SVG element not found");
            }
            return {
                width: element.clientWidth || element.getBoundingClientRect().width,
                height: element.clientHeight || element.getBoundingClientRect().height
            };
        }, svgSelector);

        await page.setViewport({
            width: dimensions.width,
            height: dimensions.height,
            deviceScaleFactor: 1,
        });

        return await page.screenshot({
            clip: { x: 0, y: 0, width: dimensions.width, height: dimensions.height },
        });
    } catch (error: any) {
        console.error('Error during screenshot capture:', error.message);
        return null;
    }
}

app.get('/SVG-Map', async (req: any, res: any) => {
    let page;
    try {
        const { svgUrl, location } = req.query;
        page = await browser.newPage();
        const svgContent = await loadSVG(svgUrl);
        const htmlContent = createHTMLContent(svgContent, location);
        const screenshotBuffer = await getSVGMap(page, htmlContent, '#mapContainer');

        if (screenshotBuffer) {
            res.set('Content-Type', 'image/png');
            res.send(screenshotBuffer);
        } else {
            res.status(500).json({ error: 'Failed to capture screenshot' });
        }
    } catch (error) {
        console.error('Error during request:', error);
        res.status(500).json({ error: 'Unexpected error' });
    } finally {
        if (page) await page.close();
    }
});

const server = app.listen(port, async () => {
    await initBrowser();
    console.log(`Server is running on port ${port}`);
});

server.setTimeout(60000);

process.on('exit', () => {
    if (browser) browser.close();
});
