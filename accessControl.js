import { supabase } from './supabase-client.js';

// ==================== HALAXA ACCESS CONTROL SYSTEM ==================== //

/**
 * Access Control and Feature Restriction System
 * Manages permissions based on user subscription plans: basic, pro, elite
 */

class HalaxaAccessControl {
  constructor() {
    this.currentUser = null;
    this.userPlan = null;
    this.planLimits = {
      basic: {
        maxPaymentLinks: 1,
        maxMonthlyVolume: 500,
        allowedNetworks: ['polygon'],
        blockedPages: ['capital-page', 'automation-page'],
        features: {
          advancedAnalytics: false,
          multipleWallets: false,
          customBranding: false,
          prioritySupport: false,
          automations: false
        }
      },
      pro: {
        maxPaymentLinks: 30,
        maxMonthlyVolume: 30000,
        allowedNetworks: ['polygon', 'solana'],
        blockedPages: [],
        features: {
          advancedAnalytics: true,
          multipleWallets: true,
          customBranding: false,
          prioritySupport: true,
          automations: true
        }
      },
      elite: {
        maxPaymentLinks: Infinity,
        maxMonthlyVolume: Infinity,
        allowedNetworks: ['polygon', 'solana'],
        blockedPages: [],
        features: {
          advancedAnalytics: true,
          multipleWallets: true,
          customBranding: true,
          prioritySupport: true,
          automations: true
        }
      }
    };
    
    this.init();
  }

  async init() {
    await this.getCurrentUser();
    this.setupPageAccessControl();
    this.setupNetworkRestrictions();
    
    // Apply visual locks based on plan
    this.applyVisualLocks();
    
    // Load home page by default
    this.loadPage('home-page');
    
    console.log('🔐 Access control initialized for plan:', this.userPlan);
  }
  
  applyVisualLocks() {
    const plan = this.getCurrentPlan();
    const limits = this.getPlanLimits(plan);
    
    console.log(`🎨 Applying visual locks for ${plan} plan`);
    
    // Add locked class to nav items for blocked pages
    const navItems = document.querySelectorAll('.nav-item, .mobile-nav-item');
    navItems.forEach(navItem => {
      const pageId = navItem.dataset.page;
      
      if (limits.blockedPages.includes(pageId)) {
        navItem.classList.add('locked-feature');
        console.log(`🔒 Locked nav item: ${pageId}`);
      } else {
        navItem.classList.remove('locked-feature');
        console.log(`✅ Unlocked nav item: ${pageId}`);
      }
    });
  }

  // ==================== USER PLAN DETECTION ==================== //

  async getCurrentUser() {
    try {
      // Get current user from localStorage or session
      const userData = localStorage.getItem('user');
      if (!userData) {
        console.log('⚠️ No user data in localStorage');
        return null;
      }

      this.currentUser = JSON.parse(userData);
      
      // 🔍 DEBUG: Show exactly what we're querying
      console.log('🔍 DEBUG: Access Control initialization:');
      console.log('👤 User ID being queried:', this.currentUser.id?.substring(0, 8) + '****');
      console.log('📧 User email:', this.currentUser.email);
      
      // Try multiple sources for user plan - backend API first, then database
      this.userPlan = await this.getUserPlanFromMultipleSources();
      
      console.log(`🔐 Final user plan detected: ${this.userPlan}`);
      return this.userPlan;

    } catch (error) {
      console.error('❌ Error fetching user plan:', error);
      this.userPlan = 'basic';
      return 'basic';
    }
  }

  async getUserPlanFromMultipleSources() {
    // Source 1: Check localStorage first (fastest)
    const cachedPlan = localStorage.getItem('userPlan');
    if (cachedPlan && ['basic', 'pro', 'elite'].includes(cachedPlan)) {
      console.log('✅ Using cached plan:', cachedPlan);
      return cachedPlan;
    }

    // Source 2: Try backend API (most reliable)
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        console.log('🔄 Fetching plan from backend API...');
        const response = await fetch('https://halaxa-backend.onrender.com/api/account/profile', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000 // 5 second timeout
        });

