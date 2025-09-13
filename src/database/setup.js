const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'customer_health.db');

async function setupDatabase() {
    return new Promise((resolve, reject) => {
        // Remove existing database if it exists
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
            console.log('️  Removed existing database');
        }

        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('❌ Error creating database:', err);
                reject(err);
                return;
            }
            console.log('✅ Connected to SQLite database');
        });

        // Read and execute schema
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        db.exec(schema, (err) => {
            if (err) {
                console.error('❌ Error creating schema:', err);
                reject(err);
                return;
            }
            console.log('✅ Database schema created successfully');

            db.close((err) => {
                if (err) {
                    reject(err);
                    return;
                }

                console.log('🎉 Database setup completed!');
                console.log('📝 Next step: Run "npm run generate-data" to populate with sample data');
                resolve();
            });
        });
    });
}

if (require.main === module) {
    setupDatabase().catch(console.error);
}

module.exports = { setupDatabase };
