/**
 * Thin wrapper around GoatCounter event tracking.
 * Silently does nothing if GoatCounter isn't loaded (ad blockers, local dev).
 */
export function track(path, title) {
    window.goatcounter?.count({ path, title, event: true });
}
