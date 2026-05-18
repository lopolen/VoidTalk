const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");
const loginStatus = document.getElementById("loginStatus");
const registerStatus = document.getElementById("registerStatus");

/*
    ВАЖНО:
    Тут мы НЕ вызываем getCurrentSession() автоматически,
    потому что из-за /users/me сайт мог сам себя разлогинивать.
*/

/* Перемикання форм входу та реєстрації */

function showLogin() {
    if (!loginForm || !registerForm || !loginTab || !registerTab) {
        return;
    }

    loginForm.classList.add("active-form");
    registerForm.classList.remove("active-form");

    loginTab.classList.add("active");
    registerTab.classList.remove("active");

    clearFormStatus(loginStatus);
}

function showRegister() {
    if (!loginForm || !registerForm || !loginTab || !registerTab) {
        return;
    }

    registerForm.classList.add("active-form");
    loginForm.classList.remove("active-form");

    registerTab.classList.add("active");
    loginTab.classList.remove("active");

    clearFormStatus(registerStatus);
}

/* Допоміжна функція для збереження користувача */

function saveAuthUser(user, fallbackUser) {
    const finalUser = user || fallbackUser;

    if (!finalUser) {
        return;
    }

    localStorage.setItem("voidTalkUser", JSON.stringify(finalUser));
}

function setFormStatus(element, message, type = "info") {
    if (!element) {
        return;
    }

    element.textContent = message;
    element.className = `form-status ${type}`;
}

function clearFormStatus(element) {
    setFormStatus(element, "");
}

function setFormSubmitting(form, isSubmitting) {
    if (!form) {
        return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    const inputs = form.querySelectorAll("input");

    if (submitButton) {
        if (!submitButton.dataset.defaultText) {
            submitButton.dataset.defaultText = submitButton.textContent;
        }

        submitButton.disabled = isSubmitting;
        submitButton.textContent = isSubmitting
            ? "Зачекайте..."
            : submitButton.dataset.defaultText || submitButton.textContent;
    }

    inputs.forEach(function(input) {
        input.disabled = isSubmitting;
    });
}

/* Вхід користувача */

if (loginForm) {
    loginForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const formData = {
            login: loginForm.email.value.trim(),
            password: loginForm.password.value
        };

        try {
            setFormSubmitting(loginForm, true);
            setFormStatus(loginStatus, "Перевіряємо дані входу...");

            const response = await apiFetch("/api/v1/users/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorMessage = await voidTalkApi.getApiErrorMessage(response, "Помилка входу");
                setFormStatus(loginStatus, errorMessage, "error");
                return;
            }

            let user = await voidTalkApi.readJsonResponse(response);

            /*
                Якщо backend після login не повернув користувача,
                frontend все одно зберігає базові дані,
                щоб сайт не викидав назад на index.html.
            */
            if (!user) {
                user = {
                    username: formData.login.includes("@")
                        ? formData.login.split("@")[0]
                        : formData.login,
                    email: formData.login
                };
            }

            saveAuthUser(user);

            setFormStatus(loginStatus, "Вхід успішний. Відкриваємо профіль...", "success");
            window.location.href = "profile.html";

        } catch (error) {
            console.log("Помилка входу:", error);
            setFormStatus(
                loginStatus,
                "Не вдалося підключитися до сервера. " +
                `Перевірте, чи запущений backend на ${voidTalkApi.getApiBaseUrl()}.`,
                "error"
            );
        } finally {
            setFormSubmitting(loginForm, false);
        }
    });
}

/* Реєстрація користувача */

if (registerForm) {
    registerForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const formData = {
            username: registerForm.username.value.trim(),
            email: registerForm.email.value.trim(),
            password: registerForm.password.value
        };

        try {
            setFormSubmitting(registerForm, true);
            setFormStatus(registerStatus, "Створюємо акаунт...");

            const response = await apiFetch("/api/v1/users/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorMessage = await voidTalkApi.getApiErrorMessage(response, "Помилка реєстрації");
                setFormStatus(registerStatus, errorMessage, "error");
                return;
            }

            const registeredUser = await voidTalkApi.readJsonResponse(response);

            const loginResponse = await apiFetch("/api/v1/users/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    login: formData.email,
                    password: formData.password
                })
            });

            if (!loginResponse.ok) {
                const errorMessage = await voidTalkApi.getApiErrorMessage(
                    loginResponse,
                    "Реєстрація успішна, але автоматичний вхід не вдався."
                );

                showLogin();
                setFormStatus(loginStatus, errorMessage, "error");
                return;
            }

            let loginUser = await voidTalkApi.readJsonResponse(loginResponse);

            /*
                Якщо backend після login нічого не повернув,
                беремо користувача з register.
                Якщо і там пусто — створюємо frontend-об'єкт самі.
            */
            if (!loginUser) {
                loginUser = registeredUser || {
                    username: formData.username,
                    email: formData.email
                };
            }

            saveAuthUser(loginUser);
            localStorage.setItem("voidTalkProfileNeedsSetup", "true");

            setFormStatus(registerStatus, "Реєстрація успішна. Відкриваємо профіль...", "success");
            window.location.href = "profile.html";

        } catch (error) {
            console.log("Помилка реєстрації:", error);
            setFormStatus(
                registerStatus,
                "Не вдалося підключитися до сервера. " +
                `Перевірте, чи запущений backend на ${voidTalkApi.getApiBaseUrl()}.`,
                "error"
            );
        } finally {
            setFormSubmitting(registerForm, false);
        }
    });
}

/* Easter egg: 7 кліків по логотипу */

const logo = document.getElementById("logo");
const logoSound = document.getElementById("logoSound");

let logoClickCount = 0;

if (logo && logoSound) {
    logo.addEventListener("click", function(event) {
        event.preventDefault();

        logoClickCount++;

        console.log("Кліків по логотипу:", logoClickCount);

        logo.classList.remove("logo-clicked");
        void logo.offsetWidth;
        logo.classList.add("logo-clicked");

        if (logoClickCount >= 7) {
            logoClickCount = 0;

            logoSound.volume = 1;
            logoSound.currentTime = 0;

            logoSound.play()
                .then(function() {
                    console.log("Звук запущено");
                })
                .catch(function(error) {
                    console.log("Помилка звуку:", error);
                });
        }
    });
}

/* Літаючі іконки на фоні */

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

        if (
            icon.life >= icon.lifeLimit ||
            icon.x < -180 ||
            icon.x > window.innerWidth + 180 ||
            icon.y < -180 ||
            icon.y > window.innerHeight + 180
        ) {
            resetIcon(icon);
        }
    }

    requestAnimationFrame(updateIcons);
}

if (floatingIconsContainer) {
    createIconPool();
    requestAnimationFrame(updateIcons);
}
