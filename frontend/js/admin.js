document.addEventListener('DOMContentLoaded', () => {
    loadMenuTable();
    loadCategoriesForModal();
    loadOrderHistory();
});

function showTab(tabName) {
    document.getElementById('tab-menu').style.display = tabName === 'menu' ? 'block' : 'none';
    document.getElementById('tab-orders').style.display = tabName === 'orders' ? 'block' : 'none';

    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    // Simple logic to highlight active, relies on order or text match in real apps, here just simple toggle
}

async function loadMenuTable() {
    try {
        const items = await api.getMenu();
        const tbody = document.getElementById('menu-table-body');
        tbody.innerHTML = items.map(item => `
            <tr>
                <td>${item.name}</td>
                <td>${item.category_name || '-'}</td>
                <td>₹${item.price.toFixed(2)}</td>
                <td>
                    <button style="color:red; background:none; border:none; cursor:pointer;" onclick="deleteItem(${item.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (e) { console.error(e); }
}

async function loadCategoriesForModal() {
    try {
        const cats = await api.getCategories();
        const select = document.getElementById('add-category');
        select.innerHTML = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    } catch (e) { console.error(e); }
}

async function deleteItem(id) {
    if (confirm('Are you sure?')) {
        await api.deleteMenuItem(id);
        loadMenuTable();
    }
}

// Modal
function openAddModal() {
    document.getElementById('add-modal').classList.add('active');
}
function closeAddModal() {
    document.getElementById('add-modal').classList.remove('active');
}

document.getElementById('add-item-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const item = {
        name: document.getElementById('add-name').value,
        description: document.getElementById('add-desc').value,
        price: parseFloat(document.getElementById('add-price').value),
        category_id: document.getElementById('add-category').value
    };

    await api.addMenuItem(item);
    closeAddModal();
    loadMenuTable();
    e.target.reset(); // clear form
});

async function loadOrderHistory() {
    try {
        const orders = await api.getOrders();
        const tbody = document.getElementById('orders-table-body');
        tbody.innerHTML = orders.map(o => `
            <tr>
                <td>#${o.id}</td>
                <td>${o.table_number}</td>
                <td><span class="status-badge status-${o.status.toLowerCase()}">${o.status}</span></td>
                <td>₹${o.total_price ? o.total_price.toFixed(2) : '0.00'}</td>
                <td>
                    <button style="background:none; border:none; cursor:pointer;" onclick='printBill(${JSON.stringify(o)})'>🖨️</button>
                    ${new Date(o.created_at).toLocaleDateString()}
                </td>
            </tr>
        `).join('');
    } catch (e) { console.error(e); }
}
