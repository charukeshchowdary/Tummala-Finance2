const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : 'https://YOUR_BACKEND_URL_HERE.onrender.com';

// 1. Security Check
window.onload = () => {
    // Hide Loader after animation
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 2500);

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

// ==========================================
// 5. ELEGANT CURSOR & ANIMATIONS
// ==========================================

// Remove any existing cursor elements to avoid duplicates
document.querySelectorAll('.cursor-dot, .cursor-echo, .cursor-ring').forEach(e => e.remove());

const dot = document.createElement('div');
dot.className = 'cursor-dot';
document.body.appendChild(dot);

const ring = document.createElement('div');
ring.className = 'cursor-ring';
document.body.appendChild(ring);

let mx = window.innerWidth/2, my = window.innerHeight/2;
let rx = window.innerWidth/2, ry = window.innerHeight/2;

document.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.left = `${mx}px`;
    dot.style.top = `${my}px`;
});

function animateCursor() {
    rx += (mx - rx) / 6;
    ry += (my - ry) / 6;
    
    ring.style.left = `${rx}px`;
    ring.style.top = `${ry}px`;
    
    requestAnimationFrame(animateCursor);
}
animateCursor();

const addCursorHover = () => {
    const hoverElements = document.querySelectorAll('a, button, input, select, .app-card, .close-btn, .tab-btn');
    hoverElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            ring.classList.add('hover');
            dot.classList.add('hover');
        });
        el.addEventListener('mouseleave', () => {
            ring.classList.remove('hover');
            dot.classList.remove('hover');
        });
    });
};
setTimeout(addCursorHover, 1000);

const coinContainer = document.getElementById('coin-container');
if(coinContainer) {
    const coinCount = 25;
    for (let i = 0; i < coinCount; i++) {
        let coin = document.createElement('div');
        coin.className = 'falling-coin';
        coin.style.left = `${Math.random() * 100}vw`;
        coin.style.animationDuration = `${6 + Math.random() * 8}s`;
        coin.style.animationDelay = `${Math.random() * 5}s`;
        const size = 15 + Math.random() * 20;
        coin.style.width = `${size}px`;
        coin.style.height = `${size}px`;
        coin.style.fontSize = `${size * 0.55}px`;
        coinContainer.appendChild(coin);
    }
}
