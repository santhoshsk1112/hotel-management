function printBill(order) {
    // 1. Create a hidden iframe or new window
    const printWindow = window.open('', '', 'height=600,width=800');

    // 2. Calculate totals
    const subtotal = order.total_price;
    const gst = subtotal * 0.05; // 5% GST
    const total = subtotal + gst;
    const date = new Date(order.created_at).toLocaleString();

    // 3. Generate HTML content
    const html = `
        <html>
        <head>
            <title>Bill - Table ${order.table_number}</title>
            <style>
                body { font-family: 'Courier New', monospace; padding: 20px; max-width: 400px; margin: 0 auto; }
                .restaurant-name { text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 5px; }
                .restaurant-info { text-align: center; font-size: 12px; margin-bottom: 20px; border-bottom: 2px dashed #000; padding-bottom: 10px; }
                .bill-details { margin-bottom: 15px; font-size: 14px; }
                .bill-table { width: 100%; border-collapse: collapse; font-size: 14px; }
                .bill-table th { text-align: left; border-bottom: 1px solid #000; }
                .bill-table td { padding: 5px 0; }
                .text-right { text-align: right; }
                .divider { border-top: 1px dashed #000; margin: 10px 0; }
                .total-row { font-weight: bold; font-size: 16px; margin-top: 10px; }
                .no-print { display: none; }
                @media print {
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="restaurant-name">TN Delights</div>
            <div class="restaurant-info">
                123, South Street, Chennai, TN<br>
                Ph: +91 98765 43210
            </div>
            
            <div class="bill-details">
                <div><strong>Order ID:</strong> #${order.id}</div>
                <div><strong>Table:</strong> ${order.table_number}</div>
                <div><strong>Date:</strong> ${date}</div>
            </div>

            <table class="bill-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th class="text-right">Qty</th>
                        <th class="text-right">Price</th>
                        <th class="text-right">Amt</th>
                    </tr>
                </thead>
                <tbody>
                    ${order.items.map(item => `
                    <tr>
                        <td>${item.name}</td>
                        <td class="text-right">${item.quantity}</td>
                        <td class="text-right">${item.price}</td>
                        <td class="text-right">${(item.quantity * item.price).toFixed(2)}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="divider"></div>
            
            <div style="display: flex; justify-content: space-between;">
                <span>Subtotal</span>
                <span>₹${subtotal.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span>GST (5%)</span>
                <span>₹${gst.toFixed(2)}</span>
            </div>
            
            <div class="divider"></div>
            
            <div class="total-row" style="display: flex; justify-content: space-between;">
                <span>Grand Total</span>
                <span>₹${total.toFixed(2)}</span>
            </div>

            <div style="text-align: center; margin-top: 30px; font-size: 12px;">
                Thank you! Visit Again.
            </div>

            <script>
                window.onload = function() { window.print(); window.close(); }
            </script>
        </body>
        </html>
    `;

    // 4. Write to window and print
    printWindow.document.write(html);
    printWindow.document.close();
}
