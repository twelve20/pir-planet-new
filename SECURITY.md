# Безопасность сайта Планета PIR

## Обзор

Этот документ описывает все реализованные меры безопасности на сайте planetapir.ru.

## Реализованные меры безопасности

### 1. XSS Protection (Защита от межсайтового скриптинга)

**Файл:** `js/security.js`

- Все пользовательские вводы санитизируются перед обработкой
- Используется функция `SecurityUtils.sanitizeInput()` для очистки HTML-тегов
- Проверка на подозрительные паттерны (script tags, javascript:, eval, etc.)
- Валидация всех полей формы перед отправкой

**Примеры защиты:**
```javascript
// Санитизация имени
const sanitizedName = SecurityUtils.sanitizeInput(name);

// Проверка комментария на вредоносный код
const validComment = SecurityUtils.validateComment(comment);
```

### 2. Rate Limiting (Ограничение частоты запросов)

**Файл:** `js/security.js`

- Защита от спама и автоматических атак
- Максимум 3 попытки отправки формы в течение 5 минут
- Блокировка при превышении лимита с показом времени до сброса

**Конфигурация:**
```javascript
// 3 попытки в течение 300000 мс (5 минут)
RateLimiter.checkLimit('form_submit', 3, 300000)
```

### 3. Input Validation (Валидация входных данных)

**Файл:** `js/security.js`

Строгая валидация всех полей формы:

- **Имя:** Только буквы (кириллица/латиница), пробелы и дефисы, 2-50 символов
  - Regex: `/^[а-яА-ЯёЁa-zA-Z\s\-]{2,50}$/`

- **Телефон:** Российский формат +7 (XXX) XXX-XX-XX
  - Regex: `/^\+7\s\(\d{3}\)\s\d{3}\-\d{2}\-\d{2}$/`
  - Проверка на ровно 11 цифр

- **Email:** Стандартная валидация email
  - Regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
  - Максимум 100 символов

- **Комментарий:**
  - Максимум 1000 символов
  - Проверка на SQL-инъекции и XSS-атаки
  - Удаление всех HTML-тегов

### 4. CSRF Protection (Защита от межсайтовой подделки запросов)

**Файл:** `js/security.js`

- Генерация уникального CSRF токена для каждой сессии
- Использование `crypto.getRandomValues()` для криптографически стойкой генерации
- Токен добавляется ко всем запросам на сервер
- Хранение токена в sessionStorage

**Использование:**
```javascript
const token = CSRFProtection.getToken();
const dataWithToken = CSRFProtection.addTokenToData(formData);
```

### 5. Security Headers (.htaccess)

**Файл:** `.htaccess`

Настроены следующие заголовки безопасности:

```apache
# Защита от clickjacking
Header always set X-Frame-Options "DENY"

# Предотвращение MIME type sniffing
Header always set X-Content-Type-Options "nosniff"

# XSS Protection в браузерах
Header always set X-XSS-Protection "1; mode=block"

# Referrer Policy
Header always set Referrer-Policy "strict-origin-when-cross-origin"

# Content Security Policy
Header always set Content-Security-Policy "..."
```

### 6. Content Security Policy (CSP)

**Файл:** `.htaccess`

Ограничивает источники загрузки контента:

- `default-src 'self'` - По умолчанию только с этого домена
- `script-src 'self' 'unsafe-inline' https://mc.yandex.ru` - Скрипты только свои и Яндекс.Метрика
- `style-src 'self' 'unsafe-inline'` - Стили только свои
- `img-src 'self' data: https: blob:` - Изображения с любых HTTPS источников
- `frame-ancestors 'none'` - Запрет встраивания в iframe
- `form-action 'self'` - Формы только на свой домен

### 7. HTTPS Enforcement

**Файл:** `.htaccess`

