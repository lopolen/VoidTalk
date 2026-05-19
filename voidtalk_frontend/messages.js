/*
    messages.js
    Сторінка повідомлень VoidTalk.

    Поточна логіка:
    - стрічка завантажується з backend разом з авторами, лайками й профілями;
    - новий пост створюється через backend;
    - сторінка НЕ повинна перезавантажуватись при створенні поста;
    - лайки створюються та видаляються через backend;
    - модалка профілю відкриває дані з backend, а localStorage є тільки fallback.
*/

/* Elements */

const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const messageCounter = document.getElementById("messageCounter");
const messagesList = document.getElementById("messagesList");
const publishMessageButton = document.getElementById("publishMessageButton");
const messageStatus = document.getElementById("messageStatus");
const filterButtons = document.querySelectorAll(".filter-btn");
const feedModeButtons = document.querySelectorAll(".feed-tab");
const messageSearch = document.getElementById("messageSearch");
const messagesTitle = document.getElementById("messagesTitle");
const messagesDescription = document.getElementById("messagesDescription");

const logo = document.getElementById("logo");
const logoSound = document.getElementById("logoSound");

const miniProfileName = document.getElementById("miniProfileName");
const miniProfileAvatar = document.getElementById("miniProfileAvatar");
const miniProfileAvatarImg = document.getElementById("miniProfileAvatarImg");
const miniPostsCount = document.getElementById("miniPostsCount");
const miniLikesCount = document.getElementById("miniLikesCount");
const miniTopicsCount = document.getElementById("miniTopicsCount");
const logoutButton = document.getElementById("logoutButton");

const profileModal = document.getElementById("profileModal");
const profileModalBackdrop = document.getElementById("profileModalBackdrop");
const profileModalClose = document.getElementById("profileModalClose");
const profileModalAvatar = document.getElementById("profileModalAvatar");
const profileModalAvatarImg = document.getElementById("profileModalAvatarImg");
const profileModalName = document.getElementById("profileModalName");
const profileModalDescription = document.getElementById("profileModalDescription");
const profileModalPostsCount = document.getElementById("profileModalPostsCount");
const profileModalLikesCount = document.getElementById("profileModalLikesCount");
const profileModalTopicsCount = document.getElementById("profileModalTopicsCount");

let activeFilter = "all";
let activeMode = "feed";
let searchQuery = "";
let messages = [];
let statsMessages = [];
const profileCache = new Map();
let currentMiniProfileName = "";

applyInitialUrlFilters();

/* Avatar mapping */

const avatarMap = {
    1: "icons/skull.svg",
    2: "icons/react.svg",
    3: "icons/webhook.svg",
    4: "icons/send-alt.svg",
    5: "icons/cube-inside.svg",
    6: "icons/dumbbell-alt.svg",
    7: "icons/buddhism.svg",
    8: "icons/transgender.svg",
    9: "icons/loader-lines.svg",
    10: "icons/virus.svg",
    11: "icons/radiation.svg",
    12: "icons/command.svg"
};

function getAvatarPathByIconId(iconId) {
    return avatarMap[Number(iconId)] || avatarMap[1];
}

function normalizeOptionalInfo(optionalInfo) {
    return {
        accountDescription: optionalInfo?.account_description || "Опис акаунту відсутній.",
        avatar: getAvatarPathByIconId(optionalInfo?.icon_id || 1),
        avatarColorStart: optionalInfo?.first_icon_color || "#6d28d9",
        avatarColorEnd: optionalInfo?.second_icon_color || "#a855f7"
    };
}

function normalizePublicProfile(user) {
    const optionalInfo = normalizeOptionalInfo(user?.optional_info);

    return {
        id: user?.id || null,
        accountName: user?.username || "username",
        accountDescription: optionalInfo.accountDescription,
        avatar: optionalInfo.avatar,
        avatarColorStart: optionalInfo.avatarColorStart,
        avatarColorEnd: optionalInfo.avatarColorEnd
    };
}

function getAvatarStyle(profile) {
    const colorStart = profile?.avatarColorStart || "#6d28d9";
    const colorEnd = profile?.avatarColorEnd || "#a855f7";

    return `background: linear-gradient(135deg, ${escapeHtml(colorStart)}, ${escapeHtml(colorEnd)});`;
}

function renderAvatarImage(profile, altText) {
    const avatar = profile?.avatar || getAvatarPathByIconId(1);

    return `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(altText)}">`;
}

