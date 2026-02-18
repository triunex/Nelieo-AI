// API Configuration - Works on local and production
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? (window.location.port === '3001' ? '' : 'http://localhost:3001')
    : ''; // Production: use same domain

// DOM Elements
const waitlistTrigger = document.querySelector('.waitlist-trigger');
const waitlistForm = document.getElementById('waitlistForm');
const signupForm = document.getElementById('signupForm');
const successMessage = document.getElementById('successMessage');
const waitlistCountElement = document.getElementById('waitlistCount');
const ctaCountElement = document.getElementById('ctaCount');

// Toggle waitlist form (only if element exists)
if (waitlistTrigger && waitlistForm) {
    waitlistTrigger.addEventListener('click', () => {
        waitlistForm.classList.toggle('active');
        if (waitlistForm.classList.contains('active')) {
            waitlistForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
}

// Handle form submission (only if form exists)
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = signupForm.querySelector('.submit-btn');
    submitBtn.classList.add('loading');
    
    const formData = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        company: document.getElementById('company').value.trim(),
        useCase: document.getElementById('useCase').value
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/waitlist/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Hide form, show success
            signupForm.style.display = 'none';
            successMessage.classList.add('active');
            
            // Update waitlist count
            if (data.totalCount) {
                updateWaitlistCount(data.totalCount);
            }
            
            // Reset after 5 seconds
            setTimeout(() => {
                signupForm.reset();
                signupForm.style.display = 'block';
                successMessage.classList.remove('active');
                waitlistForm.classList.remove('active');
            }, 5000);
        } else {
            alert(data.message || 'Something went wrong. Please try again.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to join waitlist. Please check your connection and try again.');
        } finally {
            submitBtn.classList.remove('loading');
        }
    });
}

// Update waitlist count with animation (after form submission)
function updateWaitlistCount(count) {
    if (!waitlistCountElement) return;
    
    const currentCount = parseInt(waitlistCountElement.textContent.replace(/,/g, ''));
    // Add to base 150 + new count
    const targetCount = 150 + count;
    
    if (targetCount > currentCount) {
        animateCountUp(waitlistCountElement, currentCount, targetCount);
        
        // Update CTA button
        if (ctaCountElement) {
            ctaCountElement.textContent = targetCount.toLocaleString() + '+';
        }
    }
}

// Fetch current waitlist count on page load
async function fetchWaitlistCount() {
    try {
        console.log('🔄 Fetching waitlist count from:', `${API_BASE_URL}/api/waitlist/count`);
        const response = await fetch(`${API_BASE_URL}/api/waitlist/count`);
        const data = await response.json();
        console.log('📊 API Response:', data);
        
        if (data.success && typeof data.count === 'number') {
            // Start from 150 minimum, add real count
            const displayCount = 150 + data.count;
            console.log(`✅ Updating count: 150 + ${data.count} = ${displayCount}`);
            
            if (waitlistCountElement) {
                const currentCount = parseInt(waitlistCountElement.textContent.replace(/,/g, ''));
                animateCountUp(waitlistCountElement, currentCount, displayCount);
            }
            
            // Update CTA button text
            if (ctaCountElement) {
                ctaCountElement.textContent = displayCount.toLocaleString() + '+';
            }
        }
    } catch (error) {
        console.error('❌ Error fetching waitlist count:', error);
        // Show 150 if API fails
        if (waitlistCountElement) waitlistCountElement.textContent = '150';
        if (ctaCountElement) ctaCountElement.textContent = '150+';
    }
}

// Animate count up
function animateCountUp(element, start, end) {
    const duration = 2000;
    const steps = 60;
    const increment = (end - start) / steps;
    let current = start;
    let step = 0;
    
    const timer = setInterval(() => {
        step++;
        current += increment;
        
        if (step >= steps) {
            clearInterval(timer);
            current = end;
        }
        
        element.textContent = Math.floor(current).toLocaleString();
    }, duration / steps);
}

// Poll for updates every 5 seconds for more real-time feel
setInterval(fetchWaitlistCount, 5000);

// Parallax effect for background
let ticking = false;
window.addEventListener('scroll', () => {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            const scrolled = window.pageYOffset;
            const background = document.querySelector('.background-image');
            if (background) {
                background.style.transform = `translateY(${scrolled * 0.5}px)`;
            }
            ticking = false;
        });
        ticking = true;
    }
});

// Smooth reveal animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe elements for animation
document.querySelectorAll('.demo-window, .stats, .glass-mini').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// Initialize
fetchWaitlistCount();

// Update count when page becomes visible again (user switches back to tab)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        console.log('👀 Page visible again, refreshing count...');
        fetchWaitlistCount();
    }
});

// Email validation with better UX (only if email input exists)
const emailInput = document.getElementById('email');
if (emailInput) {
    emailInput.addEventListener('blur', function() {
        const email = this.value.trim();
        if (email && !isValidEmail(email)) {
            this.style.borderColor = '#ef4444';
        } else {
            this.style.borderColor = '';
        }
    });
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