```apache
# Автоматическое перенаправление HTTP → HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

### 8. Protection Against Common Attacks (.htaccess)

#### SQL Injection Protection
```apache
# Блокировка попыток SQL-инъекций в URL
RewriteCond %{QUERY_STRING} (union.*select|insert.*into|delete.*from|drop.*table)
RewriteRule .* - [F,L]
```

#### XSS Protection
```apache
# Блокировка XSS в URL
RewriteCond %{QUERY_STRING} (<script|<iframe|<object|javascript:|eval\()
RewriteRule .* - [F,L]
```

#### File Injection Protection
```apache
# Блокировка попыток включения файлов
RewriteCond %{QUERY_STRING} (\.\.\/|boot\.ini|etc\/passwd|self\/environ)
RewriteRule .* - [F,L]
```

### 9. Directory Protection

**Файл:** `.htaccess`

```apache
# Отключение листинга директорий
Options -Indexes

# Защита скрытых файлов (.git, .env, etc.)
<FilesMatch "^\.">
    Order allow,deny
    Deny from all
</FilesMatch>

# Защита чувствительных файлов
<FilesMatch "(^#.*#|\.(bak|conf|dist|fla|in[ci]|log|psd|sh|sql|sw[op])|~)$">
    Order allow,deny
    Deny from all
</FilesMatch>
```

### 10. Request Size Limiting

**Файл:** `.htaccess`

```apache
# Ограничение размера запроса до 10MB
LimitRequestBody 10485760
```

### 11. Cookie Security

**Файл:** `js/script.js`

- Cookie consent баннер для соблюдения GDPR
- Отключение Яндекс.Метрики при отказе от cookies
- Хранение согласия в localStorage

## Оптимизация производительности с безопасностью

### 1. GZIP Compression

**Файл:** `.htaccess`

Сжатие всех текстовых ресурсов (HTML, CSS, JS, SVG, fonts)

### 2. Browser Caching

**Файл:** `.htaccess`

- Изображения: 1 год
- CSS/JS: 1 месяц
- Шрифты: 1 год
- HTML: 0 секунд (всегда свежий)

## Рекомендации по дальнейшему усилению безопасности

### 1. HSTS (HTTP Strict Transport Security)

После проверки работы HTTPS, раскомментировать в `.htaccess`:

```apache
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
```

### 2. Backend Security

При реализации бэкенда (`/api/send-order`):

1. **Валидация на сервере** - никогда не доверять клиентским данным
2. **Проверка CSRF токена** - использовать `CSRFProtection.getToken()`
3. **Rate limiting на сервере** - дополнительная защита от DDoS
4. **SQL Prepared Statements** - защита от SQL-инъекций
5. **Логирование** - записывать все попытки отправки форм
6. **Email validation** - проверка на spam-ботов
7. **Honeypot field** - скрытое поле для обнаружения ботов

### 3. Дополнительные меры

1. **Regular Updates** - обновлять все библиотеки и фреймворки
2. **Security Monitoring** - настроить мониторинг подозрительной активности
3. **Backup Strategy** - регулярное резервное копирование
4. **SSL Certificate** - использовать современные сертификаты (TLS 1.3)
5. **WAF (Web Application Firewall)** - рассмотреть использование Cloudflare

## Проверка безопасности

### Инструменты для аудита:

1. **Mozilla Observatory** - https://observatory.mozilla.org/
2. **Security Headers** - https://securityheaders.com/
3. **SSL Labs** - https://www.ssllabs.com/ssltest/
4. **Google Lighthouse** - встроено в Chrome DevTools

### Регулярные проверки:

- [ ] Проверка security headers раз в месяц
- [ ] Аудит кода на уязвимости раз в квартал
- [ ] Обновление зависимостей раз в месяц
- [ ] Проверка SSL сертификата перед истечением

## Контакты

При обнаружении уязвимостей безопасности, пожалуйста, свяжитесь:

- Email: olnast.ru@yandex.ru
- Телефон: +7 (996) 965-36-25

## История изменений

### 2025-01-22
- ✅ Реализован модуль XSS protection
- ✅ Добавлен Rate Limiting для форм
- ✅ Настроены Security Headers в .htaccess
- ✅ Добавлена валидация всех полей форм
- ✅ Реализована CSRF защита
- ✅ Настроен Content Security Policy
- ✅ Добавлена защита от SQL-инъекций в URL
- ✅ Настроено HTTPS redirect
- ✅ Защита директорий и файлов
