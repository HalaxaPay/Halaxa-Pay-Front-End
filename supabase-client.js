// ==================== FRONTEND SUPABASE CLIENT ==================== //

/**
 * Frontend Supabase Configuration
 * This file is for client-side operations (browser)
 * Uses ANON KEY only - never expose service role keys to frontend!
 */

import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';

// Frontend Configuration - Use environment variables for production
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 'https://srdznitapqluldldkqsk.supabase.co';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyZHpuaXRhcHFsdWxkbGRrcXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NjgxNzMsImV4cCI6MjA2NTI0NDE3M30.aVz_9_erdWnWoETwGRVWvylivOIRmvvIMJGCX4STN-0';

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Please check your environment variables.');
}

// Create Supabase client for frontend
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce' // Recommended for SPA
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Origin, X-Requested-With'
    }
  }
});

// ==================== AUTHENTICATION HELPERS ==================== //

export const auth = {
  // Sign up user
  async signUp(email, password, userData = {}) {
    try {
      // Use backend API to avoid CORS issues
      const response = await fetch('https://halaxa-backend.onrender.com/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          firstName: userData.first_name || '',
          lastName: userData.last_name || ''
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Registration failed');
      }
      
      // Store the user data
      if (result.user) {
        localStorage.setItem('user', JSON.stringify(result.user));
        localStorage.setItem('userPlan', 'basic');
      }
      
      return { success: true, data: { user: result.user } };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: error.message };
    }
  },

  // Alternative Supabase direct signup (if backend fails)
  async signUpDirect(email, password, userData = {}) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData // Additional user metadata
        }
      });
      
      if (error) throw error;
      
      // ✅ AUTOMATIC INSERT INTO USERS TABLE AFTER SUCCESSFUL SIGNUP
      if (data.user) {
        console.log('✅ User successfully signed up, inserting into users table...');
        
        try {
          const { data: insertData, error: insertError } = await supabase
            .from('users')
            .insert([{
              id: data.user.id,
              email: data.user.email,
              password: '', // Empty password since using Supabase Auth
              first_name: userData.first_name || '',
              last_name: userData.last_name || '',
              full_name: userData.full_name || [userData.first_name, userData.last_name].filter(Boolean).join(' ') || '',
              plan: 'basic',
              is_email_verified: false, // Will be true after email confirmation
              created_at: new Date().toISOString(),
              last_login: new Date().toISOString(), // Set initial last login
              refresh_token: '' // Empty initially, will be set during login
            }])
            .select()
            .single();
          
          if (insertError) {
            // Log error but don't block signup process
            console.error('❌ Failed to insert user into users table:', insertError.message);
            console.log('⚠️ User signup successful but users table insert failed - continuing...');
          } else {
            console.log('✅ User successfully inserted into users table:', {
              id: insertData.id.substring(0, 8) + '****',
              email: insertData.email
            });
          }
        } catch (insertException) {
          // Log exception but don't block signup process
          console.error('❌ Exception during users table insert:', insertException.message);
          console.log('⚠️ User signup successful but users table insert failed - continuing...');
        }
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: error.message };
    }
  },

  // Sign in user
  async signIn(email, password) {
    try {
      // Use backend API to avoid CORS issues
      const response = await fetch('https://halaxa-backend.onrender.com/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Login failed');
      }
      
      // Store user data and tokens
      if (result.user) {
        localStorage.setItem('user', JSON.stringify(result.user));
        localStorage.setItem('userPlan', result.user.plan || 'basic');
        
        if (result.accessToken) {
          localStorage.setItem('accessToken', result.accessToken);
        }
        if (result.refreshToken) {
          localStorage.setItem('refreshToken', result.refreshToken);
        }
      }
      
      return { success: true, data: { user: result.user } };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message };
    }
  },

  // Alternative Supabase direct signin (if backend fails)
  async signInDirect(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      // Store user data in localStorage for access control
      if (data.user) {
        // ⚠️ DEV WARNING: data.user.id is Supabase Auth UUID - use for user_id in dashboard tables
        console.log(`🔐 Storing Supabase Auth user ID: ${data.user.id.substring(0, 8)}**** (use for user_id fields)`);
        
        localStorage.setItem('user', JSON.stringify({
          id: data.user.id,
          email: data.user.email,
          ...data.user.user_metadata
        }));
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message };
    }
  },

  // Sign out user
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('userPlan');
      
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get current user
  getCurrentUser() {
    return supabase.auth.getUser();
  },

  // Get current session
  getSession() {
    return supabase.auth.getSession();
  },

  // Listen to auth changes
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// ==================== REAL-TIME HELPERS ==================== //

