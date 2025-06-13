// SPA Navigation and Content Management - Updated for Halaxa Dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the application only if not already initialized by embedded script
    if (typeof initializeApp === 'undefined') {
        initializeSPA();
    }
});

function initializeSPA() {
    // Set up additional SPA navigation event listeners
    setupSPANavigation();
    
    // Set up hash-based routing
    setupHashRouting();
    
    // Load initial page based on URL hash or default to home
    const initialPage = window.location.hash.slice(1) || 'home';
    navigateToPage(initialPage);
}

function setupSPANavigation() {
    // Handle navigation clicks for SPA functionality
    document.querySelectorAll('[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            const page = e.currentTarget.getAttribute('data-page');
            navigateToPage(page);
        });
    });
}

function setupHashRouting() {
    // Handle browser back/forward buttons
    window.addEventListener('popstate', (e) => {
        const page = window.location.hash.slice(1) || 'home';
        navigateToPage(page);
    });
}

function navigateToPage(page) {
    // Update URL hash
    if (window.location.hash.slice(1) !== page) {
        window.location.hash = page;
    }
    
    // Update active state in navigation
    updateSPAActiveNavigation(page);
    
    // Show the appropriate page content
    showPageContent(page);
}

function updateSPAActiveNavigation(page) {
    // Remove active class from all navigation items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to current page
    const activeItem = document.querySelector(`[data-page="${page}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }
}

function showPageContent(page) {
    // Hide all page content
    document.querySelectorAll('.page-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Show the selected page content
    const targetPage = document.getElementById(page);
    if (targetPage) {
        targetPage.classList.add('active');
        
        // Add fade-in animation
        targetPage.style.opacity = '0';
        setTimeout(() => {
            targetPage.style.transition = 'opacity 0.3s ease-in-out';
            targetPage.style.opacity = '1';
        }, 10);
    }
}

// Enhanced navigation functions for better UX
function smoothScrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Page transition effects
function addPageTransition(page) {
    const pageElement = document.getElementById(page);
    if (pageElement) {
        pageElement.style.transform = 'translateX(20px)';
        pageElement.style.opacity = '0';
        
        setTimeout(() => {
            pageElement.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            pageElement.style.transform = 'translateX(0)';
            pageElement.style.opacity = '1';
        }, 50);
    }
}

// Utility functions for enhanced SPA experience
function preloadPage(page) {
    // Preload page content if needed
    const pageElement = document.getElementById(page);
    if (pageElement && !pageElement.dataset.loaded) {
        // Mark as loaded to avoid duplicate loading
        pageElement.dataset.loaded = 'true';
    }
}

// Mobile navigation toggle
function toggleMobileNavigation() {
    const navContainer = document.querySelector('.nav-container');
    if (navContainer) {
        navContainer.classList.toggle('mobile-visible');
    }
}

// Add mobile navigation button if needed
function addMobileNavButton() {
    if (window.innerWidth <= 768) {
        const mainContent = document.querySelector('.main-content');
        if (mainContent && !document.querySelector('.mobile-nav-toggle')) {
            const navToggle = document.createElement('button');
            navToggle.className = 'mobile-nav-toggle';
            navToggle.innerHTML = '<i class="fas fa-bars"></i>';
            navToggle.addEventListener('click', toggleMobileNavigation);
            mainContent.insertBefore(navToggle, mainContent.firstChild);
        }
    }
}

// Initialize mobile features
function initializeMobileFeatures() {
    addMobileNavButton();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        addMobileNavButton();
    });
}

// Enhanced error handling
function handleSPAError(error, context = 'SPA Navigation') {
    console.error(`${context} Error:`, error);
    
    // Show user-friendly error message
    const errorContainer = document.createElement('div');
    errorContainer.className = 'spa-error-message';
    errorContainer.innerHTML = `
        <div class="error-content">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Something went wrong</h3>
            <p>Please refresh the page or try again.</p>
            <button onclick="location.reload()" class="retry-button">Refresh Page</button>
        </div>
    `;
    
    document.body.appendChild(errorContainer);
    
    // Auto-remove error message after 5 seconds
    setTimeout(() => {
        if (errorContainer.parentNode) {
            errorContainer.parentNode.removeChild(errorContainer);
        }
    }, 5000);
}

// Performance optimization
function optimizeSPAPerformance() {
    // Lazy load non-critical resources
    const lazyElements = document.querySelectorAll('[data-lazy]');
    
    if ('IntersectionObserver' in window) {
        const lazyObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    // Load the lazy content
                    if (element.dataset.lazy) {
                        element.innerHTML = element.dataset.lazy;
                        element.removeAttribute('data-lazy');
                        lazyObserver.unobserve(element);
                    }
                }
            });
        });
        
        lazyElements.forEach(element => {
            lazyObserver.observe(element);
        });
    }
}

// Initialize all SPA features
try {
    // Initialize mobile features
    initializeMobileFeatures();
    
    // Optimize performance
    optimizeSPAPerformance();
    
} catch (error) {
    handleSPAError(error, 'SPA Initialization');
}