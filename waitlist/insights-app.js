// Smooth animations for image boxes
document.addEventListener('DOMContentLoaded', function() {
    const imageBoxes = document.querySelectorAll('.image-box');
    
    // Animate image boxes on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 150);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    imageBoxes.forEach(box => {
        box.style.opacity = '0';
        box.style.transform = 'translateY(20px)';
        box.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(box);
    });

    // Lightbox functionality
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxClose = document.getElementById('lightboxClose');
    const lightboxPrev = document.getElementById('lightboxPrev');
    const lightboxNext = document.getElementById('lightboxNext');
    const lightboxBackdrop = document.querySelector('.lightbox-backdrop');
    
    let currentIndex = 0;
    const images = Array.from(imageBoxes).map(box => box.getAttribute('data-image'));
    
    // Open lightbox when clicking on an image
    imageBoxes.forEach((box, index) => {
        box.addEventListener('click', () => {
            currentIndex = index;
            openLightbox();
        });
    });
    
    function openLightbox() {
        lightboxImage.src = images[currentIndex];
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
        updateNavButtons();
    }
    
    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    function updateNavButtons() {
        lightboxPrev.disabled = currentIndex === 0;
        lightboxNext.disabled = currentIndex === 1;
    }
    
    function showPrevImage() {
        if (currentIndex > 0) {
            currentIndex--;
            lightboxImage.src = images[currentIndex];
            updateNavButtons();
        }
    }
    
    function showNextImage() {
        if (currentIndex < images.length - 1) {
            currentIndex++;
            lightboxImage.src = images[currentIndex];
            updateNavButtons();
        }
    }
    
    // Event listeners
    lightboxClose.addEventListener('click', closeLightbox);
    lightboxBackdrop.addEventListener('click', closeLightbox);
    lightboxPrev.addEventListener('click', showPrevImage);
    lightboxNext.addEventListener('click', showNextImage);
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;
        
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') showPrevImage();
        if (e.key === 'ArrowRight') showNextImage();
    });
});