function detectTags(text) {
    const matches = String(text || "").matchAll(/#([\p{L}\p{N}_-]+)/gu);
    const tags = [];

    for (const match of matches) {
        const tag = match[1].toLowerCase();

        if (tag && !tags.includes(tag)) {
            tags.push(tag);
        }
    }

    return tags.length > 0 ? tags : ["random"];
}

function normalizePostTags(post) {
    const tags = [];

    detectTags(post.post_body).forEach(function(tag) {
        if (tag !== "random" && !tags.includes(tag)) {
            tags.push(tag);
        }
    });

    if (Array.isArray(post.hashtags) && post.hashtags.length > 0) {
        post.hashtags.forEach(function(hashtag) {
            const tag = String(hashtag || "").replace(/^#/, "").toLowerCase();

            if (tag && tag !== "random" && !tags.includes(tag)) {
                tags.push(tag);
            }
        });
    }

    return tags.length > 0 ? tags : ["random"];
}

function cacheProfile(profile) {
    if (!profile || !profile.accountName) {
        return;
    }

    profileCache.set(profile.accountName.toLowerCase(), profile);
}

function applyInitialUrlFilters() {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    const tag = params.get("tag");
    const query = params.get("q");

    if (mode === "recommendations") {
        activeMode = "recommendations";
    }

    if (tag) {
        activeFilter = tag.toLowerCase().replace("#", "");
    }

    if (query) {
        searchQuery = query;
    }

    if (messageSearch && searchQuery) {
        messageSearch.value = searchQuery;
    }

    filterButtons.forEach(function(button) {
        const buttonFilter = button.getAttribute("data-filter");
        button.classList.toggle("active-filter", buttonFilter === activeFilter);
    });

    if (![...filterButtons].some(function(button) {
        return button.getAttribute("data-filter") === activeFilter;
    })) {
        const allButton = document.querySelector('.filter-btn[data-filter="all"]');

        if (allButton) {
            allButton.classList.remove("active-filter");
        }
    }

    renderModeTabs();
}

function renderModeTabs() {
    feedModeButtons.forEach(function(button) {
        const buttonMode = button.getAttribute("data-mode");
        const isActive = buttonMode === activeMode;

        button.classList.toggle("active-feed-tab", isActive);
        button.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    if (messagesTitle) {
        messagesTitle.textContent = activeMode === "recommendations"
            ? "Рекомендації для вас"
            : "Усі повідомлення";
    }

    if (messagesDescription) {
        messagesDescription.textContent = activeMode === "recommendations"
            ? "Пости підібрані за хештегами, які ви лайкали або використовували."
            : "Останні пости всіх користувачів.";
    }
}

function setMessageStatus(message, type = "info") {
    if (!messageStatus) {
        return;
    }

    messageStatus.textContent = message;
    messageStatus.className = `form-status ${type}`;
}

function setPublishState(isSubmitting) {
    if (!publishMessageButton) {
        return;
    }

    if (!publishMessageButton.dataset.defaultText) {
        publishMessageButton.dataset.defaultText = publishMessageButton.textContent;
    }

    publishMessageButton.disabled = isSubmitting;
    publishMessageButton.textContent = isSubmitting
        ? "Публікуємо..."
        : publishMessageButton.dataset.defaultText;
}

function getStatsForUsername(username) {
    const normalizedUsername = String(username || "").toLowerCase();
    const sourceMessages = statsMessages.length > 0 ? statsMessages : messages;
    const userMessages = sourceMessages.filter(function(message) {
        return message.username.toLowerCase() === normalizedUsername;
    });
    const topics = new Set(userMessages.map(function(message) {
        return Array.isArray(message.tags) ? message.tags : [message.tag];
    }).flat().filter(Boolean));

    return {
        posts: userMessages.length,
        likes: userMessages.reduce(function(total, message) {
            return total + Number(message.likes || 0);
        }, 0),
        topics: topics.size
    };
}

function renderStats(stats, postsElement, likesElement, topicsElement) {
    if (postsElement) {
        postsElement.textContent = String(stats.posts);
    }

    if (likesElement) {
        likesElement.textContent = String(stats.likes);
    }

    if (topicsElement) {
        topicsElement.textContent = String(stats.topics);
    }
}

function renderMiniProfileStats() {
    if (!currentMiniProfileName) {
        return;
    }

    renderStats(
        getStatsForUsername(currentMiniProfileName),
        miniPostsCount,
        miniLikesCount,
        miniTopicsCount
    );
}

/* Fallback messages */

const testMessages = [
    {
        id: 1,
        userId: 1,
        username: "mykhailo",
        avatar: "M",
        time: "2 хв тому",
        text: "Тестове повідомлення. Backend поки не повернув пости.",
        likes: 0,
        comments: 0,
        tag: "frontend",
        liked: false
    }
];

/* Backend posts */

function normalizeBackendPost(post, options = {}) {
    const authorProfile = normalizePublicProfile(post.author);
    const username = authorProfile.accountName;
    const tags = normalizePostTags(post);

    cacheProfile(authorProfile);

    return {
        id: post.id,
        userId: post.user_id,
        username: username,
        avatar: authorProfile.avatar,
        profile: authorProfile,
        time: formatDate(post.created_at),
        text: post.post_body || "",
        likes: post.likes_count || 0,
        tag: tags[0],
        tags: tags,
        liked: Boolean(post.liked_by_current_user),
        recommendationScore: options.recommendationScore || null
    };
}

async function loadMessagesFromBackend() {
    return activeMode === "recommendations"
        ? loadRecommendationsFromBackend()
        : loadFeedFromBackend();
}

async function loadFeedFromBackend() {
    try {
        if (typeof apiFetch !== "function" || !window.voidTalkApi) {
            console.log("apiFetch недоступний.");
            messages = [...testMessages];
            statsMessages = [...messages];
            renderMessages();
            renderMiniProfileStats();
            return;
        }

        const response = await apiFetch("/api/v1/posts/feed?limit=30", {
            method: "GET"
        });

        console.log("GET POSTS STATUS:", response.status);

        if (!response.ok) {
            const errorMessage = await voidTalkApi.getApiErrorMessage(
                response,
                "Не вдалося завантажити пости."
            );

            console.log(errorMessage);
            messages = [];
            renderMessages();
            renderMiniProfileStats();
            return;
        }

        const backendPosts = await voidTalkApi.readJsonResponse(response);

        console.log("POSTS FROM BACKEND:", backendPosts);

        if (!Array.isArray(backendPosts)) {
            messages = [];
            renderMessages();
            renderMiniProfileStats();
            return;
        }

        messages = backendPosts.map(function(post) {
            return normalizeBackendPost(post);
        });
        statsMessages = [...messages];

        renderMessages();
        renderMiniProfileStats();

    } catch (error) {
        console.log("Не вдалося завантажити пости з backend:", error);
        messages = [];
        renderMessages();
        renderMiniProfileStats();
    }
}

async function loadRecommendationsFromBackend() {
    try {
        if (typeof apiFetch !== "function" || !window.voidTalkApi) {
            messages = [];
            renderMessages();
            return;
        }

        const response = await apiFetch("/api/v1/posts/recommendations?limit=30", {
            method: "GET"
        });

        if (!response.ok) {
            const errorMessage = await voidTalkApi.getApiErrorMessage(
                response,
                "Не вдалося завантажити рекомендації."
            );

            console.log(errorMessage);
            messages = [];
            renderMessages();
            setMessageStatus(errorMessage, "error");
            return;
        }

        const recommendedPosts = await voidTalkApi.readJsonResponse(response);

        if (!Array.isArray(recommendedPosts)) {
            messages = [];
            renderMessages();
            return;
        }

        messages = recommendedPosts.map(function(post) {
            return normalizeBackendPost(post, {
                recommendationScore: post.recommendation_score
            });
        });

        renderMessages();
        renderMiniProfileStats();
    } catch (error) {
        console.log("Не вдалося завантажити рекомендації з backend:", error);
        messages = [];
        renderMessages();
        setMessageStatus("Не вдалося завантажити рекомендації.", "error");
    }
}

/* Render messages */

function renderMessages() {
    if (!messagesList) {
        return;
    }

    messagesList.innerHTML = "";

    const normalizedSearch = searchQuery.trim().toLowerCase().replace("#", "");

    const filteredMessages = messages.filter(function(message) {
        const messageTags = Array.isArray(message.tags) && message.tags.length > 0
            ? message.tags
            : [message.tag || "random"];
        const matchesFilter = activeFilter === "all" || messageTags.includes(activeFilter);

        const matchesSearch =
            !normalizedSearch ||
            message.text.toLowerCase().includes(normalizedSearch) ||
            message.username.toLowerCase().includes(normalizedSearch) ||
            messageTags.some(function(tag) {
                return tag.toLowerCase().includes(normalizedSearch);
            });

        return matchesFilter && matchesSearch;
    });

    if (filteredMessages.length === 0) {
        const hasActiveSearch = Boolean(normalizedSearch || activeFilter !== "all");
        const emptyTitle = activeMode === "recommendations" && !hasActiveSearch
            ? "Рекомендацій поки немає"
            : hasActiveSearch ? "Нічого не знайдено" : "Повідомлень поки немає";
        const emptyText = activeMode === "recommendations" && !hasActiveSearch
            ? "Лайкніть кілька постів або створіть пости з хештегами, щоб система зрозуміла ваші інтереси."
            : hasActiveSearch ? "Спробуйте інший пошук або покажіть усі повідомлення." : "Створіть перше повідомлення.";

        messagesList.innerHTML = `
            <div class="empty-messages">
                <h3>${emptyTitle}</h3>
                <p>${emptyText}</p>
            </div>
        `;
        return;
    }

    filteredMessages.forEach(function(message) {
        const messageCard = document.createElement("article");
        const isLiked = Boolean(message.liked);
        const recommendationBadge = activeMode === "recommendations"
            ? `<span class="recommendation-score">score ${escapeHtml(formatRecommendationScore(message.recommendationScore))}</span>`
            : "";
        const messageTags = Array.isArray(message.tags) && message.tags.length > 0
            ? message.tags
            : [message.tag || "random"];
        const tagsMarkup = messageTags.map(function(tag) {
            return `<span>#${escapeHtml(tag)}</span>`;
        }).join("");

        messageCard.className = "post-card message-card";

        messageCard.innerHTML = `
            <div class="post-top">
                <button
                    class="avatar profile-open-btn"
                    type="button"
                    style="${getAvatarStyle(message.profile)}"
                    data-username="${escapeHtml(message.username)}"
                    aria-label="Відкрити профіль користувача ${escapeHtml(message.username)}"
                >
                    ${renderAvatarImage(message.profile, "Avatar " + message.username)}
                </button>

                <div>
                    <h3
                        class="profile-name-open"
                        data-username="${escapeHtml(message.username)}"
                    >
                        @${escapeHtml(message.username)}
                    </h3>

                    <p>${escapeHtml(message.time)}</p>
                </div>
            </div>

            <p class="post-text">${escapeHtml(message.text)}</p>

            <div class="post-bottom message-bottom">
                <button
                    class="like-btn ${isLiked ? "liked" : ""}"
                    type="button"
                    data-id="${message.id}"
                    aria-label="Лайк"
                >
                    ♥ ${message.likes}
                </button>

                ${tagsMarkup}
                ${recommendationBadge}
            </div>
        `;

        messagesList.appendChild(messageCard);
    });

    connectLikeButtons();
    connectProfileOpenButtons();
}

/* Create message */

if (messageInput && messageCounter) {
    messageInput.addEventListener("input", function() {
        messageCounter.textContent = `${messageInput.value.length} / 500`;

        if (messageStatus && messageStatus.classList.contains("error")) {
            setMessageStatus("");
        }
    });
}

async function createMessage() {
    if (!messageInput) {
        return;
    }

    const text = messageInput.value.trim();

    if (!text) {
        setMessageStatus("Напишіть повідомлення перед публікацією.", "error");
        messageInput.focus();
        return;
    }

    const currentUser = getCurrentUserFromStorage();

    if (!currentUser) {
        setMessageStatus("Увійдіть в акаунт, щоб опублікувати повідомлення.", "error");
        window.location.href = "index.html";
        return;
    }

    try {
        setPublishState(true);
        setMessageStatus("Зберігаємо повідомлення...");

        if (typeof apiFetch !== "function" || !window.voidTalkApi) {
            throw new Error("apiFetch недоступний.");
        }

        const response = await apiFetch("/api/v1/posts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                post_body: text
            })
        });

        console.log("POST STATUS:", response.status);

        const rawText = await response.clone().text();
        console.log("POST RAW RESPONSE:", rawText);

        if (!response.ok) {
            const errorMessage = await voidTalkApi.getApiErrorMessage(
                response,
                "Backend не прийняв пост."
            );

            throw new Error(errorMessage);
        }

        const savedPost = rawText ? JSON.parse(rawText) : null;

        console.log("Пост збережено через backend:", savedPost);

        messageInput.value = "";

        if (messageCounter) {
            messageCounter.textContent = "0 / 500";
        }

        setMessageStatus("Повідомлення опубліковано.", "success");

        if (activeMode === "recommendations") {
            setFeedMode("feed");
        } else {
            await loadMessagesFromBackend();
        }

    } catch (error) {
        console.log("Не вдалося зберегти пост у backend:", error);

        setMessageStatus(
            error.message || "Не вдалося зберегти повідомлення на сервері.",
            "error"
        );
    } finally {
        setPublishState(false);
    }
}

if (messageForm) {
    messageForm.addEventListener("submit", function(event) {
        event.preventDefault();
        createMessage();
    });
}

/* Feed mode tabs */

function setFeedMode(mode) {
    activeMode = mode === "recommendations" ? "recommendations" : "feed";
    renderModeTabs();

    const url = new URL(window.location.href);

    if (activeMode === "feed") {
        url.searchParams.delete("mode");
    } else {
        url.searchParams.set("mode", activeMode);
    }

    window.history.replaceState({}, "", url);
    setMessageStatus("");
    loadMessagesFromBackend();
}

feedModeButtons.forEach(function(button) {
    button.addEventListener("click", function() {
        setFeedMode(button.getAttribute("data-mode"));
    });
});

/* Filters */

filterButtons.forEach(function(button) {
    button.addEventListener("click", function() {
        filterButtons.forEach(function(item) {
            item.classList.remove("active-filter");
        });

        button.classList.add("active-filter");
        activeFilter = button.getAttribute("data-filter");

        const url = new URL(window.location.href);

        if (activeFilter === "all") {
            url.searchParams.delete("tag");
        } else {
            url.searchParams.set("tag", activeFilter);
        }

        window.history.replaceState({}, "", url);
        renderMessages();
    });
});

/* Search */

if (messageSearch) {
    messageSearch.addEventListener("input", function() {
        searchQuery = messageSearch.value;

        const url = new URL(window.location.href);

        if (searchQuery.trim()) {
            url.searchParams.set("q", searchQuery.trim());
        } else {
            url.searchParams.delete("q");
        }

        window.history.replaceState({}, "", url);
        renderMessages();
    });
}

/* Current user */

function getCurrentUserFromStorage() {
    const savedUser = localStorage.getItem("voidTalkUser");

    if (!savedUser) {
        return null;
    }

    try {
        const user = JSON.parse(savedUser);

        return {
            id: user.id,
            username: user.username || "guest",
            email: user.email || ""
        };
    } catch (error) {
        console.log("Не вдалося прочитати voidTalkUser:", error);
        return null;
    }
}

/* Likes */

function connectLikeButtons() {
    const likeButtons = document.querySelectorAll(".like-btn");

    likeButtons.forEach(function(button) {
        button.addEventListener("click", async function() {
            const messageId = Number(button.getAttribute("data-id"));
            await toggleLike(messageId);
        });
    });
}

async function toggleLike(messageId) {
    const message = messages.find(function(item) {
        return item.id === messageId;
    });

    if (!message) {
        return;
    }

    try {
        const response = await apiFetch(`/api/v1/posts/${messageId}/likes`, {
            method: message.liked ? "DELETE" : "POST"
        });

        if (
            !response.ok &&
            !(response.status === 409 && !message.liked) &&
            !(response.status === 404 && message.liked)
        ) {
            const errorMessage = await voidTalkApi.getApiErrorMessage(
                response,
                "Не вдалося оновити лайк."
            );

            throw new Error(errorMessage);
        }

        const wasLiked = message.liked;
        const liked = response.status === 404 ? false : !wasLiked;
        const likesDelta = response.status === 409 || response.status === 404
            ? 0
            : liked ? 1 : -1;

        messages = messages.map(function(item) {
            if (item.id !== messageId) {
                return item;
            }

            return {
                ...item,
                liked: liked,
                likes: Math.max(item.likes + likesDelta, 0)
            };
        });

        renderMessages();
        renderMiniProfileStats();
    } catch (error) {
        console.log("Не вдалося синхронізувати лайк з backend:", error);
        setMessageStatus("Не вдалося оновити лайк. Перевірте авторизацію або backend.", "error");
    }
}

/* Tags */

function detectTag(text) {
    const lowerText = text.toLowerCase();
    const hashtagMatch = lowerText.match(/#([a-zа-яіїєґ0-9_-]+)/i);

    if (hashtagMatch) {
        return hashtagMatch[1];
    }

    if (
        lowerText.includes("#backend") ||
        lowerText.includes("backend") ||
        lowerText.includes("api") ||
        lowerText.includes("база")
    ) {
        return "backend";
    }

    if (
        lowerText.includes("#frontend") ||
        lowerText.includes("frontend") ||
        lowerText.includes("html") ||
        lowerText.includes("css") ||
        lowerText.includes("js")
    ) {
        return "frontend";
    }

    return "random";
}

/* Date */

function formatDate(dateString) {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return "нещодавно";
    }

    return date.toLocaleString("uk-UA", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function formatRecommendationScore(score) {
    const numericScore = Number(score);

    if (!Number.isFinite(numericScore)) {
        return "0.00";
    }

    return numericScore.toFixed(2);
}

/* Escape HTML */

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

/* User profile modal */

function connectProfileOpenButtons() {
    const profileButtons = document.querySelectorAll(".profile-open-btn, .profile-name-open");

    profileButtons.forEach(function(button) {
        button.addEventListener("click", function() {
            const username = button.getAttribute("data-username");

            if (username) {
                openUserProfile(username);
            }
        });
    });
}

async function getUserProfileByUsername(username) {
    const cachedProfile = profileCache.get(username.toLowerCase());

    if (cachedProfile) {
        return cachedProfile;
    }

    try {
        const response = await apiFetch(`/api/v1/users/profiles/${encodeURIComponent(username)}`, {
            method: "GET"
        });

        if (response.ok) {
            const user = await voidTalkApi.readJsonResponse(response);
            const backendProfile = normalizePublicProfile(user);

            cacheProfile(backendProfile);
            return backendProfile;
        }

        console.log(
            await voidTalkApi.getApiErrorMessage(response, "Не вдалося завантажити профіль.")
        );
    } catch (error) {
        console.log("Не вдалося завантажити профіль з backend:", error);
    }

    const currentUser = getCurrentUserFromStorage();

    if (
        currentUser &&
        currentUser.username &&
        currentUser.username.toLowerCase() === username.toLowerCase()
    ) {
        const savedProfile = localStorage.getItem("voidTalkProfile");

        if (savedProfile) {
            try {
                const profile = JSON.parse(savedProfile);

                return {
                    accountName: currentUser.username,
                    accountDescription: profile.accountDescription || "Опис акаунту відсутній.",
                    avatar: profile.avatar || "icons/skull.svg",
                    avatarColorStart: profile.avatarColorStart || "#6d28d9",
                    avatarColorEnd: profile.avatarColorEnd || "#a855f7"
                };
            } catch (error) {
                console.log("Не вдалося прочитати власний профіль:", error);
            }
        }

        return {
            accountName: currentUser.username,
            accountDescription: "Опис акаунту відсутній.",
            avatar: "icons/skull.svg",
            avatarColorStart: "#6d28d9",
            avatarColorEnd: "#a855f7"
        };
    }

    return {
        accountName: username,
        accountDescription: "Опис акаунту відсутній.",
        avatar: "icons/skull.svg",
        avatarColorStart: "#6d28d9",
        avatarColorEnd: "#a855f7"
    };
}

async function openUserProfile(username) {
    if (
        !profileModal ||
        !profileModalAvatar ||
        !profileModalAvatarImg ||
        !profileModalName ||
        !profileModalDescription
    ) {
        return;
    }

    profileModalName.textContent = "@" + username;
    profileModalDescription.textContent = "Завантаження профілю...";
    profileModalAvatarImg.src = "icons/skull.svg";
    profileModalAvatar.style.background = "linear-gradient(135deg, #6d28d9, #a855f7)";
    renderStats(
        getStatsForUsername(username),
        profileModalPostsCount,
        profileModalLikesCount,
        profileModalTopicsCount
    );
    profileModal.classList.add("active");

    const profile = await getUserProfileByUsername(username);

    profileModalName.textContent = "@" + profile.accountName;
    profileModalDescription.textContent = profile.accountDescription || "Опис акаунту відсутній.";

    profileModalAvatarImg.src = profile.avatar;
    profileModalAvatarImg.alt = "Аватар користувача";

    profileModalAvatar.style.background = `
        linear-gradient(135deg, ${profile.avatarColorStart}, ${profile.avatarColorEnd})
    `;

    renderStats(
        getStatsForUsername(profile.accountName),
        profileModalPostsCount,
        profileModalLikesCount,
        profileModalTopicsCount
    );

}

function closeUserProfile() {
    if (!profileModal) {
        return;
    }

    profileModal.classList.remove("active");
}

if (profileModalClose) {
    profileModalClose.addEventListener("click", closeUserProfile);
}

if (profileModalBackdrop) {
    profileModalBackdrop.addEventListener("click", closeUserProfile);
}

document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
        closeUserProfile();
    }
});

