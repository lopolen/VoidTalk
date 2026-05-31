# Post Recommendation System

VoidTalk has an MVP recommendation system that ranks posts for an authenticated user based on hashtag interest, post freshness, and a popularity penalty. Recommendations are calculated on demand during the API request; there is no separate table with precomputed results.

## API

Endpoint:

```http
GET /api/v1/posts/recommendations?limit=20
```

The request requires a valid `voidtalk_session` cookie. If `limit` is not provided, `RECOMMENDATIONS_DEFAULT_LIMIT` is used. The value is always constrained to the `1..RECOMMENDATIONS_MAX_LIMIT` range.

The response is a list of `RecommendedPostRead` objects:

```json
[
  {
    "id": 42,
    "user_id": 7,
    "post_body": "I love FastAPI #python #backend",
    "created_at": "2026-05-18T12:00:00Z",
    "likes_count": 3,
    "hashtags": ["backend", "python"],
    "recommendation_score": 0.184321,
    "author": {
      "id": 7,
      "username": "alice",
      "created_at": "2026-05-01T10:00:00Z",
      "optional_info": null
    }
  }
]
```

The `recommendation_score` field is returned for transparency and debugging. The frontend shows it only in recommendation mode.

## Data

Hashtags are extracted when a post is created in `PostService.create_post`. The matching rules are defined in `voidtalk_api/core/hashtags.py`:

- a hashtag starts with `#`;
- the tag name length is from 1 to 64 characters;
- Unicode word characters are supported;
- the name is converted to lowercase;
- duplicates within one post are discarded;
- leading and trailing `_` characters are trimmed.

After a post is created, `HashtagRepository.attach_to_post` creates missing rows in `hashtags` and links the post to tags through `posts_hashtags`.

Main tables:

- `posts` - user posts.
- `posts_users_likes` - likes, which also act as interest signals.
- `hashtags` - unique hashtag names.
- `posts_hashtags` - many-to-many relation between posts and hashtags.

The hashtag schema is added by the Alembic migration `a7d2f4c9b8e1_add_hashtags_for_recommendations.py`.

## Building User Interests

`PostRecommendationService._build_hashtag_affinities` builds a dictionary:

```text
hashtag -> affinity
```

Affinity is made from two signals:

```text
affinity =
  liked_hashtag_count * RECOMMENDATIONS_LIKED_HASHTAG_WEIGHT
  + authored_hashtag_count * RECOMMENDATIONS_AUTHORED_HASHTAG_WEIGHT
```

Where:

- `liked_hashtag_count` is how many times the hashtag appears in posts liked by the user.
- `authored_hashtag_count` is how many times the hashtag appears in the user's own posts.

By default, likes have a larger weight (`3.0`) than authored posts (`1.5`) because a like is a more direct signal of interest in someone else's content.

## Candidate Selection

`PostRecommendationRepository.list_candidates` takes a pool of recent posts:

```text
candidate_pool_size = safe_limit * RECOMMENDATIONS_CANDIDATE_POOL_MULTIPLIER
```

Candidate rules:

- do not show posts already liked by the user;
- do not show the user's own posts when `RECOMMENDATIONS_EXCLUDE_OWN_POSTS=true`;
- sort the initial pool by `created_at desc, id desc`;
- load the author, optional profile info, like count, and hashtags.

The service then calculates a score for each candidate and returns the best `safe_limit` posts.

## Ranking Formula

Final score:

```text
recommendation_score = relevance_score * popularity_score * freshness_score
```

### Relevance

If a candidate has no hashtags:

```text
relevance_score = RECOMMENDATIONS_NO_HASHTAG_SCORE
```

If it has hashtags:

```text
raw_relevance = average(affinity[tag] for tag in candidate_hashtags)
relevance_score = max(raw_relevance, RECOMMENDATIONS_EXPLORATION_SCORE)
```

`RECOMMENDATIONS_EXPLORATION_SCORE` prevents posts with topics new to the user from receiving a zero score. This lets new interests occasionally surface, especially when the post is fresh and not very popular.

### Popularity

```text
popularity_score = 1 / ((likes_count + 1) ** RECOMMENDATIONS_POPULARITY_PENALTY_POWER)
```

