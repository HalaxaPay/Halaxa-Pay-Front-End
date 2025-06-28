// ==================== PREMIUM ANIMATED SPA JAVASCRIPT ==================== //

// BACKEND URL CONFIGURATION - Use environment variable or fallback
const BACKEND_URL = import.meta.env?.VITE_BACKEND_URL || 'https://halaxa-backend.onrender.com';

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the SPA navigation FIRST - this should always work
    initializeSPA();
    
    // Add interactive animations
    initializeAnimations();
    
    // Add floating particles animation
    initializeParticles();
    
    // Add interactive card effects
    initializeCardEffects();
    
    // Initialize user personalization AFTER SPA is ready (non-blocking)
    initializeUserPersonalization().catch(error => {
        console.warn('⚠️ User personalization failed, but SPA still works:', error);
        // Don't redirect to login immediately, let user navigate first
        // They can try to access protected features which will then redirect if needed
    });
});

// ==================== USER PERSONALIZATION ==================== //

async function initializeUserPersonalization() {
    try {
        console.log('🔄 Initializing user personalization...');
        
        // Check for backend authentication tokens (our new auth method)
        const accessToken = localStorage.getItem('accessToken');
        const userActive = localStorage.getItem('userActive');
        const userData = localStorage.getItem('user');
        
        if (!accessToken || !userActive || userActive !== 'true') {
            console.log('❌ No backend authentication found');
            setTimeout(() => {
                console.log('⏰ No authentication - redirecting to login');
                redirectToLogin();
            }, 3000);
            return;
        }
        
        // Parse user data from localStorage
        let user = null;
        try {
            user = userData ? JSON.parse(userData) : null;
        } catch (parseError) {
            console.error('❌ Error parsing user data:', parseError);
        }
        
        if (user) {
            console.log('🔐 Backend authentication found for user:', user.email);
            
            // Update welcome message with user info
            updateWelcomeMessage(user);
            
            // Load personalized data for this user (non-blocking)
            loadPersonalizedData(user).catch(error => {
                console.warn('⚠️ Failed to load personalized data:', error);
                // Continue anyway with basic user data
                updateDashboardWithUserData({}, user);
            });

            // Add detection refresh functionality
            addDetectionRefreshButton();
            
            // Clean up URL (remove any lingering parameters)
            window.history.replaceState({}, document.title, window.location.pathname);
        } else {
            console.log('❌ No user data found');
            setTimeout(() => {
                console.log('⏰ No user data - redirecting to login');
                redirectToLogin();
            }, 3000);
        }
    } catch (error) {
        console.error('❌ Session initialization error:', error);
        console.log('🔧 Continuing with basic functionality...');
        setTimeout(() => {
            if (!localStorage.getItem('userActive')) {
                redirectToLogin();
            }
        }, 5000);
    }
}

function redirectToLogin() {
    // Clear any stored authentication data
    localStorage.removeItem('userActive');
    localStorage.removeItem('user');
    localStorage.removeItem('userPlan');
    
    // Redirect to login page
    window.location.href = 'login.html';
}

function updateWelcomeMessage(user) {
    // Update welcome title to be more personalized
    const welcomeTitle = document.querySelector('.welcome-title');
    if (welcomeTitle && user) {
        // Handle both backend user format and Supabase user format
        const firstName = user.first_name || user.user_metadata?.first_name || user.email?.split('@')[0] || 'User';
        welcomeTitle.textContent = `Welcome back, ${firstName}!`;
    }
}

async function loadPersonalizedData(user) {
    try {
        console.log('🔄 Loading personalized data securely...');
        
        // Get backend authentication token
        const accessToken = localStorage.getItem('accessToken');
        
        if (!accessToken) {
            console.log('❌ No access token found - cannot load personalized data');
            updateDashboardWithUserData({}, user);
            return;
        }
        
        // Load user profile and dashboard data using secure backend API
        try {
            console.log('📡 Attempting to fetch user profile and dashboard data...');
            
            // Fetch profile and dashboard data in parallel
            const [profileResponse, dashboardResponse] = await Promise.all([
                fetch(`${BACKEND_URL}/api/account/profile`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }),
                fetch(`${BACKEND_URL}/api/account/dashboard-data`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                })
            ]);
            
            let userData = {};
            let dashboardData = {};
            
            if (profileResponse.ok) {
                userData = await profileResponse.json();
                console.log('✅ User profile loaded securely');
            } else {
                console.warn(`⚠️ Profile API call failed with status ${profileResponse.status}`);
            }
            
            if (dashboardResponse.ok) {
                dashboardData = await dashboardResponse.json();
                console.log('✅ Dashboard data loaded securely');
            } else {
                console.warn(`⚠️ Dashboard API call failed with status ${dashboardResponse.status}`);
            }
            
            // Update dashboard with real data
            updateDashboardWithUserData(userData, user);
            updateDashboardWithRealData(dashboardData);
            
        } catch (apiError) {
            console.warn('⚠️ API error, using local user data:', apiError);
            // Network error or backend down - continue with local user data
            updateDashboardWithUserData({}, user);
        }
        
    } catch (error) {
        console.error('❌ Error loading personalized data:', error);
        // Continue with basic user data even if there's an error
        updateDashboardWithUserData({}, user);
    }
}

