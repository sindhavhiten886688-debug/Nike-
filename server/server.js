require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const db = require('./db.js');
const authenticateToken = require('./middleware/authMiddleware.js');
const { passesLuhnCheck, isValidExpiry, isValidCVV } = require('./utils/paymentValidator.js');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

// Middleware
app.use(cors());
app.use(express.json());

// --- Authentication Routes ---

app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const insert = 'INSERT INTO users (username, password) VALUES (?,?)';
        
        db.run(insert, [username, hashedPassword], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(409).json({ error: 'Username already exists' });
                }
                return res.status(500).json({ error: 'Database error' });
            }
            res.status(201).json({ message: 'User created successfully', userId: this.lastID });
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, username: user.username } });
    });
});

// --- Product Routes ---

app.get('/api/products', (req, res) => {
    db.all('SELECT * FROM products', [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

app.get('/api/products/:id', (req, res) => {
    db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'Product not found' });
        res.json(row);
    });
});

// --- Order & Checkout Routes (Protected) ---

app.post('/api/checkout', authenticateToken, (req, res) => {
    const { products, address, paymentDetails } = req.body;
    
    // 1. Validate Input
    if (!products || !address || !paymentDetails) {
        return res.status(400).json({ error: 'Missing required order details' });
    }

    // 2. Validate Payment (Mock Gateway)
    const { cardNumber, expiry, cvv } = paymentDetails;
    if (!passesLuhnCheck(cardNumber)) return res.status(400).json({ error: 'Invalid Credit Card Number' });
    if (!isValidExpiry(expiry)) return res.status(400).json({ error: 'Card Expired or Invalid Format (MM/YY)' });
    if (!isValidCVV(cvv)) return res.status(400).json({ error: 'Invalid CVV' });

    // 3. Process Order
    // Calculate total (simplified logic, usually you cross-check prices with DB)
    const total = products.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const productDataStr = JSON.stringify(products);
    const addressStr = JSON.stringify(address);

    const insert = 'INSERT INTO orders (user_id, products, total, address, status) VALUES (?,?,?,?,?)';
    db.run(insert, [req.user.id, productDataStr, total, addressStr, 'Processing'], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to save order' });
        
        res.status(201).json({ 
            message: 'Order created successfully', 
            orderId: this.lastID,
            status: 'Processing'
        });
    });
});

// User tracked orders
app.get('/api/orders', authenticateToken, (req, res) => {
    db.all('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        
        // Parse JSON strings back to objects for frontend
        const formattedRows = rows.map(r => ({
            ...r,
            products: JSON.parse(r.products),
            address: JSON.parse(r.address)
        }));
        
        res.json(formattedRows);
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running efficiently on http://localhost:${PORT}`);
});
