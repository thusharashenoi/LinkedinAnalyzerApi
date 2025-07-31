// // LinkedIn API Routes - Fixed version with better error handling
// const express = require('express');
// const router = express.Router();
// const LinkedInIntegrationService = require('../services/LinkedinIntegratedServices');
// const path = require('path');

// // Initialize LinkedIn services
// let linkedInService = null;
// let serviceInitError = null;

// // Try to initialize service
// try {
//     linkedInService = new LinkedInIntegrationService();
// } catch (error) {
//     serviceInitError = error.message;
//     console.error('❌ Failed to initialize LinkedIn service:', error.message);
// }

// // POST /api/linkedin/analyze - Start LinkedIn analysis (only requires profileUrl)
// router.post('/analyze', async (req, res) => {
//     try {
//         // Check if service is initialized
//         if (!linkedInService) {
//             return res.status(500).json({
//                 success: false,
//                 error: `Service initialization failed: ${serviceInitError}`
//             });
//         }

//         const { profileUrl } = req.body;
        
//         // Validate required field
//         if (!profileUrl) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Missing required field: profileUrl'
//             });
//         }

//         // Validate URL format
//         if (!profileUrl.includes('linkedin.com')) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Invalid LinkedIn profile URL'
//             });
//         }
        
//         console.log('📊 Starting LinkedIn analysis for:', profileUrl);
        
//         // Run complete analysis
//         const result = await linkedInService.runCompleteAnalysis(profileUrl);
        
//         console.log('🔍 Analysis result structure:', {
//             success: result?.success,
//             hasScreenshotPath: !!result?.screenshotPath,
//             hasHtmlReportPath: !!result?.htmlReportPath,
//             hasAnalysisJsonPath: !!result?.analysisJsonPath,
//             hasAnalysisData: !!result?.analysisData
//         });
        
//         if (result.success) {
//             // Build response data with null checks
//             const responseData = {
//                 screenshotPath: result.screenshotPath || null,
//                 htmlReportPath: result.htmlReportPath || null,
//                 analysisJsonPath: result.analysisJsonPath || null,
//                 analysisData: result.analysisData || null
//             };
            
//             // Only add URLs if files exist
//             if (result.htmlReportPath) {
//                 responseData.reportUrl = `/api/linkedin/report/${path.basename(result.htmlReportPath)}`;
//             }
            
//             if (result.screenshotPath) {
//                 responseData.screenshotUrl = `/api/linkedin/screenshot/${path.basename(result.screenshotPath)}`;
//             }
            
//             // Add warnings for missing features
//             const warnings = [];
//             if (!result.analysisData && !process.env.GEMINI_API_KEY) {
//                 warnings.push('AI analysis skipped - GEMINI_API_KEY not configured');
//             }
            
//             res.json({
//                 success: true,
//                 message: 'LinkedIn analysis completed successfully',
//                 data: responseData,
//                 warnings: warnings.length > 0 ? warnings : undefined
//             });
//         } else {
//             res.status(500).json({
//                 success: false,
//                 error: result.error || 'LinkedIn analysis failed'
//             });
//         }
        
//     } catch (error) {
//         console.error('❌ LinkedIn analysis error:', error);
        
//         // Provide specific error messages
//         if (error.message.includes('Missing required environment variables')) {
//             res.status(500).json({
//                 success: false,
//                 error: 'Server configuration error: Missing required environment variables. Please check LINKEDIN_EMAIL and LINKEDIN_PASSWORD.'
//             });
//         } else if (error.message.includes('GEMINI_API_KEY')) {
//             res.status(500).json({
//                 success: false,
//                 error: 'AI analysis unavailable: GEMINI_API_KEY not configured. Screenshot capture is still available.'
//             });
//         } else {
//             res.status(500).json({
//                 success: false,
//                 error: error.message
//             });
//         }
//     }
// });

