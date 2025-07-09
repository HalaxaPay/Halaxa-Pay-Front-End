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
  }
});

// ==================== AUTHENTICATION HELPERS ==================== //

export const auth = {
  // Sign up user
  async signUp(email, password, userData = {}) {
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
        .from('user_plans')
        .select('plan_type, started_at, next_billing')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      const plan = data?.plan_type || 'basic';
      localStorage.setItem('userPlan', plan);
      
      return { success: true, plan, data };
    } catch (error) {
      console.error('Error fetching user plan:', error);
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

// ==================== INITIALIZATION ==================== //

// Initialize auth state on load
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Check for existing session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      // Store user data
      localStorage.setItem('user', JSON.stringify({
        id: session.user.id,
        email: session.user.email,
        ...session.user.user_metadata
      }));
      
      // Get user plan
      await database.getUserPlan(session.user.id);
      
      console.log('✅ User session restored');
    } else {
      console.log('ℹ️ No active session');
    }
  } catch (error) {
    console.error('Session initialization error:', error);
  }
});

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
    // Store backend JWTs
    localStorage.setItem('accessToken', result.accessToken);
    if (result.refreshToken) localStorage.setItem('refreshToken', result.refreshToken);
    localStorage.setItem('userActive', 'true');
    localStorage.setItem('user', JSON.stringify(result.user));
    // Redirect to personalized dashboard
    window.location.href = `/spa/${result.user.id}`;
  } catch (err) {
    // Optionally show error UI
    console.error('OAuth sync failed:', err);
    alert('Google sign-in failed: ' + (err.message || 'OAuth sync failed.'));
  }
}

// Listen for all auth state changes (including Google OAuth)
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session && session.user) {
    // Only redirect if not already on the dashboard
    if (!window.location.pathname.startsWith('/spa')) {
      await handlePostAuthRedirect(session);
    }
  }
});

// Export a helper for Google sign-in with redirectTo
export async function signInWithGoogle() {
  const redirectTo = 'https://halaxapay.com/login.html'; // After Google, return to login page for JWT sync
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo }
  });
  if (error) throw error;
  return data;
}

// ==================== EXPORT FOR GLOBAL USE ==================== //

// Make available globally
window.supabase = supabase;
window.supabaseAuth = auth;
window.supabaseRealtime = realtime;
window.supabaseDatabase = database;

console.log('🚀 Frontend Supabase client initialized'); 