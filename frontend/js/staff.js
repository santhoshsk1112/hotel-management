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
    await loadActiveOrders();

    // Auto-refresh active orders every 5 seconds
    setInterval(loadActiveOrders, 5000);
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
    const customerName = document.getElementById('customer-name').value;
    if (!tableNum) return alert('Please enter table number');

    const orderData = {
        table_number: parseInt(tableNum),
        customer_name: customerName,
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

        // Update badge
        const badge = document.getElementById('order-count-badge');
        if (badge) badge.innerText = active.length;

        const listSidebar = document.getElementById('active-orders-list-sidebar');
        const listModal = document.getElementById('active-orders-list');

        if (active.length === 0) {
            const noOrdersHtml = '<p style="text-align: center; color: var(--text-muted); margin-top: 2rem;">No active orders</p>';
            if (listSidebar) listSidebar.innerHTML = noOrdersHtml;
            if (listModal) listModal.innerHTML = noOrdersHtml;
            return;
        }

        const ordersHtml = active.map(o => `
            <div style="background: rgba(255,255,255,0.08); padding: 0.8rem; margin-bottom: 0.8rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.05);">
                <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem; align-items: center;">
                    <strong style="font-size: 0.9rem;">T-${o.table_number}${o.customer_name ? ` (${o.customer_name})` : ''}</strong>
                    <span class="status-badge status-${o.status.toLowerCase()}" style="font-size: 0.7rem; padding: 0.1rem 0.4rem;">${o.status}</span>
                </div>
                
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <select onchange="updateStatus(${o.id}, this.value)" style="background: #1e293b; color: white; border: 1px solid rgba(255,255,255,0.1); padding: 0.2rem; font-size: 0.8rem; border-radius: 0.3rem; flex: 1;">
                        <option value="Preparing" ${o.status === 'Preparing' ? 'selected' : ''}>Preparing</option>
                        <option value="Ready" ${o.status === 'Ready' ? 'selected' : ''}>Ready</option>
                        <option value="Served" ${o.status === 'Served' ? 'selected' : ''}>Served</option>
                        <option value="Paid" ${o.status === 'Paid' ? 'selected' : ''}>Paid</option>
                    </select>
                    <button class="btn" style="width: auto; padding: 0.2rem 0.5rem; font-size: 0.7rem; background: #334155; border: 1px solid rgba(255,255,255,0.1);" onclick='printBill(${JSON.stringify(o)})'>🖨️</button>
                </div>

                <div style="margin-top:0.4rem; font-size: 0.8rem; color: var(--text-muted); line-height: 1.2;">
                   ${o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                </div>
                
                <div style="margin-top: 0.4rem; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 0.7rem; color: var(--text-muted);">${o.payment_method || ''}</span>
                    <span style="font-weight:bold; color:var(--primary); font-size: 0.9rem;">₹${(o.total_price * 1.05).toFixed(2)}</span>
                </div>
            </div>
        `).join('');

        if (listSidebar) listSidebar.innerHTML = ordersHtml;
        if (listModal) listModal.innerHTML = ordersHtml;
    } catch (e) { console.error(e); }
}

async function updateStatus(id, status) {
    await api.updateOrderStatus(id, status);
    loadActiveOrders(); // Refresh
}
