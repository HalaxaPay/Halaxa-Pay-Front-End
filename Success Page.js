// Store full values
let fullWalletAddress = '';
let fullTransactionId = '';
let walletExpanded = false;
let transactionExpanded = false;

// Backend URL
const BACKEND_URL = 'https://halaxa-backend.onrender.com';

// Function to expand wallet address
function expandWalletAddress() {
    const walletElement = document.getElementById('walletAddress');
    const expandBtn = document.getElementById('walletExpandBtn');
    
    if (walletExpanded) {
        // Collapse - show short version
        walletElement.classList.remove('expanded');
        expandBtn.classList.remove('expanded');
        walletElement.textContent = shortenAddress(fullWalletAddress);
        expandBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
        expandBtn.setAttribute('aria-label', 'Expand wallet address');
        walletExpanded = false;
    } else {
        // Expand - show full version
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
        // Collapse - show short version
        transactionElement.classList.remove('expanded');
        expandBtn.classList.remove('expanded');
        transactionElement.textContent = shortenAddress(fullTransactionId);
        expandBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
        expandBtn.setAttribute('aria-label', 'Expand transaction ID');
        transactionExpanded = false;
    } else {
        // Expand - show full version
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

function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const amount = params.get('amount') || '0.00';
    const chain = params.get('chain') || 'Polygon';
    const link_id = params.get('link_id') || 'demo';
    const wallet_address = params.get('wallet_address') || '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
    const tx = params.get('tx') || '';
    
    console.log('URL Parameters:', { amount, chain, link_id, wallet_address, tx });
    return { amount, chain, link_id, wallet_address, tx };
}

// Function to fetch payment link details from backend
async function fetchPaymentLinkDetails(link_id) {
    try {
        console.log('🔍 Fetching payment link details for:', link_id);
        
        const response = await fetch(`${BACKEND_URL}/api/payment-links/${link_id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.error('❌ Failed to fetch payment link details:', response.status);
            return null;
        }
        
        const result = await response.json();
        console.log('✅ Payment link details fetched:', result);
        
        if (result.success && result.data) {
            return result.data;
        } else {
            console.error('❌ Payment link fetch failed:', result.error);
            return null;
        }
    } catch (error) {
        console.error('❌ Error fetching payment link details:', error);
        return null;
    }
}

async function initializeSuccessPage() {
    const params = getUrlParams();
    
    // Try to fetch real payment link details from backend
    let paymentDetails = null;
    if (params.link_id && params.link_id !== 'demo') {
        paymentDetails = await fetchPaymentLinkDetails(params.link_id);
    }
    
    // Use backend data if available, otherwise fall back to URL params
    const amount = paymentDetails?.amount_usdc || params.amount;
    const wallet_address = paymentDetails?.wallet_address || params.wallet_address;
    const network = paymentDetails?.network || params.chain;
    
    // Store full values
    fullWalletAddress = wallet_address;
    fullTransactionId = params.tx || localStorage.getItem('transactionHash') || '0x1234567890abcdef1234567890abcdef123456789012345678901234567890abcdef';

    // Update the DOM with payment details
    const amountElement = document.getElementById('amountPaid');
    const walletElement = document.getElementById('walletAddress');
    const transactionElement = document.getElementById('transactionId');
    
    if (amountElement) {
        amountElement.textContent = `${amount} USDC`;
    }
    
    if (walletElement) {
        walletElement.textContent = shortenAddress(fullWalletAddress);
    }
    
    if (transactionElement) {
        transactionElement.textContent = shortenAddress(fullTransactionId);
    }
    
    console.log('✅ Success page initialized with:', {
        amount,
        wallet_address: fullWalletAddress,
        network,
        link_id: params.link_id,
        transaction_hash: fullTransactionId,
        source: paymentDetails ? 'backend' : 'url_params'
    });
}

// Run the function when the page loads
document.addEventListener('DOMContentLoaded', initializeSuccessPage);
