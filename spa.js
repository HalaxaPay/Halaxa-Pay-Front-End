// Global state management
const state = {
    currentPage: 'home',
    sellerId: null,
    token: null,
    subscription: null,
    isAuthenticated: false
};

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    // Get seller ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const sellerId = urlParams.get('seller_id');
    
    if (sellerId) {
        // Store seller ID in state
        state.sellerId = sellerId;
        localStorage.setItem('sellerId', sellerId);
        
        // Set up navigation
        setupNavigation();
        
        // Load initial page
        const initialPage = window.location.hash.slice(1) || 'homePage';
        await loadPage(initialPage);
    } else {
        // Check if seller ID exists in localStorage
        const storedSellerId = localStorage.getItem('sellerId');
        if (storedSellerId) {
            state.sellerId = storedSellerId;
            
            // Set up navigation
            setupNavigation();
            
            const initialPage = window.location.hash.slice(1) || 'homePage';
            await loadPage(initialPage);
        } else {
            // Redirect to login if no seller ID is found
            window.location.href = 'https://halaxapay.netlify.app/login.html';
        }
    }
});

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
            if (page) {
                await loadPage(page);
            }
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
    
    // Show the selected page content
    const pageId = page.replace('Page', '-page');
    const pageElement = document.getElementById(pageId);
    if (pageElement) {
        pageElement.style.display = 'block';
    }
    
    // Load page specific content
    switch (page) {
        case 'homePage':
            await loadHomePage();
            break;
        case 'transactionsPage':
            await loadTransactionsPage();
            break;
        case 'paymentLinkPage':
            await loadPaymentLinkPage();
            break;
        case 'capitalPage':
            await loadCapitalPage();
            break;
        case 'accountPage':
            await loadAccountPage();
            break;
        case 'plansPage':
            await loadPlansPage();
            break;
        case 'helpPage':
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
            // Update stats
            document.getElementById('totalTransactions').textContent = data.data.stats.total_transactions;
            document.getElementById('totalVolume').textContent = formatCurrency(data.data.stats.total_volume);
            document.getElementById('successRate').textContent = `${data.data.stats.success_rate}%`;
            document.getElementById('averageValue').textContent = formatCurrency(data.data.stats.average_value);

            // Update transactions list
            const listElement = document.getElementById('transactionsList');
            listElement.innerHTML = '';
            
            if (!data.data.transactions || data.data.transactions.length === 0) {
                listElement.innerHTML = '<div class="list-item"><div class="details"><span>No transactions found</span></div></div>';
                return;
            }
            
            data.data.transactions.forEach(tx => {
                const listItem = document.createElement('div');
                listItem.classList.add('list-item');
                listItem.innerHTML = `
                    <div class="details">
                        <span class="transaction-id">${tx.id}</span>
                        <span class="description">${tx.description || 'Transaction'}</span>
                        <span class="buyer">${tx.buyer_email || 'Anonymous'}</span>
                        <span class="chain">${tx.chain}</span>
                        <span class="date">${formatDate(tx.created_at)}</span>
                    </div>
                    <div class="transaction-info">
                        <span class="amount" style="color: ${tx.type === 'received' ? '#28a745' : '#dc3545'}">
                            ${tx.type === 'received' ? '+' : '-'}${formatCurrency(tx.amount)} USDC
                        </span>
                        <span class="status ${tx.status.toLowerCase()}">${tx.status}</span>
                        <button class="view-details" onclick="viewTransactionDetails('${tx.id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </div>
                `;
                listElement.appendChild(listItem);
            });

            // Set up real-time updates
            setupTransactionRealTimeUpdates();
        }
    } catch (error) {
        console.error('Error loading transactions page:', error);
        showError('Failed to load transactions data');
    }
}

function setupTransactionRealTimeUpdates() {
    const ws = new WebSocket('wss://halaxa-backend.onrender.com/ws');
    
    ws.onopen = () => {
        console.log('WebSocket connected for transactions');
        ws.send(JSON.stringify({
            type: 'subscribe',
            channel: 'transactions',
            sellerId: state.sellerId
        }));
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'transaction_update') {
            loadTransactionsPage(); // Reload the page with new data
        }
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
        console.log('WebSocket disconnected');
        setTimeout(setupTransactionRealTimeUpdates, 5000);
    };
}