/* Mini profile */

const defaultMiniProfile = {
    accountName: "username",
    avatar: "icons/skull.svg",
    avatarColorStart: "#6d28d9",
    avatarColorEnd: "#a855f7"
};

function loadMiniProfileFromStorage() {
    const currentUser = getCurrentUserFromStorage();

    const profile = {
        ...defaultMiniProfile,
        accountName: currentUser ? currentUser.username : "username"
    };

    const savedProfile = localStorage.getItem("voidTalkProfile");

    if (savedProfile) {
        try {
            const parsedProfile = JSON.parse(savedProfile);

            profile.avatar = parsedProfile.avatar || profile.avatar;
            profile.avatarColorStart = parsedProfile.avatarColorStart || profile.avatarColorStart;
            profile.avatarColorEnd = parsedProfile.avatarColorEnd || profile.avatarColorEnd;
        } catch (error) {
            console.log("Не вдалося прочитати профіль для верхньої панелі:", error);
        }
    }

    return profile;
}

async function loadMiniProfileFromBackend() {
    if (!window.voidTalkApi || typeof apiFetch !== "function") {
        return null;
    }

    const user = await voidTalkApi.getCurrentSession();

    if (!user) {
        return null;
    }

    let optionalInfo = null;

    const optionalInfoResponse = await apiFetch("/api/v1/users/me/optional-info", {
        method: "GET"
    });

    if (optionalInfoResponse.ok) {
        optionalInfo = await voidTalkApi.readJsonResponse(optionalInfoResponse);
    }

    localStorage.setItem("voidTalkUser", JSON.stringify(user));

    if (optionalInfo) {
        const optionalProfile = normalizeOptionalInfo(optionalInfo);

        localStorage.setItem("voidTalkProfile", JSON.stringify(optionalProfile));
    }

    return {
        ...defaultMiniProfile,
        ...normalizeOptionalInfo(optionalInfo),
        accountName: user.username || "username"
    };
}

