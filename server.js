// const express = require('express');
// const cors = require('cors');
// const helmet = require('helmet');
// require('dotenv').config();

// const app = express();
// const PORT = process.env.PORT || 3000;

// // CORS Configuration - Fixed to include localhost
// const corsOptions = {
//     origin: [
//         'https://proprepai.netlify.app',
//         'http://localhost:8080',
//         'http://localhost:3000',
//         'http://localhost:3001',
//         'http://127.0.0.1:8080',
//         'http://127.0.0.1:3000'
//     ],
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//     allowedHeaders: [
//         'Content-Type',
//         'Authorization',
//         'X-Requested-With',
//         'Accept',
//         'Origin',
//         'Access-Control-Request-Method',
//         'Access-Control-Request-Headers'
//     ],
//     credentials: true,
//     optionsSuccessStatus: 200
// };

// // Security middleware
// app.use(helmet({
//     crossOriginEmbedderPolicy: false,
//     contentSecurityPolicy: false
// }));

// // Apply CORS middleware
// app.use(cors(corsOptions));

// // Body parsing middleware
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// // Request logging middleware
// app.use((req, res, next) => {
//     console.log(`${req.method} ${req.path} - Origin: ${req.get('Origin') || 'No Origin'}`);
//     next();
// });

// // Routes
// const linkedinRoutes = require('./routes/linkedin');
// app.use('/api/linkedin', linkedinRoutes);

// // Health check endpoint
// app.get('/health', (req, res) => {
//     res.json({ 
//         status: 'ok', 
//         timestamp: new Date().toISOString(),
//         service: 'LinkedIn Backend Service',
//         port: PORT,
//         environment: process.env.NODE_ENV || 'development'
//     });
// });

// // Root route
// app.get('/', (req, res) => {
//     res.json({
//         message: 'LinkedIn Backend Service is running',
//         timestamp: new Date().toISOString(),
//         port: PORT,
//         corsOrigins: corsOptions.origin,
//         environment: process.env.NODE_ENV || 'development'
//     });
// });

// // Test CORS endpoint
// app.get('/api/test-cors', (req, res) => {
//     res.json({
//         message: 'CORS is working!',
//         origin: req.get('Origin'),
//         timestamp: new Date().toISOString(),
//         userAgent: req.get('User-Agent'),
//         method: req.method
//     });
// });

// // Additional debug endpoint for CORS testing
// app.get('/api/debug', (req, res) => {
//     res.json({
//         message: 'Debug endpoint',
//         headers: req.headers,
//         origin: req.get('Origin'),
//         method: req.method,
//         url: req.url,
//         timestamp: new Date().toISOString()
//     });
// });

// // Error handling middleware
// app.use((err, req, res, next) => {
//     console.error('❌ Server Error:', {
//         message: err.message,
//         stack: err.stack,
//         url: req.url,
//         method: req.method,
//         origin: req.get('Origin')
//     });
    
//     res.status(err.status || 500).json({ 
//         error: 'Internal Server Error',
//         message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
//         timestamp: new Date().toISOString()
//     });
// });

// // 404 handler
// app.use('*', (req, res) => {
//     console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl} - Origin: ${req.get('Origin')}`);
//     res.status(404).json({
//         error: 'Route not found',
//         method: req.method,
//         path: req.originalUrl,
//         timestamp: new Date().toISOString(),
//         availableRoutes: [
//             'GET /',
//             'GET /health',
//             'GET /api/test-cors',
//             'GET /api/debug',
//             '/api/linkedin/*'
//         ]
//     });
// });

// // Start server
// app.listen(PORT, () => {
//     console.log(`🚀 LinkedIn Backend Service running on port ${PORT}`);
//     console.log(`📡 CORS enabled for origins:`);
//     corsOptions.origin.forEach(origin => console.log(`   - ${origin}`));
//     console.log(`🌐 Service URL: https://linkedinanalyzerapi-htmq.onrender.com`);
//     console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
//     console.log(`⏰ Started at: ${new Date().toISOString()}`);
// });

// // Graceful shutdown
// process.on('SIGTERM', () => {
//     console.log('🛑 SIGTERM received, shutting down gracefully...');
//     process.exit(0);
// });

// process.on('SIGINT', () => {
//     console.log('🛑 SIGINT received, shutting down gracefully...');
//     process.exit(0);
// });




