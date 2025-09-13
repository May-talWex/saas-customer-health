/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Default error
    let statusCode = 500;
    let message = 'Internal Server Error';
    let details = null;

    // Handle specific error types
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation Error';
        details = err.details;
    } else if (err.code === 'SQLITE_ERROR') {
        statusCode = 500;
        message = 'Database Error';
    } else if (err.statusCode) {
        statusCode = err.statusCode;
        message = err.message;
    }

    res.status(statusCode).json({
        success: false,
        error: message,
        ...(details && { details }),
        timestamp: new Date().toISOString(),
        path: req.originalUrl
    });
};

module.exports = errorHandler;
