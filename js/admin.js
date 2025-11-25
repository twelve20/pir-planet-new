// ===== ADMIN PANEL JAVASCRIPT =====

// Default credentials (в продакшене использовать серверную авторизацию!)
const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'admin123';

// Data storage keys
const STORAGE_KEYS = {
    AUTH: 'admin_auth',
    PRODUCTS: 'admin_products',
    BLOG: 'admin_blog',
    GALLERY: 'admin_gallery'
};

// ===== AUTHENTICATION =====
class Auth {
    static isAuthenticated() {
        return localStorage.getItem(STORAGE_KEYS.AUTH) === 'true';
    }

    static login(username, password) {
        if (username === DEFAULT_USERNAME && password === DEFAULT_PASSWORD) {
            localStorage.setItem(STORAGE_KEYS.AUTH, 'true');
            return true;
        }
        return false;
    }

    static logout() {
        localStorage.removeItem(STORAGE_KEYS.AUTH);
    }
}

// ===== DATA MANAGER =====
class DataManager {
    static get(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    }

    static set(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    static add(key, item) {
        const data = this.get(key);
        item.id = Date.now().toString();
        item.createdAt = new Date().toISOString();
        data.push(item);
        this.set(key, data);
        return item;
    }

    static update(key, id, updatedItem) {
        const data = this.get(key);
        const index = data.findIndex(item => item.id === id);
        if (index !== -1) {
            data[index] = { ...data[index], ...updatedItem, updatedAt: new Date().toISOString() };
            this.set(key, data);
            return data[index];
        }
        return null;
    }

    static delete(key, id) {
        const data = this.get(key);
        const filtered = data.filter(item => item.id !== id);
        this.set(key, filtered);
        return filtered.length < data.length;
    }
}

// ===== UI MANAGER =====
class UI {
    static showLogin() {
        document.getElementById('loginContainer').style.display = 'flex';
        document.getElementById('adminContainer').style.display = 'none';
    }

    static showAdmin() {
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('adminContainer').style.display = 'flex';
        this.updateStats();
    }

    static showSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.remove('active');
        });

        // Show selected section
        document.getElementById(sectionId).classList.add('active');

        // Update nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');
    }

    static updateStats() {
        const productsCount = DataManager.get(STORAGE_KEYS.PRODUCTS).length;
        const blogCount = DataManager.get(STORAGE_KEYS.BLOG).length;
        const galleryCount = DataManager.get(STORAGE_KEYS.GALLERY).length;

        document.getElementById('productsCount').textContent = productsCount;
        document.getElementById('blogCount').textContent = blogCount;
        document.getElementById('galleryCount').textContent = galleryCount;
    }

    static showModal(title, formHTML) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML = formHTML;
        document.getElementById('contentModal').classList.add('show');
    }

    static hideModal() {
        document.getElementById('contentModal').classList.remove('show');
    }

    static showError(message) {
        const errorEl = document.getElementById('loginError');
        errorEl.textContent = message;
        errorEl.classList.add('show');
    }
}

// ===== PRODUCTS MANAGER =====
class ProductsManager {
    static render() {
        const products = DataManager.get(STORAGE_KEYS.PRODUCTS);
        const container = document.getElementById('productsList');

        if (products.length === 0) {
            container.innerHTML = '<p class="empty-state">Товары пока не добавлены</p>';
            return;
        }

        container.innerHTML = products.map(product => `
            <div class="content-item" data-id="${product.id}">
                <h3>${product.name}</h3>
                <p>${product.price} ₽/м²</p>
                <div class="item-actions">
                    <button onclick="ProductsManager.edit('${product.id}')">Редактировать</button>
                    <button onclick="ProductsManager.delete('${product.id}')">Удалить</button>
                </div>
            </div>
        `).join('');
    }