function viewTransactionDetails(transactionId) {
    window.location.href = `https://halaxapay.netlify.app/transaction-details?transaction_id=${transactionId}&seller_id=${state.sellerId}`;
}

function initializeTransactionsPage() {
    // Set up filter event listeners
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

    // Set up real-time updates
    setupTransactionRealTimeUpdates();
}

async function filterTransactions() {
    const status = document.getElementById('statusFilter').value;
    const chain = document.getElementById('chainFilter').value;
    const dateRange = document.getElementById('dateRange').value;
    
    try {
        const response = await fetch(`https://halaxa-backend.onrender.com/api/transactions/${state.sellerId}/filter`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${state.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status,
                chain,
                date_range: dateRange
            })
        });

        if (!response.ok) {
            throw new Error('Failed to filter transactions');
        }

        const data = await response.json();
        if (data.success) {
            updateTransactionsList(data.data.transactions);
            updateTransactionStats(data.data.stats);
        }
    } catch (error) {
        console.error('Error filtering transactions:', error);
        showError('Failed to filter transactions');
    }
}

async function exportTransactions() {
    try {
        const response = await fetch(`https://halaxa-backend.onrender.com/api/transactions/${state.sellerId}/export`, {
            headers: {
                'Authorization': `Bearer ${state.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to export transactions');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Error exporting transactions:', error);
        showError('Failed to export transactions');
    }
}

async function loadPaymentLinkPage() {
    try {
        // Add form submission handler
        const form = document.getElementById('createPaymentLinkForm');
        if (form) {
            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                await generatePaymentLink();
            });
        }

        // Add chain selection handler for gas estimate
        const chainSelect = document.getElementById('chain');
        if (chainSelect) {
            chainSelect.addEventListener('change', async () => {
                const chain = chainSelect.value;
                if (chain) {
                    try {
                        const response = await fetch(`https://halaxa-backend.onrender.com/api/gas-estimate?chain=${chain}`, {
                            headers: {
                                'Authorization': `Bearer ${state.token}`,
                                'Content-Type': 'application/json'
                            }
                        });

                        if (!response.ok) {
                            throw new Error('Failed to fetch gas estimate');
                        }

                        const data = await response.json();
                        const gasBadge = document.getElementById('gasEstimateBadge');
                        if (gasBadge) {
                            gasBadge.textContent = `Estimated gas: ${data.estimate} USDC`;
                        }
                    } catch (error) {
                        console.error('Error fetching gas estimate:', error);
                        const gasBadge = document.getElementById('gasEstimateBadge');
                        if (gasBadge) {
                            gasBadge.textContent = 'Failed to fetch gas estimate';
                        }
                    }
                }
            });
        }

        // Check subscription and update UI
        const subscription = await getSubscriptionInfo();
        updateSubscriptionBadge(subscription);

        // Load payment links data
        if (state.token && state.sellerId) {
            await fetchPaymentLinksData();
        } else {
            console.log('Using demo data - No authentication');
            updateSubscriptionBadge({ plan: 'Basic' });
            loadDemoData();
        }
    } catch (error) {
        console.error('Error loading payment link page:', error);
        showError('Failed to load payment link page');
    }
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
            <!-- Card 3: Outgoing Capital -->
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Outgoing Capital (30 Days)</div>
                    <div class="card-actions"><i class="fas fa-ellipsis-h"></i></div>
                </div>
                <div class="metric-value" id="outgoingCapital">$0.00 USDC</div>
                <div class="metric-label">Total sent in last 30 days</div>
            </div>
            <!-- Card 4: Recent Capital Movements -->
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Recent Capital Movements</div>
                    <div class="card-actions"><i class="fas fa-ellipsis-h"></i></div>
                </div>
                <div class="data-list" id="recentMovements">
                    <!-- Recent movements will be populated here -->
                </div>
            </div>
        </div>
        <div class="insights-grid">
            <!-- Analytics Dashboard -->
            <div class="insight-card">
                <div class="insight-header">
                    <h3>Analytics Dashboard</h3>
                    <div class="time-filter">
                        <button class="active" data-period="7d">7D</button>
                        <button data-period="30d">30D</button>
                        <button data-period="90d">90D</button>
                    </div>
                </div>
                <div class="chart-container">
                    <canvas id="capitalChart"></canvas>
                </div>
            </div>
            <!-- Connected Accounts List -->
            <div class="insight-card">
                <div class="insight-header">
                    <h3>Connected Accounts</h3>
                    <button class="connect-account-btn">Connect New</button>
                </div>
                <div class="account-list" id="connectedAccounts">
                    <!-- Connected accounts will be populated here -->
                </div>
            </div>
        </div>
    `;
    
    pageContainer.style.display = 'block';
    
    // Initialize capital page functionality
    initializeCapitalPage();
}

function initializeCapitalPage() {
    // Set up real-time updates
    setupRealTimeUpdates();
    
    // Initialize charts
    initializeCapitalChart();
    
    // Set up event listeners
    setupCapitalEventListeners();
    
    // Initial data fetch
    fetchCapitalData();
}

function setupRealTimeUpdates() {
    // Set up WebSocket connection for real-time updates
    const ws = new WebSocket('wss://halaxa-backend.onrender.com/ws');
    
    ws.onopen = () => {
        console.log('WebSocket connected');
        // Subscribe to capital updates
        ws.send(JSON.stringify({
            type: 'subscribe',
            channel: 'capital',
            sellerId: state.sellerId
        }));
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'capital_update') {
            updateCapitalUI(data.data);
        }
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
        console.log('WebSocket disconnected');
        // Attempt to reconnect after 5 seconds
        setTimeout(setupRealTimeUpdates, 5000);
    };
}

function setupCapitalEventListeners() {
    // Time filter buttons
    const timeFilterButtons = document.querySelectorAll('.time-filter button');
    timeFilterButtons.forEach(button => {
        button.addEventListener('click', () => {
            timeFilterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            fetchCapitalData(button.dataset.period);
        });
    });
    
    // Connect new account button
    const connectAccountBtn = document.querySelector('.connect-account-btn');
    if (connectAccountBtn) {
        connectAccountBtn.addEventListener('click', showConnectAccountModal);
    }
}

async function fetchCapitalData(period = '7d') {
    try {
        const response = await fetch(`https://halaxa-backend.onrender.com/api/capital/summary?period=${period}`, {
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
        console.error('Error fetching capital data:', error);
        showError('Failed to fetch capital data');
    }
}

