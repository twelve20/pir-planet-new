// ===== CHECKOUT PAGE LOGIC =====

class CheckoutPage {
    constructor() {
        this.form = document.getElementById('checkoutForm');
        this.orderItems = document.getElementById('orderItems');
        this.orderTotalItems = document.getElementById('orderTotalItems');
        this.orderSubtotal = document.getElementById('orderSubtotal');
        this.orderTotal = document.getElementById('orderTotal');

        this.init();
    }

    init() {
        // Проверяем, есть ли товары в корзине
        if (cart.items.length === 0) {
            window.location.href = '/cart';
            return;
        }

        this.renderOrderSummary();
        this.setupFormHandlers();
        this.setupPhoneMask();
    }

    renderOrderSummary() {
        // Очищаем список
        this.orderItems.innerHTML = '';

        // Рендерим товары
        cart.items.forEach(item => {
            const orderItem = this.createOrderItem(item);
            this.orderItems.appendChild(orderItem);
        });

        // Обновляем итоги
        const totalItems = cart.getTotalItems();
        const totalPrice = cart.getTotalPrice();

        this.orderTotalItems.textContent = totalItems;
        this.orderSubtotal.textContent = this.formatPrice(totalPrice) + ' ₽';
        this.orderTotal.textContent = this.formatPrice(totalPrice) + ' ₽';
    }

    createOrderItem(item) {
        const div = document.createElement('div');
        div.className = 'order-item';

        div.innerHTML = `
            <div class="order-item-image">
                <img src="${item.image || 'images/placeholder.webp'}" alt="${item.name}">
            </div>
            <div class="order-item-details">
                <div class="order-item-name">${item.name}</div>
                <div class="order-item-quantity">${item.quantity} шт.</div>
            </div>
            <div class="order-item-price">${this.formatPrice(item.price * item.quantity)} ₽</div>
        `;

        return div;
    }