function updateDashboardWithUserData(userData, user) {
    // Update various dashboard elements with user-specific data
    
    // Update profile section if it exists
    const profileName = document.querySelector('.profile-name');
    if (profileName) {
        const firstName = userData.first_name || user.user_metadata?.first_name || '';
        const lastName = userData.last_name || user.user_metadata?.last_name || '';
        const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'User';
        profileName.textContent = displayName;
    }
    
    // Update email if shown
    const profileEmail = document.querySelector('.profile-email');
    if (profileEmail) {
        profileEmail.textContent = userData.email || user.email || '';
    }
    
    // Update plan information
    if (userData.plan) {
        updatePlanDisplay(userData.plan);
    }
    
    console.log('✅ Dashboard updated with secure user data');
}

function updateDashboardWithRealData(dashboardData) {
    console.log('📊 Updating dashboard with real data...');
    
    try {
        // Update Digital Treasury
        if (dashboardData.user_balances) {
            const balance = dashboardData.user_balances.usd_equivalent || 0;
            const digitalVaultAmount = document.querySelector('.digital-vault-amount');
            if (digitalVaultAmount) {
                digitalVaultAmount.textContent = `$${balance.toFixed(2)}`;
            }
        }
        
        // Update Key Metrics
        if (dashboardData.key_metrics) {
            const metrics = dashboardData.key_metrics;
            
            // Conversion Rate
            const conversionElement = document.querySelector('[data-metric="conversion_rate"]');
            if (conversionElement && metrics.conversion_rate !== undefined) {
                conversionElement.textContent = `${(metrics.conversion_rate * 100).toFixed(1)}%`;
            }
            
            // Processing Time
            const processingElement = document.querySelector('[data-metric="avg_processing_time"]');
            if (processingElement && metrics.avg_processing_time !== undefined) {
                processingElement.textContent = `${metrics.avg_processing_time.toFixed(1)}s`;
            }
            
            // Fees Saved
            const feesElement = document.querySelector('[data-metric="fees_saved_total"]');
            if (feesElement && metrics.fees_saved_total !== undefined) {
                feesElement.textContent = `$${metrics.fees_saved_total.toFixed(2)}`;
            }
        }
        
        // Update Execution Metrics
        if (dashboardData.execution_metrics) {
            const execMetrics = dashboardData.execution_metrics;
            
            // Transaction Velocity
            const velocityElement = document.querySelector('[data-metric="velocity"]');
            if (velocityElement && execMetrics.velocity !== undefined) {
                velocityElement.textContent = execMetrics.velocity.toString();
            }
            
            // Flawless Executions
            const flawlessElement = document.querySelector('[data-metric="flawless_executions"]');
            if (flawlessElement && execMetrics.flawless_executions !== undefined) {
                flawlessElement.textContent = execMetrics.flawless_executions.toString();
            }
        }
        
        // Update Recent Transactions
        if (dashboardData.recent_transactions && dashboardData.recent_transactions.length > 0) {
            updateRecentTransactionsList(dashboardData.recent_transactions);
        }
        
        // Update Payment Links
        if (dashboardData.payment_links && dashboardData.payment_links.length > 0) {
            updatePaymentLinksList(dashboardData.payment_links);
            updatePaymentLinksTable(dashboardData.payment_links);
        }
        
        // Update Network Distribution
        if (dashboardData.network_distributions && dashboardData.network_distributions.length > 0) {
            updateNetworkDistribution(dashboardData.network_distributions);
        }
        
        console.log('✅ Dashboard updated with real data successfully');
        
    } catch (error) {
        console.error('❌ Error updating dashboard with real data:', error);
    }
}

function updateRecentTransactionsList(transactions) {
    const transactionsList = document.querySelector('.recent-transactions-list') || 
                            document.querySelector('.transactions-container') ||
                            document.querySelector('#transactions-list');
    
    if (!transactionsList) return;
    
    const transactionsHTML = transactions.map(tx => `
        <div class="transaction-item">
            <div class="transaction-info">
                <div class="transaction-type">${tx.direction === 'in' ? '📥' : '📤'} ${tx.direction === 'in' ? 'Received' : 'Sent'}</div>
                <div class="transaction-amount">$${tx.amount_usdc.toFixed(2)} USDC</div>
                <div class="transaction-network">${tx.network}</div>
                <div class="transaction-date">${new Date(tx.created_at).toLocaleDateString()}</div>
            </div>
        </div>
    `).join('');
    
    transactionsList.innerHTML = transactionsHTML || '<p>No recent transactions</p>';
}

function updatePaymentLinksList(paymentLinks) {
    const linksList = document.querySelector('.payment-links-list') || 
                     document.querySelector('.links-container') ||
                     document.querySelector('#payment-links-list');
    
    if (!linksList) return;
    
    const linksHTML = paymentLinks.map(link => `
        <div class="payment-link-item">
            <div class="link-info">
                <div class="link-name">${link.link_name}</div>
                <div class="link-amount">$${link.amount_usdc.toFixed(2)} USDC</div>
                <div class="link-network">${link.network}</div>
                <div class="link-status ${link.is_active ? 'active' : 'inactive'}">${link.is_active ? 'Active' : 'Inactive'}</div>
            </div>
        </div>
    `).join('');
    
    linksList.innerHTML = linksHTML || '<p>No payment links created</p>';
}

