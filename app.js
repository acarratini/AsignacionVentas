// App State
let state = {
    events: [], // Array of all events (active and closed)
    activeEventId: null
};

// Temp image memory for creation/edition
let tempBgImage = null;
let tempEditBgImage = null;

// Pastelitos Preset Config
const PASTELITOS_PRODUCTS = [
    { id: '1d_batata', name: '1 Docena - Batata', defaultPrice: 4000 },
    { id: '1d_membrillo', name: '1 Docena - Membrillo', defaultPrice: 4000 },
    { id: '1/2d_batata', name: 'Media Docena - Batata', defaultPrice: 2500 },
    { id: '1/2d_membrillo', name: 'Media Docena - Membrillo', defaultPrice: 2500 }
];

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    setupEventListeners();
    renderApp();
});

// Load state from LocalStorage
function loadState() {
    const savedState = localStorage.getItem('event_sales_state');
    if (savedState) {
        try {
            state = JSON.parse(savedState);
        } catch (e) {
            console.error('Error parsing saved state', e);
        }
    }
    
    // Ensure structure
    if (!state.events) state.events = [];
    
    // Find active event if any
    const activeEvent = state.events.find(e => e.status === 'active');
    state.activeEventId = activeEvent ? activeEvent.id : null;
}

// Save state to LocalStorage
function saveState() {
    localStorage.setItem('event_sales_state', JSON.stringify(state));
}

// Setup Event Listeners
function setupEventListeners() {
    // Navigation tabs
    document.querySelectorAll('.bottom-nav .nav-item').forEach(button => {
        button.addEventListener('click', (e) => {
            const view = e.currentTarget.getAttribute('onclick').match(/'([^']+)'/)[1];
            switchView(view);
        });
    });

    // Preset select listener to toggle price fields or custom list
    document.getElementById('event-preset-select').addEventListener('change', (e) => {
        togglePresetFields(e.target.value);
    });

    // Add custom product row
    document.getElementById('btn-add-custom-product').addEventListener('click', () => {
        addCustomProductRow();
    });

    // Create Event Form Submit
    document.getElementById('event-form').addEventListener('submit', (e) => {
        e.preventDefault();
        createEvent();
    });

    // Close Event Button
    document.getElementById('btn-close-event').addEventListener('click', () => {
        if (confirm('¿Estás seguro de que deseas cerrar este evento? Una vez cerrado, no se podrán realizar más ventas en él.')) {
            closeActiveEvent();
        }
    });

    // Sales Form Product Change (updates price automatically)
    document.getElementById('sale-product').addEventListener('change', (e) => {
        updateSalesFormPrice();
    });

    // Sales Form Submit
    document.getElementById('sales-form').addEventListener('submit', (e) => {
        e.preventDefault();
        registerSale();
    });

    // Delete Last Sale Button
    document.getElementById('btn-delete-last').addEventListener('click', () => {
        if (confirm('¿Deseas eliminar la última venta registrada?')) {
            deleteLastSale();
        }
    });

    // Share Last Ticket by WhatsApp
    document.getElementById('btn-share-whatsapp').addEventListener('click', () => {
        shareLastTicketWhatsApp();
    });

    // Excel Export Button
    document.getElementById('btn-export-excel').addEventListener('click', () => {
        exportToExcel();
    });

    // Search/Filter
    document.getElementById('search-filter').addEventListener('input', () => {
        renderSalesTable();
    });

    // Handle background image upload on creation
    document.getElementById('event-image').addEventListener('change', (e) => {
        processImageInput(e.target, (base64) => {
            tempBgImage = base64;
        });
    });

    // Handle background image upload on edition
    document.getElementById('edit-event-image').addEventListener('change', (e) => {
        processImageInput(e.target, (base64) => {
            tempEditBgImage = base64;
        });
    });

    // Download Flyer Button
    document.getElementById('btn-download-flyer').addEventListener('click', () => {
        downloadFlyer();
    });

    // Open Edit Event Modal
    document.getElementById('btn-edit-event').addEventListener('click', () => {
        openEditEventModal();
    });

    // Save Edit Event Submit
    document.getElementById('edit-event-form').addEventListener('submit', (e) => {
        e.preventDefault();
        saveEditedEvent();
    });

    // Save Edit Sale Submit
    document.getElementById('edit-sale-form').addEventListener('submit', (e) => {
        e.preventDefault();
        saveEditedSale();
    });

    // Update price in edit sale modal when product changes
    document.getElementById('edit-sale-product').addEventListener('change', () => {
        updateEditSalePrice();
    });
}

