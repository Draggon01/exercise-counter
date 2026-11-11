/** Same rule as the backend (AccountService.MIN_PASSWORD_LENGTH). */
export const MIN_PASSWORD_LENGTH = 8;

/** What is wrong with a new password and its repetition, `undefined` if it is fine. */
export function newPasswordProblem(password: string, repeated: string): string | undefined {
    if (password.length < MIN_PASSWORD_LENGTH) {
        return `The new password needs at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (password !== repeated) {
        return "The passwords do not match.";
    }
    return undefined;
}
