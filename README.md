# VoidTalk

VoidTalk is a learning-focused mini social platform with a FastAPI backend, a SQLAlchemy/Alembic database layer, and a static HTML/CSS/JS frontend.

## Current Features

- User registration.
- Login through the `voidtalk_session` cookie session.
- Current-user checks through `GET /api/v1/users/me`.
- User search by username.
- Post creation by authenticated users.
- Full post feed for the frontend with authors, profiles, hashtags, and like state.
- Backend-managed post likes.
- MVP post recommendations: hashtag relevance with a popularity penalty.
- Simple post anti-spam system: length checks, cooldowns, and user-based limits.
- CORS setup for running the frontend and backend on different development ports.

## Project Structure

```text
voidtalk_api/          FastAPI backend
voidtalk_frontend/     Static frontend
alembic/               Database migrations
docs/                  Additional documentation
scripts/setup_dev.sh   Initial development environment setup
scripts/setup_dev.bat  Initial development environment setup on Windows
```

## Quick Start

For VPS deployment with PostgreSQL, see:
[docs/deployment_vps_postgresql.md](docs/deployment_vps_postgresql.md).

Post anti-spam rules are described here:
[docs/antispam.md](docs/antispam.md).

The post recommendation system is described here:
[docs/recommendations.md](docs/recommendations.md).

### Linux / macOS

Run the setup script from the repository root:

```bash
./scripts/setup_dev.sh
```

### Windows

Run the setup script from the repository root in `cmd.exe`:

```bat
scripts\setup_dev.bat
```

If Python is not available as `python`, pass a different command through `PYTHON_BIN`. For example:

```bat
set PYTHON_BIN=py -3
scripts\setup_dev.bat
```

The script will:

- create `.venv` if it does not already exist;
- install Python packages from `requirements.txt`;
- create `voidtalk_api/cfg/database_url.env` if the file is missing;
- create `voidtalk_api/cfg/recommendations.env` if the file is missing;
- create `voidtalk_frontend/config.js` from the example if the file is missing;
- apply Alembic migrations;
- verify that the FastAPI app can be imported.

## Running the Backend

Linux / macOS:

```bash
source .venv/bin/activate
uvicorn voidtalk_api.main:app --reload --host 127.0.0.1 --port 8000
```

Windows `cmd.exe`:

```bat
.venv\Scripts\activate.bat
uvicorn voidtalk_api.main:app --reload --host 127.0.0.1 --port 8000
```

FastAPI API documentation will be available at:

```text
http://127.0.0.1:8000/docs
```

## Running the Frontend

The frontend is static. You can open it through Live Server or any simple static file server.

Example:

```bash
cd voidtalk_frontend
python3 -m http.server 5173
```

On Windows:

```bat
cd voidtalk_frontend
python -m http.server 5173
```

Then open:

```text
http://127.0.0.1:5173
```

Important: cookies work best when the frontend and backend use the same host. Use `127.0.0.1` with `127.0.0.1`, or `localhost` with `localhost`. Do not mix `localhost` and `127.0.0.1`.

## Frontend API Config

The frontend reads the API URL from:

```text
voidtalk_frontend/config.js
```

Example:

```js
window.VOIDTALK_CONFIG = {
    API_BASE_URL: "http://127.0.0.1:8000"
};
```

To change the backend URL, update `API_BASE_URL`. For example:

```js
window.VOIDTALK_CONFIG = {
    API_BASE_URL: "http://localhost:8000"
};
```

All frontend requests should go through `apiFetch(...)` from [api.js](voidtalk_frontend/api.js). This helper:

- prefixes requests with `API_BASE_URL`;
- automatically sends cookies through `credentials: "include"`;
- reads JSON correctly;
- shows understandable errors when the response is not JSON.

## Authorization and Sessions

The backend sets the `voidtalk_session` cookie after a successful login:

```http
POST /api/v1/users/login
```

The frontend must not treat `localStorage` as the source of truth for authorization. The current session is checked with:

```http
GET /api/v1/users/me
```

In the frontend, call:

```js
const user = await voidTalkApi.getCurrentSession();
```

