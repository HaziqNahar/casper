import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileText,
    Users,
    AlertTriangle,
    Activity,
    Globe,
    UserPlus,
    PlusCircle,
    SquarePlus,
    ScrollText,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { ROUTES } from '../config/routes';

// ==========================================
// STAT CARD COMPONENT
// ==========================================

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    icon,
    color,
    onClick
}) => {
    return (
        <div
            className="stat-card"
            onClick={onClick}
            style={{
                borderRadius: '1rem',
                padding: '1.25rem',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={(e) => {
                if (!onClick) return;
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow =
                    '0 14px 40px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.45)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow =
                    '0 10px 30px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.35)';
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <p style={{
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: '#000000',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        margin: 0
                    }}>
                        {title}
                    </p>
                    <p style={{
                        fontSize: '1.75rem',
                        fontWeight: 700,
                        color: '#000000',
                        margin: '0.5rem 0 0 0'
                    }}>
                        {value}
                    </p>
                </div>
                <div style={{
                    width: '3rem',
                    height: '3rem',
                    borderRadius: '0.75rem',
                    background: 'rgba(255,255,255,0.22)',
                    backdropFilter: 'blur(10px) saturate(140%)',
                    WebkitBackdropFilter: 'blur(10px) saturate(140%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color,
                    boxShadow: '0 8px 18px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.35)',
                }}>
                    {icon}
                </div>
            </div>
        </div>
    );
};

// ==========================================
// RECENT ACTIVITY ITEM
// ==========================================

interface ActivityItem {
    id: string;
    type: 'case' | 'warden' | 'alert' | 'system';
    title: string;
    description: string;
    time: string;
}

const ActivityIcon: React.FC<{ type: ActivityItem["type"] }> = ({ type }) => {
    switch (type) {
        case "case": return <FileText />;
        case "warden": return <Users />;
        case "alert": return <AlertTriangle />;
        default: return <Activity />;
    }
};

const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
        case 'case':
            return {
                bg: 'rgba(59, 130, 246, 0.14)',   // soft blue
                color: '#2563eb'
            };

        case 'warden':
            return {
                bg: 'rgba(16, 185, 129, 0.14)',   // soft green
                color: '#059669'
            };

        case 'alert':
            return {
                bg: 'rgba(245, 158, 11, 0.16)',   // soft amber
                color: '#d97706'
            };

        case 'system':
        default:
            return {
                bg: 'rgba(107, 114, 128, 0.14)',  // soft gray
                color: '#6b7280'
            };
    }
};

// ==========================================
// QUICK ACTION BUTTON
// ==========================================

type QuickActionProps = {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    color: string;   // icon color
    bgColor: string; // icon background
};

const QuickAction: React.FC<QuickActionProps> = ({ icon, label, onClick, color, bgColor }) => (
    <button
        type="button"
        className="dash-qaBtn"
        onClick={onClick}
        style={{ borderColor: "rgba(229,231,235,0.45)" }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = color)}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(229,231,235,0.45)")}
    >
        <div className="dash-qaIcon" style={{ backgroundColor: bgColor, color }}>
            {icon}
        </div>
        <span className="dash-qaLabel">{label}</span>
    </button>
);

// ==========================================
// HOME PAGE COMPONENT
// ==========================================

const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const { totalUsers, totalRealms, loading } = useData();

    // Mock activity data
    const recentActivity: ActivityItem[] = [
        {
            id: '1',
            type: 'case',
            title: 'App Created',
            description: 'App Created in Realm 1',
            time: '5 mins ago'
        },
        {
            id: '2',
            type: 'warden',
            title: 'User Status Update',
            description: 'User granted access to App 1',
            time: '12 mins ago'
        },
    ];

    return (
        <div style={{ width: '100%', maxWidth: '100%' }}>
            {/* Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem',
            }}>
                <StatCard
                    title="Total Users"
                    value={loading ? '...' : totalUsers.length}
                    icon={<Users size={24} />}
                    color="#2563eb"
                    bgColor="#dbeafe"
                    onClick={() => navigate(ROUTES.USERS)}
                />
                <StatCard
                    title="Total Realms"
                    value={loading ? '...' : totalRealms.length}
                    icon={<Globe size={24} />}
                    color="#d97706"
                    bgColor="#fef3c7"
                    onClick={() => navigate(ROUTES.REALMS)}
                />
                <StatCard
                    title="Audit Logs"
                    value={8}
                    icon={<ScrollText size={24} />}
                    color="#059669"
                    bgColor="#d1fae5"
                    onClick={() => navigate(ROUTES.AUDIT_LOGS)}
                />
            </div>

            {/* Main Content Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 400px)',
                gap: '1.5rem',
                width: '100%',
            }}>
                {/* Left Column - Quick Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
                    {/* Quick Actions */}
                    <div className="glass-surface glass-surface--soft" style={{ padding: "1.25rem", height: "fit-content", minWidth: 0 }}>
                        <h3 className="dash-sectionTitle">
                            Quick Actions
                        </h3>
                        <div className="dash-quickRow">

                            <QuickAction
                                icon={<UserPlus size={20} />}
                                label="Create User"
                                onClick={() => navigate(ROUTES.CREATE_USER)}
                                color="#2563eb"
                                bgColor="#dbeafe"
                            />
                            <QuickAction
                                icon={<SquarePlus size={20} />}
                                label="Register Application"
                                onClick={() => navigate(ROUTES.REGISTER_APPS)}
                                color="#7c3aed"
                                bgColor="#ede9fe"
                            />
                            <QuickAction
                                icon={<PlusCircle size={20} />}
                                label="Manage Realms"
                                onClick={() => navigate(ROUTES.MANAGE_REALMS)}
                                color="#d97706"
                                bgColor="#fef3c7"
                            />
                        </div>
                    </div>
                </div>

                {/* Right Column - Recent Activity */}
                <div className="glass-surface glass-surface--soft" style={{ padding: "1.25rem", height: "fit-content", minWidth: 0 }}>
                    <div className="dash-sectionHead">
                        <h3 className="dash-sectionTitle">
                            Recent Activity
                        </h3>
                        <button className="dash-linkBtn">
                            View All
                        </button>
                    </div>

                    <div className="dash-activityList">
                        {recentActivity.map((activity) => {
                            const colors = getActivityColor(activity.type);

                            return (
                                <div key={activity.id} className="dash-activityItem">
                                    <div className={`dash-activityIcon is-${activity.type}`}>
                                        <ActivityIcon type={activity.type} />
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="dash-activityTitle">{activity.title}</div>
                                        <div className="dash-activityDesc">{activity.description}</div>
                                        <div className="dash-activityTime">{activity.time}</div>
                                    </div>
                                </div>
                            );
                        })}

                    </div>
                </div>
            </div>
        </div>
    );
}

export default HomePage;