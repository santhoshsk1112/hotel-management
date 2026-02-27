document.addEventListener('DOMContentLoaded', () => {
    loadMenuTable();
    loadCategoriesForModal();
    loadOrderHistory();
});

function showTab(tabName) {
    document.getElementById('tab-menu').style.display = tabName === 'menu' ? 'block' : 'none';
    document.getElementById('tab-orders').style.display = tabName === 'orders' ? 'block' : 'none';
    document.getElementById('tab-payments').style.display = tabName === 'payments' ? 'block' : 'none';

    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    // Highlight active nav item
    const navItems = document.querySelectorAll('.nav-item');
    if (tabName === 'menu') navItems[0].classList.add('active');
    else if (tabName === 'orders') navItems[1].classList.add('active');
    else if (tabName === 'payments') navItems[2].classList.add('active');

    if (tabName === 'payments') {
        loadPaymentStats();
        loadPaymentHistory();
    }
}

async function loadMenuTable() {
    try {
        const items = await api.getMenu();
        const tbody = document.getElementById('menu-table-body');
        tbody.innerHTML = items.map(item => `
            <tr>
                <td>
                    ${item.image_url ? `<img src="${item.image_url}" alt="img" style="width:50px;height:50px;object-fit:cover;border-radius:4px;">` : 'No Image'}
                </td>
                <td>${item.name}</td>
                <td>${item.category_name || '-'}</td>
                <td>₹${item.price.toFixed(2)}</td>
                <td>
                    <button style="color:blue; background:none; border:none; cursor:pointer;" onclick='editItem(${JSON.stringify(item)})'>Edit</button>
                    <button style="color:red; background:none; border:none; cursor:pointer;" onclick="deleteItem(${item.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (e) { console.error(e); }
}

async function loadCategoriesForModal() {
    try {
        const cats = await api.getCategories();
        const addSelect = document.getElementById('add-category');
        const editSelect = document.getElementById('edit-category');
        const options = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        if (addSelect) addSelect.innerHTML = options;
        if (editSelect) editSelect.innerHTML = options;
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
    document.getElementById('add-image-preview').innerHTML = '';
}

// Image Preview for Add Modal
document.getElementById('add-image').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById('add-image-preview').innerHTML = `<img src="${e.target.result}" style="width:100%; border-radius:4px;">`;
        }
        reader.readAsDataURL(file);
    }
});

document.getElementById('add-item-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', document.getElementById('add-name').value);
    formData.append('description', document.getElementById('add-desc').value);
    formData.append('price', document.getElementById('add-price').value);
    formData.append('category_id', document.getElementById('add-category').value);

    const imageFile = document.getElementById('add-image').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }

    await api.addMenuItem(formData);
    closeAddModal();
    loadMenuTable();
    e.target.reset();
});

// Edit Modal Functions
function openEditModal() {
    document.getElementById('edit-modal').classList.add('active');
}
function closeEditModal() {
    document.getElementById('edit-modal').classList.remove('active');
}

function editItem(item) {
    document.getElementById('edit-id').value = item.id;
    document.getElementById('edit-name').value = item.name;
    document.getElementById('edit-desc').value = item.description || '';
    document.getElementById('edit-price').value = item.price;
    document.getElementById('edit-category').value = item.category_id;

    const preview = document.getElementById('current-image-preview');
    if (item.image_url) {
        preview.innerHTML = `<img src="${item.image_url}" style="width:100%; border-radius:4px;">`;
    } else {
        preview.innerHTML = '';
    }

    openEditModal();
}

document.getElementById('edit-item-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const formData = new FormData();
    formData.append('name', document.getElementById('edit-name').value);
    formData.append('description', document.getElementById('edit-desc').value);
    formData.append('price', document.getElementById('edit-price').value);
    formData.append('category_id', document.getElementById('edit-category').value);

    const imageFile = document.getElementById('edit-image').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }

    await api.updateMenuItem(id, formData);
    closeEditModal();
    loadMenuTable();
});

async function loadOrderHistory() {
    try {
        const orders = await api.getOrders();
        const tbody = document.getElementById('orders-table-body');
        tbody.innerHTML = orders.map(o => `
            <tr>
                <td>#${o.id}</td>
                <td>${o.table_number}${o.customer_name ? ` (${o.customer_name})` : ''}</td>
                <td><span class="status-badge status-${o.status.toLowerCase()}">${o.status}</span></td>
                <td>₹${o.total_price ? (o.total_price * 1.05).toFixed(2) : '0.00'} <br> <span style="font-size:0.75rem; color:var(--text-muted)">${o.payment_method || (o.status === 'Paid' ? 'Cash' : '-')}</span></td>
                <td>
                    <button style="background:none; border:none; cursor:pointer;" onclick='printBill(${JSON.stringify(o)})'>🖨️</button>
                    ${new Date(o.created_at).toLocaleDateString()}
                </td>
            </tr>
        `).join('');
    } catch (e) { console.error(e); }
}

// Image Preview for Edit Modal
document.getElementById('edit-image').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById('current-image-preview').innerHTML = `<img src="${e.target.result}" style="width:100%; border-radius:4px;">`;
        }
        reader.readAsDataURL(file);
    }
});
async function loadPaymentStats() {
    try {
        const stats = await api.getPaymentStats();
        document.getElementById('stats-today').innerText = `₹${stats.today.toFixed(2)}`;
        document.getElementById('stats-weekly').innerText = `₹${stats.weekly.toFixed(2)}`;
        document.getElementById('stats-monthly').innerText = `₹${stats.monthly.toFixed(2)}`;
        document.getElementById('stats-yearly').innerText = `₹${stats.yearly.toFixed(2)}`;
    } catch (e) { console.error(e); }
}

async function loadPaymentHistory() {
    try {
        const payments = await api.getPaymentHistory();
        const tbody = document.getElementById('payments-table-body');
        tbody.innerHTML = payments.map(p => `
            <tr>
                <td>#${p.id}</td>
                <td>T-${p.table_number || '-'}</td>
                <td>${p.customer_name || 'Guest'}</td>
                <td style="font-size: 0.75rem; color: #64748b; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${p.items || ''}">${p.items || '-'}</td>
                <td>₹${(p.total_price * 1.05).toFixed(2)}</td>
                <td><span class="status-badge" style="background:#e8f5e9; color:#2e7d32; padding:0.25rem 0.5rem; border-radius:4px; font-size:0.75rem;">${p.payment_method || 'Paid'}</span></td>
                <td>${new Date(p.created_at).toLocaleString()}</td>
            </tr>
        `).join('');
    } catch (e) { console.error(e); }
}
