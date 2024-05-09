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
// Function to load SVG content from URL
function loadSVG(svgUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield nodeFetch(svgUrl);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return yield response.text();
        }
        catch (error) {
            console.error('Error fetching SVG:', error);
            throw error;
        }
    });
}
// Function to directly manipulate SVG content
function modifySVG(svgContent, location) {
    return svgContent.replace(/id="([^"]*?)"/g, (match, id) => {
        // Apply style changes directly within SVG where the ID matches
        if (id === location) {
            return `id="${id}" style="fill: red !important;"`;
        }
        return match;
    });
}
app.get('/SVG-Map', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { svgUrl, location } = req.query;
        const svgContent = yield loadSVG(svgUrl);
        const modifiedSVGContent = modifySVG(svgContent, location);
        res.set('Content-Type', 'image/svg+xml');
        res.send(modifiedSVGContent);
    }
    catch (error) {
        console.error('Error during request:', error);
        res.status(500).json({ error: 'Unexpected error' });
    }
}));
const server = app.listen(port, () => __awaiter(void 0, void 0, void 0, function* () {
    yield initBrowser();
    console.log(`Server is running on port ${port}`);
}));
server.setTimeout(60000);
process.on('exit', () => {
    if (browser)
        browser.close();
});
