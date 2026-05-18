/*
    auth-guard.js

    Логика доступа:
    - Гость может открыть только index.html и about.html.
    - Гость со страницы about.html может вернуться только на главную.
    - Зарегистрированный / вошедший пользователь НЕ может заходить на index.html.
    - Зарегистрированный пользователь может ходить по about.html, messages.html, profile.html.
*/

(function() {
    const publicPages = ["index.html", "about.html", ""];
    const protectedPages = ["messages.html", "profile.html"];

    const currentPage = getCurrentPage();

    document.addEventListener("DOMContentLoaded", initAuthGuard);

    async function initAuthGuard() {
        const user = await getAuthUser();
        const isAuth = Boolean(user);

        protectCurrentPage(isAuth);
        protectLinks(isAuth);
        updateNavForUserState(isAuth);
    }

    function getCurrentPage() {
        const page = window.location.pathname.split("/").pop();
        return page || "index.html";
    }

    function getPageFromLink(link) {
        const dataPage = link.getAttribute("data-page");
        const href = link.getAttribute("href");

        const value = dataPage || href;

        if (!value || value === "#") {
            return "";
        }

        return value.split("/").pop().split("?")[0].split("#")[0];
    }

    async function getAuthUser() {
        const savedUser = localStorage.getItem("voidTalkUser");

        if (savedUser) {
            try {
                return JSON.parse(savedUser);
            } catch (error) {
                localStorage.removeItem("voidTalkUser");
            }
        }

        try {
            if (window.voidTalkApi && typeof voidTalkApi.getCurrentSession === "function") {
                const sessionUser = await voidTalkApi.getCurrentSession();

                if (sessionUser) {
                    return sessionUser;
                }
            }
        } catch (error) {
            console.log("Сесію не знайдено або backend недоступний:", error);
        }

        return null;
    }

    function protectCurrentPage(isAuth) {
        if (isAuth && (currentPage === "index.html" || currentPage === "")) {
            window.location.replace("messages.html");
            return;
        }

        if (!isAuth && protectedPages.includes(currentPage)) {
            window.location.replace("index.html");
        }
    }

    function protectLinks(isAuth) {
        const links = document.querySelectorAll("a");

        links.forEach(function(link) {
            link.addEventListener("click", function(event) {
                const targetPage = getPageFromLink(link);

                if (!targetPage) {
                    return;
                }

                if (!isAuth && protectedPages.includes(targetPage)) {
                    event.preventDefault();
                    alert("Щоб перейти на цю сторінку, спочатку увійдіть або зареєструйтесь.");
                    window.location.href = "index.html";
                    return;
                }

                if (isAuth && (targetPage === "index.html" || targetPage === "")) {
                    event.preventDefault();
                    window.location.href = "messages.html";
                }
            });
        });
    }

    function updateNavForUserState(isAuth) {
        const links = document.querySelectorAll("a");

        links.forEach(function(link) {
            const targetPage = getPageFromLink(link);

            if (!isAuth && protectedPages.includes(targetPage)) {
                link.style.display = "none";
            }

            if (isAuth && (targetPage === "index.html" || targetPage === "")) {
                link.setAttribute("href", "messages.html");
            }
        });

        if (!isAuth && currentPage === "about.html") {
            const navLinks = document.querySelectorAll(".nav a");

            navLinks.forEach(function(link) {
                const targetPage = getPageFromLink(link);

                if (targetPage !== "index.html" && targetPage !== "about.html" && targetPage !== "") {
                    link.style.display = "none";
                }
            });
        }
    }
})();