// ==================== PREMIUM ANIMATED SPA JAVASCRIPT ==================== //

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the SPA
    initializeSPA();
    
    // Add interactive animations
    initializeAnimations();
    
    // Add floating particles animation
    initializeParticles();
    
    // Add interactive card effects
    initializeCardEffects();
});

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