// // GET /api/linkedin/report/:filename - Serve HTML reports
// router.get('/report/:filename', (req, res) => {
//     try {
//         const { filename } = req.params;
//         // Change directory to linkedin_analysis_output for HTML reports
//         const reportPath = path.join(__dirname, '../linkedin_analysis_output', filename);
        
//         // Security check
//         if (!filename.endsWith('.html')) {
//             return res.status(400).json({ error: 'Invalid file type' });
//         }
        
//         res.sendFile(path.resolve(reportPath), (err) => {
//             if (err) {
//                 console.error('Error serving report:', err);
//                 res.status(404).json({ error: 'Report not found' });
//             }
//         });
        
//     } catch (error) {
//         console.error('Error serving LinkedIn report:', error);
//         res.status(500).json({ error: 'Failed to serve report' });
//     }
// });

// // GET /api/linkedin/analysis/:filename - Get analysis JSON data
// router.get('/analysis/:filename', async (req, res) => {
//     try {
//         if (!linkedInService) {
//             return res.status(500).json({
//                 success: false,
//                 error: `Service not available: ${serviceInitError}`
//             });
//         }

//         const { filename } = req.params;
//         const analysisPath = path.join(__dirname, '../linkedin_analysis', filename);
        
//         // Security check
//         if (!filename.endsWith('.json')) {
//             return res.status(400).json({ error: 'Invalid file type' });
//         }
        
//         const analysisData = await linkedInService.getAnalysisData(analysisPath);
        
//         if (analysisData) {
//             res.json({
//                 success: true,
//                 data: analysisData
//             });
//         } else {
//             res.status(404).json({
//                 success: false,
//                 error: 'Analysis data not found'
//             });
//         }
        
//     } catch (error) {
//         console.error('Error getting analysis data:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to get analysis data'
//         });
//     }
// });

// // POST /api/linkedin/quick-screenshot - Take screenshot only
// router.post('/quick-screenshot', async (req, res) => {
//     try {
//         if (!linkedInService) {
//             return res.status(500).json({
//                 success: false,
//                 error: `Service not available: ${serviceInitError}`
//             });
//         }

//         const { profileUrl } = req.body;
        
//         if (!profileUrl) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Missing required field: profileUrl'
//             });
//         }

//         if (!profileUrl.includes('linkedin.com')) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Invalid LinkedIn profile URL'
//             });
//         }
        
//         console.log('📸 Taking LinkedIn screenshot for:', profileUrl);
        
//         const screenshotPath = await linkedInService.takeLinkedInScreenshot(profileUrl);
        
//         if (!screenshotPath) {
//             throw new Error('Screenshot failed - no path returned');
//         }
        
//         res.json({
//             success: true,
//             message: 'Screenshot taken successfully',
//             data: {
//                 screenshotPath,
//                 screenshotUrl: `/api/linkedin/screenshot/${path.basename(screenshotPath)}`
//             }
//         });
        
//     } catch (error) {
//         console.error('❌ Screenshot error:', error);
        
//         if (error.message.includes('Missing required environment variables')) {
//             res.status(500).json({
//                 success: false,
//                 error: 'Server configuration error: Missing LINKEDIN_EMAIL and LINKEDIN_PASSWORD environment variables.'
//             });
//         } else {
//             res.status(500).json({
//                 success: false,
//                 error: error.message
//             });
//         }
//     }
// });

// // GET /api/linkedin/screenshot/:filename - Serve screenshots
// router.get('/screenshot/:filename', (req, res) => {
//     try {
//         const { filename } = req.params;
//         const screenshotPath = path.join(__dirname, '../screenshots', filename);
        
//         // Security check
//         if (!filename.endsWith('.png')) {
//             return res.status(400).json({ error: 'Invalid file type' });
//         }
        
//         res.sendFile(path.resolve(screenshotPath), (err) => {
//             if (err) {
//                 console.error('Error serving screenshot:', err);
//                 res.status(404).json({ error: 'Screenshot not found' });
//             }
//         });
        
