# Деплой обновления на существующий сервер

## Важно! Ваш новый сайт работает на Node.js

Старый сайт, скорее всего, был статическим (HTML/PHP). Новый сайт требует Node.js сервер.

## Способ 1: Через Git (рекомендуется)

### Подготовка (один раз):

1. **Подключитесь к серверу по SSH:**
   ```bash
   ssh пользователь@pir-planet.ru
   # или
   ssh root@IP_адрес_сервера
   ```

2. **Установите Node.js (если еще нет):**
   ```bash
   # Проверьте версию
   node --version

   # Если нет - установите
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Установите PM2 для автозапуска:**
   ```bash
   npm install -g pm2
   ```

4. **Сделайте резервную копию старого сайта:**
   ```bash
   # Найдите папку старого сайта (обычно /var/www/html или /home/user/public_html)
   sudo cp -r /var/www/html /var/www/html_backup_$(date +%Y%m%d)
   ```

### Деплой через Git:

1. **На вашем компьютере - инициализируйте Git и загрузите на GitHub:**
   ```bash
   cd "c:\Users\User\Documents\ProjectsByMe\the"
   git init
   git add .
   git commit -m "Initial commit: PIR Planet website update"

   # Создайте репозиторий на GitHub.com и выполните:
   git remote add origin https://github.com/ваш-username/pir-planet.git
   git branch -M main
   git push -u origin main
   ```

2. **На сервере - клонируйте репозиторий:**
   ```bash
   # Перейдите в рабочую папку
   cd /var/www

   # Клонируйте проект
   git clone https://github.com/ваш-username/pir-planet.git pir-planet-new

   cd pir-planet-new
   npm install
   ```

3. **Создайте .env файл на сервере:**
   ```bash
   nano .env
   ```

   Вставьте:
   ```env
   PORT=3000
   TELEGRAM_BOT_TOKEN=7782157467:AAEiMm_UiBtyYD_5qOHkUQp5uJl60K_poLU
   TELEGRAM_CHAT_ID=-4667528349
   ```

   Сохраните: `Ctrl+X`, затем `Y`, затем `Enter`

4. **Запустите сайт через PM2:**
   ```bash
   pm2 start server.js --name pir-planet
   pm2 save
   pm2 startup
   ```

5. **Настройте Nginx (если используется):**
   ```bash
   sudo nano /etc/nginx/sites-available/pir-planet.ru
   ```

   Замените содержимое на:
   ```nginx
   server {
       listen 80;
       listen [::]:80;
       server_name pir-planet.ru www.pir-planet.ru;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
   ```

   Перезапустите Nginx:
   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   ```

6. **Если у вас был SSL (HTTPS) - переустановите сертификат:**
   ```bash
   sudo certbot --nginx -d pir-planet.ru -d www.pir-planet.ru
   ```

### Обновление в будущем (через Git):

```bash
# На сервере
cd /var/www/pir-planet-new
git pull
npm install
pm2 restart pir-planet
```

## Способ 2: Через FTP/SFTP (проще, но менее гибко)

Если у вас есть доступ к панели хостинга (cPanel, ISPmanager и т.д.):

1. **Подключитесь через FileZilla или WinSCP:**
   - Host: pir-planet.ru или IP сервера
   - Порт: 22 (SFTP) или 21 (FTP)
   - Логин/пароль от хостинга

2. **Загрузите все файлы проекта** (кроме node_modules и .env)

3. **Через SSH или панель хостинга:**
   ```bash
   cd /путь/к/сайту
   npm install
   ```

4. **Создайте .env файл** через панель или SSH

5. **Запустите через PM2** (как в способе 1)

## Способ 3: Через SCP (быстрая загрузка файлов)

```bash
# На вашем компьютере (PowerShell или Git Bash)
scp -r "c:\Users\User\Documents\ProjectsByMe\the" пользователь@pir-planet.ru:/var/www/pir-planet-new
```

Затем на сервере:
```bash
cd /var/www/pir-planet-new
npm install
# Создайте .env
# Запустите через PM2
```

## Способ 4: Через панель хостинга (если есть Node.js поддержка)

Некоторые хостинги (Beget, Timeweb) имеют встроенную поддержку Node.js:

1. Зайдите в панель управления
2. Найдите раздел "Node.js приложения"
3. Создайте новое приложение
4. Загрузите файлы через файловый менеджер
5. Укажите стартовый файл: `server.js`
6. Добавьте переменные окружения

## Проверка после деплоя

1. **Откройте в браузере:** https://pir-planet.ru
2. **Проверьте все страницы:**
   - Главная
   - Каталог
   - Галерея
   - Контакты
3. **Отправьте тестовую заявку** через форму
4. **Проверьте Telegram** - должно прийти сообщение

## Откат к старой версии (если что-то пошло не так)

```bash
# Остановите новый сайт
pm2 stop pir-planet
pm2 delete pir-planet

# Верните старую конфигурацию Nginx
sudo systemctl restart nginx

# Восстановите старые файлы
sudo rm -rf /var/www/html
sudo cp -r /var/www/html_backup_ДАТА /var/www/html
```

## Мониторинг после запуска

```bash
# Проверка логов
pm2 logs pir-planet

# Проверка статуса
pm2 status

# Мониторинг в реальном времени
pm2 monit
```

## Частые проблемы

### Проблема: "Cannot find module"
**Решение:**
```bash
cd /var/www/pir-planet-new
npm install
pm2 restart pir-planet
```

### Проблема: "Port 3000 already in use"
**Решение:**
```bash
# Найдите процесс на порту 3000
sudo lsof -i :3000
# Убейте его
sudo kill -9 PID_процесса
# Или измените PORT в .env на другой (например, 3001)
```

### Проблема: "502 Bad Gateway" в браузере
**Решение:**
```bash
# Проверьте, запущен ли Node.js сервер
pm2 status
# Если нет - запустите
pm2 start server.js --name pir-planet
```

### Проблема: Форма не отправляется
**Решение:**
- Проверьте .env файл на сервере
- Проверьте логи: `pm2 logs pir-planet`
- Убедитесь, что бот активен в Telegram

## Рекомендации

- ✅ Делайте резервные копии перед обновлением
- ✅ Тестируйте на поддомене перед заменой основного сайта
- ✅ Используйте Git для удобного обновления
- ✅ Настройте автоматический перезапуск через PM2
