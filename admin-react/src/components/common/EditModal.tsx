export interface FormField {
    key: string;                 // Field name (e.g., 'uuid', 'noticeNumber')
    label: string;               // Display label (e.g., 'Notice Number')
    type: 'text' | 'number' | 'select' | 'textarea' | 'date';  // Input type
    readOnly?: boolean;          // Make field non-editable
    options?: { value: string; label: string }[];  // For dropdowns
    rows?: number;               // For textarea height
    placeholder?: string;        // Placeholder text
}


// PROPS - What the modal receives from parent
interface EditModalProps<T> {
    isOpen: boolean;           // Show/hide modal
    title: string;             // Modal title (e.g., "Edit HDB Record")
    data: T;                   // Original record data
    formData: Partial<T>;      // Current form values being edited
    fields: FormField[];       // Field configuration (what inputs to show)
    onClose: () => void;       // Function to call when user cancels
    onSave: () => void;        // Function to call when user clicks Save
    onChange: (field: keyof T, value: any) => void;  // Called when any field changes
}


function EditModal<T extends Record<string, any>>({
    isOpen,
    title,
    formData,
    fields,
    onClose,
    onSave,
    onChange,
}: EditModalProps<T>) {
    if (!isOpen) return null;

    const renderField = (field: FormField) => {
        const value = formData[field.key as keyof T] || '';

        const inputStyle = {
            width: '100%',
            padding: '0.5rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            backgroundColor: field.readOnly ? '#f3f4f6' : 'white',
        };

        switch (field.type) {
            case 'textarea':
                return (
                    <textarea
                        value={String(value)}
                        onChange={(e) => onChange(field.key as keyof T, e.target.value)}
                        rows={field.rows || 4}
                        disabled={field.readOnly}
                        placeholder={field.placeholder}
                        style={{
                            ...inputStyle,
                            fontFamily: 'monospace',
                            fontSize: '0.875rem',
                        }}
                    />
                );

            case 'select':
                return (
                    <select
                        value={String(value)}
                        onChange={(e) => onChange(field.key as keyof T, e.target.value)}
                        disabled={field.readOnly}
                        style={inputStyle}
                    >
                        {field.options?.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                );

            case 'number':
                return (
                    <input
                        type="number"
                        value={String(value)}
                        onChange={(e) => onChange(field.key as keyof T, parseInt(e.target.value) || 0)}
                        disabled={field.readOnly}
                        placeholder={field.placeholder}
                        style={inputStyle}
                    />
                );

            case 'date':
                return (
                    <input
                        type="datetime-local"
                        value={String(value)}
                        onChange={(e) => onChange(field.key as keyof T, e.target.value)}
                        disabled={field.readOnly}
                        style={inputStyle}
                    />
                );

            default: // text
                return (
                    <input
                        type="text"
                        value={String(value)}
                        onChange={(e) => onChange(field.key as keyof T, e.target.value)}
                        disabled={field.readOnly}
                        placeholder={field.placeholder}
                        style={inputStyle}
                    />
                );
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: 'white',
                    borderRadius: '0.5rem',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    maxWidth: '42rem',
                    width: '100%',
                    margin: '0 1rem',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ padding: '1.5rem' }}>
                    <h2
                        style={{
                            fontSize: '1.25rem',
                            fontWeight: 'bold',
                            marginBottom: '1rem',
                        }}
                    >
                        {title}
                    </h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {fields.map((field) => (
                            <div key={field.key}>
                                <label
                                    style={{
                                        display: 'block',
                                        fontSize: '0.875rem',
                                        fontWeight: 500,
                                        color: '#374151',
                                        marginBottom: '0.25rem',
                                    }}
                                >
                                    {field.label}
                                    {field.readOnly && ' (Read-only)'}
                                </label>
                                {renderField(field)}
                            </div>
                        ))}
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '0.75rem',
                            marginTop: '1.5rem',
                        }}
                    >
                        <button
                            onClick={onClose}
                            style={{
                                padding: '0.5rem 1rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.375rem',
                                backgroundColor: 'white',
                                cursor: 'pointer',
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onSave}
                            style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: '#2563eb',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                            }}
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EditModal;