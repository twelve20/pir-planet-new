// ===== MOBILE MENU =====
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navMenu = document.getElementById('navMenu');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        mobileMenuBtn.classList.toggle('active');
    });

    // Close menu when clicking on a link
    const navLinks = navMenu.querySelectorAll('a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            mobileMenuBtn.classList.remove('active');
        });
    });
}

// ===== PHONE MASK =====
const phoneInput = document.getElementById('phone');

if (phoneInput) {
    phoneInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');

        if (value.length > 0) {
            if (value[0] === '7') {
                value = value.substring(1);
            }

            let formattedValue = '+7';

            if (value.length > 0) {
                formattedValue += ' (' + value.substring(0, 3);
            }
            if (value.length >= 4) {
                formattedValue += ') ' + value.substring(3, 6);
            }
            if (value.length >= 7) {
                formattedValue += '-' + value.substring(6, 8);
            }
            if (value.length >= 9) {
                formattedValue += '-' + value.substring(8, 10);
            }

            e.target.value = formattedValue;
        }
    });

    phoneInput.addEventListener('keydown', function(e) {
        if (e.key === 'Backspace' && e.target.value === '+7') {
            e.preventDefault();
        }
    });

    phoneInput.addEventListener('focus', function(e) {
        if (!e.target.value) {
            e.target.value = '+7';
        }
    });
}

// ===== ORDER FORM SUBMISSION =====
const orderForm = document.getElementById('orderForm');
const formSuccess = document.getElementById('formSuccess');

if (orderForm) {
    orderForm.addEventListener('submit', async (e) => {
        // Use SecureFormHandler if available, fallback to basic validation
        if (typeof SecureFormHandler !== 'undefined') {
            SecureFormHandler.handleSubmit(
                e,
                // Success callback
                (form) => {
                    // Показать сообщение об успехе
                    orderForm.classList.add('hide');
                    formSuccess.classList.add('show');

                    // Сбросить форму
                    orderForm.reset();
                    phoneInput.value = '+7';

                    // Скрыть сообщение об успехе и показать форму снова через 5 секунд
                    setTimeout(() => {
                        formSuccess.classList.remove('show');
                        orderForm.classList.remove('hide');
                    }, 5000);
                },
                // Error callback
                (error) => {
                    alert('Произошла ошибка при отправке заявки. Пожалуйста, позвоните нам напрямую или попробуйте позже.');
                }
            );
        } else {
            // Fallback: basic validation without security module
            e.preventDefault();

            const name = document.getElementById('name').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const comment = document.getElementById('comment') ? document.getElementById('comment').value.trim() : '';

            // Простая валидация на клиенте
            if (name.length < 2) {
                alert('Имя должно содержать минимум 2 символа');
                return;
            }

            if (phone.length < 10) {
                alert('Введите корректный номер телефона');
                return;
            }

            const submitButton = orderForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.textContent = 'Отправка...';
            submitButton.disabled = true;

            try {
                // Отправка на наш сервер
                const response = await fetch('/api/send-order', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: name,
                        phone: phone,
                        comment: comment
                    })
                });

                const data = await response.json();

                if (data.success) {
                    // Показать сообщение об успехе
                    orderForm.classList.add('hide');
                    formSuccess.classList.add('show');

                    // Сбросить форму
                    orderForm.reset();

                    // Скрыть сообщение об успехе и показать форму снова через 5 секунд
                    setTimeout(() => {
                        formSuccess.classList.remove('show');
                        orderForm.classList.remove('hide');
                        submitButton.textContent = originalButtonText;
                        submitButton.disabled = false;
                    }, 5000);
                } else {
                    throw new Error(data.errors ? data.errors.join(', ') : 'Ошибка отправки');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Произошла ошибка при отправке заявки. Пожалуйста, позвоните нам напрямую или попробуйте позже.');
                submitButton.textContent = originalButtonText;
                submitButton.disabled = false;
            }
        }
    });
}

// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// ===== SCROLL ANIMATIONS =====
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

// Animate cards on scroll
document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.about-card, .product-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = `all 0.6s ease ${index * 0.1}s`;
        observer.observe(card);
    });

    // Initialize calculator
    if (typeof calculateMaterials === 'function') {
        calculateMaterials();
    }
});

// ===== CALCULATOR =====
function calculateMaterials() {
    // Получаем значения из полей
    const length = parseFloat(document.getElementById('calc-length')?.value) || 0;
    const width = parseFloat(document.getElementById('calc-width')?.value) || 0;
    const height = parseFloat(document.getElementById('calc-height')?.value) || 0;
    const thicknessSelect = document.getElementById('calc-thickness')?.value || '50-782';

    const [thickness, pricePerPlate] = thicknessSelect.split('-');
    const platePriceNum = parseFloat(pricePerPlate);

    // Площадь одной плиты 600×1200 мм = 0.72 м²
    const plateArea = 0.72;

    // Расчет площади стен: (длина + ширина) × 2 × высота
    const wallArea = (length + width) * 2 * height;

    // Расчет площади потолка: длина × ширина (всегда включаем)
    const ceilingArea = length * width;

    // Общая площадь утепления
    const totalArea = wallArea + ceilingArea;

    // Количество плит с запасом 10%
    const platesCount = Math.ceil((totalArea / plateArea) * 1.1);

    // Клей-пена: 1 баллон на 8-10 м² (берем 9 м² для среднего значения)
    const glueCount = Math.ceil(totalArea / 9);
    const gluePricePerBottle = 1050;

    // Алюминиевый скотч: 1 рулон (50м) на ~15-20 м швов
    // Приблизительно: периметр плит = количество плит × 3.4м (периметр плиты 600×1200)
    // Делим на 2, т.к. швы общие между плитами
    const jointLength = (platesCount * 3.4) / 2;
    const tapeCount = Math.ceil(jointLength / 50); // 50м в рулоне
    const tapePricePerRoll = 500;

    // Расчет стоимости
    const platesCost = platesCount * platePriceNum;
    const glueCost = glueCount * gluePricePerBottle;
    const tapeCost = tapeCount * tapePricePerRoll;
    const totalCost = platesCost + glueCost + tapeCost;

    // Обновление результатов
    document.getElementById('calc-area').textContent = totalArea.toFixed(1) + ' м²';
    document.getElementById('calc-plates').textContent = platesCount + ' шт';
    document.getElementById('calc-glue').textContent = glueCount + ' шт';
    document.getElementById('calc-tape').textContent = tapeCount + ' шт';
    document.getElementById('calc-total').textContent = totalCost.toLocaleString('ru-RU') + ' ₽';

    document.getElementById('calc-plates-cost').textContent = platesCost.toLocaleString('ru-RU') + ' ₽';
    document.getElementById('calc-glue-cost').textContent = glueCost.toLocaleString('ru-RU') + ' ₽';
    document.getElementById('calc-tape-cost').textContent = tapeCost.toLocaleString('ru-RU') + ' ₽';

    // Обновление детализации
    const thicknessText = thickness + 'мм';
    const breakdownHtml = `
        <div>• PIR-плиты ФОЛЬГА ${thicknessText}: ${platesCost.toLocaleString('ru-RU')} ₽</div>
        <div>• Клей-пена PIRROклей: ${glueCost.toLocaleString('ru-RU')} ₽</div>
        <div>• Алюминиевый скотч: ${tapeCost.toLocaleString('ru-RU')} ₽</div>
    `;
    document.getElementById('calc-breakdown').innerHTML = breakdownHtml;
}
