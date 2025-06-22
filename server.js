const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS Configuration - Updated
const corsOptions = {
    origin: [
        'http://localhost:8080',
        'http://localhost:3000',
        'http://localhost:5173', // Common Vite dev server port
        'http://127.0.0.1:8080',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'https://proprepai.netlify.app',
        'https://linkedinanalyzerapi.onrender.com' // Add your Render.com domain
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
    optionsSuccessStatus: 200,
    preflightContinue: false // Important: Handle preflight here
};

// Middleware
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false
}));

// Apply CORS middleware FIRST
app.use(cors(corsOptions));

// Explicit preflight handler for all routes
app.options('*', (req, res) => {
    console.log('🔄 Preflight request received:', {
        origin: req.get('Origin'),
        method: req.get('Access-Control-Request-Method'),
        headers: req.get('Access-Control-Request-Headers')
    });
    
    res.header('Access-Control-Allow-Origin', req.get('Origin'));
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept,Origin,Access-Control-Request-Method,Access-Control-Request-Headers');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.status(200).send();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add request logging middleware for debugging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - Origin: ${req.get('Origin')}`);
    
    // Add CORS headers to all responses as a backup
    const origin = req.get('Origin');
    if (corsOptions.origin.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
    }
    
    next();
});

// Routes
const linkedinRoutes = require('./routes/linkedin');
app.use('/api/linkedin', linkedinRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        service: 'LinkedIn Backend Service',
        port: PORT
    });
});

// Root route
app.get('/', (req, res) => {
    res.json({
        message: 'LinkedIn Backend Service is running',
        timestamp: new Date().toISOString(),
        port: PORT,
        corsOrigins: corsOptions.origin
    });
});

// Test CORS endpoint
app.get('/api/test-cors', (req, res) => {
    res.json({
        message: 'CORS is working!',
        origin: req.get('Origin'),
        timestamp: new Date().toISOString(),
        headers: req.headers
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('❌ Full Error Details:', err);
    res.status(500).json({ 
        error: 'Something went wrong!',
        details: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// 404 handler
app.use('*', (req, res) => {
    console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        error: 'Route not found',
        method: req.method,
        path: req.originalUrl
    });
});

app.listen(PORT, () => {
    console.log(`🚀 LinkedIn Backend Service running on port ${PORT}`);
    console.log(`📡 CORS enabled for origins: ${corsOptions.origin.join(', ')}`);
    console.log(`🌐 Service URL: https://linkedinanalyzerapi.onrender.com`);
});