// Switch between views
function switchView(viewId) {
    document.querySelectorAll('.view-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => {
        btn.classList.remove('active');
    });

    const activePanel = document.getElementById(`view-${viewId}`);
    if (activePanel) {
        activePanel.classList.add('active');
    }

    // Set correct active tab style
    const navItems = Array.from(document.querySelectorAll('.bottom-nav .nav-item'));
    const matchedBtn = navItems.find(btn => btn.getAttribute('onclick').includes(viewId));
    if (matchedBtn) {
        matchedBtn.classList.add('active');
    }

    renderApp();
}

// Toggle display of Preset input options
function togglePresetFields(presetValue) {
    const customContainer = document.getElementById('custom-products-container');
    const customList = document.getElementById('custom-products-list');
    
    if (presetValue === 'custom') {
        customContainer.style.display = 'block';
        if (customList.children.length === 0) {
            addCustomProductRow(); // at least one row
        }
    } else {
        customContainer.style.display = 'none';
    }
}

// Add row for custom products definition
function addCustomProductRow(name = '', price = '') {
    const container = document.getElementById('custom-products-list');
    const row = document.createElement('div');
    row.className = 'row-2';
    row.style.marginBottom = '8px';
    row.innerHTML = `
        <input type="text" class="custom-prod-name form-control" placeholder="Nombre (Ej: Docena Empanadas)" value="${name}" required>
        <div style="display: flex; gap: 8px;">
            <input type="number" class="custom-prod-price form-control" placeholder="Precio ($)" value="${price}" required min="0">
            <button type="button" class="btn btn-danger" onclick="this.parentElement.parentElement.remove()" style="padding: 10px; width: auto;">✕</button>
        </div>
    `;
    container.appendChild(row);
}

// Create Event Lógica
function createEvent() {
    const name = document.getElementById('event-name').value.trim();
    const preset = document.getElementById('event-preset-select').value;
    let products = [];

    if (preset === 'pastelitos') {
        products = PASTELITOS_PRODUCTS.map(p => ({
            id: p.id,
            name: p.name,
            price: p.defaultPrice
        }));
    } else {
        const rows = document.querySelectorAll('#custom-products-list .row-2');
        rows.forEach((row, index) => {
            const prodName = row.querySelector('.custom-prod-name').value.trim();
            const prodPrice = parseFloat(row.querySelector('.custom-prod-price').value);
            if (prodName && !isNaN(prodPrice)) {
                products.push({
                    id: `custom_${Date.now()}_${index}`,
                    name: prodName,
                    price: prodPrice
                });
            }
        });
    }

    if (products.length === 0) {
        alert('Debes ingresar al menos un producto.');
        return;
    }

    // Deactivate current active event if any (shouldn't be possible but let's be safe)
    state.events.forEach(e => {
        if (e.status === 'active') e.status = 'closed';
    });

    const newEvent = {
        id: 'event_' + Date.now(),
        name: name,
        date: new Date().toLocaleDateString('es-AR'),
        status: 'active',
        products: products,
        bgImage: tempBgImage, // Save the uploaded background image
        sales: []
    };

    state.events.push(newEvent);
    state.activeEventId = newEvent.id;
    saveState();

    // Reset form and temp state
    document.getElementById('event-form').reset();
    tempBgImage = null;
    document.getElementById('custom-products-list').innerHTML = '';
    document.getElementById('custom-products-container').style.display = 'none';

    alert('¡Evento creado exitosamente!');
    switchView('vender');
}

