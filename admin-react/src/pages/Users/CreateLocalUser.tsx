import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Save, X, AlertCircle } from 'lucide-react';
import { ROUTES } from '../../config/routes';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';
import SearchableCombobox from '../../components/common/SearchableCombobox';
import '../../styles/users.create-local.css';

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

const EMPTY_FORM: UserFormData = {
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
};

const LEAVE_MESSAGE = 'Are you sure you want to leave? Your local user changes will not be saved.';

const CreateLocalUserPage: React.FC = () => {
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<keyof UserFormData, string>>>({});

    const [formData, setFormData] = useState<UserFormData>(EMPTY_FORM);
    const isDirty = useMemo(() => JSON.stringify(formData) !== JSON.stringify(EMPTY_FORM), [formData]);
    const { allowNextNavigation } = useUnsavedChangesGuard({
        when: isDirty,
        message: LEAVE_MESSAGE,
    });

    const validateForm = (): boolean => {
        const newErrors: Partial<Record<keyof UserFormData, string>> = {};

        if (!formData.username.trim()) {
            newErrors.username = 'Username is required';
        } else if (!/^SG\d{6}$/.test(formData.username)) {
            newErrors.username = 'Username must be in format SG999999';
        }

        if (!formData.employeeID.trim()) {
            newErrors.employeeID = 'Employee ID is required';
        } else if (!/^\d{6}$/.test(formData.employeeID)) {
            newErrors.employeeID = 'Employee ID must be 6 digits';
        }

        if (!formData.firstName.trim()) {
            newErrors.firstName = 'First name is required';
        }

        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Last name is required';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        if (!formData.phone.trim()) {
            newErrors.phone = 'Phone number is required';
        } else if (!/^\+65[689]\d{7}$/.test(formData.phone)) {
            newErrors.phone = 'Phone must be in format +6598989898';
        }

        if (!formData.organization.trim()) {
            newErrors.organization = 'Organization is required';
        } else if (!/^\d{8}$/.test(formData.organization)) {
            newErrors.organization = 'Organization must be 8 digits';
        }

        if (!formData.department.trim()) {
            newErrors.department = 'Department is required';
        }

        if (!formData.staffType.trim()) {
            newErrors.staffType = 'Staff type is required';
        }

        if (!formData.group.trim()) {
            newErrors.group = 'Group is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (field: keyof UserFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
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
            await new Promise(resolve => setTimeout(resolve, 1500));
            console.log('Creating user:', formData);
            allowNextNavigation();
            navigate(ROUTES.USERS);
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

    const inputClassName = (hasError?: string) =>
        `create-user-input${hasError ? ' is-error' : ''}`;

    const renderError = (message?: string) =>
        message ? (
            <div className="create-user-error">
                <AlertCircle size={12} />
                {message}
            </div>
        ) : null;

    return (
        <div className="create-user-page">
            <div className="create-user-header">
                <div className="create-user-headerIntro">
                    <div className="create-user-headerIcon">
                        <UserPlus size={20} />
                    </div>
                    <div>
                        <h2 className="create-user-title">Create New User</h2>
                        <p className="create-user-subtitle">Add a new user to the system</p>
                    </div>
                </div>
            </div>

            <div className="create-user-card">
                <form onSubmit={handleSubmit}>
                    <div className="create-user-section">
                        <h3 className="create-user-sectionTitle">Basic Information</h3>

                        <div className="create-user-grid">
                            <div>
                                <label className="create-user-fieldLabel">
                                    Username <span className="create-user-required">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => handleInputChange('username', e.target.value)}
                                    placeholder="SG999999"
                                    className={inputClassName(errors.username)}
                                />
                                {renderError(errors.username)}
                            </div>

                            <div>
                                <label className="create-user-fieldLabel">
                                    Employee ID <span className="create-user-required">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.employeeID}
                                    onChange={(e) => handleInputChange('employeeID', e.target.value)}
                                    placeholder="999999"
                                    className={inputClassName(errors.employeeID)}
                                />
                                {renderError(errors.employeeID)}
                            </div>

                            <div>
                                <label className="create-user-fieldLabel">
                                    First Name <span className="create-user-required">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                                    placeholder="Ming Lan"
                                    className={inputClassName(errors.firstName)}
                                />
                                {renderError(errors.firstName)}
                            </div>

                            <div>
                                <label className="create-user-fieldLabel">
                                    Last Name <span className="create-user-required">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                                    placeholder="Tan"
                                    className={inputClassName(errors.lastName)}
                                />
                                {renderError(errors.lastName)}
                            </div>
                        </div>
                    </div>

                    <div className="create-user-section">
                        <h3 className="create-user-sectionTitle">Contact Information</h3>

                        <div className="create-user-grid">
                            <div className="create-user-gridColSpan2">
                                <label className="create-user-fieldLabel">
                                    Email Address <span className="create-user-required">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    placeholder="tan_ming_lan@mycompany.com"
                                    className={inputClassName(errors.email)}
                                />
                                {renderError(errors.email)}
                            </div>

                            <div>
                                <label className="create-user-fieldLabel">
                                    Phone Number <span className="create-user-required">*</span>
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => handleInputChange('phone', e.target.value)}
                                    placeholder="+6598989898"
                                    className={inputClassName(errors.phone)}
                                />
                                {renderError(errors.phone)}
                            </div>
                        </div>
                    </div>

                    <div className="create-user-section">
                        <h3 className="create-user-sectionTitle">Organization Details</h3>

                        <div className="create-user-grid">
                            <div>
                                <label className="create-user-fieldLabel">
                                    Organization <span className="create-user-required">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.organization}
                                    onChange={(e) => handleInputChange('organization', e.target.value)}
                                    placeholder="50395803"
                                    className={inputClassName(errors.organization)}
                                />
                                {renderError(errors.organization)}
                            </div>

                            <div>
                                <label className="create-user-fieldLabel">
                                    Department <span className="create-user-required">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.department}
                                    onChange={(e) => handleInputChange('department', e.target.value)}
                                    placeholder="Tech Planning & Development"
                                    className={inputClassName(errors.department)}
                                />
                                {renderError(errors.department)}
                            </div>

                            <div>
                                <label className="create-user-fieldLabel">
                                    Staff Type <span className="create-user-required">*</span>
                                </label>
                                <SearchableCombobox
                                    value={formData.staffType}
                                    onChange={(next) => handleInputChange('staffType', next)}
                                    options={[
                                        { value: '', label: 'Select staff type' },
                                        { value: 'O0001', label: 'O0001 - Office' },
                                        { value: 'M0001', label: 'M0001 - frontline' },
                                        { value: 'D0001', label: 'D0001 - frontline' },
                                        { value: 'T0001', label: '_Test - frontlineTest/training accounts' },
                                    ]}
                                    placeholder="Select staff type"
                                    inputClassName={`kc-input create-user-comboboxInput${errors.staffType ? ' is-error' : ''}`}
                                />
                                {renderError(errors.staffType)}
                            </div>

                            <div>
                                <label className="create-user-fieldLabel">
                                    Group <span className="create-user-required">*</span>
                                </label>
                                <SearchableCombobox
                                    value={formData.group}
                                    onChange={(next) => handleInputChange('group', next)}
                                    options={[
                                        { value: '', label: 'Select group' },
                                        { value: 'SG', label: 'Singapore' },
                                        { value: 'MY', label: 'Malaysia' },
                                        { value: 'ID', label: 'Indonesia' },
                                        { value: 'TH', label: 'Thailand' },
                                    ]}
                                    placeholder="Select group"
                                    inputClassName={`kc-input create-user-comboboxInput${errors.group ? ' is-error' : ''}`}
                                />
                                {renderError(errors.group)}
                            </div>
                        </div>
                    </div>

                    <div className="create-user-actions">
                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={isSubmitting}
                            className="create-user-button create-user-button--secondary"
                        >
                            <X size={16} />
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="create-user-button create-user-button--primary"
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

export default CreateLocalUserPage;