        if (response.ok) {
          const profile = await response.json();
          const plan = profile.plan || 'basic';
          console.log('✅ Plan from backend API:', plan);
          localStorage.setItem('userPlan', plan); // Cache it
          return plan;
        }
      }
    } catch (apiError) {
      console.log('⚠️ Backend API failed:', apiError.message);
    }

    // Source 3: Try direct Supabase query (fallback)
    try {
      console.log('🔄 Trying direct database query...');
      const { data: userSubscription, error } = await supabase
        .from('user_subscriptions')
        .select('plan_tier')
        .eq('user_id', this.currentUser.id)
        .maybeSingle(); // Use maybeSingle to handle no results gracefully

      if (!error && userSubscription) {
        const plan = userSubscription.plan_tier || 'basic';
        console.log('✅ Plan from database:', plan);
        localStorage.setItem('userPlan', plan); // Cache it
        return plan;
      } else if (error) {
        console.log('⚠️ Database query error:', error.message);
      }
    } catch (dbError) {
      console.log('⚠️ Database query failed:', dbError.message);
    }

    // Source 4: Check user data in localStorage (fallback)
    if (this.currentUser.plan && ['basic', 'pro', 'elite'].includes(this.currentUser.plan)) {
      console.log('✅ Using plan from user data:', this.currentUser.plan);
      localStorage.setItem('userPlan', this.currentUser.plan);
      return this.currentUser.plan;
    }

    // Final fallback
    console.log('⚠️ All sources failed, defaulting to basic');
    localStorage.setItem('userPlan', 'basic');
    return 'basic';
  }

  // ==================== FORCE PLAN REFRESH ==================== //
  
  async forceRefreshUserPlan() {
    console.log('🔄 FORCE REFRESH: Clearing all plan caches and fetching fresh data...');
    
    // Clear ALL caches - more comprehensive
    localStorage.removeItem('userPlan');
    localStorage.removeItem('user'); // Clear user data cache too
    
    // Clear any other potential cache keys
    const cacheKeys = ['userPlan', 'user', 'accessToken', 'userActive'];
    cacheKeys.forEach(key => localStorage.removeItem(key));
    
    // Try backend API first (most reliable)
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        console.log('🔄 Force refreshing plan from backend API...');
        const response = await fetch('https://halaxa-backend.onrender.com/api/account/refresh-plan', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });

        if (response.ok) {
          const result = await response.json();
          const plan = result.plan || 'basic';
          console.log('✅ Fresh plan from backend API:', plan);
          localStorage.setItem('userPlan', plan);
          this.userPlan = plan;
          
          // Re-apply restrictions with new plan
          this.setupPageAccessControl();
          this.applyVisualLocks();
          
          return plan;
        }
      }
    } catch (apiError) {
      console.log('⚠️ Backend API force refresh failed:', apiError.message);
    }
    
    // Fallback to direct database query
    try {
      console.log('🔄 Force refreshing plan from database...');
      const { data: userSubscription, error } = await supabase
        .from('user_subscriptions')
        .select('plan_tier')
        .eq('user_id', this.currentUser.id)
        .maybeSingle();

      if (!error && userSubscription) {
        const plan = userSubscription.plan_tier || 'basic';
        console.log('✅ Fresh plan from database:', plan);
        localStorage.setItem('userPlan', plan);
        this.userPlan = plan;
        
        // Re-apply restrictions with new plan
        this.setupPageAccessControl();
        this.applyVisualLocks();
        
        return plan;
      } else if (error) {
        console.log('⚠️ Force refresh database error:', error.message);
      }
    } catch (dbError) {
      console.log('⚠️ Force refresh database failed:', dbError.message);
    }
    
    // Final fallback to basic
    console.log('⚠️ Force refresh failed, defaulting to basic');
    localStorage.setItem('userPlan', 'basic');
    this.userPlan = 'basic';
    return 'basic';
  }

  // ==================== MANUAL CACHE CLEARING ==================== //
  
  // Manual cache clearing function (for admin/testing)
  clearAllCaches() {
    console.log('🗑️ MANUAL CACHE CLEAR: Clearing all caches...');
    
    // Clear localStorage caches
    const keysToRemove = [
      'userPlan',
      'user', 
      'accessToken',
      'userActive',
      'userProfile',
      'userMetrics',
      'dashboardData'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`🗑️ Removed ${key} from localStorage`);
    });
    
    // Force reload user data
    this.currentUser = null;
    this.userPlan = null;
    
    console.log('✅ All caches cleared successfully');
    return true;
  }

  // ==================== DEBUG PLAN DETECTION ==================== //
  
  // Debug function to show all plan sources
  async debugPlanDetection() {
    console.log('🔍 DEBUG: Checking all plan sources...');
    
    const debugInfo = {
      localStorage: localStorage.getItem('userPlan'),
      userObject: null,
      backendAPI: null,
      database: null,
      finalPlan: null
    };
    
    // Check user object
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      debugInfo.userObject = user.plan;
    }
    
    // Check backend API
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        const response = await fetch('https://halaxa-backend.onrender.com/api/account/profile', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          const profile = await response.json();
          debugInfo.backendAPI = profile.plan;
        }
      }
    } catch (error) {
      debugInfo.backendAPI = `Error: ${error.message}`;
    }
    
    // Check database directly
    try {
      const { data: userSubscription, error } = await supabase
        .from('user_subscriptions')
        .select('plan_tier')
        .eq('user_id', this.currentUser?.id)
        .maybeSingle();
      
      debugInfo.database = userSubscription?.plan_tier || 'No data';
    } catch (error) {
      debugInfo.database = `Error: ${error.message}`;
    }
    
    // Get final plan
    debugInfo.finalPlan = await this.getUserPlanFromMultipleSources();
    
    console.log('🔍 Plan Detection Debug Info:', debugInfo);
    return debugInfo;
  }

  // ==================== BACKEND PLAN REFRESH ==================== //
  
  async refreshPlanFromBackend() {
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        console.log('⚠️ No access token available for backend refresh');
        return false;
      }
      
      console.log('🔄 Calling backend plan refresh endpoint...');
      const response = await fetch('https://halaxa-backend.onrender.com/api/account/refresh-plan', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Backend plan refresh successful:', result);
        return true;
      } else {
        console.log('⚠️ Backend plan refresh failed:', response.status);
        return false;
      }
    } catch (error) {
      console.log('⚠️ Backend plan refresh error:', error.message);
      return false;
    }
  }

  getCurrentPlan() {
    return this.userPlan || 'basic';
  }

  // Force refresh plan from backend (for when plan changes)
  async refreshPlanFromBackend() {
    try {
      console.log('🔄 Force refreshing plan from backend...');
      localStorage.removeItem('userPlan'); // Clear cache
      this.userPlan = await this.getUserPlanFromMultipleSources();
      this.applyVisualLocks(); // Re-apply locks with new plan
      console.log('✅ Plan refreshed:', this.userPlan);
      return this.userPlan;
    } catch (error) {
      console.error('❌ Failed to refresh plan:', error);
      return 'basic';
    }
  }

  getPlanLimits(plan = null) {
    const userPlan = plan || this.getCurrentPlan();
    return this.planLimits[userPlan] || this.planLimits.basic;
  }

  // ==================== PAYMENT LINK RESTRICTIONS ==================== //

  async canCreatePaymentLink() {
    try {
      const plan = this.getCurrentPlan();
      const limits = this.getPlanLimits(plan);

      // Check current active payment links
      const { data: activeLinks, error } = await supabase
        .from('payment_links')
        .select('id')
        .eq('user_id', this.currentUser.id)
        .eq('is_active', true);

      if (error) throw error;

      const currentLinkCount = activeLinks?.length || 0;

      if (currentLinkCount >= limits.maxPaymentLinks) {
        return {
          allowed: false,
          reason: 'payment_link_limit',
          message: `${plan.toUpperCase()} plan allows only ${limits.maxPaymentLinks} active link${limits.maxPaymentLinks > 1 ? 's' : ''}. Upgrade for more.`,
          current: currentLinkCount,
          limit: limits.maxPaymentLinks
        };
      }

      return {
        allowed: true,
        current: currentLinkCount,
        limit: limits.maxPaymentLinks
      };

    } catch (error) {
      console.error('Error checking payment link limit:', error);
      return {
        allowed: false,
        reason: 'error',
        message: 'Unable to verify payment link limits. Please try again.'
      };
    }
  }

  async checkMonthlyVolumeLimit() {
    try {
      const plan = this.getCurrentPlan();
      const limits = this.getPlanLimits(plan);

      // Get current month's transactions
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const { data: monthlyTxs, error } = await supabase
        .from('transactions')
        .select('amount_usdc, direction')
        .eq('user_id', this.currentUser.id)
        .eq('direction', 'in')
        .gte('created_at', monthStart.toISOString());

      if (error) throw error;

      const currentVolume = monthlyTxs?.reduce((sum, tx) => sum + (tx.amount_usdc || 0), 0) || 0;

      if (currentVolume >= limits.maxMonthlyVolume) {
        return {
          allowed: false,
          reason: 'volume_limit',
          message: `${plan.toUpperCase()} plan allows max ${limits.maxMonthlyVolume} USDC monthly volume. Upgrade for higher limits.`,
          current: currentVolume,
          limit: limits.maxMonthlyVolume
        };
      }

      return {
        allowed: true,
        current: currentVolume,
        limit: limits.maxMonthlyVolume,
        remaining: limits.maxMonthlyVolume - currentVolume
      };

    } catch (error) {
      console.error('Error checking volume limit:', error);
      return {
        allowed: false,
        reason: 'error',
        message: 'Unable to verify volume limits. Please try again.'
      };
    }
  }

  // ==================== NETWORK ACCESS CONTROL ==================== //

  isNetworkAllowed(network) {
    const limits = this.getPlanLimits();
    return limits.allowedNetworks.includes(network.toLowerCase());
  }

  getNetworkRestrictions() {
    const plan = this.getCurrentPlan();
    const limits = this.getPlanLimits(plan);
    
    return {
      polygon: true, // Always available
      solana: limits.allowedNetworks.includes('solana')
    };
  }

  setupNetworkRestrictions() {
    const restrictions = this.getNetworkRestrictions();
    
    // Apply restrictions to network selection UI
    const networkSelectors = document.querySelectorAll('[data-network]');
    
    networkSelectors.forEach(selector => {
      const network = selector.dataset.network;
      
      if (!restrictions[network]) {
        selector.classList.add('network-locked');
        selector.setAttribute('disabled', 'true');
        
        // Add tooltip only
        if (!selector.querySelector('.network-tooltip')) {
          const tooltip = document.createElement('div');
          tooltip.className = 'network-tooltip';
          tooltip.textContent = 'Upgrade to Pro or Elite to enable Solana network.';
          selector.appendChild(tooltip);
        }
      }
    });
  }

  // ==================== PAGE ACCESS CONTROL ==================== //

  isPageAllowed(pathname) {
    const limits = this.getPlanLimits();
    return !limits.blockedPages.some(blockedPage => pathname.includes(blockedPage));
  }

  setupPageAccessControl() {
    const plan = this.getCurrentPlan();
    const limits = this.getPlanLimits(plan);
    
    console.log(`🔐 Setting up page access control for plan: ${plan}`);
    console.log(`🔐 Blocked pages:`, limits.blockedPages);
    
    // Setup navigation event listeners for all nav items
    const navItems = document.querySelectorAll('.nav-item, .mobile-nav-item');
    
    navItems.forEach(navItem => {
      const pageId = navItem.dataset.page;
      
      // Remove any existing click listeners by cloning the element
      const newNavItem = navItem.cloneNode(true);
      navItem.parentNode.replaceChild(newNavItem, navItem);
      
      // Add new click listener with proper plan-based access control
      newNavItem.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent event bubbling
        
        console.log(`🔒 ACCESS CHECK: User (${plan}) trying to access ${pageId}`);
        
        // Check if page is blocked for current plan
        if (limits.blockedPages.includes(pageId)) {
          console.log(`🔒 ACCESS DENIED: Page ${pageId} is locked for ${plan} plan - redirecting to plans`);
          // For locked pages, immediately redirect to plans page
          this.redirectToPlans();
          return;
        }
        
        // Page is allowed - load it normally
        console.log(`✅ ACCESS GRANTED: Loading allowed page: ${pageId} for ${plan} plan`);
        this.loadPage(pageId);
      });
    });
    
    // Also handle direct URL navigation
    this.handleDirectNavigation();
  }
  
  loadPage(pageId) {
    console.log(`🔄 Loading page content for: ${pageId}`);
    console.log(`📋 Current plan: ${this.getCurrentPlan()}`);
    
    // CRITICAL: Check access control before loading page
    const plan = this.getCurrentPlan();
    const limits = this.getPlanLimits(plan);
    
    // Check if page is blocked for current plan
    if (limits.blockedPages.includes(pageId)) {
      console.log(`🔒 ACCESS DENIED: Page ${pageId} is locked for ${plan} plan - redirecting to plans`);
      this.redirectToPlans();
      return;
    }
    
    console.log(`✅ ACCESS GRANTED: Loading page ${pageId} for ${plan} plan`);
    
    // Get all pages
    const allPages = document.querySelectorAll('.page-content');
    console.log(`📄 Total pages found: ${allPages.length}`);
    
    // Hide all pages first
    allPages.forEach(page => {
      page.classList.remove('active-page');
      page.style.display = 'none';
    });
    
    // Show target page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
      targetPage.style.display = 'block';
      targetPage.classList.add('active-page');
      console.log(`✅ Page ${pageId} loaded successfully`);
    } else {
      console.error(`❌ Page ${pageId} not found`);
    }
    
    // Update navigation active state
    document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(nav => {
      nav.classList.remove('active');
      if (nav.dataset.page === pageId) {
        nav.classList.add('active');
      }
    });
    
    // Initialize page-specific features
    this.initializePageFeatures(pageId);
  }
  
  fixSidebarHeight() {
    // Force sidebar to recalculate height
    const sidebar = document.querySelector('.sidebar');
    const mainLayout = document.querySelector('.main-layout');
    
    if (sidebar && mainLayout) {
      // Force a reflow to ensure proper height calculation
      const height = mainLayout.offsetHeight;
      sidebar.style.minHeight = `${height}px`;
      
      // Also ensure the active page fills the space
      const activePage = document.querySelector('.page-content.active-page');
      if (activePage) {
        activePage.style.minHeight = '100vh';
      }
    }
  }
  
  updateNavigationIndicators(activePageId) {
    // Update desktop navigation
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.classList.remove('active');
      if (item.dataset.page === activePageId) {
        item.classList.add('active');
      }
    });
    
    // Update mobile navigation
    const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
    mobileNavItems.forEach(item => {
      item.classList.remove('active');
      if (item.dataset.page === activePageId) {
        item.classList.add('active');
      }
    });
  }
  
  initializePageFeatures(pageId) {
    // Initialize page-specific features based on the page
    switch (pageId) {
      case 'capital-page':
        console.log('💰 Initializing Capital page features');
        this.initializeCapitalPage();
        break;
      case 'automation-page':
        console.log('🤖 Initializing Automation page features');
        this.initializeAutomationPage();
        break;
      case 'home-page':
        console.log('🏠 Initializing Home page features');
        this.initializeHomePage();
        break;
      case 'plans-page':
        console.log('💳 Initializing Plans page features');
        this.initializePlansPage();
        break;
      default:
        console.log(`📄 Initializing ${pageId} features`);
    }
  }
  
  initializeCapitalPage() {
    // Load capital page data and initialize charts
    console.log('💰 Loading capital page data...');
    
    // Initialize capital page with real data
    if (window.updateCapitalPageWithRealData) {
      // Simulate loading capital data
      const capitalData = {
        has_data: true,
        total_received: 12500,
        total_paid_out: 3200,
        net_flow: 9300
      };
      window.updateCapitalPageWithRealData(capitalData);
    }
    
    // Initialize any capital-specific charts or components
    this.initializeCapitalCharts();
  }
  
  initializeAutomationPage() {
    console.log('🤖 Loading automation page data...');
    
    // Initialize automation page features
    this.initializeWebhookSystem();
  }
  
  initializeHomePage() {
    console.log('🏠 Loading home page data...');
    
    // Initialize home page features
    if (window.initializeAllEngineFeatures) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      window.initializeAllEngineFeatures(user.id);
    }
  }
  
  initializeCapitalCharts() {
    // Initialize any charts on the capital page
    console.log('📊 Initializing capital charts...');
  }
  
  initializePlansPage() {
    console.log('💳 Loading plans page...');
    
    // Initialize pricing toggle if it exists
    if (window.initializePricingToggle) {
      window.initializePricingToggle();
    }
    
    // Initialize plan upgrade buttons if they exist
    if (window.initializePlanUpgrades) {
      window.initializePlanUpgrades();
    }
    
    // Update current plan display
    const currentPlan = this.getCurrentPlan();
    if (window.updatePlanDisplay) {
      window.updatePlanDisplay(currentPlan);
    }
  }
  
  updateOrdersMetrics(data) {
    // Update orders page metrics
    const metricElements = document.querySelectorAll('[data-orders-metric]');
    metricElements.forEach(element => {
      const metric = element.dataset.ordersMetric;
      if (data[metric]) {
        element.textContent = data[metric];
      }
    });
  }
  
  initializeWebhookSystem() {
    // Initialize webhook system for automation page
    console.log('🔌 Initializing webhook system...');
    
    const connectBtn = document.getElementById('connect-webhook-btn');
    if (connectBtn) {
      connectBtn.addEventListener('click', () => {
        this.handleWebhookConnection();
      });
    }
  }
  
  handleWebhookConnection() {
    console.log('🔌 Handling webhook connection...');
    
    const webhookUrl = document.getElementById('webhook-url').value;
    if (webhookUrl) {
      // Simulate webhook connection
      const successMessage = document.getElementById('webhook-success');
      if (successMessage) {
        successMessage.style.display = 'block';
      }
      
      // Update status
      const statusIndicator = document.querySelector('[data-webhook-status]');
      if (statusIndicator) {
        statusIndicator.innerHTML = `
          <div class="status-dot connected"></div>
          <span class="status-text">Connected</span>
        `;
      }
    }
  }
  
  handleDirectNavigation() {
    // Handle direct URL navigation (e.g., if someone bookmarks a page)
    const currentPage = document.querySelector('.page-content.active-page');
    if (currentPage) {
      const pageId = currentPage.id;
      const plan = this.getCurrentPlan();
      const limits = this.getPlanLimits(plan);
      
      if (limits.blockedPages.includes(pageId)) {
        console.log(`🔒 Direct navigation blocked to ${pageId} for ${plan} plan`);
        // Instantly redirect to plans page instead of showing modal
        this.redirectToPlans();
        return;
      }
    }
  }
  
  // ==================== VISUAL LOCKS AND BADGES ==================== //



  applyPlanBadges(plan) {
    // Add current plan badge to header or profile
    const profileSection = document.querySelector('.profile, .user-info, .header-user');
    
    if (profileSection && !profileSection.querySelector('.current-plan-badge')) {
      const planBadge = document.createElement('span');
      planBadge.className = `current-plan-badge plan-${plan}`;
      planBadge.textContent = plan.toUpperCase();
      profileSection.appendChild(planBadge);
    }
  }

  // ==================== FEATURE ACCESS CONTROL ==================== //

  hasFeature(featureName) {
    const limits = this.getPlanLimits();
    return limits.features[featureName] || false;
  }

  checkFeatureAccess(featureName) {
    const hasAccess = this.hasFeature(featureName);
    
    if (!hasAccess) {
      const plan = this.getCurrentPlan();
      const requiredPlan = featureName === 'customBranding' ? 'Elite' : 'Pro';
      
      return {
        allowed: false,
        reason: 'feature_restricted',
        message: `${featureName} requires ${requiredPlan} plan. Current plan: ${plan.toUpperCase()}`,
        requiredPlan
      };
    }
    
    return { allowed: true };
  }

  // ==================== PAYMENT CREATION WRAPPER ==================== //

  async validatePaymentCreation(paymentData) {
    const checks = [];
    
    // Check payment link limit
    const linkCheck = await this.canCreatePaymentLink();
    checks.push(linkCheck);
    
    // Check monthly volume
    const volumeCheck = await this.checkMonthlyVolumeLimit();
    checks.push(volumeCheck);
    
    // Check network access
    if (paymentData.network && !this.isNetworkAllowed(paymentData.network)) {
      checks.push({
        allowed: false,
        reason: 'network_restricted',
        message: `${paymentData.network.toUpperCase()} network requires ${paymentData.network === 'solana' ? 'Pro or Elite' : 'Elite'} plan.`
      });
    }
    
    // Return first failed check or success
    const failedCheck = checks.find(check => !check.allowed);
    return failedCheck || { allowed: true, checks };
  }

  // ==================== UI HELPER METHODS ==================== //

  showAccessDeniedMessage(restriction) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'access-denied-message';
    messageDiv.innerHTML = `
      <div class="access-denied-content">
        <h4>Upgrade Required</h4>
        <p>${restriction.message}</p>
        <button class="btn-upgrade-inline" onclick="window.location.href='/plans.html'">
          Upgrade Plan
        </button>
      </div>
    `;
    
    // Show message for 5 seconds
    document.body.appendChild(messageDiv);
    setTimeout(() => {
      messageDiv.remove();
    }, 5000);
  }

  updateUsageDisplay() {
    // Update payment links usage
    this.canCreatePaymentLink().then(result => {
      const linkUsageElement = document.querySelector('.payment-links-usage');
      if (linkUsageElement && result.limit !== Infinity) {
        linkUsageElement.textContent = `${result.current}/${result.limit} payment links used`;
      }
    });
    
    // Update volume usage
    this.checkMonthlyVolumeLimit().then(result => {
      const volumeUsageElement = document.querySelector('.volume-usage');
      if (volumeUsageElement && result.limit !== Infinity) {
        const percentage = (result.current / result.limit) * 100;
        volumeUsageElement.innerHTML = `
          <div class="usage-bar">
            <div class="usage-fill" style="width: ${Math.min(percentage, 100)}%"></div>
          </div>
          <span>${result.current.toFixed(2)}/${result.limit} USDC used this month</span>
        `;
      }
    });
  }

  // ==================== PUBLIC API ==================== //

  // Export methods for external use
  async checkPermission(action, data = {}) {
    switch (action) {
      case 'create_payment_link':
        return await this.validatePaymentCreation(data);
      case 'access_page':
        return { allowed: this.isPageAllowed(data.path) };
      case 'use_network':
        return { allowed: this.isNetworkAllowed(data.network) };
      case 'use_feature':
        return this.checkFeatureAccess(data.feature);
      default:
        return { allowed: true };
    }
  }

  getUserPlanInfo() {
    const plan = this.getCurrentPlan();
    const limits = this.getPlanLimits(plan);
    
    return {
      plan,
      limits,
      features: limits.features,
      restrictions: {
        blockedPages: limits.blockedPages,
        allowedNetworks: limits.allowedNetworks
      }
    };
  }

  redirectToPlans() {
    console.log('🔒 Redirecting to plans page within SPA...');
    // Load the plans page directly using our loadPage method
    this.loadPage('plans-page');
  }
}

