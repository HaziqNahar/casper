import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, AlertCircle, Lock, Mail } from 'lucide-react';
import { ROUTES } from '../../config/routes';

// Import the Certis Diamond Icon
import CertisDiamondIcon from '../../assets/logos/Certis Diamond Iconsmall.png';

// Logo font - Lato Regular for CES CASPER
const LOGO_FONT_FAMILY = "'Lato', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif";

// ==========================================
// LOGIN PAGE COMPONENT
// ==========================================

interface LoginFormData {
    email: string;
    password: string;
}

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
    const [loginError, setLoginError] = useState<string>('');

    const [formData, setFormData] = useState<LoginFormData>({
        email: '',
        password: ''
    });

    // Validation function
    const validateForm = (): boolean => {
        const newErrors: Partial<Record<keyof LoginFormData, string>> = {};

        // Email validation
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
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
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));

            // TODO: Replace with actual authentication API call
            // Example: const response = await authService.login(formData.email, formData.password);

            // For demo purposes, accept any valid email/password
            console.log('Logging in:', formData);

            // Store auth token (in real app, get this from API response)
            if (rememberMe) {
                localStorage.setItem('authToken', 'demo-token-12345');
            } else {
                sessionStorage.setItem('authToken', 'demo-token-12345');
            }

            // Navigate to dashboard
            navigate(ROUTES.HOME);
        } catch (error) {
            console.error('Login error:', error);
            setLoginError('Invalid email or password. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '1rem',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif"
        }}>
            {/* Login Card */}
            <div style={{
                width: '100%',
                maxWidth: '440px',
                background: 'white',
                borderRadius: '1rem',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                overflow: 'hidden'
            }}>
                {/* Header Section with Gradient */}
                <div style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    padding: '2.5rem 2rem',
                    textAlign: 'center'
                }}>
                    {/* Logo */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        marginBottom: '1rem'
                    }}>
                        <img
                            src={CertisDiamondIcon}
                            alt="Certis"
                            style={{
                                height: '2.5rem',
                                width: 'auto',
                                objectFit: 'contain'
                            }}
                        />
                        <span style={{
                            fontSize: '2rem',
                            fontFamily: LOGO_FONT_FAMILY,
                            fontWeight: 400,
                            background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 50%, #ffffff 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            letterSpacing: '0.08em',
                            lineHeight: 1
                        }}>
                            CASPER
                        </span>
                    </div>

                    <h1 style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        color: 'white',
                        margin: '0 0 0.5rem 0'
                    }}>
                        Welcome Back
                    </h1>
                    <p style={{
                        fontSize: '0.875rem',
                        color: 'rgba(255, 255, 255, 0.9)',
                        margin: 0
                    }}>
                        Sign in to access your dashboard
                    </p>
                </div>

                {/* Form Section */}
                <div style={{ padding: '2rem' }}>
                    {/* Login Error Alert */}
                    {loginError && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.875rem 1rem',
                            backgroundColor: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '0.5rem',
                            marginBottom: '1.5rem'
                        }}>
                            <AlertCircle size={20} color="#dc2626" />
                            <span style={{
                                fontSize: '0.875rem',
                                color: '#dc2626',
                                fontWeight: 500
                            }}>
                                {loginError}
                            </span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {/* Email Field */}
                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: '#374151',
                                marginBottom: '0.5rem'
                            }}>
                                Email Address
                            </label>
                            <div style={{ position: 'relative' }}>
                                <div style={{
                                    position: 'absolute',
                                    left: '1rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#9ca3af',
                                    pointerEvents: 'none'
                                }}>
                                    <Mail size={18} />
                                </div>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    placeholder="you@example.com"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem 0.75rem 2.75rem',
                                        fontSize: '0.875rem',
                                        border: `1px solid ${errors.email ? '#dc2626' : '#d1d5db'}`,
                                        borderRadius: '0.5rem',
                                        backgroundColor: 'white',
                                        outline: 'none',
                                        transition: 'border-color 0.2s, box-shadow 0.2s',
                                        fontFamily: 'inherit',
                                        boxSizing: 'border-box'
                                    }}
                                    onFocus={(e) => {
                                        if (!errors.email) {
                                            e.currentTarget.style.borderColor = '#3b82f6';
                                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                                        }
                                    }}
                                    onBlur={(e) => {
                                        if (!errors.email) {
                                            e.currentTarget.style.borderColor = '#d1d5db';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }
                                    }}
                                />
                            </div>
                            {errors.email && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    marginTop: '0.375rem',
                                    color: '#dc2626',
                                    fontSize: '0.75rem'
                                }}>
                                    <AlertCircle size={12} />
                                    {errors.email}
                                </div>
                            )}
                        </div>

                        {/* Password Field */}
                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: '#374151',
                                marginBottom: '0.5rem'
                            }}>
                                Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <div style={{
                                    position: 'absolute',
                                    left: '1rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#9ca3af',
                                    pointerEvents: 'none'
                                }}>
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={(e) => handleInputChange('password', e.target.value)}
                                    placeholder="Enter your password"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 3rem 0.75rem 2.75rem',
                                        fontSize: '0.875rem',
                                        border: `1px solid ${errors.password ? '#dc2626' : '#d1d5db'}`,
                                        borderRadius: '0.5rem',
                                        backgroundColor: 'white',
                                        outline: 'none',
                                        transition: 'border-color 0.2s, box-shadow 0.2s',
                                        fontFamily: 'inherit',
                                        boxSizing: 'border-box'
                                    }}
                                    onFocus={(e) => {
                                        if (!errors.password) {
                                            e.currentTarget.style.borderColor = '#3b82f6';
                                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                                        }
                                    }}
                                    onBlur={(e) => {
                                        if (!errors.password) {
                                            e.currentTarget.style.borderColor = '#d1d5db';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '1rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        color: '#9ca3af',
                                        cursor: 'pointer',
                                        padding: '0.25rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = '#6b7280'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {errors.password && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    marginTop: '0.375rem',
                                    color: '#dc2626',
                                    fontSize: '0.75rem'
                                }}>
                                    <AlertCircle size={12} />
                                    {errors.password}
                                </div>
                            )}
                        </div>

                        {/* Remember Me & Forgot Password */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '1.5rem'
                        }}>
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                color: '#374151'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    style={{
                                        width: '1rem',
                                        height: '1rem',
                                        cursor: 'pointer',
                                        accentColor: '#3b82f6'
                                    }}
                                />
                                Remember me
                            </label>
                            <a
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    alert('Password reset functionality would be implemented here');
                                }}
                                style={{
                                    fontSize: '0.875rem',
                                    color: '#3b82f6',
                                    textDecoration: 'none',
                                    fontWeight: 500,
                                    transition: 'color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#2563eb'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#3b82f6'}
                            >
                                Forgot password?
                            </a>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                padding: '0.875rem 1.5rem',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: 'white',
                                background: isSubmitting
                                    ? '#9ca3af'
                                    : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                border: 'none',
                                borderRadius: '0.5rem',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                fontFamily: 'inherit',
                                boxShadow: isSubmitting ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                            onMouseEnter={(e) => {
                                if (!isSubmitting) {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
                                    e.currentTarget.style.boxShadow = '0 6px 8px -1px rgba(0, 0, 0, 0.15)';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isSubmitting) {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
                                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }
                            }}
                        >
                            <LogIn size={18} />
                            {isSubmitting ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    {/* Divider */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        margin: '1.5rem 0',
                        gap: '0.75rem'
                    }}>
                        <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500 }}>
                            OR
                        </span>
                        <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
                    </div>

                    {/* SSO Button (Optional) */}
                    <button
                        type="button"
                        onClick={() => alert('SSO login would be implemented here')}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            padding: '0.875rem 1.5rem',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            color: '#374151',
                            backgroundColor: 'white',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontFamily: 'inherit'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f9fafb';
                            e.currentTarget.style.borderColor = '#9ca3af';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'white';
                            e.currentTarget.style.borderColor = '#d1d5db';
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
                            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
                            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
                        </svg>
                        Sign in with Google SSO
                    </button>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '1.5rem 2rem',
                    backgroundColor: '#f9fafb',
                    borderTop: '1px solid #e5e7eb',
                    textAlign: 'center'
                }}>
                    <p style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        margin: 0
                    }}>
                        © 2026 CES CASPER. All rights reserved.
                    </p>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '1rem',
                        marginTop: '0.5rem'
                    }}>
                        <a
                            href="#"
                            style={{
                                fontSize: '0.75rem',
                                color: '#3b82f6',
                                textDecoration: 'none'
                            }}
                        >
                            Privacy Policy
                        </a>
                        <span style={{ color: '#d1d5db' }}>•</span>
                        <a
                            href="#"
                            style={{
                                fontSize: '0.75rem',
                                color: '#3b82f6',
                                textDecoration: 'none'
                            }}
                        >
                            Terms of Service
                        </a>
                        <span style={{ color: '#d1d5db' }}>•</span>
                        <a
                            href="#"
                            style={{
                                fontSize: '0.75rem',
                                color: '#3b82f6',
                                textDecoration: 'none'
                            }}
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