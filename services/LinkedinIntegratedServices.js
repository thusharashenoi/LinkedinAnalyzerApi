const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');

class LinkedInIntegrationService {
    constructor() {
        this.validateEnvironment();
        this.screenshotsDir = path.join(__dirname, '..', 'screenshots');
        this.analysisDir = path.join(__dirname, '..', 'linkedin_analysis');
        this.outputDir = path.join(__dirname, '..', 'linkedin_analysis_output');
        this.sessionDir = path.join(__dirname, '..', 'linkedin_session');
        
        // Initialize directories
        this.initializeDirectories();
        
        console.log('✅ LinkedInIntegrationService initialized for Render deployment');
    }

    validateEnvironment() {
        const requiredEnvVars = ['LINKEDIN_EMAIL', 'LINKEDIN_PASSWORD'];
        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }
        
        console.log('✅ Environment variables validated');
    }

    async initializeDirectories() {
        const dirs = [this.screenshotsDir, this.analysisDir, this.outputDir, this.sessionDir];
        
        for (const dir of dirs) {
            try {
                await fs.mkdir(dir, { recursive: true });
                console.log(`📁 Directory ensured: ${dir}`);
            } catch (error) {
                console.error(`❌ Failed to create directory ${dir}:`, error.message);
            }
        }
    }

    getPuppeteerConfig() {
        const isRender = process.env.RENDER === 'true' || process.env.RENDER_SERVICE_NAME;
        
        if (isRender) {
            // Render-specific configuration
            return {
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-extensions',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--disable-features=TranslateUI',
                    '--disable-ipc-flooding-protection',
                    '--memory-pressure-off',
                    '--max_old_space_size=512',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor'
                ],
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
                timeout: 30000
            };
        } else {
            // Local development configuration
            return {
                headless: false,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                timeout: 30000
            };
        }
    }

    async launchBrowser() {
        try {
            const config = this.getPuppeteerConfig();
            console.log('🚀 Launching Puppeteer browser...');
            
            const browser = await puppeteer.launch(config);
            console.log('✅ Browser launched successfully');
            return browser;
        } catch (error) {
            console.error('❌ Failed to launch browser:', error);
            throw new Error(`Browser launch failed: ${error.message}`);
        }
    }

    async takeLinkedInScreenshot(profileUrl) {
        let browser = null;
        let page = null;
        
        try {
            console.log('📸 Starting LinkedIn screenshot process...');
            console.log('🔗 Profile URL:', profileUrl);
            
            browser = await this.launchBrowser();
            page = await browser.newPage();
            
            // Set viewport for consistent screenshots
            await page.setViewport({ width: 1366, height: 768 });
            
            // Set user agent to avoid detection
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            
            console.log('🔐 Navigating to LinkedIn login...');
            
            // Navigate to LinkedIn login
            await page.goto('https://www.linkedin.com/login', { 
                waitUntil: 'networkidle2', 
                timeout: 30000 
            });
            
            // Wait for login form
            await page.waitForSelector('#username', { timeout: 10000 });
            
            console.log('📝 Filling login credentials...');
            
            // Fill login credentials
            await page.type('#username', process.env.LINKEDIN_EMAIL, { delay: 100 });
            await page.type('#password', process.env.LINKEDIN_PASSWORD, { delay: 100 });
            
            // Click login button
            await page.click('button[type="submit"]');
            
            console.log('⏳ Waiting for login to complete...');
            
            // Wait for navigation after login
            await page.waitForNavigation({ 
                waitUntil: 'networkidle2', 
                timeout: 30000 
            });
            
            // Check if we're redirected to feed (successful login)
            const currentUrl = page.url();
            if (currentUrl.includes('/challenge/') || currentUrl.includes('/checkpoint/')) {
                throw new Error('LinkedIn login challenged - manual verification required');
            }
            
            console.log('✅ Login successful, navigating to profile...');
            
            // Navigate to the target profile
            await page.goto(profileUrl, { 
                waitUntil: 'networkidle2', 
                timeout: 30000 
            });
            
            // Wait for profile content to load
            await page.waitForSelector('.pv-text-details__left-panel', { timeout: 15000 });
            
            console.log('📄 Profile loaded, taking screenshot...');
            
            // Scroll to load more content
            await page.evaluate(() => {
                return new Promise((resolve) => {
                    let totalHeight = 0;
                    const distance = 100;
                    const timer = setInterval(() => {
                        const scrollHeight = document.body.scrollHeight;
                        window.scrollBy(0, distance);
                        totalHeight += distance;
                        
                        if (totalHeight >= scrollHeight || totalHeight >= 3000) {
                            clearInterval(timer);
                            resolve();
                        }
                    }, 100);
                });
            });
            
            // Scroll back to top
            await page.evaluate(() => window.scrollTo(0, 0));
            await page.waitForTimeout(2000);
            
            // Generate screenshot filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `linkedin_${timestamp}.png`;
            const screenshotPath = path.join(this.screenshotsDir, filename);
            
            // Take screenshot
            await page.screenshot({
                path: screenshotPath,
                fullPage: true,
                type: 'png'
            });
            
            console.log('✅ Screenshot saved:', screenshotPath);
            return screenshotPath;
            
        } catch (error) {
            console.error('❌ Screenshot failed:', error);
            throw new Error(`LinkedIn screenshot failed: ${error.message}`);
        } finally {
            if (page) {
                try {
                    await page.close();
                } catch (err) {
                    console.error('Error closing page:', err);
                }
            }
            if (browser) {
                try {
                    await browser.close();
                } catch (err) {
                    console.error('Error closing browser:', err);
                }
            }
        }
    }

    async runPythonAnalysis(screenshotPath) {
        return new Promise((resolve, reject) => {
            if (!process.env.GEMINI_API_KEY) {
                console.log('⚠️  GEMINI_API_KEY not found, skipping AI analysis');
                resolve(null);
                return;
            }

            console.log('🤖 Starting Python AI analysis...');
            
            const pythonScript = path.join(__dirname, '..', 'scripts', 'linkedin_analysis.py');
            const pythonProcess = spawn('python3', [
                pythonScript,
                '--image-path', screenshotPath,
                '--output-dir', this.outputDir,
                '--api-key', process.env.GEMINI_API_KEY
            ], {
                timeout: 60000 // 60 seconds timeout
            });

            let stdout = '';
            let stderr = '';

            pythonProcess.stdout.on('data', (data) => {
                stdout += data.toString();
                console.log('Python stdout:', data.toString().trim());
            });

            pythonProcess.stderr.on('data', (data) => {
                stderr += data.toString();
                console.error('Python stderr:', data.toString().trim());
            });

            pythonProcess.on('close', async (code) => {
                if (code === 0) {
                    console.log('✅ Python analysis completed successfully');
                    
                    try {
                        // Look for analysis results
                        const analysisFile = path.join(this.outputDir, 'analysis_results.json');
                        const htmlFile = path.join(this.outputDir, 'linkedin_analysis.html');
                        
                        let analysisData = null;
                        let htmlReportPath = null;
                        
                        // Check if analysis file exists
                        try {
                            await fs.access(analysisFile);
                            const analysisContent = await fs.readFile(analysisFile, 'utf8');
                            analysisData = JSON.parse(analysisContent);
                            console.log('📊 Analysis data loaded successfully');
                        } catch (err) {
                            console.log('⚠️  No analysis data file found');
                        }
                        
                        // Check if HTML report exists
                        try {
                            await fs.access(htmlFile);
                            htmlReportPath = htmlFile;
                            console.log('📄 HTML report generated successfully');
                        } catch (err) {
                            console.log('⚠️  No HTML report found');
                        }
                        
                        resolve({
                            analysisData,
                            htmlReportPath,
                            analysisJsonPath: analysisFile
                        });
                        
                    } catch (error) {
                        console.error('❌ Error processing analysis results:', error);
                        resolve(null);
                    }
                } else {
                    console.error('❌ Python analysis failed with code:', code);
                    console.error('Stderr:', stderr);
                    resolve(null);
                }
            });

            pythonProcess.on('error', (error) => {
                console.error('❌ Failed to start Python analysis:', error);
                resolve(null);
            });
        });
    }

    async runCompleteAnalysis(profileUrl) {
        try {
            console.log('🚀 Starting complete LinkedIn analysis...');
            console.log('🔗 Profile URL:', profileUrl);
            
            // Step 1: Take screenshot
            const screenshotPath = await this.takeLinkedInScreenshot(profileUrl);
            
            if (!screenshotPath) {
                return {
                    success: false,
                    error: 'Failed to capture LinkedIn screenshot'
                };
            }
            
            // Step 2: Run AI analysis if API key is available
            const analysisResults = await this.runPythonAnalysis(screenshotPath);
            
            // Step 3: Compile results
            const result = {
                success: true,
                screenshotPath,
                analysisData: analysisResults?.analysisData || null,
                htmlReportPath: analysisResults?.htmlReportPath || null,
                analysisJsonPath: analysisResults?.analysisJsonPath || null,
                timestamp: new Date().toISOString()
            };
            
            console.log('🎉 Complete analysis finished successfully');
            return result;
            
        } catch (error) {
            console.error('❌ Complete analysis failed:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async getAnalysisData(analysisPath) {
        try {
            await fs.access(analysisPath);
            const content = await fs.readFile(analysisPath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            console.error('❌ Failed to read analysis data:', error);
            return null;
        }
    }

    async getDebugInfo() {
        try {
            const browserConfig = this.getPuppeteerConfig();
            const isRender = process.env.RENDER === 'true' || process.env.RENDER_SERVICE_NAME;
            
            return {
                platform: isRender ? 'render' : 'local',
                browserConfig: {
                    headless: browserConfig.headless,
                    executablePath: browserConfig.executablePath || 'default',
                    argsCount: browserConfig.args.length
                },
                directories: {
                    screenshots: this.screenshotsDir,
                    analysis: this.analysisDir,
                    output: this.outputDir,
                    session: this.sessionDir
                },
                environment: {
                    nodeVersion: process.version,
                    platform: process.platform,
                    memory: {
                        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
                        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
                    }
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Failed to get debug info:', error);
            return {
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = LinkedInIntegrationService;