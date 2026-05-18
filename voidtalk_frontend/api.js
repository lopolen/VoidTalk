(function() {
    function getDefaultApiBaseUrl() {
        const hostname = window.location.hostname;

        if (hostname === "localhost" || hostname === "127.0.0.1") {
            return `${window.location.protocol}//${hostname}:8000`;
        }

        return "http://127.0.0.1:8000";
    }

    function getApiBaseUrl() {
        const configuredUrl = window.VOIDTALK_API_BASE_URL;
        const savedUrl = localStorage.getItem("voidTalkApiBaseUrl");
        const apiBaseUrl = savedUrl || configuredUrl || getDefaultApiBaseUrl();

        return apiBaseUrl.replace(/\/$/, "");
    }

    function buildApiUrl(path) {
        if (path.startsWith("http://") || path.startsWith("https://")) {
            return path;
        }

        return getApiBaseUrl() + (path.startsWith("/") ? path : "/" + path);
    }

    async function readJsonResponse(response) {
        const text = await response.text();

        if (!text) {
            return null;
        }

        try {
            return JSON.parse(text);
        } catch (error) {
            throw new Error(
                `Сервер повернув не JSON (${response.status} ${response.statusText}). ` +
                `Перевірте, чи запит іде на FastAPI, а не на frontend-сервер.`
            );
        }
    }

    async function getApiErrorMessage(response, fallbackMessage) {
        try {
            const data = await readJsonResponse(response);

            if (Array.isArray(data?.detail)) {
                return data.detail
                    .map(function(error) {
                        return error.msg || "Помилка валідації";
                    })
                    .join("\n");
            }

            return data?.detail || fallbackMessage;
        } catch (error) {
            return error.message || fallbackMessage;
        }
    }

    function apiFetch(path, options) {
        return fetch(buildApiUrl(path), {
            credentials: "include",
            ...options
        });
    }

    window.voidTalkApi = {
        buildApiUrl,
        getApiBaseUrl,
        getApiErrorMessage,
        readJsonResponse
    };

    window.apiFetch = apiFetch;
})();
