console.log('Script executed early!');
console.log('Early URL check - href:', window.location.href);
console.log('Early URL check - search:', window.location.search);

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

// Function to initialize the form and payment summary
async function initializeForm() {
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
    const totalHeading = document.getElementById('total-heading');
    const paymentChain = document.getElementById('payment-chain');
    if (totalHeading) {
        const formattedAmount = parseFloat(paymentData.amount_usdc).toFixed(2);
        totalHeading.textContent = `$${formattedAmount} USDC`;
    }
    if (paymentChain) {
        paymentChain.textContent = paymentData.network.charAt(0).toUpperCase() + paymentData.network.slice(1);
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

// Function to handle form submission
function handleFormSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const buyerDetails = {
        name: formData.get('full-name'),
        email: formData.get('email'),
        address: {
            line1: formData.get('address-line-1'),
            line2: formData.get('address-line-2'),
            city: formData.get('city'),
            country: formData.get('country')
        }
    };
    // Store buyer details
    localStorage.setItem('buyerDetails', JSON.stringify(buyerDetails));
    // Get current payment details (from backend only)
    const currentPayment = JSON.parse(localStorage.getItem('currentPayment') || '{}');
    // Redirect to payment page with only link_id in the URL
    const baseUrl = window.location.origin;
    const paymentUrl = `${baseUrl}/Payment Page.html?link_id=${currentPayment.link_id}`;
    window.location.href = paymentUrl;
    // Optional: Also save to backend in background (non-blocking)
    const BACKEND_URL = 'https://halaxa-backend.onrender.com';
    fetch(`${BACKEND_URL}/api/payment-links/${currentPayment.link_id}/buyer`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(buyerDetails)
    }).catch(error => {
        console.warn('Background save to backend failed:', error);
    });
}

// Initialize the form when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeForm();
    // Add form submit handler
    const form = document.getElementById('buyer-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
});
