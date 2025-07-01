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
        blockedPages: ['capital-page', 'orders-page', 'automation-page'],
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
        blockedPages: ['orders-page', 'automation-page'],
        features: {
          advancedAnalytics: true,
          multipleWallets: true,
          customBranding: false,
          prioritySupport: true,
          automations: false
        }
      },
      elite: {
        maxPaymentLinks: Infinity,
        maxMonthlyVolume: Infinity,
        allowedNetworks: ['polygon', 'solana', 'tron'],
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
  }

  // ==================== USER PLAN DETECTION ==================== //

  async getCurrentUser() {
    try {
      // Get current user from localStorage or session
      const userData = localStorage.getItem('user');
      if (!userData) return null;

      this.currentUser = JSON.parse(userData);
      
      // Fetch user plan from Supabase
      const { data: userPlan, error } = await supabase
        .from('user_plans')
        .select('plan_type, started_at, next_billing, auto_renewal')
        .eq('user_id', this.currentUser.id)
        .single();

      if (error || !userPlan) {
        this.userPlan = 'basic'; // Default to basic
      } else {
        this.userPlan = userPlan.plan_type || 'basic';
      }

      console.log(`🔐 User plan detected: ${this.userPlan}`);
      return this.userPlan;

    } catch (error) {
      console.error('Error fetching user plan:', error);
      this.userPlan = 'basic';
      return 'basic';
    }
  }

  getCurrentPlan() {
    return this.userPlan || 'basic';
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
      solana: limits.allowedNetworks.includes('solana'),
      tron: limits.allowedNetworks.includes('tron')
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
          tooltip.textContent = network === 'solana' 
            ? 'Upgrade to Pro or Elite to enable Solana network.' 
            : 'Upgrade to Elite to enable Tron network.';
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
    // DISABLED: This method was interfering with Elite user navigation
    // Access control is now handled by the locked-feature class system in SPA.js
    const plan = this.getCurrentPlan();
    console.log(`🔐 Page access control disabled for ${plan} users - using SPA.js navigation system`);
    return;
  }

  redirectToPlans() {
    console.log('🔒 Redirecting to plans page within SPA...');
    navigateToPlansPage();
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
  
  // Find the plans navigation item and click it
  const plansNavItem = document.querySelector('[data-page="plans-page"]');
  if (plansNavItem) {
    plansNavItem.click();
    console.log('✅ Plans page navigation triggered');
  } else {
    console.error('❌ Plans nav item not found - triggering manual navigation');
    
    // Fallback: manually trigger page transition
    const allPages = document.querySelectorAll('.page-content');
    const plansPage = document.getElementById('plans-page');
    
    if (plansPage) {
      // Hide all pages by removing .active-page only
      allPages.forEach(page => {
        page.classList.remove('active-page');
      });
      
      // Show plans page
      plansPage.classList.add('active-page');
      
      // Update nav items
      const allNavItems = document.querySelectorAll('.nav-item');
      allNavItems.forEach(item => item.classList.remove('active'));
      
      // Try to find and activate the plans nav item
      const plansNavItems = document.querySelectorAll('.nav-item');
      const correctNavItem = Array.from(plansNavItems).find(item => 
        item.textContent.toLowerCase().includes('plan') || 
        item.dataset.page === 'plans-page'
      );
      if (correctNavItem) {
        correctNavItem.classList.add('active');
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

// Auto-update usage displays every 30 seconds
setInterval(() => {
  halaxaAccessControl.updateUsageDisplay();
}, 30000);

console.log('🔐 Halaxa Access Control System loaded successfully'); 