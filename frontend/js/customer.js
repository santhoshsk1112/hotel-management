let cart = [];
let allMenuItems = [];
let currentCategory = 'All';
let tableNumber = null;
let customerName = null;

// Check if table number and name exists in session
const savedTable = sessionStorage.getItem('tableNumber');
const savedName = sessionStorage.getItem('customerName');
if (savedTable) {
    startOrdering(savedTable, savedName);
}

async function startOrdering(savedTable = null, savedName = null) {
    if (savedTable) {
        tableNumber = savedTable;
        customerName = savedName;
    } else {
        const input = document.getElementById('guest-table-num').value;
        const nameInput = document.getElementById('guest-name').value;
        if (!input || input < 1) return alert('Please enter a valid table number');
        tableNumber = input;
        customerName = nameInput;
        sessionStorage.setItem('tableNumber', tableNumber);
        sessionStorage.setItem('customerName', customerName);
    }

    document.getElementById('table-entry-overlay').style.display = 'none';
    document.getElementById('main-interface').style.display = 'block';
    document.getElementById('display-table-num').innerText = tableNumber;

    await loadCategories();
    await loadMenu();
}

async function loadCategories() {
    try {
        const categories = await api.getCategories();
        const container = document.getElementById('category-scroll');
        container.innerHTML = `<button class="category-pill active" onclick="filterMenu('All', this)">All</button>`;
        categories.forEach(cat => {
            container.innerHTML += `<button class="category-pill" onclick="filterMenu(${cat.id}, this)">${cat.name}</button>`;
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
    document.querySelectorAll('.category-pill').forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    currentCategory = categoryId;
    const items = categoryId === 'All' ? allMenuItems : allMenuItems.filter(i => i.category_id === categoryId);
    renderMenu(items);
}

function renderMenu(items) {
    const grid = document.getElementById('menu-grid');
    grid.innerHTML = items.map(item => `
        <div class="menu-card fade-in" onclick="addToCart(${item.id})">
            <div class="card-img">
                <img src="${item.image_url || getFoodImage(item.name)}" alt="${item.name}" loading="lazy" onerror="this.src='https://placehold.co/300x200?text=${item.name.substr(0, 4)}'">
            </div>
            <div class="card-body">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <h4 class="card-title" style="font-size: 0.95rem; margin-bottom: 0;">${item.name}</h4>
                    <div class="card-price" style="font-size: 0.9rem;">₹${item.price}</div>
                </div>
                <p class="card-desc" style="font-size: 0.75rem; margin-top: 0.25rem;">${item.description}</p>
                <button class="btn btn-primary" style="margin-top: 0.5rem; padding: 0.4rem; font-size: 0.8rem;">Add</button>
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
    updateCartUI();
    // Vibrate on mobile for feedback
    if (navigator.vibrate) navigator.vibrate(50);
}

function updateCartUI() {
    const floatBtn = document.getElementById('sticky-cart');

    if (cart.length > 0) {
        floatBtn.style.display = 'flex';
        const count = cart.reduce((sum, i) => sum + i.qty, 0);
        const total = cart.reduce((sum, i) => sum + (i.qty * i.price), 0);

        document.getElementById('cart-count').innerText = count;
        document.getElementById('cart-float-total').innerText = '₹' + total.toFixed(2);
        document.getElementById('cart-modal-total').innerText = '₹' + total.toFixed(2);
    } else {
        floatBtn.style.display = 'none';
    }
    renderCartList();
}

function renderCartList() {
    const list = document.getElementById('cart-items-list');
    if (cart.length === 0) list.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Your cart is empty</p>';
    else {
        list.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div style="flex:1">
                    <div style="font-weight:600">${item.name}</div>
                    <div style="font-size:0.8rem; color: var(--text-muted)">₹${item.price}</div>
                </div>
                <div style="display:flex; align-items:center; gap: 0.8rem;">
                    <button class="qty-btn" onclick="updateQty(${item.id}, -1)">-</button>
                    <span style="font-weight: 600;">${item.qty}</span>
                    <button class="qty-btn" onclick="updateQty(${item.id}, 1)">+</button>
                </div>
            </div>
        `).join('');
    }
}

function updateQty(itemId, change) {
    const item = cart.find(i => i.id === itemId);
    if (item) {
        item.qty += change;
        if (item.qty <= 0) cart = cart.filter(i => i.id !== itemId);
        updateCartUI();
    }
}

// Modals
function openCartModal() {
    document.getElementById('cart-modal').classList.add('active');
}
function closeCartModal() {
    document.getElementById('cart-modal').classList.remove('active');
}

async function placeCustomerOrder() {
    if (cart.length === 0) return;

    const orderData = {
        table_number: parseInt(tableNumber),
        customer_name: customerName,
        items: cart.map(i => ({ menu_item_id: i.id, quantity: i.qty, price: i.price }))
    };

    try {
        const res = await api.createOrder(orderData);
        if (res.success) {
            alert('Order Placed Successfully! 🥘');
            cart = [];
            updateCartUI();
            closeCartModal();
            viewMyOrders(); // Show status
        } else {
            alert('Failed to place order');
        }
    } catch (e) { alert('Error comparing order'); }
}

async function viewMyOrders() {
    document.getElementById('status-modal').classList.add('active');
    document.getElementById('status-table-num').innerText = tableNumber;

    try {
        const allOrders = await api.getOrders();
        // Filter primarily by Table Number (Simple client-side logic)
        const myOrders = allOrders.filter(o => o.table_number == tableNumber && o.status !== 'Paid');

        const list = document.getElementById('my-orders-list');
        if (myOrders.length === 0) {
            list.innerHTML = '<p style="text-align: center; margin-top: 2rem;">No active orders for this table.</p>';
            return;
        }

        list.innerHTML = myOrders.map(o => `
            <div style="background: rgba(255,255,255,0.05); padding: 1rem; margin-bottom: 1rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1);">
                <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem">
                    <span style="color: var(--text-muted); font-size: 0.8rem;">Order #${o.id}</span>
                    <span class="status-badge status-${o.status.toLowerCase()}">${o.status}</span>
                </div>
                <div style="font-size: 0.95rem; margin-bottom: 0.5rem;">
                   ${o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                </div>
                <div style="text-align: right; font-weight: 700; color: var(--primary);">Total: ₹${o.total_price.toFixed(2)}</div>
            </div>
        `).join('');

    } catch (e) { console.error(e); }
}

function closeStatusModal() {
    document.getElementById('status-modal').classList.remove('active');
}

// --- Payment Logic ---
let activePaymentOrder = null;
let selectedMethod = null;

function openPaymentModal(order) {
    activePaymentOrder = order;
    document.getElementById('pay-order-id').innerText = order.id;

    const subtotal = order.total_price;
    const gst = subtotal * 0.05;
    const total = subtotal + gst;

    document.getElementById('pay-amount').innerText = '₹' + subtotal.toFixed(2);
    document.getElementById('pay-gst').innerText = '₹' + gst.toFixed(2);
    document.getElementById('pay-total').innerText = '₹' + total.toFixed(2);

    // Reset modal state
    selectedMethod = null;
    document.getElementById('qr-container').style.display = 'none';
    document.getElementById('confirm-pay-btn').disabled = true;
    document.querySelectorAll('.pay-method-btn').forEach(b => b.classList.remove('active'));

    document.getElementById('payment-modal').classList.add('active');
}

function closePaymentModal() {
    document.getElementById('payment-modal').classList.remove('active');
}

function selectPaymentMethod(method) {
    selectedMethod = method;
    document.querySelectorAll('.pay-method-btn').forEach(btn => {
        if (btn.innerText.includes(method)) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    document.getElementById('selected-method-name').innerText = method;

    // Update QR code data with amount
    const total = (activePaymentOrder.total_price * 1.05).toFixed(2);
    const upiLink = `upi://pay?pa=7299131336@ybl&pn=TNDelights&am=${total}&cu=INR`;
    document.getElementById('payment-qr').src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiLink)}`;

    document.getElementById('qr-container').style.display = 'block';
    document.getElementById('confirm-pay-btn').disabled = false;
}

async function confirmPayment() {
    if (!activePaymentOrder || !selectedMethod) return;

    try {
        const res = await api.updateOrderStatus(activePaymentOrder.id, 'Paid', selectedMethod);
        if (res.success) {
            alert(`Payment of ₹${(activePaymentOrder.total_price * 1.05).toFixed(2)} received via ${selectedMethod}!`);
            closePaymentModal();
            viewMyOrders(); // Refresh status
        } else {
            alert('Payment failed');
        }
    } catch (e) {
        alert('Error processing payment');
    }
}

// Update viewMyOrders to include "Pay Now" for Served orders
const originalViewMyOrders = viewMyOrders;
viewMyOrders = async function () {
    await originalViewMyOrders();
    // After original renders, we can potentially modify but it's cleaner to rewrite the map part
    // Let's just update the list injection logic
}

async function viewMyOrders() {
    document.getElementById('status-modal').classList.add('active');
    document.getElementById('status-table-num').innerText = tableNumber;

    try {
        const allOrders = await api.getOrders();
        const myOrders = allOrders.filter(o => o.table_number == tableNumber && o.status !== 'Paid');

        const list = document.getElementById('my-orders-list');
        if (myOrders.length === 0) {
            list.innerHTML = '<p style="text-align: center; margin-top: 2rem;">No active orders for this table.</p>';
            return;
        }

        list.innerHTML = myOrders.map(o => `
            <div style="background: rgba(255,255,255,0.05); padding: 1rem; margin-bottom: 1rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1);">
                <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem">
                    <span style="color: var(--text-muted); font-size: 0.8rem;">Order #${o.id}</span>
                    <span class="status-badge status-${o.status.toLowerCase()}">${o.status}</span>
                </div>
                <div style="font-size: 0.95rem; margin-bottom: 0.5rem;">
                   ${o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight: 700; color: var(--primary);">Total: ₹${(o.total_price * 1.05).toFixed(2)} (inc. GST)</span>
                    ${o.status === 'Served' ? `<button class="btn btn-primary" style="width: auto; padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick='openPaymentModal(${JSON.stringify(o)})'>Pay Now</button>` : ''}
                </div>
            </div>
        `).join('');

    } catch (e) { console.error(e); }
}
