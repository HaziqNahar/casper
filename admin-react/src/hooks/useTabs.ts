import { useState, useEffect } from "react";

export interface Tab {
  id: string | number;
  title: string;
  content?: any; // Can be ReactNode or custom data (e.g., CaseData)
  type?: string; // e.g., 'active-cases', 'search-cases', 'case-detail', etc.
  closable?: boolean;
}

export interface UseTabsOptions {
  storageKey?: string;
  defaultTabs?: Tab[];
}

export interface UseTabsReturn {
  tabs: Tab[];
  activeTab: number;
  setActiveTab: (index: number) => void;
  addTab: (tab?: Partial<Tab>) => void;
  closeTab: (index: number) => void;
  updateTab: (index: number, updates: Partial<Tab>) => void;
  getActiveTabData: () => Tab | undefined;
}

const DEFAULT_TABS: Tab[] = [
  { id: "active-cases", title: "Active Cases", type: "active-cases", closable: false },
];

export function useTabs(options: UseTabsOptions = {}): UseTabsReturn {
  const { storageKey = "ces-ccms-tabs", defaultTabs = DEFAULT_TABS } = options;

  // Initialize tabs from localStorage
  const [tabs, setTabs] = useState<Tab[]>(() => {
    try {
      const savedTabsRaw = localStorage.getItem(storageKey);
      if (savedTabsRaw) {
        const savedTabs = JSON.parse(savedTabsRaw);
        if (Array.isArray(savedTabs) && savedTabs.length > 0) {
          const defaultTypes = new Set(
            (defaultTabs ?? [])
              .map((t) => t.type)
              .filter((t): t is string => typeof t === "string" && t.length > 0)
          );

          if (defaultTypes.size > 0) {
            const hasKnownType = savedTabs.some(
              (t) => t && typeof t === "object" && defaultTypes.has((t as Tab).type ?? "")
            );

            if (!hasKnownType) {
              return defaultTabs;
            }
          }

          return savedTabs;
        }
      }
    } catch (e) {
      console.error("Failed to parse saved tabs", e);
    }
    return defaultTabs;
  });

  // Initialize activeTab from localStorage
  const [activeTab, setActiveTab] = useState<number>(() => {
    try {
      const savedActiveRaw = localStorage.getItem(`${storageKey}-active`);
      if (savedActiveRaw) {
        const savedActive = JSON.parse(savedActiveRaw);
        if (typeof savedActive === "number") {
          return savedActive;
        }
      }
    } catch (e) {
      console.error("Failed to parse saved activeTab", e);
    }
    return 0;
  });

  // Persist to localStorage whenever things change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(tabs));
      localStorage.setItem(`${storageKey}-active`, JSON.stringify(activeTab));
    } catch (e) {
      console.error("Failed to save tabs/activeTab", e);
    }
  }, [tabs, activeTab, storageKey]);

  // Add a new tab
  const addTab = (tab?: Partial<Tab>) => {
    setTabs((prev) => {
      const id = tab?.id ?? Date.now();

      const existingIndex = prev.findIndex((t) => t.id === id);
      if (existingIndex !== -1) {
        setActiveTab(existingIndex);
        return prev;
      }

      const newTab: Tab = {
        id,
        title: tab?.title || `Tab ${prev.length + 1}`,
        content: tab?.content,
        type: tab?.type || "custom",
        closable: tab?.closable !== undefined ? tab.closable : true,
      };

      const updated = [...prev, newTab];
      setActiveTab(updated.length - 1);
      return updated;
    });
  };

  // Close a tab at a given index
  const closeTab = (index: number) => {
    const tabToClose = tabs[index];

    // Don't close non-closable tabs
    if (tabToClose?.closable === false) {
      return;
    }

    setTabs((prevTabs) => {
      const updated = prevTabs.filter((_, i) => i !== index);

      setActiveTab((prevActive) => {
        if (updated.length === 0) return 0;
        if (prevActive === index) {
          return Math.min(index, updated.length - 1);
        }
        if (prevActive > index) {
          return prevActive - 1;
        }
        return prevActive;
      });

      return updated;
    });
  };

  // Update a specific tab
  const updateTab = (index: number, updates: Partial<Tab>) => {
    setTabs((prevTabs) => {
      const updated = [...prevTabs];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
  };

  // Get the currently active tab data
  const getActiveTabData = (): Tab | undefined => {
    return tabs[activeTab];
  };

  return {
    tabs,
    activeTab,
    setActiveTab,
    addTab,
    closeTab,
    updateTab,
    getActiveTabData,
  };
}