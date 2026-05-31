# Post Anti-Spam

The anti-spam system is applied only when creating a post:

```http
POST /api/v1/posts
```

All limits are tied to `current_user.id`. The system does not use IP addresses, device fingerprints, cookies beyond the normal auth session, or attempts to determine how many accounts belong to one real person.

## Rules

- Minimum post length after `trim`: 3 characters.
- Maximum post length after `trim`: 1000 characters.
- Cooldown: 30 seconds between posts from the same user.
- No more than 10 posts during the last 10 minutes for one user.
- No more than 50 posts during the last 24 hours for one user.
- A post is rejected if it contains too many percent-encoded `%xx` sequences, such as `%D0`, `%AF`, or `%20`.

The `%xx` filter currently uses a simple threshold: at least 8 such sequences and more than 20% of the text occupied by encoded sequences. This allows normal URLs or isolated encoded characters while blocking text where a large part of the message looks like an encoded payload.

## HTTP Responses

Text format violations are returned as validation errors or `400`:

```json
{
  "detail": "Post contains too many percent-encoded characters."
}
```

Cooldown or volume-limit violations are returned as `429 Too Many Requests`. When the backend can calculate a short wait before the next attempt, it adds this header:

```http
Retry-After: 17
```

Response body:

```json
{
  "detail": "Please wait before publishing another post."
}
```

## Where It Is Configured

The main parameters are defined in:

```text
voidtalk_api/core/antispam.py
```

The check is called from:

```text
voidtalk_api/services/posts.py
```

Counters are read from the `posts` table by `user_id` and `created_at`, so a separate anti-spam table is not needed.
