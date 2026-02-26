let lastKnownOrderId = 0;
let isFirstLoad = true;

document.addEventListener('DOMContentLoaded', () => {
    init();
});

async function init() {
    await loadKitchenOrders();

    // Auto-refresh every 5 seconds
    setInterval(loadKitchenOrders, 5000);
}

async function loadKitchenOrders() {
    const indicator = document.getElementById('refresh-indicator');
    if (indicator) indicator.innerText = 'Syncing...';

    try {
        const orders = await api.getOrders();
        // Kitchen only cares about orders to be prepared or ready (to see what's out)
        // Usually, kitchen focus is "Preparing"
        const kitchenOrders = orders.filter(o => o.status === 'Preparing');

        updateOrderCount(kitchenOrders.length);

        // Detect new orders for notification
        if (kitchenOrders.length > 0) {
            const maxId = Math.max(...kitchenOrders.map(o => o.id));
            if (!isFirstLoad && maxId > lastKnownOrderId) {
                playKitchenSound();
            }
            lastKnownOrderId = maxId;
        }
        isFirstLoad = false;

        renderKitchenGrid(kitchenOrders);
        if (indicator) indicator.innerText = 'Connected';

    } catch (e) {
        console.error("Kitchen fetch error:", e);
        if (indicator) indicator.innerText = 'Connection Error';
    }
}

function updateOrderCount(count) {
    const badge = document.getElementById('kitchen-order-count');
    if (badge) badge.innerText = `${count} Order${count !== 1 ? 's' : ''}`;
}

function renderKitchenGrid(orders) {
    const grid = document.getElementById('kitchen-grid');
    if (orders.length === 0) {
        grid.innerHTML = `
            <div class="no-orders text-center">
                <h1 style="font-size: 5rem; opacity: 0.1; margin-top: 5rem;">SAFE</h1>
                <p style="color: var(--text-muted); font-size: 1.2rem;">All orders are cleared. Good job!</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = orders.map(order => {
        const timeElapsed = getTimeElapsed(order.created_at);
        return `
            <div class="order-card" id="order-${order.id}">
                <div class="order-header">
                    <span class="table-badge">TABLE ${order.table_number}</span>
                    <span class="time-badge">#${order.id} • ${timeElapsed}</span>
                </div>
                
                <div style="font-weight: 600; color: #94a3b8; font-size: 0.9rem;">
                    ${order.customer_name || 'Guest'}
                </div>

                <ul class="item-list">
                    ${order.items.map(item => `
                        <li class="order-item">
                            <span><span class="item-qty">${item.quantity}x</span>${item.name}</span>
                        </li>
                    `).join('')}
                </ul>

                <button class="ready-btn" onclick="markReady(${order.id})">
                    Mark as Ready
                </button>
            </div>
        `;
    }).join('');
}

async function markReady(orderId) {
    try {
        const card = document.getElementById(`order-${orderId}`);
        if (card) card.style.opacity = '0.5';

        const res = await api.updateOrderStatus(orderId, 'Ready');
        if (res.success) {
            await loadKitchenOrders(); // Immediate refresh
        }
    } catch (e) {
        alert("Error updating order status");
    }
}

function getTimeElapsed(timestamp) {
    const start = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - start) / 1000); // seconds

    if (diff < 60) return `${diff}s ago`;
    const mins = Math.floor(diff / 60);
    return `${mins}m ago`;
}

function playKitchenSound() {
    const sound = document.getElementById('notification-sound');
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(e => console.log("Sound error:", e));
    }
}
