export type ToastVariant = "primary" | "success" | "neutral" | "warning" | "danger";

const ICONS: Record<ToastVariant, string> = {
    primary: "info-circle",
    success: "check2-circle",
    neutral: "gear",
    warning: "exclamation-triangle",
    danger: "exclamation-octagon",
};

/** Messages currently shown, so the same message is not stacked twice. */
const visible = new Set<string>();

/**
 * Shows a short message in Shoelace's toast stack (bottom right / top on mobile) and removes it
 * after {@code duration} ms. Text is inserted as text, never as HTML. A message that is already
 * shown is not shown again.
 *
 * @return the alert, or null if the same message is already visible
 */
export function toast(message: string, variant: ToastVariant = "primary", duration = 4000): HTMLElement | null {
    const key = `${variant}:${message}`;
    if (visible.has(key)) {
        return null;
    }
    visible.add(key);
    const alert = Object.assign(document.createElement("sl-alert"), {
        variant,
        closable: true,
        duration,
    });
    const icon = document.createElement("sl-icon");
    icon.slot = "icon";
    icon.setAttribute("name", ICONS[variant]);
    alert.append(icon, document.createTextNode(message));
    alert.addEventListener("sl-after-hide", () => visible.delete(key), {once: true});
    document.body.append(alert);
    // toast() exists once Shoelace is registered (not in unit tests)
    (alert as unknown as { toast?: () => Promise<void> }).toast?.();
    return alert;
}
