
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS Configuration
const corsOptions = {
    origin: [
        'http://localhost:8080',
        'http://localhost:3000',
        'http://localhost:5173', // Common Vite dev server port
        'http://127.0.0.1:8080',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'https://proprepai.netlify.app'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin'
    ],
    credentials: true, // Allow cookies if needed
    optionsSuccessStatus: 200 // Support legacy browsers
};

// Middleware
app.use(helmet({
    crossOriginEmbedderPolicy: false, // Disable if causing issues with CORS
    contentSecurityPolicy: false // Disable if causing issues with CORS
}));

// Apply CORS middleware with configuration
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add request logging middleware for debugging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - Origin: ${req.get('Origin')}`);
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
        service: 'LinkedIn Backend Service'
    });
});

// Test CORS endpoint
app.get('/api/test-cors', (req, res) => {
    res.json({
        message: 'CORS is working!',
        origin: req.get('Origin'),
        timestamp: new Date().toISOString()
    });
});

// Error handling - temporary debugging version
app.use((err, req, res, next) => {
    console.error('❌ Full Error Details:', err);
    res.status(500).json({ 
        error: 'Something went wrong!',
        details: err.message,
        stack: err.stack
    });
});

app.listen(PORT, () => {
    console.log(`🚀 LinkedIn Backend Service running on port ${PORT}`);
    console.log(`📡 CORS enabled for origins: ${corsOptions.origin.join(', ')}`);
});