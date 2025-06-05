document.addEventListener('DOMContentLoaded', function() {
    // Мобильное меню (оставляем как было)
    const burger = document.querySelector('.burger');
    const nav = document.querySelector('.nav');
    
    if (burger && nav) {
        burger.addEventListener('click', function() {
            this.classList.toggle('active');
            nav.classList.toggle('active');
        });
    }
    
    
    
    
    // Плавная прокрутка (оставляем как было)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
                
                if (nav && nav.classList.contains('active')) {
                    burger.classList.remove('active');
                    nav.classList.remove('active');
                }
            }
        });
    });
    
});
// Добавьте этот код в main.js после существующего кода
document.addEventListener('DOMContentLoaded', function() {
    // Обновление активного пункта меню
    function updateActiveNavItem() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const navLinks = document.querySelectorAll('.nav__link');
        
        navLinks.forEach(link => {
            const linkPage = link.getAttribute('href');
            if ((currentPage === linkPage) || 
                (currentPage === '' && linkPage === 'index.html')) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    // Вызываем при загрузке и при переходе по страницам
    updateActiveNavItem();
    
    // Для SPA-поведения (если у вас переходы без перезагрузки)
    document.querySelectorAll('.nav__link').forEach(link => {
        link.addEventListener('click', function(e) {
            // Даем время на фактический переход перед обновлением
            setTimeout(updateActiveNavItem, 100);
        });
    });
});

