// LinkedInIntegrationService.js - Updated to use environment variables
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
require('dotenv').config();

class LinkedInIntegrationService {
    constructor() {
        this.screenshotDir = './screenshots';
        this.analysisDir = './linkedin_analysis';
        this.pythonScript = './scripts/linkedin_analysis.py';

        // Read credentials from environment variables
        this.linkedinEmail = process.env.LINKEDIN_EMAIL;
        this.linkedinPassword = process.env.LINKEDIN_PASSWORD;
        this.geminiApiKey = process.env.GEMINI_API_KEY;

        // Validate environment variables
        this.validateEnvironmentVariables();
        this.ensureDirectories();
    }

    validateEnvironmentVariables() {
        const required = ['LINKEDIN_EMAIL', 'LINKEDIN_PASSWORD', 'GEMINI_API_KEY'];
        const missing = required.filter(key => !process.env[key]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
    }

    async ensureDirectories() {
        try {
            await fs.mkdir(this.screenshotDir, { recursive: true });
            await fs.mkdir(this.analysisDir, { recursive: true });
            await fs.mkdir('./scripts', { recursive: true });
        } catch (error) {
            console.error('Error creating directories:', error);
        }
    }

    // Helper function to replace waitForTimeout
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Updated method - only takes profileUrl as parameter
    async takeLinkedInScreenshot(profileUrl) {
        console.log('🔍 Starting LinkedIn screenshot process...');

        const browser = await puppeteer.launch({
            headless: new, // Keep this for debugging
            defaultViewport: null,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--disable-dev-shm-usage',
                '--no-first-run',
                '--disable-gpu'
            ],
            userDataDir: './linkedin_session',
            timeout: 60000 // Increase timeout
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        try {
            await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' });
            await this.delay(2000);

            try {
                await page.waitForSelector('.global-nav__primary-link', { timeout: 3000 });
                console.log('✅ Already logged in!');
            } catch {
                console.log('🔐 Logging in...');
                // Use environment variables for credentials
                await page.type('#username', this.linkedinEmail, { delay: 100 });
                await page.type('#password', this.linkedinPassword, { delay: 100 });

                await page.click('button[type="submit"]');

                try {
                    await Promise.race([
                        page.waitForSelector('.global-nav__primary-link', { timeout: 15000 }),
                        page.waitForSelector('.challenge', { timeout: 15000 })
                    ]);

                    if (page.url().includes('challenge')) {
                        console.log('⚠️ Verification required. Please complete manually...');
                        await page.waitForSelector('.global-nav__primary-link', { timeout: 120000 });
                    }

                    console.log('✅ Login successful!');
                } catch {
                    throw new Error('Login failed. Please check credentials in environment variables.');
                }
            }

            console.log(`📄 Navigating to profile: ${profileUrl}`);
            await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await this.delay(3000);

            // Close any modals that might appear
            const modalSelectors = ['.artdeco-modal__dismiss', '[data-test-modal-close-btn]'];
            for (const selector of modalSelectors) {
                const element = await page.$(selector);
                if (element) {
                    await element.click();
                    await this.delay(1000);
                    break;
                }
            }

            console.log('📜 Scrolling to load all content...');
            for (let i = 0; i < 10; i++) {
                const previousHeight = await page.evaluate(() => document.body.scrollHeight);
                await page.evaluate(() => window.scrollBy(0, window.innerHeight));
                await this.delay(2000);
                const newHeight = await page.evaluate(() => document.body.scrollHeight);
                if (newHeight === previousHeight) break;
            }

            // Scroll back to top
            await page.evaluate(() => window.scrollTo(0, 0));
            await this.delay(2000);

            // Click "Show more" buttons to expand content
            const showMoreButtons = await page.$$('button[aria-expanded="false"]');
            for (let i = 0; i < Math.min(showMoreButtons.length, 5); i++) {
                try {
                    await showMoreButtons[i].click();
                    await this.delay(1500);
                } catch {
                    continue;
                }
            }

            // Take screenshot
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
            const screenshotPath = path.join(this.screenshotDir, `linkedin.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true });

            console.log(`📸 Screenshot saved: ${screenshotPath}`);
            return screenshotPath;
        } finally {
            await browser.close();
        }
    }

    // Updated method - uses environment variable for API key
    async analyzeLinkedInProfile(screenshotPath) {
        console.log('🤖 Starting LinkedIn profile analysis...');
        return new Promise((resolve, reject) => {
            this.createPythonAnalysisScript();

            const pythonProcess = spawn('python3', [
                this.pythonScript,
                screenshotPath,
                this.geminiApiKey, // Use environment variable
                this.analysisDir
            ]);

            let outputData = '';
            let errorData = '';

            pythonProcess.stdout.on('data', (data) => {
                outputData += data.toString();
                console.log(data.toString());
            });

            pythonProcess.stderr.on('data', (data) => {
                errorData += data.toString();
                console.error(data.toString());
            });

            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    const analysisResult = this.parseAnalysisOutput(outputData);
                    resolve(analysisResult);
                } else {
                    reject(new Error(`Analysis failed with code ${code}: ${errorData}`));
                }
            });
        });
    }

    parseAnalysisOutput(output) {
        const htmlMatch = output.match(/Interactive Report: (.+\.html)/);
        const jsonMatch = output.match(/Raw Analysis: (.+\.json)/);

        return {
            htmlReportPath: htmlMatch ? htmlMatch[1].trim() : null,
            analysisJsonPath: jsonMatch ? jsonMatch[1].trim() : null,
            output
        };
    }

    async getAnalysisData(analysisJsonPath) {
        try {
            const data = await fs.readFile(analysisJsonPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading analysis data:', error);
            return null;
        }
    }

    async createPythonAnalysisScript() {
        const pythonScriptContent = await fs.readFile('./scripts/analysis.py', 'utf8');
        try {
            await fs.writeFile(this.pythonScript, pythonScriptContent);
        } catch (error) {
            console.error('Error creating Python script:', error);
        }
    }

    // Updated method - only takes profileUrl as parameter
    async runCompleteAnalysis(profileUrl) {
        try {
            console.log('🚀 Starting complete LinkedIn analysis...');
            const screenshotPath = await this.takeLinkedInScreenshot(profileUrl);
            const analysisResult = await this.analyzeLinkedInProfile(screenshotPath);
            const analysisData = await this.getAnalysisData(analysisResult.analysisJsonPath);

            console.log('✅ LinkedIn analysis completed successfully!');
            return {
                screenshotPath,
                htmlReportPath: analysisResult.htmlReportPath,
                analysisJsonPath: analysisResult.analysisJsonPath,
                analysisData,
                success: true
            };
        } catch (error) {
            console.error('❌ LinkedIn analysis failed:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = LinkedInIntegrationService;