//     } catch (error) {
//         console.error('Error serving screenshot:', error);
//         res.status(500).json({ error: 'Failed to serve screenshot' });
//     }
// });

// // GET /api/linkedin/debug - Debug endpoint
// router.get('/debug', async (req, res) => {
//     try {
//         const envCheck = {
//             linkedinEmail: !!process.env.LINKEDIN_EMAIL,
//             linkedinPassword: !!process.env.LINKEDIN_PASSWORD,
//             geminiApiKey: !!process.env.GEMINI_API_KEY
//         };

//         let debugInfo = null;
//         let serviceError = serviceInitError;
        
//         if (linkedInService) {
//             try {
//                 debugInfo = await linkedInService.getDebugInfo();
//             } catch (error) {
//                 serviceError = error.message;
//             }
//         }

//         res.json({
//             success: !!linkedInService,
//             timestamp: new Date().toISOString(),
//             environment: {
//                 nodeEnv: process.env.NODE_ENV,
//                 platform: process.platform,
//                 cwd: process.cwd()
//             },
//             environmentVariables: envCheck,
//             serviceDebugInfo: debugInfo,
//             serviceError,
//             serviceInitialization: {
//                 initialized: !!linkedInService,
//                 error: serviceInitError
//             },
//             recommendations: {
//                 missingEnvVars: Object.entries(envCheck)
//                     .filter(([, exists]) => !exists)
//                     .map(([key]) => key),
//                 nextSteps: [
//                     envCheck.linkedinEmail ? null : 'Set LINKEDIN_EMAIL environment variable',
//                     envCheck.linkedinPassword ? null : 'Set LINKEDIN_PASSWORD environment variable',
//                     envCheck.geminiApiKey ? null : 'Set GEMINI_API_KEY environment variable (optional for screenshot-only mode)'
//                 ].filter(Boolean)
//             }
//         });
        
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             error: error.message,
//             timestamp: new Date().toISOString()
//         });
//     }
// });

// // GET /api/linkedin/status - Check service status
// router.get('/status', (req, res) => {
//     try {
//         const envVars = {
//             linkedinEmail: !!process.env.LINKEDIN_EMAIL,
//             linkedinPassword: !!process.env.LINKEDIN_PASSWORD,
//             geminiApiKey: !!process.env.GEMINI_API_KEY
//         };

//         const required = ['LINKEDIN_EMAIL', 'LINKEDIN_PASSWORD'];
//         const missing = required.filter(key => !process.env[key]);

//         res.json({
//             success: missing.length === 0 && !!linkedInService,
//             message: !linkedInService 
//                 ? `Service initialization failed: ${serviceInitError}`
//                 : missing.length === 0 
//                     ? 'LinkedIn integration service is ready' 
//                     : 'LinkedIn integration service has configuration issues',
//             timestamp: new Date().toISOString(),
//             serviceInitialization: {
//                 initialized: !!linkedInService,
//                 error: serviceInitError
//             },
//             directories: {
//                 screenshots: './screenshots',
//                 analysis: './linkedin_analysis'
//             },
//             environmentVariables: envVars,
//             missingVariables: missing,
//             capabilities: {
//                 screenshotCapture: missing.length === 0 && !!linkedInService,
//                 aiAnalysis: envVars.geminiApiKey && !!linkedInService,
//                 fullAnalysis: missing.length === 0 && envVars.geminiApiKey && !!linkedInService
//             },
//             nodeEnv: process.env.NODE_ENV,
//             platform: process.platform
//         });
        
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: 'LinkedIn integration service configuration error',
//             error: error.message,
//             timestamp: new Date().toISOString(),
//             environmentVariables: {
//                 linkedinEmail: !!process.env.LINKEDIN_EMAIL,
//                 linkedinPassword: !!process.env.LINKEDIN_PASSWORD,
//                 geminiApiKey: !!process.env.GEMINI_API_KEY
//             }
//         });
//     }
// });

// module.exports = router;




