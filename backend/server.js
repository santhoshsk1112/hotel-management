const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const multer = require('multer');
const fs = require('fs');

// Configure Multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../frontend/uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// --- LOGIN ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            res.json({ success: true, user: { id: row.id, username: row.username, role: row.role } });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    });
});

// --- CATEGORIES ---
app.get('/api/categories', (req, res) => {
    db.all("SELECT * FROM categories", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// --- MENU ---
app.get('/api/menu', (req, res) => {
    const sql = `SELECT m.*, c.name as category_name 
                 FROM menu_items m 
                 LEFT JOIN categories c ON m.category_id = c.id
                 WHERE m.available = 1`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/menu', upload.single('image'), (req, res) => {
    const { name, description, price, category_id } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    const sql = "INSERT INTO menu_items (name, description, price, category_id, image_url) VALUES (?, ?, ?, ?, ?)";
    db.run(sql, [name, description, price, category_id, image_url], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, message: 'Item added' });
    });
});

app.put('/api/menu/:id', upload.single('image'), (req, res) => {
    const { name, description, price, category_id } = req.body;
    const id = req.params.id;

    // First get existing item to check for old image
    db.get("SELECT image_url FROM menu_items WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Item not found' });

        let image_url = row.image_url;
        if (req.file) {
            image_url = `/uploads/${req.file.filename}`;
            // Optional: delete old image file here if desired
        }

        const sql = "UPDATE menu_items SET name = ?, description = ?, price = ?, category_id = ?, image_url = ? WHERE id = ?";
        db.run(sql, [name, description, price, category_id, image_url, id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Item updated' });
        });
    });
});

app.delete('/api/menu/:id', (req, res) => {
    db.run("DELETE FROM menu_items WHERE id = ?", req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted' });
    });
});

// --- ORDERS ---
app.get('/api/orders', (req, res) => {
    // Return orders with their items
    const sql = "SELECT * FROM orders ORDER BY created_at DESC";
    db.all(sql, [], async (err, orders) => {
        if (err) return res.status(500).json({ error: err.message });

        // Populate items for each order (inefficient but simple for beginners)
        const ordersWithItems = await Promise.all(orders.map(async (order) => {
            return new Promise((resolve, reject) => {
                db.all(`SELECT oi.*, m.name 
                         FROM order_items oi 
                         JOIN menu_items m ON oi.menu_item_id = m.id 
                         WHERE oi.order_id = ?`, [order.id], (err, items) => {
                    if (err) reject(err);
                    else resolve({ ...order, items });
                });
            });
        }));
        res.json(ordersWithItems);
    });
});

app.post('/api/orders', (req, res) => {
    const { table_number, items, customer_name, status } = req.body; // items: [{ menu_item_id, quantity, price }]
    const total_price = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderStatus = status || 'Preparing';

    db.run("INSERT INTO orders (table_number, total_price, customer_name, status) VALUES (?, ?, ?, ?)", [table_number, total_price, customer_name, orderStatus], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        const orderId = this.lastID;

        const stmt = db.prepare("INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES (?, ?, ?, ?)");
        items.forEach(item => {
            stmt.run(orderId, item.menu_item_id, item.quantity, item.price);
        });
        stmt.finalize();

        res.json({ success: true, orderId });
    });
});

app.put('/api/orders/:id/status', (req, res) => {
    const { status, payment_method } = req.body;
    let sql = "UPDATE orders SET status = ?";
    let params = [status];

    if (payment_method) {
        sql += ", payment_method = ?";
        params.push(payment_method);
    }

    sql += " WHERE id = ?";
    params.push(req.params.id);

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });

        // --- PERMANENT ARCHIVAL ---
        if (status === 'Paid') {
            // Fetch order details and items to archive
            db.get("SELECT o.*, (SELECT GROUP_CONCAT(i.quantity || 'x ' || m.name, ', ') FROM order_items i JOIN menu_items m ON i.menu_item_id = m.id WHERE i.order_id = o.id) as items_summary FROM orders o WHERE o.id = ?", [req.params.id], (err, order) => {
                if (!err && order) {
                    db.run("INSERT INTO payments (order_id, table_number, customer_name, items, total_price, payment_method) VALUES (?, ?, ?, ?, ?, ?)",
                        [req.params.id, order.table_number, order.customer_name, order.items_summary, order.total_price, payment_method || order.payment_method || 'Cash']);
                }
            });
        }

        res.json({ success: true });
    });
});

// --- PAYMENTS ---
app.get('/api/payments/stats', (req, res) => {
    const sql = `
        SELECT 
            SUM(CASE WHEN date(created_at) = date('now') THEN total_price * 1.05 ELSE 0 END) as today,
            SUM(CASE WHEN date(created_at) >= date('now', '-7 days') THEN total_price * 1.05 ELSE 0 END) as weekly,
            SUM(CASE WHEN date(created_at) >= date('now', '-30 days') THEN total_price * 1.05 ELSE 0 END) as monthly,
            SUM(CASE WHEN date(created_at) >= date('now', '-365 days') THEN total_price * 1.05 ELSE 0 END) as yearly
        FROM payments
    `;
    db.get(sql, [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
            today: row.today || 0,
            weekly: row.weekly || 0,
            monthly: row.monthly || 0,
            yearly: row.yearly || 0
        });
    });
});

app.get('/api/payments/history', (req, res) => {
    const sql = "SELECT * FROM payments ORDER BY created_at DESC";
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Update full order (used by staff to finalize guest drafts)
app.put('/api/orders/:id', (req, res) => {
    const { table_number, items, customer_name, status } = req.body;
    const total_price = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const id = req.params.id;

    db.serialize(() => {
        db.run("UPDATE orders SET table_number = ?, total_price = ?, customer_name = ?, status = ? WHERE id = ?",
            [table_number, total_price, customer_name, status || 'Preparing', id], function (err) {
                if (err) return res.status(500).json({ error: err.message });
            });

        // Delete old items and insert new ones
        db.run("DELETE FROM order_items WHERE order_id = ?", [id], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            const stmt = db.prepare("INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES (?, ?, ?, ?)");
            items.forEach(item => {
                stmt.run(id, item.menu_item_id, item.quantity, item.price);
            });
            stmt.finalize();
            res.json({ success: true, message: 'Order updated' });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
