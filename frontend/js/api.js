const API_URL = '/api';

const api = {
    login: async (username, password) => {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        return res.json();
    },

    getMenu: async () => {
        const res = await fetch(`${API_URL}/menu`);
        return res.json();
    },

    getCategories: async () => {
        const res = await fetch(`${API_URL}/categories`);
        return res.json();
    },

    addMenuItem: async (itemData) => {
        // itemData should be FormData object
        const res = await fetch(`${API_URL}/menu`, {
            method: 'POST',
            body: itemData // No Content-Type header needed for FormData
        });
        return res.json();
    },

    deleteMenuItem: async (id) => {
        const res = await fetch(`${API_URL}/menu/${id}`, { method: 'DELETE' });
        return res.json();
    },

    updateMenuItem: async (id, itemData) => {
        const res = await fetch(`${API_URL}/menu/${id}`, {
            method: 'PUT',
            body: itemData
        });
        return res.json();
    },

    createOrder: async (order) => {
        const res = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
        });
        return res.json();
    },

    getOrders: async () => {
        const res = await fetch(`${API_URL}/orders`);
        return res.json();
    },

    updateOrder: async (id, order) => {
        const res = await fetch(`${API_URL}/orders/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
        });
        return res.json();
    },

    updateOrderStatus: async (id, status, payment_method) => {
        const res = await fetch(`${API_URL}/orders/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, payment_method })
        });
        return res.json();
    }
};
