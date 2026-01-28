import React from 'react';
import TabHeader from './TabHeader';
import type { Tab } from '../../../hooks/useTabs';

export interface TabPanelProps {
    tabs: Tab[];
    activeTab: number;
    onSelect: (index: number) => void;
    onAdd: () => void;
    onClose: (index: number) => void;
    onReorder: (sourceIndex: number, destIndex: number) => void;
    onRefresh?: () => void;
    onFilterToggle?: () => void;
    isFilterOpen?: boolean;
    showActions?: boolean;
    addButtonLabel?: string;
    children?: React.ReactNode;
    renderContent?: (tab: Tab, index: number) => React.ReactNode;
    className?: string;
    contentClassName?: string;
    minHeight?: string;
    /** Custom actions to render in place of default refresh/filter buttons */
    customActions?: React.ReactNode;
}

export const TabPanel: React.FC<TabPanelProps> = ({
    tabs,
    activeTab,
    onSelect,
    onAdd,
    onClose,
    onReorder,
    onRefresh,
    onFilterToggle,
    isFilterOpen = false,
    showActions = true,
    addButtonLabel,
    children,
    renderContent,
    className = '',
    contentClassName = '',
    minHeight = '400px',
    customActions,
}) => {
    const activeTabData = tabs[activeTab];

    // Determine content to render
    const content = () => {
        if (tabs.length === 0) {
            return (
                <div className="browser-tabs-empty">
                    <p>No tabs open</p>
                    <button onClick={onAdd} className="browser-tabs-empty-btn">
                        Create a new tab
                    </button>
                </div>
            );
        }

        // If renderContent prop is provided, use it
        if (renderContent && activeTabData) {
            return renderContent(activeTabData, activeTab);
        }

        // If children provided, render them
        if (children) {
            return children;
        }

        // Default: render tab's content property
        return activeTabData?.content || (
            <div className="browser-tabs-empty">
                <p>No content available</p>
            </div>
        );
    };

    return (
        <div className={`browser-tabs-panel ${className}`}>
            <TabHeader
                tabs={tabs}
                activeTab={activeTab}
                onSelect={onSelect}
                onAdd={onAdd}
                onClose={onClose}
                onReorder={onReorder}
                onRefresh={onRefresh}
                onFilterToggle={onFilterToggle}
                isFilterOpen={isFilterOpen}
                showActions={showActions}
                addButtonLabel={addButtonLabel}
                customActions={customActions}
            />
            <div
                className={`browser-tabs-content ${contentClassName}`}
                role="tabpanel"
                style={{ minHeight }}
            >
                {/* Key forces re-mount on tab change, triggering animation */}
                <div
                    key={activeTabData?.id || activeTab}
                    className="tab-content-animated"
                >
                    {content()}
                </div>
            </div>
        </div>
    );
};

export default TabPanel;