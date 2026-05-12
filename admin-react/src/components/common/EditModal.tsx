import SearchableCombobox from "./SearchableCombobox";

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
    onChange: (field: keyof T, value: unknown) => void;  // Called when any field changes
}


function EditModal<T extends Record<string, unknown>>({
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
        const inputClassName = `recordModal-input${field.readOnly ? " is-readOnly" : ""}`;

        switch (field.type) {
            case 'textarea':
                return (
                    <textarea
                        value={String(value)}
                        onChange={(e) => onChange(field.key as keyof T, e.target.value)}
                        rows={field.rows || 4}
                        disabled={field.readOnly}
                        placeholder={field.placeholder}
                        className={`${inputClassName} recordModal-textarea`}
                    />
                );

            case 'select':
                return (
                    <SearchableCombobox
                        value={String(value)}
                        onChange={(next) => onChange(field.key as keyof T, next)}
                        disabled={field.readOnly}
                        options={field.options ?? []}
                        placeholder={field.placeholder ?? `Select ${field.label}`}
                        inputClassName={inputClassName}
                    />
                );

            case 'number':
                return (
                    <input
                        type="number"
                        value={String(value)}
                        onChange={(e) => onChange(field.key as keyof T, parseInt(e.target.value) || 0)}
                        disabled={field.readOnly}
                        placeholder={field.placeholder}
                        className={inputClassName}
                    />
                );

            case 'date':
                return (
                    <input
                        type="datetime-local"
                        value={String(value)}
                        onChange={(e) => onChange(field.key as keyof T, e.target.value)}
                        disabled={field.readOnly}
                        className={inputClassName}
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
                        className={inputClassName}
                    />
                );
        }
    };

    return (
        <div
            className="recordModal-overlay"
            onClick={onClose}
        >
            <div
                className="recordModal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={title}
            >
                <div className="recordModal-header">
                    <div>
                        <h2 className="recordModal-title">{title}</h2>
                        <p className="recordModal-subtitle">Update the selected record fields below.</p>
                    </div>
                </div>

                <div className="recordModal-body">
                    <div className="recordModal-formStack">
                        {fields.map((field) => (
                            <div key={field.key} className="recordModal-field">
                                <label className="recordModal-label">
                                    {field.label}
                                    {field.readOnly && <span className="recordModal-labelHint">Read-only</span>}
                                </label>
                                {renderField(field)}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="recordModal-footer">
                    <button onClick={onClose} className="kc-btn kc-btn-ghost">
                        Cancel
                    </button>
                    <button onClick={onSave} className="kc-btn kc-btn-primary">
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}

export default EditModal;