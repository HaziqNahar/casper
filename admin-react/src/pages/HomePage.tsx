import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Activity,
    AlertTriangle,
    FileText,
    Globe,
    RefreshCw,
    ShieldCheck,
    SquarePlus,
    Users,
} from "lucide-react";
import { ROUTES } from "../config/routes";
import {
    dashboardApi,
    type DashboardActivity,
    type DashboardGovernance,
    type DashboardPosture,
    type DashboardPostureVariant,
} from "../services/dashboardApi";
import "../styles/dashboard.cards.css";

type ActivityItemType = "case" | "warden" | "alert" | "system";

interface DashboardFeedItem {
    id: string;
    type: ActivityItemType;
    title: string;
    description: string;
    time: string;
}

const overallToneClass: Record<DashboardPostureVariant, string> = {
    good: "badge-soft badge-soft--good",
    warn: "badge-soft badge-soft--warn",
    bad: "badge-soft badge-soft--bad",
    info: "badge-soft badge-soft--info",
};

const postureCardClass: Record<DashboardPostureVariant, string> = {
    good: "dash-postureCard is-good",
    warn: "dash-postureCard is-warn",
    bad: "dash-postureCard is-bad",
    info: "dash-postureCard is-info",
};

const activityClass: Record<ActivityItemType, string> = {
    case: "is-case",
    warden: "is-warden",
    alert: "is-alert",
    system: "is-system",
};

const ActivityIcon: React.FC<{ type: ActivityItemType }> = ({ type }) => {
    switch (type) {
        case "case":
            return <FileText />;
        case "warden":
            return <Users />;
        case "alert":
            return <AlertTriangle />;
        default:
            return <Activity />;
    }
};

type QuickActionProps = {
    icon: React.ReactNode;
    label: string;
    detail: string;
    onClick: () => void;
    tone: "amber" | "blue" | "violet" | "green";
    priority?: "high" | "normal";
};

const QuickAction: React.FC<QuickActionProps> = ({
    icon,
    label,
    detail,
    onClick,
    tone,
    priority = "normal",
}) => (
    <button
        type="button"
        className={`dash-qaBtn dash-qaBtn--${tone} ${priority === "high" ? "is-high" : ""}`}
        onClick={onClick}
    >
        <div className="dash-qaIcon">{icon}</div>
        <div className="dash-qaText">
            <span className="dash-qaLabel">{label}</span>
            <span className="dash-qaDetail">{detail}</span>
        </div>
    </button>
);

type PostureCardProps = {
    label: string;
    value: string | number;
    detail: string;
    variant: DashboardPostureVariant;
    icon: React.ReactNode;
    onClick?: () => void;
};

const PostureCard: React.FC<PostureCardProps> = ({
    label,
    value,
    detail,
    variant,
    icon,
    onClick,
}) => (
    <button
        type="button"
        className={postureCardClass[variant]}
        onClick={onClick}
        disabled={!onClick}
    >
        <div className="dash-postureIcon">{icon}</div>
        <div className="dash-postureText">
            <div className="dash-postureLabel">{label}</div>
            <div className="dash-postureValue">{value}</div>
            <div className="dash-postureDetail">{detail}</div>
        </div>
    </button>
);