async function renderMiniProfileTopBar() {
    if (!miniProfileName || !miniProfileAvatar || !miniProfileAvatarImg) {
        return;
    }

    let profile = null;

    try {
        profile = await loadMiniProfileFromBackend();
    } catch (error) {
        console.log("Не вдалося завантажити міні-профіль з backend:", error);
    }

    if (!profile) {
        profile = loadMiniProfileFromStorage();
    }

    miniProfileName.textContent = profile.accountName
        ? "@" + profile.accountName
        : "@username";
    currentMiniProfileName = profile.accountName || "";

    miniProfileAvatarImg.src = profile.avatar || defaultMiniProfile.avatar;
    miniProfileAvatarImg.alt = "Аватар користувача";

    miniProfileAvatar.style.background = `
        linear-gradient(135deg, ${profile.avatarColorStart}, ${profile.avatarColorEnd})
    `;
    renderMiniProfileStats();
}

/* Logout */

if (logoutButton) {
    logoutButton.addEventListener("click", async function(event) {
        event.preventDefault();
        event.stopImmediatePropagation();

        try {
            if (typeof apiFetch === "function") {
                await apiFetch("/api/v1/users/logout", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    }
                });
            }
        } catch (error) {
            console.log("Backend logout не спрацював:", error);
        }

        localStorage.removeItem("voidTalkUser");
        localStorage.removeItem("voidTalkProfileNeedsSetup");
        localStorage.removeItem("voidTalkMessages");
        localStorage.removeItem("voidTalkJustLoggedIn");

        sessionStorage.clear();

        window.location.href = "index.html";
    });
}

