/**
 * Validates a form including Shoelace controls (Shoelace hooks into the native form validation).
 * Shows the browser's validation messages when invalid.
 *
 * @return true if all fields are valid
 */
export function validateForm(form: HTMLFormElement): boolean {
    if (form.checkValidity()) {
        return true;
    }
    form.reportValidity();
    return false;
}
