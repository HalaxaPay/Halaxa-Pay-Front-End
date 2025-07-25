// Function to get link_id from URL
function getLinkIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('link_id') || '';
}

// Function to fetch payment link details from backend
async function fetchPaymentLinkDetails(linkId) {
    const BACKEND_URL = 'https://halaxa-backend.onrender.com';
    try {
        const response = await fetch(`${BACKEND_URL}/api/payment-links/${linkId}`);
        const result = await response.json();
        if (result.success && result.data) {
            return result.data;
        } else {
            throw new Error(result.error || 'Payment link not found');
        }
    } catch (error) {
        console.error('Error fetching payment link details:', error);
        return null;
    }
}

// Function to copy wallet address
function copyWalletAddress() {
    const walletAddress = document.getElementById('wallet-address').textContent;
    navigator.clipboard.writeText(walletAddress).then(() => {
        alert('Wallet address copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy wallet address:', err);
        alert('Failed to copy wallet address. Please try again.');
    });
}

// Function to initialize payment details
async function initializePaymentDetails() {
    const linkId = getLinkIdFromUrl();
    if (!linkId) {
        alert('Invalid or missing payment link.');
        return;
    }
    const paymentData = await fetchPaymentLinkDetails(linkId);
    if (!paymentData) {
        alert('Payment link not found or expired.');
        return;
    }
    // Display payment details
    const amountDisplay = document.getElementById('amount-display');
    const chainDisplay = document.getElementById('chain-display');
    const walletAddress = document.getElementById('wallet-address');
    if (amountDisplay) {
        amountDisplay.textContent = `$${parseFloat(paymentData.amount_usdc).toFixed(2)} USDC`;
    }
    if (chainDisplay) {
        chainDisplay.innerHTML = `<i class="fas fa-link"></i><span>${paymentData.network.charAt(0).toUpperCase() + paymentData.network.slice(1)}</span>`;
    }
    if (walletAddress) {
        walletAddress.textContent = paymentData.wallet_address;
    }
    // Store the current payment details (from backend only)
    const paymentDetails = {
        amount: paymentData.amount_usdc,
        chain: paymentData.network,
        link_id: paymentData.link_id,
        wallet_address: paymentData.wallet_address
    };
    localStorage.setItem('currentPayment', JSON.stringify(paymentDetails));
}

// Function to handle payment confirmation
async function handlePaymentConfirmation() {
    const currentPayment = JSON.parse(localStorage.getItem('currentPayment') || '{}');
    const confirmButton = document.getElementById('confirm-payment');
    const originalText = confirmButton.innerHTML;
    // Show loading state
    confirmButton.disabled = true;
    confirmButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Scanning Blockchain...</span>';
    try {
        // Call backend to verify payment
        const BACKEND_URL = 'https://halaxa-backend.onrender.com';
        const response = await fetch(`${BACKEND_URL}/api/payment-links/${currentPayment.link_id}/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                wallet_address: currentPayment.wallet_address,
                amount_usdc: parseFloat(currentPayment.amount),
                network: currentPayment.chain.toLowerCase()
            })
        });
        const result = await response.json();
        const baseUrl = window.location.origin;
        if (result.success && result.payment_found) {
            // Payment found - redirect to success page
            localStorage.setItem('paymentStatus', 'success');
            localStorage.setItem('transactionHash', result.transaction_hash || '');
            const successUrl = `${baseUrl}/Success Page.html?link_id=${currentPayment.link_id}&tx=${result.transaction_hash || ''}`;
            window.location.href = successUrl;
        } else {
            // Payment not found - redirect to failure page
            localStorage.setItem('paymentStatus', 'failed');
            const failureUrl = `${baseUrl}/Failure Page.html?link_id=${currentPayment.link_id}`;
            window.location.href = failureUrl;
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        alert('Failed to verify payment. Please check your connection and try again.');
        confirmButton.disabled = false;
        confirmButton.innerHTML = originalText;
    }
}

// Function to expand transaction ID
function expandTransactionId() {
    const transactionId = document.getElementById('transaction-id');
    const expandButton = document.querySelector('.expand-button');
    const fullTransactionId = '0x1234567890abcdef1234567890abcdef123456789012345678901234567890abcdef';
    const shortTransactionId = '0x1234567890abcdef...567890abcdef';
    if (transactionId.classList.contains('expanded')) {
        transactionId.classList.remove('expanded');
        expandButton.classList.remove('expanded');
        transactionId.textContent = shortTransactionId;
        expandButton.innerHTML = '<i class="fas fa-chevron-down"></i>';
        expandButton.setAttribute('aria-label', 'Expand transaction ID');
    } else {
        transactionId.classList.add('expanded');
        expandButton.classList.add('expanded');
        transactionId.textContent = fullTransactionId;
        expandButton.innerHTML = '<i class="fas fa-chevron-up"></i>';
        expandButton.setAttribute('aria-label', 'Collapse transaction ID');
    }
}

// Function to initialize transaction ID
function initializeTransactionId() {
    const transactionId = document.getElementById('transaction-id');
    const shortTransactionId = '0x1234567890abcdef...567890abcdef';
    if (transactionId) {
        transactionId.textContent = shortTransactionId;
    }
}

// Initialize the page when it loads
document.addEventListener('DOMContentLoaded', () => {
    initializePaymentDetails();
    initializeTransactionId();
    // Add payment confirmation handler
    const confirmButton = document.getElementById('confirm-payment');
    if (confirmButton) {
        confirmButton.addEventListener('click', handlePaymentConfirmation);
    }
});
