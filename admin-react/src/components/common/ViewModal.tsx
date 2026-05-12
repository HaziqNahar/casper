
import type { FormField } from './EditModal';

interface ViewModalProps<T> {
    isOpen: boolean;
    title: string;
    data: T;
    fields: FormField[];
    onClose: () => void;
}

function ViewModal<T extends Record<string, unknown>>({
    isOpen,
    title,
    data,
    fields,
    onClose,
}: ViewModalProps<T>) {
    if (!isOpen) return null;

    const formatValue = (value: unknown): string => {
        if (value === null || value === undefined || value === '') return '[Null]';
        if (typeof value === 'string') return value;
        if (typeof value === 'number' || typeof value === 'boolean') return String(value);
        if (typeof value === 'object') {
            try {
                return JSON.stringify(value, null, 2);
            } catch {
                return String(value);
            }
        }
        return String(value);
    };

    return (
        <div
            className="recordModal-overlay"
            onClick={onClose}
        >
            <div
                className="recordModal recordModal--wide"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={title}
            >
                <div className="recordModal-header">
                    <div>
                        <h2 className="recordModal-title">{title}</h2>
                        <p className="recordModal-subtitle">Read-only view of record details.</p>
                    </div>
                </div>

                <div className="recordModal-body">
                    <div className="recordModal-detailGrid">
                        {fields.map((field) => {
                            const rawValue = data[field.key as keyof T];
                            const value = formatValue(rawValue);

                            const isMultiline =
                                field.type === 'textarea' ||
                                value.includes('\n') ||
                                value.length > 80;

                            return (
                                <div
                                    key={field.key}
                                    className="recordModal-detailCard"
                                >
                                    <div className="recordModal-detailLabel">
                                        {field.label}
                                    </div>
                                    {isMultiline ? (
                                        <pre className="recordModal-detailPre">
                                            {value}
                                        </pre>
                                    ) : (
                                        <div
                                            className="recordModal-detailValue"
                                            title={value}
                                        >
                                            {value}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="recordModal-footer">
                    <button onClick={onClose} className="kc-btn kc-btn-ghost">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ViewModal;