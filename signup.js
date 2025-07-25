// Enhanced password visibility toggle
const passwordToggle = document.getElementById('passwordToggle');
const passwordInput = document.getElementById('password');

if (passwordToggle && passwordInput) {
    passwordToggle.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        passwordToggle.classList.toggle('fa-eye');
        passwordToggle.classList.toggle('fa-eye-slash');
    });
}

// Password strength checker (if element exists)
const passwordStrength = document.getElementById('passwordStrength');

if (passwordInput && passwordStrength) {
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        const hasMinLength = password.length >= 8;
        const hasNumber = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        if (hasMinLength && hasNumber && hasSpecialChar) {
            passwordStrength.style.display = 'block';
        } else {
            passwordStrength.style.display = 'none';
        }
    });
}

// Enhanced form interactions
const inputs = document.querySelectorAll('input');
inputs.forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.style.transform = 'translateY(-1px)';
    });
    
    input.addEventListener('blur', function() {
        this.parentElement.style.transform = 'translateY(0)';
    });
});

// ==================== USER DASHBOARD INITIALIZATION ==================== //

async function initializeUserDashboard(userId, fullName, email) {
    console.log('🎯 Initializing dashboard tables for user:', userId);
    
    // Import Supabase client
    const { supabase } = await import('./supabase-client.js');
    
    // Generate initials from full name
    const initials = generateInitials(fullName);
    
    // Calculate next billing date (30 days from now)
    const nextBilling = new Date();
    nextBilling.setDate(nextBilling.getDate() + 30);
    
                 const initializationResults = {
         user_profiles: false,
         user_subscriptions: false,
         user_balances: false,
         user_metrics: false,
         network_distributions: false
     };

    try {
        // 1. Initialize user_profiles (CRITICAL)
        initializationResults.user_profiles = await safeInsert(supabase, 'user_profiles', {
            user_id: userId,
            name: fullName || '',
            initials: initials
        }, 'Creating user profile');

        // 2. Initialize user_subscriptions (CRITICAL)
        initializationResults.user_subscriptions = await safeInsert(supabase, 'user_subscriptions', {
            user_id: userId,
            plan_tier: 'basic',
            plan_status: 'active',
            started_at: new Date().toISOString(),
            next_billing_date: nextBilling.toISOString(),
            auto_renewal: true
        }, 'Creating user subscription');

        // 3. Initialize user_balances (CRITICAL)
        initializationResults.user_balances = await safeInsert(supabase, 'user_balances', {
            user_id: userId,
            wallet_address: '',
            usdc_polygon: 0,
            usdc_solana: 0,
            usd_equivalent: 0
        }, 'Creating user balances');

        // 4. Initialize user_metrics (CRITICAL)
        initializationResults.user_metrics = await safeInsert(supabase, 'user_metrics', {
            user_id: userId,
            days_active: 0,
            status_level: 'new',
            current_streak: 0
        }, 'Creating user metrics');



         // 5. Initialize network_distributions (OPTIONAL) - Network-specific entries
         console.log('🌐 Creating network distributions...');
         const networks = ['polygon', 'solana'];
         let networkDistributionSuccess = true;
         
         for (const network of networks) {
             const success = await safeInsert(supabase, 'network_distributions', {
                 user_id: userId,
                 network: network,
                 volume_usdc: 0,
                 percent_usage: 0
             }, `Creating ${network} network distribution`);
             
             if (!success) networkDistributionSuccess = false;
         }
         initializationResults.network_distributions = networkDistributionSuccess;

                         // Log final results
         const successCount = Object.values(initializationResults).filter(Boolean).length;
         const totalTables = Object.keys(initializationResults).length;
         
         console.log(`🎉 Dashboard initialization complete: ${successCount}/${totalTables} tables initialized`);
         console.log('📋 Initialization results:', initializationResults);
         
         // Check core tables (critical for dashboard functionality)
         const coreResults = {
             user_profiles: initializationResults.user_profiles,
             user_subscriptions: initializationResults.user_subscriptions,
             user_balances: initializationResults.user_balances,
             user_metrics: initializationResults.user_metrics
         };
         const coreSuccessCount = Object.values(coreResults).filter(Boolean).length;
         
         if (coreSuccessCount >= 4) {
             console.log('✅ All core dashboard tables initialized successfully');
         } else {
             console.warn('⚠️ Some core tables failed to initialize - dashboard may have empty states');
             console.warn('🔧 Core table results:', coreResults);
         }
         
         // Log optional tables status
         const optionalTables = totalTables - 4; // Total minus core tables
         const optionalSuccess = successCount - coreSuccessCount;
         console.log(`📊 Optional tables: ${optionalSuccess}/${optionalTables} initialized`);
         
         if (successCount >= 5) { // All core tables + optional successful
             console.log('🌟 Excellent initialization! User dashboard fully prepared');
         }

    } catch (error) {
        console.error('❌ Error during dashboard initialization:', error);
    }
}