    static showAddForm() {
        const formHTML = `
            <form id="productForm">
                <div class="form-group">
                    <label for="productName">Название товара *</label>
                    <input type="text" id="productName" required>
                </div>
                <div class="form-group">
                    <label for="productPrice">Цена за м² *</label>
                    <input type="number" id="productPrice" required>
                </div>
                <div class="form-group">
                    <label for="productDescription">Описание</label>
                    <textarea id="productDescription"></textarea>
                </div>
                <button type="submit" class="btn-primary">Добавить товар</button>
            </form>
        `;

        UI.showModal('Добавить товар', formHTML);

        document.getElementById('productForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const product = {
                name: document.getElementById('productName').value,
                price: document.getElementById('productPrice').value,
                description: document.getElementById('productDescription').value
            };
            DataManager.add(STORAGE_KEYS.PRODUCTS, product);
            UI.hideModal();
            this.render();
            UI.updateStats();
        });
    }

    static edit(id) {
        const products = DataManager.get(STORAGE_KEYS.PRODUCTS);
        const product = products.find(p => p.id === id);

        const formHTML = `
            <form id="productForm">
                <div class="form-group">
                    <label for="productName">Название товара *</label>
                    <input type="text" id="productName" value="${product.name}" required>
                </div>
                <div class="form-group">
                    <label for="productPrice">Цена за м² *</label>
                    <input type="number" id="productPrice" value="${product.price}" required>
                </div>
                <div class="form-group">
                    <label for="productDescription">Описание</label>
                    <textarea id="productDescription">${product.description || ''}</textarea>
                </div>
                <button type="submit" class="btn-primary">Сохранить изменения</button>
            </form>
        `;

        UI.showModal('Редактировать товар', formHTML);

        document.getElementById('productForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const updatedProduct = {
                name: document.getElementById('productName').value,
                price: document.getElementById('productPrice').value,
                description: document.getElementById('productDescription').value
            };
            DataManager.update(STORAGE_KEYS.PRODUCTS, id, updatedProduct);
            UI.hideModal();
            this.render();
        });
    }

    static delete(id) {
        if (confirm('Удалить этот товар?')) {
            DataManager.delete(STORAGE_KEYS.PRODUCTS, id);
            this.render();
            UI.updateStats();
        }
    }
}

// ===== BLOG MANAGER =====
class BlogManager {
    static render() {
        const posts = DataManager.get(STORAGE_KEYS.BLOG);
        const container = document.getElementById('blogList');

        if (posts.length === 0) {
            container.innerHTML = '<p class="empty-state">Статьи пока не добавлены</p>';
            return;
        }

        container.innerHTML = posts.map(post => `
            <div class="content-item" data-id="${post.id}">
                <h3>${post.title}</h3>
                <p>${post.excerpt}</p>
                <div class="item-actions">
                    <button onclick="BlogManager.edit('${post.id}')">Редактировать</button>
                    <button onclick="BlogManager.delete('${post.id}')">Удалить</button>
                </div>
            </div>
        `).join('');
    }

    static showAddForm() {
        const formHTML = `
            <form id="blogForm">
                <div class="form-group">
                    <label for="blogTitle">Заголовок *</label>
                    <input type="text" id="blogTitle" required>
                </div>
                <div class="form-group">
                    <label for="blogCategory">Категория *</label>
                    <input type="text" id="blogCategory" required>
                </div>
                <div class="form-group">
                    <label for="blogExcerpt">Краткое описание *</label>
                    <textarea id="blogExcerpt" rows="3" required></textarea>
                </div>
                <div class="form-group">
                    <label for="blogContent">Содержание статьи *</label>
                    <textarea id="blogContent" required></textarea>
                </div>
                <button type="submit" class="btn-primary">Добавить статью</button>
            </form>
        `;

        UI.showModal('Добавить статью', formHTML);

        document.getElementById('blogForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const post = {
                title: document.getElementById('blogTitle').value,
                category: document.getElementById('blogCategory').value,
                excerpt: document.getElementById('blogExcerpt').value,
                content: document.getElementById('blogContent').value,
                author: 'Админ'
            };
            DataManager.add(STORAGE_KEYS.BLOG, post);
            UI.hideModal();
            this.render();
            UI.updateStats();
        });
    }

    static edit(id) {
        const posts = DataManager.get(STORAGE_KEYS.BLOG);
        const post = posts.find(p => p.id === id);

        const formHTML = `
            <form id="blogForm">
                <div class="form-group">
                    <label for="blogTitle">Заголовок *</label>
                    <input type="text" id="blogTitle" value="${post.title}" required>
                </div>
                <div class="form-group">
                    <label for="blogCategory">Категория *</label>
                    <input type="text" id="blogCategory" value="${post.category}" required>
                </div>
                <div class="form-group">
                    <label for="blogExcerpt">Краткое описание *</label>
                    <textarea id="blogExcerpt" rows="3" required>${post.excerpt}</textarea>
                </div>
                <div class="form-group">
                    <label for="blogContent">Содержание статьи *</label>
                    <textarea id="blogContent" required>${post.content}</textarea>
                </div>
                <button type="submit" class="btn-primary">Сохранить изменения</button>
            </form>
        `;

        UI.showModal('Редактировать статью', formHTML);

        document.getElementById('blogForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const updatedPost = {
                title: document.getElementById('blogTitle').value,
                category: document.getElementById('blogCategory').value,
                excerpt: document.getElementById('blogExcerpt').value,
                content: document.getElementById('blogContent').value
            };
            DataManager.update(STORAGE_KEYS.BLOG, id, updatedPost);
            UI.hideModal();
            this.render();
        });
    }

    static delete(id) {
        if (confirm('Удалить эту статью?')) {
            DataManager.delete(STORAGE_KEYS.BLOG, id);
            this.render();
            UI.updateStats();
        }
    }
}