function updateCapitalUI(data) {
    // Update summary metrics
    updateSummaryMetrics(data.summary);
    
    // Update recent movements
    updateRecentMovements(data.movements);
    
    // Update connected accounts
    updateConnectedAccounts(data.accounts);
    
    // Update capital chart
    updateCapitalChart(data.analytics);
}

function updateSummaryMetrics(summary) {
    // Update total balance
    const totalBalance = document.getElementById('totalBalance');
    if (totalBalance) {
        totalBalance.textContent = formatCurrency(summary.total_balance);
    }
    
    // Update incoming capital
    const incomingCapital = document.getElementById('incomingCapital');
    if (incomingCapital) {
        incomingCapital.textContent = formatCurrency(summary.incoming_capital);
    }
    
    // Update outgoing capital
    const outgoingCapital = document.getElementById('outgoingCapital');
    if (outgoingCapital) {
        outgoingCapital.textContent = formatCurrency(summary.outgoing_capital);
    }
}

function updateRecentMovements(movements) {
    const movementsList = document.getElementById('recentMovements');
    if (!movementsList) return;
    
    movementsList.innerHTML = movements.map(movement => `
        <div class="data-item">
            <div class="data-icon">
                <i class="fas ${getMovementIcon(movement.type)}"></i>
            </div>
            <div class="data-content">
                <div class="data-title">${movement.description}</div>
                <div class="data-subtitle">${formatDate(movement.date)}</div>
            </div>
            <div class="data-value ${movement.type === 'incoming' ? 'positive' : 'negative'}">
                ${movement.type === 'incoming' ? '+' : '-'}${formatCurrency(movement.amount)}
            </div>
        </div>
    `).join('');
}

