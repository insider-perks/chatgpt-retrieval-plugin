"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const express = require('express');
const puppeteer = require('puppeteer');
const nodeFetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 3000;
let browser;
// Initialize Puppeteer browser instance
function initBrowser() {
    return __awaiter(this, void 0, void 0, function* () {
        browser = yield puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true,
        });
    });
}
app.get('/SVG-Map', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { svgUrl, location } = req.query;
        console.log('Requested SVG URL:', svgUrl);
        console.log('Requested location:', location);
        let svgContent = '';
        // Getting SVG Content
        const loadSVG = (svgUrl) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const response = yield nodeFetch(svgUrl);
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                svgContent = yield response.text();
                return svgContent;
            }
            catch (error) {
                console.error('Error fetching SVG:', error);
                throw error;
            }
        });
        svgContent = yield loadSVG(svgUrl);
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
        const svgSelector = '#mapContainer';
        const screenshotBuffer = yield getSVGMap(htmlContent, svgSelector);
        if (screenshotBuffer) {
            res.set('Content-Type', 'image/png');
            res.send(screenshotBuffer);
        }
        else {
            res.status(500).json({ error: 'Failed to capture screenshot' });
        }
    }
    catch (error) {
        console.error('Unexpected error:', error);
        res.status(500).json({ error: 'Unexpected error' });
    }
}));
function getSVGMap(htmlContent, svgSelector) {
    return __awaiter(this, void 0, void 0, function* () {
        const page = yield browser.newPage();
        try {
            yield page.setContent(htmlContent);
            yield page.evaluate(() => document.fonts.ready);
            yield page.waitForSelector(svgSelector, { visible: true });
            // Get the SVG dimensions
            const dimensions = yield page.evaluate((selector) => {
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
            yield page.setViewport({
                width: dimensions.width,
                height: dimensions.height,
                deviceScaleFactor: 1,
            });
            return yield page.screenshot({
                clip: { x: 0, y: 0, width: dimensions.width, height: dimensions.height },
            });
        }
        catch (error) {
            console.error('Error during screenshot capture:', error.message);
            return null;
        }
        finally {
            yield page.close();
        }
    });
}
const server = app.listen(port, () => __awaiter(void 0, void 0, void 0, function* () {
    yield initBrowser();
    console.log(`Server is running on port ${port}`);
}));
server.setTimeout(60000);
process.on('exit', () => {
    if (browser)
        browser.close();
});
