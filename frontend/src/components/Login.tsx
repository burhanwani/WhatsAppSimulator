import { useState, FormEvent } from 'react';
import { AuthService } from '../services/auth';

interface LoginProps {
    onLoginSuccess: () => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await AuthService.login(username, password);
            onLoginSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            <div className="bg-gray-800/90 backdrop-blur-sm p-8 rounded-2xl shadow-2xl w-96 border border-gray-700/50">
                {/* Logo/Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full mb-4">
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3 .97 4.29L2 22l5.71-.97C9 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.38 0-2.68-.31-3.84-.86l-.28-.14-2.9.49.49-2.9-.14-.28C4.31 14.68 4 13.38 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        WhatsApp E2EE
                    </h1>
                    <p className="text-sm text-gray-400">
                        End-to-End Encrypted Messaging
                    </p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label
                            htmlFor="username"
                            className="block text-sm font-medium text-gray-300 mb-2"
                        >
                            Username
                        </label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg 
                                     focus:ring-2 focus:ring-green-500 focus:border-transparent
                                     text-white placeholder-gray-400 transition-all"
                            placeholder="Enter username"
                            required
                            disabled={loading}
                            autoFocus
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="block text-sm font-medium text-gray-300 mb-2"
                        >
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg 
                                     focus:ring-2 focus:ring-green-500 focus:border-transparent
                                     text-white placeholder-gray-400 transition-all"
                            placeholder="Enter password"
                            required
                            disabled={loading}
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-900/30 border border-red-700/50 text-red-200 px-4 py-3 rounded-lg text-sm">
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <span>{error}</span>
                            </div>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 
                                 hover:from-green-600 hover:to-green-700 
                                 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed
                                 text-white font-medium rounded-lg shadow-lg
                                 transform transition-all duration-200
                                 hover:scale-[1.02] active:scale-[0.98]
                                 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>Logging in...</span>
                            </div>
                        ) : (
                            'Login'
                        )}
                    </button>
                </form>

                {/* Demo Credentials */}
                <div className="mt-6 pt-6 border-t border-gray-700">
                    <p className="text-center text-xs text-gray-400 mb-2">
                        Demo Credentials
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-gray-700/30 px-3 py-2 rounded text-center">
                            <div className="text-gray-400">Alice</div>
                            <div className="text-gray-300 font-mono">alice123</div>
                        </div>
                        <div className="bg-gray-700/30 px-3 py-2 rounded text-center">
                            <div className="text-gray-400">Bob</div>
                            <div className="text-gray-300 font-mono">bob123</div>
                        </div>
                    </div>
                </div>

                {/* Security Badge */}
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    <span>Secured by Keycloak</span>
                </div>
            </div>
        </div>
    );
}
