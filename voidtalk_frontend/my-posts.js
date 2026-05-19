const myPostsList = document.getElementById("myPostsList");
const myPostsSummary = document.getElementById("myPostsSummary");
const myPostsStatus = document.getElementById("myPostsStatus");
const logo = document.getElementById("logo");
const logoSound = document.getElementById("logoSound");

let currentUser = null;
let myPosts = [];
let currentUserProfile = {
    avatar: "icons/skull.svg",
    avatarColorStart: "#6d28d9",
    avatarColorEnd: "#a855f7"
};

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

function setStatus(message, type = "info") {
    if (!myPostsStatus) {
        return;
    }

    myPostsStatus.textContent = message;
    myPostsStatus.className = `form-status ${type}`;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatDate(dateString) {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return "нещодавно";
    }

    return date.toLocaleString("uk-UA", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function detectTags(text) {
    const matches = String(text || "").match(/#([a-zа-яіїєґ0-9_-]+)/gi) || [];
    const tags = [];

    matches.forEach(function(match) {
        const tag = match.replace("#", "").toLowerCase();

        if (tag && !tags.includes(tag)) {
            tags.push(tag);
        }
    });

    return tags.length > 0 ? tags : ["random"];
}

function detectUnicodeTags(text) {
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

    detectUnicodeTags(post.post_body).forEach(function(tag) {
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

function getAvatarPathByIconId(iconId) {
    return avatarMap[Number(iconId)] || avatarMap[1];
}

function normalizeOptionalInfo(optionalInfo) {
    return {
        avatar: getAvatarPathByIconId(optionalInfo?.icon_id || 1),
        avatarColorStart: optionalInfo?.first_icon_color || "#6d28d9",
        avatarColorEnd: optionalInfo?.second_icon_color || "#a855f7"
    };
}

function getAvatarStyle(profile) {
    const colorStart = profile?.avatarColorStart || "#6d28d9";
    const colorEnd = profile?.avatarColorEnd || "#a855f7";

    return `background: linear-gradient(135deg, ${escapeHtml(colorStart)}, ${escapeHtml(colorEnd)});`;
}

function renderAvatarImage(profile, username) {
    const avatar = profile?.avatar || "icons/skull.svg";

    return `<img src="${escapeHtml(avatar)}" alt="${escapeHtml("Avatar " + username)}">`;
}

async function loadCurrentUser() {
    if (!window.voidTalkApi || typeof voidTalkApi.getCurrentSession !== "function") {
        return null;
    }

    return voidTalkApi.getCurrentSession();
}

async function loadCurrentUserProfile() {
    try {
        const response = await apiFetch("/api/v1/users/me/optional-info", {
            method: "GET"
        });

        if (response.ok) {
            const optionalInfo = await voidTalkApi.readJsonResponse(response);

            currentUserProfile = normalizeOptionalInfo(optionalInfo);
            localStorage.setItem("voidTalkProfile", JSON.stringify(currentUserProfile));
            return;
        }
    } catch (error) {
        console.log("РќРµ РІРґР°Р»РѕСЃСЏ Р·Р°РІР°РЅС‚Р°Р¶РёС‚Рё Р°РІР°С‚Р°СЂ РєРѕСЂРёСЃС‚СѓРІР°С‡Р°:", error);
    }

    const savedProfile = localStorage.getItem("voidTalkProfile");

    if (!savedProfile) {
        return;
    }

    try {
        const profile = JSON.parse(savedProfile);

        currentUserProfile = {
            avatar: profile.avatar || currentUserProfile.avatar,
            avatarColorStart: profile.avatarColorStart || currentUserProfile.avatarColorStart,
            avatarColorEnd: profile.avatarColorEnd || currentUserProfile.avatarColorEnd
        };
    } catch (error) {
        console.log("РќРµ РІРґР°Р»РѕСЃСЏ РїСЂРѕС‡РёС‚Р°С‚Рё Р»РѕРєР°Р»СЊРЅРёР№ Р°РІР°С‚Р°СЂ:", error);
    }
}

async function loadLikeCount(postId) {
    try {
        const response = await apiFetch(`/api/v1/posts/${postId}/likes/count`, {
            method: "GET"
        });

        if (!response.ok) {
            return 0;
        }

        const data = await voidTalkApi.readJsonResponse(response);
        return data?.likes_count || 0;
    } catch (error) {
        console.log("Не вдалося завантажити кількість лайків:", error);
        return 0;
    }
}

async function loadMyPosts() {
    if (!myPostsList) {
        return;
    }

    try {
        setStatus("Завантажуємо ваші пости...");
        currentUser = await loadCurrentUser();

        if (!currentUser) {
            window.location.href = "index.html";
            return;
        }

        await loadCurrentUserProfile();

        const response = await apiFetch(`/api/v1/posts/user/${currentUser.id}`, {
            method: "GET"
        });

        if (!response.ok) {
            const errorMessage = await voidTalkApi.getApiErrorMessage(
                response,
                "Не вдалося завантажити ваші пости."
            );

            throw new Error(errorMessage);
        }

        const posts = await voidTalkApi.readJsonResponse(response);
        const safePosts = Array.isArray(posts) ? posts : [];

        myPosts = await Promise.all(safePosts.map(async function(post) {
            return {
                id: post.id,
                text: post.post_body || "",
                createdAt: post.created_at,
                tags: normalizePostTags(post),
                likes: await loadLikeCount(post.id)
            };
        }));

        setStatus("");
        renderMyPosts();
    } catch (error) {
        console.log("Не вдалося завантажити власні пости:", error);
        setStatus(error.message || "Не вдалося завантажити власні пости.", "error");
        myPosts = [];
        renderMyPosts();
    }
}

function renderMyPosts() {
    if (!myPostsList) {
        return;
    }

    if (myPostsSummary) {
        const postWord = myPosts.length === 1 ? "пост" : "постів";
        myPostsSummary.textContent = myPosts.length > 0
            ? `У вас ${myPosts.length} ${postWord}. Тут можна переглянути або видалити власні публікації.`
            : "У вас ще немає постів. Створіть перший пост у стрічці.";
    }

    myPostsList.innerHTML = "";

    if (myPosts.length === 0) {
        myPostsList.innerHTML = `
            <div class="empty-messages">
                <h3>Постів поки немає</h3>
                <p>Коли ви щось опублікуєте, пост з'явиться тут.</p>
            </div>
        `;
        return;
    }

    myPosts.forEach(function(post) {
        const card = document.createElement("article");
        const tagsMarkup = post.tags.map(function(tag) {
            return `<span>#${escapeHtml(tag)}</span>`;
        }).join("");

        card.className = "post-card my-post-card";
        card.innerHTML = `
            <div class="post-top">
                <div class="avatar" style="${getAvatarStyle(currentUserProfile)}">
                    ${renderAvatarImage(currentUserProfile, currentUser.username)}
                </div>
                <div>
                    <h3>@${escapeHtml(currentUser.username)}</h3>
                    <p>${escapeHtml(formatDate(post.createdAt))}</p>
                </div>
            </div>

            <p class="post-text">${escapeHtml(post.text)}</p>

            <div class="post-bottom my-post-bottom">
                <span>♥ ${post.likes}</span>
                ${tagsMarkup}
            </div>

            <div class="my-post-actions">
                <button class="secondary-btn delete-post-btn" type="button" data-id="${post.id}">
                    Видалити
                </button>
            </div>
        `;

        myPostsList.appendChild(card);
    });

    connectDeleteButtons();
}

function connectDeleteButtons() {
    const deleteButtons = document.querySelectorAll(".delete-post-btn");

    deleteButtons.forEach(function(button) {
        button.addEventListener("click", async function() {
            const postId = Number(button.getAttribute("data-id"));
            await deletePost(postId, button);
        });
    });
}

async function deletePost(postId, button) {
    const shouldDelete = window.confirm("Видалити цей пост назавжди?");

    if (!shouldDelete) {
        return;
    }

    try {
        button.disabled = true;
        button.textContent = "Видаляємо...";
        setStatus("Видаляємо пост...");

        const response = await apiFetch(`/api/v1/posts/${postId}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            const errorMessage = await voidTalkApi.getApiErrorMessage(
                response,
                "Не вдалося видалити пост."
            );

            throw new Error(errorMessage);
        }

        myPosts = myPosts.filter(function(post) {
            return post.id !== postId;
        });

        setStatus("Пост видалено.", "success");
        renderMyPosts();
    } catch (error) {
        console.log("Не вдалося видалити пост:", error);
        setStatus(error.message || "Не вдалося видалити пост.", "error");
        renderMyPosts();
    }
}

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
            logoSound.currentTime = 0;
            logoSound.play().catch(function(error) {
                console.log("Помилка звуку:", error);
            });
        }
    });
}

loadMyPosts();