// Close Active Event
function closeActiveEvent() {
    const activeEvent = state.events.find(e => e.id === state.activeEventId);
    if (activeEvent) {
        activeEvent.status = 'closed';
        state.activeEventId = null;
        saveState();
        alert('Evento cerrado. Ya no se pueden realizar cargas en este evento.');
        renderApp();
    }
}

// Update Sales Form Dropdown based on active event products
function updateSalesProductsDropdown() {
    const activeEvent = state.events.find(e => e.id === state.activeEventId);
    const select = document.getElementById('sale-product');
    
    // Clear first
    select.innerHTML = '';

    if (activeEvent) {
        activeEvent.products.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = `${p.name} - $${p.price}`;
            select.appendChild(option);
        });
        updateSalesFormPrice();
    }
}

// Update the price field based on selected product
function updateSalesFormPrice() {
    const activeEvent = state.events.find(e => e.id === state.activeEventId);
    const select = document.getElementById('sale-product');
    const priceInput = document.getElementById('sale-price');
    const paidInput = document.getElementById('sale-paid');

    if (activeEvent && select.value) {
        const product = activeEvent.products.find(p => p.id === select.value);
        if (product) {
            priceInput.value = product.price;
            // Default "Abonado" to empty (which implies 0 in placeholder, but user can change it)
            // By default let's leave it blank or default to 0 as in requirement "en principio no se abona"
            paidInput.placeholder = `Ej: ${product.price} (opcional)`;
        }
    }
}

// Register Sale
function registerSale() {
    const activeEvent = state.events.find(e => e.id === state.activeEventId);
    if (!activeEvent) {
        alert('No hay un evento activo para realizar la venta.');
        return;
    }

    const productId = document.getElementById('sale-product').value;
    const buyer = document.getElementById('sale-buyer').value.trim() || 'No especificado';
    const seller = document.getElementById('sale-seller').value.trim() || 'No especificado';
    const price = parseFloat(document.getElementById('sale-price').value);
    
    let paidVal = document.getElementById('sale-paid').value;
    const paid = paidVal === '' ? 0 : parseFloat(paidVal);

    if (isNaN(paid) || paid < 0) {
        alert('Por favor ingresa un monto abonado válido.');
        return;
    }

    const product = activeEvent.products.find(p => p.id === productId);
    
    // Correlative number assignment (starts from 1 per event)
    const lastNum = activeEvent.sales.reduce((max, s) => s.number > max ? s.number : max, 0);
    const newNum = lastNum + 1;

    const newSale = {
        number: newNum,
        productId: productId,
        productName: product ? product.name : 'Producto Desconocido',
        buyer: buyer,
        seller: seller,
        price: price,
        paid: paid,
        date: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    };

    activeEvent.sales.push(newSale);
    saveState();

    // Reset Form fields except Seller (to make repeated loads easier for the seller)
    document.getElementById('sale-buyer').value = '';
    document.getElementById('sale-paid').value = '';
    
    // Render the generated ticket
    renderLastTicket(newSale, activeEvent.name);
    
    // Refresh tables and stats
    renderSalesTable();
    renderStats();
}

// Render Last Ticket Card
function renderLastTicket(sale, eventName) {
    const container = document.getElementById('last-ticket-container');
    const activeEvent = state.events.find(e => e.id === state.activeEventId);
    if (!activeEvent) return;

    // Draw the flyer to the canvas
    drawFlyerCanvas(sale, activeEvent);

    container.style.display = 'block';
    
    // Save last sale to the element data-attribute
    container.dataset.lastSale = JSON.stringify(sale);
}

// Delete Last Registered Sale
function deleteLastSale() {
    const activeEvent = state.events.find(e => e.id === state.activeEventId);
    if (activeEvent && activeEvent.sales.length > 0) {
        activeEvent.sales.pop();
        saveState();
        
        // Hide ticket preview
        document.getElementById('last-ticket-container').style.display = 'none';
        
        alert('Última venta eliminada.');
        renderApp();
    }
}

