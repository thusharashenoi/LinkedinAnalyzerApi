// LinkedIn API Routes - Updated to use environment variables
const express = require('express');
const router = express.Router();
const LinkedInIntegrationService = require('../services/LinkedinIntegratedServices');
const path = require('path');

// Initialize LinkedIn services
const linkedInService = new LinkedInIntegrationService();

// POST /api/linkedin/analyze - Start LinkedIn analysis (only requires profileUrl)
router.post('/analyze', async (req, res) => {
    try {
        const { profileUrl } = req.body;
        
        // Validate required field - only profileUrl is needed now
        if (!profileUrl) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: profileUrl'
            });
        }

        // Validate URL format
        if (!profileUrl.includes('linkedin.com')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid LinkedIn profile URL'
            });
        }
        
        console.log('📊 Starting LinkedIn analysis for:', profileUrl);
        
        // Run complete analysis - credentials are read from environment variables
        const result = await linkedInService.runCompleteAnalysis(profileUrl);
        
        console.log('🔍 Analysis result structure:', {
            success: result?.success,
            hasScreenshotPath: !!result?.screenshotPath,
            hasHtmlReportPath: !!result?.htmlReportPath,
            hasAnalysisJsonPath: !!result?.analysisJsonPath,
            hasAnalysisData: !!result?.analysisData
        });
        
        if (result.success) {
            // Build response data with null checks
            const responseData = {
                screenshotPath: result.screenshotPath || null,
                htmlReportPath: result.htmlReportPath || null,
                analysisJsonPath: result.analysisJsonPath || null,
                analysisData: result.analysisData || null
            };
            
            // Only add reportUrl if htmlReportPath exists
            if (result.htmlReportPath) {
                responseData.reportUrl = `/api/linkedin/report/${path.basename(result.htmlReportPath)}`;
            }
            
            res.json({
                success: true,
                message: 'LinkedIn analysis completed successfully',
                data: responseData
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error || 'LinkedIn analysis failed'
            });
        }
        
    } catch (error) {
        console.error('❌ LinkedIn analysis error:', error);
        
        // Check if error is due to missing environment variables
        if (error.message.includes('Missing required environment variables')) {
            res.status(500).json({
                success: false,
                error: 'Server configuration error: Missing required environment variables'
            });
        } else {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
});

// GET /api/linkedin/report/:filename - Serve HTML reports
router.get('/report/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const reportPath = path.join(__dirname, '../linkedin_analysis', filename);
        
        // Security check - ensure file is HTML and exists
        if (!filename.endsWith('.html')) {
            return res.status(400).json({ error: 'Invalid file type' });
        }
        
        res.sendFile(path.resolve(reportPath), (err) => {
            if (err) {
                console.error('Error serving report:', err);
                res.status(404).json({ error: 'Report not found' });
            }
        });
        
    } catch (error) {
        console.error('Error serving LinkedIn report:', error);
        res.status(500).json({ error: 'Failed to serve report' });
    }
});

// GET /api/linkedin/analysis/:filename - Get analysis JSON data
router.get('/analysis/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const analysisPath = path.join(__dirname, '../linkedin_analysis', filename);
        
        // Security check
        if (!filename.endsWith('.json')) {
            return res.status(400).json({ error: 'Invalid file type' });
        }
        
        const analysisData = await linkedInService.getAnalysisData(analysisPath);
        
        if (analysisData) {
            res.json({
                success: true,
                data: analysisData
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Analysis data not found'
            });
        }
        
    } catch (error) {
        console.error('Error getting analysis data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get analysis data'
        });
    }
});

// POST /api/linkedin/quick-screenshot - Take screenshot only (only requires profileUrl)
router.post('/quick-screenshot', async (req, res) => {
    try {
        const { profileUrl } = req.body;
        
        if (!profileUrl) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: profileUrl'
            });
        }

        // Validate URL format
        if (!profileUrl.includes('linkedin.com')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid LinkedIn profile URL'
            });
        }
        
        console.log('📸 Taking LinkedIn screenshot for:', profileUrl);
        
        // Credentials are read from environment variables
        const screenshotPath = await linkedInService.takeLinkedInScreenshot(profileUrl);
        
        // Add null check for screenshotPath
        if (!screenshotPath) {
            throw new Error('Screenshot failed - no path returned');
        }
        
        res.json({
            success: true,
            message: 'Screenshot taken successfully',
            data: {
                screenshotPath,
                screenshotUrl: `/api/linkedin/screenshot/${path.basename(screenshotPath)}`
            }
        });
        
    } catch (error) {
        console.error('❌ Screenshot error:', error);
        
        // Check if error is due to missing environment variables
        if (error.message.includes('Missing required environment variables')) {
            res.status(500).json({
                success: false,
                error: 'Server configuration error: Missing required environment variables'
            });
        } else {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
});

