import React from "react";
import type { RegistrationStep } from "../../types/applicationRegistration.types";

interface Props {
    currentStep: RegistrationStep;
    onStepClick?: (step: RegistrationStep) => void;
}

const steps: Array<{ id: RegistrationStep; label: string }> = [
    { id: 1, label: "Basics" },
    { id: 2, label: "Auth Setup" },
    { id: 3, label: "Security" },
    { id: 4, label: "Review" }
];

const ApplicationRegistrationStepper: React.FC<Props> = ({ currentStep, onStepClick }) => {
    return (
        <div className="kc-stepperCard">
            <div className="kc-stepper">
                {steps.map((step, index) => {
                    const isActive = step.id === currentStep;
                    const isComplete = step.id < currentStep;

                    return (
                        <React.Fragment key={step.id}>
                            <div
                                className={[
                                    "kc-stepperItem",
                                    isActive ? "is-active" : "",
                                    isComplete ? "is-complete" : ""
                                ].join(" ")}
                                role={onStepClick ? "button" : undefined}
                                tabIndex={onStepClick ? 0 : undefined}
                                onClick={() => onStepClick?.(step.id)}
                                onKeyDown={(event) => {
                                    if (!onStepClick) return;
                                    if (event.key === "Enter" || event.key === " ") {
                                        event.preventDefault();
                                        onStepClick(step.id);
                                    }
                                }}
                            >
                                <div className="kc-stepperIndex">
                                    {isComplete ? "OK" : step.id}
                                </div>
                                <div className="kc-stepperLabel">{step.label}</div>
                            </div>

                            {index < steps.length - 1 && <div className="kc-stepperArrow">{">"}</div>}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

export default ApplicationRegistrationStepper;