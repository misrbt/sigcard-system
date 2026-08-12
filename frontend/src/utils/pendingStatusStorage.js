// Tracks an in-progress ("pending") customer status change across page visits, on this
// device, so it can be resumed after the user navigates away without finishing the upload.
const PENDING_STATUS_STORAGE_KEY = "digicur_pending_status_changes";
const resolvedKey = (customerId) => `digicur_resolved_upload:${customerId}`;

const readPendingStatusMap = () => {
  try {
    return JSON.parse(localStorage.getItem(PENDING_STATUS_STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
};

export const getPendingStatusChange = (customerId) => readPendingStatusMap()[customerId] ?? null;

export const savePendingStatusChange = (customerId, params) => {
  const map = readPendingStatusMap();
  map[customerId] = params;
  localStorage.setItem(PENDING_STATUS_STORAGE_KEY, JSON.stringify(map));
};

export const clearPendingStatusChange = (customerId) => {
  const map = readPendingStatusMap();
  delete map[customerId];
  localStorage.setItem(PENDING_STATUS_STORAGE_KEY, JSON.stringify(map));
};

// Call once a status change has been saved or explicitly cancelled, so a stale
// "back button" history entry that still carries the old upload URL params is
// ignored instead of reopening an already-finished panel.
export const markUploadResolved = (customerId) => {
  sessionStorage.setItem(resolvedKey(customerId), "1");
};

export const isUploadResolved = (customerId) =>
  sessionStorage.getItem(resolvedKey(customerId)) === "1";

// Call when a brand-new status change starts, so a future stale-URL check doesn't
// suppress this legitimate new upload panel.
export const clearUploadResolved = (customerId) => {
  sessionStorage.removeItem(resolvedKey(customerId));
};
