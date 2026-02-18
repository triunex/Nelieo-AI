// API Configuration - Works on local and production
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? (window.location.port === '3001' ? '' : 'http://localhost:3001')
    : ''; // Production: use same domain

// DOM Elements
const form = document.getElementById('waitlistForm');
const submitBtn = document.getElementById('submitBtn');
const successMessage = document.getElementById('successMessage');
const headingContainer = document.querySelector('.heading-container');
const confirmedEmail = document.getElementById('confirmedEmail');
const positionNumber = document.getElementById('positionNumber');

// Input elements
const emailInput = document.getElementById('email');
const nameInput = document.getElementById('name');
const companyInput = document.getElementById('company');
const useCaseInput = document.getElementById('useCase');

// Error elements
const emailError = document.getElementById('emailError');
const nameError = document.getElementById('nameError');
const useCaseError = document.getElementById('useCaseError');

// Validation functions
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validateField(input, errorElement, validationFn, errorMessage) {
    const value = input.value.trim();
    
    if (!value) {
        input.classList.add('error');
        errorElement.textContent = 'This field is required';
        errorElement.classList.add('show');
        return false;
    }
    
    if (validationFn && !validationFn(value)) {
        input.classList.add('error');
        errorElement.textContent = errorMessage;
        errorElement.classList.add('show');
        return false;
    }
    
    input.classList.remove('error');
    errorElement.classList.remove('show');
    return true;
}

// Real-time validation
emailInput.addEventListener('blur', function() {
    if (this.value.trim()) {
        validateField(this, emailError, isValidEmail, 'Please enter a valid email address');
    }
});

emailInput.addEventListener('input', function() {
    if (this.classList.contains('error')) {
        this.classList.remove('error');
        emailError.classList.remove('show');
    }
});

nameInput.addEventListener('input', function() {
    if (this.classList.contains('error')) {
        this.classList.remove('error');
        nameError.classList.remove('show');
    }
});

useCaseInput.addEventListener('change', function() {
    if (this.classList.contains('error')) {
        this.classList.remove('error');
        useCaseError.classList.remove('show');
    }
});

// Form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Validate all fields
    const isEmailValid = validateField(emailInput, emailError, isValidEmail, 'Please enter a valid email address');
    const isNameValid = validateField(nameInput, nameError);
    const isUseCaseValid = validateField(useCaseInput, useCaseError);
    
    if (!isEmailValid || !isNameValid || !isUseCaseValid) {
        // Scroll to first error
        const firstError = form.querySelector('.error');
        if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstError.focus();
        }
        return;
    }
    
    // Show loading state
    submitBtn.classList.add('loading');
    
    // Prepare form data
    const formData = {
        email: emailInput.value.trim(),
        name: nameInput.value.trim(),
        company: companyInput.value.trim() || null,
        useCase: useCaseInput.value
    };
    
    try {
        // Submit to API
        const response = await fetch(`${API_BASE_URL}/api/waitlist/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Success! Show success message
            confirmedEmail.textContent = formData.email;
            positionNumber.textContent = data.position || '-';
            
            // Hide form, show success
            form.classList.add('hide');
            headingContainer.classList.add('hide');
            successMessage.classList.add('show');
            
            // Scroll to success message
            successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Track event (if analytics available)
            if (window.gtag) {
                gtag('event', 'waitlist_signup', {
                    'event_category': 'engagement',
                    'event_label': formData.useCase
                });
            }
            
        } else {
            // Handle errors
            let errorMessage = data.message || 'Something went wrong. Please try again.';
            
            if (response.status === 409) {
                // Email already registered
                emailInput.classList.add('error');
                emailError.textContent = errorMessage;
                emailError.classList.add('show');
                emailInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                emailInput.focus();
            } else {
                // General error
                alert(errorMessage);
            }
        }
        
    } catch (error) {
        console.error('Submission error:', error);
        alert('Failed to join waitlist. Please check your internet connection and try again.');
    } finally {
        submitBtn.classList.remove('loading');
    }
});

// Smooth entrance animation
document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.form-container').style.opacity = '0';
    document.querySelector('.form-container').style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        document.querySelector('.form-container').style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        document.querySelector('.form-container').style.opacity = '1';
        document.querySelector('.form-container').style.transform = 'translateY(0)';
    }, 100);
});

// Prevent form resubmission on back button
if (window.history.replaceState) {
    window.history.replaceState(null, null, window.location.href);
}

// Auto-focus first input
window.addEventListener('load', () => {
    emailInput.focus();
});

// Handle Enter key in inputs (except textarea)
const inputs = form.querySelectorAll('input, select');
inputs.forEach((input, index) => {
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && input.tagName !== 'TEXTAREA') {
            e.preventDefault();
            if (index < inputs.length - 1) {
                inputs[index + 1].focus();
            } else {
                form.requestSubmit();
            }
        }
    });
});
