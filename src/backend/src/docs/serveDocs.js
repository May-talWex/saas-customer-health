const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const app = express();
const PORT = process.env.DOCS_PORT || 3002;

// Load the OpenAPI specification - fix the path
const swaggerDocument = YAML.load(path.join(__dirname, '../../docs/api.yaml'));

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Serve the raw YAML file
app.get('/api.yaml', (req, res) => {
    res.setHeader('Content-Type', 'application/x-yaml');
    res.sendFile(path.join(__dirname, '../../docs/api.yaml'));
});

app.listen(PORT, () => {
    console.log(`📚 API Documentation server running on port ${PORT}`);
    console.log(`🔗 Swagger UI: http://localhost:${PORT}/api-docs`);
    console.log(` OpenAPI Spec: http://localhost:${PORT}/api.yaml`);
});
