/**
 * Authentication Service
 * 
 * Manages Keycloak authentication for users:
 * - Login with username/password
 * - Logout and token cleanup
 * - Token storage and retrieval
 * - Automatic token refresh
 */

const KEYCLOAK_URL = 'http://localhost:8080';
const REALM = 'my-cloud';
const CLIENT_ID = 'whatsapp-frontend';

interface TokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    refresh_expires_in: number;
    token_type: string;
}

export class AuthService {
    private static readonly TOKEN_KEY = 'auth_token';
    private static readonly REFRESH_KEY = 'refresh_token';
    private static readonly EXPIRY_KEY = 'token_expiry';
    private static readonly USERNAME_KEY = 'username';

    /**
     * Login with username and password
     */
    static async login(username: string, password: string): Promise<void> {
        try {
            const response = await fetch(
                `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        grant_type: 'password',
                        client_id: CLIENT_ID,
                        username,
                        password,
                    }),
                }
            );

            if (!response.ok) {
                const error = await response.text();
                console.error('Login failed:', error);
                throw new Error('Invalid username or password');
            }

            const data: TokenResponse = await response.json();

            // Store tokens securely
            localStorage.setItem(this.TOKEN_KEY, data.access_token);
            localStorage.setItem(this.REFRESH_KEY, data.refresh_token);
            localStorage.setItem(this.USERNAME_KEY, username);
            localStorage.setItem(
                this.EXPIRY_KEY,
                (Date.now() + data.expires_in * 1000).toString()
            );

            console.log('✅ Login successful:', username);
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    /**
     * Logout and clear all tokens
     */
    static logout(): void {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.REFRESH_KEY);
        localStorage.removeItem(this.EXPIRY_KEY);
        localStorage.removeItem(this.USERNAME_KEY);
        console.log('✅ Logged out');
    }

    /**
     * Get current access token
     * Returns null if not authenticated or token expired
     */
    static getToken(): string | null {
        const token = localStorage.getItem(this.TOKEN_KEY);
        const expiry = localStorage.getItem(this.EXPIRY_KEY);

        if (!token || !expiry) {
            return null;
        }

        // Check if token is expired (with 30s buffer)
        if (Date.now() > parseInt(expiry) - 30000) {
            console.warn('⚠️  Token expired or expiring soon');
            return null;
        }

        return token;
    }

    /**
     * Check if user is authenticated
     */
    static isAuthenticated(): boolean {
        return this.getToken() !== null;
    }

    /**
     * Get current username
     */
    static getUsername(): string | null {
        return localStorage.getItem(this.USERNAME_KEY);
    }

    /**
     * Refresh access token using refresh token
     */
    static async refreshToken(): Promise<void> {
        const refreshToken = localStorage.getItem(this.REFRESH_KEY);

        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        try {
            const response = await fetch(
                `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        grant_type: 'refresh_token',
                        client_id: CLIENT_ID,
                        refresh_token: refreshToken,
                    }),
                }
            );

            if (!response.ok) {
                // Refresh failed - logout user
                console.error('Token refresh failed');
                this.logout();
                throw new Error('Token refresh failed - please login again');
            }

            const data: TokenResponse = await response.json();

            // Update tokens
            localStorage.setItem(this.TOKEN_KEY, data.access_token);
            localStorage.setItem(this.REFRESH_KEY, data.refresh_token);
            localStorage.setItem(
                this.EXPIRY_KEY,
                (Date.now() + data.expires_in * 1000).toString()
            );

            console.log('✅ Token refreshed successfully');
        } catch (error) {
            console.error('Token refresh error:', error);
            this.logout();
            throw error;
        }
    }

    /**
     * Get token or refresh if needed
     * Throws error if authentication fails
     */
    static async getValidToken(): Promise<string> {
        let token = this.getToken();

        if (!token) {
            // Try to refresh
            try {
                await this.refreshToken();
                token = this.getToken();
            } catch (error) {
                throw new Error('Authentication required - please login');
            }
        }

        if (!token) {
            throw new Error('Authentication required - please login');
        }

        return token;
    }

    /**
     * Get authorization headers for API calls
     */
    static async getAuthHeaders(): Promise<Record<string, string>> {
        const token = await this.getValidToken();
        return {
            'Authorization': `Bearer ${token}`,
        };
    }
}
