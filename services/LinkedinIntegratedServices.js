// LinkedInIntegrationService.js - Fixed version with proper error handling
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

        // Only validate LinkedIn credentials as required
        // Gemini API key is optional for screenshot-only functionality
        this.validateEnvironmentVariables();
        this.ensureDirectories();
    }

    validateEnvironmentVariables() {
        // Only LinkedIn credentials are required
        const required = ['LINKEDIN_EMAIL', 'LINKEDIN_PASSWORD'];
        const missing = required.filter(key => !process.env[key]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }

        // Warn if Gemini API key is missing (needed for AI analysis)
        if (!this.geminiApiKey) {
            console.log('⚠️  GEMINI_API_KEY not found - AI analysis will be disabled');
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
            headless: true,
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
            timeout: 60000
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

    // Updated method with proper error handling
    async analyzeLinkedInProfile(screenshotPath) {
        console.log('🤖 Starting LinkedIn profile analysis...');
        
        // Check if Gemini API key is available
        if (!this.geminiApiKey) {
            throw new Error('GEMINI_API_KEY not found in environment variables');
        }

        // Check if Python script exists
        try {
            await fs.access(this.pythonScript);
        } catch (error) {
            console.log('⚠️  Python analysis script not found.');
        }

        return new Promise((resolve, reject) => {
            const pythonProcess = spawn('python3', [
                this.pythonScript,
                screenshotPath,
                this.geminiApiKey,
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
                    console.error(`❌ Python analysis failed with code ${code}`);
                    console.error(`Error output: ${errorData}`);
                    reject(new Error(`Analysis failed with code ${code}: ${errorData}`));
                }
            });

            pythonProcess.on('error', (error) => {
                console.error('❌ Failed to start Python process:', error);
                reject(new Error(`Failed to start Python analysis: ${error.message}`));
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
            // Add null check
            if (!analysisJsonPath) {
                console.log('⚠️  Analysis JSON path is null or undefined');
                return null;
            }

            // Check if file exists
            try {
                await fs.access(analysisJsonPath);
            } catch (error) {
                console.log(`⚠️  Analysis file does not exist: ${analysisJsonPath}`);
                return null;
            }

            const data = await fs.readFile(analysisJsonPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading analysis data:', error);
            return null;
        }
    }


    // Updated method with better error handling
    async runCompleteAnalysis(profileUrl) {
        try {
            console.log('🚀 Starting complete LinkedIn analysis...');
            
            // Step 1: Take screenshot (always works)
            const screenshotPath = await this.takeLinkedInScreenshot(profileUrl);
            console.log('📸 Screenshot completed successfully');
            
            let analysisResult = null;
            let analysisData = null;
            
            // Step 2: Try AI analysis (only if API key is available)
            if (this.geminiApiKey) {
                try {
                    console.log('🤖 Step 2: Analyzing LinkedIn profile...');
                    analysisResult = await this.analyzeLinkedInProfile(screenshotPath);
                    console.log('✅ Profile analysis completed');
                    
                    // Step 3: Load analysis data
                    if (analysisResult && analysisResult.analysisJsonPath) {
                        analysisData = await this.getAnalysisData(analysisResult.analysisJsonPath);
                        console.log('📊 Analysis data loaded successfully');
                    }
                } catch (error) {
                    console.error('❌ Profile analysis failed:', error.message);
                    // Continue with screenshot-only result
                }
            } else {
                console.log('⚠️  Skipping AI analysis - GEMINI_API_KEY not found');
            }

            console.log('✅ LinkedIn analysis completed successfully!');
            return {
                success: true,
                screenshotPath,
                htmlReportPath: analysisResult?.htmlReportPath || null,
                analysisJsonPath: analysisResult?.analysisJsonPath || null,
                analysisData: analysisData || null
            };
        } catch (error) {
            console.error('❌ LinkedIn analysis failed:', error);
            return { 
                success: false, 
                error: error.message,
                screenshotPath: null,
                htmlReportPath: null,
                analysisJsonPath: null,
                analysisData: null
            };
        }
    }

    // Add debug method
    async getDebugInfo() {
        return {
            directories: {
                screenshots: this.screenshotDir,
                analysis: this.analysisDir,
                pythonScript: this.pythonScript
            },
            credentials: {
                linkedinEmail: !!this.linkedinEmail,
                linkedinPassword: !!this.linkedinPassword,
                geminiApiKey: !!this.geminiApiKey
            },
            capabilities: {
                screenshotCapture: !!(this.linkedinEmail && this.linkedinPassword),
                aiAnalysis: !!this.geminiApiKey
            }
        };
    }
}

module.exports = LinkedInIntegrationService;