// LinkedIn API Routes - Render Deployment Optimized
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

// Initialize LinkedIn services with better error handling
let linkedInService = null;
let serviceInitError = null;
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;

// Service initialization with retry logic
async function initializeService() {
    if (linkedInService) return linkedInService;
    
    if (initializationAttempts >= MAX_INIT_ATTEMPTS) {
        throw new Error(`Service initialization failed after ${MAX_INIT_ATTEMPTS} attempts: ${serviceInitError}`);
    }
    
    try {
        initializationAttempts++;
        const LinkedInIntegrationService = require('../services/LinkedinIntegratedServices');
        linkedInService = new LinkedInIntegrationService();
        
        console.log(`✅ LinkedIn service initialized successfully (attempt ${initializationAttempts})`);
        return linkedInService;
        
    } catch (error) {
        serviceInitError = error.message;
        console.error(`❌ Failed to initialize LinkedIn service (attempt ${initializationAttempts}):`, error.message);
        
        // Don't throw on last attempt, let the route handlers deal with it
        if (initializationAttempts < MAX_INIT_ATTEMPTS) {
            console.log(`⏳ Will retry initialization on next request...`);
        }
        
        throw error;
    }
}

// Middleware to ensure service is initialized
async function ensureServiceInitialized(req, res, next) {
    try {
        if (!linkedInService) {
            await initializeService();
        }
        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: `Service initialization failed: ${error.message}`,
            timestamp: new Date().toISOString(),
            platform: 'render',
            retryable: initializationAttempts < MAX_INIT_ATTEMPTS
        });
    }
}

// Validate LinkedIn URL
function validateLinkedInUrl(profileUrl) {
    if (!profileUrl) {
        return { valid: false, error: 'Missing required field: profileUrl' };
    }
    
    if (typeof profileUrl !== 'string') {
        return { valid: false, error: 'profileUrl must be a string' };
    }
    
    // More comprehensive LinkedIn URL validation
    const linkedinPatterns = [
        /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?(\?.*)?$/,
        /^https?:\/\/(www\.)?linkedin\.com\/pub\/[a-zA-Z0-9-]+\/[a-zA-Z0-9]+\/[a-zA-Z0-9]+\/[a-zA-Z0-9]+\/?(\?.*)?$/
    ];
    
    const isValid = linkedinPatterns.some(pattern => pattern.test(profileUrl));
    
    if (!isValid) {
        return { 
            valid: false, 
            error: 'Invalid LinkedIn profile URL. Please provide a valid LinkedIn profile URL (e.g., https://www.linkedin.com/in/username)' 
        };
    }
    
    return { valid: true };
}

// Enhanced error response helper
function sendErrorResponse(res, statusCode, error, details = {}) {
    const response = {
        success: false,
        error: typeof error === 'string' ? error : error.message,
        timestamp: new Date().toISOString(),
        platform: 'render',
        ...details
    };
    
    // Log error for debugging
    console.error(`❌ API Error [${statusCode}]:`, response);
    
    return res.status(statusCode).json(response);
}