function updateNetworkDistribution(distributions) {
    distributions.forEach(dist => {
        const networkElement = document.querySelector(`[data-network="${dist.network}"]`);
        if (networkElement) {
            const percentElement = networkElement.querySelector('.network-percent');
            const volumeElement = networkElement.querySelector('.network-volume');
            
            if (percentElement) {
                percentElement.textContent = `${dist.percent_usage.toFixed(1)}%`;
            }
            if (volumeElement) {
                volumeElement.textContent = `$${dist.volume_usdc.toFixed(2)}`;
            }
        }
    });
}

function updatePaymentLinksTable(paymentLinks) {
    const tableBody = document.getElementById('payment-links-table-body');
    if (!tableBody) return;
    
    if (!paymentLinks || paymentLinks.length === 0) {
        tableBody.innerHTML = `
            <div class="table-row no-data">
                <div class="table-cell" colspan="7" style="text-align: center; padding: 40px;">
                    <i class="fas fa-link" style="font-size: 2rem; color: #ccc; margin-bottom: 10px;"></i>
                    <p>No payment links created yet. Create your first payment link above!</p>
                </div>
            </div>
        `;
        return;
    }
    
    const linksHTML = paymentLinks.map(link => {
        const successRate = link.payments_received && link.payments_attempted 
            ? ((link.payments_received / link.payments_attempted) * 100).toFixed(0)
            : '0';
        
        const successClass = successRate >= 80 ? 'high' : successRate >= 60 ? 'medium' : 'low';
        
        return `
            <div class="table-row">
                <div class="table-cell link-name-cell">
                    <div class="link-name">${link.link_name}</div>
                    <div class="link-url">${link.payment_url || `halaxa.pay/${link.link_id}`}</div>
                </div>
                <div class="table-cell amount-cell">${link.amount_usdc.toFixed(2)} USDC</div>
                <div class="table-cell network-cell">
                    <span class="network-badge ${link.network}">${link.network.charAt(0).toUpperCase() + link.network.slice(1)}</span>
                </div>
                <div class="table-cell success-rate-cell">
                    <div class="success-rate ${successClass}">
                        <span class="rate-percentage">${successRate}%</span>
                        <div class="rate-bar">
                            <div class="rate-fill" style="width: ${successRate}%;"></div>
                        </div>
                    </div>
                </div>
                <div class="table-cell payments-cell">${link.payments_received || 0} / ${link.payments_attempted || 0}</div>
                <div class="table-cell date-cell">${new Date(link.created_at).toLocaleDateString()}</div>
                <div class="table-cell actions-cell">
                    <button class="action-btn copy-btn-table" onclick="copyToClipboard('${link.payment_url || `halaxa.pay/${link.link_id}`}')">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="action-btn edit-btn" onclick="editPaymentLink('${link.link_id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deletePaymentLink('${link.link_id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    tableBody.innerHTML = linksHTML;
}

function editPaymentLink(linkId) {
    showPaymentNotification('Edit functionality coming soon!', 'info');
}

function deletePaymentLink(linkId) {
    if (confirm('Are you sure you want to delete this payment link?')) {
        // TODO: Implement delete functionality
        showPaymentNotification('Delete functionality coming soon!', 'info');
    }
}

async function reloadPaymentLinks() {
    try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) return;
        
        const response = await fetch(`${BACKEND_URL}/api/payment-links`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            updatePaymentLinksTable(result.payment_links);
        }
    } catch (error) {
        console.error('Error reloading payment links:', error);
    }
}

function addDetectionRefreshButton() {
    // Add a detection refresh button to the dashboard
    const headerActions = document.querySelector('.header-actions') || document.querySelector('.dashboard-header');
    
    if (headerActions && !document.getElementById('detection-refresh-btn')) {
        const refreshButton = document.createElement('button');
        refreshButton.id = 'detection-refresh-btn';
        refreshButton.className = 'detection-refresh-button';
        refreshButton.innerHTML = '🔍 Refresh Data';
        refreshButton.title = 'Trigger detection system to refresh your dashboard data';
        
        refreshButton.addEventListener('click', async () => {
            await triggerDetectionRefresh(refreshButton);
        });
        
        // Add some basic styling
        refreshButton.style.cssText = `
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            margin-left: 10px;
            transition: all 0.3s ease;
        `;
        
        headerActions.appendChild(refreshButton);
        console.log('✅ Detection refresh button added');
    }
}

async function triggerDetectionRefresh(button) {
    const originalText = button.innerHTML;
    const accessToken = localStorage.getItem('accessToken');
    
    if (!accessToken) {
        console.error('❌ No access token for detection refresh');
        return;
    }
    
    try {
        // Update button state
        button.innerHTML = '🔄 Refreshing...';
        button.disabled = true;
        button.style.opacity = '0.7';
        
        console.log('🔍 Triggering detection refresh...');
        
        const response = await fetch(`${BACKEND_URL}/api/account/trigger-detection`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Detection refresh successful:', data.message);
            
            // Show success feedback
            button.innerHTML = '✅ Refreshed!';
            button.style.background = 'linear-gradient(135deg, #059669, #047857)';
            
            // Reload page data after a short delay
            setTimeout(() => {
                window.location.reload();
            }, 1500);
            
        } else {
            console.error('❌ Detection refresh failed:', response.status);
            button.innerHTML = '❌ Failed';
            button.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)';
        }
        
    } catch (error) {
        console.error('❌ Detection refresh error:', error);
        button.innerHTML = '❌ Error';
        button.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)';
    }
    
    // Reset button after delay
    setTimeout(() => {
        button.innerHTML = originalText;
        button.disabled = false;
        button.style.opacity = '1';
        button.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    }, 3000);
}

// ==================== SPA NAVIGATION WITH SMOOTH TRANSITIONS ==================== //

function initializeSPA() {
    const navItems = document.querySelectorAll('.nav-item');
    const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
    const pages = document.querySelectorAll('.page-content');
        
    console.log('Initializing SPA with', navItems.length, 'nav items,', mobileNavItems.length, 'mobile nav items and', pages.length, 'pages');
    
    // Handle desktop navigation
    navItems.forEach((item, index) => {
        item.addEventListener('click', function() {
            const targetPageId = this.getAttribute('data-page');
            console.log('Desktop navigation clicked:', targetPageId);
            
            // Animate navigation item selection
            animateNavSelection(item, navItems);
            animateMobileNavSelection(null, mobileNavItems, targetPageId);
            
            // Smooth page transition
            smoothPageTransition(targetPageId, pages);
        });
        
        // Add hover effect for desktop
        item.addEventListener('mouseenter', function() {
            if (!this.classList.contains('active')) {
                this.style.transform = 'translateX(8px)';
                this.style.background = 'rgba(16, 185, 129, 0.1)';
            }
        });
        
        item.addEventListener('mouseleave', function() {
            if (!this.classList.contains('active')) {
                this.style.transform = 'translateX(0)';
                this.style.background = 'transparent';
            }
        });
    });

    // Handle mobile navigation
    mobileNavItems.forEach((item, index) => {
        item.addEventListener('click', function() {
            const targetPageId = this.getAttribute('data-page');
            console.log('Mobile navigation clicked:', targetPageId);
            
            // Animate mobile navigation item selection
            animateMobileNavSelection(item, mobileNavItems);
            animateNavSelection(null, navItems, targetPageId);
            
            // Smooth page transition
            smoothPageTransition(targetPageId, pages);
        });

        // Add touch feedback for mobile
        item.addEventListener('touchstart', function() {
            this.style.transform = 'translateY(-1px) scale(0.98)';
        });

        item.addEventListener('touchend', function() {
            this.style.transform = '';
        });
    });
    
    // Make sure home page is active on load
    const homePage = document.getElementById('home-page');
    if (homePage) {
        homePage.classList.add('active-page');
    }
    
    // Add debugging function to global scope for testing
    window.testNavigation = function(pageId) {
        console.log('🧪 Testing navigation to:', pageId);
        const pages = document.querySelectorAll('.page-content');
        smoothPageTransition(pageId, pages);
        
        // Also update nav items
        const navItems = document.querySelectorAll('.nav-item');
        const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
        animateNavSelection(null, navItems, pageId);
        animateMobileNavSelection(null, mobileNavItems, pageId);
    };
    
    console.log('🎮 Debug: Use testNavigation("page-id") in console to test navigation');
}

function animateNavSelection(selectedItem, allItems, targetPageId = null) {
    // Remove active class from all items
    allItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // If no selectedItem provided, find it by targetPageId
    if (!selectedItem && targetPageId) {
        selectedItem = Array.from(allItems).find(item => 
            item.getAttribute('data-page') === targetPageId
        );
    }
    
    if (selectedItem) {
        // Add active class to selected item with animation
        selectedItem.classList.add('active');
        
        // Add a temporary shine effect
        selectedItem.style.animation = 'activeItemGlow 0.6s ease-out';
        
        setTimeout(() => {
            selectedItem.style.animation = '';
        }, 600);
    }
}

function animateMobileNavSelection(selectedItem, allItems, targetPageId = null) {
    // Remove active class from all items
    allItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // If no selectedItem provided, find it by targetPageId
    if (!selectedItem && targetPageId) {
        selectedItem = Array.from(allItems).find(item => 
            item.getAttribute('data-page') === targetPageId
        );
    }
    
    if (selectedItem) {
        // Add active class to selected item with animation
        selectedItem.classList.add('active');
        
        // Add a temporary bounce effect for mobile
        selectedItem.style.animation = 'mobileItemBounce 0.4s ease-out';
        
        setTimeout(() => {
            selectedItem.style.animation = '';
        }, 400);
    }
}

function smoothPageTransition(targetPageId, allPages) {
    const currentPage = document.querySelector('.page-content.active-page');
    const targetPage = document.getElementById(targetPageId);
    
    if (currentPage === targetPage) return;
    
    // Exit animation for current page
    if (currentPage) {
        currentPage.style.animation = 'pageSlideOut 0.3s ease-in-out forwards';
        
        setTimeout(() => {
            currentPage.classList.remove('active-page');
            currentPage.style.animation = '';
            
            // Enter animation for target page
            targetPage.classList.add('active-page');
            targetPage.style.animation = 'pageSlideIn 0.5s ease-out forwards';
            
            setTimeout(() => {
                targetPage.style.animation = '';
            }, 500);
        }, 300);
    } else {
        // First load
        targetPage.classList.add('active-page');
    }
}

// ==================== INTERACTIVE ANIMATIONS ==================== //

function initializeAnimations() {
    // Add CSS animations for page transitions
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pageSlideOut {
            0% {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
            100% {
                opacity: 0;
                transform: translateY(-20px) scale(0.98);
            }
        }
        
        @keyframes pageSlideIn {
            0% {
                opacity: 0;
                transform: translateY(30px) scale(0.98);
            }
            100% {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
        
        @keyframes cardHover {
            0% { transform: translateY(0) scale(1); }
            100% { transform: translateY(-8px) scale(1.02); }
        }
        
        @keyframes iconSpin {
            0% { transform: rotate(0deg) scale(1); }
            50% { transform: rotate(180deg) scale(1.1); }
            100% { transform: rotate(360deg) scale(1); }
        }
        
        @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
        
        @keyframes mobileItemBounce {
            0% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-4px) scale(1.05); }
            100% { transform: translateY(0) scale(1); }
        }
    `;
    document.head.appendChild(style);
    
    // Add hover effects to navigation items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            const icon = this.querySelector('i');
            if (icon && !this.classList.contains('active')) {
                icon.style.animation = 'iconSpin 0.6s ease-in-out';
                setTimeout(() => {
                    icon.style.animation = '';
                }, 600);
            }
        });
    });
}

