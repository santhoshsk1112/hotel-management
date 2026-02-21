let cart = [];
let allMenuItems = [];
let currentCategory = 'All';

document.addEventListener('DOMContentLoaded', () => {
    init();
});

async function init() {
    await loadCategories();
    await loadMenu();
    renderCart();
}

async function loadCategories() {
    try {
        const categories = await api.getCategories();
        const container = document.getElementById('category-list');
        container.innerHTML = `<button class="nav-item active" onclick="filterMenu('All', this)">All Items</button>`;
        categories.forEach(cat => {
            container.innerHTML += `<button class="nav-item" onclick="filterMenu(${cat.id}, this)">${cat.name}</button>`;
        });
    } catch (e) { console.error(e); }
}

async function loadMenu() {
    try {
        allMenuItems = await api.getMenu();
        renderMenu(allMenuItems);
    } catch (e) { console.error(e); }
}

function filterMenu(categoryId, btnElement) {
    // Update active class
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    currentCategory = categoryId;
    if (categoryId === 'All') {
        renderMenu(allMenuItems);
    } else {
        const filtered = allMenuItems.filter(item => item.category_id === categoryId);
        renderMenu(filtered);
    }
}

function renderMenu(items) {
    const grid = document.getElementById('menu-grid');
    grid.innerHTML = items.map(item => `
        <div class="menu-card fade-in" onclick="addToCart(${item.id})">
            <div class="card-img">
                <img src="${item.image_url || getFoodImage(item.name)}" alt="${item.name}" loading="lazy" onerror="this.src='https://placehold.co/300x200?text=${item.name.substr(0, 4)}'">
            </div>
            <div class="card-body">
                <h4 class="card-title">${item.name}</h4>
                <p class="card-desc">${item.description}</p>
                <div class="card-price">₹${item.price.toFixed(2)}</div>
            </div>
        </div>
    `).join('');
}

function addToCart(itemId) {
    const item = allMenuItems.find(i => i.id === itemId);
    const existing = cart.find(i => i.id === itemId);

    if (existing) {
        existing.qty++;
    } else {
        cart.push({ ...item, qty: 1 });
    }
    renderCart();
}

function removeFromCart(itemId) {
    cart = cart.filter(i => i.id !== itemId);
    renderCart();
}

function updateQty(itemId, change) {
    const item = cart.find(i => i.id === itemId);
    if (item) {
        item.qty += change;
        if (item.qty <= 0) removeFromCart(itemId);
        else renderCart();
    }
}

function renderCart() {
    const container = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');

    if (cart.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted); margin-top: 2rem;">No items selected</p>';
        totalEl.innerText = '₹0.00';
        return;
    }

    let total = 0;
    container.innerHTML = cart.map(item => {
        total += item.price * item.qty;
        return `
            <div class="cart-item">
                <div style="flex:1">
                    <div style="font-weight:600">${item.name}</div>
                    <div style="font-size:0.8rem; color: var(--text-muted)">₹${item.price}</div>
                </div>
                <div style="display:flex; align-items:center; gap: 0.5rem;">
                    <button class="qty-btn" onclick="updateQty(${item.id}, -1)">-</button>
                    <span>${item.qty}</span>
                    <button class="qty-btn" onclick="updateQty(${item.id}, 1)">+</button>
                </div>
            </div>
        `;
    }).join('');

    totalEl.innerText = '₹' + total.toFixed(2);
}

async function submitOrder() {
    if (cart.length === 0) return alert('Cart is empty!');
    const tableNum = document.getElementById('table-number').value;
    if (!tableNum) return alert('Please enter table number');

    const orderData = {
        table_number: parseInt(tableNum),
        items: cart.map(i => ({ menu_item_id: i.id, quantity: i.qty, price: i.price }))
    };

    try {
        const res = await api.createOrder(orderData);
        if (res.success) {
            alert('Order sent to kitchen!');
            cart = [];
            renderCart();
        } else {
            alert('Failed to send order');
        }
    } catch (e) { alert('Error sending order'); }
}

// Order Status Modal
async function showOrdersModal() {
    document.getElementById('orders-modal').classList.add('active');
    await loadActiveOrders();
}

function closeOrdersModal() {
    document.getElementById('orders-modal').classList.remove('active');
}

async function loadActiveOrders() {
    try {
        const orders = await api.getOrders();
        // Filter out active
        const active = orders.filter(o => o.status !== 'Paid');

        const list = document.getElementById('active-orders-list');
        if (active.length === 0) {
            list.innerHTML = '<p>No active orders</p>';
            return;
        }

        list.innerHTML = active.map(o => `
            <div style="background: rgba(255,255,255,0.05); padding: 1rem; margin-bottom: 1rem; border-radius: 0.5rem;">
                <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem">
                    <strong>Table ${o.table_number}</strong>
                    <span class="status-badge status-${o.status.toLowerCase()}">${o.status}</span>
                </div>
                <!-- Dropdown to change status -->
                <select onchange="updateStatus(${o.id}, this.value)" style="background: #334155; color: white; border: none; padding: 0.25rem;">
                    <option value="Preparing" ${o.status === 'Preparing' ? 'selected' : ''}>Preparing</option>
                    <option value="Ready" ${o.status === 'Ready' ? 'selected' : ''}>Ready</option>
                    <option value="Served" ${o.status === 'Served' ? 'selected' : ''}>Served</option>
                    <option value="Paid" ${o.status === 'Paid' ? 'selected' : ''}>Paid</option>
                </select>
                <div style="margin-top:0.5rem; font-size: 0.9rem; color: var(--text-muted)">
                   ${o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                </div>
                <div style="margin-top: 0.5rem; text-align: right;">
                    <button class="btn" style="width: auto; padding: 0.3rem 0.6rem; font-size: 0.8rem; background: #475569;" onclick='printBill(${JSON.stringify(o)})'>🖨️ Print Bill</button>
                    <span style="display:inline-block; margin-left:10px; font-weight:bold; color:var(--primary)">₹${(o.total_price * 1.05).toFixed(2)}</span>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">${o.payment_method || ''}</div>
                </div>
            </div>
        `).join('');
    } catch (e) { console.error(e); }
}

async function updateStatus(id, status) {
    await api.updateOrderStatus(id, status);
    loadActiveOrders(); // Refresh
}
