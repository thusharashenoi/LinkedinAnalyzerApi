const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS Configuration - Fixed to include localhost
const corsOptions = {
    origin: [
        'https://proprepai.netlify.app',
        'http://localhost:8080',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:8080',
        'http://127.0.0.1:3000'
    ],
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

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - Origin: ${req.get('Origin') || 'No Origin'}`);
    next();
});

// Routes
const linkedinRoutes = require('./routes/linkedin');
app.use('/api/linkedin', linkedinRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        service: 'LinkedIn Backend Service',
        port: PORT,
        environment: process.env.NODE_ENV || 'development'
    });
});

// Root route
app.get('/', (req, res) => {
    res.json({
        message: 'LinkedIn Backend Service is running',
        timestamp: new Date().toISOString(),
        port: PORT,
        corsOrigins: corsOptions.origin,
        environment: process.env.NODE_ENV || 'development'
    });
});

// Test CORS endpoint
app.get('/api/test-cors', (req, res) => {
    res.json({
        message: 'CORS is working!',
        origin: req.get('Origin'),
        timestamp: new Date().toISOString(),
        userAgent: req.get('User-Agent'),
        method: req.method
    });
});

// Additional debug endpoint for CORS testing
app.get('/api/debug', (req, res) => {
    res.json({
        message: 'Debug endpoint',
        headers: req.headers,
        origin: req.get('Origin'),
        method: req.method,
        url: req.url,
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        origin: req.get('Origin')
    });
    
    res.status(err.status || 500).json({ 
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use('*', (req, res) => {
    console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl} - Origin: ${req.get('Origin')}`);
    res.status(404).json({
        error: 'Route not found',
        method: req.method,
        path: req.originalUrl,
        timestamp: new Date().toISOString(),
        availableRoutes: [
            'GET /',
            'GET /health',
            'GET /api/test-cors',
            'GET /api/debug',
            '/api/linkedin/*'
        ]
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 LinkedIn Backend Service running on port ${PORT}`);
    console.log(`📡 CORS enabled for origins:`);
    corsOptions.origin.forEach(origin => console.log(`   - ${origin}`));
    console.log(`🌐 Service URL: https://linkedinanalyzerapi-htmq.onrender.com`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully...');
    process.exit(0);
});