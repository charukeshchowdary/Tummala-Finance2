const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : 'https://YOUR_BACKEND_URL_HERE.onrender.com';
let currentMode = 'LOGIN';

// ==========================================
// 1. INITIALIZATION & SESSION CHECK
// ==========================================
window.onload = () => {
    // Hide Loader after animation
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 2500);

    // Session check
    const session = localStorage.getItem('tummala_session');
    if (session) {
        const user = JSON.parse(session);
        const loginBtn = document.getElementById('loginBtn');

        if (user.isAdmin) {
            loginBtn.innerHTML = `<i class="fa-solid fa-user-shield"></i> Director Panel`;
            loginBtn.onclick = () => window.location.href = 'admin.html';
        } else {
            loginBtn.innerHTML = `<i class="fa-solid fa-crown"></i> ${user.name}`;
        }
    }

    // Scroll Animations Observer
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-up');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.stat-card, .luxury-card, .section-title').forEach(el => {
        el.style.opacity = '0';
        observer.observe(el);
    });
};

// ==========================================
// 2. MODAL CONTROLS & TAB LOGIC
// ==========================================
const authModal = document.getElementById('authModal');
const loanModal = document.getElementById('loanModal');

document.getElementById('loginBtn').addEventListener('click', () => {
    const session = localStorage.getItem('tummala_session');
    if (session) {
        const user = JSON.parse(session);
        if (!user.isAdmin) {
            if (confirm("Logout from Member Vault?")) {
                localStorage.removeItem('tummala_session');
                location.reload();
            }
        }
    } else {
        authModal.style.display = 'flex';
    }
});

document.getElementById('applyHeroBtn').addEventListener('click', () => {
    if (!localStorage.getItem('tummala_session')) {
        alert("Please authorize your identity first.");
        authModal.style.display = 'flex';
    } else {
        loanModal.style.display = 'flex';
    }
});

document.getElementById('closeAuth').onclick = () => authModal.style.display = 'none';
document.getElementById('closeLoan').onclick = () => loanModal.style.display = 'none';

const switchTab = (mode) => {
    currentMode = mode;
    document.getElementById('tabLogin').classList.toggle('active', mode === 'LOGIN');
    document.getElementById('tabSignup').classList.toggle('active', mode === 'SIGNUP');

    document.getElementById('loginForm').style.display = mode === 'LOGIN' ? 'block' : 'none';
    document.getElementById('signupForm').style.display = mode === 'SIGNUP' ? 'block' : 'none';
    document.getElementById('otpSection').style.display = 'none';
};

document.getElementById('tabLogin').addEventListener('click', () => switchTab('LOGIN'));
document.getElementById('tabSignup').addEventListener('click', () => switchTab('SIGNUP'));

// ==========================================
// 3. AUTHENTICATION FLOW
// ==========================================
document.getElementById('loginRequestOtpBtn').addEventListener('click', async () => {
    const phone = document.getElementById('loginPhone').value;
    if (!phone) return alert("Please enter your registered WhatsApp number.");
    document.getElementById('loginRequestOtpBtn').innerText = "Requesting...";
    await sendOtpRequest(phone, 'LOGIN');
    document.getElementById('loginRequestOtpBtn').innerText = "Request Access";
});

document.getElementById('signupRequestOtpBtn').addEventListener('click', async () => {
    const name = document.getElementById('regName').value;
    const phone = document.getElementById('signupPhone').value;
    const address = document.getElementById('regAddress').value;
    const age = document.getElementById('regAge').value;
    const pin = document.getElementById('regPin').value;

    if (!name || !phone || !address || !age || !pin) return alert("Please complete your profile details.");

    document.getElementById('signupRequestOtpBtn').innerText = "Requesting...";
    await sendOtpRequest(phone, 'SIGNUP');
    document.getElementById('signupRequestOtpBtn').innerText = "Verify & Register";
});