/* Easter egg */

let logoClickCount = 0;

if (logo && logoSound) {
    logo.addEventListener("click", function(event) {
        event.preventDefault();

        logoClickCount++;

        logo.classList.remove("logo-clicked");
        void logo.offsetWidth;
        logo.classList.add("logo-clicked");

        if (logoClickCount >= 7) {
            logoClickCount = 0;

            logoSound.volume = 1;
            logoSound.currentTime = 0;

            logoSound.play().catch(function(error) {
                console.log("Помилка звуку:", error);
            });
        }
    });
}

/* Background icons */

const floatingIconsContainer = document.getElementById("floatingIcons");

const iconPaths = [
    "icons/skull.svg",
    "icons/react.svg",
    "icons/webhook.svg",
    "icons/send-alt.svg",
    "icons/cube-inside.svg",
    "icons/dumbbell-alt.svg",
    "icons/buddhism.svg",
    "icons/transgender.svg",
    "icons/loader-lines.svg",
    "icons/virus.svg",
    "icons/radiation.svg",
    "icons/command.svg"
];

const settings = {
    poolSize: 32,

    minSize: 28,
    maxSize: 58,

    minLife: 14,
    maxLife: 26,

    minSpeed: 4,
    maxSpeed: 14,

    minOpacity: 0.05,
    maxOpacity: 0.13,

    fadePart: 0.28
};

