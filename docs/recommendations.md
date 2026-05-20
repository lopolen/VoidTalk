# Система рекомендацій постів

VoidTalk має MVP-систему рекомендацій, яка ранжує пости для авторизованого
користувача за його інтересом до хештегів, свіжістю поста і штрафом за
популярність. Рекомендації рахуються на льоту під час запиту до API; окрема
таблиця з готовими результатами не використовується.

## API

Endpoint:

```http
GET /api/v1/posts/recommendations?limit=20
```

Запит вимагає валідну cookie-сесію `voidtalk_session`. Якщо `limit` не
передано, використовується `RECOMMENDATIONS_DEFAULT_LIMIT`. Значення завжди
обмежується діапазоном `1..RECOMMENDATIONS_MAX_LIMIT`.

Відповідь є списком `RecommendedPostRead`:

```json
[
  {
    "id": 42,
    "user_id": 7,
    "post_body": "Люблю FastAPI #python #backend",
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

Поле `recommendation_score` повертається для прозорості й debugging. Frontend
показує його тільки у режимі рекомендацій.

## Дані

Хештеги витягуються під час створення поста в `PostService.create_post`.
Правило пошуку визначене у `voidtalk_api/core/hashtags.py`:

- хештег починається з `#`;
- довжина назви від 1 до 64 символів;
- підтримуються Unicode word-символи;
- назва приводиться до lowercase;
- дублікати в межах одного поста відкидаються;
- крайні `_` обрізаються.

Після створення поста `HashtagRepository.attach_to_post` створює відсутні
рядки в `hashtags` і зв'язує пост із тегами через `posts_hashtags`.

Основні таблиці:

- `posts` - пости користувачів.
- `posts_users_likes` - лайки, які також є сигналом інтересів.
- `hashtags` - унікальні назви хештегів.
- `posts_hashtags` - many-to-many зв'язок постів і хештегів.

Схему для хештегів додає Alembic-міграція
`a7d2f4c9b8e1_add_hashtags_for_recommendations.py`.

## Побудова інтересів користувача

`PostRecommendationService._build_hashtag_affinities` збирає словник:

```text
hashtag -> affinity
```

Affinity складається з двох сигналів:

```text
affinity =
  liked_hashtag_count * RECOMMENDATIONS_LIKED_HASHTAG_WEIGHT
  + authored_hashtag_count * RECOMMENDATIONS_AUTHORED_HASHTAG_WEIGHT
```

Де:

- `liked_hashtag_count` - скільки разів цей хештег трапляється в постах,
  які користувач лайкнув.
- `authored_hashtag_count` - скільки разів цей хештег трапляється у власних
  постах користувача.

За замовчуванням лайки мають більшу вагу (`3.0`), ніж власні пости (`1.5`),
бо лайк є прямішим сигналом інтересу до чужого контенту.

## Вибір кандидатів

`PostRecommendationRepository.list_candidates` бере пул найновіших постів:

```text
candidate_pool_size = safe_limit * RECOMMENDATIONS_CANDIDATE_POOL_MULTIPLIER
```

Для кандидатів діють правила:

- не показувати пости, які користувач уже лайкнув;
- не показувати власні пости, якщо `RECOMMENDATIONS_EXCLUDE_OWN_POSTS=true`;
- сортувати початковий пул за `created_at desc, id desc`;
- підтягувати автора, optional profile info, кількість лайків і хештеги.

Після цього сервіс рахує score для кожного кандидата і повертає найкращі
`safe_limit` постів.

## Формула ранжування

Фінальний score:

```text
recommendation_score = relevance_score * popularity_score * freshness_score
```

### Relevance

Якщо в кандидата немає хештегів:

```text
relevance_score = RECOMMENDATIONS_NO_HASHTAG_SCORE
```

Якщо хештеги є:

```text
raw_relevance = average(affinity[tag] for tag in candidate_hashtags)
relevance_score = max(raw_relevance, RECOMMENDATIONS_EXPLORATION_SCORE)
```

`RECOMMENDATIONS_EXPLORATION_SCORE` не дає постам з новими для користувача
темами отримувати нульовий score. Це дозволяє іноді піднімати нові інтереси,
особливо коли пост свіжий і не дуже популярний.

### Popularity

```text
popularity_score = 1 / ((likes_count + 1) ** RECOMMENDATIONS_POPULARITY_PENALTY_POWER)
```

Це навмисний штраф за популярність. Для VoidTalk MVP рекомендації мають
допомагати знаходити менш очевидні пости, а не дублювати глобальний топ.