function updateConnectedAccounts(accounts) {
    const accountsList = document.getElementById('connectedAccounts');
    if (!accountsList) return;
    
    accountsList.innerHTML = accounts.map(account => `
        <div class="account-item">
            <div class="account-icon">
                <i class="fas ${getAccountIcon(account.type)}"></i>
            </div>
            <div class="account-content">
                <div class="account-title">${account.name}</div>
                <div class="account-subtitle">${account.address}</div>
            </div>
            <div class="account-balance">${formatCurrency(account.balance)}</div>
        </div>
    `).join('');
}

function initializeCapitalChart() {
    const ctx = document.getElementById('capitalChart').getContext('2d');
    window.capitalChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Total Balance',
                    data: [],
                    borderColor: '#2C3E50',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(44, 62, 80, 0.1)'
                },
                {
                    label: 'Incoming',
                    data: [],
                    borderColor: '#27AE60',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(39, 174, 96, 0.1)'
                },
                {
                    label: 'Outgoing',
                    data: [],
                    borderColor: '#E74C3C',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(231, 76, 60, 0.1)'
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

function updateCapitalChart(analytics) {
    if (!window.capitalChart) return;
    
    window.capitalChart.data.labels = analytics.dates;
    window.capitalChart.data.datasets[0].data = analytics.total_balance;
    window.capitalChart.data.datasets[1].data = analytics.incoming;
    window.capitalChart.data.datasets[2].data = analytics.outgoing;
    window.capitalChart.update();
}

function getMovementIcon(type) {
    const icons = {
        'incoming': 'fa-arrow-down',
        'outgoing': 'fa-arrow-up',
        'transfer': 'fa-exchange-alt'
    };
    return icons[type] || 'fa-circle';
}

function getAccountIcon(type) {
    const icons = {
        'wallet': 'fa-wallet',
        'bank': 'fa-university',
        'crypto': 'fa-bitcoin-sign'
    };
    return icons[type] || 'fa-link';
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

async function loadAccountPage() {
    const pageContainer = document.getElementById('account-page');
    
    // Load account page content
    pageContainer.innerHTML = `
        <h1 class="page-title">Account Settings</h1>
        <div class="account-sections">
            <!-- Profile Section -->
            <div class="account-section">
                <h2>Profile Information</h2>
                <form id="profileForm" class="account-form">
                    <div class="form-group">
                        <label for="fullName">Full Name</label>
                        <input type="text" id="fullName" name="fullName" required>
                    </div>
                    <div class="form-group">
                        <label for="email">Email Address</label>
                        <input type="email" id="email" name="email" required>
                    </div>
                    <div class="form-group">
                        <label for="phone">Phone Number</label>
                        <input type="tel" id="phone" name="phone">
                    </div>
                    <div class="form-group">
                        <label for="company">Company Name</label>
                        <input type="text" id="company" name="company">
                    </div>
                    <button type="submit" class="btn-primary">Update Profile</button>
                </form>
            </div>

            <!-- Security Section -->
            <div class="account-section">
                <h2>Security Settings</h2>
                <form id="securityForm" class="account-form">
                    <div class="form-group">
                        <label for="currentPassword">Current Password</label>
                        <input type="password" id="currentPassword" name="currentPassword" required>
                    </div>
                    <div class="form-group">
                        <label for="newPassword">New Password</label>
                        <input type="password" id="newPassword" name="newPassword" required>
                    </div>
                    <div class="form-group">
                        <label for="confirmPassword">Confirm New Password</label>
                        <input type="password" id="confirmPassword" name="confirmPassword" required>
                    </div>
                    <button type="submit" class="btn-primary">Update Password</button>
                </form>
                <div class="security-options">
                    <div class="option-item">
                        <div class="option-info">
                            <h3>Two-Factor Authentication</h3>
                            <p>Add an extra layer of security to your account</p>
                        </div>
                        <label class="switch">
                            <input type="checkbox" id="enable2FA">
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
            </div>

            <!-- Connected Accounts Section -->
            <div class="account-section">
                <h2>Connected Accounts</h2>
                <div class="connected-accounts-list" id="connectedAccountsList">
                    <!-- Connected accounts will be populated here -->
                </div>
                <button id="connectNewAccountBtn" class="btn-secondary">
                    <i class="fas fa-plus"></i> Connect New Account
                </button>
            </div>

            <!-- Notification Preferences -->
            <div class="account-section">
                <h2>Notification Preferences</h2>
                <form id="notificationForm" class="account-form">
                    <div class="option-item">
                        <div class="option-info">
                            <h3>Email Notifications</h3>
                            <p>Receive updates about your account via email</p>
                        </div>
                        <label class="switch">
                            <input type="checkbox" id="emailNotifications">
                            <span class="slider"></span>
                        </label>
                    </div>
                    <div class="option-item">
                        <div class="option-info">
                            <h3>Transaction Alerts</h3>
                            <p>Get notified about new transactions</p>
                        </div>
                        <label class="switch">
                            <input type="checkbox" id="transactionAlerts">
                            <span class="slider"></span>
                        </label>
                    </div>
                    <div class="option-item">
                        <div class="option-info">
                            <h3>Security Alerts</h3>
                            <p>Receive alerts about security-related activities</p>
                        </div>
                        <label class="switch">
                            <input type="checkbox" id="securityAlerts">
                            <span class="slider"></span>
                        </label>
                    </div>
                    <button type="submit" class="btn-primary">Save Preferences</button>
                </form>
            </div>

            <!-- Danger Zone -->
            <div class="account-section danger-zone">
                <h2>Danger Zone</h2>
                <div class="danger-actions">
                    <button id="deleteAccountBtn" class="btn-danger">
                        <i class="fas fa-trash"></i> Delete Account
                    </button>
                </div>
            </div>
        </div>
    `;
    
    pageContainer.style.display = 'block';
    
    // Initialize account page functionality
    initializeAccountPage();
}

function initializeAccountPage() {
    // Set up real-time updates
    setupAccountRealTimeUpdates();
    
    // Set up form event listeners
    setupAccountFormListeners();
    
    // Initial data fetch
    fetchAccountData();
}

function setupAccountRealTimeUpdates() {
    // Set up WebSocket connection for real-time updates
    const ws = new WebSocket('wss://halaxa-backend.onrender.com/ws');
    
    ws.onopen = () => {
        console.log('WebSocket connected');
        // Subscribe to account updates
        ws.send(JSON.stringify({
            type: 'subscribe',
            channel: 'account',
            sellerId: state.sellerId
        }));
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'account_update') {
            updateAccountUI(data.data);
        }
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
        console.log('WebSocket disconnected');
        // Attempt to reconnect after 5 seconds
        setTimeout(setupAccountRealTimeUpdates, 5000);
    };
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
        connectNewAccountBtn.addEventListener('click', showConnectAccountModal);
    }

    // Delete account button
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', showDeleteAccountConfirmation);
    }
}

