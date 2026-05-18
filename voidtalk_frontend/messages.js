/*
    messages.js
    Сторінка повідомлень VoidTalk.
    Повна версія:
    - створення повідомлень;
    - лайки;
    - фільтри;
    - пошук;
    - localStorage;
    - підготовка до backend;
    - міні-профіль зверху з даними зі сторінки профілю;
    - logout;
    - Easter egg;
    - літаючі іконки.
*/

/* Elements */

const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const messageCounter = document.getElementById("messageCounter");
const messagesList = document.getElementById("messagesList");
const filterButtons = document.querySelectorAll(".filter-btn");
const messageSearch = document.getElementById("messageSearch");

const logo = document.getElementById("logo");
const logoSound = document.getElementById("logoSound");

const miniProfileName = document.getElementById("miniProfileName");
const miniProfileAvatar = document.getElementById("miniProfileAvatar");
const miniProfileAvatarImg = document.getElementById("miniProfileAvatarImg");
const logoutButton = document.getElementById("logoutButton");

let activeFilter = "all";
let searchQuery = "";

/* Test messages */

const testMessages = [
    {
        id: 1,
        username: "mykhailo",
        avatar: "M",
        time: "2 хв тому",
        text: "Сьогодні доробляю frontend для VoidTalk. Головна мета — зробити просту, але зрозумілу стрічку повідомлень.",
        likes: 24,
        comments: 8,
        tag: "frontend",
        liked: false
    },
    {
        id: 2,
        username: "admin",
        avatar: "A",
        time: "10 хв тому",
        text: "Backend уже має базову структуру: реєстрація, вхід, сесії та створення постів через API.",
        likes: 31,
        comments: 5,
        tag: "backend",
        liked: false
    },
    {
        id: 3,
        username: "nikita",
        avatar: "N",
        time: "18 хв тому",
        text: "Для збереження постів використовується база даних. Frontend має відправляти JSON на backend, а не працювати з базою напряму.",
        likes: 16,
        comments: 3,
        tag: "backend",
        liked: false
    },
    {
        id: 4,
        username: "roman",
        avatar: "R",
        time: "24 хв тому",
        text: "Було б зручно додати хештеги, щоб користувачі могли швидко переходити до потрібних тем.",
        likes: 19,
        comments: 4,
        tag: "random",
        liked: false
    },
    {
        id: 5,
        username: "frontend_dev",
        avatar: "F",
        time: "35 хв тому",
        text: "Дизайн сторінки не потрібно змінювати повністю. Достатньо використати вже готові картки, кнопки та анімації сайту.",
        likes: 27,
        comments: 6,
        tag: "frontend",
        liked: false
    },
    {
        id: 6,
        username: "void_user",
        avatar: "V",
        time: "41 хв тому",
        text: "VoidTalk виглядає як мінімальна соціальна платформа: повідомлення, профіль, теми та простий обмін думками.",
        likes: 12,
        comments: 2,
        tag: "random",
        liked: false
    }
];

let messages = [...testMessages];

/* Render messages */

function renderMessages() {
    if (!messagesList) {
        return;
    }

    messagesList.innerHTML = "";

    const normalizedSearch = searchQuery.trim().toLowerCase().replace("#", "");

    const filteredMessages = messages.filter(function(message) {
        const matchesFilter = activeFilter === "all" || message.tag === activeFilter;

        const matchesSearch =
            !normalizedSearch ||
            message.text.toLowerCase().includes(normalizedSearch) ||
            message.username.toLowerCase().includes(normalizedSearch) ||
            message.tag.toLowerCase().includes(normalizedSearch);

        return matchesFilter && matchesSearch;
    });

    if (filteredMessages.length === 0) {
        messagesList.innerHTML = `
            <div class="empty-messages">
                <h3>Повідомлень не знайдено</h3>
                <p>Спробуйте змінити пошук або обрати інший тег.</p>
            </div>
        `;
        return;
    }

    filteredMessages.forEach(function(message) {
        const messageCard = document.createElement("article");
        const isLiked = Boolean(message.liked);

        messageCard.className = "post-card message-card";

        messageCard.innerHTML = `
            <div class="post-top">
                <div class="avatar">${escapeHtml(message.avatar)}</div>

                <div>
                    <h3>@${escapeHtml(message.username)}</h3>
                    <p>${escapeHtml(message.time)}</p>
                </div>
            </div>

            <p class="post-text">
                ${escapeHtml(message.text)}
            </p>

            <div class="post-bottom message-bottom">
                <button
                    class="like-btn ${isLiked ? "liked" : ""}"
                    type="button"
                    data-id="${message.id}"
                    aria-label="Лайк"
                >
                    ♥ ${message.likes}
                </button>

                <span>💬 ${message.comments}</span>
                <span>#${escapeHtml(message.tag)}</span>
            </div>
        `;

        messagesList.appendChild(messageCard);
    });

    const likeButtons = document.querySelectorAll(".like-btn");

    likeButtons.forEach(function(button) {
        button.addEventListener("click", function() {
            const messageId = Number(button.getAttribute("data-id"));
            toggleLike(messageId);
        });
    });
}

/* Likes */

function toggleLike(messageId) {
    messages = messages.map(function(message) {
        if (message.id !== messageId) {
            return message;
        }

        const liked = !message.liked;

        return {
            ...message,
            liked: liked,
            likes: liked ? message.likes + 1 : Math.max(message.likes - 1, 0)
        };
    });

    saveMessagesToLocalStorage();
    renderMessages();
}

/* Create message */

if (messageInput && messageCounter) {
    messageInput.addEventListener("input", function() {
        messageCounter.textContent = `${messageInput.value.length} / 500`;
    });
}