export const realtime = {
  // Subscribe to table changes
  subscribeToTable(table, callback, filter = null) {
    let subscription = supabase
      .channel(`${table}_changes`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: table,
          ...(filter && { filter })
        }, 
        callback
      )
      .subscribe();
    
    return subscription;
  },

  // Subscribe to user-specific changes
  subscribeToUserData(userId, table, callback) {
    return this.subscribeToTable(table, callback, `user_id=eq.${userId}`);
  },

  // Subscribe to payment link updates
  subscribeToPaymentLinks(userId, callback) {
    return this.subscribeToUserData(userId, 'payment_links', callback);
  },

  // Subscribe to transaction updates
  subscribeToTransactions(userId, callback) {
    return this.subscribeToUserData(userId, 'transactions', callback);
  },

  // Unsubscribe from channel
  unsubscribe(subscription) {
    supabase.removeChannel(subscription);
  }
};

// ==================== DATA HELPERS ==================== //

export const database = {
  // Get user plan (frontend-safe query)
  async getUserPlan(userId) {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('plan_tier, started_at, next_billing_date')
        .eq('user_id', userId)
        .maybeSingle(); // Use maybeSingle instead of single to handle no results gracefully
      
      if (error && error.code !== 'PGRST116') {
        console.warn('getUserPlan error:', error);
        // If it's a CORS or 406 error, fall back to basic
        if (error.message.includes('CORS') || error.message.includes('406')) {
          console.warn('CORS or 406 error detected, falling back to basic plan');
          localStorage.setItem('userPlan', 'basic');
          return { success: true, plan: 'basic', data: null };
        }
        throw error;
      }
      
      const plan = data?.plan_tier || 'basic';
      localStorage.setItem('userPlan', plan);
      
      return { success: true, plan, data };
    } catch (error) {
      console.error('Error fetching user plan:', error);
      // Always fall back to basic on any error
      localStorage.setItem('userPlan', 'basic');
      return { success: false, plan: 'basic', error: error.message };
    }
  },

  // Get user payment links
  async getPaymentLinks(userId) {
    try {
      const { data, error } = await supabase
        .from('payment_links')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching payment links:', error);
      return { success: false, data: [], error: error.message };
    }
  },

  // Get user transactions
  async getTransactions(userId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return { success: false, data: [], error: error.message };
    }
  },

  // Get user metrics
  async getUserMetrics(userId) {
    try {
      const { data, error } = await supabase
        .from('user_metrics')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching user metrics:', error);
      return { success: false, data: null, error: error.message };
    }
  }
};

// ==================== UTILITY FUNCTIONS ==================== //

// Check if current page is a payment link page (should not run auth logic)
function isPaymentLinkPage() {
  const currentPath = window.location.pathname.toLowerCase();
  const paymentLinkPages = [
    'buyer form.html',
    'payment page.html', 
    'success page.html',
    'failure page.html',
    'buyer%20form.html',
    'payment%20page.html',
    'success%20page.html',
    'failure%20page.html'
  ];
  
  return paymentLinkPages.some(page => currentPath.includes(page.replace('%20', ' ')));
}

// Safe localStorage operations that don't interfere with payment link pages
function safeSetItem(key, value) {
  if (!isPaymentLinkPage()) {
    localStorage.setItem(key, value);
  }
}

