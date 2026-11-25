import {describe, expect, it} from "vitest";
import {EXERCISE_VIEW_ISSUE_URL, newIssueUrl} from "./links";

describe("issue links", () => {
    it("opens the form with an encoded title", () => {
        expect(new URL(newIssueUrl("A & B?")).searchParams.get("title")).toBe("A & B?");
    });

    it("leads to the issues of the repository", () => {
        expect(EXERCISE_VIEW_ISSUE_URL).toMatch(/^https:\/\/github\.com\/Draggon01\/exercise-counter\/issues\/new\?/);
    });
});
