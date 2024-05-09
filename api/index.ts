
const express = require('express');
const puppeteer = require('puppeteer');
const nodeFetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

let browser: { newPage: () => any; close: () => void; };

// Initialize Puppeteer browser instance
async function initBrowser() {
    browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true,
    });
}

app.get('/SVG-Map', async (req: { query: { svgUrl: any; location: any; }; }, res: { set: (arg0: string, arg1: string) => void; send: (arg0: any) => void; status: (arg0: number) => { (): any; new(): any; json: { (arg0: { error: string; }): void; new(): any; }; }; }) => {
    try {
        const { svgUrl, location } = req.query;
        console.log('Requested SVG URL:', svgUrl);
        console.log('Requested location:', location);

        let svgContent = '';

        // Getting SVG Content
        const loadSVG = async (svgUrl: string): Promise<string> => {
            try {
                const response = await nodeFetch(svgUrl);
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                svgContent = await response.text();
                return svgContent;
            } catch (error) {
                console.error('Error fetching SVG:', error);
                throw error;
            }
        };

        svgContent = await loadSVG(svgUrl);

        const htmlContent = `
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

        const svgSelector: any = '#mapContainer';
        const screenshotBuffer = await getSVGMap(htmlContent, svgSelector);

        if (screenshotBuffer) {
            res.set('Content-Type', 'image/png');
            res.send(screenshotBuffer);
        } else {
            res.status(500).json({ error: 'Failed to capture screenshot' });
        }
    } catch (error) {
        console.error('Unexpected error:', error);
        res.status(500).json({ error: 'Unexpected error' });
    }
});

async function getSVGMap(htmlContent: string, svgSelector: any) {
    const page = await browser.newPage();
    try {
        await page.setContent(htmlContent);
        await page.evaluate(() => document.fonts.ready);
        await page.waitForSelector(svgSelector, { visible: true });

        // Get the SVG dimensions
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

        // Set the viewport to match SVG dimensions
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
    } finally {
        await page.close();
    }
}


const server = app.listen(port, async () => {
    await initBrowser();
    console.log(`Server is running on port ${port}`);
});

server.setTimeout(60000);

process.on('exit', () => {
    if (browser) browser.close();
});
