import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Save, X, AlertCircle } from 'lucide-react';
import { ROUTES } from '../../config/routes';

// ==========================================
// CREATE USER PAGE COMPONENT
// ==========================================

interface UserFormData {
    username: string;
    employeeID: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    organization: string;
    department: string;
    staffType: string;
    group: string;
}

const CreateUserPage: React.FC = () => {
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<keyof UserFormData, string>>>({});

    const [formData, setFormData] = useState<UserFormData>({
        username: '',
        employeeID: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        organization: '',
        department: '',
        staffType: '',
        group: ''
    });

    // Validation function
    const validateForm = (): boolean => {
        const newErrors: Partial<Record<keyof UserFormData, string>> = {};

        // Username validation (SG format)
        if (!formData.username.trim()) {
            newErrors.username = 'Username is required';
        } else if (!/^SG\d{6}$/.test(formData.username)) {
            newErrors.username = 'Username must be in format SG999999';
        }

        // Employee ID validation
        if (!formData.employeeID.trim()) {
            newErrors.employeeID = 'Employee ID is required';
        } else if (!/^\d{6}$/.test(formData.employeeID)) {
            newErrors.employeeID = 'Employee ID must be 6 digits';
        }

        // First name validation
        if (!formData.firstName.trim()) {
            newErrors.firstName = 'First name is required';
        }

        // Last name validation
        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Last name is required';
        }

        // Email validation
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        // Phone validation (Singapore format)
        if (!formData.phone.trim()) {
            newErrors.phone = 'Phone number is required';
        } else if (!/^\+65[689]\d{7}$/.test(formData.phone)) {
            newErrors.phone = 'Phone must be in format +6598989898';
        }

        // Organization validation
        if (!formData.organization.trim()) {
            newErrors.organization = 'Organization is required';
        } else if (!/^\d{8}$/.test(formData.organization)) {
            newErrors.organization = 'Organization must be 8 digits';
        }

        // Department validation
        if (!formData.department.trim()) {
            newErrors.department = 'Department is required';
        }

        // Staff type validation
        if (!formData.staffType.trim()) {
            newErrors.staffType = 'Staff type is required';
        }

        // Group validation
        if (!formData.group.trim()) {
            newErrors.group = 'Group is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (field: keyof UserFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error for this field when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));

            // TODO: Replace with actual API call
            console.log('Creating user:', formData);

            // Navigate back to users page on success
            navigate(ROUTES.USERS_ALL);
        } catch (error) {
            console.error('Error creating user:', error);
            alert('Failed to create user. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        navigate(ROUTES.HOME);
    };

    return (
        <div style={{ width: '100%', maxWidth: '100%' }}>
            {/* Page Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '2.5rem',
                        height: '2.5rem',
                        borderRadius: '0.5rem',
                        backgroundColor: '#dbeafe',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#2563eb'
                    }}>
                        <UserPlus size={20} />
                    </div>
                    <div>
                        <h2 style={{
                            fontSize: '1.5rem',
                            fontWeight: 700,
                            color: '#111827',
                            margin: 0
                        }}>
                            Create New User
                        </h2>
                        <p style={{
                            fontSize: '0.875rem',
                            color: '#6b7280',
                            margin: 0
                        }}>
                            Add a new user to the system
                        </p>
                    </div>
                </div>
            </div>

            {/* Form Container */}
            <div style={{
                background: 'white',
                borderRadius: '0.75rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #e5e7eb',
                padding: '2rem',
                maxWidth: '800px'
            }}>
                <form onSubmit={handleSubmit}>
                    {/* Basic Information Section */}
                    <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{
                            fontSize: '1.125rem',
                            fontWeight: 600,
                            color: '#111827',
                            marginBottom: '1rem',
                            paddingBottom: '0.5rem',
                            borderBottom: '2px solid #e5e7eb'
                        }}>
                            Basic Information
                        </h3>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '1.25rem'
                        }}>
                            {/* Username */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    color: '#374151',
                                    marginBottom: '0.5rem'
                                }}>
                                    Username <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => handleInputChange('username', e.target.value)}
                                    placeholder="SG999999"
                                    style={{
                                        width: '100%',
                                        padding: '0.625rem 0.875rem',
                                        fontSize: '0.875rem',
                                        border: `1px solid ${errors.username ? '#dc2626' : '#d1d5db'}`,
                                        borderRadius: '0.5rem',
                                        backgroundColor: 'white',
                                        outline: 'none',
                                        transition: 'border-color 0.2s',
                                        fontFamily: 'inherit',
                                        boxSizing: 'border-box'
                                    }}
                                    onFocus={(e) => {
                                        if (!errors.username) {
                                            e.currentTarget.style.borderColor = '#3b82f6';
                                        }
                                    }}
                                    onBlur={(e) => {
                                        if (!errors.username) {
                                            e.currentTarget.style.borderColor = '#d1d5db';
                                        }
                                    }}
                                />
                                {errors.username && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        marginTop: '0.25rem',
                                        color: '#dc2626',
                                        fontSize: '0.75rem'
                                    }}>
                                        <AlertCircle size={12} />
                                        {errors.username}
                                    </div>
                                )}
                            </div>

                            {/* Employee ID */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    color: '#374151',
                                    marginBottom: '0.5rem'
                                }}>
                                    Employee ID <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.employeeID}
                                    onChange={(e) => handleInputChange('employeeID', e.target.value)}
                                    placeholder="999999"
                                    style={{
                                        width: '100%',
                                        padding: '0.625rem 0.875rem',
                                        fontSize: '0.875rem',
                                        border: `1px solid ${errors.employeeID ? '#dc2626' : '#d1d5db'}`,
                                        borderRadius: '0.5rem',
                                        backgroundColor: 'white',
                                        outline: 'none',
                                        transition: 'border-color 0.2s',
                                        fontFamily: 'inherit',
                                        boxSizing: 'border-box'
                                    }}
                                    onFocus={(e) => {
                                        if (!errors.employeeID) {
                                            e.currentTarget.style.borderColor = '#3b82f6';
                                        }
                                    }}
                                    onBlur={(e) => {
                                        if (!errors.employeeID) {
                                            e.currentTarget.style.borderColor = '#d1d5db';
                                        }
                                    }}
                                />
                                {errors.employeeID && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        marginTop: '0.25rem',
                                        color: '#dc2626',
                                        fontSize: '0.75rem'
                                    }}>
                                        <AlertCircle size={12} />
                                        {errors.employeeID}
                                    </div>
                                )}
                            </div>

                            {/* First Name */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    color: '#374151',
                                    marginBottom: '0.5rem'
                                }}>
                                    First Name <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                                    placeholder="Ming Lan"
                                    style={{
                                        width: '100%',
                                        padding: '0.625rem 0.875rem',
                                        fontSize: '0.875rem',
                                        border: `1px solid ${errors.firstName ? '#dc2626' : '#d1d5db'}`,
                                        borderRadius: '0.5rem',
                                        backgroundColor: 'white',
                                        outline: 'none',
                                        transition: 'border-color 0.2s',
                                        fontFamily: 'inherit',
                                        boxSizing: 'border-box'
                                    }}
                                    onFocus={(e) => {
                                        if (!errors.firstName) {
                                            e.currentTarget.style.borderColor = '#3b82f6';
                                        }
                                    }}
                                    onBlur={(e) => {
                                        if (!errors.firstName) {
                                            e.currentTarget.style.borderColor = '#d1d5db';
                                        }
                                    }}
                                />
                                {errors.firstName && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        marginTop: '0.25rem',
                                        color: '#dc2626',
                                        fontSize: '0.75rem'
                                    }}>
                                        <AlertCircle size={12} />
                                        {errors.firstName}
                                    </div>
                                )}
                            </div>

                            {/* Last Name */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    color: '#374151',
                                    marginBottom: '0.5rem'
                                }}>
                                    Last Name <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                                    placeholder="Tan"
                                    style={{
                                        width: '100%',
                                        padding: '0.625rem 0.875rem',
                                        fontSize: '0.875rem',
                                        border: `1px solid ${errors.lastName ? '#dc2626' : '#d1d5db'}`,
                                        borderRadius: '0.5rem',
                                        backgroundColor: 'white',
                                        outline: 'none',
                                        transition: 'border-color 0.2s',
                                        fontFamily: 'inherit',
                                        boxSizing: 'border-box'
                                    }}
                                    onFocus={(e) => {
                                        if (!errors.lastName) {
                                            e.currentTarget.style.borderColor = '#3b82f6';
                                        }
                                    }}
                                    onBlur={(e) => {
                                        if (!errors.lastName) {
                                            e.currentTarget.style.borderColor = '#d1d5db';
                                        }
                                    }}
                                />
                                {errors.lastName && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        marginTop: '0.25rem',
                                        color: '#dc2626',
                                        fontSize: '0.75rem'
                                    }}>
                                        <AlertCircle size={12} />
                                        {errors.lastName}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Contact Information Section */}
                    <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{
                            fontSize: '1.125rem',
                            fontWeight: 600,
                            color: '#111827',
                            marginBottom: '1rem',
                            paddingBottom: '0.5rem',
                            borderBottom: '2px solid #e5e7eb'
                        }}>
                            Contact Information
                        </h3>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '1.25rem'
                        }}>
                            {/* Email */}
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    color: '#374151',
                                    marginBottom: '0.5rem'
                                }}>
                                    Email Address <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    placeholder="tan_ming_lan@mycompany.com"
                                    style={{
                                        width: '100%',
                                        padding: '0.625rem 0.875rem',
                                        fontSize: '0.875rem',
                                        border: `1px solid ${errors.email ? '#dc2626' : '#d1d5db'}`,
                                        borderRadius: '0.5rem',
                                        backgroundColor: 'white',
                                        outline: 'none',
                                        transition: 'border-color 0.2s',
                                        fontFamily: 'inherit',
                                        boxSizing: 'border-box'
                                    }}
                                    onFocus={(e) => {
                                        if (!errors.email) {
                                            e.currentTarget.style.borderColor = '#3b82f6';
                                        }
                                    }}
                                    onBlur={(e) => {
                                        if (!errors.email) {
                                            e.currentTarget.style.borderColor = '#d1d5db';
                                        }
                                    }}
                                />
                                {errors.email && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        marginTop: '0.25rem',
                                        color: '#dc2626',
                                        fontSize: '0.75rem'
                                    }}>
                                        <AlertCircle size={12} />
                                        {errors.email}
                                    </div>
                                )}
                            </div>

                            {/* Phone */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    color: '#374151',
                                    marginBottom: '0.5rem'
                                }}>
                                    Phone Number <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => handleInputChange('phone', e.target.value)}
                                    placeholder="+6598989898"
                                    style={{
                                        width: '100%',
                                        padding: '0.625rem 0.875rem',
                                        fontSize: '0.875rem',
                                        border: `1px solid ${errors.phone ? '#dc2626' : '#d1d5db'}`,
                                        borderRadius: '0.5rem',
                                        backgroundColor: 'white',
                                        outline: 'none',
                                        transition: 'border-color 0.2s',
                                        fontFamily: 'inherit',
                                        boxSizing: 'border-box'
                                    }}
                                    onFocus={(e) => {
                                        if (!errors.phone) {
                                            e.currentTarget.style.borderColor = '#3b82f6';
                                        }
                                    }}
                                    onBlur={(e) => {
                                        if (!errors.phone) {
                                            e.currentTarget.style.borderColor = '#d1d5db';
                                        }
                                    }}
                                />
                                {errors.phone && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        marginTop: '0.25rem',
                                        color: '#dc2626',
                                        fontSize: '0.75rem'
                                    }}>
                                        <AlertCircle size={12} />
                                        {errors.phone}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Organization Information Section */}
                    <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{
                            fontSize: '1.125rem',
                            fontWeight: 600,
                            color: '#111827',
                            marginBottom: '1rem',
                            paddingBottom: '0.5rem',
                            borderBottom: '2px solid #e5e7eb'
                        }}>
                            Organization Details
                        </h3>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '1.25rem'
                        }}>
                            {/* Organization */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    color: '#374151',
                                    marginBottom: '0.5rem'
                                }}>
                                    Organization <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.organization}
                                    onChange={(e) => handleInputChange('organization', e.target.value)}
                                    placeholder="50395803"
                                    style={{
                                        width: '100%',
                                        padding: '0.625rem 0.875rem',
                                        fontSize: '0.875rem',
                                        border: `1px solid ${errors.organization ? '#dc2626' : '#d1d5db'}`,
                                        borderRadius: '0.5rem',
                                        backgroundColor: 'white',
                                        outline: 'none',
                                        transition: 'border-color 0.2s',
                                        fontFamily: 'inherit',
                                        boxSizing: 'border-box'
                                    }}
                                    onFocus={(e) => {
                                        if (!errors.organization) {
                                            e.currentTarget.style.borderColor = '#3b82f6';
                                        }
                                    }}
                                    onBlur={(e) => {
                                        if (!errors.organization) {
                                            e.currentTarget.style.borderColor = '#d1d5db';
                                        }
                                    }}
                                />
                                {errors.organization && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        marginTop: '0.25rem',
                                        color: '#dc2626',
                                        fontSize: '0.75rem'
                                    }}>
                                        <AlertCircle size={12} />
                                        {errors.organization}
                                    </div>
                                )}
                            </div>

                            {/* Department */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    color: '#374151',
                                    marginBottom: '0.5rem'
                                }}>
                                    Department <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.department}
                                    onChange={(e) => handleInputChange('department', e.target.value)}
                                    placeholder="Tech Planning & Development"
                                    style={{
                                        width: '100%',
                                        padding: '0.625rem 0.875rem',
                                        fontSize: '0.875rem',
                                        border: `1px solid ${errors.department ? '#dc2626' : '#d1d5db'}`,
                                        borderRadius: '0.5rem',
                                        backgroundColor: 'white',
                                        outline: 'none',
                                        transition: 'border-color 0.2s',
                                        fontFamily: 'inherit',
                                        boxSizing: 'border-box'
                                    }}
                                    onFocus={(e) => {
                                        if (!errors.department) {
                                            e.currentTarget.style.borderColor = '#3b82f6';
                                        }
                                    }}
                                    onBlur={(e) => {
                                        if (!errors.department) {
                                            e.currentTarget.style.borderColor = '#d1d5db';
                                        }
                                    }}
                                />
                                {errors.department && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        marginTop: '0.25rem',
                                        color: '#dc2626',
                                        fontSize: '0.75rem'
                                    }}>
                                        <AlertCircle size={12} />
                                        {errors.department}
                                    </div>
                                )}
                            </div>

                            {/* Staff Type */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    color: '#374151',
                                    marginBottom: '0.5rem'
                                }}>
                                    Staff Type <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <select
                                    value={formData.staffType}
                                    onChange={(e) => handleInputChange('staffType', e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.625rem 0.875rem',
                                        fontSize: '0.875rem',
                                        border: `1px solid ${errors.staffType ? '#dc2626' : '#d1d5db'}`,
                                        borderRadius: '0.5rem',
                                        backgroundColor: 'white',
                                        outline: 'none',
                                        transition: 'border-color 0.2s',
                                        fontFamily: 'inherit',
                                        boxSizing: 'border-box',
                                        cursor: 'pointer'
                                    }}
                                    onFocus={(e) => {
                                        if (!errors.staffType) {
                                            e.currentTarget.style.borderColor = '#3b82f6';
                                        }
                                    }}
                                    onBlur={(e) => {
                                        if (!errors.staffType) {
                                            e.currentTarget.style.borderColor = '#d1d5db';
                                        }
                                    }}
                                >
                                    <option value="">Select staff type</option>
                                    <option value="O0001">O0001 - Office</option>
                                    <option value="M0001">M0001 - frontline</option>
                                    <option value="D0001">D0001 - frontline</option>
                                    <option value="T0001">_Test - frontlineTest/training accounts</option>
                                </select>
                                {errors.staffType && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        marginTop: '0.25rem',
                                        color: '#dc2626',
                                        fontSize: '0.75rem'
                                    }}>
                                        <AlertCircle size={12} />
                                        {errors.staffType}
                                    </div>
                                )}
                            </div>

                            {/* Group */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    color: '#374151',
                                    marginBottom: '0.5rem'
                                }}>
                                    Group <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <select
                                    value={formData.group}
                                    onChange={(e) => handleInputChange('group', e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.625rem 0.875rem',
                                        fontSize: '0.875rem',
                                        border: `1px solid ${errors.group ? '#dc2626' : '#d1d5db'}`,
                                        borderRadius: '0.5rem',
                                        backgroundColor: 'white',
                                        outline: 'none',
                                        transition: 'border-color 0.2s',
                                        fontFamily: 'inherit',
                                        boxSizing: 'border-box',
                                        cursor: 'pointer'
                                    }}
                                    onFocus={(e) => {
                                        if (!errors.group) {
                                            e.currentTarget.style.borderColor = '#3b82f6';
                                        }
                                    }}
                                    onBlur={(e) => {
                                        if (!errors.group) {
                                            e.currentTarget.style.borderColor = '#d1d5db';
                                        }
                                    }}
                                >
                                    <option value="">Select group</option>
                                    <option value="SG">Singapore</option>
                                    <option value="MY">Malaysia</option>
                                    <option value="ID">Indonesia</option>
                                    <option value="TH">Thailand</option>
                                </select>
                                {errors.group && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        marginTop: '0.25rem',
                                        color: '#dc2626',
                                        fontSize: '0.75rem'
                                    }}>
                                        <AlertCircle size={12} />
                                        {errors.group}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '0.75rem',
                        paddingTop: '1.5rem',
                        borderTop: '1px solid #e5e7eb'
                    }}>
                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={isSubmitting}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.625rem 1.25rem',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: '#374151',
                                backgroundColor: '#f9fafb',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.5rem',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                fontFamily: 'inherit',
                                opacity: isSubmitting ? 0.5 : 1
                            }}
                            onMouseEnter={(e) => {
                                if (!isSubmitting) {
                                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#f9fafb';
                            }}
                        >
                            <X size={16} />
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.625rem 1.25rem',
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
                                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                            }}
                            onMouseEnter={(e) => {
                                if (!isSubmitting) {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
                                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isSubmitting) {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
                                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                                }
                            }}
                        >
                            <Save size={16} />
                            {isSubmitting ? 'Creating User...' : 'Create User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateUserPage;