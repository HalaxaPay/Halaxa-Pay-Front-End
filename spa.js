// Global state management
const state = {
    currentPage: 'home',
    sellerId: null,
    token: null,
    subscription: null,
    isAuthenticated: false
};

// Initialize the application
async function initializeApp() {
    // Check authentication
    state.sellerId = getSellerId();
    state.token = localStorage.getItem('token');
    
    if (!state.token || !state.sellerId) {
        // Redirect to login if not authenticated
        window.location.href = './login.html';
        return;
    }
    
    state.isAuthenticated = true;
    
    // Show dashboard container
    document.getElementById('dashboard-container').style.display = 'block';
    document.getElementById('auth-container').style.display = 'none';
    
    // Set up navigation
    setupNavigation();
    
    // Load initial page
    await loadPage(state.currentPage);
    
    // Get subscription info
    state.subscription = await getSubscriptionInfo();
    updateSubscriptionBadge(state.subscription);
}

// Get seller ID from URL or localStorage
function getSellerId() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlSellerId = urlParams.get('seller_id');
    
    if (urlSellerId) {
        localStorage.setItem('sellerId', urlSellerId);
        return urlSellerId;
    }
    
    return localStorage.getItem('sellerId');
}

// Set up navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', async () => {
            const page = item.getAttribute('data-page');
            await loadPage(page);
        });
    });
}

// Load page content dynamically
async function loadPage(page) {
    // Update active states
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-page') === page);
    });
    
    // Hide all page contents
    document.querySelectorAll('.page-content').forEach(content => {
        content.style.display = 'none';
    });
    
    // Update state
    state.currentPage = page;
    
    // Load page specific content
    switch (page) {
        case 'home':
            document.getElementById('home-page').style.display = 'block';
            await loadHomePage();
            break;
        case 'transactions':
            await loadTransactionsPage();
            break;
        case 'payment-link':
            await loadPaymentLinkPage();
            break;
        case 'capital':
            await loadCapitalPage();
            break;
        case 'account':
            await loadAccountPage();
            break;
        case 'plans':
            await loadPlansPage();
            break;
        case 'help':
            await loadHelpPage();
            break;
    }
}

// Get subscription info
async function getSubscriptionInfo() {
    try {
        const response = await fetch(`https://halaxa-backend.onrender.com/api/subscription/${state.sellerId}`, {
            headers: {
                'Authorization': `Bearer ${state.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch subscription info');
        }

        const data = await response.json();
        if (data.success) {
            const stripeData = data.data.stripe_subscription;
            if (stripeData) {
                return {
                    plan: stripeData.plan_name || 'Basic',
                    status: stripeData.status,
                    current_period_end: stripeData.current_period_end,
                    cancel_at_period_end: stripeData.cancel_at_period_end
                };
            }
            return data.data;
        }
        return null;
    } catch (error) {
        console.error('Error fetching subscription info:', error);
        return null;
    }
}

// Update subscription badge
function updateSubscriptionBadge(subscription) {
    const badge = document.getElementById('subscriptionBadge');
    if (!badge) return;

    if (!subscription) {
        badge.style.display = 'none';
        return;
    }

    badge.style.display = 'block';
    const plan = subscription.plan.toLowerCase();
    badge.className = 'subscription-badge ' + plan;

    let statusIndicator = '';
    if (subscription.status === 'active') {
        statusIndicator = '<i class="fas fa-check-circle"></i> ';
    } else if (subscription.status === 'past_due') {
        statusIndicator = '<i class="fas fa-exclamation-circle"></i> ';
    } else if (subscription.cancel_at_period_end) {
        statusIndicator = '<i class="fas fa-clock"></i> ';
    }

    let expirationText = '';
    if (plan !== 'basic' && subscription.current_period_end) {
        const endDate = new Date(subscription.current_period_end * 1000);
        const formattedDate = endDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        });
        expirationText = `<span class="expiration-date">Renews ${formattedDate}</span>`;
    }

    badge.innerHTML = `
        ${statusIndicator}${subscription.plan}
        ${expirationText}
    `;
}

// Page load functions
async function loadHomePage() {
    try {
        const response = await fetch(`https://halaxa-backend.onrender.com/api/dashboard/${state.sellerId}`, {
            headers: {
                'Authorization': `Bearer ${state.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch dashboard data');
        }

        const data = await response.json();
        updateDashboardUI(data.data);
        
        // Initialize volume chart
        initializeVolumeChart(data.data.volume);
    } catch (error) {
        console.error('Error loading home page:', error);
    }
}

async function loadTransactionsPage() {
    const pageContainer = document.getElementById('transactions-page');
    
    // Load transactions page content with exact structure from transactions.html
    pageContainer.innerHTML = `
        <style>
            .page-title {
                font-size: 2rem;
                font-weight: 700;
                margin-bottom: var(--spacing-lg);
                background: linear-gradient(45deg, var(--primary-color), var(--secondary-color));
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }

            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: var(--spacing-md);
                margin-bottom: var(--spacing-lg);
            }

            .stat-card {
                background: var(--card-bg);
                border-radius: var(--border-radius);
                padding: var(--spacing-md);
                border: 1px solid var(--border-color);
                box-shadow: var(--shadow-light);
                transition: all 0.3s ease;
                backdrop-filter: blur(10px);
                text-align: center;
            }

            .stat-card:hover {
                transform: translateY(-5px);
                box-shadow: var(--shadow-medium);
            }

            .stat-card .title {
                font-size: 0.9rem;
                color: var(--secondary-text);
                margin-bottom: var(--spacing-sm);
                font-weight: 500;
            }

            .stat-card .value {
                font-size: 1.8rem;
                font-weight: 700;
                background: linear-gradient(45deg, var(--primary-color), var(--secondary-color));
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }

            .filters-section {
                display: flex;
                gap: var(--spacing-md);
                margin-bottom: var(--spacing-lg);
                align-items: end;
                flex-wrap: wrap;
            }

            .filter-group {
                display: flex;
                flex-direction: column;
                gap: var(--spacing-xs);
            }

            .filter-group label {
                font-weight: 500;
                color: var(--primary-text);
                font-size: 0.9rem;
            }

            .filter-group select,
            .filter-group input {
                padding: var(--spacing-sm);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                background: var(--card-bg);
                color: var(--primary-text);
                transition: all 0.3s ease;
                min-width: 150px;
            }

            .filter-group select:focus,
            .filter-group input:focus {
                outline: none;
                border-color: var(--secondary-color);
                box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
            }

            .export-button {
                background: linear-gradient(45deg, var(--secondary-color), var(--accent-color));
                color: white;
                border: none;
                padding: var(--spacing-sm) var(--spacing-md);
                border-radius: 8px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: var(--spacing-xs);
            }

            .export-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 16px rgba(52, 152, 219, 0.3);
            }

            .transactions-list {
                background: var(--card-bg);
                border-radius: var(--border-radius);
                border: 1px solid var(--border-color);
                box-shadow: var(--shadow-light);
                backdrop-filter: blur(10px);
            }

            .list-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: var(--spacing-md);
                border-bottom: 1px solid var(--border-color);
                transition: all 0.3s ease;
            }

            .list-item:hover {
                background-color: var(--secondary-bg);
                transform: translateX(5px);
            }

            .list-item:last-child {
                border-bottom: none;
            }

            .transaction-info {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .transaction-info .description {
                font-weight: 600;
                color: var(--primary-text);
            }

            .transaction-info .details {
                font-size: 0.85rem;
                color: var(--secondary-text);
                display: flex;
                align-items: center;
                gap: var(--spacing-sm);
            }

            .list-item .amount {
                font-weight: 600;
                font-size: 1.1rem;
            }

            .list-item .status {
                padding: 4px 12px;
                border-radius: 8px;
                font-size: 0.85rem;
                font-weight: 500;
                transition: all 0.3s ease;
            }

            .list-item .status.completed {
                background: linear-gradient(45deg, #28a745, #20c997);
                color: white;
            }

            .list-item .status.pending {
                background: linear-gradient(45deg, #ffc107, #ff9800);
                color: white;
            }

            .list-item .status.failed {
                background: linear-gradient(45deg, #dc3545, #c82333);
                color: white;
            }

            .list-item .view-details {
                background: none;
                border: none;
                color: var(--secondary-color);
                cursor: pointer;
                padding: 8px 12px;
                border-radius: 8px;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .list-item .view-details:hover {
                background: linear-gradient(45deg, var(--secondary-color), var(--accent-color));
                color: white;
                transform: translateY(-2px);
            }

            @media (max-width: 768px) {
                .list-item {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: var(--spacing-sm);
                }

                .list-item .transaction-info {
                    width: 100%;
                    justify-content: space-between;
                }

                .filters-section {
                    flex-direction: column;
                }

                .filter-group {
                    width: 100%;
                }

                .filter-group select,
                .filter-group input {
                    width: 100%;
                }

                .export-button {
                    width: 100%;
                    justify-content: center;
                }
            }
        </style>
        
        <h1 class="page-title">Transactions</h1>

        <!-- Stats Grid -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="title">Total Transactions</div>
                <div class="value" id="totalTransactions">0</div>
            </div>
            <div class="stat-card">
                <div class="title">Total Volume</div>
                <div class="value" id="totalVolume">$0.00</div>
            </div>
            <div class="stat-card">
                <div class="title">Success Rate</div>
                <div class="value" id="successRate">0%</div>
            </div>
            <div class="stat-card">
                <div class="title">Average Value</div>
                <div class="value" id="averageValue">$0.00</div>
            </div>
        </div>

        <!-- Filters Section -->
        <div class="filters-section">
            <div class="filter-group">
                <label for="statusFilter">Status:</label>
                <select id="statusFilter">
                    <option value="all">All</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                </select>
            </div>
            <div class="filter-group">
                <label for="chainFilter">Chain:</label>
                <select id="chainFilter">
                    <option value="all">All</option>
                    <option value="Polygon">Polygon</option>
                    <option value="TRC20">TRC20</option>
                </select>
            </div>
            <div class="filter-group">
                <label for="dateRange">Date Range:</label>
                <input type="date" id="dateRange">
            </div>
            <button id="exportButton" class="export-button">
                <i class="fas fa-download"></i> Export
            </button>
        </div>

        <!-- Transactions List -->
        <div class="transactions-list" id="transactionsList">
            <!-- Transaction items will be populated here by JavaScript -->
        </div>
    `;
    
    pageContainer.style.display = 'block';
    
    // Initialize transactions functionality
    initializeTransactionsPage();
    
    try {
        const response = await fetch(`https://halaxa-backend.onrender.com/api/transactions/${state.sellerId}`, {
            headers: {
                'Authorization': `Bearer ${state.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch transactions data');
        }

        const data = await response.json();
        if (data.success) {
            updateTransactionsList(data.data.transactions);
            updateTransactionStats(data.data.stats);
        }
    } catch (error) {
        console.error('Error loading transactions page:', error);
    }
}

async function loadPaymentLinkPage() {
    const pageContainer = document.getElementById('payment-link-page');
    
    // Load payment link page content
    pageContainer.innerHTML = `
        <h1 class="page-title">Create Payment Link</h1>
        <div class="payment-link-form-container">
            <form id="createPaymentLinkForm">
                <div class="form-group">
                    <label for="amount">Amount (USDC)</label>
                    <input type="number" id="amount" name="amount" step="0.01" required placeholder="e.g., 100.00">
                    <div class="gas-badge" id="gasEstimateBadge">Select chain for gas estimate</div>
                </div>
                <div class="form-group">
                    <label for="wallet_address">Recipient Wallet Address</label>
                    <input type="text" id="wallet_address" name="wallet_address" required placeholder="e.g., 0x...">
                </div>
                <div class="form-group">
                    <label for="chain">Blockchain Network</label>
                    <select id="chain" name="chain" required>
                        <option value="">Select Chain</option>
                        <option value="Polygon" class="chain-option">Polygon</option>
                        <option value="TRC20" class="chain-option">TRC20 (Tron)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="product_title">Product/Service Title</label>
                    <input type="text" id="product_title" name="product_title" required placeholder="e.g., Consulting Service">
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn-primary">Create Link</button>
                    <div class="microcopy">Securely processed on-chain with 0% fees.</div>
                </div>
            </form>
        </div>
        <div id="paymentLinkDisplayArea" class="payment-link-display-area" style="display: none;">
            <div class="generated-link-container">
                <span id="generatedLink"></span>
                <button id="copyLinkButton" class="copy-button">Copy</button>
            </div>
            <div class="link-timer">Link visible for <span id="linkTimerDisplay">20</span> seconds</div>
        </div>
    `;
    
    pageContainer.style.display = 'block';
    
    // Initialize payment link form functionality
    initializePaymentLinkPage();
}

async function loadCapitalPage() {
    const pageContainer = document.getElementById('capital-page');
    
    // Load capital page content with exact structure from Capital.html
    pageContainer.innerHTML = `
        <h1 class="page-title">Capital Overview</h1>
        <div class="capital-grid">
            <!-- Card 1: Total Balance -->
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Total Balance</div>
                    <div class="card-actions"><i class="fas fa-ellipsis-h"></i></div>
                </div>
                <div class="metric-value" id="totalBalance">$0.00 USDC</div>
                <div class="metric-label">Across all accounts</div>
            </div>
            <!-- Card 2: Incoming Capital -->
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Incoming Capital (30 Days)</div>
                    <div class="card-actions"><i class="fas fa-ellipsis-h"></i></div>
                </div>
                <div class="metric-value" id="incomingCapital">$0.00 USDC</div>
                <div class="metric-label">Total received in last 30 days</div>
            </div>
            <!-- Additional capital content... -->
        </div>
    `;
    
    pageContainer.style.display = 'block';
    
    try {
        const response = await fetch(`https://halaxa-backend.onrender.com/api/capital/summary`, {
            headers: {
                'Authorization': `Bearer ${state.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch capital data');
        }

        const data = await response.json();
        if (data.success) {
            updateCapitalUI(data.data);
        }
    } catch (error) {
        console.error('Error loading capital page:', error);
    }
}

async function loadAccountPage() {
    const pageContainer = document.getElementById('account-page');
    
    // Load account page content
    pageContainer.innerHTML = `
        <h1 class="page-title">Account Settings</h1>
        <div class="account-sections">
            <div class="account-section">
                <h2>Profile Information</h2>
                <div id="profileSection">
                    <!-- Profile content will be loaded here -->
                </div>
            </div>
            <div class="account-section">
                <h2>Security Settings</h2>
                <div id="securitySection">
                    <!-- Security content will be loaded here -->
                </div>
            </div>
        </div>
    `;
    
    pageContainer.style.display = 'block';
    
    try {
        const response = await fetch(`https://halaxa-backend.onrender.com/api/users/${state.sellerId}/profile`, {
            headers: {
                'Authorization': `Bearer ${state.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch account data');
        }

        const data = await response.json();
        if (data.success) {
            updateAccountUI(data.data);
        }
    } catch (error) {
        console.error('Error loading account page:', error);
    }
}

async function loadPlansPage() {
    const pageContainer = document.getElementById('plans-page');
    
    // Load plans page content
    pageContainer.innerHTML = `
        <h1 class="page-title">Subscription Plans</h1>
        <div class="plans-grid" id="plansGrid">
            <!-- Plans will be loaded here -->
        </div>
    `;
    
    pageContainer.style.display = 'block';
    
    try {
        const response = await fetch(`https://halaxa-backend.onrender.com/api/plans`, {
            headers: {
                'Authorization': `Bearer ${state.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch plans data');
        }

        const data = await response.json();
        if (data.success) {
            updatePlansUI(data.data);
        }
    } catch (error) {
        console.error('Error loading plans page:', error);
    }
}

async function loadHelpPage() {
    const pageContainer = document.getElementById('help-page');
    
    // Load help page content
    pageContainer.innerHTML = `
        <h1 class="page-title">Help & Support</h1>
        <div class="help-sections">
            <div class="faq-section">
                <h2>Frequently Asked Questions</h2>
                <div id="faqContainer">
                    <!-- FAQ items will be loaded here -->
                </div>
            </div>
            <div class="contact-section">
                <h2>Contact Support</h2>
                <div id="contactForm">
                    <!-- Contact form will be loaded here -->
                </div>
            </div>
        </div>
    `;
    
    pageContainer.style.display = 'block';
    
    try {
        const response = await fetch(`https://halaxa-backend.onrender.com/api/help/faq`, {
            headers: {
                'Authorization': `Bearer ${state.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch help data');
        }

        const data = await response.json();
        if (data.success) {
            updateHelpUI(data.data);
        }
    } catch (error) {
        console.error('Error loading help page:', error);
    }
}

// UI Update Functions
function updateDashboardUI(data) {
    // Update metrics
    const metrics = {
        'total-usdc-earned': data.total_usdc_earned || 0,
        'total-transactions': data.total_transactions || 0,
        'successful-transactions': data.successful_transactions || 0,
        'average-transaction-value': data.average_transaction_value || 0
    };

    Object.entries(metrics).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = typeof value === 'number' ? value.toFixed(2) : value;
        }
    });

    // Update recent transactions
    const transactionsList = document.querySelector('.recent-transactions');
    if (transactionsList && data.recent_transactions) {
        transactionsList.innerHTML = '';
        if (data.recent_transactions.length > 0) {
            data.recent_transactions.forEach(transaction => {
                const transactionItem = document.createElement('div');
                transactionItem.classList.add('list-item');
                transactionItem.innerHTML = `
                    <div class="details">
                        <span>${transaction.description || 'Transaction'}</span>
                        <span class="label">${new Date(transaction.date).toLocaleDateString()}</span>
                    </div>
                    <span class="value" style="color: ${transaction.type === 'received' ? '#28a745' : '#dc3545'}">
                        ${transaction.type === 'received' ? '+' : '-'}$${transaction.amount.toFixed(2)} USDC
                    </span>
                `;
                transactionsList.appendChild(transactionItem);
            });
        } else {
            transactionsList.innerHTML = `
                <div class="empty-state">
                    <p>No transactions yet</p>
                    <small>Your recent transactions will appear here</small>
                </div>
            `;
        }
    }

    // Update recent buyers
    const buyersList = document.querySelector('.recent-buyers');
    if (buyersList && data.recent_buyers) {
        buyersList.innerHTML = '';
        if (data.recent_buyers.length > 0) {
            data.recent_buyers.forEach(buyer => {
                const buyerItem = document.createElement('div');
                buyerItem.classList.add('list-item');
                buyerItem.innerHTML = `
                    <div class="details">
                        <span>${buyer.name || 'Anonymous'}</span>
                        <span class="label">${buyer.email || 'No email'}</span>
                    </div>
                    <span class="value">$${buyer.total_spent.toFixed(2)} USDC</span>
                `;
                buyersList.appendChild(buyerItem);
            });
        } else {
            buyersList.innerHTML = `
                <div class="empty-state">
                    <p>No buyers yet</p>
                    <small>Your recent buyers will appear here</small>
                </div>
            `;
        }
    }
}

function initializeVolumeChart(volumeData) {
    const volumeChart = document.getElementById('volumeChart');
    if (volumeChart && volumeData) {
        const ctx = volumeChart.getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: volumeData.labels || [],
                datasets: [{
                    label: 'Volume',
                    data: volumeData.values || [],
                    borderColor: '#4CAF50',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(76, 175, 80, 0.1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
}

// Initialize transactions page functionality
function initializeTransactionsPage() {
    // Add event listeners for filters
    const statusFilter = document.getElementById('statusFilter');
    const chainFilter = document.getElementById('chainFilter');
    const dateRange = document.getElementById('dateRange');
    const exportButton = document.getElementById('exportButton');

    if (statusFilter) {
        statusFilter.addEventListener('change', filterTransactions);
    }
    if (chainFilter) {
        chainFilter.addEventListener('change', filterTransactions);
    }
    if (dateRange) {
        dateRange.addEventListener('change', filterTransactions);
    }
    if (exportButton) {
        exportButton.addEventListener('click', exportTransactions);
    }
}

function filterTransactions() {
    // Implementation for filtering transactions
    console.log('Filtering transactions...');
}

function exportTransactions() {
    // Implementation for exporting transactions
    console.log('Exporting transactions...');
}

// Placeholder functions for other UI updates
function updateTransactionsList(transactions) {
    const transactionsList = document.getElementById('transactionsList');
    if (!transactionsList || !transactions) return;

    transactionsList.innerHTML = '';
    
    if (transactions.length === 0) {
        transactionsList.innerHTML = `
            <div class="empty-state">
                <p>No transactions found</p>
                <small>Your transactions will appear here</small>
            </div>
        `;
        return;
    }

    transactions.forEach(transaction => {
        const transactionItem = document.createElement('div');
        transactionItem.classList.add('list-item');
        transactionItem.innerHTML = `
            <div class="transaction-info">
                <div class="description">${transaction.description || 'Transaction'}</div>
                <div class="details">
                    <span>${transaction.chain || 'Unknown'}</span>
                    <span>•</span>
                    <span>${new Date(transaction.date).toLocaleDateString()}</span>
                </div>
            </div>
            <div class="amount">$${transaction.amount.toFixed(2)} USDC</div>
            <div class="status ${transaction.status.toLowerCase()}">${transaction.status}</div>
            <button class="view-details">
                <i class="fas fa-eye"></i>
                View
            </button>
        `;
        transactionsList.appendChild(transactionItem);
    });
}

function updateTransactionStats(stats) {
    if (!stats) return;

    const elements = {
        totalTransactions: document.getElementById('totalTransactions'),
        totalVolume: document.getElementById('totalVolume'),
        successRate: document.getElementById('successRate'),
        averageValue: document.getElementById('averageValue')
    };

    if (elements.totalTransactions) {
        elements.totalTransactions.textContent = stats.total_transactions || 0;
    }
    if (elements.totalVolume) {
        elements.totalVolume.textContent = `$${(stats.total_volume || 0).toFixed(2)}`;
    }
    if (elements.successRate) {
        elements.successRate.textContent = `${(stats.success_rate || 0).toFixed(1)}%`;
    }
    if (elements.averageValue) {
        elements.averageValue.textContent = `$${(stats.average_value || 0).toFixed(2)}`;
    }
}

function updateCapitalUI(data) {
    // Update summary cards
    updateSummaryCards(data.summary);
    
    // Update insights chart
    updateInsightsChart(data.insights);
    
    // Update connected accounts
    updateConnectedAccounts(data.accounts);
    
    // Update recent movements
    updateRecentMovements(data.movements);
    
    // Update chain distribution
    updateChainDistribution(data.chains);
}

function updateSummaryCards(summary) {
    // Update total capital
    document.getElementById('totalCapitalAmount').textContent = formatCurrency(summary.total_capital);
    updateTrend('totalCapitalTrend', summary.total_capital_trend);

    // Update available capital
    document.getElementById('availableCapitalAmount').textContent = formatCurrency(summary.available_capital);
    updateTrend('availableCapitalTrend', summary.available_capital_trend);

    // Update locked capital
    document.getElementById('lockedCapitalAmount').textContent = formatCurrency(summary.locked_capital);
    updateTrend('lockedCapitalTrend', summary.locked_capital_trend);
}

function updateTrend(elementId, trend) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const icon = element.querySelector('i');
    const span = element.querySelector('span');

    if (trend >= 0) {
        icon.className = 'fas fa-arrow-up';
        element.classList.remove('negative');
        element.classList.add('positive');
    } else {
        icon.className = 'fas fa-arrow-down';
        element.classList.remove('positive');
        element.classList.add('negative');
    }

    span.textContent = `${Math.abs(trend)}%`;
}

function initializeCapitalChart() {
    const ctx = document.getElementById('capitalChart').getContext('2d');
    window.capitalChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Total Capital',
                    data: [],
                    borderColor: '#2C3E50',
                    tension: 0.4
                },
                {
                    label: 'Available Capital',
                    data: [],
                    borderColor: '#3498db',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

function updateInsightsChart(insights) {
    if (!window.capitalChart) return;

    window.capitalChart.data.labels = insights.dates;
    window.capitalChart.data.datasets[0].data = insights.total_capital;
    window.capitalChart.data.datasets[1].data = insights.available_capital;
    window.capitalChart.update();
}

function updateConnectedAccounts(accounts) {
    const accountsList = document.getElementById('accountsList');
    if (!accountsList) return;

    accountsList.innerHTML = accounts.map(account => `
        <div class="account-card">
            <div class="account-icon">
                <i class="fas fa-wallet"></i>
            </div>
            <div class="account-info">
                <div class="account-name">${account.name}</div>
                <div class="account-balance">${formatCurrency(account.balance)}</div>
            </div>
        </div>
    `).join('');
}

function updateRecentMovements(movements) {
    const movementsList = document.getElementById('movementsList');
    if (!movementsList) return;

    movementsList.innerHTML = movements.map(movement => `
        <div class="movement-item">
            <div class="movement-info">
                <div class="movement-icon">
                    <i class="fas ${getMovementIcon(movement.type)}"></i>
                </div>
                <div class="movement-details">
                    <div class="movement-type">${movement.type}</div>
                    <div class="movement-date">${formatDate(movement.date)}</div>
                </div>
            </div>
            <div class="movement-amount">${formatCurrency(movement.amount)}</div>
        </div>
    `).join('');
}

function updateChainDistribution(chains) {
    const chainDistribution = document.getElementById('chainDistribution');
    if (!chainDistribution) return;

    chainDistribution.innerHTML = chains.map(chain => `
        <div class="chain-card">
            <div class="chain-icon">
                <i class="fas ${getChainIcon(chain.name)}"></i>
            </div>
            <div class="chain-info">
                <div class="chain-name">${chain.name}</div>
                <div class="chain-amount">${formatCurrency(chain.amount)}</div>
            </div>
        </div>
    `).join('');
}

function getMovementIcon(type) {
    const icons = {
        'deposit': 'fa-arrow-down',
        'withdrawal': 'fa-arrow-up',
        'transfer': 'fa-exchange-alt',
        'payment': 'fa-money-bill-wave'
    };
    return icons[type.toLowerCase()] || 'fa-circle';
}

function getChainIcon(chain) {
    const icons = {
        'ethereum': 'fa-ethereum',
        'polygon': 'fa-polygon',
        'arbitrum': 'fa-arbitrum'
    };
    return icons[chain.toLowerCase()] || 'fa-link';
}

function setupTimeFilterListeners() {
    const timeFilter = document.querySelector('.time-filter');
    if (!timeFilter) return;

    timeFilter.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            // Remove active class from all buttons
            timeFilter.querySelectorAll('button').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Add active class to clicked button
            e.target.classList.add('active');
            
            // Fetch new data for selected period
            fetchCapitalData(e.target.dataset.period);
        }
    });
}

function loadDemoData() {
    const demoData = {
        summary: {
            total_capital: 50000,
            total_capital_trend: 5.2,
            available_capital: 35000,
            available_capital_trend: 3.8,
            locked_capital: 15000,
            locked_capital_trend: 1.4
        },
        insights: {
            dates: ['2024-03-10', '2024-03-11', '2024-03-12', '2024-03-13', '2024-03-14', '2024-03-15', '2024-03-16'],
            total_capital: [45000, 46000, 47000, 48000, 49000, 49500, 50000],
            available_capital: [32000, 32500, 33000, 33500, 34000, 34500, 35000]
        },
        accounts: [
            { name: 'Main Wallet', balance: 25000 },
            { name: 'Trading Account', balance: 15000 },
            { name: 'Savings', balance: 10000 }
        ],
        movements: [
            { type: 'deposit', date: '2024-03-16', amount: 5000 },
            { type: 'withdrawal', date: '2024-03-15', amount: -2000 },
            { type: 'transfer', date: '2024-03-14', amount: 1000 }
        ],
        chains: [
            { name: 'Ethereum', amount: 30000 },
            { name: 'Polygon', amount: 15000 },
            { name: 'Arbitrum', amount: 5000 }
        ]
    };

    updateCapitalUI(demoData);
}

// Capital Page Functions
function initializeCapitalPage() {
    const sellerId = getSellerId();
    const token = localStorage.getItem('token');
    
    if (!token || !sellerId) {
        showError('Please log in to view capital information');
        return;
    }

    try {
        fetchCapitalData();
        initializeCapitalChart();
        setupTimeFilterListeners();
    } catch (error) {
        console.error('Error initializing capital page:', error);
        showError('Failed to initialize capital page');
    }
}

async function fetchCapitalData() {
    const sellerId = getSellerId();
    const token = localStorage.getItem('token');
    
    if (!token || !sellerId) {
        showError('Please log in to view capital information');
        return;
    }

    try {
        // Fetch capital summary
        const summaryResponse = await fetch(`https://halaxa-backend.onrender.com/api/capital/summary`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        // Fetch capital insights
        const insightsResponse = await fetch(`https://halaxa-backend.onrender.com/api/capital/insights`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        // Fetch connected accounts
        const accountsResponse = await fetch(`https://halaxa-backend.onrender.com/api/capital/accounts`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        // Fetch recent capital movements
        const movementsResponse = await fetch(`https://halaxa-backend.onrender.com/api/capital/movements`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        // Fetch capital by chain
        const chainResponse = await fetch(`https://halaxa-backend.onrender.com/api/capital/by-chain`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!summaryResponse.ok || !insightsResponse.ok || !accountsResponse.ok || 
            !movementsResponse.ok || !chainResponse.ok) {
            throw new Error('Failed to fetch capital data');
        }

        const summaryData = await summaryResponse.json();
        const insightsData = await insightsResponse.json();
        const accountsData = await accountsResponse.json();
        const movementsData = await movementsResponse.json();
        const chainData = await chainResponse.json();

        // Update UI with the data
        updateCapitalUI({
            summary: summaryData.data,
            insights: insightsData.data,
            accounts: accountsData.data,
            movements: movementsData.data,
            chains: chainData.data
        });
    } catch (error) {
        console.error('Error fetching capital data:', error);
        showError('Failed to fetch capital data');
        loadDemoData();
    }
}

function updateCapitalUI(data) {
    // Update summary cards
    updateSummaryCards(data.summary);
    
    // Update insights chart
    updateInsightsChart(data.insights);
    
    // Update connected accounts
    updateConnectedAccounts(data.accounts);
    
    // Update recent movements
    updateRecentMovements(data.movements);
    
    // Update chain distribution
    updateChainDistribution(data.chains);
}

function updateAccountUI(data) {
    // Update profile form
    updateProfileForm(data.profile);
    
    // Update security settings
    updateSecuritySettings(data.security);
    
    // Update notification preferences
    updateNotificationPreferences(data.settings.notifications);
    
    // Update connected accounts
    updateConnectedAccounts(data.settings.connected_accounts);
}

function updateProfileForm(profile) {
    document.getElementById('fullName').value = profile.full_name || '';
    document.getElementById('email').value = profile.email || '';
    document.getElementById('phone').value = profile.phone || '';
    document.getElementById('company').value = profile.company || '';
}

function updateSecuritySettings(security) {
    document.getElementById('enable2FA').checked = security.two_factor_enabled || false;
}

function updateNotificationPreferences(notifications) {
    document.getElementById('emailNotifications').checked = notifications.email || false;
    document.getElementById('transactionAlerts').checked = notifications.transactions || false;
    document.getElementById('securityAlerts').checked = notifications.security || false;
}

function updateConnectedAccounts(accounts) {
    const accountsList = document.getElementById('connectedAccountsList');
    if (!accountsList) return;

    accountsList.innerHTML = accounts.map(account => `
        <div class="connected-account">
            <div class="account-icon">
                <i class="fas ${getAccountIcon(account.type)}"></i>
            </div>
            <div class="account-info">
                <div class="account-name">${account.name}</div>
                <div class="account-status">${account.status}</div>
            </div>
        </div>
    `).join('');
}

function getAccountIcon(type) {
    const icons = {
        'wallet': 'fa-wallet',
        'bank': 'fa-university',
        'crypto': 'fa-bitcoin-sign'
    };
    return icons[type.toLowerCase()] || 'fa-link';
}

function setupAccountFormListeners() {
    // Profile form
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await updateProfile();
        });
    }

    // Security form
    const securityForm = document.getElementById('securityForm');
    if (securityForm) {
        securityForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await updatePassword();
        });
    }

    // Notification form
    const notificationForm = document.getElementById('notificationForm');
    if (notificationForm) {
        notificationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await updateNotificationPreferences();
        });
    }

    // 2FA toggle
    const enable2FA = document.getElementById('enable2FA');
    if (enable2FA) {
        enable2FA.addEventListener('change', async (e) => {
            await update2FA(e.target.checked);
        });
    }

    // Connect new account button
    const connectNewAccountBtn = document.getElementById('connectNewAccountBtn');
    if (connectNewAccountBtn) {
        connectNewAccountBtn.addEventListener('click', () => {
            showConnectAccountModal();
        });
    }

    // Delete account button
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', () => {
            showDeleteAccountConfirmation();
        });
    }
}

async function updateProfile() {
    const sellerId = getSellerId();
    const token = localStorage.getItem('token');
    
    if (!token || !sellerId) {
        showError('Please log in to update profile');
        return;
    }

    const formData = {
        full_name: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        company: document.getElementById('company').value
    };

    try {
        const response = await fetch(`https://halaxa-backend.onrender.com/api/users/${sellerId}/profile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error('Failed to update profile');
        }

        showSuccess('signupSuccess', 'Profile updated successfully');
    } catch (error) {
        console.error('Error updating profile:', error);
        showError('signupError', 'Failed to update profile');
    }
}

async function updatePassword() {
    const sellerId = getSellerId();
    const token = localStorage.getItem('token');
    
    if (!token || !sellerId) {
        showError('Please log in to update password');
        return;
    }

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        showError('signupError', 'New passwords do not match');
        return;
    }

    try {
        const response = await fetch(`https://halaxa-backend.onrender.com/api/users/${sellerId}/password`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        });

        if (!response.ok) {
            throw new Error('Failed to update password');
        }

        showSuccess('signupSuccess', 'Password updated successfully');
        document.getElementById('securityForm').reset();
    } catch (error) {
        console.error('Error updating password:', error);
        showError('signupError', 'Failed to update password');
    }
}

async function updateNotificationPreferences() {
    const sellerId = getSellerId();
    const token = localStorage.getItem('token');
    
    if (!token || !sellerId) {
        showError('Please log in to update notification preferences');
        return;
    }

    const preferences = {
        email: document.getElementById('emailNotifications').checked,
        transactions: document.getElementById('transactionAlerts').checked,
        security: document.getElementById('securityAlerts').checked
    };

    try {
        const response = await fetch(`https://halaxa-backend.onrender.com/api/users/${sellerId}/notifications`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(preferences)
        });

        if (!response.ok) {
            throw new Error('Failed to update notification preferences');
        }

        showSuccess('signupSuccess', 'Notification preferences updated successfully');
    } catch (error) {
        console.error('Error updating notification preferences:', error);
        showError('signupError', 'Failed to update notification preferences');
    }
}

async function update2FA(enabled) {
    const sellerId = getSellerId();
    const token = localStorage.getItem('token');
    
    if (!token || !sellerId) {
        showError('Please log in to update 2FA settings');
        return;
    }

    try {
        const response = await fetch(`https://halaxa-backend.onrender.com/api/users/${sellerId}/2fa`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ enabled })
        });

        if (!response.ok) {
            throw new Error('Failed to update 2FA settings');
        }

        showSuccess('signupSuccess', `Two-factor authentication ${enabled ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
        console.error('Error updating 2FA settings:', error);
        showError('signupError', 'Failed to update 2FA settings');
        // Revert the toggle
        document.getElementById('enable2FA').checked = !enabled;
    }
}

function showConnectAccountModal() {
    // Implementation for showing connect account modal
    alert('Connect account functionality will be implemented here');
}

function showDeleteAccountConfirmation() {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        deleteAccount();
    }
}

async function deleteAccount() {
    const sellerId = getSellerId();
    const token = localStorage.getItem('token');
    
    if (!token || !sellerId) {
        showError('Please log in to delete account');
        return;
    }

    try {
        const response = await fetch(`https://halaxa-backend.onrender.com/api/users/${sellerId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete account');
        }

        // Clear local storage and redirect to login
        localStorage.clear();
        window.location.href = '/Pages/login.html';
    } catch (error) {
        console.error('Error deleting account:', error);
        showError('signupError', 'Failed to delete account');
    }
}

function loadDemoData() {
    const demoData = {
        profile: {
            full_name: 'John Doe',
            email: 'john@example.com',
            phone: '+1234567890',
            company: 'Demo Company'
        },
        security: {
            two_factor_enabled: false
        },
        settings: {
            notifications: {
                email: true,
                transactions: true,
                security: true
            },
            connected_accounts: [
                {
                    type: 'wallet',
                    name: 'Main Wallet',
                    status: 'Connected'
                },
                {
                    type: 'bank',
                    name: 'Bank Account',
                    status: 'Connected'
                }
            ]
        }
    };

    updateAccountUI(demoData);
}

// Plans Page Functions
function initializePlansPage() {
    const sellerId = getSellerId();
    const token = localStorage.getItem('token');
    
    if (!token || !sellerId) {
        showError('Please log in to view plans');
        return;
    }

    try {
        fetchCurrentPlan();
        setupPlanSelectionListeners();
    } catch (error) {
        console.error('Error initializing plans page:', error);
        showError('Failed to initialize plans page');
    }
}

async function fetchCurrentPlan() {
    const sellerId = getSellerId();
    const token = localStorage.getItem('token');
    
    if (!token || !sellerId) {
        showError('Please log in to view your current plan');
        return;
    }

    try {
        const response = await fetch(`https://halaxa-backend.onrender.com/api/users/${sellerId}/subscription`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch current plan');
        }

        const { data, error } = await response.json();
        if (error) throw error;

        updatePlanUI(data);
    } catch (error) {
        console.error('Error fetching current plan:', error);
        showError('Failed to fetch current plan');
        loadDemoPlanData();
    }
}

function updatePlanUI(data) {
    // Highlight current plan
    const planCards = document.querySelectorAll('.plan-card');
    planCards.forEach(card => {
        card.classList.remove('current-plan');
        if (card.querySelector('h3').textContent.toLowerCase() === data.plan.toLowerCase()) {
            card.classList.add('current-plan');
            const button = card.querySelector('.plan-button');
            if (button) {
                button.textContent = 'Current Plan';
                button.disabled = true;
            }
        }
    });

    // Update subscription details if available
    if (data.next_billing_date) {
        const billingInfo = document.createElement('div');
        billingInfo.className = 'billing-info';
        billingInfo.innerHTML = `
            <p>Next billing date: ${new Date(data.next_billing_date).toLocaleDateString()}</p>
            <p>Status: ${data.status}</p>
        `;
        document.querySelector('.plans-header').appendChild(billingInfo);
    }
}

function setupPlanSelectionListeners() {
    const planButtons = document.querySelectorAll('.plan-button');
    planButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const plan = e.target.closest('.plan-card').querySelector('h3').textContent.toLowerCase();
            selectPlan(plan);
        });
    });
}

async function selectPlan(plan) {
    const sellerId = getSellerId();
    const token = localStorage.getItem('token');
    
    if (!token || !sellerId) {
        showError('Please log in to select a plan');
        return;
    }

    try {
        // For enterprise plan, redirect to contact form
        if (plan === 'enterprise') {
            window.location.href = '/contact-sales.html';
            return;
        }

        const response = await fetch(`https://halaxa-backend.onrender.com/api/users/${sellerId}/subscription`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ plan })
        });

        if (!response.ok) {
            throw new Error('Failed to update subscription');
        }

        const { data, error } = await response.json();
        if (error) throw error;

        // Redirect to payment page or show success message
        if (data.payment_required) {
            window.location.href = data.payment_url;
        } else {
            showSuccess('signupSuccess', 'Plan updated successfully!');
            fetchCurrentPlan();
        }
    } catch (error) {
        console.error('Error selecting plan:', error);
        showError('signupError', 'Failed to update subscription');
    }
}

function loadDemoPlanData() {
    const demoData = {
        plan: 'free',
        status: 'active',
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
    updatePlanUI(demoData);
}

// Help Page Functions
function initializeHelpPage() {
    // FAQ Accordion
    const faqItems = document.querySelectorAll('#helpPage .faq-item');
    const searchInput = document.getElementById('helpSearch');
    const categoryTags = document.querySelectorAll('#helpPage .category-tag');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        question.addEventListener('click', () => {
            const isOpen = answer.classList.contains('open');
            // Close all other FAQs
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    const otherQuestion = otherItem.querySelector('.faq-question');
                    const otherAnswer = otherItem.querySelector('.faq-answer');
                    otherQuestion.classList.remove('active');
                    otherAnswer.classList.remove('open');
                    otherAnswer.style.display = 'none';
                }
            });
            // Toggle current FAQ
            question.classList.toggle('active');
            answer.classList.toggle('open');
            answer.style.display = isOpen ? 'none' : 'block';
        });
    });

    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            faqItems.forEach(item => {
                const question = item.querySelector('.faq-question').textContent.toLowerCase();
                const answer = item.querySelector('.faq-answer').textContent.toLowerCase();
                if (question.includes(searchTerm) || answer.includes(searchTerm)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }

    // Category filtering
    categoryTags.forEach(tag => {
        tag.addEventListener('click', () => {
            categoryTags.forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            const category = tag.textContent.toLowerCase();
            faqItems.forEach(item => {
                if (category === 'all') {
                    item.style.display = 'block';
                } else {
                    const question = item.querySelector('.faq-question').textContent.toLowerCase();
                    item.style.display = question.includes(category) ? 'block' : 'none';
                }
            });
        });
    });
}

// Function to switch between dashboard pages
function switchPage(pageId) {
    // Update active nav item
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === pageId) {
            item.classList.add('active');
        }
    });

    // Hide all pages and show the target page
    const pages = document.querySelectorAll('.page-content');
    pages.forEach(page => {
        page.style.display = 'none';
    });
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.style.display = 'block';
    }
}

// Function to handle navigation
function navigateToPage(pageId) {
    window.location.hash = pageId;
    switchPage(pageId);
}

// Authentication Functions
function showSignupPage() {
    document.getElementById('signupPage').style.display = 'flex';
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('dashboardContainer').style.display = 'none';
}

function showLoginPage() {
    document.getElementById('signupPage').style.display = 'none';
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('dashboardContainer').style.display = 'none';
}

function showDashboard() {
    document.getElementById('signupPage').style.display = 'none';
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('dashboardContainer').style.display = 'flex';
}

// Handle signup form submission
async function handleSignup(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    const name = formData.get('name');
    const email = formData.get('email');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    
    if (password !== confirmPassword) {
        showError('signupError', 'Passwords do not match');
        return;
    }
    
    try {
        showLoading('signup', true);
        const response = await fetch('https://halaxa-backend.onrender.com/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('sellerId', data.sellerId);
            showSuccess('signupSuccess', 'Account created successfully!');
            setTimeout(() => {
                showDashboard();
                initializeDashboard(data.sellerId);
            }, 1000);
        } else {
            showError('signupError', data.message || 'Signup failed');
        }
    } catch (error) {
        showError('signupError', 'Network error. Please try again.');
    } finally {
        showLoading('signup', false);
    }
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    const email = formData.get('email');
    const password = formData.get('password');
    
    try {
        showLoading('login', true);
        const response = await fetch('https://halaxa-backend.onrender.com/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('sellerId', data.sellerId);
            showSuccess('loginSuccess', 'Login successful!');
            setTimeout(() => {
                showDashboard();
                initializeDashboard(data.sellerId);
            }, 1000);
        } else {
            showError('loginError', data.message || 'Login failed');
        }
    } catch (error) {
        showError('loginError', 'Network error. Please try again.');
    } finally {
        showLoading('login', false);
    }
}

// Utility functions
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 5000);
}

function showSuccess(elementId, message) {
    const successElement = document.getElementById(elementId);
    successElement.textContent = message;
    successElement.style.display = 'block';
    setTimeout(() => {
        successElement.style.display = 'none';
    }, 3000);
}

function showLoading(type, show) {
    const button = document.querySelector(`#${type}Form .auth-button`);
    const buttonText = button.querySelector('.button-text');
    const loadingSpinner = button.querySelector('.loading-spinner');
    
    if (show) {
        buttonText.style.display = 'none';
        loadingSpinner.style.display = 'flex';
        button.disabled = true;
    } else {
        buttonText.style.display = 'block';
        loadingSpinner.style.display = 'none';
        button.disabled = false;
    }
}

// Function to check authentication and initialize dashboard
function checkAuthAndInitDashboard() {
    const token = localStorage.getItem('token');
    const sellerId = localStorage.getItem('sellerId');
    
    if (!token || !sellerId) {
        showSignupPage();
        return false;
    }
    
    showDashboard();
    initializeDashboard(sellerId);
    return true;
}

// Function to initialize dashboard
function initializeDashboard(sellerId) {
    console.log('Dashboard initialized with seller ID:', sellerId);
    
    // Initialize all page functions
    initializeHomePage();
    initializeTransactionsPage();
    initializePaymentLinkPage();
    initializeCapitalPage();
    initializeAccountPage();
    initializePlansPage();
    initializeHelpPage();
}

