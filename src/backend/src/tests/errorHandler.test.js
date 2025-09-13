const errorHandler = require('../middleware/errorHandler');

describe('ErrorHandler Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            originalUrl: '/api/test'
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should handle ValidationError', () => {
        const error = {
            name: 'ValidationError',
            details: { field: 'email', message: 'Invalid email format' }
        };

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Validation Error',
            details: { field: 'email', message: 'Invalid email format' },
            timestamp: expect.any(String),
            path: '/api/test'
        });
    });

    test('should handle SQLite error', () => {
        const error = {
            code: 'SQLITE_ERROR',
            message: 'Database connection failed'
        };

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Database Error',
            timestamp: expect.any(String),
            path: '/api/test'
        });
    });

    test('should handle error with statusCode', () => {
        const error = {
            statusCode: 404,
            message: 'Resource not found'
        };

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Resource not found',
            timestamp: expect.any(String),
            path: '/api/test'
        });
    });

    test('should handle generic error', () => {
        const error = new Error('Something went wrong');

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Internal Server Error',
            timestamp: expect.any(String),
            path: '/api/test'
        });
    });

    test('should not include details when not provided', () => {
        const error = {
            name: 'ValidationError'
        };

        errorHandler(error, req, res, next);

        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Validation Error',
            timestamp: expect.any(String),
            path: '/api/test'
        });
    });

    test('should include details when provided', () => {
        const error = {
            name: 'ValidationError',
            details: { field: 'name', message: 'Name is required' }
        };

        errorHandler(error, req, res, next);

        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Validation Error',
            details: { field: 'name', message: 'Name is required' },
            timestamp: expect.any(String),
            path: '/api/test'
        });
    });
});
