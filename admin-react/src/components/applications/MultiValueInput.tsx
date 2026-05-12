import React, { useState } from "react";
import { Plus, X } from "lucide-react";

interface MultiValueInputProps {
    label: string;
    placeholder?: string;
    values: string[];
    onChange: (values: string[]) => void;
    helperText?: string;
}

const MultiValueInput: React.FC<MultiValueInputProps> = ({
    label,
    placeholder,
    values,
    onChange,
    helperText
}) => {
    const [input, setInput] = useState("");

    const addValue = () => {
        const trimmed = input.trim();
        if (!trimmed) return;
        if (values.includes(trimmed)) {
            setInput("");
            return;
        }
        onChange([...values, trimmed]);
        setInput("");
    };

    const removeValue = (value: string) => {
        onChange(values.filter((v) => v !== value));
    };

    const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addValue();
        }
    };

    return (
        <div className="kc-formField">
            <label className="kc-label">{label}</label>

            <div className="kc-multiValueRow">
                <input
                    className="kc-input"
                    value={input}
                    placeholder={placeholder}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                />
                <button type="button" className="kc-btn kc-btn-secondary" onClick={addValue}>
                    <Plus size={16} />
                    Add
                </button>
            </div>

            {helperText && <div className="kc-helperText">{helperText}</div>}

            {values.length > 0 && (
                <div className="kc-chipList">
                    {values.map((value) => (
                        <div key={value} className="kc-chip">
                            <span>{value}</span>
                            <button
                                type="button"
                                className="kc-chipRemove"
                                onClick={() => removeValue(value)}
                                aria-label={`Remove ${value}`}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MultiValueInput;