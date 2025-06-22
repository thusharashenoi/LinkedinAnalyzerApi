// LinkedIn API Routes - Fixed version with better error handling
const express = require('express');
const router = express.Router();
const LinkedInIntegrationService = require('../services/LinkedinIntegratedServices');
const path = require('path');

// Initialize LinkedIn services
let linkedInService = null;
let serviceInitError = null;

// Try to initialize service
try {
    linkedInService = new LinkedInIntegrationService();
} catch (error) {
    serviceInitError = error.message;
    console.error('❌ Failed to initialize LinkedIn service:', error.message);
}

// POST /api/linkedin/analyze - Start LinkedIn analysis (only requires profileUrl)
router.post('/analyze', async (req, res) => {
    try {
        // Check if service is initialized
        if (!linkedInService) {
            return res.status(500).json({
                success: false,
                error: `Service initialization failed: ${serviceInitError}`
            });
        }

        const { profileUrl } = req.body;
        
        // Validate required field
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
        
        // Run complete analysis
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
            
            // Only add URLs if files exist
            if (result.htmlReportPath) {
                responseData.reportUrl = `/api/linkedin/report/${path.basename(result.htmlReportPath)}`;
            }
            
            if (result.screenshotPath) {
                responseData.screenshotUrl = `/api/linkedin/screenshot/${path.basename(result.screenshotPath)}`;
            }
            
            // Add warnings for missing features
            const warnings = [];
            if (!result.analysisData && !process.env.GEMINI_API_KEY) {
                warnings.push('AI analysis skipped - GEMINI_API_KEY not configured');
            }
            
            res.json({
                success: true,
                message: 'LinkedIn analysis completed successfully',
                data: responseData,
                warnings: warnings.length > 0 ? warnings : undefined
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error || 'LinkedIn analysis failed'
            });
        }
        
    } catch (error) {
        console.error('❌ LinkedIn analysis error:', error);
        
        // Provide specific error messages
        if (error.message.includes('Missing required environment variables')) {
            res.status(500).json({
                success: false,
                error: 'Server configuration error: Missing required environment variables. Please check LINKEDIN_EMAIL and LINKEDIN_PASSWORD.'
            });
        } else if (error.message.includes('GEMINI_API_KEY')) {
            res.status(500).json({
                success: false,
                error: 'AI analysis unavailable: GEMINI_API_KEY not configured. Screenshot capture is still available.'
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
        
        // Security check
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
        if (!linkedInService) {
            return res.status(500).json({
                success: false,
                error: `Service not available: ${serviceInitError}`
            });
        }

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

// POST /api/linkedin/quick-screenshot - Take screenshot only
router.post('/quick-screenshot', async (req, res) => {
    try {
        if (!linkedInService) {
            return res.status(500).json({
                success: false,
                error: `Service not available: ${serviceInitError}`
            });
        }

        const { profileUrl } = req.body;
        
        if (!profileUrl) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: profileUrl'
            });
        }

        if (!profileUrl.includes('linkedin.com')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid LinkedIn profile URL'
            });
        }
        
        console.log('📸 Taking LinkedIn screenshot for:', profileUrl);
        
        const screenshotPath = await linkedInService.takeLinkedInScreenshot(profileUrl);
        
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
        
        if (error.message.includes('Missing required environment variables')) {
            res.status(500).json({
                success: false,
                error: 'Server configuration error: Missing LINKEDIN_EMAIL and LINKEDIN_PASSWORD environment variables.'
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

// GET /api/linkedin/debug - Debug endpoint
router.get('/debug', async (req, res) => {
    try {
        const envCheck = {
            linkedinEmail: !!process.env.LINKEDIN_EMAIL,
            linkedinPassword: !!process.env.LINKEDIN_PASSWORD,
            geminiApiKey: !!process.env.GEMINI_API_KEY
        };

        let debugInfo = null;
        let serviceError = serviceInitError;
        
        if (linkedInService) {
            try {
                debugInfo = await linkedInService.getDebugInfo();
            } catch (error) {
                serviceError = error.message;
            }
        }

        res.json({
            success: !!linkedInService,
            timestamp: new Date().toISOString(),
            environment: {
                nodeEnv: process.env.NODE_ENV,
                platform: process.platform,
                cwd: process.cwd()
            },
            environmentVariables: envCheck,
            serviceDebugInfo: debugInfo,
            serviceError,
            serviceInitialization: {
                initialized: !!linkedInService,
                error: serviceInitError
            },
            recommendations: {
                missingEnvVars: Object.entries(envCheck)
                    .filter(([, exists]) => !exists)
                    .map(([key]) => key),
                nextSteps: [
                    envCheck.linkedinEmail ? null : 'Set LINKEDIN_EMAIL environment variable',
                    envCheck.linkedinPassword ? null : 'Set LINKEDIN_PASSWORD environment variable',
                    envCheck.geminiApiKey ? null : 'Set GEMINI_API_KEY environment variable (optional for screenshot-only mode)'
                ].filter(Boolean)
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// GET /api/linkedin/status - Check service status
router.get('/status', (req, res) => {
    try {
        const envVars = {
            linkedinEmail: !!process.env.LINKEDIN_EMAIL,
            linkedinPassword: !!process.env.LINKEDIN_PASSWORD,
            geminiApiKey: !!process.env.GEMINI_API_KEY
        };

        const required = ['LINKEDIN_EMAIL', 'LINKEDIN_PASSWORD'];
        const missing = required.filter(key => !process.env[key]);

        res.json({
            success: missing.length === 0 && !!linkedInService,
            message: !linkedInService 
                ? `Service initialization failed: ${serviceInitError}`
                : missing.length === 0 
                    ? 'LinkedIn integration service is ready' 
                    : 'LinkedIn integration service has configuration issues',
            timestamp: new Date().toISOString(),
            serviceInitialization: {
                initialized: !!linkedInService,
                error: serviceInitError
            },
            directories: {
                screenshots: './screenshots',
                analysis: './linkedin_analysis'
            },
            environmentVariables: envVars,
            missingVariables: missing,
            capabilities: {
                screenshotCapture: missing.length === 0 && !!linkedInService,
                aiAnalysis: envVars.geminiApiKey && !!linkedInService,
                fullAnalysis: missing.length === 0 && envVars.geminiApiKey && !!linkedInService
            },
            nodeEnv: process.env.NODE_ENV,
            platform: process.platform
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'LinkedIn integration service configuration error',
            error: error.message,
            timestamp: new Date().toISOString(),
            environmentVariables: {
                linkedinEmail: !!process.env.LINKEDIN_EMAIL,
                linkedinPassword: !!process.env.LINKEDIN_PASSWORD,
                geminiApiKey: !!process.env.GEMINI_API_KEY
            }
        });
    }
});

module.exports = router;
