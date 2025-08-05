// LinkedIn API Routes - Modularized version with better organization
const express = require('express');
const router = express.Router();
const LinkedInIntegrationService = require('../services/LinkedinIntegratedServices');
const path = require('path');

// ========================================
// SERVICE INITIALIZATION
// ========================================

let linkedInService = null;
let serviceInitError = null;

const initializeService = () => {
    try {
        linkedInService = new LinkedInIntegrationService();
        console.log('✅ LinkedIn service initialized successfully');
    } catch (error) {
        serviceInitError = error.message;
        console.error('❌ Failed to initialize LinkedIn service:', error.message);
    }
};

// Initialize service on startup
initializeService();

// ========================================
// VALIDATION UTILITIES
// ========================================

const validateService = () => {
    if (!linkedInService) {
        throw new Error(`Service initialization failed: ${serviceInitError}`);
    }
};

const validateProfileUrl = (profileUrl) => {
    if (!profileUrl) {
        throw new Error('Missing required field: profileUrl');
    }
    
    if (!profileUrl.includes('linkedin.com')) {
        throw new Error('Invalid LinkedIn profile URL');
    }
};

const validateFileType = (filename, allowedExtensions) => {
    const hasValidExtension = allowedExtensions.some(ext => filename.endsWith(ext));
    if (!hasValidExtension) {
        throw new Error(`Invalid file type. Allowed extensions: ${allowedExtensions.join(', ')}`);
    }
};

// ========================================
// ERROR HANDLING UTILITIES
// ========================================

const createErrorResponse = (error, res) => {
    console.error('❌ Error:', error);
    
    const errorMappings = {
        'Missing required environment variables': {
            status: 500,
            message: 'Server configuration error: Missing required environment variables. Please check LINKEDIN_EMAIL and LINKEDIN_PASSWORD.'
        },
        'GEMINI_API_KEY': {
            status: 500,
            message: 'AI analysis unavailable: GEMINI_API_KEY not configured. Screenshot capture is still available.'
        }
    };
    
    // Check for specific error patterns
    for (const [pattern, config] of Object.entries(errorMappings)) {
        if (error.message.includes(pattern)) {
            return res.status(config.status).json({
                success: false,
                error: config.message
            });
        }
    }
    
    // Default error response
    return res.status(500).json({
        success: false,
        error: error.message
    });
};

const createValidationErrorResponse = (error, res) => {
    return res.status(400).json({
        success: false,
        error: error.message
    });
};

// ========================================
// RESPONSE BUILDERS
// ========================================

const buildAnalysisResponse = (result) => {
    const responseData = {
        screenshotPath: result.screenshotPath || null,
        htmlReportPath: result.htmlReportPath || null,
        analysisJsonPath: result.analysisJsonPath || null,
        analysisData: result.analysisData || null
    };
    
    // Add URLs if files exist
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
    
    return {
        success: true,
        message: 'LinkedIn analysis completed successfully',
        data: responseData,
        warnings: warnings.length > 0 ? warnings : undefined
    };
};

const buildScreenshotResponse = (screenshotPath) => {
    if (!screenshotPath) {
        throw new Error('Screenshot failed - no path returned');
    }
    
    return {
        success: true,
        message: 'Screenshot taken successfully',
        data: {
            screenshotPath,
            screenshotUrl: `/api/linkedin/screenshot/${path.basename(screenshotPath)}`
        }
    };
};

// ========================================
// ENVIRONMENT UTILITIES
// ========================================

const getEnvironmentCheck = () => {
    return {
        linkedinEmail: !!process.env.LINKEDIN_EMAIL,
        linkedinPassword: !!process.env.LINKEDIN_PASSWORD,
        geminiApiKey: !!process.env.GEMINI_API_KEY
    };
};

const getMissingEnvironmentVariables = () => {
    const required = ['LINKEDIN_EMAIL', 'LINKEDIN_PASSWORD'];
    return required.filter(key => !process.env[key]);
};

const getServiceCapabilities = () => {
    const envVars = getEnvironmentCheck();
    const missing = getMissingEnvironmentVariables();
    
    return {
        screenshotCapture: missing.length === 0 && !!linkedInService,
        aiAnalysis: envVars.geminiApiKey && !!linkedInService,
        fullAnalysis: missing.length === 0 && envVars.geminiApiKey && !!linkedInService
    };
};

// ========================================
// FILE SERVING UTILITIES
// ========================================

const serveFile = (filePath, res, errorMessage = 'File not found') => {
    res.sendFile(path.resolve(filePath), (err) => {
        if (err) {
            console.error(`Error serving file:`, err);
            res.status(404).json({ error: errorMessage });
        }
    });
};

const getFilePath = (directory, filename) => {
    return path.join(__dirname, directory, filename);
};

// ========================================
// ROUTE HANDLERS
// ========================================

