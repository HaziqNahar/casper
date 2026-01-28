import React from "react";
import {
    DragDropContext,
    Droppable,
    Draggable,
    DropResult,
} from "@hello-pangea/dnd";
import { X, Plus, RefreshCw, Filter } from 'lucide-react';
import type { Tab } from '../../../hooks/useTabs';

export interface TabHeaderProps {
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
    /** Custom actions to render in place of default refresh/filter buttons */
    customActions?: React.ReactNode;
}

export const TabHeader: React.FC<TabHeaderProps> = ({
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
    customActions,
}) => {
    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        onReorder(result.source.index, result.destination.index);
    };

    const handleFilterClick = () => {
        if (onFilterToggle) {
            onFilterToggle();
        }
    };

    return (
        <div className="browser-tabs-container">
            <div className="browser-tabs-scroll-wrapper">
                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="tabs" direction="horizontal">
                        {(provided) => (
                            <div
                                className="browser-tabs-header"
                                role="tablist"
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                            >
                                {tabs.map((tab, index) => (
                                    <Draggable
                                        key={tab.id}
                                        draggableId={String(tab.id)}
                                        index={index}
                                    >
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                role="tab"
                                                aria-selected={activeTab === index}
                                                tabIndex={0}
                                                className={`browser-tab ${activeTab === index ? 'active' : ''} ${snapshot.isDragging ? 'dragging' : ''}`}
                                                onClick={() => onSelect(index)}
                                                onKeyDown={(e) => e.key === "Enter" && onSelect(index)}
                                            >
                                                <span className="browser-tab-title">{tab.title}</span>
                                                {tab.closable !== false && (
                                                    <button
                                                        className="browser-tab-close"
                                                        aria-label={`Close ${tab.title}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onClose(index);
                                                        }}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}

                                {/* Add Tab Button */}
                                <button
                                    className="browser-tab-add"
                                    aria-label="Add new tab"
                                    onClick={onAdd}
                                    title={addButtonLabel || "Add new tab"}
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </div>

            {/* Action Bar */}
            {showActions && (
                <div className="browser-tabs-actions">
                    {customActions ? (
                        // Render custom actions if provided
                        customActions
                    ) : (
                        // Default actions: Refresh and Filter
                        <>
                            {onRefresh && (
                                <button
                                    className="browser-tabs-action-btn"
                                    onClick={onRefresh}
                                    title="Refresh"
                                >
                                    <RefreshCw size={16} />
                                </button>
                            )}

                            {onFilterToggle && (
                                <button
                                    className={`browser-tabs-action-btn ${isFilterOpen ? 'active' : ''}`}
                                    onClick={handleFilterClick}
                                    title="Toggle Filter Panel"
                                >
                                    <Filter size={16} />
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default TabHeader;