// ==================== CSS STYLES ==================== //

const accessControlStyles = `
  /* Page Locks and Blurs */
  .page-locked {
    pointer-events: none;
  }
  
  .blurred {
    filter: blur(3px);
    opacity: 0.6;
  }
  
  /* Plan Badges */
  .plan-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: bold;
    color: white;
    z-index: 100;
    text-transform: uppercase;
  }
  
  .badge-pro {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    box-shadow: 0 2px 10px rgba(102, 126, 234, 0.3);
  }
  
  .badge-elite {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    box-shadow: 0 2px 10px rgba(240, 147, 251, 0.3);
  }
  
  /* Current Plan Badge */
  .current-plan-badge {
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 10px;
    font-weight: bold;
    color: white;
    margin-left: 8px;
  }
  
  .plan-basic {
    background: #6c757d;
  }
  
  .plan-pro {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }
  
  .plan-elite {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  }
  
  /* Network Restrictions */
  .network-locked {
    filter: grayscale(100%) blur(1px);
    opacity: 0.5;
    cursor: not-allowed;
  }
  

  
  .network-tooltip {
    position: absolute;
    bottom: -30px;
    left: 50%;
    transform: translateX(-50%);
    background: #333;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 10px;
    white-space: nowrap;
    opacity: 0;
    transition: opacity 0.3s;
    z-index: 20;
  }
  
  .network-locked:hover .network-tooltip {
    opacity: 1;
  }
  
  /* Upgrade Modal */
  .upgrade-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  
  .upgrade-modal {
    background: white;
    border-radius: 12px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  }
  
  .upgrade-modal-header {
    padding: 20px;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .upgrade-modal-body {
    padding: 20px;
  }
  
  .upgrade-modal-footer {
    padding: 20px;
    border-top: 1px solid #eee;
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }
  
  .btn-upgrade {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
  }
  
  .btn-cancel {
    background: #6c757d;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
  }
  
  /* Access Denied Message */
  .access-denied-message {
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
    z-index: 1000;
    max-width: 300px;
  }
  
  .access-denied-content {
    text-align: center;
  }
  
  .access-denied-icon {
    font-size: 30px;
    margin-bottom: 10px;
  }
  
  /* Usage Displays */
  .usage-bar {
    width: 100%;
    height: 8px;
    background: #e9ecef;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 5px;
  }
  
  .usage-fill {
    height: 100%;
    background: linear-gradient(90deg, #28a745, #ffc107, #dc3545);
    transition: width 0.3s ease;
  }
  
  /* Locked Page Links */
  .locked-page-link {
    position: relative;
    opacity: 0.6;
  }
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = accessControlStyles;
document.head.appendChild(styleSheet);

// ==================== NAVIGATION HELPERS ==================== //

// Navigate to plans page within SPA
function navigateToPlansPage() {
  console.log('🚀 Navigating to plans page within SPA...');
  
  // Use the access control instance to properly load the plans page
  if (window.accessControl) {
    // This will properly hide current page and show plans page
    window.accessControl.loadPage('plans-page');
    console.log('✅ Plans page loaded via access control');
  } else {
    console.error('❌ Access control not available - trying fallback');
    
    // Fallback: manually trigger page transition
    const allPages = document.querySelectorAll('.page-content');
    const plansPage = document.getElementById('plans-page');
    
    if (plansPage) {
      // Hide all pages properly
      allPages.forEach(page => {
        page.classList.remove('active-page');
        page.style.display = 'none';
      });
      
      // Show plans page
      plansPage.style.display = 'block';
      plansPage.style.visibility = 'visible';
      plansPage.style.opacity = '1';
      plansPage.classList.add('active-page');
      
      // Update nav items
      const allNavItems = document.querySelectorAll('.nav-item, .mobile-nav-item');
      allNavItems.forEach(item => item.classList.remove('active'));
      
      // Find and activate the plans nav item
      const plansNavItem = document.querySelector('[data-page="plans-page"]');
      if (plansNavItem) {
        plansNavItem.classList.add('active');
      }
      
      console.log('✅ Manual plans page navigation completed');
    } else {
      console.error('❌ Plans page not found in SPA');
    }
  }
}

// ==================== GLOBAL INSTANCE ==================== //

// Create global instance
const halaxaAccessControl = new HalaxaAccessControl();

// Export for module use
export default halaxaAccessControl;

// Make available globally
window.HalaxaAccessControl = halaxaAccessControl;

// ==================== INTEGRATION HELPERS ==================== //

// Helper functions for easy integration
window.checkPaymentPermission = async (paymentData) => {
  return await halaxaAccessControl.validatePaymentCreation(paymentData);
};

window.checkPageAccess = (pathname) => {
  return halaxaAccessControl.isPageAllowed(pathname);
};

window.checkNetworkAccess = (network) => {
  return halaxaAccessControl.isNetworkAllowed(network);
};

window.getUserPlan = () => {
  return halaxaAccessControl.getCurrentPlan();
};

window.getUserPlanInfo = () => {
  return halaxaAccessControl.getUserPlanInfo();
};

// Force refresh user plan (for when plan is changed in Supabase)
window.forceRefreshUserPlan = async () => {
  console.log('🔄 Global force refresh triggered...');
  if (window.HalaxaAccessControl) {
    return await window.HalaxaAccessControl.forceRefreshUserPlan();
  } else {
    console.error('❌ Access control not available');
    return 'basic';
  }
};

// Manual cache clearing (for admin/testing)
window.clearAllCaches = () => {
  console.log('🗑️ Global cache clear triggered...');
  if (window.HalaxaAccessControl) {
    return window.HalaxaAccessControl.clearAllCaches();
  } else {
    console.error('❌ Access control not available');
    return false;
  }
};

// Debug plan detection (for troubleshooting)
window.debugPlanDetection = async () => {
  console.log('🔍 Global plan debug triggered...');
  if (window.HalaxaAccessControl) {
    return await window.HalaxaAccessControl.debugPlanDetection();
  } else {
    console.error('❌ Access control not available');
    return null;
  }
};

// Backend plan refresh (for testing and manual refresh)
window.refreshPlanFromBackend = async () => {
  console.log('🔄 Global backend refresh triggered...');
  if (window.HalaxaAccessControl) {
    return await window.HalaxaAccessControl.refreshPlanFromBackend();
  } else {
    console.error('❌ Access control not available');
    return false;
  }
};

// Combined refresh (backend + frontend)
window.refreshPlanCompletely = async () => {
  console.log('🔄 Complete plan refresh triggered...');
  
  // First refresh backend cache
  const backendSuccess = await window.refreshPlanFromBackend();
  
  // Then refresh frontend
  const newPlan = await window.forceRefreshUserPlan();
  
  return {
    backendSuccess,
    newPlan,
    timestamp: new Date().toISOString()
  };
};

// Auto-update usage displays every 30 seconds
setInterval(() => {
  halaxaAccessControl.updateUsageDisplay();
}, 30000);

console.log('🔐 Halaxa Access Control System loaded successfully'); 