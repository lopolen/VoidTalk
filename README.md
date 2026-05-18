# VoidTalk

VoidTalk - навчальна міні-соціальна платформа з FastAPI backend, SQLAlchemy/Alembic базою даних і статичним HTML/CSS/JS frontend.

## Що вже є

- Реєстрація користувача.
- Вхід через cookie-сесію `voidtalk_session`.
- Перевірка поточного користувача через `GET /api/v1/users/me`.
- Пошук користувача за username.
- Створення постів авторизованим користувачем.
- MVP-рекомендації постів: релевантність по хештегах із штрафом за популярність.
- CORS для роботи frontend і backend на різних dev-портах.

## Структура проєкту

```text
voidtalk_api/          FastAPI backend
voidtalk_frontend/     Статичний frontend
alembic/               Міграції бази даних
docs/                  Додаткова документація
scripts/setup_dev.sh   Первинне налаштування dev-середовища
```

## Швидкий старт

Запустіть setup-скрипт із кореня репозиторію:

```bash
./scripts/setup_dev.sh
```

Скрипт:

- створить `.venv`, якщо його ще немає;
- встановить Python-пакети з `requirements.txt`;
- створить `voidtalk_api/cfg/database_url.env`, якщо файл відсутній;
- створить `voidtalk_frontend/config.js` із прикладу, якщо файл відсутній;
- застосує міграції Alembic;
- перевірить імпорт FastAPI app.

## Запуск backend

```bash
source .venv/bin/activate
uvicorn voidtalk_api.main:app --reload --host 127.0.0.1 --port 8000
```

API документація FastAPI буде доступна тут:

```text
http://127.0.0.1:8000/docs
```

## Запуск frontend

Frontend є статичним. Його можна відкрити через Live Server або будь-який простий статичний сервер.

Приклад:

```bash
cd voidtalk_frontend
python3 -m http.server 5173
```

Після цього відкрийте:

```text
http://127.0.0.1:5173
```

Важливо: для cookie краще використовувати один і той самий host для frontend і backend. Тобто `127.0.0.1` + `127.0.0.1`, або `localhost` + `localhost`. Не змішуйте `localhost` і `127.0.0.1`.

## Frontend API config

Frontend читає API URL із файлу:

```text
voidtalk_frontend/config.js
```

Приклад:

```js
window.VOIDTALK_CONFIG = {
    API_BASE_URL: "http://127.0.0.1:8000"
};
```

Якщо потрібно змінити backend URL, змініть `API_BASE_URL`. Наприклад:

```js
window.VOIDTALK_CONFIG = {
    API_BASE_URL: "http://localhost:8000"
};
```

Усі frontend-запити мають іти через `apiFetch(...)` з [api.js](voidtalk_frontend/api.js). Цей helper:

- додає `API_BASE_URL`;
- автоматично передає cookie через `credentials: "include"`;
- коректно читає JSON;
- показує зрозумілі помилки, якщо відповідь не JSON.

## Авторизація і сесія

Backend встановлює cookie `voidtalk_session` після успішного login:

```http
POST /api/v1/users/login
```

Frontend не повинен вважати `localStorage` джерелом правди для авторизації. Для перевірки поточної сесії використовується:

```http
GET /api/v1/users/me
```

У frontend це викликається через:

```js
const user = await voidTalkApi.getCurrentSession();
```

Якщо сесія невалідна або cookie немає, backend повертає `401`, а frontend очищає `voidTalkUser` із `localStorage`.

## Основні API endpoints

```text
POST   /api/v1/users/register
POST   /api/v1/users/login
POST   /api/v1/users/logout
GET    /api/v1/users/me
GET    /api/v1/users/search/{username}
POST   /api/v1/posts
GET    /api/v1/posts/recommendations
GET    /api/v1/posts/user/{user_id}
DELETE /api/v1/posts/{post_id}
```

## Рекомендації постів

Endpoint:

```http
GET /api/v1/posts/recommendations?limit=20
```

Рекомендації доступні авторизованому користувачу. MVP-алгоритм:

- витягує хештеги з нових постів і зберігає їх у `hashtags` / `posts_hashtags`;
- будує інтерес користувача з хештегів у лайкнутих і власних постах;
- піднімає релевантні пости, але зменшує score для постів із більшою кількістю лайків;
- додає невеликий exploration-score, щоб нові теми теж могли з'являтися у стрічці.

Налаштування лежать у:

```text
voidtalk_api/cfg/recommendations.env
```

Основні змінні: `RECOMMENDATIONS_LIKED_HASHTAG_WEIGHT`,
`RECOMMENDATIONS_AUTHORED_HASHTAG_WEIGHT`,
`RECOMMENDATIONS_POPULARITY_PENALTY_POWER`,
`RECOMMENDATIONS_FRESHNESS_HALF_LIFE_DAYS`,
`RECOMMENDATIONS_EXPLORATION_SCORE`.

## Типові проблеми

### POST іде на порт frontend

Помилка:

```text
POST http://127.0.0.1:5173/api/v1/users/register
501 Unsupported method ('POST')
```

Причина: запит іде на frontend-сервер, а не на FastAPI.

Рішення: перевірте `voidtalk_frontend/config.js`, backend має бути на `http://127.0.0.1:8000`, а frontend-запити мають використовувати `apiFetch(...)`.

### JSON.parse падає на HTML/plain text

Причина: сервер повернув не JSON, часто це відповідь frontend-сервера або сторінка помилки.

Рішення: використовуйте `voidTalkApi.readJsonResponse(response)` і `voidTalkApi.getApiErrorMessage(response, fallback)`.

### Cookie не відправляється

Перевірте:

- backend має `CORSMiddleware` з `allow_credentials=True`;
- frontend використовує `apiFetch(...)`;
- frontend і backend відкриті на одному host (`127.0.0.1` або `localhost`);
- browser DevTools показує cookie `voidtalk_session`.

## Міграції

Застосувати міграції:

```bash
source .venv/bin/activate
alembic upgrade head
```

Створити нову міграцію після змін у моделях:

```bash
alembic revision --autogenerate -m "describe change"
```

## Рекомендований dev workflow

1. Запустіть `./scripts/setup_dev.sh`.
2. Запустіть backend через `uvicorn`.
3. Запустіть frontend через Live Server або `python3 -m http.server 5173`.
4. Зареєструйте користувача.
5. Перевірте в DevTools, що після login є cookie `voidtalk_session`.
6. Відкрийте профіль або створіть пост: frontend перевірить сесію через `/api/v1/users/me`.

## Наступні покращення

- Додати `GET /api/v1/posts` для повної стрічки.
- Додати backend endpoints для редагування optional profile info.
- Додати автоматичні інтеграційні тести: register -> login -> me -> create post.
- Перенести frontend на Vite і налаштувати dev proxy `/api -> http://127.0.0.1:8000`.
