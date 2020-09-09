import moment from "moment";

export enum Permission {
    AUTO_APPROVE_SCREENSHOT = "AUTO_APPROVE_SCREENSHOT",
    CAN_REPORT = "CAN_REPORT",
    CAN_SUBMIT = "CAN_SUBMIT",
    CAN_REVIEW = "CAN_REVIEW",
    CAN_SCREENSHOT = "CAN_SCREENSHOT",
    CAN_MESSAGE = "CAN_MESSAGE",
}

/**
 * Permissions which are granted by default until revoked.
 * Permissions not in this list must be actively granted.
 */
export const DEFAULT_PERMISSIONS: Permission[] = [
    Permission.CAN_REPORT,
    Permission.CAN_SUBMIT,
    Permission.CAN_REVIEW,
    Permission.CAN_SCREENSHOT,
    Permission.CAN_MESSAGE
];

export function hasPermission(permissions: any, permission: Permission) {
    if (!permissions[permission]) return false;
    const revokedUntil = permissions[permission].revoked_until;
    if (revokedUntil == null) return true;
    return moment(revokedUntil).isBefore(moment());
}