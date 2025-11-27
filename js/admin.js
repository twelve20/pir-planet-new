// ===== ADMIN PANEL JAVASCRIPT WITH API =====

// Default credentials (в продакшене использовать серверную авторизацию!)
const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'admin123';

// API Base URL
const API_BASE = '/api/admin';

// ===== AUTHENTICATION =====
class Auth {
    static isAuthenticated() {
        return localStorage.getItem('admin_auth') === 'true';
    }

    static login(username, password) {
        if (username === DEFAULT_USERNAME && password === DEFAULT_PASSWORD) {
            localStorage.setItem('admin_auth', 'true');
            return true;
        }
        return false;
    }

    static logout() {
        localStorage.removeItem('admin_auth');
    }
}

// ===== API MANAGER =====
class API {
    static async request(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Ошибка запроса');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Products
    static async getProducts() {
        return await this.request(`${API_BASE}/products`);
    }

    static async addProduct(product) {
        return await this.request(`${API_BASE}/products`, {
            method: 'POST',
            body: JSON.stringify(product)
        });
    }

    static async updateProduct(id, product) {
        return await this.request(`${API_BASE}/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(product)
        });
    }

    static async deleteProduct(id) {
        return await this.request(`${API_BASE}/products/${id}`, {
            method: 'DELETE'
        });
    }

    // Blog
    static async getBlogPosts() {
        return await this.request(`${API_BASE}/blog`);
    }

    static async addBlogPost(post) {
        return await this.request(`${API_BASE}/blog`, {
            method: 'POST',
            body: JSON.stringify(post)
        });
    }

    static async updateBlogPost(id, post) {
        return await this.request(`${API_BASE}/blog/${id}`, {
            method: 'PUT',
            body: JSON.stringify(post)
        });
    }

    static async deleteBlogPost(id) {
        return await this.request(`${API_BASE}/blog/${id}`, {
            method: 'DELETE'
        });
    }

    // Gallery
    static async getGalleryImages() {
        return await this.request(`${API_BASE}/gallery`);
    }

    static async addGalleryImage(image) {
        return await this.request(`${API_BASE}/gallery`, {
            method: 'POST',
            body: JSON.stringify(image)
        });
    }

    static async deleteGalleryImage(id) {
        return await this.request(`${API_BASE}/gallery/${id}`, {
            method: 'DELETE'
        });
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

    static async updateStats() {
        try {
            const [products, blog, gallery] = await Promise.all([
                API.getProducts(),
                API.getBlogPosts(),
                API.getGalleryImages()
            ]);

            document.getElementById('productsCount').textContent = products.data.length;
            document.getElementById('blogCount').textContent = blog.data.length;
            document.getElementById('galleryCount').textContent = gallery.data.length;
        } catch (error) {
            console.error('Error updating stats:', error);
        }
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

    static showNotification(message, type = 'success') {
        // Simple notification (можно улучшить)
        alert(message);
    }
}

// ===== PRODUCTS MANAGER =====
class ProductsManager {
    static async render() {
        const container = document.getElementById('productsList');

        try {
            const response = await API.getProducts();
            const products = response.data;

            if (products.length === 0) {
                container.innerHTML = '<p class="empty-state">Товары пока не добавлены</p>';
                return;
            }

            container.innerHTML = products.map(product => `
                <div class="content-item" data-id="${product.id}">
                    <h3>${product.name}</h3>
                    <p>${product.price} ₽</p>
                    ${product.description ? `<p class="item-desc">${product.description}</p>` : ''}
                    <div class="item-actions">
                        <button onclick="ProductsManager.edit('${product.id}')">Редактировать</button>
                        <button onclick="ProductsManager.delete('${product.id}')">Удалить</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            container.innerHTML = '<p class="empty-state error">Ошибка загрузки товаров</p>';
            console.error('Error rendering products:', error);
        }
    }

    static showAddForm() {
        const formHTML = `
            <form id="productForm">
                <div class="form-group">
                    <label for="productName">Название товара *</label>
                    <input type="text" id="productName" required>
                </div>
                <div class="form-group">
                    <label for="productPrice">Цена *</label>
                    <input type="text" id="productPrice" required placeholder="622 ₽">
                </div>
                <div class="form-group">
                    <label for="productDescription">Описание</label>
                    <textarea id="productDescription" rows="4"></textarea>
                </div>
                <button type="submit" class="btn-primary">Добавить товар</button>
            </form>
        `;

        UI.showModal('Добавить товар', formHTML);

        document.getElementById('productForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const product = {
                    name: document.getElementById('productName').value,
                    price: document.getElementById('productPrice').value,
                    description: document.getElementById('productDescription').value
                };
                await API.addProduct(product);
                UI.hideModal();
                await this.render();
                await UI.updateStats();
                UI.showNotification('Товар добавлен успешно!');
            } catch (error) {
                UI.showNotification('Ошибка добавления товара: ' + error.message, 'error');
            }
        });
    }

    static async edit(id) {
        try {
            const response = await API.getProducts();
            const product = response.data.find(p => p.id === id);

            if (!product) {
                UI.showNotification('Товар не найден', 'error');
                return;
            }

            const formHTML = `
                <form id="productForm">
                    <div class="form-group">
                        <label for="productName">Название товара *</label>
                        <input type="text" id="productName" value="${product.name}" required>
                    </div>
                    <div class="form-group">
                        <label for="productPrice">Цена *</label>
                        <input type="text" id="productPrice" value="${product.price}" required>
                    </div>
                    <div class="form-group">
                        <label for="productDescription">Описание</label>
                        <textarea id="productDescription" rows="4">${product.description || ''}</textarea>
                    </div>
                    <button type="submit" class="btn-primary">Сохранить изменения</button>
                </form>
            `;

            UI.showModal('Редактировать товар', formHTML);

            document.getElementById('productForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                try {
                    const updatedProduct = {
                        name: document.getElementById('productName').value,
                        price: document.getElementById('productPrice').value,
                        description: document.getElementById('productDescription').value
                    };
                    await API.updateProduct(id, updatedProduct);
                    UI.hideModal();
                    await this.render();
                    UI.showNotification('Товар обновлен успешно!');
                } catch (error) {
                    UI.showNotification('Ошибка обновления товара: ' + error.message, 'error');
                }
            });
        } catch (error) {
            UI.showNotification('Ошибка загрузки товара: ' + error.message, 'error');
        }
    }

    static async delete(id) {
        if (!confirm('Удалить этот товар?')) return;

        try {
            await API.deleteProduct(id);
            await this.render();
            await UI.updateStats();
            UI.showNotification('Товар удален успешно!');
        } catch (error) {
            UI.showNotification('Ошибка удаления товара: ' + error.message, 'error');
        }
    }
}