function generateInitials(fullName) {
    if (!fullName || typeof fullName !== 'string') return 'U';
    
    const names = fullName.trim().split(' ').filter(n => n.length > 0);
    if (names.length === 0) return 'U';
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    
    // Take first letter of first name and first letter of last name
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
}

// Helper function to safely insert data with error handling
async function safeInsert(supabase, tableName, data, description) {
    try {
        console.log(`📝 ${description}...`);
        const { data: insertData, error } = await supabase
            .from(tableName)
            .insert([data]);
        
        if (error) {
            if (error.code === '42P01') {
                console.warn(`⚠️ Table '${tableName}' doesn't exist yet - skipping`);
            } else {
                console.error(`❌ Failed to ${description.toLowerCase()}:`, error);
            }
            return false;
        } else {
            console.log(`✅ ${description} successful`);
            return true;
        }
    } catch (error) {
        console.error(`❌ Error during ${description.toLowerCase()}:`, error);
        return false;
    }
}

// Define backend URL for this script scope
const BACKEND_URL = 'https://halaxa-backend.onrender.com';

document.getElementById('signupForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const fullName = document.getElementById('fullname').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const generalError = document.getElementById('generalError');
    const signupButton = document.getElementById('signupButton');
    
    // Clear previous errors
    generalError.style.display = 'none';
    
    // Validate inputs
    if (!fullName || !email || !password) {
        generalError.style.display = 'block';
        generalError.textContent = 'Please fill in all fields';
        generalError.style.color = '#dc3545';
        generalError.style.background = 'rgba(220, 53, 69, 0.1)';
        generalError.style.border = '1px solid rgba(220, 53, 69, 0.3)';
        generalError.style.borderRadius = '8px';
        generalError.style.padding = '12px';
        return;
    }
    
    // Add loading state
    signupButton.classList.add('loading');
    signupButton.textContent = 'Creating Account...';
    signupButton.disabled = true;

            // Split full name into first and last name
    const nameParts = fullName.trim().split(' ');
    const first_name = nameParts[0];
    const last_name = nameParts.slice(1).join(' ') || ''; // Handle single name case
        
    try {
        console.log('Starting registration...');
        console.log('Sending data:', { email, first_name, last_name });
        
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
            method: 'POST',
            mode: 'cors',
            credentials: 'omit', // Changed from 'include' to avoid CORS issues
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                email,
                password,
                first_name,
                last_name
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId); // Clear timeout if request completes

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        const data = await response.json();
        console.log('Response data:', data);

        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }

        // Store tokens and user session data
        if (data.accessToken) {
            localStorage.setItem('accessToken', data.accessToken);
        }
        if (data.refreshToken) {
            localStorage.setItem('refreshToken', data.refreshToken);
        }
        if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('userPlan', data.user.plan || 'basic');
        }
        
        // Mark user as active (critical for authentication checks)
        localStorage.setItem('userActive', 'true');
        localStorage.setItem('isPreview', 'false');
        
        // Clean up any old session data
        localStorage.removeItem('sellerId');
        localStorage.removeItem('halaxa_token');
        localStorage.removeItem('token');

        // 🚀 DASHBOARD INITIALIZATION
        console.log('🚀 User dashboard initialized by backend during registration');
        signupButton.textContent = 'Setting up your dashboard...';
        
        // Backend handles all dashboard initialization automatically
        // No frontend initialization needed - cleaner and more secure

        // Success feedback
        signupButton.textContent = 'Welcome to Halaxa! 🎉';
        signupButton.style.background = 'var(--gradient-mixed)';

        // Show success message
        generalError.style.display = 'block';
        generalError.style.color = '#10b981';
        generalError.style.background = 'rgba(16, 185, 129, 0.1)';
        generalError.style.border = '1px solid rgba(16, 185, 129, 0.3)';
        generalError.style.borderRadius = '8px';
        generalError.style.padding = '12px';
        generalError.textContent = '✅ Account created and dashboard initialized! Auto-login successful - redirecting to your dashboard...';
        
        console.log('✅ Registration successful, session established:');
        console.log('👤 User:', data.user ? data.user.email : 'No user data');
        console.log('🔑 Access Token:', data.accessToken ? 'Present' : 'Missing');
        console.log('🎫 Session Active:', localStorage.getItem('userActive'));

        // Redirect to personalized dashboard (SPA.html) - user is now auto-logged in
        setTimeout(() => {
            console.log('🚀 Redirecting to dashboard...');
            window.location.replace('SPA.html'); // Use replace instead of href to prevent back button issues
        }, 1500);

    } catch (error) {
        console.error('Registration error:', error);
        
        // Show specific error message based on error type
        let errorMessage = 'Registration failed. Please try again.';
        
        if (error.name === 'AbortError') {
            errorMessage = 'Request timed out. The server may be busy. Please try again.';
        } else if (error.message.includes('CORS') || error.message.includes('fetch')) {
            errorMessage = 'Connection to server failed. Please check your internet connection and try again.';
        } else if (error.message.includes('already exists') || error.message.includes('already registered')) {
            errorMessage = 'An account with this email already exists. Please try logging in instead.';
        } else if (error.message.includes('Invalid') || error.message.includes('validation')) {
            errorMessage = 'Please check your input and try again.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        generalError.style.display = 'block';
        generalError.textContent = errorMessage;
        generalError.style.color = '#dc3545';
        generalError.style.background = 'rgba(220, 53, 69, 0.1)';
        generalError.style.border = '1px solid rgba(220, 53, 69, 0.3)';
        generalError.style.borderRadius = '8px';
        generalError.style.padding = '12px';
        
        // Reset button completely
        signupButton.classList.remove('loading');
        signupButton.textContent = 'GET STARTED';
        signupButton.disabled = false;
        signupButton.style.background = 'linear-gradient(90deg, #2ECC71 0%, #3498DB 100%)';
    }
});