### Freshness

```text
freshness_score = 0.5 ** (age_days / RECOMMENDATIONS_FRESHNESS_HALF_LIFE_DAYS)
freshness_score = max(freshness_score, RECOMMENDATIONS_MIN_FRESHNESS_SCORE)
```

Якщо `RECOMMENDATIONS_FRESHNESS_HALF_LIFE_DAYS <= 0`, freshness дорівнює `1.0`
і не впливає на результат.

Мінімальний freshness-score не дає старим постам повністю зникнути, якщо вони
дуже релевантні користувачу.

## Сортування результатів

Після розрахунку результати сортуються за спаданням:

```text
(recommendation_score, created_at, id)
```

Тобто при однаковому score вище буде свіжіший пост, а потім пост із більшим
`id`.

## Конфігурація

Конфіг читається з:

```text
voidtalk_api/cfg/recommendations.env
```

Якщо файл або змінна відсутні, застосовуються дефолти з
`voidtalk_api/core/recommendations_config.py`.

| Змінна | Дефолт | Значення |
| --- | ---: | --- |
| `RECOMMENDATIONS_DEFAULT_LIMIT` | `20` | Кількість рекомендацій без явного `limit`. |
| `RECOMMENDATIONS_MAX_LIMIT` | `100` | Верхня межа для `limit`. |
| `RECOMMENDATIONS_CANDIDATE_POOL_MULTIPLIER` | `8` | Наскільки більший пул кандидатів за відповідь. |
| `RECOMMENDATIONS_LIKED_HASHTAG_WEIGHT` | `3.0` | Вага хештегів із лайкнутих постів. |
| `RECOMMENDATIONS_AUTHORED_HASHTAG_WEIGHT` | `1.5` | Вага хештегів із власних постів. |
| `RECOMMENDATIONS_EXPLORATION_SCORE` | `0.2` | Мінімальна релевантність для постів з хештегами. |
| `RECOMMENDATIONS_NO_HASHTAG_SCORE` | `0.05` | Релевантність постів без хештегів. |
| `RECOMMENDATIONS_POPULARITY_PENALTY_POWER` | `1.2` | Сила штрафу за лайки. |
| `RECOMMENDATIONS_FRESHNESS_HALF_LIFE_DAYS` | `21.0` | Період напівзгасання freshness-score. |
| `RECOMMENDATIONS_MIN_FRESHNESS_SCORE` | `0.25` | Мінімальний freshness-score. |
| `RECOMMENDATIONS_EXCLUDE_OWN_POSTS` | `true` | Чи виключати власні пости з рекомендацій. |

## Приклад розрахунку

Користувач лайкнув два пости з `#python` і написав один пост з `#backend`.
За дефолтних ваг:

```text
affinity["python"] = 2 * 3.0 = 6.0
affinity["backend"] = 1 * 1.5 = 1.5
```

Кандидат має хештеги `#python #backend`, 2 лайки і створений сьогодні:

```text
relevance_score = (6.0 + 1.5) / 2 = 3.75
popularity_score = 1 / ((2 + 1) ** 1.2) ~= 0.2676
freshness_score = 1.0
recommendation_score ~= 1.0035
```

Якщо інший кандидат має більше лайків, але таку саму релевантність, його
score буде нижчим через popularity penalty.

## Обмеження MVP

- Немає пагінації або cursor-based догрузки саме для рекомендацій.
- Немає негативних сигналів, наприклад "приховати пост" або "не цікаво".
- Хештеги старих постів не backfill-яться автоматично, якщо вони були
  створені до появи таблиць `hashtags` / `posts_hashtags`.
- Немає персональних embedding-моделей або аналізу тексту поза хештегами.
- Кандидати беруться з найновіших постів, тому дуже старі релевантні пости
  можуть не потрапити в початковий пул.

## Де дивитися код

- `voidtalk_api/api/v1/endpoints/posts.py` - endpoint
  `/api/v1/posts/recommendations`.
- `voidtalk_api/services/recommendations.py` - побудова affinity, score і
  фінальне сортування.
- `voidtalk_api/repositories/recommendations.py` - SQL-запити для інтересів і
  кандидатів.
- `voidtalk_api/core/recommendations_config.py` - дефолти та читання `.env`.
- `voidtalk_api/core/hashtags.py` - правила витягування хештегів.
- `voidtalk_api/repositories/hashtags.py` - створення і прив'язка хештегів до
  постів.
