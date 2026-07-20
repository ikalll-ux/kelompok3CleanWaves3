// ==========================================================================
// CleanWaves — js/home.js
// Logika khusus halaman Home (index.html): hero slider otomatis + manual.
// ==========================================================================

let currentHeroIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
    // Auto-play slider hero setiap 5 detik
    setInterval(() => {
        nextHero();
    }, 5000);
});

function showHero(index) {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dot');

    if (index >= slides.length) currentHeroIndex = 0;
    if (index < 0) currentHeroIndex = slides.length - 1;

    slides.forEach((slide, i) => {
        if (i === currentHeroIndex) {
            slide.classList.add('active');
            dots[i].style.opacity = "1";
        } else {
            slide.classList.remove('active');
            dots[i].style.opacity = "0.4";
        }
    });
}

function nextHero() {
    currentHeroIndex++;
    showHero(currentHeroIndex);
}

function prevHero() {
    currentHeroIndex--;
    showHero(currentHeroIndex);
}

function setHero(index) {
    currentHeroIndex = index;
    showHero(currentHeroIndex);
}