async function sendOtpRequest(phone, context) {
    try {
        const res = await fetch(`${API_URL}/api/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, context })
        });
        if (res.ok) {
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('signupForm').style.display = 'none';
            document.getElementById('otpSection').style.display = 'block';
            document.getElementById('otpMessage').innerText = `Verification code sent to ${phone}`;
        } else alert("Failed to send code.");
    } catch (err) { alert("Server communication error."); }
}

// ------------------------------------------
// THE MAGIC REDIRECT HAPPENS HERE
// ------------------------------------------
document.getElementById('verifyOtpBtn').addEventListener('click', async () => {
    const phone = currentMode === 'LOGIN' ? document.getElementById('loginPhone').value : document.getElementById('signupPhone').value;
    const otp = document.getElementById('authOtp').value;
    if (!otp) return alert("Enter the OTP.");

    document.getElementById('verifyOtpBtn').innerText = "Authorizing...";

    try {
        const res = await fetch(`${API_URL}/api/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, otp })
        });
        const data = await res.json();

        if (data.success) {
            if (currentMode === 'SIGNUP') {
                const profilePayload = {
                    name: document.getElementById('regName').value,
                    age: document.getElementById('regAge').value,
                    address: document.getElementById('regAddress').value,
                    pincode: document.getElementById('regPin').value,
                    phone: phone
                };
                await fetch(`${API_URL}/api/auth/register`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profilePayload)
                });
                localStorage.setItem('tummala_session', JSON.stringify({ name: profilePayload.name, phone: phone, isAdmin: false }));
                location.reload();
            } else {
                if (data.sessionType === 'NEW_USER') {
                    alert("Account not found. Please switch to 'Sign In' to create a profile.");
                    location.reload();
                } else if (data.sessionType === 'ADMIN') {
                    // IF ADMIN LOGS IN -> REDIRECT TO ADMIN PAGE!
                    localStorage.setItem('tummala_session', JSON.stringify({ name: "System Admin", phone: phone, isAdmin: true }));
                    window.location.href = 'admin.html';
                } else {
                    localStorage.setItem('tummala_session', JSON.stringify({ name: data.userData.name, phone: phone, isAdmin: false }));
                    location.reload();
                }
            }
        } else {
            alert("Invalid Authorization Code.");
            document.getElementById('verifyOtpBtn').innerText = "Authorize";
        }
    } catch (err) { alert("Server error."); }
});

// ==========================================
// 4. LOAN APPLICATION
// ==========================================
document.getElementById('submitLoanFinal').addEventListener('click', async () => {
    const user = JSON.parse(localStorage.getItem('tummala_session'));
    const amount = document.getElementById('loanAmtInput').value;
    const purpose = document.getElementById('loanPurpose').value;

    if (!amount) return alert("Please enter the required amount.");
    document.getElementById('submitLoanFinal').innerText = "Submitting...";

    try {
        const res = await fetch(`${API_URL}/api/loans/apply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: user.name, phone: user.phone, amount: amount, purpose: purpose })
        });

        if (res.ok) {
            alert("Application filed securely. Directors will be notified.");
            document.getElementById('loanModal').style.display = 'none';
        }
    } catch (err) { alert("Failed to submit."); }
    finally { document.getElementById('submitLoanFinal').innerText = "Submit Request to Directors"; }
});

document.getElementById('loanAmount').addEventListener('input', (e) => {
    const principal = e.target.value;
    const interest = (principal * 12 * 1) / 100;
    const emi = (parseFloat(principal) + interest) / 12;
    document.getElementById('emiValue').innerText = `₹ ${Math.round(emi).toLocaleString('en-IN')}`;
});

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

let mx = window.innerWidth / 2, my = window.innerHeight / 2;
let rx = window.innerWidth / 2, ry = window.innerHeight / 2;

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

// Add hover effect to interactive elements
const addCursorHover = () => {
    const hoverElements = document.querySelectorAll('a, button, input, select, .director-card, .close-btn, .tab-btn');
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

// Initial call and observer for dynamically added elements
setTimeout(addCursorHover, 1000);

// Generate falling gold coins
const coinContainer = document.getElementById('coin-container');
if (coinContainer) {
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
