# Frontend і API: важливі моменти

## API_BASE_URL

Статичний frontend не читає `.env` напряму, тому dev-конфіг лежить у:

```text
voidtalk_frontend/config.js
```

Формат:

```js
window.VOIDTALK_CONFIG = {
    API_BASE_URL: "http://127.0.0.1:8000"
};
```

У JavaScript не потрібно писати повний URL вручну. Використовуйте:

```js
apiFetch("/api/v1/users/me", {
    method: "GET"
});
```

`apiFetch` сам додасть `API_BASE_URL` і `credentials: "include"`.

## Cookie-сесія

Авторизація тримається на cookie `voidtalk_session`, яку backend виставляє після login.

Frontend перевіряє реальний стан авторизації через:

```http
GET /api/v1/users/me
```

Не використовуйте `localStorage` як джерело правди для авторизації. Його можна використовувати лише як кеш для відображення username.

## Host має збігатися

Для стабільної роботи cookie використовуйте один host:

```text
Frontend: http://127.0.0.1:5173
Backend:  http://127.0.0.1:8000
```

або:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:8000
```

Не змішуйте `localhost` і `127.0.0.1` в одному сценарії.

## CORS

Backend має `CORSMiddleware` з `allow_credentials=True`. Через це не можна використовувати wildcard `*` як єдине значення `allow_origins` для credentialed requests. Потрібно явно перелічувати дозволені origins.

## Типова помилка

Якщо бачите:

```text
POST http://127.0.0.1:5173/api/v1/users/register
501 Unsupported method ('POST')
```

це означає, що запит пішов на frontend-сервер, а не на FastAPI. Перевірте `config.js` і використання `apiFetch(...)`.