// Share via WhatsApp (Supports native Web Share of the canvas flyer image where compatible)
function shareLastTicketWhatsApp() {
    const container = document.getElementById('last-ticket-container');
    const activeEvent = state.events.find(e => e.id === state.activeEventId);
    if (!container.dataset.lastSale || !activeEvent) return;

    const sale = JSON.parse(container.dataset.lastSale);
    const canvas = document.getElementById('flyer-canvas');

    const estado = sale.paid >= sale.price ? '✅ PAGADO' : (sale.paid > 0 ? `🟡 ABONADO parcial ($${sale.paid})` : '❌ IMPAGO');
    const text = `🎫 *TARJETA ASIGNADA* 🎫\n` +
                 `----------------------------------------\n` +
                 `*Evento:* ${activeEvent.name}\n` +
                 `*Número:* #${String(sale.number).padStart(3, '0')}\n` +
                 `*Producto:* ${sale.productName}\n` +
                 `*Comprador:* ${sale.buyer}\n` +
                 `*Vendedor:* ${sale.seller}\n` +
                 `*Precio:* $${sale.price}\n` +
                 `*Abonado:* $${sale.paid}\n` +
                 `*Estado:* ${estado}\n` +
                 `----------------------------------------`;

    // Attempt native file sharing if supported (e.g. mobile Chrome/Safari share sheet)
    if (canvas && navigator.canShare && navigator.share) {
        canvas.toBlob((blob) => {
            const file = new File([blob], `ticket_${sale.number}.png`, { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) {
                navigator.share({
                    files: [file],
                    title: `Tarjeta #${sale.number}`,
                    text: text
                }).catch(err => {
                    console.log('Error sharing file, falling back to link', err);
                    fallbackWhatsAppShare(text);
                });
            } else {
                fallbackWhatsAppShare(text);
            }
        }, 'image/png');
    } else {
        fallbackWhatsAppShare(text);
    }
}

function fallbackWhatsAppShare(text) {
    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
}

// Render Sales list & table
function renderSalesTable() {
    const activeEvent = state.events.find(e => e.id === state.activeEventId);
    const tbody = document.getElementById('sales-table-body');
    const query = document.getElementById('search-filter').value.toLowerCase();
    
    tbody.innerHTML = '';

    if (!activeEvent || activeEvent.sales.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No hay ventas registradas.</td></tr>`;
        return;
    }

    // Filter sales
    const filteredSales = activeEvent.sales.filter(sale => {
        return (
            String(sale.number).includes(query) ||
            sale.productName.toLowerCase().includes(query) ||
            sale.buyer.toLowerCase().includes(query) ||
            sale.seller.toLowerCase().includes(query)
        );
    });

    if (filteredSales.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Ninguna venta coincide con la búsqueda.</td></tr>`;
        return;
    }

    // Render rows (newest first for layout, or chronological? Chronological is typical but we show them sorted by number)
    filteredSales.forEach(sale => {
        const tr = document.createElement('tr');
        const abonoText = sale.paid >= sale.price ? 'Pagado' : `$${sale.paid} / $${sale.price}`;
        const paidClass = sale.paid >= sale.price ? 'style="color: var(--success);"' : (sale.paid > 0 ? 'style="color: var(--warning);"' : 'style="color: var(--danger);"');

        tr.innerHTML = `
            <td><strong>#${sale.number}</strong></td>
            <td>${sale.productName}</td>
            <td>${sale.buyer}</td>
            <td>${sale.seller}</td>
            <td ${paidClass}>${abonoText}</td>
            <td class="no-print">
                <div class="btn-action-group">
                    <button class="btn-action" onclick="openEditSaleModal(${sale.number})" title="Editar Venta">
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>
                    <button class="btn-action delete" onclick="deleteSale(${sale.number})" title="Eliminar Venta">
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Render Stats Cards
function renderStats() {
    const activeEvent = state.events.find(e => e.id === state.activeEventId);
    
    const qtyEl = document.getElementById('stat-total-qty');
    const paidEl = document.getElementById('stat-total-paid');
    const pendingEl = document.getElementById('stat-total-pending');

    if (!activeEvent) {
        qtyEl.textContent = '0';
        paidEl.textContent = '$0';
        pendingEl.textContent = '$0';
        return;
    }

    let totalQty = activeEvent.sales.length;
    let totalPaid = activeEvent.sales.reduce((sum, s) => sum + s.paid, 0);
    let totalValue = activeEvent.sales.reduce((sum, s) => sum + s.price, 0);
    let totalPending = totalValue - totalPaid;

    qtyEl.textContent = totalQty;
    paidEl.textContent = `$${totalPaid}`;
    pendingEl.textContent = `$${totalPending}`;

    // Render product preparation summary
    const summaryContainer = document.getElementById('product-summary-card');
    const summaryList = document.getElementById('product-summary-list');
    summaryList.innerHTML = '';
    
    if (activeEvent.sales.length === 0) {
        summaryContainer.style.display = 'none';
    } else {
        summaryContainer.style.display = 'block';
        
        // Count sales per product
        const productCounts = {};
        // Initialize all activeEvent products to 0 to show even those with 0 sales
        activeEvent.products.forEach(p => {
            productCounts[p.name] = 0;
        });
        
        // Add counts from registered sales
        activeEvent.sales.forEach(sale => {
            productCounts[sale.productName] = (productCounts[sale.productName] || 0) + 1;
        });
        
        // Render each product line
        Object.entries(productCounts).forEach(([name, count]) => {
            const item = document.createElement('div');
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.alignItems = 'center';
            item.style.padding = '8px 12px';
            item.style.background = 'rgba(255, 255, 255, 0.03)';
            item.style.border = '1px solid var(--border)';
            item.style.borderRadius = '8px';
            
            const countClass = count > 0 ? 'style="color: #6366f1; font-weight: 800;"' : 'style="color: var(--text-muted);"';
            const nameClass = count > 0 ? 'style="font-weight: 600;"' : 'style="color: var(--text-muted);"';
            
            item.innerHTML = `
                <span ${nameClass}>${name}</span>
                <span ${countClass}>${count} ${count === 1 ? 'unidad' : 'unidades'}</span>
            `;
            summaryList.appendChild(item);
        });
    }
}

// Render historical events list
function renderEventsHistory() {
    const list = document.getElementById('events-history-list');
    list.innerHTML = '';

    if (state.events.length === 0) {
        list.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.9rem; padding: 20px;">No hay eventos en el historial.</div>`;
        return;
    }

    // Sort showing latest events first
    [...state.events].reverse().forEach(event => {
        const item = document.createElement('div');
        item.style.background = 'rgba(255,255,255,0.03)';
        item.style.border = '1px solid var(--border)';
        item.style.padding = '14px';
        item.style.borderRadius = '10px';
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';

        const badgeClass = event.status === 'active' ? 'event-status-badge' : 'event-status-badge closed';
        const badgeText = event.status === 'active' ? 'Activo' : 'Cerrado';
        
        let totalSales = event.sales.length;
        let totalPaid = event.sales.reduce((sum, s) => sum + s.paid, 0);

        item.innerHTML = `
            <div>
                <div style="font-weight: 700; font-size: 0.95rem;">${event.name}</div>
                <div style="color: var(--text-muted); font-size: 0.75rem; margin-top: 2px;">
                    ${event.date} • ${totalSales} ventas • Recaudado: $${totalPaid}
                </div>
            </div>
            <span class="${badgeClass}">${badgeText}</span>
        `;
        list.appendChild(item);
    });
}

// Export active event data to Excel (CSV with UTF-8 BOM)
function exportToExcel() {
    const activeEvent = state.events.find(e => e.id === state.activeEventId);
    if (!activeEvent || activeEvent.sales.length === 0) {
        alert('No hay ventas registradas en el evento activo para exportar.');
        return;
    }

    // CSV Headers
    let csvContent = "\uFEFF"; // Add UTF-8 BOM for Excel Spanish compatibility
    csvContent += "Numero,Producto,Comprador,Vendido Por,Precio,Abonado,Pendiente,Hora\n";

    activeEvent.sales.forEach(sale => {
        const pending = sale.price - sale.paid;
        
        // Clean text values to avoid CSV breaking
        const cleanProduct = sale.productName.replace(/"/g, '""');
        const cleanBuyer = sale.buyer.replace(/"/g, '""');
        const cleanSeller = sale.seller.replace(/"/g, '""');

        csvContent += `${sale.number},"${cleanProduct}","${cleanBuyer}","${cleanSeller}",${sale.price},${sale.paid},${pending},"${sale.date}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    // Clean filename
    const fileName = activeEvent.name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_ventas.csv';
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Master Render function to sync UI based on state
function renderApp() {
    const activeEvent = state.events.find(e => e.id === state.activeEventId);
    const badge = document.getElementById('active-event-badge');
    
    // Elements to show/hide depending on active event
    const activeControls = document.getElementById('active-event-controls');
    const createContainer = document.getElementById('create-event-container');
    const activeOnlyForms = document.querySelectorAll('.event-active-only');
    const warning = document.getElementById('no-active-event-warning');
    
    if (activeEvent) {
        // App header badge
        badge.textContent = activeEvent.name;
        badge.className = 'event-status-badge';

        // Manage events tab views
        activeControls.style.display = 'block';
        createContainer.style.display = 'none';
        document.getElementById('active-event-display-name').textContent = activeEvent.name;
        document.getElementById('active-event-display-date').textContent = `Iniciado: ${activeEvent.date}`;

        // Sales page controls
        activeOnlyForms.forEach(el => el.style.display = 'block');
        warning.style.display = 'none';

        // Populate sales dropdown options
        updateSalesProductsDropdown();
    } else {
        badge.textContent = 'Sin Evento Activo';
        badge.className = 'event-status-badge closed';

        activeControls.style.display = 'none';
        createContainer.style.display = 'block';

        activeOnlyForms.forEach(el => el.style.display = 'none');
        warning.style.display = 'block';
        
        // Hide last ticket preview if no active event
        document.getElementById('last-ticket-container').style.display = 'none';
    }

    renderSalesTable();
    renderStats();
    renderEventsHistory();
}

// Modal Helper Functions
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Edit Sale Modal Setup & Logic
function openEditSaleModal(saleNumber) {
    const activeEvent = state.events.find(e => e.id === state.activeEventId);
    if (!activeEvent) return;

    const sale = activeEvent.sales.find(s => s.number === saleNumber);
    if (!sale) return;

    document.getElementById('edit-sale-number').value = sale.number;
    document.getElementById('edit-sale-buyer').value = sale.buyer === 'No especificado' ? '' : sale.buyer;
    document.getElementById('edit-sale-seller').value = sale.seller === 'No especificado' ? '' : sale.seller;
    document.getElementById('edit-sale-paid').value = sale.paid;
    document.getElementById('edit-sale-price').value = sale.price;

    // Populate products select inside modal
    const select = document.getElementById('edit-sale-product');
    select.innerHTML = '';
    activeEvent.products.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = `${p.name} - $${p.price}`;
        if (p.id === sale.productId) {
            option.selected = true;
        }
        select.appendChild(option);
    });

    openModal('modal-edit-sale');
}

// Update price dynamically inside edit sale modal
function updateEditSalePrice() {
    const activeEvent = state.events.find(e => e.id === state.activeEventId);
    const productId = document.getElementById('edit-sale-product').value;
    const priceInput = document.getElementById('edit-sale-price');
    
    if (activeEvent && productId) {
        const product = activeEvent.products.find(p => p.id === productId);
        if (product) {
            priceInput.value = product.price;
        }
    }
}

// Save Edited Sale
function saveEditedSale() {
    const activeEvent = state.events.find(e => e.id === state.activeEventId);
    if (!activeEvent) return;

    const number = parseInt(document.getElementById('edit-sale-number').value);
    const productId = document.getElementById('edit-sale-product').value;
    const buyer = document.getElementById('edit-sale-buyer').value.trim() || 'No especificado';
    const seller = document.getElementById('edit-sale-seller').value.trim() || 'No especificado';
    const paid = parseFloat(document.getElementById('edit-sale-paid').value);

    const saleIndex = activeEvent.sales.findIndex(s => s.number === number);
    if (saleIndex === -1) return;

    const product = activeEvent.products.find(p => p.id === productId);
    const price = product ? product.price : activeEvent.sales[saleIndex].price;

    // Update sale object
    activeEvent.sales[saleIndex] = {
        ...activeEvent.sales[saleIndex],
        productId: productId,
        productName: product ? product.name : activeEvent.sales[saleIndex].productName,
        buyer: buyer,
        seller: seller,
        price: price,
        paid: paid
    };

    saveState();
    closeModal('modal-edit-sale');
    alert('¡Venta editada con éxito!');
    renderApp();
}

// Delete Specific Sale
function deleteSale(saleNumber) {
    const activeEvent = state.events.find(e => e.id === state.activeEventId);
    if (!activeEvent) return;

    if (confirm(`¿Estás seguro de que deseas eliminar la venta #${saleNumber}?`)) {
        activeEvent.sales = activeEvent.sales.filter(s => s.number !== saleNumber);
        
        // Re-index remaining sales to keep them correlative from 1 to N?
        // Wait, "número correlativo y empieza siempre desde el uno". 
        // If we delete a middle row, we should probably keep original numbers to avoid confusion, 
        // or renumber? Renumbering guarantees it is always correlative from 1 to total. 
        // Let's keep original numbers so tickets already shared stay correct, but let's re-evaluate.
        // Actually, let's keep original numbers. To make it strictly correlative, the requirement is about assignment when loading. 
        // Renumbering could confuse people who already have ticket #3 if we delete #2 (since #3 becomes #2).
        // Let's keep the assigned numbers as-is, just delete the row.

        saveState();
        alert(`Venta #${saleNumber} eliminada.`);
        renderApp();
    }
}

// Edit Event Modal Setup
function openEditEventModal() {
    const activeEvent = state.events.find(e => e.id === state.activeEventId);
    if (!activeEvent) return;

    document.getElementById('edit-event-name').value = activeEvent.name;

    const container = document.getElementById('edit-event-products-list');
    container.innerHTML = '';

    activeEvent.products.forEach((p, index) => {
        const row = document.createElement('div');
        row.className = 'row-2';
        row.style.marginBottom = '8px';
        row.innerHTML = `
            <input type="text" class="edit-prod-name form-control" data-id="${p.id}" value="${p.name}" required>
            <input type="number" class="edit-prod-price form-control" value="${p.price}" required min="0">
        `;
        container.appendChild(row);
    });

    openModal('modal-edit-event');
}

// Save Edited Event Config
function saveEditedEvent() {
    const activeEvent = state.events.find(e => e.id === state.activeEventId);
    if (!activeEvent) return;

    const newName = document.getElementById('edit-event-name').value.trim();
    if (!newName) return;

    activeEvent.name = newName;

    // Read updated products list
    const productRows = document.querySelectorAll('#edit-event-products-list .row-2');
    const updatedProducts = [];

    productRows.forEach(row => {
        const nameInput = row.querySelector('.edit-prod-name');
        const priceInput = row.querySelector('.edit-prod-price');
        const id = nameInput.dataset.id;
        const name = nameInput.value.trim();
        const price = parseFloat(priceInput.value);

        if (id && name && !isNaN(price)) {
            updatedProducts.push({ id, name, price });
        }
    });

    // Update active event catalog
    activeEvent.products = updatedProducts;
    
    if (tempEditBgImage) {
        activeEvent.bgImage = tempEditBgImage;
        tempEditBgImage = null;
    }

    // Propagate product name and price changes to existing sales of this event (if any matches by productId)
    activeEvent.sales.forEach(sale => {
        const matchedProd = updatedProducts.find(p => p.id === sale.productId);
        if (matchedProd) {
            sale.productName = matchedProd.name;
            // Note: We update the price on the sale object to keep statistics accurate with the edited prices
            sale.price = matchedProd.price;
        }
    });

    saveState();
    closeModal('modal-edit-event');
    
    // Clear file inputs
    document.getElementById('edit-event-image').value = '';

    alert('¡Configuración del evento actualizada!');
    renderApp();
}

// Image compression and scaling helper
function processImageInput(fileInput, callback) {
    const file = fileInput.files[0];
    if (!file) {
        callback(null);
        return;
    }
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const max_size = 800;
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > max_size) {
                    height *= max_size / width;
                    width = max_size;
                }
            } else {
                if (height > max_size) {
                    width *= max_size / height;
                    height = max_size;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Output compressed JPEG at 70% quality
            callback(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// Draw the flyer layout onto HTML5 Canvas
function drawFlyerCanvas(sale, event) {
    const canvas = document.getElementById('flyer-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const drawContent = () => {
        // Dark filter on top of the image for legibility
        ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Inner borders
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 14;
        ctx.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);
        
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.strokeRect(22, 22, canvas.width - 44, canvas.height - 44);
        
        // Header (Event name)
        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.font = 'bold 24px Outfit, system-ui, sans-serif';
        
        // Truncate event name if too long
        let dispName = event.name.toUpperCase();
        if (dispName.length > 28) dispName = dispName.substring(0, 26) + '...';
        ctx.fillText(dispName, canvas.width / 2, 45);
        
        // Big Stamp Ticket Number (centered vertically and horizontally, no '#' sign)
        ctx.fillStyle = '#38bdf8';
        ctx.font = '900 110px Outfit, system-ui, sans-serif';
        ctx.fillText(`${String(sale.number).padStart(3, '0')}`, canvas.width / 2, 180);
        
        // Product container box (centered near the bottom)
        ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        const boxY = 400;
        const boxHeight = 70;
        const boxWidth = canvas.width - 100;
        const boxX = 50;
        
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 16);
        } else {
            ctx.rect(boxX, boxY, boxWidth, boxHeight);
        }
        ctx.fill();
        ctx.stroke();
        
        // Product details text (centered inside the product box)
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 24px Outfit, system-ui, sans-serif';
        ctx.textBaseline = 'middle';
        let pName = sale.productName;
        if (pName.length > 26) pName = pName.substring(0, 24) + '...';
        ctx.fillText(pName, canvas.width / 2, boxY + (boxHeight / 2));
    };

    if (event.bgImage) {
        const img = new Image();
        img.onload = function() {
            const canvasRatio = canvas.width / canvas.height;
            const imgRatio = img.width / img.height;
            let drawWidth, drawHeight, drawX, drawY;
            
            if (imgRatio > canvasRatio) {
                drawHeight = canvas.height;
                drawWidth = canvas.height * imgRatio;
                drawX = (canvas.width - drawWidth) / 2;
                drawY = 0;
            } else {
                drawWidth = canvas.width;
                drawHeight = canvas.width / imgRatio;
                drawX = 0;
                drawY = (canvas.height - drawHeight) / 2;
            }
            
            ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
            drawContent();
        };
        img.src = event.bgImage;
    } else {
        // Gradient fallback
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#1e1b4b');
        gradient.addColorStop(1, '#312e81');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawContent();
    }
}

// Download canvas flyer as image
function downloadFlyer() {
    const container = document.getElementById('last-ticket-container');
    if (!container.dataset.lastSale) return;

    const sale = JSON.parse(container.dataset.lastSale);
    const canvas = document.getElementById('flyer-canvas');
    if (!canvas) return;

    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = image;
    link.download = `tarjeta_evento_${sale.number}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