async function fetchAccountData() {
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
        console.error('Error fetching account data:', error);
        showError('Failed to fetch account data');
    }
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
    const form = document.getElementById('profileForm');
    if (!form) return;

    form.fullName.value = profile.full_name || '';
    form.email.value = profile.email || '';
    form.phone.value = profile.phone || '';
    form.company.value = profile.company || '';
}

function updateSecuritySettings(security) {
    const enable2FA = document.getElementById('enable2FA');
    if (enable2FA) {
        enable2FA.checked = security.two_factor_enabled || false;
    }
}

function updateNotificationPreferences(notifications) {
    const emailNotifications = document.getElementById('emailNotifications');
    const transactionAlerts = document.getElementById('transactionAlerts');
    const securityAlerts = document.getElementById('securityAlerts');

    if (emailNotifications) emailNotifications.checked = notifications.email || false;
    if (transactionAlerts) transactionAlerts.checked = notifications.transactions || false;
    if (securityAlerts) securityAlerts.checked = notifications.security || false;
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
                <div class="account-status ${account.status.toLowerCase()}">${account.status}</div>
            </div>
            <div class="account-actions">
                <button class="btn-icon" onclick="disconnectAccount('${account.id}')">
                    <i class="fas fa-unlink"></i>
                </button>
            </div>
        </div>
    `).join('');
}

async function updateProfile() {
    try {
        const formData = {
            full_name: document.getElementById('fullName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            company: document.getElementById('company').value
        };

        const response = await fetch(`https://halaxa-backend.onrender.com/api/users/${state.sellerId}/profile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${state.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error('Failed to update profile');
        }

        showSuccess('Profile updated successfully');
    } catch (error) {
        console.error('Error updating profile:', error);
        showError('Failed to update profile');
    }
}

