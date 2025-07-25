import { supabase } from './supabase-client.js';

const BACKEND_URL = 'https://halaxa-backend.onrender.com';
const statusDiv = document.getElementById('status');

let authStateListener = null;
let isProcessing = false;
let timeoutId = null;

async function handleOAuthCallback() {
    if (isProcessing) return;
    isProcessing = true;
    
    try {
        console.log('🔄 Starting OAuth callback processing...');
        console.log('🔍 Current URL:', window.location.href);
        console.log('🔍 URL hash:', window.location.hash);
        
        statusDiv.innerHTML = '<p>Verifying your Google account...</p>';
        
        // Check for OAuth errors in URL first
        const urlParams = new URLSearchParams(window.location.search);
        const urlError = urlParams.get('error');
        const urlErrorDescription = urlParams.get('error_description');
        
        if (urlError) {
            throw new Error(`OAuth error: ${urlError} - ${urlErrorDescription || 'Unknown error'}`);
        }
        
        // Check if we have auth tokens in URL hash
        if (!window.location.hash || !window.location.hash.includes('access_token')) {
            throw new Error('No OAuth tokens found in URL. Please try signing in again.');
        }
        
        console.log('✅ OAuth tokens detected in URL hash');
        statusDiv.innerHTML = '<p>🔐 Securing your account...</p>';
        
        // MANUALLY extract tokens from URL hash (bypass Supabase URL validation)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const tokenType = hashParams.get('token_type');
        const expiresIn = hashParams.get('expires_in');
        
        console.log('🔍 Extracted tokens:', {
            accessToken: accessToken ? `${accessToken.substring(0, 20)}...` : 'Missing',
            refreshToken: refreshToken ? `${refreshToken.substring(0, 20)}...` : 'Missing',
            tokenType,
            expiresIn
        });
        
        if (!accessToken) {
            throw new Error('Access token not found in OAuth response');
        }
        
        statusDiv.innerHTML = '<p>✨ Preparing your personalized dashboard...</p>';
        
        // Set up auth state listener BEFORE setting session
        console.log('🔄 Setting up auth state listener...');
        authStateListener = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('🔔 Auth state changed:', event);
            
            if (event === 'SIGNED_IN' && session?.user && session?.access_token) {
                console.log('✅ User successfully signed in via OAuth!');
                console.log('👤 User email:', session.user.email);
                
                // Remove the listener
                if (authStateListener) {
                    authStateListener.data.subscription.unsubscribe();
                    authStateListener = null;
                }
                
                // Clear timeout
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                
                await syncWithBackend(session);
            } else if (event === 'SIGNED_OUT') {
                console.log('⚠️ Auth state: SIGNED_OUT - this is expected initially');
            } else if (event === 'TOKEN_REFRESHED') {
                console.log('🔄 OAuth tokens refreshed');
            }
        });
        
        // Set up timeout for fallback
        timeoutId = setTimeout(() => {
            console.log('⚠️ Timeout waiting for auth state change, trying direct approach...');
            handleDirectSessionSync(accessToken);
        }, 8000); // 8 second timeout
        
        // MANUALLY set the session using extracted tokens
        console.log('🔄 Setting session manually with extracted tokens...');
        
        // Create session object
        const sessionData = {
            access_token: accessToken,
            refresh_token: refreshToken || '',
            expires_in: parseInt(expiresIn) || 3600,
            token_type: tokenType || 'bearer'
        };
        
        // Set session in Supabase (this should trigger SIGNED_IN event)
        const { data, error } = await supabase.auth.setSession(sessionData);
        
        if (error) {
            console.error('❌ Failed to set session:', error);
            // Don't throw here, let the timeout handle fallback
        } else if (data?.session?.user) {
            console.log('✅ Session set successfully via setSession()');
        } else {
            console.log('⚠️ setSession() completed but no user in response');
        }
        
    } catch (error) {
        console.error('❌ OAuth callback initial processing failed:', error);
        showError(error.message);
    }
}