// ===== GALLERY MANAGER =====
class GalleryManager {
    static render() {
        const images = DataManager.get(STORAGE_KEYS.GALLERY);
        const container = document.getElementById('galleryGrid');

        if (images.length === 0) {
            container.innerHTML = '<p class="empty-state">Фотографии пока не добавлены</p>';
            return;
        }

        container.innerHTML = images.map(image => `
            <div class="gallery-item" data-id="${image.id}">
                <img src="${image.url}" alt="${image.title}">
                <div class="gallery-item-overlay">
                    <h4>${image.title}</h4>
                    <button onclick="GalleryManager.delete('${image.id}')">Удалить</button>
                </div>
            </div>
        `).join('');
    }

    static showAddForm() {
        const formHTML = `
            <form id="galleryForm">
                <div class="form-group">
                    <label for="galleryTitle">Название *</label>
                    <input type="text" id="galleryTitle" required>
                </div>
                <div class="form-group">
                    <label for="galleryURL">URL изображения *</label>
                    <input type="url" id="galleryURL" required placeholder="https://...">
                </div>
                <button type="submit" class="btn-primary">Добавить фото</button>
            </form>
        `;

        UI.showModal('Добавить фото', formHTML);

        document.getElementById('galleryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const image = {
                title: document.getElementById('galleryTitle').value,
                url: document.getElementById('galleryURL').value
            };
            DataManager.add(STORAGE_KEYS.GALLERY, image);
            UI.hideModal();
            this.render();
            UI.updateStats();
        });
    }

    static delete(id) {
        if (confirm('Удалить это фото?')) {
            DataManager.delete(STORAGE_KEYS.GALLERY, id);
            this.render();
            UI.updateStats();
        }
    }
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    if (Auth.isAuthenticated()) {
        UI.showAdmin();
        ProductsManager.render();
    } else {
        UI.showLogin();
    }

    // Login form
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (Auth.login(username, password)) {
            UI.showAdmin();
            ProductsManager.render();
        } else {
            UI.showError('Неверный логин или пароль');
        }
    });

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', () => {
        Auth.logout();
        UI.showLogin();
    });

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            UI.showSection(section);

            // Render content for section
            if (section === 'products') ProductsManager.render();
            if (section === 'blog') BlogManager.render();
            if (section === 'gallery') GalleryManager.render();
        });
    });

    // Add buttons
    document.getElementById('addProductBtn').addEventListener('click', () => ProductsManager.showAddForm());
    document.getElementById('addBlogBtn').addEventListener('click', () => BlogManager.showAddForm());
    document.getElementById('addGalleryBtn').addEventListener('click', () => GalleryManager.showAddForm());

    // Modal close
    document.getElementById('modalClose').addEventListener('click', () => UI.hideModal());
    document.getElementById('contentModal').addEventListener('click', (e) => {
        if (e.target.id === 'contentModal') UI.hideModal();
    });
});
