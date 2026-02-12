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

    addMenuItem: async (item) => {
        const res = await fetch(`${API_URL}/menu`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        });
        return res.json();
    },

    deleteMenuItem: async (id) => {
        const res = await fetch(`${API_URL}/menu/${id}`, { method: 'DELETE' });
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

    updateOrderStatus: async (id, status) => {
        const res = await fetch(`${API_URL}/orders/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        return res.json();
    }
};