// ==================== FLOATING PARTICLES SYSTEM ==================== //

function initializeParticles() {
    const particlesContainer = document.querySelector('.floating-particles');
    
    // Create additional particles dynamically
    for (let i = 0; i < 12; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (15 + Math.random() * 10) + 's';
        particlesContainer.appendChild(particle);
    }
    
    // Add interactive particle effects on mouse move
    document.addEventListener('mousemove', function(e) {
        createInteractiveParticle(e.clientX, e.clientY);
    });
}

function createInteractiveParticle(x, y) {
    // Throttle particle creation
    if (Math.random() > 0.98) {
        const particle = document.createElement('div');
        particle.style.position = 'fixed';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.width = '2px';
        particle.style.height = '2px';
        particle.style.background = 'var(--accent-primary)';
        particle.style.borderRadius = '50%';
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '1000';
        particle.style.opacity = '0.6';
        particle.style.animation = 'floatParticle 2s ease-out forwards';
        
        document.body.appendChild(particle);
        
        setTimeout(() => {
            particle.remove();
        }, 2000);
    }
}

// ==================== INTERACTIVE CARD EFFECTS ==================== //

function initializeCardEffects() {
    // Stat cards interactive effects
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.animation = 'cardHover 0.3s ease-out forwards';
            
            // Animate the icon
            const icon = this.querySelector('.stat-icon i');
            if (icon) {
                icon.style.animation = 'iconSpin 0.5s ease-in-out';
            }
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.animation = '';
            
            const icon = this.querySelector('.stat-icon i');
            if (icon) {
                icon.style.animation = '';
            }
        });
        
        // Add click effect
        card.addEventListener('click', function() {
            this.style.animation = 'cardPulse 0.3s ease-out';
            setTimeout(() => {
                this.style.animation = '';
            }, 300);
        });
    });
    
    // Balance card special effects
    const balanceCard = document.querySelector('.balance-card');
    if (balanceCard) {
        balanceCard.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
            this.style.boxShadow = 'var(--shadow-glow)';
        });
        
        balanceCard.addEventListener('mouseleave', function() {
            this.style.transform = '';
            this.style.boxShadow = '';
        });
    }
    
    // Chart container interactive effects
    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer) {
        chartContainer.addEventListener('mouseenter', function() {
            const shimmer = this.querySelector('::before');
            this.style.animation = 'chartShimmer 1s ease-in-out';
        });
    }
    
    // Metric items hover effects
    const metricItems = document.querySelectorAll('.metric-item');
    metricItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.background = 'rgba(16, 185, 129, 0.05)';
            this.style.paddingLeft = 'var(--space-3)';
            this.style.borderRadius = 'var(--radius-md)';
            this.style.transform = 'translateX(5px)';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.background = '';
            this.style.paddingLeft = '';
            this.style.borderRadius = '';
            this.style.transform = '';
        });
    });
}

