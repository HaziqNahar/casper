import React, { useEffect, useMemo, useState } from "react";
import { Activity, CalendarClock, Download, HardDrive, PackagePlus, Radio, ShieldAlert, Truck, Wrench } from "lucide-react";
import DataTable, { TableColumn } from "../components/common/DataTable";
import { Badge, LinkCell } from "../components/common/Badge";
import { MultiSelectCheckbox } from "../components/common/MultiSelectCheckbox";
import { useToast } from "../context/ToastContext";
import "../styles/component.css";

type AssetType = "EHT" | "BWC" | "Vehicle";
type AssetStatus = "Online" | "Healthy" | "Config" | "Offline" | "Active";

type AssetRecord = {
  id: string;
  assetType: AssetType;
  serialId: string;
  displayName: string;
  status: AssetStatus;
  assignedTo: string;
  lastSync: string;
  assignmentDate?: string;
  linkedAssetId?: string;
  location: string;
  maintenanceDue: boolean;
  healthMetrics: string[];
  integrationNotes: string[];
  exceptions: string[];
};

const INVENTORY_DATA: AssetRecord[] = [
  { id: "asset-eht-0123", assetType: "EHT", serialId: "EHT-0123", displayName: "EHT-0123", status: "Online", assignedTo: "John Tan", lastSync: "2026-02-25 08:00", assignmentDate: "2026-02-12", linkedAssetId: "BWC-4568", location: "Gatehouse Alpha", maintenanceDue: false, healthMetrics: ["Battery 91% and charging normally.", "Dock connectivity verified during last sync."], integrationNotes: ["Linked to BWC-4568 for patrol pairing.", "Synced with assignment service 12 minutes ago."], exceptions: [] },
  { id: "asset-eht-0124", assetType: "EHT", serialId: "EHT-0124", displayName: "EHT-0124", status: "Config", assignedTo: "Unassigned", lastSync: "2026-02-24 18:30", location: "Staging Locker 2", maintenanceDue: false, healthMetrics: ["Awaiting final policy profile.", "SIM activation check queued."], integrationNotes: ["Pending configuration sync from the device enrollment service."], exceptions: ["Configuration package is incomplete for the patrol profile."] },
  { id: "asset-bwc-4567", assetType: "BWC", serialId: "BWC-4567", displayName: "BWC-4567 (Body-Worn Camera)", status: "Healthy", assignedTo: "Mary Lim", lastSync: "2026-02-24 07:45", assignmentDate: "2026-02-01", linkedAssetId: "EHT-0123", location: "North Sector", maintenanceDue: false, healthMetrics: ["Battery 84% reported 2 hours ago.", "Firmware v2.1.3 is current."], integrationNotes: ["Footage sync completed to VMS successfully.", "Device assignment confirmed in mobile roster."], exceptions: [] },
  { id: "asset-bwc-4568", assetType: "BWC", serialId: "BWC-4568", displayName: "BWC-4568 (Body-Worn Camera)", status: "Offline", assignedTo: "Peter Ng", lastSync: "2026-02-24 23:12", assignmentDate: "2026-02-15", linkedAssetId: "EHT-0145", location: "East Patrol Route", maintenanceDue: true, healthMetrics: ["Battery 12% reported 23 hours ago.", "Storage 42GB free of 128GB."], integrationNotes: ["Linked to EHT-0145.", "Synced with VMS two days ago."], exceptions: ["Camera has not checked in for the last patrol cycle.", "Escalation ticket opened with BWC monitoring."] },
  { id: "asset-veh-1234", assetType: "Vehicle", serialId: "SLX1234A", displayName: "Vehicle SLX1234A", status: "Active", assignedTo: "Route AMK-N", lastSync: "2026-02-25 06:00", assignmentDate: "2026-02-25", location: "Ang Mo Kio Patrol Loop", maintenanceDue: true, healthMetrics: ["Fuel 68%.", "Next scheduled service due in 4 days."], integrationNotes: ["Vehicle telemetry is linked to the iCHECK fleet feed.", "Mobile dispatch receives assignment updates automatically."], exceptions: ["Preventive maintenance should be scheduled before next rotation."] },
];

