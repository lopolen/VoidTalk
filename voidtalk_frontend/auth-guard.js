/*
    auth-guard.js
    Аварийная стабильная версия.

    Проверяем вход ТОЛЬКО через localStorage:
    - есть voidTalkUser -> пользователь вошёл;
    - нет voidTalkUser -> гость.
*/

(function() {
    const protectedPages = ["messages.html", "profile.html"];
    const currentPage = getCurrentPage();

    document.addEventListener("DOMContentLoaded", function() {
        const isAuth = Boolean(getSavedUser());

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
    });

    function getCurrentPage() {
        const page = window.location.pathname.split("/").pop();
        return page || "index.html";
    }

    function getSavedUser() {
        const savedUser = localStorage.getItem("voidTalkUser");

        if (!savedUser) {
            return null;
        }

        try {
            return JSON.parse(savedUser);
        } catch (error) {
            localStorage.removeItem("voidTalkUser");
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