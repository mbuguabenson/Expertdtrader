import { getAuthBaseUrl, getOAuthClientId, getOAuthRedirectUri, getOAuthUrl, getSignupUrl } from '../brand';

// ---------------------------------------------------------------------------
// PKCE helpers (duplicated here to avoid circular dependency with core)
// ---------------------------------------------------------------------------

const generateCodeVerifier = (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
};

const generateCodeChallenge = async (verifier: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
};

const PKCE_VERIFIER_KEY = 'oauth_code_verifier';
const PKCE_EXPIRY_KEY = 'oauth_code_verifier_timestamp';

const storePKCEVerifier = (verifier: string): void => {
    sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
    sessionStorage.setItem(PKCE_EXPIRY_KEY, String(Date.now()));
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Redirects to the OAuth2 authorize endpoint.
 * Uses window.location.replace() so the authorize URL does not appear
 * in browser history.
 */
export const redirectToLogin = async (_language?: string): Promise<void> => {
    // Standard OAuth flow as requested in the instructions
    const auth_url = getOAuthUrl();
    window.location.replace(auth_url);
};

export const redirectToSignUp = (_language?: string): void => {
    const signup_url = getSignupUrl();
    if (signup_url) window.open(signup_url, '_blank', 'noopener,noreferrer');
};

/**
 * Parses the account information from the URL query parameters.
 * Format: acct1=..., token1=..., cur1=...
 */
export const parseAccountInfo = (search: string) => {
    const search_params = new URLSearchParams(search);
    const accounts = [];
    let i = 1;

    while (search_params.has(`acct${i}`)) {
        accounts.push({
            account: search_params.get(`acct${i}`),
            token: search_params.get(`token${i}`),
            currency: search_params.get(`cur${i}`),
        });
        i++;
    }

    return accounts;
};
