const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'hotel.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Users Table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT
        )`);

        // Categories Table
        db.run(`CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE
        )`);

        // Menu Items Table
        db.run(`CREATE TABLE IF NOT EXISTS menu_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            description TEXT,
            price REAL,
            category_id INTEGER,
            image_url TEXT,
            available INTEGER DEFAULT 1,
            FOREIGN KEY(category_id) REFERENCES categories(id)
        )`);

        // Orders Table
        db.run(`CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            table_number INTEGER,
            status TEXT DEFAULT 'Preparing', -- Preparing, Ready, Served, Paid
            total_price REAL,
            payment_method TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Migration: Add payment_method to orders if it doesn't exist
        db.run("ALTER TABLE orders ADD COLUMN payment_method TEXT", (err) => {
            // Ignore error if column already exists
        });

        // Migration: Add customer_name to orders if it doesn't exist
        db.run("ALTER TABLE orders ADD COLUMN customer_name TEXT", (err) => {
            // Ignore error if column already exists
        });

        // Order Items Table
        db.run(`CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER,
            menu_item_id INTEGER,
            quantity INTEGER,
            price REAL,
            FOREIGN KEY(order_id) REFERENCES orders(id),
            FOREIGN KEY(menu_item_id) REFERENCES menu_items(id)
        )`);

        // Permanent Payments Table
        db.run(`CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER,
            table_number INTEGER,
            customer_name TEXT,
            items TEXT,
            total_price REAL,
            payment_method TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Seed Data if empty
        db.get("SELECT count(*) as count FROM users", (err, row) => {
            if (row && row.count === 0) {
                console.log("Seeding default data...");
                db.run(`INSERT INTO users (username, password, role) VALUES ('admin', 'admin123', 'admin')`);
                db.run(`INSERT INTO users (username, password, role) VALUES ('staff', 'staff123', 'staff')`);

                db.run(`INSERT INTO categories (name) VALUES ('Tiffin'), ('Main Course'), ('Breads'), ('Bev & Dessert')`, function (err) {
                    if (!err) {
                        // 1: Tiffin, 2: Main Course, 3: Breads, 4: Bev & Dessert
                        const items = [
                            // Tiffin
                            ['Idli (2 Pcs)', 'Steamed rice cakes with chutney and sambar', 40.00, 1],
                            ['Masala Dosa', 'Crispy crepe filled with potato masala', 80.00, 1],
                            ['Medhu Vada', 'Crispy lentil donuts (2 pcs)', 50.00, 1],
                            ['Ven Pongal', 'Ghee tempered rice and lentils', 70.00, 1],

                            // Main Course
                            ['Chicken Biryani', 'Chettinad style aromatic biryani', 220.00, 2],
                            ['Veg Meals', 'Full south indian meals with rice & sides', 150.00, 2],
                            ['Mutton Biryani', 'Seeraga samba mutton biryani', 320.00, 2],

                            // Breads
                            ['Parotta', 'Flaky layered flatbread (2 pcs) with salna', 60.00, 3],
                            ['Chapati', 'Whole wheat flatbread (2 pcs)', 50.00, 3],

                            // Bev & Dessert
                            ['Filter Coffee', 'Authentic Kumbakonam degree coffee', 30.00, 4],
                            ['Masala Tea', 'Spiced tea', 25.00, 4],
                            ['Jigarthanda', 'Famous Madurai cooling drink', 100.00, 4],
                            ['Payasam', 'Sweet vermicelli pudding', 60.00, 4]
                        ];
                        const stmt = db.prepare("INSERT INTO menu_items (name, description, price, category_id) VALUES (?, ?, ?, ?)");
                        items.forEach(item => stmt.run(item));
                        stmt.finalize();
                    }
                });
            }
        });
    });
}

module.exports = db;
