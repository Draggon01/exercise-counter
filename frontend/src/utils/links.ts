const REPOSITORY = "https://github.com/Draggon01/exercise-counter";

/** Form for a new GitHub issue. Nothing about the user or their exercises goes into the link: issues are public. */
export function newIssueUrl(title: string): string {
    return `${REPOSITORY}/issues/new?${new URLSearchParams({title})}`;
}

export const EXERCISE_VIEW_ISSUE_URL = newIssueUrl("New exercise view: ");
