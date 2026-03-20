const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'ecommerce.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        // Create Users Table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )`);

        // Create Products Table
        db.run(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            description TEXT,
            price REAL,
            image TEXT,
            category TEXT
        )`, () => {
             // Insert Mock Nike Data if empty
             db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
                 if (row.count === 0) {
                     const insert = 'INSERT INTO products (name, description, price, image, category) VALUES (?,?,?,?,?)';
                     db.run(insert, ['Nike Air Max 270', 'Legendary Air gets lifted with a 3D animated view.', 160.00, 'airmax.jpg', 'Running']);
                     db.run(insert, ['Nike Dunk Low', 'Created for the hardwood but taken to the streets.', 115.00, 'dunk.jpg', 'Lifestyle']);
                     db.run(insert, ['Nike Air Force 1', 'The radiance lives on.', 110.00, 'af1.jpg', 'Lifestyle']);
                 }
             });
        });

        // Create Orders Table
        db.run(`CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            products TEXT,
            total REAL,
            address TEXT,
            status TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`);
    }
});

module.exports = db;
