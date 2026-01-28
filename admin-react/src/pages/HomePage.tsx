import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileText,
    Users,
    AlertTriangle,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    Globe,
    UserPlus
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { ROUTES } from '../config/routes';

// ==========================================
// STAT CARD COMPONENT
// ==========================================

interface StatCardProps {
    title: string;
    value: string | number;
    change?: number;
    changeLabel?: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    change,
    changeLabel,
    icon,
    color,
    bgColor,
    onClick
}) => {
    const isPositive = change !== undefined && change > 0;
    return (
        <div
            onClick={onClick}
            style={{
                background: 'white',
                borderRadius: '0.75rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                padding: '1.25rem',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                border: '1px solid #e5e7eb',
            }}
            onMouseEnter={(e) => {
                if (onClick) {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                }
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
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
                    {change !== undefined && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            marginTop: '0.5rem'
                        }}>
                            {isPositive ? (
                                <ArrowUpRight size={14} color="#10b981" />
                            ) : (
                                <ArrowDownRight size={14} color="#ef4444" />
                            )}
                            <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                color: isPositive ? '#10b981' : '#ef4444'
                            }}>
                                {Math.abs(change)}%
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#000000' }}>
                                {changeLabel || 'vs last week'}
                            </span>
                        </div>
                    )}
                </div>
                <div style={{
                    width: '3rem',
                    height: '3rem',
                    borderRadius: '0.5rem',
                    backgroundColor: bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: color
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
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            minWidth: '100px',
            fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = bgColor;
            e.currentTarget.style.borderColor = color;
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
            e.currentTarget.style.borderColor = '#e5e7eb';
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
    const { totalUsers, totalRealms, totalApps, loading } = useData();

    // Mock activity data
    const recentActivity: ActivityItem[] = [
        {
            id: '1',
            type: 'case',
            title: 'New LifeSG Case Received',
            description: 'Case #LSG-2024-0156 assigned to Zone A',
            time: '5 mins ago'
        },
        {
            id: '2',
            type: 'warden',
            title: 'Warden Status Update',
            description: 'PW003 completed patrol in Sector B',
            time: '12 mins ago'
        },
        {
            id: '3',
            type: 'alert',
            title: 'SLA Warning',
            description: 'Case #CPG-2024-0089 approaching deadline',
            time: '25 mins ago'
        },
        {
            id: '4',
            type: 'system',
            title: 'HDB Batch Processed',
            description: '45 records submitted successfully',
            time: '1 hour ago'
        },
        {
            id: '5',
            type: 'case',
            title: 'Case Resolved',
            description: 'Case #LSG-2024-0142 marked as completed',
            time: '2 hours ago'
        },
    ];

    return (
        <div>
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
                    change={24}
                    icon={<Users size={24} />}
                    color="#2563eb"
                    bgColor="#dbeafe"
                    onClick={() => navigate(ROUTES.USERS_ALL)}
                />
                <StatCard
                    title="Total Realms"
                    value={loading ? '...' : totalRealms.length}
                    change={4}
                    icon={<Globe size={24} />}
                    color="#d97706"
                    bgColor="#fef3c7"
                    onClick={() => navigate(ROUTES.REALMS_ALL)}
                />
                <StatCard
                    title="Total Apps"
                    value={loading ? '...' : totalApps.length}
                    change={10}
                    icon={<AlertTriangle size={24} />}
                    color="#dc2626"
                    bgColor="#fee2e2"
                    onClick={() => navigate(ROUTES.APPS_ALL)}
                />
                <StatCard
                    title="Audit Logs"
                    value={8}
                    change={0}
                    changeLabel="same as yesterday"
                    icon={<Users size={24} />}
                    color="#059669"
                    bgColor="#d1fae5"
                    onClick={() => navigate(ROUTES.AUDIT_LOGS)}
                />
            </div>

            {/* Main Content Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 350px',
                gap: '1.5rem',
            }}>
                {/* Left Column - Activity & Charts */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Quick Actions */}
                    <div style={{
                        background: 'white',
                        borderRadius: '0.75rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        padding: '1.25rem',
                        border: '1px solid #e5e7eb',
                    }}>
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
                                onClick={() => navigate(ROUTES.CREATE_USERS)}
                                color="#2563eb"
                                bgColor="#dbeafe"
                            />
                            <QuickAction
                                icon={<UserPlus size={20} />}
                                label="Create Application"
                                onClick={() => navigate(ROUTES.CREATE_APPS)}
                                color="#7c3aed"
                                bgColor="#ede9fe"
                            />
                            <QuickAction
                                icon={<UserPlus size={20} />}
                                label="Create Realm"
                                onClick={() => navigate(ROUTES.CREATE_REALMS)}
                                color="#059669"
                                bgColor="#d1fae5"
                            />
                        </div>
                    </div>
                </div>

                {/* Right Column - Recent Activity */}
                <div style={{
                    background: 'white',
                    borderRadius: '0.75rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    padding: '1.25rem',
                    border: '1px solid #e5e7eb',
                    height: 'fit-content',
                }}>
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
                                        borderRadius: '0.5rem',
                                        backgroundColor: '#f9fafb',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
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