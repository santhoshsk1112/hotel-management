let cart = [];
let allMenuItems = [];
let currentCategory = 'All';
let editingOrderId = null;
let lastPendingCount = 0;

document.addEventListener('DOMContentLoaded', () => {
    init();
});

async function init() {
    await loadCategories();
    await loadMenu();
    renderCart();
    await loadActiveOrders(true);

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
        status: 'Preparing', // Finalizing the order
        items: cart.map(i => ({ menu_item_id: i.id, quantity: i.qty, price: i.price }))
    };

    try {
        let res;
        if (editingOrderId) {
            res = await api.updateOrder(editingOrderId, orderData);
        } else {
            res = await api.createOrder(orderData);
        }

        if (res.success) {
            alert(editingOrderId ? 'Order finalized!' : 'Order sent to kitchen!');
            cart = [];
            editingOrderId = null;
            document.getElementById('cancel-edit-btn').style.display = 'none';
            const header = document.getElementById('sidebar-cart-header');
            if (header) header.innerText = `New Order`;
            renderCart();
            await loadActiveOrders();
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

function showKitchenModal() {
    document.getElementById('kitchen-modal').classList.add('active');
}

function closeKitchenModal() {
    document.getElementById('kitchen-modal').classList.remove('active');
}

async function loadActiveOrders(isInitial = false) {
    try {
        const orders = await api.getOrders();
        // Filter active vs pending
        const active = orders.filter(o => o.status !== 'Paid' && o.status !== 'Pending');
        const pending = orders.filter(o => o.status === 'Pending');

        // Check for new pending orders to trigger notification and auto-load
        if (pending.length > 0) {
            const latestPending = pending[pending.length - 1];

            // If there's a new pending order (by ID)
            if (latestPending.id > lastPendingCount) {
                if (!isInitial) {
                    playNotificationEffect();
                    showNotification(`New Guest Request from Table ${latestPending.table_number}!`);

                    // AUTO-LOAD: If cart is empty and not currently editing, load it!
                    if (cart.length === 0 && !editingOrderId) {
                        console.log("Auto-loading guest order:", latestPending.id);
                        reviewGuestOrder(latestPending);
                    }
                }
                lastPendingCount = latestPending.id;
            }
        } else {
            lastPendingCount = 0;
        }

        // Update badge
        const badge = document.getElementById('order-count-badge');
        if (badge) badge.innerText = active.length;

        const listSidebar = document.getElementById('active-orders-list-sidebar');
        const listModal = document.getElementById('active-orders-list');
        const draftsList = document.getElementById('guest-drafts-list');

        // Render Drafts
        if (draftsList) {
            if (pending.length === 0) {
                draftsList.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-size: 0.8rem;">No pending guest orders</p>';
            } else {
                draftsList.innerHTML = pending.map(o => `
                    <div style="background: white; padding: 0.8rem; margin-bottom: 0.8rem; border-radius: 0.5rem; border-left: 4px solid var(--primary); box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div style="display:flex; justify-content:space-between; align-items: center; margin-bottom: 0.3rem;">
                            <strong style="color: #1e293b; font-size: 0.85rem;">T-${o.table_number} ${o.customer_name ? `(${o.customer_name})` : ''}</strong>
                            <button class="btn btn-primary" style="width: auto; padding: 0.2rem 0.6rem; font-size: 0.75rem;" onclick='reviewGuestOrder(${JSON.stringify(o)})'>Review</button>
                        </div>
                        <div style="font-size: 0.75rem; color: #64748b; line-height: 1.2;">
                            ${o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                        </div>
                    </div>
                `).join('');
            }
        }

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

async function reviewGuestOrder(order) {
    if (cart.length > 0 && !confirm('The current cart will be replaced. Continue?')) return;

    editingOrderId = order.id;
    document.getElementById('table-number').value = order.table_number;
    document.getElementById('customer-name').value = order.customer_name || '';
    document.getElementById('cancel-edit-btn').style.display = 'block';

    const header = document.getElementById('sidebar-cart-header');
    if (header) header.innerText = `Reviewing T-${order.table_number}`;

    // Map order items to cart format
    cart = order.items.map(item => {
        // Find full item data from allMenuItems for price/description
        const fullItem = allMenuItems.find(i => i.id === item.menu_item_id);
        return {
            ...fullItem,
            qty: item.quantity,
            price: item.price // Use price from order record
        };
    });

    renderCart();
}

function cancelEditing() {
    editingOrderId = null;
    cart = [];
    document.getElementById('table-number').value = 1;
    document.getElementById('customer-name').value = '';
    document.getElementById('cancel-edit-btn').style.display = 'none';

    const header = document.getElementById('sidebar-cart-header');
    if (header) header.innerText = `New Order`;

    renderCart();
}

async function updateStatus(id, status) {
    await api.updateOrderStatus(id, status);
    loadActiveOrders(); // Refresh
}

function playNotificationEffect() {
    const sound = document.getElementById('notification-sound');
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(e => console.log("Audio play blocked: ", e));
    }
}

function showNotification(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.style.cssText = `
        background: var(--primary);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        margin-bottom: 0.5rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease-out;
        display: flex;
        justify-content: space-between;
        align-items: center;
        min-width: 250px;
    `;

    toast.innerHTML = `
        <span>🔔 ${message}</span>
        <button onclick="this.parentElement.remove()" style="background:none; border:none; color:white; cursor:pointer; margin-left:1rem;">✕</button>
    `;

    container.appendChild(toast);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'fadeOut 0.3s ease-in forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);
}

// Add these animations to the document if not present
if (!document.getElementById('notification-styles')) {
    const styleLine = document.createElement('style');
    styleLine.id = 'notification-styles';
    styleLine.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    `;
    document.head.appendChild(styleLine);
}