async function updatePassword() {
    try {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            showError('signupError', 'New passwords do not match');
            return;
        }

        const response = await fetch(`https://halaxa-backend.onrender.com/api/users/${state.sellerId}/password`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${state.token}`,
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

        showSuccess('Password updated successfully');
        document.getElementById('securityForm').reset();
    } catch (error) {
        console.error('Error updating password:', error);
        showError('Failed to update password');
    }
}

async function updateNotificationPreferences() {
    try {
        const preferences = {
            email: document.getElementById('emailNotifications').checked,
            transactions: document.getElementById('transactionAlerts').checked,
            security: document.getElementById('securityAlerts').checked
        };

        const response = await fetch(`https://halaxa-backend.onrender.com/api/users/${state.sellerId}/notifications`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${state.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(preferences)
        });

        if (!response.ok) {
            throw new Error('Failed to update notification preferences');
        }

        showSuccess('Notification preferences updated successfully');
    } catch (error) {
        console.error('Error updating notification preferences:', error);
        showError('Failed to update notification preferences');
    }
}

async function update2FA(enabled) {
    try {
        const response = await fetch(`https://halaxa-backend.onrender.com/api/users/${state.sellerId}/2fa`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${state.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ enabled })
        });

        if (!response.ok) {
            throw new Error('Failed to update 2FA settings');
        }

        showSuccess(`Two-factor authentication ${enabled ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
        console.error('Error updating 2FA settings:', error);
        showError('Failed to update 2FA settings');
        // Revert the toggle
        document.getElementById('enable2FA').checked = !enabled;
    }
}

async function disconnectAccount(accountId) {
    if (!confirm('Are you sure you want to disconnect this account?')) {
        return;
    }

    try {
        const response = await fetch(`https://halaxa-backend.onrender.com/api/users/${state.sellerId}/accounts/${accountId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${state.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to disconnect account');
        }

        showSuccess('Account disconnected successfully');
        fetchAccountData(); // Refresh the accounts list
    } catch (error) {
        console.error('Error disconnecting account:', error);
        showError('Failed to disconnect account');
    }
}

function showConnectAccountModal() {
    // Implementation for showing connect account modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Connect New Account</h2>
            <form id="connectAccountForm">
                <div class="form-group">
                    <label for="accountType">Account Type</label>
                    <select id="accountType" required>
                        <option value="wallet">Crypto Wallet</option>
                        <option value="bank">Bank Account</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="accountName">Account Name</label>
                    <input type="text" id="accountName" required>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn-primary">Connect</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    // Add form submit handler
    const form = document.getElementById('connectAccountForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await connectNewAccount();
    });
}