// GET /api/linkedin/screenshot/:filename - Serve screenshots
router.get('/screenshot/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const screenshotPath = path.join(__dirname, '../screenshots', filename);
        
        // Security check
        if (!filename.endsWith('.png')) {
            return res.status(400).json({ error: 'Invalid file type' });
        }
        
        res.sendFile(path.resolve(screenshotPath), (err) => {
            if (err) {
                console.error('Error serving screenshot:', err);
                res.status(404).json({ error: 'Screenshot not found' });
            }
        });
        
    } catch (error) {
        console.error('Error serving screenshot:', error);
        res.status(500).json({ error: 'Failed to serve screenshot' });
    }
});

// GET /api/linkedin/status - Check service status
router.get('/status', (req, res) => {
    try {
        // Create a temporary service instance to check environment variables
        const testService = new LinkedInIntegrationService();
        
        res.json({
            success: true,
            message: 'LinkedIn integration service is running',
            timestamp: new Date().toISOString(),
            directories: {
                screenshots: './screenshots',
                analysis: './linkedin_analysis'
            },
            environmentVariables: {
                linkedinEmail: !!process.env.LINKEDIN_EMAIL,
                linkedinPassword: !!process.env.LINKEDIN_PASSWORD,
                geminiApiKey: !!process.env.GEMINI_API_KEY
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'LinkedIn integration service configuration error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
    // Add this debug endpoint to your routes file
router.get('/debug-env', (req, res) => {
    res.json({
        success: true,
        message: 'Environment variable debug info',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        environmentVariables: {
            // Check if variables exist and show first 3 characters for security
            linkedinEmail: {
                exists: !!process.env.LINKEDIN_EMAIL,
                value: process.env.LINKEDIN_EMAIL ? process.env.LINKEDIN_EMAIL.substring(0, 3) + '...' : null
            },
            linkedinPassword: {
                exists: !!process.env.LINKEDIN_PASSWORD,
                value: process.env.LINKEDIN_PASSWORD ? '***' : null
            },
            geminiApiKey: {
                exists: !!process.env.GEMINI_API_KEY,
                value: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 3) + '...' : null
            }
        },
        allEnvKeys: Object.keys(process.env).filter(key => 
            key.includes('LINKEDIN') || key.includes('GEMINI')
        )
    });
});

});

module.exports = router;


// GET /api/linkedin/status - Check service status (Fixed version)
router.get('/status', (req, res) => {
    try {
        // Check environment variables directly without creating service instance
        const envVars = {
            linkedinEmail: !!process.env.LINKEDIN_EMAIL,
            linkedinPassword: !!process.env.LINKEDIN_PASSWORD,
            geminiApiKey: !!process.env.GEMINI_API_KEY
        };

        // Check for missing variables
        const required = ['LINKEDIN_EMAIL', 'LINKEDIN_PASSWORD', 'GEMINI_API_KEY'];
        const missing = required.filter(key => !process.env[key]);

        // Try to create service instance to test full initialization
        let serviceStatus = 'OK';
        let serviceError = null;
        
        try {
            const testService = new LinkedInIntegrationService();
            serviceStatus = 'Initialized successfully';
        } catch (error) {
            serviceStatus = 'Failed to initialize';
            serviceError = error.message;
        }

        res.json({
            success: missing.length === 0,
            message: missing.length === 0 
                ? 'LinkedIn integration service is running' 
                : 'LinkedIn integration service has configuration issues',
            timestamp: new Date().toISOString(),
            directories: {
                screenshots: './screenshots',
                analysis: './linkedin_analysis'
            },
            environmentVariables: envVars,
            missingVariables: missing,
            serviceStatus,
            serviceError,
            // Debug info
            nodeEnv: process.env.NODE_ENV,
            platform: process.platform,
            // Show all environment variable keys (for debugging)
            allEnvKeys: Object.keys(process.env).filter(key => 
                key.includes('LINKEDIN') || key.includes('GEMINI') || key.includes('VERCEL')
            )
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'LinkedIn integration service configuration error',
            error: error.message,
            timestamp: new Date().toISOString(),
            // Show environment variable status even when there's an error
            environmentVariables: {
                linkedinEmail: !!process.env.LINKEDIN_EMAIL,
                linkedinPassword: !!process.env.LINKEDIN_PASSWORD,
                geminiApiKey: !!process.env.GEMINI_API_KEY
            }
        });
    }
});