// POST /api/linkedin/analyze - Start LinkedIn analysis
const handleAnalyze = async (req, res) => {
    try {
        validateService();
        
        const { profileUrl } = req.body;
        validateProfileUrl(profileUrl);
        
        console.log('📊 Starting LinkedIn analysis for:', profileUrl);
        
        const result = await linkedInService.runCompleteAnalysis(profileUrl);
        
        console.log('🔍 Analysis result structure:', {
            success: result?.success,
            hasScreenshotPath: !!result?.screenshotPath,
            hasHtmlReportPath: !!result?.htmlReportPath,
            hasAnalysisJsonPath: !!result?.analysisJsonPath,
            hasAnalysisData: !!result?.analysisData
        });
        
        if (result.success) {
            const response = buildAnalysisResponse(result);
            res.json(response);
        } else {
            res.status(500).json({
                success: false,
                error: result.error || 'LinkedIn analysis failed'
            });
        }
        
    } catch (error) {
        if (error.message.includes('Missing required field') || 
            error.message.includes('Invalid LinkedIn')) {
            createValidationErrorResponse(error, res);
        } else {
            createErrorResponse(error, res);
        }
    }
};

// POST /api/linkedin/quick-screenshot - Take screenshot only
const handleQuickScreenshot = async (req, res) => {
    try {
        validateService();
        
        const { profileUrl } = req.body;
        validateProfileUrl(profileUrl);
        
        console.log('📸 Taking LinkedIn screenshot for:', profileUrl);
        
        const screenshotPath = await linkedInService.takeLinkedInScreenshot(profileUrl);
        const response = buildScreenshotResponse(screenshotPath);
        
        res.json(response);
        
    } catch (error) {
        if (error.message.includes('Missing required field') || 
            error.message.includes('Invalid LinkedIn')) {
            createValidationErrorResponse(error, res);
        } else {
            createErrorResponse(error, res);
        }
    }
};

// GET /api/linkedin/report/:filename - Serve HTML reports
const handleServeReport = (req, res) => {
    try {
        const { filename } = req.params;
        validateFileType(filename, ['.html']);
        
        const reportPath = getFilePath('../linkedin_analysis', filename);
        serveFile(reportPath, res, 'Report not found');
        
    } catch (error) {
        console.error('Error serving LinkedIn report:', error);
        createValidationErrorResponse(error, res);
    }
};

// GET /api/linkedin/screenshot/:filename - Serve screenshots
const handleServeScreenshot = (req, res) => {
    try {
        const { filename } = req.params;
        validateFileType(filename, ['.png']);
        
        const screenshotPath = getFilePath('../screenshots', filename);
        serveFile(screenshotPath, res, 'Screenshot not found');
        
    } catch (error) {
        console.error('Error serving screenshot:', error);
        createValidationErrorResponse(error, res);
    }
};

// GET /api/linkedin/analysis/:filename - Get analysis JSON data
const handleGetAnalysis = async (req, res) => {
    try {
        validateService();
        
        const { filename } = req.params;
        validateFileType(filename, ['.json']);
        
        const analysisPath = getFilePath('../linkedin_analysis', filename);
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
        if (error.message.includes('Invalid file type')) {
            createValidationErrorResponse(error, res);
        } else {
            createErrorResponse(error, res);
        }
    }
};

// GET /api/linkedin/debug - Debug endpoint
const handleDebug = async (req, res) => {
    try {
        const envCheck = getEnvironmentCheck();
        let debugInfo = null;
        let serviceError = serviceInitError;
        
        if (linkedInService) {
            try {
                debugInfo = await linkedInService.getDebugInfo();
            } catch (error) {
                serviceError = error.message;
            }
        }

        const missingEnvVars = Object.entries(envCheck)
            .filter(([, exists]) => !exists)
            .map(([key]) => key);

        const nextSteps = [
            envCheck.linkedinEmail ? null : 'Set LINKEDIN_EMAIL environment variable',
            envCheck.linkedinPassword ? null : 'Set LINKEDIN_PASSWORD environment variable',
            envCheck.geminiApiKey ? null : 'Set GEMINI_API_KEY environment variable (optional for screenshot-only mode)'
        ].filter(Boolean);

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
                missingEnvVars,
                nextSteps
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

// GET /api/linkedin/status - Check service status
const handleStatus = (req, res) => {
    try {
        const envVars = getEnvironmentCheck();
        const missing = getMissingEnvironmentVariables();
        const capabilities = getServiceCapabilities();

        const getStatusMessage = () => {
            if (!linkedInService) {
                return `Service initialization failed: ${serviceInitError}`;
            }
            return missing.length === 0 
                ? 'LinkedIn integration service is ready' 
                : 'LinkedIn integration service has configuration issues';
        };

        res.json({
            success: missing.length === 0 && !!linkedInService,
            message: getStatusMessage(),
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
            capabilities,
            nodeEnv: process.env.NODE_ENV,
            platform: process.platform
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'LinkedIn integration service configuration error',
            error: error.message,
            timestamp: new Date().toISOString(),
            environmentVariables: getEnvironmentCheck()
        });
    }
};

// ========================================
// ROUTE DEFINITIONS
// ========================================

router.post('/analyze', handleAnalyze);
router.post('/quick-screenshot', handleQuickScreenshot);
router.get('/report/:filename', handleServeReport);
router.get('/screenshot/:filename', handleServeScreenshot);
router.get('/analysis/:filename', handleGetAnalysis);
router.get('/debug', handleDebug);
router.get('/status', handleStatus);

module.exports = router;