If the session is invalid or the cookie is missing, the backend returns `401`, and the frontend clears `voidTalkUser` from `localStorage`.

## Main API Endpoints

```text
POST   /api/v1/users/register
POST   /api/v1/users/login
POST   /api/v1/users/logout
GET    /api/v1/users/me
GET    /api/v1/users/me/optional-info
GET    /api/v1/users/search/{username}
GET    /api/v1/users/profiles/{username}
POST   /api/v1/posts
GET    /api/v1/posts/feed
GET    /api/v1/posts/recommendations
GET    /api/v1/posts/user/{user_id}
POST   /api/v1/posts/{post_id}/likes
DELETE /api/v1/posts/{post_id}/likes
DELETE /api/v1/posts/{post_id}
```

## Frontend Feed

The main messages page uses:

```http
GET /api/v1/posts/feed?limit=30
```

This endpoint returns posts with the author, optional profile info, hashtags, like count, and `liked_by_current_user`, so the frontend does not need to substitute `user_ID` or keep likes only in local state.

## Post Recommendations

Endpoint:

```http
GET /api/v1/posts/recommendations?limit=20
```

Recommendations are available to authenticated users. The MVP algorithm:

- extracts hashtags from new posts and stores them in `hashtags` / `posts_hashtags`;
- builds the user's interests from hashtags in liked and authored posts;
- promotes relevant posts while lowering the score for posts with more likes;
- adds a small exploration score so new topics can still appear in the feed.

Configuration is stored in:

```text
voidtalk_api/cfg/recommendations.env
```

Main variables: `RECOMMENDATIONS_LIKED_HASHTAG_WEIGHT`,
`RECOMMENDATIONS_AUTHORED_HASHTAG_WEIGHT`,
`RECOMMENDATIONS_POPULARITY_PENALTY_POWER`,
`RECOMMENDATIONS_FRESHNESS_HALF_LIFE_DAYS`,
`RECOMMENDATIONS_EXPLORATION_SCORE`.

## Common Issues

### POST Goes to the Frontend Port

Error:

```text
POST http://127.0.0.1:5173/api/v1/users/register
501 Unsupported method ('POST')
```

Cause: the request is going to the frontend server instead of FastAPI.

Fix: check `voidtalk_frontend/config.js`. The backend should be set to `http://127.0.0.1:8000`, and frontend requests should use `apiFetch(...)`.

### JSON.parse Fails on HTML or Plain Text

Cause: the server returned a non-JSON response, often from the frontend server or an error page.

Fix: use `voidTalkApi.readJsonResponse(response)` and `voidTalkApi.getApiErrorMessage(response, fallback)`.

### Cookie Is Not Sent

Check that:

- the backend uses `CORSMiddleware` with `allow_credentials=True`;
- the frontend uses `apiFetch(...)`;
- the frontend and backend are opened on the same host (`127.0.0.1` or `localhost`);
- browser DevTools shows the `voidtalk_session` cookie.

## Migrations

Apply migrations:

Linux / macOS:

```bash
source .venv/bin/activate
alembic upgrade head
```

Windows `cmd.exe`:

```bat
.venv\Scripts\activate.bat
alembic upgrade head
```

Create a new migration after model changes:

```bash
alembic revision --autogenerate -m "describe change"
```

## Recommended Development Workflow

1. Run `./scripts/setup_dev.sh` on Linux/macOS or `scripts\setup_dev.bat` on Windows.
2. Start the backend with `uvicorn`.
3. Start the frontend through Live Server, `python3 -m http.server 5173` on Linux/macOS, or `python -m http.server 5173` on Windows.
4. Register a user.
5. Check in DevTools that the `voidtalk_session` cookie exists after login.
6. Open a profile or create a post: the frontend will verify the session through `/api/v1/users/me`.

## Next Improvements

- Add pagination or cursor-based loading for `/api/v1/posts/feed`.
- Add automated integration tests: register -> login -> me -> create post.
- Move the frontend to Vite and configure a dev proxy from `/api` to `http://127.0.0.1:8000`.
