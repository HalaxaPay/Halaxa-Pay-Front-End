const resetForm = document.getElementById('resetForm');
const resetMessage = document.getElementById('resetMessage');
const resetButton = document.getElementById('resetButton');
const BACKEND_URL = 'https://halaxa-backend.onrender.com';

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    resetMessage.style.display = 'none';
    const email = document.getElementById('email').value.trim();
    
    if (!validateEmail(email)) {
        resetMessage.textContent = 'Please enter a valid email address.';
        resetMessage.className = 'message error';
        resetMessage.style.display = 'block';
        return;
    }
    
    resetButton.disabled = true;
    resetButton.textContent = 'Sending...';
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            resetMessage.textContent = data.message || 'Reset link sent to your email.';
            resetMessage.className = 'message success';
            resetMessage.style.display = 'block';
            resetForm.reset();
        } else {
            resetMessage.textContent = data.error || 'Failed to send reset email.';
            resetMessage.className = 'message error';
            resetMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Password reset error:', error);
        resetMessage.textContent = 'Network error. Please try again.';
        resetMessage.className = 'message error';
        resetMessage.style.display = 'block';
    } finally {
        resetButton.disabled = false;
        resetButton.textContent = 'SEND RESET LINK';
    }
});
