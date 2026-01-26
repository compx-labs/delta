/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState } from 'react';

export interface StepInfo {
    id: string;
    name: string;
    description: string;
}

interface ToastContextInterface {
    toast: ToastInterface;
    toastVisible: boolean;
    openToast: (toast: ToastInterface) => void;
    closeToast: () => void;
    setToastContent: (toast: ToastInterface) => void;
    // New multi-step methods
    openMultiStepToast: (message: string, steps: StepInfo[]) => void;
    updateStep: (stepId: string) => void;
    completeMultiStep: (successMessage?: string) => void;
    failMultiStep: (errorMessage: string) => void;
}

export interface ToastInterface {
    type: 'success' | 'loading' | 'error' | 'multi-step' | 'reward' | null;
    message: string;
    description: string | null;
    // New multi-step properties
    steps?: StepInfo[];
    currentStepId?: string;
    currentStepIndex?: number;
    isMultiStep?: boolean;
}

const ToastContext = createContext<ToastContextInterface | undefined>(
    undefined
);

const ToastProvider = ({ children }: { children: ReactNode }) => {
    const [toast, setToast] = useState<ToastInterface>({
        type: null,
        message: '',
        description: null,
    });
    const [toastVisible, setToastVisible] = useState(false);
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const openToast = (toast: ToastInterface) => {
        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        setToast(toast);
        setToastVisible(true);

        if (toast.type === 'success' || toast.type === 'error') {
            timeoutRef.current = setTimeout(() => {
                setToastVisible(false);
                timeoutRef.current = null;
            }, 5000);
        }
    };

    const setToastContent = (toast: ToastInterface) => {
        setToast(toast);
    };

    const closeToast = () => {
        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setToast({ type: null, message: '', description: null });
        setToastVisible(false);
    };

    // New multi-step methods
    const openMultiStepToast = (message: string, steps: StepInfo[]) => {
        setToast({
            type: 'multi-step',
            message,
            description: steps[0]?.description || null,
            steps,
            currentStepId: steps[0]?.id,
            currentStepIndex: 0,
            isMultiStep: true,
        });
        setToastVisible(true);
    };

    const updateStep = (stepId: string) => {
        setToast(prev => {
            if (!prev.steps) return prev;
            
            const stepIndex = prev.steps.findIndex(step => step.id === stepId);
            if (stepIndex === -1) return prev;
            
            const currentStep = prev.steps[stepIndex];
            
            return {
                ...prev,
                currentStepId: stepId,
                currentStepIndex: stepIndex,
                description: currentStep.description,
            };
        });
    };

    const completeMultiStep = (successMessage?: string) => {
        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        setToast(prev => ({
            ...prev,
            type: 'success',
            message: successMessage || 'Process completed successfully',
            description: null,
            isMultiStep: false,
        }));
        
        timeoutRef.current = setTimeout(() => {
            setToastVisible(false);
            timeoutRef.current = null;
        }, 5000);
    };

    const failMultiStep = (errorMessage: string) => {
        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        setToast(prev => ({
            ...prev,
            type: 'error',
            message: errorMessage,
            description: null,
            isMultiStep: false,
        }));
        
        timeoutRef.current = setTimeout(() => {
            setToastVisible(false);
            timeoutRef.current = null;
        }, 5000);
    };

    return (
        <ToastContext.Provider
            value={{
                toast,
                toastVisible,
                openToast,
                closeToast,
                setToastContent,
                openMultiStepToast,
                updateStep,
                completeMultiStep,
                failMultiStep,
            }}
        >
            {children}
        </ToastContext.Provider>
    );
};

const useToast = (): ToastContextInterface => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export { ToastProvider, useToast };