    setupFormHandlers() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    setupPhoneMask() {
        const phoneInput = document.getElementById('customerPhone');
        phoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');

            if (value.length === 0) {
                e.target.value = '';
                return;
            }

            if (value[0] === '8') {
                value = '7' + value.slice(1);
            }

            if (value[0] !== '7') {
                value = '7' + value;
            }

            let formatted = '+7';

            if (value.length > 1) {
                formatted += ' (' + value.slice(1, 4);
            }
            if (value.length >= 5) {
                formatted += ') ' + value.slice(4, 7);
            }
            if (value.length >= 8) {
                formatted += '-' + value.slice(7, 9);
            }
            if (value.length >= 10) {
                formatted += '-' + value.slice(9, 11);
            }

            e.target.value = formatted;
        });
    }

    async handleSubmit(e) {
        e.preventDefault();

        const submitButton = document.getElementById('submitOrder');
        submitButton.disabled = true;
        submitButton.textContent = 'Оформление...';

        try {
            // Собираем данные формы
            const formData = new FormData(this.form);
            const deliveryMethod = formData.get('deliveryMethod');
            const paymentMethod = formData.get('paymentMethod');

            const orderData = {
                customer: {
                    name: formData.get('name'),
                    phone: formData.get('phone'),
                    email: formData.get('email') || null
                },
                delivery: {
                    method: deliveryMethod,
                    city: formData.get('city'),
                    address: formData.get('address'),
                    postcode: formData.get('postcode') || null
                },
                payment: {
                    method: paymentMethod
                },
                items: cart.items,
                comment: formData.get('comment') || null,
                totalPrice: cart.getTotalPrice()
            };

            // Отправляем заказ на сервер
            const response = await fetch('/api/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Успешное создание заказа
                const orderId = result.orderId;
                const orderNumber = result.orderNumber;

                // Очищаем корзину
                cart.clear();

                // Если выбрана онлайн-оплата, открываем виджет Альфа-Банк
                if (paymentMethod === 'card' || paymentMethod === 'sbp') {
                    // Яндекс Метрика - переход к оплате
                    if (typeof ym !== 'undefined') {
                        ym(104857358, 'reachGoal', 'checkout_payment');
                    }

                    try {
                        submitButton.textContent = 'Загрузка виджета...';

                        const widgetContainer = document.getElementById('alfa-payment-button');
                        console.log('🔍 Контейнер виджета:', widgetContainer);
                        console.log('📋 Атрибуты виджета:', {
                            token: widgetContainer.getAttribute('data-token'),
                            gateway: widgetContainer.getAttribute('data-gateway')
                        });

                        // Заполняем скрытые поля для виджета
                        document.getElementById('hiddenClientName').value = formData.get('name');
                        document.getElementById('hiddenClientEmail').value = formData.get('email') || '';
                        document.getElementById('hiddenOrderNumber').value = orderNumber;
                        // Сумма в копейках для виджета
                        document.getElementById('hiddenTotalAmount').value = Math.round(orderData.totalPrice * 100);

                        console.log('📝 Данные для виджета:', {
                            name: formData.get('name'),
                            orderNumber: orderNumber,
                            amount: Math.round(orderData.totalPrice * 100)
                        });

                        // Скрываем обычную кнопку и показываем кнопку виджета
                        submitButton.style.display = 'none';
                        widgetContainer.style.display = 'block';
                        console.log('👀 Виджет показан');

                        // Ждём инициализации виджета и программно кликаем на кнопку
                        let attempts = 0;
                        const checkWidget = setInterval(() => {
                            attempts++;
                            console.log(`🔄 Попытка ${attempts}/10: ищем кнопку виджета...`);
                            const widgetButton = document.querySelector('#alfa-payment-button button');

                            if (widgetButton) {
                                clearInterval(checkWidget);
                                console.log('✅ Виджет загружен, открываем форму оплаты');

                                // Добавляем класс к body для скрытия чата
                                document.body.classList.add('payment-modal-open');

                                widgetButton.click();

                                // Ждём появления модального окна и центрируем его
                                setTimeout(() => {
                                    this.centerWidgetModal();
                                }, 300);
                            } else if (attempts > 10) {
                                clearInterval(checkWidget);
                                console.error('❌ Виджет не загрузился после 5 секунд');
                                console.error('HTML виджета:', widgetContainer.innerHTML);
                                alert('Платёжный виджет не загрузился. Попробуйте обновить страницу или выберите другой способ оплаты.');
                                window.location.href = `/order/${orderId}`;
                            }
                        }, 500);
                    } catch (widgetError) {
                        console.error('Ошибка инициализации виджета:', widgetError);
                        alert('Не удалось загрузить платёжный виджет. Попробуйте позже или выберите другой способ оплаты.');
                        window.location.href = `/order/${orderId}`;
                    }
                } else {
                    // Для оплаты наличными сразу перенаправляем на страницу заказа

                    // Яндекс Метрика - оформление заказа наличными
                    if (typeof ym !== 'undefined') {
                        ym(104857358, 'reachGoal', 'checkout_cash');
                    }

                    window.location.href = `/order/${orderId}`;
                }
            } else {
                throw new Error(result.message || 'Ошибка при создании заказа');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Произошла ошибка при оформлении заказа. Пожалуйста, попробуйте еще раз или свяжитесь с нами по телефону.');

            submitButton.disabled = false;
            submitButton.textContent = 'Оформить заказ';
        }
    }

    formatPrice(price) {
        return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    centerWidgetModal() {
        // Ищем все элементы с position: fixed (модальные окна виджета)
        const allElements = document.querySelectorAll('*');

        for (let element of allElements) {
            const style = window.getComputedStyle(element);

            // Если это модальное окно (fixed position с высоким z-index)
            if (style.position === 'fixed' && parseInt(style.zIndex) > 1000) {
                console.log('🎯 Найдено модальное окно виджета, центрируем...');

                // Принудительно центрируем
                element.style.setProperty('left', '50%', 'important');
                element.style.setProperty('top', '50%', 'important');
                element.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
                element.style.setProperty('max-width', '540px', 'important');
                element.style.setProperty('max-height', '78vh', 'important');
                element.style.setProperty('margin', '0', 'important');
                element.style.setProperty('z-index', '999999', 'important');

                // Для маленьких экранов по высоте
                if (window.innerHeight <= 768) {
                    element.style.setProperty('max-height', '72vh', 'important');
                } else if (window.innerHeight <= 900) {
                    element.style.setProperty('max-height', '75vh', 'important');
                }

                // Стилизуем дочерние элементы (iframe и контейнеры)
                const children = element.querySelectorAll('div, iframe');
                children.forEach(child => {
                    child.style.setProperty('max-width', '540px', 'important');
                    child.style.setProperty('max-height', '78vh', 'important');
                    child.style.setProperty('border-radius', '12px', 'important');
                    child.style.setProperty('padding', '0', 'important');
                    child.style.setProperty('margin', '0', 'important');
                    child.style.setProperty('border', 'none', 'important');

                    if (window.innerHeight <= 768) {
                        child.style.setProperty('max-height', '72vh', 'important');
                    } else if (window.innerHeight <= 900) {
                        child.style.setProperty('max-height', '75vh', 'important');
                    }
                });

                console.log('✅ Модальное окно отцентрировано (540px x 78vh) без серых полос');
            }
        }

        // Повторяем через небольшую задержку на случай, если виджет ещё рендерится
        setTimeout(() => this.centerWidgetModal(), 500);
        setTimeout(() => this.centerWidgetModal(), 1000);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new CheckoutPage();
});
