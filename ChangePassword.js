// Global variables for DOM elements
const changeForm = document.getElementById('changeForm');
const changeMessage = document.getElementById('changeMessage');
const changeButton = document.getElementById('changeButton');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorContainer = document.getElementById('errorContainer');
const errorMessage = document.getElementById('errorMessage');
const successContainer = document.getElementById('successContainer');
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');

// Backend URL configuration
const BACKEND_URL = 'https://halaxa-backend.onrender.com';

// Password validation requirements
const passwordRequirements = {
    length: { regex: /.{8,}/, element: document.getElementById('length-req') },
    uppercase: { regex: /[A-Z]/, element: document.getElementById('uppercase-req') },
    lowercase: { regex: /[a-z]/, element: document.getElementById('lowercase-req') },
    number: { regex: /[0-9]/, element: document.getElementById('number-req') }
};

// Extract token from URL parameters
function getTokenFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('token');
}

// Validate password requirements
function validatePassword(password) {
    let isValid = true;
    
    // Check each requirement
    Object.keys(passwordRequirements).forEach(req => {
        const requirement = passwordRequirements[req];
        const isMet = requirement.regex.test(password);
        
        if (isMet) {
            requirement.element.classList.add('valid');
            requirement.element.classList.remove('invalid');
            requirement.element.querySelector('i').className = 'fas fa-check';
        } else {
            requirement.element.classList.add('invalid');
            requirement.element.classList.remove('valid');
            requirement.element.querySelector('i').className = 'fas fa-circle';
            isValid = false;
        }
    });
    
    return isValid;
}

// Check if passwords match
function passwordsMatch() {
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    return newPassword === confirmPassword && newPassword.length > 0;
}

// Update password input styling based on validation
function updatePasswordValidation() {
    const newPassword = newPasswordInput.value;
    const isValid = validatePassword(newPassword);
    const matches = passwordsMatch();
    
    // Update new password input styling
    newPasswordInput.classList.remove('error', 'success');
    if (newPassword.length > 0) {
        newPasswordInput.classList.add(isValid ? 'success' : 'error');
    }
    
    // Update confirm password input styling
    confirmPasswordInput.classList.remove('error', 'success');
    if (confirmPasswordInput.value.length > 0) {
        confirmPasswordInput.classList.add(matches ? 'success' : 'error');
    }
    
    // Enable/disable submit button
    changeButton.disabled = !(isValid && matches);
}

// Validate token with backend
async function validateToken(token) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/auth/validate-reset-token?token=${encodeURIComponent(token)}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        const data = await response.json();
        return response.ok ? { valid: true, data } : { valid: false, error: data.error || 'Invalid token' };
    } catch (error) {
        console.error('Token validation error:', error);
        return { valid: false, error: 'Network error. Please try again.' };
    }
}

// Change password API call
async function changePassword(token, newPassword) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ token, newPassword })
        });
        
        const data = await response.json();
        return response.ok ? { success: true, data } : { success: false, error: data.error || 'Failed to change password' };
    } catch (error) {
        console.error('Password change error:', error);
        return { success: false, error: 'Network error. Please try again.' };
    }
}

// Show error message and hide form
function showError(message) {
    errorMessage.textContent = message;
    errorContainer.style.display = 'block';
    changeForm.style.display = 'none';
    successContainer.style.display = 'none';
}

// Show success message and redirect
function showSuccess(message) {
    changeMessage.textContent = message;
    changeMessage.className = 'message success';
    changeMessage.style.display = 'block';
    changeForm.style.display = 'none';
    errorContainer.style.display = 'none';
    successContainer.style.display = 'block';
    
    // Redirect to login page after 3 seconds
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 3000);
}

// Initialize page
async function initializePage() {
    const token = getTokenFromURL();
    
    if (!token) {
        showError('Invalid or missing token. Please use the link from your email.');
        return;
    }
    
    // Validate token with backend
    const validationResult = await validateToken(token);
    
    if (!validationResult.valid) {
        showError(validationResult.error);
        return;
    }
    
    // Token is valid, show the form
    changeForm.style.display = 'flex';
    errorContainer.style.display = 'none';
}

// Event listeners
newPasswordInput.addEventListener('input', updatePasswordValidation);
confirmPasswordInput.addEventListener('input', updatePasswordValidation);

changeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const token = getTokenFromURL();
    const newPassword = newPasswordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();
    
    // Final validation
    if (!validatePassword(newPassword)) {
        changeMessage.textContent = 'Please ensure your password meets all requirements.';
        changeMessage.className = 'message error';
        changeMessage.style.display = 'block';
        return;
    }
    
    if (newPassword !== confirmPassword) {
        changeMessage.textContent = 'Passwords do not match.';
        changeMessage.className = 'message error';
        changeMessage.style.display = 'block';
        return;
    }
    
    // Disable button and show loading
    changeButton.disabled = true;
    loadingSpinner.style.display = 'inline-block';
    changeButton.textContent = 'CHANGING PASSWORD...';
    changeMessage.style.display = 'none';
    
    try {
        const result = await changePassword(token, newPassword);
        
        if (result.success) {
            showSuccess(result.data.message || 'Password changed successfully! Redirecting to login...');
        } else {
            changeMessage.textContent = result.error;
            changeMessage.className = 'message error';
            changeMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Password change error:', error);
        changeMessage.textContent = 'An unexpected error occurred. Please try again.';
        changeMessage.className = 'message error';
        changeMessage.style.display = 'block';
    } finally {
        // Re-enable button and hide loading
        changeButton.disabled = false;
        loadingSpinner.style.display = 'none';
        changeButton.textContent = 'CHANGE PASSWORD';
    }
});

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePage);
