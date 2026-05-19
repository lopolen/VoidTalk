/*
    profile.js
    Сторінка профілю користувача.

    Логіка:
    - нікнейм береться тільки з backend / voidTalkUser;
    - локальний нікнейм більше не використовується;
    - опис, кольори і аватарка зберігаються через /api/v1/users/me/optional-info;
    - localStorage використовується тільки як запасний варіант для відображення.
*/

/* Easter egg */

const logo = document.getElementById("logo");
const logoSound = document.getElementById("logoSound");

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

/* Profile elements */

const profileForm = document.getElementById("profileForm");

const accountNameInput = document.getElementById("accountName");
const accountDescriptionInput = document.getElementById("accountDescription");

const avatarColorStartInput = document.getElementById("avatarColorStart");
const avatarColorEndInput = document.getElementById("avatarColorEnd");
const avatarInput = document.getElementById("avatarInput");

const profileNamePreview = document.getElementById("profileNamePreview");
const profileDescriptionPreview = document.getElementById("profileDescriptionPreview");
const profileAvatar = document.getElementById("profileAvatar");
const avatarBackground = document.getElementById("avatarBackground");
const profilePostsCount = document.getElementById("profilePostsCount");
const profileLikesCount = document.getElementById("profileLikesCount");
const profileTopicsCount = document.getElementById("profileTopicsCount");
const profileStatus = document.getElementById("profileStatus");

const avatarButtons = document.querySelectorAll(".avatar-option");
const resetProfileButton = document.getElementById("resetProfile");
const profileLogoutButton = document.getElementById("profileLogoutButton");
const profilePreviewCard = document.querySelector(".profile-preview-card");

if (profilePreviewCard && profileLogoutButton) {
    profilePreviewCard.appendChild(profileLogoutButton);
}

/* Avatar mapping for backend icon_id */

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

function getIconIdByAvatarPath(avatarPath) {
    const foundEntry = Object.entries(avatarMap).find(function(entry) {
        return entry[1] === avatarPath;
    });

    return foundEntry ? Number(foundEntry[0]) : 1;
}

function getAvatarPathByIconId(iconId) {
    return avatarMap[Number(iconId)] || avatarMap[1];
}

/* Default profile */

const defaultProfile = {
    accountDescription: "",
    avatar: "icons/skull.svg",
    avatarColorStart: "#6d28d9",
    avatarColorEnd: "#a855f7"
};

let currentProfile = loadProfile();
let serverUser = null;
let backendOptionalInfo = null;
let currentStats = {
    posts: 0,
    likes: 0,
    topics: 0
};

if (accountNameInput) {
    accountNameInput.readOnly = true;
    accountNameInput.title = "Нікнейм береться з акаунта на сервері.";
}

/* Local fallback profile */

function loadProfile() {
    const savedProfile = localStorage.getItem("voidTalkProfile");

    if (!savedProfile) {
        return { ...defaultProfile };
    }

    try {
        const parsedProfile = JSON.parse(savedProfile);

        return {
            ...defaultProfile,
            accountDescription: parsedProfile.accountDescription || "",
            avatar: parsedProfile.avatar || defaultProfile.avatar,
            avatarColorStart: parsedProfile.avatarColorStart || defaultProfile.avatarColorStart,
            avatarColorEnd: parsedProfile.avatarColorEnd || defaultProfile.avatarColorEnd
        };
    } catch (error) {
        console.log("Не вдалося прочитати локальний профіль:", error);
        return { ...defaultProfile };
    }
}

function saveProfile(profile) {
    const profileForSave = {
        accountDescription: profile.accountDescription || "",
        avatar: profile.avatar || defaultProfile.avatar,
        avatarColorStart: profile.avatarColorStart || defaultProfile.avatarColorStart,
        avatarColorEnd: profile.avatarColorEnd || defaultProfile.avatarColorEnd
    };

    localStorage.setItem("voidTalkProfile", JSON.stringify(profileForSave));
}

function setProfileStatus(message, type = "info") {
    if (!profileStatus) {
        return;
    }

    profileStatus.textContent = message;
    profileStatus.className = `form-status ${type}`;
}

function setProfileFormSubmitting(isSubmitting) {
    if (!profileForm) {
        return;
    }

    const submitButton = profileForm.querySelector('button[type="submit"]');

    if (submitButton) {
        if (!submitButton.dataset.defaultText) {
            submitButton.dataset.defaultText = submitButton.textContent;
        }

        submitButton.disabled = isSubmitting;
        submitButton.textContent = isSubmitting
            ? "Зберігаємо..."
            : submitButton.dataset.defaultText;
    }

    if (resetProfileButton) {
        resetProfileButton.disabled = isSubmitting;
    }
}

