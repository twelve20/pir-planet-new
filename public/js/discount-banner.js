// Discount Banner Controller
(function() {
    const BANNER_KEY = 'discountBannerShown';
    const banner = document.getElementById('discountBanner');
    const closeButton = document.getElementById('closeBanner');

    // Проверяем, показывался ли баннер в этой сессии
    function shouldShowBanner() {
        return !sessionStorage.getItem(BANNER_KEY);
    }

    // Показываем баннер с анимацией
    function showBanner() {
        if (banner && shouldShowBanner()) {
            banner.style.display = 'block';
        }
    }

    // Скрываем баннер с анимацией
    function hideBanner() {
        if (!banner) return;

        // Добавляем класс для анимации скрытия
        banner.classList.add('hiding');

        // Удаляем баннер из DOM после анимации
        setTimeout(() => {
            banner.style.display = 'none';
            banner.classList.remove('hiding');
        }, 400);

        // Сохраняем в sessionStorage, что баннер был закрыт
        sessionStorage.setItem(BANNER_KEY, 'true');
    }

    // Обработчик закрытия баннера
    if (closeButton) {
        closeButton.addEventListener('click', hideBanner);
    }

    // Показываем баннер при загрузке страницы
    document.addEventListener('DOMContentLoaded', showBanner);
})();
