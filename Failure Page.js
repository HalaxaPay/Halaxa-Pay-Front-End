// Store full values
let fullWalletAddress = '';
let fullTransactionId = '';
let walletExpanded = false;
let transactionExpanded = false;

// Function to expand wallet address
function expandWalletAddress() {
    const walletElement = document.getElementById('walletAddress');
    const expandBtn = document.getElementById('walletExpandBtn');
    
    if (walletExpanded) {
        walletElement.classList.remove('expanded');
        expandBtn.classList.remove('expanded');
        walletElement.textContent = shortenAddress(fullWalletAddress);
        expandBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
        expandBtn.setAttribute('aria-label', 'Expand wallet address');
        walletExpanded = false;
    } else {
        walletElement.classList.add('expanded');
        expandBtn.classList.add('expanded');
        walletElement.textContent = fullWalletAddress;
        expandBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
        expandBtn.setAttribute('aria-label', 'Collapse wallet address');
        walletExpanded = true;
    }
}

// Function to expand transaction ID
function expandTransactionId() {
    const transactionElement = document.getElementById('transactionId');
    const expandBtn = document.getElementById('transactionExpandBtn');
    
    if (transactionExpanded) {
        transactionElement.classList.remove('expanded');
        expandBtn.classList.remove('expanded');
        transactionElement.textContent = shortenAddress(fullTransactionId);
        expandBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
        expandBtn.setAttribute('aria-label', 'Expand transaction ID');
        transactionExpanded = false;
    } else {
        transactionElement.classList.add('expanded');
        expandBtn.classList.add('expanded');
        transactionElement.textContent = fullTransactionId;
        expandBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
        expandBtn.setAttribute('aria-label', 'Collapse transaction ID');
        transactionExpanded = true;
    }
}

// Function to shorten addresses
function shortenAddress(address) {
    if (!address || address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

// Action button functions
function retryPayment() {
    window.history.back();
}

function contactSupport() {
    window.open('mailto:Halaxa.inc@gmail.com?subject=Payment Failed - Need Help', '_blank');
}

function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const amount = params.get('amount') || '0.00';
    const chain = params.get('chain') || 'Polygon';
    const link_id = params.get('link_id') || 'demo';
    const wallet_address = params.get('wallet_address') || '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
    const error_code = params.get('error_code') || '';
    const error_message = params.get('error_message') || '';
    
    console.log('URL Parameters:', { amount, chain, link_id, wallet_address, error_code, error_message });
    return { amount, chain, link_id, wallet_address, error_code, error_message };
}

function initializeFailurePage() {
    const params = getUrlParams();
    
    // Store full values from URL params
    fullWalletAddress = params.wallet_address;
    fullTransactionId = '0x0000000000000000000000000000000000000000000000000000000000000000'; // No transaction for failed payment

    // Update the DOM with payment details
    document.getElementById('amountAttempted').textContent = `${params.amount} USDC`;
    document.getElementById('walletAddress').textContent = shortenAddress(fullWalletAddress);
    document.getElementById('transactionId').textContent = shortenAddress(fullTransactionId);
    
    console.log('Failure page initialized with:', params);
}

document.addEventListener('DOMContentLoaded', initializeFailurePage);
