import { CheckCircle, Clock, XCircle } from "lucide-react";
import { RealmStatus } from "./realmTypes";

export const realmStatusVariant = (status: RealmStatus): "success" | "warning" | "error" | "default" => {
    switch (status) {
        case "Active":
            return "success";
        case "Draft":
            return "warning";
        case "Inactive":
            return "error";
        default:
            return "default";
    }
};

export const realmStatusIcon = (status: RealmStatus) => {
    switch (status) {
        case "Active":
            return <CheckCircle size={12} />;
        case "Draft":
            return <Clock size={12} />;
        case "Inactive":
            return <XCircle size={12} />;
        default:
            return null;
    }
};