const icons = [];

function randomNumber(min, max) {
    return Math.random() * (max - min) + min;
}

function randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function resetIcon(icon, firstStart = false) {
    const size = randomNumber(settings.minSize, settings.maxSize);

    icon.element.src = randomItem(iconPaths);
    icon.element.style.width = `${size}px`;
    icon.element.style.height = `${size}px`;

    icon.x = randomNumber(-100, window.innerWidth + 100);
    icon.y = randomNumber(-100, window.innerHeight + 100);

    const angle = randomNumber(0, Math.PI * 2);
    const speed = randomNumber(settings.minSpeed, settings.maxSpeed);

    icon.vx = Math.cos(angle) * speed;
    icon.vy = Math.sin(angle) * speed;

    icon.targetVx = icon.vx;
    icon.targetVy = icon.vy;

    icon.rotation = randomNumber(0, 360);
    icon.rotationSpeed = randomNumber(-4, 4);

    icon.life = firstStart ? randomNumber(0, settings.maxLife) : 0;
    icon.lifeLimit = randomNumber(settings.minLife, settings.maxLife);

    icon.maxOpacity = randomNumber(settings.minOpacity, settings.maxOpacity);

    icon.wave = randomNumber(0, Math.PI * 2);
    icon.waveSpeed = randomNumber(0.25, 0.75);
    icon.wavePower = randomNumber(4, 12);

    icon.scale = randomNumber(0.85, 1.15);
    icon.changeDirectionTimer = randomNumber(3, 7);

    icon.element.style.opacity = "0";
    icon.element.style.transform = `
        translate3d(${icon.x}px, ${icon.y}px, 0)
        rotate(${icon.rotation}deg)
        scale(${icon.scale})
    `;
}