This is an intentional popularity penalty. For the VoidTalk MVP, recommendations should help users discover less obvious posts instead of duplicating a global top feed.

### Freshness

```text
freshness_score = 0.5 ** (age_days / RECOMMENDATIONS_FRESHNESS_HALF_LIFE_DAYS)
freshness_score = max(freshness_score, RECOMMENDATIONS_MIN_FRESHNESS_SCORE)
```

If `RECOMMENDATIONS_FRESHNESS_HALF_LIFE_DAYS <= 0`, freshness is `1.0` and does not affect the result.

The minimum freshness score prevents old posts from disappearing completely when they are highly relevant to the user.

## Result Sorting

After scoring, results are sorted descending by:

```text
(recommendation_score, created_at, id)
```

For equal scores, the fresher post comes first, followed by the post with the larger `id`.

## Configuration

Configuration is read from:

```text
voidtalk_api/cfg/recommendations.env
```

If the file or a variable is missing, defaults from `voidtalk_api/core/recommendations_config.py` are used.

| Variable | Default | Meaning |
| --- | ---: | --- |
| `RECOMMENDATIONS_DEFAULT_LIMIT` | `20` | Number of recommendations when `limit` is not provided explicitly. |
| `RECOMMENDATIONS_MAX_LIMIT` | `100` | Upper bound for `limit`. |
| `RECOMMENDATIONS_CANDIDATE_POOL_MULTIPLIER` | `8` | How much larger the candidate pool is than the response. |
| `RECOMMENDATIONS_LIKED_HASHTAG_WEIGHT` | `3.0` | Weight of hashtags from liked posts. |
| `RECOMMENDATIONS_AUTHORED_HASHTAG_WEIGHT` | `1.5` | Weight of hashtags from the user's own posts. |
| `RECOMMENDATIONS_EXPLORATION_SCORE` | `0.2` | Minimum relevance for posts with hashtags. |
| `RECOMMENDATIONS_NO_HASHTAG_SCORE` | `0.05` | Relevance of posts without hashtags. |
| `RECOMMENDATIONS_POPULARITY_PENALTY_POWER` | `1.2` | Strength of the like-count penalty. |
| `RECOMMENDATIONS_FRESHNESS_HALF_LIFE_DAYS` | `21.0` | Half-life period for the freshness score. |
| `RECOMMENDATIONS_MIN_FRESHNESS_SCORE` | `0.25` | Minimum freshness score. |
| `RECOMMENDATIONS_EXCLUDE_OWN_POSTS` | `true` | Whether to exclude the user's own posts from recommendations. |

## Calculation Example

A user liked two posts with `#python` and wrote one post with `#backend`.
With default weights:

```text
affinity["python"] = 2 * 3.0 = 6.0
affinity["backend"] = 1 * 1.5 = 1.5
```

A candidate has hashtags `#python #backend`, 2 likes, and was created today:

```text
relevance_score = (6.0 + 1.5) / 2 = 3.75
popularity_score = 1 / ((2 + 1) ** 1.2) ~= 0.2676
freshness_score = 1.0
recommendation_score ~= 1.0035
```

If another candidate has more likes but the same relevance, its score will be lower because of the popularity penalty.

## MVP Limitations

- There is no pagination or cursor-based loading specifically for recommendations.
- There are no negative signals, such as "hide post" or "not interested".
- Hashtags from old posts are not backfilled automatically if those posts were created before the `hashtags` / `posts_hashtags` tables existed.
- There are no personal embedding models or text analysis beyond hashtags.
- Candidates come from the newest posts, so very old but relevant posts may not enter the initial pool.

## Where to Read the Code

- `voidtalk_api/api/v1/endpoints/posts.py` - `/api/v1/posts/recommendations` endpoint.
- `voidtalk_api/services/recommendations.py` - affinity building, scoring, and final sorting.
- `voidtalk_api/repositories/recommendations.py` - SQL queries for interests and candidates.
- `voidtalk_api/core/recommendations_config.py` - defaults and `.env` loading.
- `voidtalk_api/core/hashtags.py` - hashtag extraction rules.
- `voidtalk_api/repositories/hashtags.py` - hashtag creation and linking to posts.
