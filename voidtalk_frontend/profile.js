/*
    profile.js
    Сторінка профілю користувача.
    Дані змінюються в реальному часі.
    Збереження поки через localStorage.
    Для backend підготовлені name-поля у формі.
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

const avatarButtons = document.querySelectorAll(".avatar-option");
const resetProfileButton = document.getElementById("resetProfile");

const defaultProfile = {
    accountName: "username",
    accountDescription: "",
    avatar: "icons/skull.svg",
    avatarColorStart: "#6d28d9",
    avatarColorEnd: "#a855f7"
};

let currentProfile = loadProfile();

function loadProfile() {
    const savedProfile = localStorage.getItem("voidTalkProfile");

    if (!savedProfile) {
        return { ...defaultProfile };
    }

    try {
        const parsedProfile = JSON.parse(savedProfile);

        return {
            ...defaultProfile,
            ...parsedProfile
        };
    } catch (error) {
        return { ...defaultProfile };
    }
}

function saveProfile(profile) {
    localStorage.setItem("voidTalkProfile", JSON.stringify(profile));
}

function renderProfile() {
    profileNamePreview.textContent = currentProfile.accountName
        ? "@" + currentProfile.accountName
        : "@";

    profileDescriptionPreview.textContent = currentProfile.accountDescription
        ? currentProfile.accountDescription
        : "";

    profileAvatar.src = currentProfile.avatar;
    profileAvatar.alt = "Аватар користувача";

    avatarBackground.style.background = `
        linear-gradient(135deg, ${currentProfile.avatarColorStart}, ${currentProfile.avatarColorEnd})
    `;

    accountNameInput.value = currentProfile.accountName;
    accountDescriptionInput.value = currentProfile.accountDescription;

    avatarColorStartInput.value = currentProfile.avatarColorStart;
    avatarColorEndInput.value = currentProfile.avatarColorEnd;

    avatarInput.value = currentProfile.avatar;

    avatarButtons.forEach(function(button) {
        const buttonAvatar = button.getAttribute("data-avatar");

        if (buttonAvatar === currentProfile.avatar) {
            button.classList.add("active");
        } else {
            button.classList.remove("active");
        }
    });
}

/* Live updates */

accountNameInput.addEventListener("input", function() {
    accountNameInput.value = accountNameInput.value.replace(/[^a-zA-Z0-9_.]/g, "");

    currentProfile.accountName = accountNameInput.value;
    renderProfile();
});
accountDescriptionInput.addEventListener("input", function() {
    currentProfile.accountDescription = accountDescriptionInput.value;

    profileDescriptionPreview.textContent = currentProfile.accountDescription
        ? currentProfile.accountDescription
        : "Короткий опис акаунту буде відображатися тут.";
});

avatarColorStartInput.addEventListener("input", function() {
    currentProfile.avatarColorStart = avatarColorStartInput.value;
    renderProfile();
});

avatarColorEndInput.addEventListener("input", function() {
    currentProfile.avatarColorEnd = avatarColorEndInput.value;
    renderProfile();
});

avatarButtons.forEach(function(button) {
    button.addEventListener("click", function() {
        const selectedAvatar = button.getAttribute("data-avatar");

        currentProfile.avatar = selectedAvatar;
        renderProfile();
    });
});

/* Save */

profileForm.addEventListener("submit", function(event) {
    event.preventDefault();

    if (!currentProfile.accountName.trim()) {
        alert("Ви не можете зберегти профіль без нікнейму. Напишіть, будь ласка, нікнейм.");
        accountNameInput.focus();
        return;
    }

    saveProfile(currentProfile);

    console.log("Профіль для backend:", currentProfile);

    alert("Профіль збережено");
});

/* Reset */

resetProfileButton.addEventListener("click", function() {
    currentProfile = { ...defaultProfile };

    localStorage.removeItem("voidTalkProfile");

    renderProfile();

    alert("Профіль скинуто");
});

/* Initial render */

renderProfile();

/*
    Backend-ready:

    fetch("/api/profile", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(currentProfile)
    });

    Об'єкт профілю:
    {
        accountName: "...",
        accountDescription: "...",
        avatar: "icons/skull.svg",
        avatarColorStart: "#6d28d9",
        avatarColorEnd: "#a855f7"
    }
*/

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