// Geo-blocking Script (Frontend Layer)
// ⚠️ WARNING: This can be easily bypassed by disabling JavaScript
// Server-side blocking provides the real security

async function checkGeoBlocking() {
  try {
    // Use backend geo-check endpoint instead of direct ipapi.co call
    const response = await fetch('https://halaxa-backend.onrender.com/api/geo/check', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.blocked) {
        document.body.innerHTML = `
        <div class="geo-blocked-container">
          <div class="geo-blocked-card">
            <div class="geo-blocked-icon">🚫</div>
            <h1 class="geo-blocked-title">Access Denied</h1>
            <p class="geo-blocked-message">Service not available in your region</p>
            <p class="geo-blocked-location">Location: ${data.country_name || 'Unknown'}</p>
            <div class="geo-blocked-warning-badge">
              <i class="fas fa-exclamation-triangle"></i>
              Regional Restriction
            </div>
            <p class="geo-blocked-error-code">Error Code: GEO_BLOCKED_BACKEND</p>
          </div>
        </div>
      `;
        console.log('🚫 Backend geo-blocking: Access blocked for country:', data.country_name);
      } else {
        console.log('✅ Backend geo-blocking: Access allowed for country:', data.country_name);
      }
    } else {
      console.log('⚠️ Backend geo-check failed, allowing access as fallback');
    }
  } catch (error) {
    console.log('⚠️ Geo-blocking check failed, allowing access as fallback:', error);
    // Fail gracefully - allow access if geo-check fails
  }
}

// Run check when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkGeoBlocking);
} else {
  checkGeoBlocking();
}

// Import Supabase and handle Google sign-in
import { supabase, signInWithGoogle } from './supabase-client.js';

const googleBtn = document.querySelector('.google-signin-btn');
const generalError = document.getElementById('generalError');
const signupButton = document.getElementById('signupButton');

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