// POST /api/linkedin/analyze - Complete LinkedIn analysis
router.post('/analyze', async (req, res) => {
    const startTime = Date.now();
    
    try {
        // Initialize service if needed
        if (!linkedInService) {
            try {
                await initializeService();
            } catch (error) {
                return sendErrorResponse(res, 500, 'Service initialization failed', {
                    details: error.message,
                    retryable: initializationAttempts < MAX_INIT_ATTEMPTS
                });
            }
        }

        const { profileUrl } = req.body;
        
        // Validate LinkedIn URL
        const urlValidation = validateLinkedInUrl(profileUrl);
        if (!urlValidation.valid) {
            return sendErrorResponse(res, 400, urlValidation.error);
        }
        
        console.log(`📊 Starting LinkedIn analysis for: ${profileUrl}`);
        console.log(`🕐 Analysis started at: ${new Date().toISOString()}`);
        
        // Set timeout for the entire operation (Render has 30-minute timeout, but we'll be more conservative)
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Analysis timeout - operation took too long')), 25 * 60 * 1000); // 25 minutes
        });
        
        // Run analysis with timeout
        const analysisPromise = linkedInService.runCompleteAnalysis(profileUrl);
        const result = await Promise.race([analysisPromise, timeoutPromise]);
        
        const duration = Date.now() - startTime;
        console.log(`⏱️  Analysis completed in ${duration}ms`);
        
        if (result.success) {
            // Build response with comprehensive data
            const responseData = {
                screenshotPath: result.screenshotPath || null,
                htmlReportPath: result.htmlReportPath || null,
                analysisJsonPath: result.analysisJsonPath || null,
                analysisData: result.analysisData || null,
                duration: duration,
                timestamp: result.timestamp
            };
            
            // Generate URLs for accessible files
            if (result.htmlReportPath) {
                responseData.reportUrl = `/analysis-output/${path.basename(result.htmlReportPath)}`;
            }
            
            if (result.screenshotPath) {
                responseData.screenshotUrl = `/screenshots/${path.basename(result.screenshotPath)}`;
            }
            
            // Add feature availability warnings
            const warnings = [];
            if (!result.analysisData && !process.env.GEMINI_API_KEY) {
                warnings.push('AI analysis unavailable - GEMINI_API_KEY not configured. Only screenshot captured.');
            }
            
            if (!process.env.GEMINI_API_KEY) {
                warnings.push('For full AI analysis capabilities, configure GEMINI_API_KEY environment variable.');
            }
            
            const response = {
                success: true,
                message: 'LinkedIn analysis completed successfully',
                data: responseData,
                platform: 'render',
                duration: duration,
                warnings: warnings.length > 0 ? warnings : undefined
            };
            
            console.log(`✅ Analysis response prepared:`, {
                hasScreenshot: !!responseData.screenshotPath,
                hasReport: !!responseData.htmlReportPath,
                hasAnalysisData: !!responseData.analysisData,
                duration: duration
            });
            
            res.json(response);
            
        } else {
            return sendErrorResponse(res, 500, result.error || 'LinkedIn analysis failed', {
                duration: duration,
                details: 'The analysis process completed but returned a failure status'
            });
        }
        
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error('❌ LinkedIn analysis error:', error);
        
        // Provide specific error handling for common issues
        if (error.message.includes('timeout')) {
            return sendErrorResponse(res, 408, 'Analysis timeout - The operation took too long to complete', {
                duration: duration,
                suggestion: 'Please try again with a simpler profile or contact support if the issue persists'
            });
        }
        
        if (error.message.includes('Missing required environment variables')) {
            return sendErrorResponse(res, 500, 'Server configuration error', {
                details: 'Missing required environment variables (LINKEDIN_EMAIL, LINKEDIN_PASSWORD)',
                duration: duration
            });
        }
        
        if (error.message.includes('challenge') || error.message.includes('verification')) {
            return sendErrorResponse(res, 429, 'LinkedIn account verification required', {
                details: 'The LinkedIn account requires manual verification. Please contact support.',
                duration: duration
            });
        }
        
        return sendErrorResponse(res, 500, error.message, {
            duration: duration,
            type: error.constructor.name
        });
    }
});