const statusVariant = (status: AssetStatus): "success" | "warning" | "error" | "default" => status === "Offline" ? "error" : status === "Config" ? "warning" : "success";
const assetIcon = (type: AssetType) => type === "BWC" ? <Radio size={16} /> : type === "Vehicle" ? <Truck size={16} /> : <HardDrive size={16} />;
const statAccent = (tone: "info" | "warn" | "good") => tone === "warn" ? { chip: "#fef3c7", color: "#b45309" } : tone === "good" ? { chip: "#d1fae5", color: "#047857" } : { chip: "#dbeafe", color: "#1d4ed8" };
const parseSyncTime = (value: string) => {
  const parsed = new Date(value.replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isStaleSync = (value: string) => {
  const parsed = parseSyncTime(value);
  if (!parsed) return false;
  return Date.now() - parsed.getTime() > 1000 * 60 * 60 * 36;
};


const StatCard: React.FC<{ title: string; value: number; subtitle: string; icon: React.ReactNode; tone: "info" | "warn" | "good" }> = ({ title, value, subtitle, icon, tone }) => {
  const accent = statAccent(tone);
  return (
    <div className="inventory-statCard">
      <div className="inventory-statCardRow">
        <div>
          <div className="inventory-statLabel">{title}</div>
          <div className="inventory-statValue">{value}</div>
          <div className="inventory-statSubtitle">{subtitle}</div>
        </div>
        <div className="inventory-statIcon" style={{ background: accent.chip, color: accent.color }}>{icon}</div>
      </div>
    </div>
  );
};

const InventoryPage: React.FC = () => {
  const { pushToast } = useToast();
  const [selectedAssetId, setSelectedAssetId] = useState(INVENTORY_DATA[0]?.id ?? "");
  const [assetTypeFilter, setAssetTypeFilter] = useState<AssetType[]>([]);
  const [statusFilter, setStatusFilter] = useState<AssetStatus[]>([]);
  const [assignedToFilter, setAssignedToFilter] = useState<string[]>([]);
  const [maintenanceOnly, setMaintenanceOnly] = useState(false);
  const assetTypeOptions = useMemo(() => Array.from(new Set(INVENTORY_DATA.map((asset) => asset.assetType))).map((value) => ({ value, label: value })), []);
  const statusOptions = useMemo(() => Array.from(new Set(INVENTORY_DATA.map((asset) => asset.status))).map((value) => ({ value, label: value })), []);
  const assignedToOptions = useMemo(() => Array.from(new Set(INVENTORY_DATA.map((asset) => asset.assignedTo))).sort((a, b) => a.localeCompare(b)).map((value) => ({ value, label: value })), []);

  const filteredAssets = useMemo(() => INVENTORY_DATA.filter((asset) => {
    if (assetTypeFilter.length > 0 && !assetTypeFilter.includes(asset.assetType)) return false;
    if (statusFilter.length > 0 && !statusFilter.includes(asset.status)) return false;
    if (assignedToFilter.length > 0 && !assignedToFilter.includes(asset.assignedTo)) return false;
    if (maintenanceOnly && !asset.maintenanceDue) return false;
    return true;
  }), [assetTypeFilter, statusFilter, assignedToFilter, maintenanceOnly]);
  useEffect(() => {
    if (!filteredAssets.some((asset) => asset.id === selectedAssetId)) setSelectedAssetId(filteredAssets[0]?.id ?? "");
  }, [filteredAssets, selectedAssetId]);

  const selectedAsset = useMemo(() => filteredAssets.find((asset) => asset.id === selectedAssetId) ?? filteredAssets[0] ?? null, [filteredAssets, selectedAssetId]);
  const summary = useMemo(() => ({ total: INVENTORY_DATA.length, attention: INVENTORY_DATA.filter((asset) => asset.status === "Offline" || asset.status === "Config" || asset.maintenanceDue).length, unassigned: INVENTORY_DATA.filter((asset) => asset.assignedTo === "Unassigned").length, maintenance: INVENTORY_DATA.filter((asset) => asset.maintenanceDue).length }), []);
  const columns = useMemo<TableColumn<AssetRecord>[]>(() => [
    { key: "assetType", label: "Asset Type", width: "150px", render: (value, row) => <div className="inventory-assetTypeCell"><span className="inventory-assetTypeIcon">{assetIcon(row.assetType)}</span><LinkCell onClick={() => setSelectedAssetId(row.id)}>{String(value)}</LinkCell></div> },
    { key: "serialId", label: "Serial / ID", width: "180px", render: (value, row) => <div className="inventory-serialCell"><span className="inventory-serialValue">{String(value)}</span><span className="inventory-serialMeta">{row.displayName}</span></div> },
    { key: "status", label: "Status", width: "130px", align: "center", render: (value) => <Badge variant={statusVariant(value as AssetStatus)}>{String(value)}</Badge> },
    { key: "assignedTo", label: "Assigned To", width: "170px", render: (value) => <span className={`inventory-assignedText${String(value) === "Unassigned" ? " is-unassigned" : ""}`}>{String(value)}</span> },
    { key: "lastSync", label: "Last Sync", width: "190px", render: (value) => <div className="inventory-syncCell"><span>{String(value)}</span>{isStaleSync(String(value)) ? <span className="inventory-syncMeta is-stale">Stale sync</span> : <span className="inventory-syncMeta is-fresh">Fresh</span>}</div> },
  ], []);

  const toast = (message: string, type: "success" | "info" | "warning" = "info") => pushToast(message, type);
  const clearFocus = () => {
    setAssetTypeFilter([]);
    setStatusFilter([]);
    setAssignedToFilter([]);
    setMaintenanceOnly(false);
  };

  const focusAttention = () => {
    setStatusFilter(["Offline", "Config"]);
    setAssignedToFilter([]);
    setAssetTypeFilter([]);
    setMaintenanceOnly(true);
  };

  const focusUnassigned = () => {
    setAssignedToFilter(["Unassigned"]);
    setStatusFilter([]);
    setAssetTypeFilter([]);
    setMaintenanceOnly(false);
  };

  const focusMaintenance = () => {
    setAssignedToFilter([]);
    setStatusFilter([]);
    setAssetTypeFilter([]);
    setMaintenanceOnly(true);
  };


  return (
    <>
      <div className="inventory-pageShell">
        <section className="inventory-panel">
          <div className="inventory-heroRow">
            <div className="inventory-heroCopy">
              <div className="inventory-eyebrow">Equipment & Asset Inventory</div>
              <h2 className="inventory-heroTitle">Track frontline devices, assignments, and operational health in one place</h2>
              <p className="inventory-heroText">This demo screen brings handheld terminals, body-worn cameras, and patrol vehicles into the same review workflow so operations teams can triage outages, unassigned assets, and maintenance windows quickly.</p>
            </div>
            <div className="inventory-heroActions">
              <button className="kc-btn kc-btn-primary" onClick={() => toast("Asset onboarding flow opened", "success")}><PackagePlus size={16} /> Add asset</button>
              <button className="kc-btn kc-btn-ghost" onClick={() => toast("Inventory exported successfully", "success")}><Download size={16} /> Export CSV</button>
            </div>
          </div>
          <div className="inventory-summaryGrid">
          <button type="button" className="inventory-summary-card" onClick={clearFocus}><StatCard title="Tracked Assets" value={summary.total} subtitle="Across handhelds, BWCs, and vehicles" icon={<Activity size={22} />} tone="info" /></button>
          <button type="button" className="inventory-summary-card" onClick={focusAttention}><StatCard title="Needs Attention" value={summary.attention} subtitle="Offline, config-blocked, or maintenance due" icon={<ShieldAlert size={22} />} tone="warn" /></button>
          <button type="button" className="inventory-summary-card" onClick={focusUnassigned}><StatCard title="Unassigned" value={summary.unassigned} subtitle="Ready for allocation to the next patrol cycle" icon={<Radio size={22} />} tone="good" /></button>
          <button type="button" className="inventory-summary-card" onClick={focusMaintenance}><StatCard title="Maintenance Due" value={summary.maintenance} subtitle="Service windows that should be scheduled next" icon={<CalendarClock size={22} />} tone="warn" /></button>
        </div>
        <div className="inventory-badgeRow">
          <Badge variant={maintenanceOnly ? "warning" : "info"}>{maintenanceOnly ? "Maintenance focus enabled" : "Maintenance focus available"}</Badge>
          <Badge variant={statusFilter.length > 0 ? "warning" : "default"}>{statusFilter.length > 0 ? "Status queue filtered" : "All statuses visible"}</Badge>
          <Badge variant={assignedToFilter.length > 0 ? "info" : "default"}>{assignedToFilter.length > 0 ? "Assignment filter active" : "All assignees visible"}</Badge>
        </div>
      </section>

      <section className="inventory-panel">
        <div className="inventory-sectionHeaderRow">
          <div>
            <div className="inventory-sectionTitle">Operational Inventory</div>
            <div className="inventory-sectionText">Filter the current inventory and click a row to open the asset detail panel.</div>
          </div>
          <div className="inventory-sectionActions">
            <button className="kc-btn kc-btn-ghost" onClick={() => toast("Bulk import wizard opened", "info")}>Bulk Import</button>
            <button className="kc-btn kc-btn-ghost" onClick={() => toast("Maintenance scheduler opened", "info")}><Wrench size={16} /> Maintenance Schedule</button>
          </div>
        </div>
        <DataTable<AssetRecord>
          data={filteredAssets}
          columns={columns}
          rowClassName={(row) => [row.id === selectedAssetId ? "inventory-active-row" : "", isStaleSync(row.lastSync) ? "inventory-row-stale" : ""].filter(Boolean).join(" ")}
          keyField="id"
          onRowClick={(row) => setSelectedAssetId(row.id)}
          searchable
          searchPlaceholder="Search by serial, asset name, assignee, or status"
          paginated
          pageSize={10}
          pageSizeOptions={[10, 25, 50]}
          striped
          hoverable
          stickyHeader
          emptyMessage="No assets match the current filters"
          minHeight="100%"
          toolbarFilters={{ left: <><MultiSelectCheckbox label="Asset Type" options={assetTypeOptions} value={assetTypeFilter} onChange={setAssetTypeFilter} placeholder="All" /><MultiSelectCheckbox label="Status" options={statusOptions} value={statusFilter} onChange={setStatusFilter} placeholder="All" /><MultiSelectCheckbox label="Assigned To" options={assignedToOptions} value={assignedToFilter} onChange={setAssignedToFilter} placeholder="All" maxLabelItems={1} /></> }}
        />
      </section>

      {selectedAsset && (
        <section className="inventory-panel">
          <div className="inventory-detailHeader">
            <div>
              <div className="inventory-detailTitleRow">
                <h3 className="inventory-detailTitle">{selectedAsset.displayName}</h3>
                <Badge variant={statusVariant(selectedAsset.status)}>{selectedAsset.status}</Badge>
              </div>
              <div className="inventory-detailMeta">{selectedAsset.assetType} | {selectedAsset.serialId} | Last seen {selectedAsset.lastSync}</div>
            </div>
            <div className="inventory-sectionActions">
              <button className="kc-btn kc-btn-ghost" onClick={() => toast(selectedAsset.serialId + " reassignment workflow opened", "info")}>Reassign</button>
              <button className="kc-btn kc-btn-ghost" onClick={() => toast("Fault report created for " + selectedAsset.serialId, "warning")}>Report Fault</button>
              <button className="kc-btn kc-btn-primary" onClick={() => toast("History opened for " + selectedAsset.serialId, "success")}>View History</button>
            </div>
          </div>
          <div className="inventory-detailGrid">
            <div className="inventory-detailCard">
              <div className="inventory-detailCardTitle">Assignment & Health</div>
              <div className="inventory-detailStack">
                <div><div className="inventory-detailLabel">Assigned To</div><div className="inventory-detailValue">{selectedAsset.assignedTo}</div>{selectedAsset.assignmentDate && <div className="inventory-detailSubtext">Assignment date: {selectedAsset.assignmentDate}</div>}</div>
                <div><div className="inventory-detailLabel">Location</div><div className="inventory-detailValue">{selectedAsset.location}</div></div>
                {selectedAsset.linkedAssetId && <div><div className="inventory-detailLabel">Linked Asset</div><div className="inventory-detailValue">{selectedAsset.linkedAssetId}</div></div>}
                <div><div className="inventory-detailLabel">Health Metrics</div><ul className="inventory-detailList">{selectedAsset.healthMetrics.map((metric) => <li key={metric}>{metric}</li>)}</ul></div>
              </div>
            </div>
            <div className="inventory-detailCard">
              <div className="inventory-detailCardTitle">Integration Status</div>
              <ul className="inventory-detailList inventory-detailList--tight">{selectedAsset.integrationNotes.map((item) => <li key={item}>{item}</li>)}</ul>
              <div className="inventory-detailSectionTitle">Operational Exceptions</div>
              {selectedAsset.exceptions.length > 0 ? <ul className="inventory-detailList inventory-detailList--danger">{selectedAsset.exceptions.map((item) => <li key={item}>{item}</li>)}</ul> : <div className="inventory-detailEmpty">No active faults or escalation items on this asset.</div>}
              <div className="inventory-badgeRow">{selectedAsset.maintenanceDue && <Badge variant="warning">Maintenance due</Badge>}{selectedAsset.status === "Offline" && <Badge variant="error">Investigate outage</Badge>}{selectedAsset.assignedTo === "Unassigned" && <Badge variant="info">Awaiting assignment</Badge>}</div>
            </div>
          </div>
        </section>
      )}

      <section className="inventory-panel inventory-panel--dark">
        <div className="inventory-darkEyebrow">Cross-System Integration</div>
        <ul className="inventory-darkList">
          <li>EHT and BWC health data can be sourced from the device telemetry service in the next phase.</li>
          <li>Vehicle assignment and patrol route data can be linked to the iCHECK fleet system.</li>
          <li>Assignment changes can trigger mobile notifications to wardens and supervisors.</li>
          <li>Maintenance scheduling can emit calendar events and service reminders for firmware, battery, and preventative upkeep.</li>
        </ul>
      </section>
      </div>
    </>
  );
};

export default InventoryPage;