const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const [summary, setSummary] = useState<{
        posture: DashboardPosture;
        governance: DashboardGovernance;
        activity: DashboardActivity[];
        isSuperAdmin: boolean;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadDashboard = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const next = await dashboardApi.summary();
            setSummary({
                posture: next.posture,
                governance: next.governance,
                activity: next.activity,
                isSuperAdmin: Boolean(next.actor.isSuperAdmin),
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load dashboard summary.");
            setSummary(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadDashboard();
    }, [loadDashboard]);

    const posture = summary?.posture;
    const governance = summary?.governance;
    const activity = summary?.activity ?? [];
    const isSuperAdmin = summary?.isSuperAdmin ?? false;

    const pendingUsers = posture?.pendingUsers ?? 0;
    const inactiveUsers = posture?.inactiveUsers ?? 0;
    const nonActiveRealms = posture?.nonActiveRealms ?? 0;
    const disabledApps = posture?.disabledApps ?? 0;
    const publicClients = posture?.publicClients ?? 0;
    const reviewQueueCount = posture?.reviewQueue ?? 0;
    const pendingApprovals = governance?.pending ?? 0;
    const overdueApprovals = governance?.overdue ?? 0;
    const dueSoonApprovals = governance?.dueSoon ?? 0;
    const oldestPendingApproval = governance?.oldestPending ?? null;

    const summaryFeed = useMemo<DashboardFeedItem[]>(
        () => [
            {
                id: "queue",
                type: reviewQueueCount > 0 ? "alert" : "system",
                title: reviewQueueCount > 0 ? "Review queue needs attention" : "Review queue is under control",
                description:
                    reviewQueueCount > 0
                        ? `${pendingUsers} pending users, ${nonActiveRealms} non-active realms, and ${disabledApps} disabled applications are waiting for attention.`
                        : "No visible backlog is blocking the main review workflows right now.",
                time: reviewQueueCount > 0 ? "Immediate priority" : "Live now",
            },
            {
                id: "identity",
                type: inactiveUsers > 0 ? "warden" : "system",
                title: inactiveUsers > 0 ? "Identity hygiene needs follow-up" : "Identity hygiene is stable",
                description:
                    inactiveUsers > 0
                        ? `${inactiveUsers} inactive accounts still need review so stale access does not linger.`
                        : "No inactive-account cleanup is currently putting pressure on the user queue.",
                time: inactiveUsers > 0 ? "User queue" : "Healthy state",
            },
            {
                id: "apps",
                type: publicClients > 0 ? "case" : "system",
                title: publicClients > 0 ? "Application exposure needs confirmation" : "Application exposure is stable",
                description:
                    publicClients > 0
                        ? `${publicClients} public client${publicClients === 1 ? "" : "s"} should be reviewed against current access expectations.`
                        : "No public-client exceptions are currently standing out in the dashboard.",
                time: publicClients > 0 ? "Application review" : "No active exception",
            },
        ],
        [reviewQueueCount, pendingUsers, nonActiveRealms, disabledApps, inactiveUsers, publicClients]
    );

    const activityFeed = useMemo<DashboardFeedItem[]>(
        () =>
            activity.slice(0, 4).map((item) => ({
                id: item.id,
                type:
                    item.type === "approval"
                        ? "alert"
                        : item.type === "user"
                            ? "warden"
                            : item.type === "realm" || item.type === "app"
                                ? "case"
                                : "system",
                title: `${item.entityName} - ${item.action.replace(/_/g, " ")}`,
                description: item.description || `${item.actorUsername} updated ${item.entityType}`,
                time: new Date(item.at).toLocaleString("en-SG", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                }),
            })),
        [activity]
    );

    const queueBadgeText = isSuperAdmin
        ? `${pendingApprovals} pending / ${overdueApprovals} overdue`
        : reviewQueueCount > 0
            ? `${reviewQueueCount} items need review`
            : "No urgent backlog";

    const queueHeadline = isSuperAdmin ? "Governance Queue" : "Priority Actions";
    const queueSubtext = isSuperAdmin
        ? "Use the approval queue to keep SLA risk down, unblock requests quickly, and watch for the oldest pending item."
        : "Lead the first pass on live review pressure, identity hygiene, realm readiness, and application exposure.";

    const queuePrimaryAction = isSuperAdmin
        ? () => navigate(ROUTES.APPROVAL_REQUESTS)
        : () => navigate(`${ROUTES.USERS}?status=Pending`);

    return (
        <div className="dash-home">
            <section className="glass-surface glass-surface--soft dash-hero">
                <div className="dash-heroHead">
                    <div className="dash-heroCopy">
                        <div className="dash-heroTitle">Security Command Center</div>
                        <div className="dash-heroSubtitle">
                            Start with what needs action now: queue pressure, identity hygiene,
                            realm readiness, and application exposure.
                        </div>
                    </div>

                    <div className="dash-heroActions">
                        <div className={overallToneClass[posture?.overall ?? "info"]}>
                            Overall posture: {(posture?.overall ?? "info").toUpperCase()}
                        </div>
                        <button className="dash-linkBtn" onClick={() => navigate(ROUTES.AUDIT_LOGS)}>
                            Open Audit Logs
                        </button>
                    </div>
                </div>

                {error && <div className="dash-errorBanner">{error}</div>}

                <div className="dash-postureGrid">
                    <PostureCard
                        label="Review Queue"
                        value={loading ? "..." : reviewQueueCount}
                        detail="Open items waiting for review"
                        variant={reviewQueueCount > 0 ? "warn" : "good"}
                        icon={<AlertTriangle size={18} />}
                        onClick={() => navigate(`${ROUTES.USERS}?status=Pending`)}
                    />
                    <PostureCard
                        label="Identity Hygiene"
                        value={loading ? "..." : pendingUsers + inactiveUsers}
                        detail="Pending and inactive user accounts"
                        variant={inactiveUsers + pendingUsers > 0 ? "info" : "good"}
                        icon={<Users size={18} />}
                        onClick={() => navigate(`${ROUTES.USERS}?status=Pending,Inactive`)}
                    />
                    <PostureCard
                        label="Realm Health"
                        value={loading ? "..." : nonActiveRealms}
                        detail="Realms that are not currently active"
                        variant={nonActiveRealms > 0 ? "warn" : "good"}
                        icon={<Globe size={18} />}
                        onClick={() => navigate(`${ROUTES.REALMS}?status=nonactive`)}
                    />
                    <PostureCard
                        label="App Exposure"
                        value={loading ? "..." : disabledApps + publicClients}
                        detail="Disabled apps and public clients to review"
                        variant={disabledApps + publicClients > 0 ? "info" : "good"}
                        icon={<SquarePlus size={18} />}
                        onClick={() => navigate(`${ROUTES.APPS}?risk=public-or-disabled`)}
                    />
                </div>
            </section>

            <div className="dash-homeGrid">
                <div className="dash-homeMain">
                    <section className="glass-surface glass-surface--soft panel">
                        <div className="dash-sectionHead">
                            <div>
                                <h3 className="dash-sectionTitle">{queueHeadline}</h3>
                                <div className="section-subtext dash-sectionSubtext">{queueSubtext}</div>
                            </div>
                            <div className="dash-pillSummary">{queueBadgeText}</div>
                        </div>

                        <div className="dash-quickRow">
                            <QuickAction
                                icon={<AlertTriangle size={20} />}
                                label={isSuperAdmin ? "Approval Queue" : "Pending Users"}
                                detail={
                                    isSuperAdmin
                                        ? `${pendingApprovals} pending approvals`
                                        : pendingUsers > 0
                                            ? `${pendingUsers} accounts await review`
                                            : "No waiting user reviews"
                                }
                                onClick={queuePrimaryAction}
                                tone="amber"
                                priority={pendingUsers > 0 || pendingApprovals > 0 ? "high" : "normal"}
                            />
                            <QuickAction
                                icon={<Globe size={20} />}
                                label="Realm Readiness"
                                detail={
                                    nonActiveRealms > 0
                                        ? `${nonActiveRealms} realms need follow-up`
                                        : "All visible realms are active"
                                }
                                onClick={() => navigate(`${ROUTES.REALMS}?status=nonactive`)}
                                tone="blue"
                            />
                            <QuickAction
                                icon={<SquarePlus size={20} />}
                                label="Application Checks"
                                detail={
                                    disabledApps + publicClients > 0
                                        ? `${disabledApps + publicClients} apps need review`
                                        : "No active app exposure issue"
                                }
                                onClick={() => navigate(`${ROUTES.APPS}?risk=public-or-disabled`)}
                                tone="violet"
                            />
                            <QuickAction
                                icon={<ShieldCheck size={20} />}
                                label="Audit Trail"
                                detail="Open recent governance activity"
                                onClick={() => navigate(ROUTES.AUDIT_LOGS)}
                                tone="green"
                            />
                        </div>

                        <div className="divider">
                            <div className="dash-sectionEyebrow">Admin shortcuts</div>
                            <div className="dash-shortcutRow">
                                <button className="dash-linkBtn" onClick={() => navigate(ROUTES.CREATE_USER)}>
                                    Create User
                                </button>
                                <button className="dash-linkBtn" onClick={() => navigate(ROUTES.REGISTER_APPS)}>
                                    Register Application
                                </button>
                                <button className="dash-linkBtn" onClick={() => navigate(ROUTES.MANAGE_REALMS)}>
                                    Manage Realms
                                </button>
                            </div>
                        </div>
                    </section>

                    <section className="glass-surface glass-surface--soft panel">
                        <div className="dash-sectionHead">
                            <div>
                                <h3 className="dash-sectionTitle">Recent Signals</h3>
                                <div className="section-subtext dash-sectionSubtext">
                                    Keep an eye on the pressure points the platform is surfacing right now.
                                </div>
                            </div>
                        </div>

                        <div className="dash-activityList">
                            {summaryFeed.map((item) => (
                                <div key={item.id} className={`dash-activityItem ${activityClass[item.type]}`}>
                                    <div className={`dash-activityIcon ${activityClass[item.type]}`}>
                                        <ActivityIcon type={item.type} />
                                    </div>
                                    <div className="dash-activityBody">
                                        <div className="dash-activityTitle">{item.title}</div>
                                        <div className="dash-activityDesc">{item.description}</div>
                                        <div className="dash-activityTime">{item.time}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <aside className="dash-homeSide">
                    <section className="glass-surface glass-surface--soft panel">
                        <div className="dash-sectionHead">
                            <div>
                                <h3 className="dash-sectionTitle">Live Governance</h3>
                                <div className="section-subtext dash-sectionSubtext">
                                    Recent backend activity and approval pressure from the live dashboard summary.
                                </div>
                            </div>
                            <div className="dash-sideActions">
                                <button className="dash-linkBtn" onClick={() => void loadDashboard()} disabled={loading}>
                                    <RefreshCw size={14} /> Refresh
                                </button>
                                <button
                                    className="dash-linkBtn"
                                    onClick={() => navigate(isSuperAdmin ? ROUTES.APPROVAL_REQUESTS : ROUTES.AUDIT_LOGS)}
                                >
                                    {isSuperAdmin ? "Open Approval Queue" : "Open Audit Logs"}
                                </button>
                            </div>
                        </div>

                        <div className="dash-governanceStats">
                            <div className="dash-statCard">
                                <div className="dash-statLabel">Pending</div>
                                <div className="dash-statValue">{loading ? "..." : pendingApprovals}</div>
                            </div>
                            <div className="dash-statCard is-warn">
                                <div className="dash-statLabel">Due Soon</div>
                                <div className="dash-statValue">{loading ? "..." : dueSoonApprovals}</div>
                            </div>
                            <div className="dash-statCard is-bad">
                                <div className="dash-statLabel">Overdue</div>
                                <div className="dash-statValue">{loading ? "..." : overdueApprovals}</div>
                            </div>
                        </div>

                        <div className="dash-oldestCard">
                            <div className="dash-oldestHead">
                                <div className="dash-oldestIcon">
                                    <ShieldCheck size={18} />
                                </div>
                                <div>
                                    <div className="dash-oldestLabel">Oldest pending item</div>
                                    <div className="dash-oldestTitle">
                                        {oldestPendingApproval ? oldestPendingApproval.entityName : "No approval backlog"}
                                    </div>
                                </div>
                            </div>
                            <div className="dash-oldestText">
                                {oldestPendingApproval
                                    ? `${oldestPendingApproval.action.replace(/_/g, " ")} has been waiting since ${new Date(oldestPendingApproval.requestedAt).toLocaleString("en-SG", {
                                        day: "2-digit",
                                        month: "short",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        hour12: false,
                                    })}.`
                                    : "All approval requests are currently cleared."}
                            </div>
                        </div>

                        <div className="dash-activityList">
                            {activityFeed.length > 0 ? (
                                activityFeed.map((item) => (
                                    <div key={item.id} className={`dash-activityItem ${activityClass[item.type]}`}>
                                        <div className={`dash-activityIcon ${activityClass[item.type]}`}>
                                            <ActivityIcon type={item.type} />
                                        </div>
                                        <div className="dash-activityBody">
                                            <div className="dash-activityTitle">{item.title}</div>
                                            <div className="dash-activityDesc">{item.description}</div>
                                            <div className="dash-activityTime">{item.time}</div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="dash-emptyState">
                                    No recent governance activity is available yet.
                                </div>
                            )}
                        </div>
                    </section>
                </aside>
            </div>
        </div>
    );
};

export default HomePage;