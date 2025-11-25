// Floating 5s and 1s Animation
// Creates subtle floating numbers in the background like underwater particles

(function() {
    const container = document.getElementById('floatingNumbers');
    if (!container) return;

    const numbers = ['5', '1', '5', '1', '5', '1', '51', '15'];
    const numElements = 40; // Number of floating elements
    const floatingElements = [];

    // Create floating number elements
    function createFloatingNumbers() {
        for (let i = 0; i < numElements; i++) {
            const element = document.createElement('div');
            element.className = 'floating-number';
            element.textContent = numbers[Math.floor(Math.random() * numbers.length)];
            
            // Random positioning
            element.style.left = `${Math.random() * 100}%`;
            element.style.top = `${Math.random() * 100}%`;
            
            // Random size (between 20px and 80px)
            const size = 20 + Math.random() * 60;
            element.style.fontSize = `${size}px`;
            
            // Random animation duration and delay for organic movement
            const floatDuration = 15 + Math.random() * 25; // 15-40 seconds
            const pulseDuration = 5 + Math.random() * 10; // 5-15 seconds
            const floatDelay = Math.random() * -20; // Random start point in animation
            
            element.style.setProperty('--float-duration', `${floatDuration}s`);
            element.style.setProperty('--pulse-duration', `${pulseDuration}s`);
            element.style.setProperty('--float-delay', `${floatDelay}s`);
            
            // Store original position for mouse interaction
            floatingElements.push({
                element: element,
                originalX: parseFloat(element.style.left),
                originalY: parseFloat(element.style.top)
            });
            
            container.appendChild(element);
        }
    }

    // Mouse interaction - numbers react when mouse is nearby
    let mouseX = 0;
    let mouseY = 0;
    let isMouseMoving = false;
    let mouseTimeout;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        isMouseMoving = true;
        
        clearTimeout(mouseTimeout);
        mouseTimeout = setTimeout(() => {
            isMouseMoving = false;
        }, 100);

        updateNearbyElements();
    });

    function updateNearbyElements() {
        floatingElements.forEach(item => {
            const rect = item.element.getBoundingClientRect();
            const elementX = rect.left + rect.width / 2;
            const elementY = rect.top + rect.height / 2;
            
            const distance = Math.hypot(mouseX - elementX, mouseY - elementY);
            const threshold = 150; // Distance in pixels to trigger reaction
            
            if (distance < threshold) {
                item.element.classList.add('near-mouse');
                
                // Subtle push away from mouse
                const angle = Math.atan2(elementY - mouseY, elementX - mouseX);
                const pushDistance = (threshold - distance) / 10;
                const pushX = Math.cos(angle) * pushDistance;
                const pushY = Math.sin(angle) * pushDistance;
                
                item.element.style.transform = `translate(${pushX}px, ${pushY}px)`;
            } else {
                item.element.classList.remove('near-mouse');
                item.element.style.transform = '';
            }
        });
    }

    // Add some variety with different number styles
    function styleNumbers() {
        floatingElements.forEach((item, index) => {
            const styles = [
                { fontWeight: '300' },
                { fontWeight: '700' },
                { fontWeight: '800', fontStyle: 'italic' },
                { fontWeight: '400', letterSpacing: '0.1em' }
            ];
            
            const style = styles[index % styles.length];
            Object.assign(item.element.style, style);
        });
    }

    // Initialize
    createFloatingNumbers();
    styleNumbers();

    // Parallax effect on scroll
    let ticking = false;
    
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const scrollY = window.scrollY;
                
                floatingElements.forEach((item, index) => {
                    const speed = 0.02 + (index % 5) * 0.01; // Different speeds for parallax
                    const yOffset = scrollY * speed;
                    item.element.style.marginTop = `${yOffset}px`;
                });
                
                ticking = false;
            });
            
            ticking = true;
        }
    });
})();
