import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, AlertCircle, Lock, User } from 'lucide-react';
import { ROUTES } from '../../config/routes';
import { useAuth } from '../../context/AuthContext';
import { authApi, type OAuthSessionResponse } from '../../services/authApi';
import '../../styles/auth.login.css';

// Import the Certis Diamond Icon
import CertisDiamondIcon from '../../assets/logos/Certis Diamond Iconsmall.png';
import CertisBackground from '../../assets/backgrounds/certis_bg_new.jpg';

const CERTIS_BLUE = '#002855';
const CERTIS_BLUE_DARK = '#001d3d';

// ==========================================
// LOGIN PAGE COMPONENT
// ==========================================

interface LoginFormData {
    username: string;
    password: string;
}

const bypassAuth = import.meta.env.VITE_BYPASS_AUTH === 'true';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
    const [loginError, setLoginError] = useState<string>('');
    const [oauthSession, setOauthSession] = useState<OAuthSessionResponse | null>(null);
    const [isCheckingOAuth, setIsCheckingOAuth] = useState(true);
    const returnUrl = useMemo(() => new URLSearchParams(window.location.search).get('returnUrl') ?? undefined, []);

    const [formData, setFormData] = useState<LoginFormData>({
        username: '',
        password: ''
    });

    if (bypassAuth) {
        return <Navigate to={ROUTES.HOME} replace />;
    }

    useEffect(() => {
        let cancelled = false;

        void (async () => {
            try {
                const session = await authApi.oauthSession();
                if (!cancelled) {
                    setOauthSession(session);
                }
            } catch {
                if (!cancelled) {
                    setOauthSession(null);
                }
            } finally {
                if (!cancelled) {
                    setIsCheckingOAuth(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    // Validation function
    const validateForm = (): boolean => {
        const newErrors: Partial<Record<keyof LoginFormData, string>> = {};

        // Email / employee ID validation
        if (!formData.username.trim()) {
            newErrors.username = 'Email or employee ID is required';
        }

        // Password validation
        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (field: keyof LoginFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear errors when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
        if (loginError) {
            setLoginError('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        setLoginError('');

        try {
            if (oauthSession) {
                const response = await authApi.oauthLogin({
                    username: formData.username.trim(),
                    password: formData.password,
                });

                window.location.assign(response.redirectUrl);
                return;
            }

            const response = await login(formData.username.trim(), formData.password, returnUrl);
            if (rememberMe) {
                localStorage.setItem('rememberedUsername', formData.username.trim());
            } else {
                localStorage.removeItem('rememberedUsername');
            }
            navigate(response.redirectUrl || ROUTES.HOME, { replace: true });
        } catch (error) {
            console.error('Login error:', error);
            setLoginError("We couldn't sign you in. Check your username and password.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className="login-page"
            style={{
                backgroundImage: `linear-gradient(180deg, rgba(16, 24, 48, 0.36), rgba(16, 24, 48, 0.64)), url(${CertisBackground})`,
            }}
        >
            {/* Login Card */}
            <div className="login-card">
                {/* Header Section */}
                <div
                    className="login-header"
                    style={{
                        background: `linear-gradient(180deg, ${CERTIS_BLUE}f2, ${CERTIS_BLUE_DARK}f0)`,
                    }}
                >
                    {/* Logo */}
                    <div className="login-brand">
                        <img
                            src={CertisDiamondIcon}
                            alt="Certis"
                            className="login-brandIcon"
                        />
                        <span className="login-brandText">
                            CASPER
                        </span>
                    </div>

                    <h1 className="login-title">
                        {oauthSession ? `Sign in to ${oauthSession.appName}` : 'Secure Console Access'}
                    </h1>
                    <p className="login-subtitle">
                        {oauthSession
                            ? 'Authenticate with CASPER to continue to the requesting application.'
                            : 'Authenticate to continue to CASPER administration.'}
                    </p>
                </div>

                {/* Form Section */}
                <div className="login-body">
                    {/* Login Error Alert */}
                    {loginError && (
                        <div className="login-alert">
                            <AlertCircle size={20} color="#dc2626" />
                            <span className="login-alertText">
                                {loginError}
                            </span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {/* Email / Employee ID Field */}
                        <div className="login-field">
                            <label className="login-label">
                                Email or Employee ID
                            </label>
                            <div className="login-helpText">
                                Use your employee ID or email.
                            </div>
                            <div className="login-inputWrap">
                                <div className="login-inputIcon">
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => handleInputChange('username', e.target.value)}
                                    placeholder="admin@casper.local or admin"
                                    autoComplete="username"
                                    className={`login-input login-input--username ${errors.username ? 'is-error' : ''}`}
                                />
                            </div>
                            {errors.username && (
                                <div className="login-fieldError">
                                    <AlertCircle size={12} />
                                    {errors.username}
                                </div>
                            )}
                        </div>

                        {/* Password Field */}
                        <div className="login-field">
                            <label className="login-label">
                                Password
                            </label>
                            <div className="login-inputWrap">
                                <div className="login-inputIcon">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={(e) => handleInputChange('password', e.target.value)}
                                    placeholder="Enter your password"
                                    className={`login-input login-input--password ${errors.password ? 'is-error' : ''}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="login-passwordToggle"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {errors.password && (
                                <div className="login-fieldError">
                                    <AlertCircle size={12} />
                                    {errors.password}
                                </div>
                            )}
                        </div>

                        {/* Remember Me & Forgot Password */}
                        <div className="login-optionsRow">
                            <label className="login-checkboxLabel">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="login-checkbox"
                                />
                                Remember me
                            </label>
                            <a
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                }}
                                className="login-disabledLink"
                                title="Password reset is not enabled yet"
                            >
                                Forgot password?
                            </a>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting || isCheckingOAuth}
                            className="login-submit"
                        >
                            <LogIn size={18} />
                            {isSubmitting ? 'Signing in...' : isCheckingOAuth ? 'Checking session...' : 'Sign In'}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="login-divider">
                        <div className="login-dividerLine" />
                        <span className="login-dividerText">
                            OR
                        </span>
                        <div className="login-dividerLine" />
                    </div>

                    {/* SSO Button (Optional) */}
                    <button
                        type="button"
                        disabled
                        className="login-ssoButton"
                    >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
                            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
                            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
                        </svg>
                        Google SSO is not enabled yet
                    </button>
                </div>

                {/* Footer */}
                <div className="login-footer">
                    <p className="login-footerText">
                        Authorized personnel only. Access and administrative actions are monitored and audited.
                    </p>
                    <div className="login-footerLinks">
                        <a
                            href="#"
                            className="login-footerLink"
                        >
                            Access Notice
                        </a>
                        <span className="login-footerSeparator">•</span>
                        <a
                            href="#"
                            className="login-footerLink"
                        >
                            Usage Policy
                        </a>
                        <span className="login-footerSeparator">•</span>
                        <a
                            href="#"
                            className="login-footerLink"
                        >
                            Support
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;