async function connectNewAccount() {
    try {
        const accountType = document.getElementById('accountType').value;
        const accountName = document.getElementById('accountName').value;

        const response = await fetch(`https://halaxa-backend.onrender.com/api/users/${state.sellerId}/accounts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${state.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: accountType,
                name: accountName
            })
        });

        if (!response.ok) {
            throw new Error('Failed to connect account');
        }

        showSuccess('Account connected successfully');
        closeModal();
        fetchAccountData(); // Refresh the accounts list
    } catch (error) {
        console.error('Error connecting account:', error);
        showError('Failed to connect account');
    }
}

function closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
}

function showDeleteAccountConfirmation() {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        deleteAccount();
    }
}

async function deleteAccount() {
    try {
        const response = await fetch(`https://halaxa-backend.onrender.com/api/users/${state.sellerId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${state.token}`,
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
        showError('Failed to delete account');
    }
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

function initializePaymentLinkPage() {
    console.log('Payment Link page initialized');
}

function initializeAccountPage() {
    console.log('Account page initialized');
}

// Update the page initialization
document.addEventListener('DOMContentLoaded', function() {
    // Add form event listeners
    document.getElementById('signupForm').addEventListener('submit', handleSignup);
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Always show signup page by default
    showSignupPage();

    // Add click listeners to nav items for navigation
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
});

async function generatePaymentLink() {
    if (!state.token || !state.sellerId) {
        showError('Please log in to generate payment links');
        return;
    }

    const amount = document.getElementById('amount').value;
    const wallet_address = document.getElementById('wallet_address').value;
    const chain = document.getElementById('chain').value;
    const product_title = document.getElementById('product_title').value;

    if (!amount || !wallet_address || !chain || !product_title) {
        showError('Please fill in all required fields');
        return;
    }

    try {
        const response = await fetch(`https://halaxa-backend.onrender.com/api/payment-links/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${state.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: parseFloat(amount),
                wallet_address,
                chain,
                product_title
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create payment link');
        }

        const { data, error } = await response.json();
        if (error) throw error;

        // Generate the buyer form URL with parameters
        const buyerFormUrl = `https://halaxapay.netlify.app/buyer-form-page?amount=${amount}&chain=${chain}&link_id=${data.id}&wallet_address=${wallet_address}`;
        
        showSuccess('Payment link generated successfully!');
        // Clear the form
        document.getElementById('createPaymentLinkForm').reset();
        
        // Copy the link to clipboard
        await navigator.clipboard.writeText(buyerFormUrl);
        alert('Payment link copied to clipboard!');

        // Refresh the payment links list
        await fetchPaymentLinksData();
    } catch (error) {
        console.error('Error generating payment link:', error);
        showError(error.message || 'Failed to generate payment link');
    }
}

async function fetchPaymentLinksData() {
    try {
        const response = await fetch(`https://halaxa-backend.onrender.com/api/payment-links`, {
            headers: {
                'Authorization': `Bearer ${state.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch payment links');
        }

        const { data, error } = await response.json();
        if (error) throw error;

        updatePaymentLinksDisplay({
            links: data.map(link => ({
                link_id: link.id,
                amount: link.amount,
                description: link.description,
                created_at: link.created_at,
                status: link.status
            }))
        });
    } catch (error) {
        console.error('Error fetching payment links:', error);
        loadDemoData();
    }
}

function updatePaymentLinksDisplay(data) {
    const linksList = document.querySelector('.payment-links-list');
    if (!linksList) return;

    linksList.innerHTML = '';
    data.links.forEach(link => {
        const linkItem = document.createElement('div');
        linkItem.classList.add('link-item');
        linkItem.innerHTML = `
            <div class="link-details">
                <span class="link-id">Link ID: ${link.link_id}</span>
                <span class="link-description">${link.description}</span>
                <span class="link-date">Created: ${new Date(link.created_at).toLocaleDateString()}</span>
            </div>
            <div class="link-amount">$${link.amount.toFixed(2)} USDC</div>
            <div class="link-status" style="color: ${link.status === 'active' ? '#28a745' : '#dc3545'}">
                ${link.status.charAt(0).toUpperCase() + link.status.slice(1)}
            </div>
            <div class="link-actions">
                <button onclick="copyPaymentLink('${link.link_id}')" class="action-button">
                    <i class="fas fa-copy"></i> Copy
                </button>
                <button onclick="viewPaymentDetails('${link.link_id}')" class="action-button">
                    <i class="fas fa-eye"></i> View
                </button>
            </div>
        `;
        linksList.appendChild(linkItem);
    });
}

function copyPaymentLink(linkId) {
    const paymentLink = `https://halaxapay.netlify.app/buyers-form?link_id=${linkId}`;
    
    navigator.clipboard.writeText(paymentLink).then(() => {
        alert('Payment link copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy payment link:', err);
        alert('Failed to copy payment link. Please try again.');
    });
}

function viewPaymentDetails(linkId) {
    window.location.href = `https://halaxapay.netlify.app/payment-details?link_id=${linkId}`;
}

function loadDemoData() {
    const demoData = {
        links: [
            {
                link_id: 'link_abc123',
                amount: 100.00,
                description: 'Example Payment',
                created_at: new Date(),
                status: 'active'
            },
            {
                link_id: 'link_def456',
                amount: 250.00,
                description: 'Another Payment',
                created_at: new Date(),
                status: 'completed'
            }
        ]
    };

    updatePaymentLinksDisplay(demoData);
}