function safeRemoveItem(key) {
  if (!isPaymentLinkPage()) {
    localStorage.removeItem(key);
  }
}

// ==================== INITIALIZATION ==================== //

// Initialize auth state on load
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Check if we're on a payment link page (should not run auth logic)
    if (isPaymentLinkPage()) {
      console.log('🔒 Payment link page detected - skipping authentication logic');
      return;
    }
    
    // Check if this is an OAuth redirect
    const urlParams = new URLSearchParams(window.location.search);
    const isOAuthRedirect = urlParams.get('oauth') === 'google';
    
    if (isOAuthRedirect) {
      console.log('🔄 Detected Google OAuth redirect, processing...');
      await handleOAuthRedirect();
      return;
    }
    
    // Check for existing session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      // Store user data (safely)
      safeSetItem('user', JSON.stringify({
        id: session.user.id,
        email: session.user.email,
        ...session.user.user_metadata
      }));
      
      // Get user plan (only if not on payment link page)
      if (!isPaymentLinkPage()) {
        await database.getUserPlan(session.user.id);
      }
      
      console.log('✅ User session restored');
    } else {
      console.log('ℹ️ No active session');
    }
  } catch (error) {
    console.error('Session initialization error:', error);
  }
});

// Handle OAuth redirect
async function handleOAuthRedirect() {
  try {
    console.log('🔄 Processing OAuth redirect...');
    
    // Get session from Supabase
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ OAuth session error:', error);
      alert('Google sign-in failed: ' + error.message);
      return;
    }
    
    if (!session?.user) {
      console.error('❌ No user session found after OAuth');
      alert('Google sign-in failed: No user session found');
      return;
    }
    
    console.log('✅ OAuth session found, syncing with backend...');
    
    // Sync with backend to ensure user is in all tables
    const response = await fetch('https://halaxa-backend.onrender.com/api/auth/oauth-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supabaseToken: session.access_token })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ Backend sync failed:', result);
      alert('Google sign-in failed: ' + (result.error || 'Backend sync failed'));
      return;
    }
    
    console.log('✅ Backend sync successful');
    
    // Store ALL session data properly (same as normal signup) - safely
    if (result.user) {
      safeSetItem('user', JSON.stringify(result.user));
      safeSetItem('userPlan', result.user.plan || 'basic');
    }
    
    if (result.accessToken) {
      safeSetItem('accessToken', result.accessToken);
    }
    if (result.refreshToken) {
      safeSetItem('refreshToken', result.refreshToken);
    }
    
    // Mark user as active (critical for authentication checks)
    safeSetItem('userActive', 'true');
    safeSetItem('isPreview', 'false');
    
    // Clean up any old session data
    safeRemoveItem('sellerId');
    safeRemoveItem('halaxa_token');
    safeRemoveItem('token');
    
    console.log('✅ Session data stored successfully');
    
    // Clean up URL
    const url = new URL(window.location);
    url.searchParams.delete('oauth');
    window.history.replaceState({}, document.title, url.toString());
    
    // Show success message before redirect
    const successMsg = document.createElement('div');
    successMsg.style.cssText = `
      position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
      background: #10b981; color: white; padding: 12px 24px;
      border-radius: 8px; z-index: 10000; font-family: system-ui;
    `;
    successMsg.textContent = '✅ Google sign-in successful! Redirecting to dashboard...';
    document.body.appendChild(successMsg);
    
    // Trigger a page refresh to initialize the dashboard properly (only if not on payment link page)
    setTimeout(() => {
      document.body.removeChild(successMsg);
      if (!isPaymentLinkPage()) {
        window.location.reload();
      }
    }, 1500);
    
  } catch (error) {
    console.error('❌ OAuth redirect handling failed:', error);
    alert('Google sign-in failed: ' + error.message);
  }
}