if (messageForm) {
    messageForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const text = messageInput.value.trim();

        if (!text) {
            alert("Напишіть повідомлення перед публікацією.");
            return;
        }

        const currentUser = await getCurrentUser();

        if (!currentUser) {
            alert("Увійдіть в акаунт, щоб опублікувати повідомлення.");
            window.location.href = "index.html";
            return;
        }

        const newMessage = {
            id: Date.now(),
            username: currentUser.username,
            avatar: currentUser.username.charAt(0).toUpperCase(),
            time: "щойно",
            text: text,
            likes: 0,
            comments: 0,
            tag: detectTag(text),
            liked: false
        };

        try {
            if (typeof apiFetch === "function" && window.voidTalkApi) {
                const response = await apiFetch("/api/v1/posts", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        post_body: text
                    })
                });

                if (response.ok) {
                    const savedPost = await voidTalkApi.readJsonResponse(response);

                    if (savedPost) {
                        newMessage.id = savedPost.id || newMessage.id;
                        newMessage.text = savedPost.post_body || newMessage.text;
                        newMessage.time = "збережено в базі";
                    }

                    console.log("Пост збережено через backend:", savedPost);
                } else {
                    const errorMessage = await voidTalkApi.getApiErrorMessage(
                        response,
                        "Backend не прийняв пост."
                    );

                    console.log(errorMessage, "Показуємо frontend-версію.");
                }
            }
        } catch (error) {
            console.log("Backend недоступний. Працює тестовий frontend-режим:", error);
        }

        messages.unshift(newMessage);

        saveMessagesToLocalStorage();
        renderMessages();

        messageInput.value = "";
        messageCounter.textContent = "0 / 500";
    });
}

/* Filters */

filterButtons.forEach(function(button) {
    button.addEventListener("click", function() {
        filterButtons.forEach(function(item) {
            item.classList.remove("active-filter");
        });

        button.classList.add("active-filter");
        activeFilter = button.getAttribute("data-filter");

        renderMessages();
    });
});

/* Search */

if (messageSearch) {
    messageSearch.addEventListener("input", function() {
        searchQuery = messageSearch.value;
        renderMessages();
    });
}

/* LocalStorage */

function saveMessagesToLocalStorage() {
    localStorage.setItem("voidTalkMessages", JSON.stringify(messages));
}

function loadMessagesFromLocalStorage() {
    const savedMessages = localStorage.getItem("voidTalkMessages");

    if (!savedMessages) {
        return;
    }

    try {
        const parsedMessages = JSON.parse(savedMessages);

        if (Array.isArray(parsedMessages)) {
            messages = parsedMessages;
        }
    } catch (error) {
        console.log("Не вдалося прочитати повідомлення з localStorage:", error);
    }
}

/* Current user */

async function getCurrentUser() {
    try {
        if (window.voidTalkApi && typeof voidTalkApi.getCurrentSession === "function") {
            const sessionUser = await voidTalkApi.getCurrentSession();

            if (sessionUser) {
                return {
                    username: sessionUser.username || "guest"
                };
            }
        }
    } catch (error) {
        console.log("Не вдалося перевірити сесію перед публікацією:", error);
    }

    const savedProfile = localStorage.getItem("voidTalkProfile");

    if (savedProfile) {
        try {
            const profile = JSON.parse(savedProfile);

            if (profile.accountName) {
                return {
                    username: profile.accountName
                };
            }
        } catch (error) {
            console.log("Не вдалося прочитати voidTalkProfile:", error);
        }
    }

    const savedUser = localStorage.getItem("voidTalkUser");

    if (!savedUser) {
        return null;
    }

    try {
        const user = JSON.parse(savedUser);

        return {
            username: user.username || "guest"
        };
    } catch (error) {
        return {
            username: "guest"
        };
    }
}

/* Tags */

function detectTag(text) {
    const lowerText = text.toLowerCase();

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

/* Escape HTML */

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

/* Mini profile in top bar */

const defaultMiniProfile = {
    accountName: "username",
    avatar: "icons/skull.svg",
    avatarColorStart: "#6d28d9",
    avatarColorEnd: "#a855f7"
};

function loadMiniProfileFromStorage() {
    const savedProfile = localStorage.getItem("voidTalkProfile");

    if (!savedProfile) {
        return { ...defaultMiniProfile };
    }

    try {
        const profile = JSON.parse(savedProfile);

        return {
            ...defaultMiniProfile,
            ...profile
        };
    } catch (error) {
        console.log("Не вдалося прочитати профіль для верхньої панелі:", error);
        return { ...defaultMiniProfile };
    }
}

function renderMiniProfileTopBar() {
    if (!miniProfileName || !miniProfileAvatar || !miniProfileAvatarImg) {
        return;
    }

    const profile = loadMiniProfileFromStorage();

    miniProfileName.textContent = profile.accountName
        ? "@" + profile.accountName
        : "@username";

    miniProfileAvatarImg.src = profile.avatar || defaultMiniProfile.avatar;
    miniProfileAvatarImg.alt = "Аватар користувача";

    miniProfileAvatar.style.background = `
        linear-gradient(135deg, ${profile.avatarColorStart}, ${profile.avatarColorEnd})
    `;
}

/* Logout */

if (logoutButton) {
    logoutButton.addEventListener("click", function(event) {
        event.preventDefault();

        localStorage.removeItem("voidTalkUser");

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

loadMessagesFromLocalStorage();
renderMessages();
renderMiniProfileTopBar();

if (floatingIconsContainer) {
    createIconPool();
    requestAnimationFrame(updateIcons);
}