function createIconPool() {
    if (!floatingIconsContainer) {
        return;
    }

    for (let i = 0; i < settings.poolSize; i++) {
        const img = document.createElement("img");

        img.className = "float-icon";
        img.alt = "";
        img.setAttribute("aria-hidden", "true");

        floatingIconsContainer.appendChild(img);

        const icon = {
            element: img,
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            targetVx: 0,
            targetVy: 0,
            rotation: 0,
            rotationSpeed: 0,
            life: 0,
            lifeLimit: 0,
            maxOpacity: 0,
            wave: 0,
            waveSpeed: 0,
            wavePower: 0,
            scale: 1,
            changeDirectionTimer: 0
        };

        resetIcon(icon, true);
        icons.push(icon);
    }
}

let lastTime = performance.now();

function updateIcons(currentTime) {
    const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.04);
    lastTime = currentTime;

    for (let i = 0; i < icons.length; i++) {
        const icon = icons[i];

        icon.life += deltaTime;
        icon.wave += deltaTime * icon.waveSpeed;
        icon.changeDirectionTimer -= deltaTime;

        if (icon.changeDirectionTimer <= 0) {
            const angle = randomNumber(0, Math.PI * 2);
            const speed = randomNumber(settings.minSpeed, settings.maxSpeed);

            icon.targetVx = Math.cos(angle) * speed;
            icon.targetVy = Math.sin(angle) * speed;

            icon.changeDirectionTimer = randomNumber(3, 7);
        }

        icon.vx += (icon.targetVx - icon.vx) * 0.015;
        icon.vy += (icon.targetVy - icon.vy) * 0.015;

        icon.x += icon.vx * deltaTime + Math.sin(icon.wave) * icon.wavePower * deltaTime;
        icon.y += icon.vy * deltaTime + Math.cos(icon.wave) * icon.wavePower * deltaTime;

        icon.rotation += icon.rotationSpeed * deltaTime;

        const progress = icon.life / icon.lifeLimit;
        let opacity = icon.maxOpacity;

        if (progress < settings.fadePart) {
            opacity = icon.maxOpacity * (progress / settings.fadePart);
        } else if (progress > 1 - settings.fadePart) {
            opacity = icon.maxOpacity * ((1 - progress) / settings.fadePart);
        }

        opacity = Math.max(0, Math.min(icon.maxOpacity, opacity));

        icon.element.style.opacity = opacity.toString();

        icon.element.style.transform = `
            translate3d(${icon.x}px, ${icon.y}px, 0)
            rotate(${icon.rotation}deg)
            scale(${icon.scale + Math.sin(icon.wave) * 0.025})
        `;

        if (icon.life >= icon.lifeLimit) {
            resetIcon(icon);
        }
    }

    requestAnimationFrame(updateIcons);
}

/* Initial start */

loadMessagesFromBackend();
renderMiniProfileTopBar();

if (floatingIconsContainer) {
    createIconPool();
    requestAnimationFrame(updateIcons);
}
