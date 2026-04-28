const API_URL = '';

// 1. Security Check
window.onload = () => {
    const session = localStorage.getItem('tummala_session');
    if (!session) {
        window.location.href = 'index.html';
        return;
    }
    
    const user = JSON.parse(session);
    if (!user.isAdmin) {
        alert("Unauthorized Area. Redirecting to Public Vault.");
        window.location.href = 'index.html';
        return;
    }

    loadApplications();
};

document.getElementById('logoutAdminBtn').addEventListener('click', () => {
    localStorage.removeItem('tummala_session');
    window.location.href = 'index.html';
});

// 2. Fetch & Render Applications with FULL DETAILS
async function loadApplications() {
    try {
        const res = await fetch(`${API_URL}/api/loans/all`);
        const apps = await res.json();
        
        document.getElementById('totalCount').innerText = apps.length;
        const grid = document.getElementById('applicationsGrid');
        
        if (apps.length === 0) {
            grid.innerHTML = '<p style="color: #94a3b8;">No pending applications found.</p>';
            return;
        }

        grid.innerHTML = ''; 
        
        apps.reverse().forEach(app => {
            const card = document.createElement('div');
            card.className = 'app-card';
            
            card.innerHTML = `
                <div class="app-header">
                    <span class="app-name">${app.name}</span>
                    <span class="app-id">#${app.id}</span>
                </div>
                
                <div class="profile-section">
                    <span class="section-label">Client Profile</span>
                    <div class="detail-row"><i class="fa-solid fa-user"></i> <span>Age: ${app.age} Years</span></div>
                    <div class="detail-row"><i class="fa-brands fa-whatsapp"></i> <span>+91 ${app.phone}</span></div>
                    <div class="detail-row"><i class="fa-solid fa-location-dot"></i> <span>${app.address} (PIN: ${app.pincode})</span></div>
                </div>

                <div class="financial-section">
                    <div class="amt-val">₹${parseInt(app.amount).toLocaleString('en-IN')}</div>
                    <div class="asset-type"><i class="fa-solid fa-briefcase" style="margin-right: 6px;"></i> ${app.purpose}</div>
                    <div style="margin-top: 12px; font-size: 0.85rem; color: var(--text-secondary);">
                        Current Status: <span style="color: var(--gold-primary); font-weight: 600;">${app.status}</span>
                    </div>
                </div>

                <div class="action-row">
                    <select class="status-select" id="status-${app.id}">
                        <option value="Pending Review">Pending Review</option>
                        <option value="On Hold">On Hold</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Disbursed">Disbursed</option>
                    </select>
                    <button class="btn-update" onclick="updateStatus(${app.id})">Update Status</button>
                </div>
            `;
            grid.appendChild(card);
            document.getElementById(`status-${app.id}`).value = app.status;
        });

    } catch (err) {
        document.getElementById('applicationsGrid').innerHTML = '<p style="color: red;">Failed to connect to the secure server.</p>';
    }
}

// 3. Update Status
window.updateStatus = async (id) => {
    const newStatus = document.getElementById(`status-${id}`).value;
    try {
        const res = await fetch(`${API_URL}/api/loans/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: newStatus })
        });

        if (res.ok) {
            alert("Client notified via WhatsApp!");
            loadApplications(); 
        }
    } catch (err) { alert("Server connection failed."); }
};