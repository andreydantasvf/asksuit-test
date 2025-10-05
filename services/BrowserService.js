const puppeteer = require('puppeteer');

class BrowserService {
    static async getBrowser() {
        return await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }

    static async closeBrowser(browser) {
        if (!browser) {
            return;
        }
        return await browser.close();
    }

    static async createPage(browser) {
        if (!browser) {
            throw new Error('Browser instance is required');
        }
        return await browser.newPage();
    }

    static async navigateToPage(page, url, options = {}) {
        if (!page) {
            throw new Error('Page instance is required');
        }
        
        const defaultOptions = {
            waitUntil: 'networkidle2',
            timeout: 30000
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        return await page.goto(url, finalOptions);
    }

    static async waitForSelector(page, selector, options = {}) {
        if (!page) {
            throw new Error('Page instance is required');
        }
        
        const defaultOptions = {
            timeout: 10000
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        try {
            return await page.waitForSelector(selector, finalOptions);
        } catch (error) {
            console.warn(`Selector ${selector} not found within timeout`);
            return null;
        }
    }

    static async getPageContent(page) {
        if (!page) {
            throw new Error('Page instance is required');
        }
        
        return await page.content();
    }

    static async getPageHTML(page) {
        if (!page) {
            throw new Error('Page instance is required');
        }
        
        return await page.evaluate(() => {
            return document.documentElement.outerHTML;
        });
    }
}

module.exports = BrowserService;