const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000; // Render uses port 10000 by default

// CORS Configuration - Updated for Render
const corsOptions = {
    origin: [
        'https://proprepai.netlify.app',
        'http://localhost:8080',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:8080',
        'http://127.0.0.1:3000',
        // Add your Render URL when you get it (replace with your actual URL)
        process.env.RENDER_EXTERNAL_URL,
        /\.onrender\.com$/ // Allow all onrender.com subdomains
    ].filter(Boolean), // Remove undefined values
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers'
    ],
    credentials: true,
    optionsSuccessStatus: 200
};

// Security middleware
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false
}));

// Apply CORS middleware
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (screenshots and analysis outputs)
app.use('/screenshots', express.static(path.join(__dirname, 'screenshots')));
app.use('/analysis-output', express.static(path.join(__dirname, 'linkedin_analysis_output')));

// Request logging middleware - Enhanced for Render
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const origin = req.get('Origin') || 'No Origin';
    const userAgent = req.get('User-Agent') || 'No User-Agent';
    
    console.log(`${timestamp} - ${req.method} ${req.path} - Origin: ${origin}`);
    
    // Log additional info for debugging
    if (process.env.NODE_ENV === 'development') {
        console.log(`  User-Agent: ${userAgent}`);
        console.log(`  Headers: ${JSON.stringify(req.headers, null, 2)}`);
    }
    
    next();
});

// Routes
const linkedinRoutes = require('./routes/linkedin');
app.use('/api/linkedin', linkedinRoutes);

// Health check endpoint - Enhanced for Render
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        service: 'LinkedIn Backend Service',
        port: PORT,
        environment: process.env.NODE_ENV || 'production',
        platform: 'render',
        uptime: Math.floor(process.uptime()),
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
        },
        nodeVersion: process.version,
        // Environment variables status (without revealing actual values)
        envStatus: {
            linkedinEmail: !!process.env.LINKEDIN_EMAIL,
            linkedinPassword: !!process.env.LINKEDIN_PASSWORD,
            geminiApiKey: !!process.env.GEMINI_API_KEY,
            renderExternal: !!process.env.RENDER_EXTERNAL_URL
        }
    });
});

// Root route - Updated for Render
app.get('/', (req, res) => {
    res.json({
        message: 'LinkedIn Backend Service is running on Render 🚀',
        timestamp: new Date().toISOString(),
        port: PORT,
        corsOrigins: corsOptions.origin,
        environment: process.env.NODE_ENV || 'production',
        platform: 'render',
        uptime: `${Math.floor(process.uptime())} seconds`,
        endpoints: {
            health: '/health',
            testCors: '/api/test-cors',
            debug: '/api/debug',
            linkedinAnalyze: '/api/linkedin/analyze',
            linkedinQuickScreenshot: '/api/linkedin/quick-screenshot',
            linkedinStatus: '/api/linkedin/status',
            linkedinDebug: '/api/linkedin/debug'
        },
        staticFiles: {
            screenshots: '/screenshots',
            analysisOutput: '/analysis-output'
        }
    });
});

// Test CORS endpoint - Enhanced
app.get('/api/test-cors', (req, res) => {
    res.json({
        message: 'CORS is working on Render! 🎉',
        origin: req.get('Origin'),
        timestamp: new Date().toISOString(),
        userAgent: req.get('User-Agent'),
        method: req.method,
        platform: 'render',
        renderUrl: process.env.RENDER_EXTERNAL_URL,
        allowedOrigins: corsOptions.origin.filter(origin => typeof origin === 'string')
    });
});

// Additional debug endpoint for CORS testing - Enhanced
app.get('/api/debug', (req, res) => {
    res.json({
        message: 'Debug endpoint - Render deployment',
        headers: req.headers,
        origin: req.get('Origin'),
        method: req.method,
        url: req.url,
        timestamp: new Date().toISOString(),
        platform: 'render',
        environment: process.env.NODE_ENV || 'production',
        processInfo: {
            nodeVersion: process.version,
            platform: process.platform,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cwd: process.cwd()
        },
        renderInfo: {
            externalUrl: process.env.RENDER_EXTERNAL_URL,
            serviceName: process.env.RENDER_SERVICE_NAME,
            region: process.env.RENDER_REGION
        }
    });
});