// Placeholder functions for page initialization
function initializeHomePage() {
    console.log('Home page initialized');
}

function initializeTransactionsPage() {
    console.log('Transactions page initialized');
}

function initializePaymentLinkPage() {
    console.log('Payment Link page initialized');
}

function initializeCapitalPage() {
    console.log('Capital page initialized');
}

function initializeAccountPage() {
    console.log('Account page initialized');
}

// Update the page initialization
document.addEventListener('DOMContentLoaded', function() {
    // Add form event listeners
    document.getElementById('signupForm').addEventListener('submit', handleSignup);
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Check authentication and show appropriate page
    if (!checkAuthAndInitDashboard()) {
        return; // Show signup page if not authenticated
    }

    // Add click listeners to nav items for navigation (only if authenticated)
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const pageId = this.getAttribute('data-page');
            if (pageId) {
                navigateToPage(pageId);
            }
        });
    });

    // Handle hashchange for direct URL navigation
    window.addEventListener('hashchange', function() {
        const pageId = window.location.hash.substring(1);
        if (pageId) {
            switchPage(pageId);
        }
    });

    // Initial page load based on hash
    const initialPageId = window.location.hash.substring(1);
    if (initialPageId) {
        switchPage(initialPageId);
    } else {
        switchPage('homePage'); // Default to home page
    }
});

// ... existing code ...