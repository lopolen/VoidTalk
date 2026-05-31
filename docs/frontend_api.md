# Frontend and API: Important Notes

## API_BASE_URL

The static frontend does not read `.env` directly, so the development config lives in:

```text
voidtalk_frontend/config.js
```

Format:

```js
window.VOIDTALK_CONFIG = {
    API_BASE_URL: "http://127.0.0.1:8000"
};
```

JavaScript code should not hard-code the full API URL manually. Use:

```js
apiFetch("/api/v1/users/me", {
    method: "GET"
});
```

`apiFetch` automatically adds `API_BASE_URL` and `credentials: "include"`.

## Message Feed

For `messages.html`, use the full feed endpoint:

```http
GET /api/v1/posts/feed?limit=30
```

It returns the author, optional profile info, hashtags, like count, and `liked_by_current_user`. This is better than relying on local `user_ID` values or local like state in the frontend.

Likes are synchronized directly with the backend:

```http
POST   /api/v1/posts/{post_id}/likes
DELETE /api/v1/posts/{post_id}/likes
```

## Cookie Session

Authorization is stored in the `voidtalk_session` cookie, which the backend sets after login.

The frontend checks the real authorization state through:

```http
GET /api/v1/users/me
```

Do not use `localStorage` as the source of truth for authorization. It can only be used as a display cache for the username.

## Hosts Must Match

For stable cookie behavior, use the same host:

```text
Frontend: http://127.0.0.1:5173
Backend:  http://127.0.0.1:8000
```

or:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:8000
```

Do not mix `localhost` and `127.0.0.1` within the same scenario.

## CORS

The backend uses `CORSMiddleware` with `allow_credentials=True`. Because of this, wildcard `*` cannot be used as the only `allow_origins` value for credentialed requests. Allowed origins must be listed explicitly.

## Common Error

If you see:

```text
POST http://127.0.0.1:5173/api/v1/users/register
501 Unsupported method ('POST')
```

the request went to the frontend server instead of FastAPI. Check `config.js` and make sure the request uses `apiFetch(...)`.
