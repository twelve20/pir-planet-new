// ===== SECURITY MODULE =====

/**
 * XSS Protection - Sanitize user input
 */
const SecurityUtils = {
    /**
     * Sanitize string to prevent XSS attacks
     * @param {string} str - Input string to sanitize
     * @returns {string} - Sanitized string
     */
    sanitizeInput: function(str) {
        if (typeof str !== 'string') return '';

        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * Validate name - only letters, spaces, hyphens
     * @param {string} name - Name to validate
     * @returns {boolean}
     */
    validateName: function(name) {
        const nameRegex = /^[а-яА-ЯёЁa-zA-Z\s\-]{2,50}$/;
        return nameRegex.test(name);
    },

    /**
     * Validate phone number (Russian format)
     * @param {string} phone - Phone number to validate
     * @returns {boolean}
     */
    validatePhone: function(phone) {
        const phoneRegex = /^\+7\s\(\d{3}\)\s\d{3}\-\d{2}\-\d{2}$/;
        const digitsOnly = phone.replace(/\D/g, '');
        return phoneRegex.test(phone) && digitsOnly.length === 11;
    },

    /**
     * Validate email
     * @param {string} email - Email to validate
     * @returns {boolean}
     */
    validateEmail: function(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) && email.length <= 100;
    },

    /**
     * Sanitize and validate comment/message
     * @param {string} comment - Comment text
     * @returns {string|null} - Sanitized comment or null if invalid
     */
    validateComment: function(comment) {
        if (typeof comment !== 'string') return null;

        // Remove any HTML tags
        const sanitized = this.sanitizeInput(comment);

        // Check length (max 1000 characters)
        if (sanitized.length > 1000) return null;

        // Check for suspicious patterns (SQL injection attempts, script tags)
        const suspiciousPatterns = [
            /<script/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /eval\(/i,
            /expression\(/i,
            /<iframe/i,
            /SELECT.*FROM/i,
            /INSERT.*INTO/i,
            /DELETE.*FROM/i,
            /DROP.*TABLE/i,
            /UNION.*SELECT/i
        ];

        for (let pattern of suspiciousPatterns) {
            if (pattern.test(sanitized)) {
                console.warn('Suspicious input detected');
                return null;
            }
        }

        return sanitized;
    }
};

/**
 * Rate Limiting - Prevent spam and abuse
 */
const RateLimiter = {
    attempts: {},

    /**
     * Check if action is allowed based on rate limit
     * @param {string} key - Unique identifier (e.g., 'form_submit')
     * @param {number} maxAttempts - Maximum attempts allowed
     * @param {number} windowMs - Time window in milliseconds
     * @returns {boolean} - True if action is allowed
     */
    checkLimit: function(key, maxAttempts = 3, windowMs = 60000) {
        const now = Date.now();

        if (!this.attempts[key]) {
            this.attempts[key] = [];
        }

        // Remove old attempts outside the time window
        this.attempts[key] = this.attempts[key].filter(timestamp => {
            return now - timestamp < windowMs;
        });

        // Check if limit exceeded
        if (this.attempts[key].length >= maxAttempts) {
            return false;
        }

        // Add current attempt
        this.attempts[key].push(now);
        return true;
    },

    /**
     * Get remaining time until rate limit resets
     * @param {string} key - Unique identifier
     * @param {number} windowMs - Time window in milliseconds
     * @returns {number} - Remaining seconds
     */
    getResetTime: function(key, windowMs = 60000) {
        if (!this.attempts[key] || this.attempts[key].length === 0) {
            return 0;
        }

        const oldestAttempt = Math.min(...this.attempts[key]);
        const resetTime = oldestAttempt + windowMs;
        const remainingMs = resetTime - Date.now();

        return Math.ceil(remainingMs / 1000);
    },

    /**
     * Reset rate limit for a key
     * @param {string} key - Unique identifier
     */
    reset: function(key) {
        delete this.attempts[key];
    }
};

/**
 * CSRF Token Management (for future backend integration)
 */
const CSRFProtection = {
    tokenKey: 'csrf_token',

    /**
     * Generate a random CSRF token
     * @returns {string} - CSRF token
     */
    generateToken: function() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    },

    /**
     * Get or create CSRF token
     * @returns {string} - CSRF token
     */
    getToken: function() {
        let token = sessionStorage.getItem(this.tokenKey);

        if (!token) {
            token = this.generateToken();
            sessionStorage.setItem(this.tokenKey, token);
        }

        return token;
    },

    /**
     * Add CSRF token to form data
     * @param {Object} formData - Form data object
     * @returns {Object} - Form data with CSRF token
     */
    addTokenToData: function(formData) {
        return {
            ...formData,
            csrf_token: this.getToken()
        };
    }
};

/**
 * Secure Form Submission Handler
 */
const SecureFormHandler = {
    /**
     * Validate and sanitize form data
     * @param {HTMLFormElement} form - Form element
     * @returns {Object|null} - Validated data or null if invalid
     */
    validateFormData: function(form) {
        const nameInput = form.querySelector('#name');
        const phoneInput = form.querySelector('#phone');
        const commentInput = form.querySelector('#comment');

        if (!nameInput || !phoneInput) {
            console.error('Required form fields not found');
            return null;
        }

        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        const comment = commentInput ? commentInput.value.trim() : '';

        // Validate name
        if (!SecurityUtils.validateName(name)) {
            alert('Имя должно содержать только буквы и быть длиной от 2 до 50 символов');
            return null;
        }

        // Validate phone
        if (!SecurityUtils.validatePhone(phone)) {
            alert('Введите корректный номер телефона в формате +7 (XXX) XXX-XX-XX');
            return null;
        }

        // Validate and sanitize comment
        let sanitizedComment = '';
        if (comment) {
            sanitizedComment = SecurityUtils.validateComment(comment);
            if (sanitizedComment === null) {
                alert('Комментарий содержит недопустимые символы или слишком длинный (максимум 1000 символов)');
                return null;
            }
        }

        // Check rate limit
        if (!RateLimiter.checkLimit('form_submit', 3, 300000)) { // 3 attempts per 5 minutes
            const resetTime = RateLimiter.getResetTime('form_submit', 300000);
            alert(`Слишком много попыток. Пожалуйста, подождите ${resetTime} секунд перед следующей отправкой.`);
            return null;
        }

        return {
            name: SecurityUtils.sanitizeInput(name),
            phone: phone,
            comment: sanitizedComment
        };
    },

    /**
     * Submit form securely with validation and rate limiting
     * @param {Event} event - Submit event
     * @param {Function} onSuccess - Success callback
     * @param {Function} onError - Error callback
     */
    handleSubmit: async function(event, onSuccess, onError) {
        event.preventDefault();

        const form = event.target;
        const validatedData = this.validateFormData(form);

        if (!validatedData) {
            return;
        }

        // Add CSRF token for future backend integration
        const dataWithToken = CSRFProtection.addTokenToData(validatedData);

        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.textContent = 'Отправка...';
        submitButton.disabled = true;

        try {
            // Send to backend
            const response = await fetch('/api/send-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataWithToken)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                if (onSuccess) onSuccess(form);
            } else {
                throw new Error(data.errors ? data.errors.join(', ') : 'Ошибка отправки');
            }
        } catch (error) {
            console.error('Form submission error:', error);
            if (onError) onError(error);
        } finally {
            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
        }
    }
};

/**
 * Content Security Policy Helper
 */
const CSPHelper = {
    /**
     * Get recommended CSP meta tag content
     * @returns {string}
     */
    getRecommendedCSP: function() {
        return [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://mc.yandex.ru",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https: blob:",
            "font-src 'self' data:",
            "connect-src 'self' https://mc.yandex.ru",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'"
        ].join('; ');
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SecurityUtils,
        RateLimiter,
        CSRFProtection,
        SecureFormHandler,
        CSPHelper
    };
}
