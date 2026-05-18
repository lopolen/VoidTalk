/*
    auth-guard.js
    Перевіряє авторизацію через backend cookie-сесію.

    localStorage використовується тільки як кеш для username, а не як джерело
    правди для доступу до захищених сторінок.
*/

(function() {
    const protectedPages = ["messages.html", "my-posts.html", "profile.html"];

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initAuthGuard);
    } else {
        initAuthGuard();
    }

    async function initAuthGuard() {
        const currentPage = getCurrentPage();
        const user = await getSessionUser();
        const isAuth = Boolean(user);

        if (!isAuth) {
            localStorage.removeItem("voidTalkUser");
        }

        if (!isAuth && protectedPages.includes(currentPage)) {
            window.location.replace("index.html");
            return;
        }

        if (isAuth && (currentPage === "index.html" || currentPage === "")) {
            window.location.replace("profile.html");
            return;
        }

        updateNavigation(isAuth);
        protectLinks(isAuth);
    }

    function getCurrentPage() {
        const page = window.location.pathname.split("/").pop();
        return page || "index.html";
    }

    async function getSessionUser() {
        if (!window.voidTalkApi || typeof voidTalkApi.getCurrentSession !== "function") {
            return null;
        }

        try {
            return await voidTalkApi.getCurrentSession();
        } catch (error) {
            console.log("Не вдалося перевірити сесію:", error);
            return null;
        }
    }

    function getTargetPage(link) {
        const href = link.getAttribute("href");

        if (!href || href === "#") {
            return "";
        }

        return href.split("/").pop().split("?")[0].split("#")[0];
    }

    function protectLinks(isAuth) {
        const links = document.querySelectorAll("a");

        links.forEach(function(link) {
            link.addEventListener("click", function(event) {
                if (isLogoutLink(link)) {
                    return;
                }

                const targetPage = getTargetPage(link);

                if (!targetPage) {
                    return;
                }

                if (!isAuth && protectedPages.includes(targetPage)) {
                    event.preventDefault();
                    window.location.href = "index.html";
                    return;
                }

                if (isAuth && targetPage === "index.html") {
                    event.preventDefault();
                    window.location.href = "profile.html";
                }
            });
        });
    }

    function isLogoutLink(link) {
        return link.id === "logoutButton" || link.dataset.authAction === "logout";
    }

    function updateNavigation(isAuth) {
        const navLinks = document.querySelectorAll(".nav a");

        navLinks.forEach(function(link) {
            const targetPage = getTargetPage(link);

            link.style.display = "";

            if (!isAuth && protectedPages.includes(targetPage)) {
                link.style.display = "none";
            }

            if (isAuth && targetPage === "index.html") {
                link.setAttribute("href", "profile.html");
            }
        });
    }
})();