// Listen for auth changes
auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event);
  
  if (event === 'SIGNED_IN' && session?.user) {
    // ⚠️ DEV WARNING: session.user.id is Supabase Auth UUID - use for user_id in dashboard tables
    console.log(`🔐 Auth state change - user ID: ${session.user.id.substring(0, 8)}**** (use for user_id fields)`);
    
    // Update user data
    localStorage.setItem('user', JSON.stringify({
      id: session.user.id,
      email: session.user.email,
      ...session.user.user_metadata
    }));
    
    // Get user plan
    database.getUserPlan(session.user.id);
    
    // Trigger custom event
    window.dispatchEvent(new CustomEvent('userSignedIn', { 
      detail: { user: session.user } 
    }));
  } else if (event === 'SIGNED_OUT') {
    // Clear data
    localStorage.removeItem('user');
    localStorage.removeItem('userPlan');
    
    // Trigger custom event
    window.dispatchEvent(new CustomEvent('userSignedOut'));
  }
});

// ==================== GLOBAL AUTH REDIRECT LISTENER ==================== //

// Helper: Get backend JWT and redirect to personalized dashboard
async function handlePostAuthRedirect(session) {
  if (!session || !session.user || !session.access_token) return;
  try {
    // Call backend to sync user and get backend JWT
    const response = await fetch('https://halaxa-backend.onrender.com/api/auth/oauth-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supabaseToken: session.access_token })
    });
    const result = await response.json();
    if (!response.ok || !result.accessToken || !result.user) throw new Error(result.error || 'OAuth sync failed');
    // Store backend JWTs (safely)
    safeSetItem('accessToken', result.accessToken);
    if (result.refreshToken) safeSetItem('refreshToken', result.refreshToken);
    safeSetItem('userActive', 'true');
    safeSetItem('user', JSON.stringify(result.user));
    
    // Only redirect if not on a payment link page
    if (!isPaymentLinkPage()) {
      // Redirect to personalized dashboard (correct format)
      window.location.href = `/SPA.html?userid=${result.user.id}`;
    }
  } catch (err) {
    // Optionally show error UI
    console.error('OAuth sync failed:', err);
    alert('Google sign-in failed: ' + (err.message || 'OAuth sync failed.'));
  }
}

// Listen for all auth state changes (including Google OAuth)
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session && session.user) {
    // Only redirect if not already on the dashboard AND not on a payment link page
    if (!window.location.pathname.startsWith('/spa') && !isPaymentLinkPage()) {
      await handlePostAuthRedirect(session);
    }
  }
});

// Export a helper for Google sign-in via backend
export async function signInWithGoogle() {
  try {
    console.log('🔄 Initiating Google OAuth via backend...');
    
    // Redirect to backend Google OAuth endpoint
    const googleAuthUrl = 'https://halaxa-backend.onrender.com/api/auth/google';
    window.location.href = googleAuthUrl;
    
    return { success: true };
  } catch (error) {
    console.error('❌ Google OAuth initiation failed:', error);
    throw error;
  }
}

// Alternative: Direct Supabase Google OAuth (fallback)
export async function signInWithGoogleDirect() {
  try {
    const redirectTo = window.location.origin + '/SPA.html';
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Direct Google OAuth failed:', error);
    throw error;
  }
}

// ==================== EXPORT FOR GLOBAL USE ==================== //

// Make available globally
window.supabase = supabase;
window.supabaseAuth = auth;
window.supabaseRealtime = realtime;
window.supabaseDatabase = database;

console.log('🚀 Frontend Supabase client initialized');

// CORS Configuration Notice
console.log('🔧 CORS CONFIGURATION NEEDED:');
console.log('📍 Go to: https://supabase.com/dashboard/project/srdznitapqluldldkqsk/settings/api');
console.log('🌐 Add these allowed origins in CORS settings:');
console.log('   - https://halaxapay.com');
console.log('   - https://www.halaxapay.com');
console.log('   - http://localhost:*');
console.log('   - file://*');
console.log('💡 Using backend proxy for auth to avoid CORS issues until configured'); 