// ===== BLOG MANAGER =====
class BlogManager {
    static async render() {
        const container = document.getElementById('blogList');

        try {
            const response = await API.getBlogPosts();
            const posts = response.data;

            if (posts.length === 0) {
                container.innerHTML = '<p class="empty-state">Статьи пока не добавлены</p>';
                return;
            }

            container.innerHTML = posts.map(post => `
                <div class="content-item" data-id="${post.id}">
                    <h3>${post.title}</h3>
                    ${post.category ? `<span class="item-category">${post.category}</span>` : ''}
                    <p class="item-desc">${post.excerpt || ''}</p>
                    <div class="item-actions">
                        <button onclick="BlogManager.edit('${post.id}')">Редактировать</button>
                        <button onclick="BlogManager.delete('${post.id}')">Удалить</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            container.innerHTML = '<p class="empty-state error">Ошибка загрузки статей</p>';
            console.error('Error rendering blog posts:', error);
        }
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
                    <textarea id="blogContent" rows="10" required></textarea>
                </div>
                <button type="submit" class="btn-primary">Добавить статью</button>
            </form>
        `;

        UI.showModal('Добавить статью', formHTML);

        document.getElementById('blogForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const post = {
                    title: document.getElementById('blogTitle').value,
                    category: document.getElementById('blogCategory').value,
                    excerpt: document.getElementById('blogExcerpt').value,
                    content: document.getElementById('blogContent').value,
                    author: 'Админ'
                };
                await API.addBlogPost(post);
                UI.hideModal();
                await this.render();
                await UI.updateStats();
                UI.showNotification('Статья добавлена успешно!');
            } catch (error) {
                UI.showNotification('Ошибка добавления статьи: ' + error.message, 'error');
            }
        });
    }

    static async edit(id) {
        try {
            const response = await API.getBlogPosts();
            const post = response.data.find(p => p.id === id);

            if (!post) {
                UI.showNotification('Статья не найдена', 'error');
                return;
            }

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
                        <textarea id="blogContent" rows="10" required>${post.content}</textarea>
                    </div>
                    <button type="submit" class="btn-primary">Сохранить изменения</button>
                </form>
            `;

            UI.showModal('Редактировать статью', formHTML);

            document.getElementById('blogForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                try {
                    const updatedPost = {
                        title: document.getElementById('blogTitle').value,
                        category: document.getElementById('blogCategory').value,
                        excerpt: document.getElementById('blogExcerpt').value,
                        content: document.getElementById('blogContent').value
                    };
                    await API.updateBlogPost(id, updatedPost);
                    UI.hideModal();
                    await this.render();
                    UI.showNotification('Статья обновлена успешно!');
                } catch (error) {
                    UI.showNotification('Ошибка обновления статьи: ' + error.message, 'error');
                }
            });
        } catch (error) {
            UI.showNotification('Ошибка загрузки статьи: ' + error.message, 'error');
        }
    }

    static async delete(id) {
        if (!confirm('Удалить эту статью?')) return;

        try {
            await API.deleteBlogPost(id);
            await this.render();
            await UI.updateStats();
            UI.showNotification('Статья удалена успешно!');
        } catch (error) {
            UI.showNotification('Ошибка удаления статьи: ' + error.message, 'error');
        }
    }
}

// ===== GALLERY MANAGER =====
class GalleryManager {
    static async render() {
        const container = document.getElementById('galleryGrid');

        try {
            const response = await API.getGalleryImages();
            const images = response.data;

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
        } catch (error) {
            container.innerHTML = '<p class="empty-state error">Ошибка загрузки галереи</p>';
            console.error('Error rendering gallery:', error);
        }
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
                    <input type="url" id="galleryURL" required placeholder="images/photo.jpg">
                </div>
                <button type="submit" class="btn-primary">Добавить фото</button>
            </form>
        `;

        UI.showModal('Добавить фото', formHTML);

        document.getElementById('galleryForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const image = {
                    title: document.getElementById('galleryTitle').value,
                    url: document.getElementById('galleryURL').value
                };
                await API.addGalleryImage(image);
                UI.hideModal();
                await this.render();
                await UI.updateStats();
                UI.showNotification('Фото добавлено успешно!');
            } catch (error) {
                UI.showNotification('Ошибка добавления фото: ' + error.message, 'error');
            }
        });
    }

    static async delete(id) {
        if (!confirm('Удалить это фото?')) return;

        try {
            await API.deleteGalleryImage(id);
            await this.render();
            await UI.updateStats();
            UI.showNotification('Фото удалено успешно!');
        } catch (error) {
            UI.showNotification('Ошибка удаления фото: ' + error.message, 'error');
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