// POST /api/linkedin/quick-screenshot - Screenshot only
router.post('/quick-screenshot', async (req, res) => {
    const startTime = Date.now();
    
    try {
        // Initialize service if needed
        if (!linkedInService) {
            try {
                await initializeService();
            } catch (error) {
                return sendErrorResponse(res, 500, 'Service initialization failed', {
                    details: error.message,
                    retryable: initializationAttempts < MAX_INIT_ATTEMPTS
                });
            }
        }

        const { profileUrl } = req.body;
        
        // Validate LinkedIn URL
        const urlValidation = validateLinkedInUrl(profileUrl);
        if (!urlValidation.valid) {
            return sendErrorResponse(res, 400, urlValidation.error);
        }
        
        console.log(`📸 Taking LinkedIn screenshot for: ${profileUrl}`);
        
        // Set timeout for screenshot operation
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Screenshot timeout')), 10 * 60 * 1000); // 10 minutes
        });
        
        const screenshotPromise = linkedInService.takeLinkedInScreenshot(profileUrl);
        const screenshotPath = await Promise.race([screenshotPromise, timeoutPromise]);
        
        const duration = Date.now() - startTime;
        
        if (!screenshotPath) {
            return sendErrorResponse(res, 500, 'Screenshot failed - no path returned', {
                duration: duration
            });
        }
        
        // Verify file exists
        try {
            await fs.access(screenshotPath);
        } catch (error) {
            return sendErrorResponse(res, 500, 'Screenshot file not accessible', {
                duration: duration,
                details: 'Screenshot was created but file is not accessible'
            });
        }
        
        const response = {
            success: true,
            message: 'Screenshot captured successfully',
            data: {
                screenshotPath,
                screenshotUrl: `/screenshots/${path.basename(screenshotPath)}`,
                timestamp: new Date().toISOString(),
                duration: duration
            },
            platform: 'render'
        };
        
        console.log(`✅ Screenshot completed in ${duration}ms`);
        res.json(response);
        
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error('❌ Screenshot error:', error);
        
        if (error.message.includes('timeout')) {
            return sendErrorResponse(res, 408, 'Screenshot timeout', {
                duration: duration,
                suggestion: 'The screenshot operation took too long. Please try again.'
            });
        }
        
        if (error.message.includes('Missing required environment variables')) {
            return sendErrorResponse(res, 500, 'Server configuration error', {
                details: 'Missing LinkedIn credentials in environment variables',
                duration: duration
            });
        }
        
        return sendErrorResponse(res, 500, error.message, {
            duration: duration,
            type: error.constructor.name
        });
    }
});

// GET /api/linkedin/status - Enhanced service status
router.get('/status', (req, res) => {
    try {
        const envVars = {
            linkedinEmail: !!process.env.LINKEDIN_EMAIL,
            linkedinPassword: !!process.env.LINKEDIN_PASSWORD,  
            geminiApiKey: !!process.env.GEMINI_API_KEY,
            renderExternalUrl: !!process.env.RENDER_EXTERNAL_URL
        };

        const required = ['LINKEDIN_EMAIL', 'LINKEDIN_PASSWORD'];
        const missing = required.filter(key => !process.env[key]);
        const serviceReady = missing.length === 0 && !!linkedInService;

        const response = {
            success: serviceReady,
            timestamp: new Date().toISOString(),
            platform: 'render',
            service: {
                initialized: !!linkedInService,
                ready: serviceReady,
                initializationAttempts: initializationAttempts,
                maxAttempts: MAX_INIT_ATTEMPTS,
                error: serviceInitError
            },
            environment: {
                nodeEnv: process.env.NODE_ENV || 'production',
                nodeVersion: process.version,
                platform: process.platform,
                renderService: process.env.RENDER_SERVICE_NAME || 'unknown',
                renderRegion: process.env.RENDER_REGION || 'unknown'
            },
            configuration: {
                environmentVariables: envVars,
                missingRequired: missing,
                hasOptionalAI: envVars.geminiApiKey
            },
            capabilities: {
                screenshotCapture: serviceReady,
                aiAnalysis: serviceReady && envVars.geminiApiKey,
                fullAnalysis: serviceReady && envVars.geminiApiKey
            },
            directories: {
                screenshots: '/screenshots',
                analysisOutput: '/analysis-output'
            },
            endpoints: {
                analyze: 'POST /api/linkedin/analyze',
                quickScreenshot: 'POST /api/linkedin/quick-screenshot',
                status: 'GET /api/linkedin/status',
                debug: 'GET /api/linkedin/debug'
            },
            message: !serviceReady 
                ? (missing.length > 0 
                    ? `Configuration incomplete - missing: ${missing.join(', ')}` 
                    : `Service initialization failed: ${serviceInitError}`)
                : 'LinkedIn integration service is ready and operational'
        };

        res.json(response);
        
    } catch (error) {
        return sendErrorResponse(res, 500, 'Status check failed', {
            details: error.message,
            service: 'status-endpoint'
        });
    }
});

