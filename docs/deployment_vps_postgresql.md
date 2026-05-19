# Деплой VoidTalk на VPS з PostgreSQL

Ця інструкція описує production-like деплой на Ubuntu VPS:

- FastAPI backend запускається через `systemd` і слухає `127.0.0.1:8000`.
- PostgreSQL зберігає дані застосунку.
- Nginx віддає статичний frontend і прокидує `/api/` на backend.
- Alembic застосовує міграції бази даних.

У прикладах використовується домен `example.com`, користувач Linux `voidtalk` і директорія `/opt/voidtalk`. Замініть їх на свої значення.

## 1. Підготовка сервера

Підключіться до VPS:

```bash
ssh root@YOUR_SERVER_IP
```

Оновіть пакети й встановіть потрібні залежності:

```bash
apt update
apt install -y python3 python3-venv python3-pip postgresql postgresql-contrib nginx git
```

Створіть окремого користувача для застосунку:

```bash
adduser --system --group --home /opt/voidtalk voidtalk
mkdir -p /opt/voidtalk
chown -R voidtalk:voidtalk /opt/voidtalk
```

## 2. PostgreSQL

Створіть базу даних і користувача PostgreSQL:

```bash
sudo -u postgres psql
```

У консолі `psql` виконайте:

```sql
CREATE DATABASE voidtalk;
CREATE USER voidtalk WITH ENCRYPTED PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE voidtalk TO voidtalk;
\c voidtalk
GRANT ALL ON SCHEMA public TO voidtalk;
\q
```

Production `DATABASE_URL` для цього прикладу:

```text
postgresql+psycopg2://voidtalk:CHANGE_ME_STRONG_PASSWORD@127.0.0.1:5432/voidtalk
```

Якщо пароль містить спецсимволи на кшталт `@`, `/`, `:` або `#`, закодуйте його для URL.

## 3. Код проєкту

Склонуйте репозиторій у `/opt/voidtalk/app`:

```bash
sudo -u voidtalk git clone YOUR_REPOSITORY_URL /opt/voidtalk/app
cd /opt/voidtalk/app
```

Якщо код уже завантажений іншим способом, важливо, щоб власником файлів був користувач `voidtalk`:

```bash
chown -R voidtalk:voidtalk /opt/voidtalk
```

## 4. Налаштування застосунку

Запустіть helper-скрипт з production `DATABASE_URL`:

```bash
cd /opt/voidtalk/app
sudo -u voidtalk env DATABASE_URL='postgresql+psycopg2://voidtalk:CHANGE_ME_STRONG_PASSWORD@127.0.0.1:5432/voidtalk' ./scripts/setup_vps.sh
```

Скрипт зробить такі речі:

- створить `.venv`;
- встановить залежності з `requirements.txt`;
- запише `voidtalk_api/cfg/database_url.env`;
- створить `voidtalk_api/cfg/recommendations.env`, якщо його ще немає;
- налаштує `voidtalk_frontend/config.js`;
- виконає `alembic upgrade head`;
- перевірить, що FastAPI app імпортується.

За замовчуванням frontend config використовує:

```js
window.VOIDTALK_CONFIG = {
    API_BASE_URL: window.location.origin
};
```

Це підходить для Nginx-конфігурації нижче, де `/api/` прокидується на backend на тому самому домені. Якщо API має бути на окремому домені, передайте `API_BASE_URL`:

```bash
sudo -u voidtalk env DATABASE_URL='postgresql+psycopg2://voidtalk:CHANGE_ME_STRONG_PASSWORD@127.0.0.1:5432/voidtalk' API_BASE_URL='https://api.example.com' ./scripts/setup_vps.sh
```

## 5. systemd service для backend

Створіть файл `/etc/systemd/system/voidtalk.service`:

```ini
[Unit]
Description=VoidTalk FastAPI backend
After=network.target postgresql.service

[Service]
User=voidtalk
Group=voidtalk
WorkingDirectory=/opt/voidtalk/app
Environment=PYTHONUNBUFFERED=1
ExecStart=/opt/voidtalk/app/.venv/bin/uvicorn voidtalk_api.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Увімкніть і запустіть сервіс:

```bash
systemctl daemon-reload
systemctl enable --now voidtalk
systemctl status voidtalk
```

Перевірити логи:

```bash
journalctl -u voidtalk -f
```

## 6. Nginx

Створіть файл `/etc/nginx/sites-available/voidtalk`:

```nginx
server {
    listen 80;
    server_name example.com www.example.com;

    root /opt/voidtalk/app/voidtalk_frontend;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /docs {
        proxy_pass http://127.0.0.1:8000/docs;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /openapi.json {
        proxy_pass http://127.0.0.1:8000/openapi.json;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Увімкніть сайт і перевірте конфігурацію:

```bash
ln -s /etc/nginx/sites-available/voidtalk /etc/nginx/sites-enabled/voidtalk
nginx -t
systemctl reload nginx
```

Якщо дефолтний сайт Nginx заважає, вимкніть його:

```bash
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

## 7. HTTPS

Коли DNS домену вже вказує на VPS, встановіть Certbot і випустіть сертифікат:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d example.com -d www.example.com
```

Перевірте автопоновлення:

```bash
certbot renew --dry-run
```

## 8. Оновлення після нового релізу

Типовий порядок оновлення:

```bash
cd /opt/voidtalk/app
sudo -u voidtalk git pull
sudo -u voidtalk ./scripts/setup_vps.sh
systemctl restart voidtalk
systemctl reload nginx
```

Після першого запуску `DATABASE_URL` уже записаний у `voidtalk_api/cfg/database_url.env`, тому повторний запуск `setup_vps.sh` не потребує пароля в команді. Якщо треба виконати тільки міграції:

```bash
cd /opt/voidtalk/app
sudo -u voidtalk .venv/bin/python -m alembic upgrade head
systemctl restart voidtalk
```

## 9. Швидка перевірка

Backend напряму на сервері:

```bash
curl http://127.0.0.1:8000/docs
```

Через Nginx:

```bash
curl -I http://example.com/
curl -I http://example.com/docs
```

У браузері відкрийте:

```text
https://example.com
```

Після реєстрації або входу backend має встановити cookie `voidtalk_session`. Якщо frontend відкривається, але login не працює, перевірте:

- `systemctl status voidtalk`;
- `journalctl -u voidtalk -n 100`;
- чи правильно записаний `DATABASE_URL` у `voidtalk_api/cfg/database_url.env`;
- чи `voidtalk_frontend/config.js` вказує на той самий домен або коректний API-домен.

## 10. Нотатки

Не запускайте Uvicorn з `--reload` на VPS. Цей режим призначений для розробки.

Файл `voidtalk_api/cfg/database_url.env` містить пароль до PostgreSQL, тому helper-скрипт виставляє на нього права `600`.

Після запуску на VPS не комітьте змінений `voidtalk_api/cfg/database_url.env` або `voidtalk_frontend/config.js`, бо там можуть бути production-значення.

Якщо frontend і backend працюють на одному домені через Nginx `/api/`, CORS не заважає, бо браузер бачить запити як same-origin. Якщо винести API на окремий домен, треба буде дозволити цей origin у FastAPI CORS middleware.