// Direct approach if auth state listener doesn't work
async function handleDirectSessionSync(accessToken) {
    try {
        console.log('🔄 Attempting direct backend sync with access token...');
        
        // Clear existing listener
        if (authStateListener) {
            authStateListener.data.subscription.unsubscribe();
            authStateListener = null;
        }
        
        // Clear timeout
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        
        statusDiv.innerHTML = '<p>🎯 Almost ready! Setting up your workspace...</p>';
        
        // Sync directly with backend using the access token
        const response = await fetch(`${BACKEND_URL}/api/auth/oauth-sync`, {
            method: 'POST',
            mode: 'cors',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ supabaseToken: accessToken })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Direct backend sync failed:', response.status, errorText);
            throw new Error(`Backend sync failed: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Direct backend sync successful:', result);
        
        // Store session data
        if (result.user) {
            localStorage.setItem('user', JSON.stringify(result.user));
            localStorage.setItem('userPlan', result.user.plan || 'basic');
        }
        
        if (result.accessToken) {
            localStorage.setItem('accessToken', result.accessToken);
        }
        if (result.refreshToken) {
            localStorage.setItem('refreshToken', result.refreshToken);
        }
        
        // Mark user as active
        localStorage.setItem('userActive', 'true');
        localStorage.setItem('isPreview', 'false');
        
        // Clean up old session data
        localStorage.removeItem('sellerId');
        localStorage.removeItem('halaxa_token');
        localStorage.removeItem('token');
        
        console.log('✅ Session data stored successfully (direct method)');
        
        // Show success and redirect
        statusDiv.innerHTML = `
            <div class="success-message">
                <strong>✅ Welcome back!</strong><br>
                Your secure workspace is ready. Redirecting now...<br>
                <small style="opacity: 0.8;">🔒 Your data is protected with enterprise-grade security</small>
            </div>
        `;
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.replace('SPA.html');
        }, 1500);
        
    } catch (error) {
        console.error('❌ Direct session sync failed:', error);
        showError(`Sign-in incomplete: ${error.message}`);
    }
}

async function syncWithBackend(session) {
    try {
        console.log('🔄 Syncing with backend...');
        statusDiv.innerHTML = '<p>🚀 Connecting you to your dashboard...</p>';
        
        const response = await fetch(`${BACKEND_URL}/api/auth/oauth-sync`, {
            method: 'POST',
            mode: 'cors',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ supabaseToken: session.access_token })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Backend sync failed:', response.status, errorText);
            throw new Error(`Backend sync failed: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Backend sync successful:', result);
        
        // Store session data exactly like normal signup/login
        if (result.user) {
            localStorage.setItem('user', JSON.stringify(result.user));
            localStorage.setItem('userPlan', result.user.plan || 'basic');
        }
        
        if (result.accessToken) {
            localStorage.setItem('accessToken', result.accessToken);
        }
        if (result.refreshToken) {
            localStorage.setItem('refreshToken', result.refreshToken);
        }
        
        // Mark user as active
        localStorage.setItem('userActive', 'true');
        localStorage.setItem('isPreview', 'false');
        
        // Clean up old session data
        localStorage.removeItem('sellerId');
        localStorage.removeItem('halaxa_token');
        localStorage.removeItem('token');
        
        console.log('✅ Session data stored successfully');
        console.log('🚀 Redirecting to personalized dashboard...');
        
        // Show success message
        statusDiv.innerHTML = `
            <div class="success-message">
                <strong>✅ All set!</strong><br>
                Taking you to your secure dashboard...<br>
                <small style="opacity: 0.8;">🛡️ Authenticated via Google's secure servers</small>
            </div>
        `;
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.replace('SPA.html');
        }, 1500);
        
    } catch (error) {
        console.error('❌ Backend sync failed:', error);
        showError(`Connection failed: ${error.message}`);
    }
}

function showError(message) {
    isProcessing = false;
    
    // Clean up listeners and timeouts
    if (authStateListener) {
        authStateListener.data.subscription.unsubscribe();
        authStateListener = null;
    }
    if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
    }
    
    statusDiv.innerHTML = `
        <div class="error-message">
            <strong>❌ Google sign-in failed</strong><br>
            ${message}<br><br>
            <a href="login.html" style="color: white; text-decoration: underline;">
                Click here to try again
            </a>
        </div>
    `;
}

// Start processing when page loads
window.addEventListener('load', handleOAuthCallback);
