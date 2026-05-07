const uuid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

function getOrCreate(key: string): string {
  let v = localStorage.getItem(key);
  if (!v) { v = uuid(); localStorage.setItem(key, v); }
  return v;
}

/** Stable ID for the person creating invitations on this device */
export const getCreatorId   = () => getOrCreate("invity_creator_id");

/** Stable ID for the person viewing/accepting invitations on this device */
export const getViewerToken = () => getOrCreate("invity_viewer_token");