// Puppeteer test endpoint - New for testing browser functionality
app.get('/api/test-puppeteer', async (req, res) => {
    try {
        const puppeteer = require('puppeteer');
        
        // Render-specific Puppeteer configuration
        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-extensions',
                '--memory-pressure-off'
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
        });
        
        const page = await browser.newPage();
        await page.goto('https://example.com', { waitUntil: 'networkidle2', timeout: 10000 });
        const title = await page.title();
        
        await browser.close();
        
        res.json({
            success: true,
            message: 'Puppeteer is working on Render! 🎉',
            pageTitle: title,
            timestamp: new Date().toISOString(),
            platform: 'render'
        });
        
    } catch (error) {
        console.error('Puppeteer test failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
            platform: 'render'
        });
    }
});

// Error handling middleware - Enhanced for Render
app.use((err, req, res, next) => {
    const timestamp = new Date().toISOString();
    
    console.error(`❌ Server Error [${timestamp}]:`, {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : 'Stack trace hidden in production',
        url: req.url,
        method: req.method,
        origin: req.get('Origin'),
        userAgent: req.get('User-Agent'),
        platform: 'render'
    });
    
    res.status(err.status || 500).json({ 
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong on the server',
        timestamp,
        platform: 'render',
        requestId: req.headers['x-request-id'] || 'unknown'
    });
});

// 404 handler - Enhanced
app.use('*', (req, res) => {
    const timestamp = new Date().toISOString();
    console.log(`❌ 404 - Route not found [${timestamp}]: ${req.method} ${req.originalUrl} - Origin: ${req.get('Origin')}`);
    
    res.status(404).json({
        error: 'Route not found',
        method: req.method,
        path: req.originalUrl,
        timestamp,
        platform: 'render',
        message: 'The requested endpoint does not exist',
        availableRoutes: [
            'GET /',
            'GET /health',
            'GET /api/test-cors',
            'GET /api/debug', 
            'GET /api/test-puppeteer',
            'POST /api/linkedin/analyze',
            'POST /api/linkedin/quick-screenshot',
            'GET /api/linkedin/status',
            'GET /api/linkedin/debug',
            'GET /screenshots/:filename',
            'GET /analysis-output/:filename'
        ]
    });
});

// Start server - Updated for Render
app.listen(PORT, '0.0.0.0', () => {
    const timestamp = new Date().toISOString();
    
    console.log(`🚀 LinkedIn Backend Service started successfully!`);
    console.log(`⏰ Timestamp: ${timestamp}`);
    console.log(`🌐 Platform: Render`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log(`📡 Port: ${PORT}`);
    console.log(`🔗 External URL: ${process.env.RENDER_EXTERNAL_URL || 'Not set (will be available after deployment)'}`);
    
    console.log(`\n📡 CORS enabled for origins:`);
    corsOptions.origin.forEach(origin => {
        if (typeof origin === 'string') {
            console.log(`   - ${origin}`);
        } else if (origin instanceof RegExp) {
            console.log(`   - ${origin.toString()} (regex)`);
        }
    });
    
    console.log(`\n🔑 Environment Variables Status:`);
    console.log(`   - LINKEDIN_EMAIL: ${process.env.LINKEDIN_EMAIL ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - LINKEDIN_PASSWORD: ${process.env.LINKEDIN_PASSWORD ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - RENDER_EXTERNAL_URL: ${process.env.RENDER_EXTERNAL_URL ? '✅ Set' : '⚠️  Will be set by Render'}`);
    
    console.log(`\n🛠️  System Info:`);
    console.log(`   - Node.js: ${process.version}`);
    console.log(`   - Platform: ${process.platform}`);
    console.log(`   - Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB used`);
    
    console.log(`\n✅ Server is ready to handle requests!`);
});

// Graceful shutdown - Enhanced
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    console.log('⏰ Shutdown initiated at:', new Date().toISOString());
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully...');
    console.log('⏰ Shutdown initiated at:', new Date().toISOString());
    process.exit(0);
});

// Handle uncaught exceptions and unhandled rejections - New for Render
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    console.error('⏰ Time:', new Date().toISOString());
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    console.error('⏰ Time:', new Date().toISOString());
    // Don't exit the process for unhandled rejections in production
});