# Deploying VoidTalk to a VPS with PostgreSQL

This guide describes a production-like deployment on an Ubuntu VPS:

- The FastAPI backend runs through `systemd` and listens on `127.0.0.1:8000`.
- PostgreSQL stores application data.
- Nginx serves the static frontend and proxies `/api/` to the backend.
- Alembic applies database migrations.

The examples use the domain `example.com`, the Linux user `voidtalk`, and the directory `/opt/voidtalk`. Replace them with your own values.

## 1. Prepare the Server

Connect to the VPS:

```bash
ssh root@YOUR_SERVER_IP
```

Update packages and install the required dependencies:

```bash
apt update
apt install -y python3 python3-venv python3-pip postgresql postgresql-contrib nginx git
```

Create a dedicated application user:

```bash
adduser --system --group --home /opt/voidtalk voidtalk
mkdir -p /opt/voidtalk
chown -R voidtalk:voidtalk /opt/voidtalk
```

## 2. PostgreSQL

Create a PostgreSQL database and user:

```bash
sudo -u postgres psql
```

In the `psql` console, run:

```sql
CREATE DATABASE voidtalk;
CREATE USER voidtalk WITH ENCRYPTED PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE voidtalk TO voidtalk;
\c voidtalk
GRANT ALL ON SCHEMA public TO voidtalk;
\q
```

The production `DATABASE_URL` for this example is:

```text
postgresql+psycopg2://voidtalk:CHANGE_ME_STRONG_PASSWORD@127.0.0.1:5432/voidtalk
```

If the password contains special characters such as `@`, `/`, `:`, or `#`, URL-encode it.

## 3. Project Code

Clone the repository into `/opt/voidtalk/app`:

```bash
sudo -u voidtalk git clone YOUR_REPOSITORY_URL /opt/voidtalk/app
cd /opt/voidtalk/app
```

If the code was uploaded another way, make sure `voidtalk` owns the files:

```bash
chown -R voidtalk:voidtalk /opt/voidtalk
```

## 4. Configure the Application

Run the helper script with the production `DATABASE_URL`:

```bash
cd /opt/voidtalk/app
sudo -u voidtalk env DATABASE_URL='postgresql+psycopg2://voidtalk:CHANGE_ME_STRONG_PASSWORD@127.0.0.1:5432/voidtalk' ./scripts/setup_vps.sh
```

The script will:

- create `.venv`;
- install dependencies from `requirements.txt`;
- write `voidtalk_api/cfg/database_url.env`;
- create `voidtalk_api/cfg/recommendations.env` if it does not already exist;
- configure `voidtalk_frontend/config.js`;
- run `alembic upgrade head`;
- verify that the FastAPI app can be imported.

By default, the frontend config uses:

```js
window.VOIDTALK_CONFIG = {
    API_BASE_URL: window.location.origin
};
```

This works with the Nginx configuration below, where `/api/` is proxied to the backend on the same domain. If the API should live on a separate domain, pass `API_BASE_URL`:

```bash
sudo -u voidtalk env DATABASE_URL='postgresql+psycopg2://voidtalk:CHANGE_ME_STRONG_PASSWORD@127.0.0.1:5432/voidtalk' API_BASE_URL='https://api.example.com' ./scripts/setup_vps.sh
```

## 5. Backend systemd Service

Create `/etc/systemd/system/voidtalk.service`:

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

Enable and start the service:

```bash
systemctl daemon-reload
systemctl enable --now voidtalk
systemctl status voidtalk
```

Check logs:

```bash
journalctl -u voidtalk -f
```

## 6. Nginx

Create `/etc/nginx/sites-available/voidtalk`:

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

Enable the site and check the configuration:

```bash
ln -s /etc/nginx/sites-available/voidtalk /etc/nginx/sites-enabled/voidtalk
nginx -t
systemctl reload nginx
```

If the default Nginx site gets in the way, disable it:

```bash
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

## 7. HTTPS

When the domain DNS already points to the VPS, install Certbot and issue a certificate:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d example.com -d www.example.com
```

Check automatic renewal:

```bash
certbot renew --dry-run
```

## 8. Updating After a New Release

Typical update flow:

```bash
cd /opt/voidtalk/app
sudo -u voidtalk git pull
sudo -u voidtalk ./scripts/setup_vps.sh
systemctl restart voidtalk
systemctl reload nginx
```

After the first run, `DATABASE_URL` is already written to `voidtalk_api/cfg/database_url.env`, so repeated `setup_vps.sh` runs do not need the password in the command. To run only migrations:

```bash
cd /opt/voidtalk/app
sudo -u voidtalk .venv/bin/python -m alembic upgrade head
systemctl restart voidtalk
```

## 9. Quick Check

Backend directly on the server:

```bash
curl http://127.0.0.1:8000/docs
```

Through Nginx:

```bash
curl -I http://example.com/
curl -I http://example.com/docs
```

Open in a browser:

```text
https://example.com
```

After registration or login, the backend should set the `voidtalk_session` cookie. If the frontend opens but login does not work, check:

- `systemctl status voidtalk`;
- `journalctl -u voidtalk -n 100`;
- whether `DATABASE_URL` is written correctly in `voidtalk_api/cfg/database_url.env`;
- whether `voidtalk_frontend/config.js` points to the same domain or the correct API domain.

## 10. Notes

Do not run Uvicorn with `--reload` on a VPS. That mode is intended for development.

The `voidtalk_api/cfg/database_url.env` file contains the PostgreSQL password, so the helper script sets its permissions to `600`.

After running on a VPS, do not commit modified `voidtalk_api/cfg/database_url.env` or `voidtalk_frontend/config.js`, because they may contain production values.

If the frontend and backend run on the same domain through Nginx `/api/`, CORS does not interfere because the browser treats requests as same-origin. If the API is moved to a separate domain, that origin must be allowed in FastAPI CORS middleware.
