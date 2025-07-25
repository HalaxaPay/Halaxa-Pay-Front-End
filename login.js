// Enhanced password visibility toggle with animation
const passwordToggle = document.getElementById('passwordToggle');
const passwordInput = document.getElementById('password');

passwordToggle.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    passwordToggle.classList.toggle('fa-eye');
    passwordToggle.classList.toggle('fa-eye-slash');
    
    // Add ripple effect
    passwordToggle.style.transform = 'scale(0.9)';
    setTimeout(() => {
        passwordToggle.style.transform = 'scale(1)';
    }, 150);
});

// Enhanced form interactions
const inputs = document.querySelectorAll('input');
inputs.forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.style.transform = 'translateY(-2px)';
    });
    
    input.addEventListener('blur', function() {
        this.parentElement.style.transform = 'translateY(0)';
    });
});

// Button loading state
const loginButton = document.getElementById('loginButton');

// Import Supabase and handle login functionality
import { supabase, signInWithGoogle } from './supabase-client.js';

const googleBtn = document.querySelector('.google-signin-btn');
const generalError = document.getElementById('generalError');
const BACKEND_URL = 'https://halaxa-backend.onrender.com';

// Function to handle login form submission (email/password)
async function handleLogin(event) {
    event.preventDefault();
    event.stopPropagation();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('generalError');
    // Clear any previous errors
    errorMessage.style.display = 'none';
    // Add loading state
    loginButton.classList.add('loading');
    loginButton.textContent = 'Accessing Dashboard';
    console.log('Starting login process for:', email);
    try {
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        console.log('Starting login...');
        console.log('Sending data:', { email: email.substring(0, 3) + '*****' });
        
        const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            mode: 'cors',
            credentials: 'omit', // Changed from 'include' to avoid CORS issues
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Origin': 'https://halaxapay.com'
            },
            body: JSON.stringify({ email, password }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId); // Clear timeout on successful response
        const data = await response.json();
        if (response.ok) {
            if (data.accessToken) localStorage.setItem('accessToken', data.accessToken);
            if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
            if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('userActive', 'true');
            localStorage.setItem('isPreview', 'false');
            localStorage.removeItem('sellerId');
            localStorage.removeItem('halaxa_token');
            localStorage.removeItem('token');
            loginButton.textContent = 'Access Granted! 🎉';
            loginButton.style.background = 'var(--gradient-mixed)';
            setTimeout(() => {
                console.log('🚀 Redirecting to dashboard...');
                window.location.replace('SPA.html'); // Use replace instead of href to prevent back button issues
            }, 1500);
        } else {
            errorMessage.textContent = data.error || 'Login failed. Please try again.';
            errorMessage.style.display = 'block';
            loginButton.classList.remove('loading');
            loginButton.textContent = 'Access Dashboard';
        }
    } catch (error) {
        console.error('Login error:', error);
        
        // Show specific error message based on error type
        let errorText = 'Login failed. Please try again.';
        
        if (error.name === 'AbortError') {
            errorText = 'Request timed out. The server may be busy. Please try again.';
        } else if (error.message.includes('CORS') || error.message.includes('fetch')) {
            errorText = 'Connection to server failed. Please check your internet connection and try again.';
        } else if (error.message.includes('invalid') || error.message.includes('incorrect')) {
            errorText = 'Invalid email or password. Please check your credentials and try again.';
        } else if (error.message.includes('Network')) {
            errorText = 'Network error. Please check your connection and try again.';
        }
        
        errorMessage.textContent = errorText;
        errorMessage.style.display = 'block';
        loginButton.classList.remove('loading');
        loginButton.textContent = 'Access Dashboard';
    }
}

document.getElementById('loginForm').addEventListener('submit', handleLogin);

if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
        try {
            console.log('🔄 Google sign-in button clicked');
            googleBtn.classList.add('loading');
            googleBtn.textContent = 'Signing in with Google...';
            googleBtn.disabled = true;
            generalError.style.display = 'none';
            
            // Use the new backend-routed Google OAuth
            await signInWithGoogle();
            
            // The signInWithGoogle function will redirect to the backend,
            // so this code won't be reached unless there's an error
            
        } catch (err) {
            console.error('❌ Google sign-in error:', err);
            generalError.style.display = 'block';
            generalError.textContent = err.message || 'Google sign-in failed. Please try again.';
            googleBtn.classList.remove('loading');
            googleBtn.textContent = 'Sign In with Google';
            googleBtn.disabled = false;
        }
    });
}
