import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type {
    Users,
    Apps,
    Realms
} from '../types';
// ==========================================
// TYPES
// ==========================================

interface WeatherForecast {
    areaId: number;
    areaName: string;
    lat: number;
    lng: number;
    forecast: string;
    updateTimestamp: string;
    dataTimestamp: string;
    validStart: string;
    validEnd: string;
    validText: string;
}

interface WeatherData {
    lastUpdated: string | null;
    validPeriod: string | null;
    forecasts: WeatherForecast[];
}

interface DataContextType {
    // Data
    weatherData: WeatherData | null;
    totalUsers: Users[];
    totalRealms: Realms[];
    totalApps: Apps[];

    // Loading states
    loading: boolean;
    error: string | null;

    // Setters for data updates
    setTotalUsers: React.Dispatch<React.SetStateAction<Users[]>>;
    setTotalRealms: React.Dispatch<React.SetStateAction<Realms[]>>;
    setTotalApps: React.Dispatch<React.SetStateAction<Apps[]>>;
    // Refresh function
    refreshData: () => Promise<void>;
}

// ==========================================
// CONTEXT
// ==========================================

const DataContext = createContext<DataContextType | undefined>(undefined);

// ==========================================
// PROVIDER COMPONENT
// ==========================================

interface DataProviderProps {
    children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
    // Data state
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);

    // Loading states
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Data state
    const [totalUsers, setTotalUsers] = useState<Users[]>([]);
    const [totalRealms, setTotalRealms] = useState<Realms[]>([]);
    const [totalApps, setTotalApps] = useState<Apps[]>([]);

    // Fetch data function
    const fetchAllData = async () => {
        setLoading(true);
        setError(null);

        try {
            const weatherRes = await fetch('/ui/maps/WeatherData');
            if (weatherRes.ok) {
                const weatherApiData: WeatherData = await weatherRes.json();
                setWeatherData(weatherApiData);
            } else {
                setWeatherData(null);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchAllData();
    }, []);

    const value: DataContextType = {
        weatherData,
        totalUsers,
        totalRealms,
        totalApps,
        loading,
        error,
        setTotalUsers,
        setTotalRealms,
        setTotalApps,
        refreshData: fetchAllData,
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

// ==========================================
// HOOK
// ==========================================

export const useData = (): DataContextType => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

export type { WeatherData, WeatherForecast };