function detectTag(text) {
    const lowerText = String(text || "").toLowerCase();
    const hashtagMatch = lowerText.match(/#([a-zа-яіїєґ0-9_-]+)/i);

    if (hashtagMatch) {
        return hashtagMatch[1];
    }

    if (lowerText.includes("backend") || lowerText.includes("api") || lowerText.includes("база")) {
        return "backend";
    }

    if (lowerText.includes("frontend") || lowerText.includes("html") || lowerText.includes("css") || lowerText.includes("js")) {
        return "frontend";
    }

    return "random";
}

function renderProfileStats() {
    if (profilePostsCount) {
        profilePostsCount.textContent = String(currentStats.posts);
    }

    if (profileLikesCount) {
        profileLikesCount.textContent = String(currentStats.likes);
    }

    if (profileTopicsCount) {
        profileTopicsCount.textContent = String(currentStats.topics);
    }
}

/* Server user */

async function loadServerUser() {
    try {
        let user = null;

        if (window.voidTalkApi && typeof voidTalkApi.getCurrentSession === "function") {
            user = await voidTalkApi.getCurrentSession();
        }

        if (!user) {
            const savedUser = localStorage.getItem("voidTalkUser");

            if (savedUser) {
                user = JSON.parse(savedUser);
            }
        }

        if (user) {
            serverUser = user;
            await loadProfileStats();
        }
    } catch (error) {
        console.log("Не вдалося завантажити користувача з backend:", error);

        try {
            const savedUser = localStorage.getItem("voidTalkUser");

            if (savedUser) {
                serverUser = JSON.parse(savedUser);
                await loadProfileStats();
            }
        } catch (localError) {
            console.log("Не вдалося прочитати voidTalkUser:", localError);
        }
    }

    renderProfile();
}

async function loadProfileStats() {
    if (!serverUser || !serverUser.id || typeof apiFetch !== "function" || !window.voidTalkApi) {
        renderProfileStats();
        return;
    }

    try {
        const postsResponse = await apiFetch(`/api/v1/posts/user/${serverUser.id}`, {
            method: "GET"
        });

        let userPosts = [];

        if (postsResponse.ok) {
            userPosts = await voidTalkApi.readJsonResponse(postsResponse);
        }

        const topics = new Set((Array.isArray(userPosts) ? userPosts : []).map(function(post) {
            return detectTag(post.post_body);
        }));

        let likes = 0;

        const feedResponse = await apiFetch("/api/v1/posts/feed?limit=100", {
            method: "GET"
        });

        if (feedResponse.ok) {
            const feedPosts = await voidTalkApi.readJsonResponse(feedResponse);

            if (Array.isArray(feedPosts)) {
                likes = feedPosts
                    .filter(function(post) {
                        return post.user_id === serverUser.id;
                    })
                    .reduce(function(total, post) {
                        return total + Number(post.likes_count || 0);
                    }, 0);
            }
        }

        currentStats = {
            posts: Array.isArray(userPosts) ? userPosts.length : 0,
            likes: likes,
            topics: topics.size
        };

        renderProfileStats();
    } catch (error) {
        console.log("Не вдалося завантажити статистику профілю:", error);
        renderProfileStats();
    }
}

/* Optional info backend */

async function loadOptionalInfoFromBackend() {
    try {
        if (typeof apiFetch !== "function" || !window.voidTalkApi) {
            return;
        }

        const response = await apiFetch("/api/v1/users/me/optional-info", {
            method: "GET"
        });

        if (response.status === 401 || response.status === 404) {
            console.log("Optional-info поки немає або користувач не авторизований.");
            return;
        }

        if (!response.ok) {
            const errorMessage = await voidTalkApi.getApiErrorMessage(
                response,
                "Не вдалося завантажити optional-info."
            );

            console.log(errorMessage);
            return;
        }

        const data = await voidTalkApi.readJsonResponse(response);

        if (!data) {
            return;
        }

        backendOptionalInfo = data;

        currentProfile.accountDescription = data.account_description || "";
        currentProfile.avatarColorStart = data.first_icon_color || defaultProfile.avatarColorStart;
        currentProfile.avatarColorEnd = data.second_icon_color || defaultProfile.avatarColorEnd;
        currentProfile.avatar = getAvatarPathByIconId(data.icon_id || 1);

        saveProfile(currentProfile);
        renderProfile();

    } catch (error) {
        console.log("Не вдалося завантажити optional-info:", error);
    }
}

async function saveOptionalInfoToBackend() {
    const payload = {
        account_description: currentProfile.accountDescription || "",
        first_icon_color: currentProfile.avatarColorStart || defaultProfile.avatarColorStart,
        second_icon_color: currentProfile.avatarColorEnd || defaultProfile.avatarColorEnd,
        icon_id: getIconIdByAvatarPath(currentProfile.avatar)
    };

    const response = await apiFetch("/api/v1/users/me/optional-info", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorMessage = await voidTalkApi.getApiErrorMessage(
            response,
            "Не вдалося зберегти optional-info."
        );

        throw new Error(errorMessage);
    }

    const savedInfo = await voidTalkApi.readJsonResponse(response);

    if (savedInfo) {
        backendOptionalInfo = savedInfo;

        currentProfile.accountDescription = savedInfo.account_description || "";
        currentProfile.avatarColorStart = savedInfo.first_icon_color || defaultProfile.avatarColorStart;
        currentProfile.avatarColorEnd = savedInfo.second_icon_color || defaultProfile.avatarColorEnd;
        currentProfile.avatar = getAvatarPathByIconId(savedInfo.icon_id || 1);
    }

    saveProfile(currentProfile);
    renderProfile();

    return savedInfo;
}

/* Render */

function getServerUsername() {
    if (serverUser && serverUser.username) {
        return serverUser.username;
    }

    const savedUser = localStorage.getItem("voidTalkUser");

    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);

            if (user && user.username) {
                return user.username;
            }
        } catch (error) {
            console.log("Не вдалося прочитати username з voidTalkUser:", error);
        }
    }

    return "username";
}

