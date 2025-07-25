// Add some interactive effects
document.addEventListener('DOMContentLoaded', function() {
    // Add a subtle animation delay to the success elements
    const elements = ['.success-title', '.success-notice', '.dashboard-button'];
    
    elements.forEach((selector, index) => {
        const element = document.querySelector(selector);
        if (element) {
            element.style.opacity = '0';
            element.style.transform = 'translateY(10px)';
            element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            
            setTimeout(() => {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, (index + 1) * 150);
        }
    });

    // Add click tracking for analytics (optional)
    document.querySelector('.dashboard-button').addEventListener('click', function(e) {
        // You can add analytics tracking here if needed
        console.log('User accessed dashboard after email verification');
    });
});

// Optional: Add confetti effect on page load
function createConfetti() {
    const colors = ['#2ECC71', '#3498DB', '#f39c12', '#e74c3c'];
    const confettiCount = 50;
    
    for (let i = 0; i < confettiCount; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.style.position = 'fixed';
            confetti.style.width = '8px';
            confetti.style.height = '8px';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = Math.random() * window.innerWidth + 'px';
            confetti.style.top = '-10px';
            confetti.style.zIndex = '1000';
            confetti.style.pointerEvents = 'none';
            confetti.style.borderRadius = '50%';
            
            document.body.appendChild(confetti);
            
            const animation = confetti.animate([
                { transform: 'translateY(-10px) rotate(0deg)', opacity: 1 },
                { transform: `translateY(${window.innerHeight + 20}px) rotate(720deg)`, opacity: 0 }
            ], {
                duration: 3000 + Math.random() * 2000,
                easing: 'linear'
            });
            
            animation.onfinish = () => confetti.remove();
        }, i * 50);
    }
}

// Trigger confetti effect on page load
window.addEventListener('load', () => {
    setTimeout(createConfetti, 500);
});
