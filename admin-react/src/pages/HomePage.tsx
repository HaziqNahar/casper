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

const ActivityIcon: React.FC<{ type: string }> = ({ type }) => {
    const iconProps = { size: 16 };

    switch (type) {
        case 'case':
            return <FileText {...iconProps} />;
        case 'warden':
            return <Users {...iconProps} />;
        case 'alert':
            return <AlertTriangle {...iconProps} />;
        default:
            return <Activity {...iconProps} />;
    }
};

const getActivityColor = (type: string) => {
    switch (type) {
        case 'case':
            return { bg: '#dbeafe', color: '#2563eb' };
        case 'warden':
            return { bg: '#d1fae5', color: '#059669' };
        case 'alert':
            return { bg: '#fef3c7', color: '#d97706' };
        default:
            return { bg: '#f3f4f6', color: '#000000' };
    }
};

// ==========================================
// QUICK ACTION BUTTON
// ==========================================

interface QuickActionProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    color: string;
    bgColor: string;
}

const QuickAction: React.FC<QuickActionProps> = ({ icon, label, onClick, color, bgColor }) => (
    <button
        onClick={onClick}
        style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '1rem',
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(15px)',
            WebkitBackdropFilter: 'blur(15px)',
            border: '1px solid rgba(229, 231, 235, 0.4)',
            borderRadius: '0.75rem',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            minWidth: '100px',
            fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
            e.currentTarget.style.backdropFilter = 'blur(20px)';
            e.currentTarget.style.WebkitBackdropFilter = 'blur(20px)';
            e.currentTarget.style.borderColor = color;
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.12)';
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
            e.currentTarget.style.backdropFilter = 'blur(15px)';
            e.currentTarget.style.WebkitBackdropFilter = 'blur(15px)';
            e.currentTarget.style.borderColor = 'rgba(229, 231, 235, 0.4)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
        }}
    >
        <div style={{
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: '0.5rem',
            backgroundColor: bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: color
        }}>
            {icon}
        </div>
        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#000000' }}>
            {label}
        </span>
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
                    onClick={() => navigate(ROUTES.USERS_ALL)}
                />
                <StatCard
                    title="Total Realms"
                    value={loading ? '...' : totalRealms.length}
                    icon={<Globe size={24} />}
                    color="#d97706"
                    bgColor="#fef3c7"
                    onClick={() => navigate(ROUTES.REALMS_ALL)}
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
                        <h3 style={{
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: '#000000',
                            margin: '0 0 1rem 0'
                        }}>
                            Quick Actions
                        </h3>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
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
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1rem'
                    }}>
                        <h3 style={{
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: '#000000',
                            margin: 0
                        }}>
                            Recent Activity
                        </h3>
                        <button
                            style={{
                                fontSize: '0.75rem',
                                color: '#2563eb',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 500,
                                fontFamily: 'inherit',
                            }}
                        >
                            View All
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {recentActivity.map((activity) => {
                            const colors = getActivityColor(activity.type);
                            return (
                                <div
                                    key={activity.id}
                                    style={{
                                        display: 'flex',
                                        gap: '0.75rem',
                                        padding: '0.75rem',
                                        borderRadius: '0.75rem',
                                        background: 'rgba(255, 255, 255, 0.82)',
                                        border: '1px solid rgba(255, 255, 255, 0.35)',
                                        backdropFilter: 'blur(10px)',
                                        WebkitBackdropFilter: 'blur(10px)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(243, 244, 246, 0.8)';
                                        e.currentTarget.style.backdropFilter = 'blur(12px)';
                                        e.currentTarget.style.WebkitBackdropFilter = 'blur(12px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(249, 250, 251, 0.6)';
                                        e.currentTarget.style.backdropFilter = 'blur(10px)';
                                        e.currentTarget.style.WebkitBackdropFilter = 'blur(10px)';
                                    }}
                                >
                                    <div style={{
                                        width: '2rem',
                                        height: '2rem',
                                        borderRadius: '50%',
                                        backgroundColor: colors.bg,
                                        color: colors.color,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                    }}>
                                        <ActivityIcon type={activity.type} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            color: '#000000',
                                            margin: 0,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {activity.title}
                                        </p>
                                        <p style={{
                                            fontSize: '0.7rem',
                                            color: '#000000',
                                            margin: '0.125rem 0 0 0',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {activity.description}
                                        </p>
                                        <p style={{
                                            fontSize: '0.65rem',
                                            color: '#000000',
                                            margin: '0.25rem 0 0 0'
                                        }}>
                                            {activity.time}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;