// GET /api/linkedin/debug - Enhanced debug information
router.get('/debug', async (req, res) => {
    try {
        const envCheck = {
            linkedinEmail: !!process.env.LINKEDIN_EMAIL,
            linkedinPassword: !!process.env.LINKEDIN_PASSWORD,
            geminiApiKey: !!process.env.GEMINI_API_KEY,
            renderExternalUrl: !!process.env.RENDER_EXTERNAL_URL
        };

        let debugInfo = null;
        if (linkedInService) {
            try {
                debugInfo = await linkedInService.getDebugInfo();
            } catch (error) {
                console.error('Error getting debug info from service:', error);
            }
        }

        // System information
        const systemInfo = {
            nodeVersion: process.version,
            platform: process.platform,
            architecture: process.arch,
            uptime: Math.floor(process.uptime()),
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
                rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB'
            },
            cwd: process.cwd()
        };

        // Render-specific information
        const renderInfo = {
            serviceName: process.env.RENDER_SERVICE_NAME || 'unknown',
            region: process.env.RENDER_REGION || 'unknown',
            externalUrl: process.env.RENDER_EXTERNAL_URL || 'not-set',
            instanceId: process.env.RENDER_INSTANCE_ID || 'unknown',
            serviceId: process.env.RENDER_SERVICE_ID || 'unknown'
        };

        const response = {
            success: !!linkedInService,
            timestamp: new Date().toISOString(),
            platform: 'render',
            service: {
                initialized: !!linkedInService,
                initializationAttempts: initializationAttempts,
                lastError: serviceInitError,
                debugInfo: debugInfo
            },
            system: systemInfo,
            render: renderInfo,
            environment: {
                nodeEnv: process.env.NODE_ENV || 'production',
                variables: envCheck
            },
            recommendations: {
                missingEnvVars: Object.entries(envCheck)
                    .filter(([, exists]) => !exists)
                    .map(([key]) => key.replace(/([A-Z])/g, '_$1').toUpperCase()),
                nextSteps: [
                    !envCheck.linkedinEmail ? 'Set LINKEDIN_EMAIL environment variable' : null,
                    !envCheck.linkedinPassword ? 'Set LINKEDIN_PASSWORD environment variable' : null,
                    !envCheck.geminiApiKey ? 'Set GEMINI_API_KEY for AI analysis (optional)' : null,
                    !linkedInService ? 'Fix service initialization issues' : null
                ].filter(Boolean)
            }
        };

        res.json(response);
        
    } catch (error) {
        return sendErrorResponse(res, 500, 'Debug information unavailable', {
            details: error.message,
            service: 'debug-endpoint'
        });
    }
});

// File serving routes with better security and error handling

// GET /api/linkedin/screenshot/:filename - Serve screenshots
router.get('/screenshot/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        
        // Enhanced security validation
        if (!filename || typeof filename !== 'string') {
            return sendErrorResponse(res, 400, 'Invalid filename');
        }
        
        if (!filename.match(/^[A-Za-z0-9._-]+\.png$/)) {
            return sendErrorResponse(res, 400, 'Invalid file format - only PNG files allowed');
        }
        
        const screenshotPath = path.join(__dirname, '../screenshots', filename);
        
        // Verify file exists and is accessible
        try {
            await fs.access(screenshotPath);
            const stats = await fs.stat(screenshotPath);
            
            if (!stats.isFile()) {
                return sendErrorResponse(res, 404, 'File not found');
            }
            
            // Set appropriate headers
            res.set({
                'Content-Type': 'image/png',
                'Content-Length': stats.size,
                'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
                'X-Content-Type-Options': 'nosniff'
            });
            
            res.sendFile(path.resolve(screenshotPath));
            
        } catch (error) {
            if (error.code === 'ENOENT') {
                return sendErrorResponse(res, 404, 'Screenshot not found');
            }
            throw error;
        }
        
    } catch (error) {
        console.error('Error serving screenshot:', error);
        return sendErrorResponse(res, 500, 'Failed to serve screenshot', {
            details: error.message
        });
    }
});

