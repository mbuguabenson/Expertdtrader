const AUTH_INFO_KEY = 'auth_info';

export const storeTokens = (access_token: string, refresh_token?: string, expires_in?: number): void => {
    sessionStorage.setItem(
        AUTH_INFO_KEY,
        JSON.stringify({
            access_token,
            refresh_token,
            expires_at: expires_in ? Date.now() + expires_in * 1000 : null,
        })
    );
};

export const getStoredToken = (): string | null => {
    try {
        const info = JSON.parse(sessionStorage.getItem(AUTH_INFO_KEY) ?? 'null');
        if (!info) return null;
        if (info.expires_at && Date.now() >= info.expires_at) {
            clearTokens();
            return null;
        }
        return info.access_token ?? null;
    } catch {
        return null;
    }
};

export const clearTokens = (): void => {
    sessionStorage.removeItem(AUTH_INFO_KEY);
};
