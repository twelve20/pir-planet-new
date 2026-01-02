// ===== НОВОГОДНИЕ УКРАШЕНИЯ 2026 - СНЕГ =====

// Создание падающих снежинок
function createSnowflakes() {
    const snowContainer = document.createElement('div');
    snowContainer.className = 'snowflakes';
    snowContainer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(snowContainer);

    // Создаем 50 снежинок
    for (let i = 0; i < 50; i++) {
        const snowflake = document.createElement('div');
        snowflake.className = 'snowflake';
        snowflake.innerHTML = '❅';

        // Случайные параметры для каждой снежинки
        snowflake.style.left = Math.random() * 100 + '%';
        snowflake.style.animationDuration = (Math.random() * 3 + 2) + 's';
        snowflake.style.animationDelay = Math.random() * 5 + 's';
        snowflake.style.fontSize = (Math.random() * 10 + 10) + 'px';
        snowflake.style.opacity = Math.random() * 0.6 + 0.4;

        snowContainer.appendChild(snowflake);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    createSnowflakes();
});
