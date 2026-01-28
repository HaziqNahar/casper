
import type { FormField } from './EditModal';

interface ViewModalProps<T> {
    isOpen: boolean;
    title: string;
    data: T;
    fields: FormField[];
    onClose: () => void;
}

function ViewModal<T extends Record<string, any>>({
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
            style={{
                position: 'fixed',
                inset: 0,
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
                    maxWidth: '48rem',
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
                            marginBottom: '0.5rem',
                        }}
                    >
                        {title}
                    </h2>
                    <p
                        style={{
                            fontSize: '0.875rem',
                            color: '#6b7280',
                            marginBottom: '1.25rem',
                        }}
                    >
                        Read-only view of record details
                    </p>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                            gap: '1rem',
                        }}
                    >
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
                                    style={{
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '0.5rem',
                                        padding: '0.75rem 0.9rem',
                                        backgroundColor: '#f9fafb',
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            color: '#6b7280',
                                            marginBottom: '0.35rem',
                                        }}
                                    >
                                        {field.label}
                                    </div>
                                    {isMultiline ? (
                                        <pre
                                            style={{
                                                margin: 0,
                                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                                fontSize: '0.75rem',
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-word',
                                                maxHeight: '200px',
                                                overflowY: 'auto',
                                            }}
                                        >
                                            {value}
                                        </pre>
                                    ) : (
                                        <div
                                            style={{
                                                fontSize: '0.875rem',
                                                color: '#111827',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                            title={value}
                                        >
                                            {value}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            marginTop: '1.5rem',
                        }}
                    >
                        <button
                            onClick={onClose}
                            style={{
                                padding: '0.5rem 1.25rem',
                                borderRadius: '0.375rem',
                                border: '1px solid #d1d5db',
                                backgroundColor: 'white',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ViewModal;