// ==================== INTERACTIVE BUTTON EFFECTS ==================== //

function initializeButtonEffects() {
    // Chart action buttons
    const chartActions = document.querySelectorAll('.chart-action, .balance-action');
    chartActions.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.1) rotate(5deg)';
            this.style.background = 'var(--accent-light)';
            this.style.color = 'var(--accent-primary)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = '';
            this.style.background = '';
            this.style.color = '';
        });
        
        button.addEventListener('click', function() {
            // Ripple effect
            const ripple = document.createElement('div');
            ripple.style.position = 'absolute';
            ripple.style.borderRadius = '50%';
            ripple.style.background = 'rgba(16, 185, 129, 0.3)';
            ripple.style.transform = 'scale(0)';
            ripple.style.animation = 'ripple 0.6s linear';
            ripple.style.left = '50%';
            ripple.style.top = '50%';
            ripple.style.width = '20px';
            ripple.style.height = '20px';
            ripple.style.marginLeft = '-10px';
            ripple.style.marginTop = '-10px';
            
            this.style.position = 'relative';
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
    
    // Add ripple animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
        
        @keyframes cardPulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
    `;
    document.head.appendChild(style);
}

// ==================== INITIALIZE ALL EFFECTS ==================== //

// Initialize all interactive effects when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeButtonEffects();
    initializePlanUpgrades(); // Add upgrade functionality
    
    // Add smooth scrolling
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // Add page load animation
    document.body.style.opacity = '0';
    document.body.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        document.body.style.transition = 'all 0.8s ease-out';
        document.body.style.opacity = '1';
        document.body.style.transform = 'translateY(0)';
    }, 100);
});

// ==================== PLAN UPGRADE FUNCTIONALITY ==================== //

function initializePlanUpgrades() {
    // Get upgrade buttons
    const proBtn = document.querySelector('.pro-btn');
    const eliteBtn = document.querySelector('.elite-btn');
    const basicBtn = document.querySelector('.basic-btn');

    // Add event listeners
    if (proBtn) {
        proBtn.addEventListener('click', () => handlePlanUpgrade('pro'));
    }
    if (eliteBtn) {
        eliteBtn.addEventListener('click', () => handlePlanUpgrade('elite'));
    }
    if (basicBtn) {
        basicBtn.addEventListener('click', () => handleBasicPlan());
    }

    // Check for upgrade success/cancel in URL
    checkUpgradeStatus();
    
    // Load current plan status
    loadCurrentPlanStatus();
}

async function handlePlanUpgrade(targetPlan) {
    try {
        // Check if user is logged in
        const token = localStorage.getItem('halaxa_token');
        if (!token) {
            showUpgradeNotification('Please login first to upgrade your plan', 'warning');
            return;
        }

        // Show loading state
        const button = document.querySelector(`.${targetPlan}-btn`);
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        button.disabled = true;

        // Get user email for checkout
        const userEmail = await getCurrentUserEmail();
        if (!userEmail) {
            throw new Error('Unable to get user email');
        }

        // Create Stripe checkout session
        const response = await fetch(`${BACKEND_URL}/api/stripe/create-checkout-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                plan: targetPlan,
                email: userEmail
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to create checkout session');
        }

        // Redirect to Stripe Checkout
        if (data.url) {
            window.location.href = data.url;
        } else {
            throw new Error('No checkout URL received');
        }

    } catch (error) {
        console.error('Upgrade error:', error);
        showUpgradeNotification(error.message || 'Failed to process upgrade', 'error');
        
        // Reset button
        const button = document.querySelector(`.${targetPlan}-btn`);
        button.innerHTML = targetPlan === 'pro' ? 'Upgrade to Pro <i class="fas fa-arrow-right"></i>' : 'Go Elite Now <i class="fas fa-arrow-right"></i>';
        button.disabled = false;
    }
}

async function getCurrentUserEmail() {
    try {
        const token = localStorage.getItem('halaxa_token');
        const response = await fetch(`${BACKEND_URL}/api/account/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.email;
        }
        return null;
    } catch (error) {
        console.error('Error getting user email:', error);
        return null;
    }
}

function handleBasicPlan() {
    // For basic plan, just show a message since it's free
    showUpgradeNotification('You are already on the Basic plan! Upgrade to Pro or Elite for more features.', 'info');
}

async function loadCurrentPlanStatus() {
    try {
        const token = localStorage.getItem('halaxa_token');
        if (!token) return;

        const response = await fetch(`${BACKEND_URL}/api/account/plan-status`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            updatePlanDisplay(data.currentPlan);
        }
    } catch (error) {
        console.error('Error loading plan status:', error);
    }
}

function updatePlanDisplay(currentPlan) {
    // Update button states based on current plan
    const basicBtn = document.querySelector('.basic-btn');
    const proBtn = document.querySelector('.pro-btn');
    const eliteBtn = document.querySelector('.elite-btn');

    // Reset all buttons
    [basicBtn, proBtn, eliteBtn].forEach(btn => {
        if (btn) {
            btn.classList.remove('current-plan');
            btn.disabled = false;
        }
    });

    // Mark current plan
    switch (currentPlan) {
        case 'basic':
            if (basicBtn) {
                basicBtn.innerHTML = '<i class="fas fa-check"></i> Current Plan';
                basicBtn.classList.add('current-plan');
            }
            break;
        case 'pro':
            if (proBtn) {
                proBtn.innerHTML = '<i class="fas fa-check"></i> Current Plan';
                proBtn.classList.add('current-plan');
                proBtn.disabled = true;
            }
            break;
        case 'elite':
            if (eliteBtn) {
                eliteBtn.innerHTML = '<i class="fas fa-check"></i> Current Plan';
                eliteBtn.classList.add('current-plan');
                eliteBtn.disabled = true;
            }
            if (proBtn) {
                proBtn.style.opacity = '0.6';
                proBtn.disabled = true;
            }
            break;
    }
}

function checkUpgradeStatus() {
    const urlParams = new URLSearchParams(window.location.search);
    const upgradeStatus = urlParams.get('upgrade');
    const plan = urlParams.get('plan');

    if (upgradeStatus === 'success' && plan) {
        showUpgradeNotification(`🎉 Successfully upgraded to ${plan.toUpperCase()} plan!`, 'success');
        // Reload plan status
        setTimeout(() => {
            loadCurrentPlanStatus();
        }, 1000);
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
    } else if (upgradeStatus === 'cancelled') {
        showUpgradeNotification('Upgrade cancelled. You can try again anytime.', 'info');
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

function showUpgradeNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `upgrade-notification ${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 
                 type === 'error' ? 'exclamation-circle' :
                 type === 'warning' ? 'exclamation-triangle' : 'info-circle';
    
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    // Add styles if not already added
    if (!document.querySelector('#upgrade-notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'upgrade-notification-styles';
        styles.textContent = `
            .upgrade-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
                border-radius: 8px;
                padding: 16px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                animation: slideInRight 0.3s ease-out;
                font-family: 'Satoshi', sans-serif;
            }
            
            .upgrade-notification.success {
                background: linear-gradient(135deg, #10B981, #059669);
                color: white;
            }
            
            .upgrade-notification.error {
                background: linear-gradient(135deg, #EF4444, #DC2626);
                color: white;
            }
            
            .upgrade-notification.warning {
                background: linear-gradient(135deg, #F59E0B, #D97706);
                color: white;
            }
            
            .upgrade-notification.info {
                background: linear-gradient(135deg, #3B82F6, #2563EB);
                color: white;
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .notification-content i:first-child {
                font-size: 20px;
                flex-shrink: 0;
            }
            
            .notification-close {
                background: none;
                border: none;
                color: inherit;
                cursor: pointer;
                padding: 4px;
                margin-left: auto;
                border-radius: 4px;
                transition: background-color 0.2s;
            }
            
            .notification-close:hover {
                background-color: rgba(255, 255, 255, 0.2);
            }
            
            .plan-cta-btn.current-plan {
                background: #10B981 !important;
                cursor: default;
            }
            
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// ==================== RESPONSIVE INTERACTIONS ==================== //

// Handle mobile interactions
function initializeMobileInteractions() {
    if (window.innerWidth <= 768) {
        // Add touch-friendly interactions
        const cards = document.querySelectorAll('.stat-card, .chart-card, .metrics-panel');
        cards.forEach(card => {
            card.addEventListener('touchstart', function() {
                this.style.transform = 'scale(0.98)';
            });
            
            card.addEventListener('touchend', function() {
                this.style.transform = '';
            });
        });
    }
}

// Initialize mobile interactions
window.addEventListener('resize', initializeMobileInteractions);
initializeMobileInteractions();

// ==================== PAYMENT FORM FUNCTIONALITY ==================== //

// Setup Payment Form Functionality
function setupPaymentForm() {
    const paymentForm = document.getElementById('payment-form');
    const networkOptions = document.querySelectorAll('.network-option');
    const createLinkBtn = document.getElementById('create-link-btn');
    
    if (!paymentForm) return;
    
    // Network selection functionality
    networkOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Remove active class from all options
            networkOptions.forEach(opt => opt.classList.remove('active'));
            // Add active class to clicked option
            option.classList.add('active');
            
            // Update gas fee based on network
            const network = option.dataset.network;
            updateGasFee(network);
        });
    });
    
    // Form submission
    paymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handlePaymentLinkCreation();
    });
    
    // Paste button functionality
    const pasteBtn = document.querySelector('.paste-btn');
    if (pasteBtn) {
        pasteBtn.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                const walletInput = document.getElementById('wallet-address');
                if (walletInput) {
                    walletInput.value = text;
                }
            } catch (err) {
                console.error('Failed to read clipboard:', err);
            }
        });
    }
}

function updateGasFee(network) {
    const gasFeeValue = document.getElementById('gas-fee-value');
    if (!gasFeeValue) return;
    
    const fees = {
        polygon: '~$0.0001',
        solana: '~$0.00005',
        tron: '~$0.001'
    };
    
    gasFeeValue.textContent = fees[network] || '~$0.0001';
}

async function handlePaymentLinkCreation() {
    const createBtn = document.getElementById('create-link-btn');
    const btnText = createBtn.querySelector('.btn-text');
    const btnLoader = createBtn.querySelector('.btn-loader');
    
    // Get form data
    const amount = document.getElementById('usdc-amount').value;
    const walletAddress = document.getElementById('wallet-address').value;
    const linkName = document.getElementById('link-name').value;
    const selectedNetwork = document.querySelector('.network-option.active')?.dataset.network;
    
    // Validation
    if (!amount || !walletAddress || !linkName || !selectedNetwork) {
        showPaymentNotification('Please fill in all required fields', 'error');
        return;
    }
    
    if (parseFloat(amount) <= 0) {
        showPaymentNotification('Amount must be greater than 0', 'error');
        return;
    }
    
    // Show loading state
    createBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-block';
    
    try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            throw new Error('Authentication required');
        }
        
        // Check access control before creating payment link
        const userId = JSON.parse(localStorage.getItem('user'))?.id;
        if (userId) {
            const accessResponse = await fetch(`${BACKEND_URL}/api/access/check-permission`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: userId,
                    action: 'create_payment_link',
                    data: { network: selectedNetwork, amount: parseFloat(amount) }
                })
            });
            
            if (accessResponse.ok) {
                const accessResult = await accessResponse.json();
                if (!accessResult.allowed) {
                    throw new Error(accessResult.message || 'Access denied for your current plan');
                }
            }
        }
        
        const response = await fetch(`${BACKEND_URL}/api/payment-links/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount_usdc: parseFloat(amount),
                wallet_address: walletAddress,
                link_name: linkName,
                network: selectedNetwork
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showPaymentNotification('Payment link created successfully!', 'success');
            displayGeneratedLink(result.payment_link);
            
            // Reload payment links to show the new one
            await reloadPaymentLinks();
            
            paymentForm.reset();
            // Reset network selection to first option
            document.querySelectorAll('.network-option').forEach((opt, index) => {
                opt.classList.toggle('active', index === 0);
            });
        } else {
            throw new Error(result.error || 'Failed to create payment link');
        }
        
    } catch (error) {
        console.error('Payment link creation error:', error);
        showPaymentNotification(error.message || 'Failed to create payment link', 'error');
    } finally {
        // Reset button state
        createBtn.disabled = false;
        btnText.style.display = 'inline-block';
        btnLoader.style.display = 'none';
    }
}

function displayGeneratedLink(linkData) {
    const linkContent = document.getElementById('generated-link-content');
    if (!linkContent) return;
    
    const linkHTML = `
        <div class="generated-link-success">
            <div class="link-info">
                <h4>${linkData.link_name}</h4>
                <div class="link-details">
                    <span class="link-amount">$${linkData.amount_usdc} USDC</span>
                    <span class="link-network">${linkData.network}</span>
                </div>
            </div>
            <div class="link-url-container">
                <input type="text" class="link-url-input" value="${linkData.payment_url}" readonly>
                <button class="copy-link-btn" onclick="copyToClipboard('${linkData.payment_url}')">
                    <i class="fas fa-copy"></i>
                </button>
            </div>
            <div class="link-actions">
                <button class="share-btn" onclick="sharePaymentLink('${linkData.payment_url}')">
                    <i class="fas fa-share"></i> Share
                </button>
                <button class="qr-btn" onclick="showQRCode('${linkData.payment_url}')">
                    <i class="fas fa-qrcode"></i> QR Code
                </button>
            </div>
        </div>
    `;
    
    linkContent.innerHTML = linkHTML;
}

// Setup Forge Link Button
function setupForgeLinkButton() {
    const forgeLinkBtn = document.querySelector('.action-tile.link');
    if (forgeLinkBtn) {
        forgeLinkBtn.addEventListener('click', () => {
            // Navigate to payment link page
            const paymentLinkNavItem = document.querySelector('[data-page="payment-link-page"]');
            if (paymentLinkNavItem) {
                paymentLinkNavItem.click();
            }
        });
    }
}

// Utility functions
function showPaymentNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `payment-notification payment-notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'}-circle"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add styles if not already added
    if (!document.querySelector('#payment-notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'payment-notification-styles';
        styles.textContent = `
            .payment-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
                border-radius: 8px;
                padding: 16px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                animation: slideInRight 0.3s ease-out;
                font-family: 'Inter', sans-serif;
            }
            
            .payment-notification-success {
                background: linear-gradient(135deg, #10B981, #059669);
                color: white;
            }
            
            .payment-notification-error {
                background: linear-gradient(135deg, #EF4444, #DC2626);
                color: white;
            }
            
            .payment-notification-info {
                background: linear-gradient(135deg, #3B82F6, #2563EB);
                color: white;
            }
            
            .payment-notification .notification-content {
                display: flex;
                align-items: center;
                gap: 12px;
            }
        `;
        document.head.appendChild(styles);
    }
    
    // Add to page
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showPaymentNotification('Link copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Failed to copy:', err);
        showPaymentNotification('Failed to copy link', 'error');
    });
}

function sharePaymentLink(url) {
    if (navigator.share) {
        navigator.share({
            title: 'Halaxa Pay Payment Link',
            url: url
        });
    } else {
        copyToClipboard(url);
    }
}

function showQRCode(url) {
    // This would integrate with a QR code library
    showPaymentNotification('QR Code feature coming soon!', 'info');
}

// Initialize SPA when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeSPA();
    setupPaymentForm();
    setupForgeLinkButton();
});