// GET /api/linkedin/report/:filename - Serve HTML reports  
router.get('/report/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        
        // Enhanced security validation
        if (!filename || typeof filename !== 'string') {
            return sendErrorResponse(res, 400, 'Invalid filename');
        }
        
        if (!filename.match(/^[A-Za-z0-9._-]+\.html$/)) {
            return sendErrorResponse(res, 400, 'Invalid file format - only HTML files allowed');
        }
        
        const reportPath = path.join(__dirname, '../linkedin_analysis_output', filename);
        
        // Verify file exists and is accessible
        try {
            await fs.access(reportPath);
            const stats = await fs.stat(reportPath);
            
            if (!stats.isFile()) {
                return sendErrorResponse(res, 404, 'Report not found');
            }
            
            // Set appropriate headers for HTML
            res.set({
                'Content-Type': 'text/html; charset=utf-8',
                'Content-Length': stats.size,
                'Cache-Control': 'public, max-age=1800', // Cache for 30 minutes
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'SAMEORIGIN'
            });
            
            res.sendFile(path.resolve(reportPath));
            
        } catch (error) {
            if (error.code === 'ENOENT') {
                return sendErrorResponse(res, 404, 'Report not found');
            }
            throw error;
        }
        
    } catch (error) {
        console.error('Error serving report:', error);
        return sendErrorResponse(res, 500, 'Failed to serve report', {
            details: error.message
        });
    }
});

// GET /api/linkedin/analysis/:filename - Get analysis JSON data
router.get('/analysis/:filename', async (req, res) => {
    try {
        if (!linkedInService) {
            try {
                await initializeService();
            } catch (error) {
                return sendErrorResponse(res, 500, 'Service not available', {
                    details: error.message
                });
            }
        }

        const { filename } = req.params;
        
        // Enhanced security validation
        if (!filename || typeof filename !== 'string') {
            return sendErrorResponse(res, 400, 'Invalid filename');
        }
        
        if (!filename.match(/^[A-Za-z0-9._-]+\.json$/)) {
            return sendErrorResponse(res, 400, 'Invalid file format - only JSON files allowed');
        }
        
        const analysisPath = path.join(__dirname, '../linkedin_analysis', filename);
        
        const analysisData = await linkedInService.getAnalysisData(analysisPath);
        
        if (analysisData) {
            res.json({
                success: true,
                data: analysisData,
                timestamp: new Date().toISOString(),
                platform: 'render'
            });
        } else {
            return sendErrorResponse(res, 404, 'Analysis data not found', {
                filename: filename
            });
        }
        
    } catch (error) {
        console.error('Error getting analysis data:', error);
        return sendErrorResponse(res, 500, 'Failed to retrieve analysis data', {
            details: error.message
        });
    }
});

// Catch-all for undefined routes
router.use('*', (req, res) => {
    return sendErrorResponse(res, 404, 'LinkedIn API endpoint not found', {
        method: req.method,
        path: req.originalUrl,
        availableEndpoints: [
            'POST /api/linkedin/analyze',
            'POST /api/linkedin/quick-screenshot', 
            'GET /api/linkedin/status',
            'GET /api/linkedin/debug',
            'GET /api/linkedin/screenshot/:filename',
            'GET /api/linkedin/report/:filename',
            'GET /api/linkedin/analysis/:filename'
        ]
    });
});

module.exports = router;