function renderProfile() {
    const username = getServerUsername();

    if (profileNamePreview) {
        profileNamePreview.textContent = "@" + username;
    }

    if (accountNameInput) {
        accountNameInput.value = username;
    }

    if (profileDescriptionPreview) {
        profileDescriptionPreview.textContent = currentProfile.accountDescription
            ? currentProfile.accountDescription
            : "Короткий опис акаунту буде відображатися тут.";
    }

    if (profileAvatar) {
        profileAvatar.src = currentProfile.avatar;
        profileAvatar.alt = "Аватар користувача";
    }

    if (avatarBackground) {
        avatarBackground.style.background = `
            linear-gradient(135deg, ${currentProfile.avatarColorStart}, ${currentProfile.avatarColorEnd})
        `;
    }

    if (accountDescriptionInput) {
        accountDescriptionInput.value = currentProfile.accountDescription;
    }

    if (avatarColorStartInput) {
        avatarColorStartInput.value = currentProfile.avatarColorStart;
    }

    if (avatarColorEndInput) {
        avatarColorEndInput.value = currentProfile.avatarColorEnd;
    }

    if (avatarInput) {
        avatarInput.value = currentProfile.avatar;
    }

    avatarButtons.forEach(function(button) {
        const buttonAvatar = button.getAttribute("data-avatar");

        if (buttonAvatar === currentProfile.avatar) {
            button.classList.add("active");
        } else {
            button.classList.remove("active");
        }
    });

    renderProfileStats();
}

/* Live updates */

if (accountNameInput) {
    accountNameInput.addEventListener("input", function() {
        accountNameInput.value = getServerUsername();
    });
}

if (accountDescriptionInput) {
    accountDescriptionInput.addEventListener("input", function() {
        currentProfile.accountDescription = accountDescriptionInput.value;

        if (profileDescriptionPreview) {
            profileDescriptionPreview.textContent = currentProfile.accountDescription
                ? currentProfile.accountDescription
                : "Короткий опис акаунту буде відображатися тут.";
        }
    });
}

if (avatarColorStartInput) {
    avatarColorStartInput.addEventListener("input", function() {
        currentProfile.avatarColorStart = avatarColorStartInput.value;
        renderProfile();
    });
}

if (avatarColorEndInput) {
    avatarColorEndInput.addEventListener("input", function() {
        currentProfile.avatarColorEnd = avatarColorEndInput.value;
        renderProfile();
    });
}

avatarButtons.forEach(function(button) {
    button.addEventListener("click", function() {
        const selectedAvatar = button.getAttribute("data-avatar");

        currentProfile.avatar = selectedAvatar;
        renderProfile();
    });
});

/* Save */

if (profileForm) {
    profileForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        saveProfile(currentProfile);

        try {
            setProfileFormSubmitting(true);
            setProfileStatus("Зберігаємо профіль...");
            await saveOptionalInfoToBackend();

            setProfileStatus("Профіль збережено на сервері.", "success");
        } catch (error) {
            console.log("Помилка збереження профілю:", error);

            setProfileStatus(
                "Профіль збережено локально, але не вдалося зберегти на сервері. " +
                "Перевір backend або авторизацію.",
                "error"
            );
        } finally {
            setProfileFormSubmitting(false);
        }
    });
}

/* Reset */

if (resetProfileButton) {
    resetProfileButton.addEventListener("click", async function() {
        currentProfile = { ...defaultProfile };

        localStorage.removeItem("voidTalkProfile");

        renderProfile();

        try {
            setProfileFormSubmitting(true);
            setProfileStatus("Скидаємо профіль...");
            await saveOptionalInfoToBackend();
            setProfileStatus("Профіль скинуто і збережено на сервері.", "success");
        } catch (error) {
            console.log("Помилка скидання профілю на сервері:", error);
            setProfileStatus("Профіль скинуто локально.", "error");
        } finally {
            setProfileFormSubmitting(false);
        }
    });
}

/* Logout */

if (profileLogoutButton) {
    profileLogoutButton.addEventListener("click", async function() {
        profileLogoutButton.disabled = true;
        profileLogoutButton.textContent = "Виходимо...";

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

/* Initial render */

renderProfile();
loadServerUser();
loadOptionalInfoFromBackend();

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

if (floatingIconsContainer) {
    createIconPool();
    requestAnimationFrame(updateIcons);
}
