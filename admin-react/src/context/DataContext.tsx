import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
    useMemo,
    useCallback,
} from "react";
import type { UserRow, RealmRow, AppRow } from "../types";

type Severity = "good" | "warn" | "bad" | "info";

interface SecurityPosture {
    pendingUsers: number;
    inactiveUsers: number;
    nonActiveRealms: number;
    disabledApps: number;
    publicClients: number;
    totalAuditEvents: number;
    overall: Severity;
}

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
    weatherData: WeatherData | null;
    totalUsers: UserRow[];
    totalRealms: RealmRow[];
    totalApps: AppRow[];

    loading: boolean;
    error: string | null;

    setTotalUsers: React.Dispatch<React.SetStateAction<UserRow[]>>;
    setTotalRealms: React.Dispatch<React.SetStateAction<RealmRow[]>>;
    setTotalApps: React.Dispatch<React.SetStateAction<AppRow[]>>;

    refreshData: () => Promise<void>;
    securityPosture: SecurityPosture;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

interface DataProviderProps {
    children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [totalUsers, setTotalUsers] = useState<UserRow[]>([]);
    const [totalRealms, setTotalRealms] = useState<RealmRow[]>([]);
    const [totalApps, setTotalApps] = useState<AppRow[]>([]);

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const weatherRes = await fetch("/ui/maps/WeatherData");
            if (weatherRes.ok) {
                const weatherApiData: WeatherData = await weatherRes.json();
                setWeatherData(weatherApiData);
            } else {
                setWeatherData(null);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unknown error";
            setError(errorMessage);
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllData();
    }, []);

    const securityPosture = useMemo<SecurityPosture>(() => {
        const users = totalUsers ?? [];
        const realms = totalRealms ?? [];
        const apps = totalApps ?? [];

        const pendingUsers = users.filter((u) => u.status === "Pending").length;
        const inactiveUsers = users.filter((u) => u.status === "Inactive").length;

        const nonActiveRealms = realms.filter((r) => r.status !== "Active").length;

        const disabledApps = apps.filter((a) => a.enabled === false).length;
        const publicClients = apps.filter((a) => a.publicClient === true).length;

        const totalAuditEvents = 8;

        const overall: Severity =
            pendingUsers > 0 || nonActiveRealms > 0
                ? "warn"
                : disabledApps > 0 || publicClients > 0
                    ? "info"
                    : "good";

        return {
            pendingUsers,
            inactiveUsers,
            nonActiveRealms,
            disabledApps,
            publicClients,
            totalAuditEvents,
            overall,
        };
    }, [totalUsers, totalRealms, totalApps]);

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
        securityPosture,
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = (): DataContextType => {
    const context = useContext(DataContext);
    if (!context) throw new Error("useData must be used within a DataProvider");
    return context;
};

export type { WeatherData, WeatherForecast };