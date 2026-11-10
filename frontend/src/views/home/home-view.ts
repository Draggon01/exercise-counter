import {css, html} from 'lit';
import {onAppRefresh} from "../../utils/refresh";
import '../../components/fab-button'
import {pageStyles} from "../../styles/page";
import {customElement, state} from "lit/decorators.js";
import {RootState, store} from '../../store';
import {ConnectedLitElement} from "../../connectedLitElement";
import {
    deleteExercise,
    listExercisesSelected,
    reorderExercises,
    selectAllExercises,
    selectExercisesStatus,
    unselectExercise
} from './slice/exerciseSlice';
import {ExerciseDto} from "./models/exerciseDto";
import './elements/exercise-card'
import '../../components/confirm-dialog'
import '../../components/empty-state'
import {navigate} from "../../utils/navigation";
import {AsyncStoreState} from "../../commons";
import {UserDto} from '../login/models/userDto';
import {selectCurrentUser} from "../login/slice/userSlice";
import {CheckDto} from "./models/checkDto";
import {
    deleteCheck,
    listChecksPerExercise,
    listUserChecks,
    saveCheck,
    selectAllChecks,
    selectChecksPerExercise
} from "./slice/checkSlice";
import {loadOptions} from "../options/slice/optionsSlice";
import {dropIndex, moveItem, shiftFor} from "../../utils/reorder";

/** State of a running drag (edit order): positions are relative to the list's top, so scrolling does not matter. */
interface DragState {
    pointerId: number;
    from: number;
    to: number;
    startY: number;
    cards: HTMLElement[];
    centers: number[];
    /** height of the dragged card + gap = how far the other cards move to make room */
    step: number;
    list: HTMLElement;
    scroller?: HTMLElement;
}


@customElement("home-view")
export class HomeView extends ConnectedLitElement {

    @state()
    private listExercises: ExerciseDto[] = []

    @state()
    private listChecks: CheckDto[] = []

    @state()
    private user?: UserDto;

    @state()
    private exerciseToDelete?: ExerciseDto;

    @state()
    private exerciseToHide?: ExerciseDto;

    @state()
    private editMode = false;

    @state()
    private checks: Record<string, CheckDto[]> = {}



    static styles = [pageStyles, css`
        .action-bar {
            display: flex;
            gap: var(--app-space-2);
            flex-wrap: wrap;
            margin-bottom: var(--app-space-4);
        }

        .exercise-list {
            display: flex;
            flex-direction: column;
            gap: var(--app-space-3);
        }

        .skeleton {
            --border-radius: var(--app-radius);
            height: 180px;
        }

        @media (max-width: 768px) {
            .action-bar sl-button {
                flex: 1;
            }

            /* the floating "+" button takes over on phones */
            .desktop-only {
                display: none;
            }

            /* room for the floating button below the last card */
            .page-container {
                padding-bottom: 80px;
            }
        }
    `];

    @state()
    private checksSelected: boolean = false;

    @state()
    private exercisesStatus: AsyncStoreState = "initial";

    private stopRefresh?: () => void;

    connectedCallback() {
        super.connectedCallback();
        this.load();
        store.dispatch(loadOptions());
        this.stopRefresh = onAppRefresh(() => this.load());
    }

    private load() {
        return Promise.all([
            store.dispatch(listExercisesSelected()),
            store.dispatch(listUserChecks()),
            store.dispatch(listChecksPerExercise()),
        ]);
    }

    stateChanged(state: RootState) {
        this.exercisesStatus = selectExercisesStatus(state);
        if (state.checks.checks.status === "idle") {
            this.listChecks = selectAllChecks(state);
        }
        if (state.exercise.exercises.status === "idle") {
            this.listExercises = selectAllExercises(state);
        }
        if (state.user.status === "idle") {
            this.user = selectCurrentUser(state);
        }
        if (state.checks.checksPerExercise.status === "idle") {
            this.checksSelected = true;
            this.checks = selectChecksPerExercise(state);
        }
    }

    render() {
        return html`
            <div class="page-container">
            <div class="action-bar">
                <sl-button class="desktop-only" variant="primary" @click="${() => this.openForm()}">
                    <sl-icon slot="prefix" name="plus-lg"></sl-icon>
                    New exercise
                </sl-button>

                <sl-button variant="${this.editMode ? 'success' : 'neutral'}" @click="${() => {
                    this.editMode = !this.editMode;
                }}">
                    ${this.editMode ? 'Done' : 'Edit Order'}
                </sl-button>
            </div>

            <div class="exercise-list" @pointerdown="${this.dragStart}">${this.renderItems()}</div>
            </div>
            <fab-button label="New exercise" @click="${() => this.openForm()}"></fab-button>
            <confirm-dialog label="Delete exercise" confirmLabel="Delete Exercise" cancelLabel="Close"
                            .open="${this.exerciseToDelete !== undefined}"
                            @confirm="${this.confirmDelete}"
                            @cancel="${() => this.exerciseToDelete = undefined}">
                You are about to delete this exercise. This action cannot be undone.
                Are you sure you want to proceed?
            </confirm-dialog>
            <confirm-dialog label="Hide exercise" confirmLabel="Hide Exercise" variant="warning"
                            .open="${this.exerciseToHide !== undefined}"
                            @confirm="${this.confirmHide}"
                            @cancel="${() => this.exerciseToHide = undefined}">
                You are about to hide this exercise from your list.
                You can add it back at any time from the Browse view.
                Are you sure you want to proceed?
            </confirm-dialog>

        `;
    }

    private confirmDelete = () => {
        if (this.exerciseToDelete) {
            store.dispatch(deleteExercise(this.exerciseToDelete));
        }
        this.exerciseToDelete = undefined;
    }

    private confirmHide = () => {
        if (this.exerciseToHide?.exerciseId) {
            store.dispatch(unselectExercise(this.exerciseToHide.exerciseId));
        }
        this.exerciseToHide = undefined;
    }

    private renderItems() {
        if (this.exercisesStatus === "error") {
            return html`
                <empty-state icon="cloud-slash" heading="Could not load your exercises"
                             text="Check your connection and try again.">
                    <sl-button @click="${() => store.dispatch(listExercisesSelected())}">Try again</sl-button>
                </empty-state>`;
        }
        if (this.exercisesStatus !== "idle" || !this.checksSelected) {
            return [1, 2].map(() => html`<sl-skeleton effect="pulse" class="skeleton"></sl-skeleton>`);
        }
        if (this.listExercises.length === 0) {
            return html`
                <empty-state icon="trophy" heading="No exercises yet"
                             text="Create your own exercise or add one that friends and groups share.">
                    <sl-button variant="primary" @click="${() => this.openForm()}">
                        <sl-icon slot="prefix" name="plus-lg"></sl-icon>
                        New exercise
                    </sl-button>
                    <sl-button @click="${() => navigate("/browse")}">
                        <sl-icon slot="prefix" name="search"></sl-icon>
                        Browse exercises
                    </sl-button>
                </empty-state>`;
        }
        const exerciseDtos = this.sortedExercises();
        return html`
            ${exerciseDtos.map((element, index) => {
                return html`
                    <exercise-card
                            .item="${element}"
                            .checked="${this.getChecked(element)}"
                            .finishedUser="${this.checks[element.exerciseId] ?? []}"
                            .editMode="${this.editMode}"
                            @move-up="${() => this.move(exerciseDtos, index, -1)}"
                            @move-down="${() => this.move(exerciseDtos, index, 1)}"
                            @delete-exercise="${(e: CustomEvent<ExerciseDto>) => this.exerciseToDelete = e.detail}"
                            @edit-exercise="${(e: CustomEvent<ExerciseDto>) => this.openForm(e.detail)}"
                            @check-changed="${(e: CustomEvent<boolean>) => this.setFinished(element, e.detail)}"
                            @hide-exercise="${(e: CustomEvent<ExerciseDto>) => this.exerciseToHide = e.detail}"
                    ></exercise-card>`;
            })}
        `;
    }

    private sortedExercises() {
        return [...this.listExercises].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    }

    private getChecked(element: ExerciseDto) {
        let check = this.listChecks.find(check => check.exerciseId === element.exerciseId);
        return !!check;
    }

    /** Opens the page to create a new exercise, or to edit the given one. */
    private openForm(exercise?: ExerciseDto) {
        navigate(exercise ? `/exercises/${exercise.exerciseId}/edit` : "/exercises/new");
    }

    /** Swaps the exercise at {@code index} with its neighbour and saves the new order. */
    private move(order: ExerciseDto[], index: number, by: -1 | 1) {
        const target = index + by;
        if (target < 0 || target >= order.length) {
            return;
        }
        const newOrder = [...order];
        [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
        store.dispatch(reorderExercises(newOrder.map(e => e.exerciseId)));
    }

    // ---- drag & drop (edit order)

    private drag?: DragState;

    private dragStart = (e: PointerEvent) => {
        if (!this.editMode || this.drag || (e.pointerType === "mouse" && e.button !== 0)) return;
        const path = e.composedPath() as HTMLElement[];
        if (!path.some(el => el.dataset?.dragHandle !== undefined)) return;
        const list = e.currentTarget as HTMLElement;
        const cards = [...list.querySelectorAll<HTMLElement>("exercise-card")];
        const from = cards.findIndex(card => path.includes(card));
        if (from < 0) return;
        e.preventDefault();
        const listTop = list.getBoundingClientRect().top;
        const rects = cards.map(card => card.getBoundingClientRect());
        const gap = rects.length > 1 ? rects[1].top - rects[0].bottom : 0;
        this.drag = {
            pointerId: e.pointerId, from, to: from, startY: e.clientY - listTop, list, cards,
            centers: rects.map(r => r.top - listTop + r.height / 2),
            step: rects[from].height + gap,
            scroller: scrollParent(list),
        };
        cards[from].toggleAttribute("dragging", true);
        cards.forEach((card, i) => card.style.transition = i === from ? "none" : "transform 0.15s ease");
        window.addEventListener("pointermove", this.dragMove);
        window.addEventListener("pointerup", this.dragEnd);
        window.addEventListener("pointercancel", this.dragCancel);
    }

    private dragMove = (e: PointerEvent) => {
        const drag = this.drag;
        if (!drag || e.pointerId !== drag.pointerId) return;
        const dy = e.clientY - drag.list.getBoundingClientRect().top - drag.startY;
        drag.to = dropIndex(drag.centers, drag.from, drag.centers[drag.from] + dy);
        drag.cards.forEach((card, i) => {
            card.style.transform = i === drag.from
                ? `translateY(${dy}px)`
                : `translateY(${shiftFor(i, drag.from, drag.to) * drag.step}px)`;
        });
        this.autoScroll(drag, e.clientY);
    }

    /** Scrolls the page while the card is dragged near the top or bottom edge. */
    private autoScroll(drag: DragState, y: number) {
        if (!drag.scroller) return;
        const box = drag.scroller.getBoundingClientRect();
        const edge = 60;
        if (y < box.top + edge) drag.scroller.scrollBy(0, -12);
        else if (y > box.bottom - edge) drag.scroller.scrollBy(0, 12);
    }

    private dragEnd = async (e: PointerEvent) => {
        const drag = this.drag;
        if (!drag || e.pointerId !== drag.pointerId) return;
        this.stopDragListeners();
        if (drag.to !== drag.from) {
            const order = moveItem(this.sortedExercises(), drag.from, drag.to);
            navigator.vibrate?.(10);
            await store.dispatch(reorderExercises(order.map(ex => ex.exerciseId)));
            await this.updateComplete; // the cards show the new order now – remove the offsets without animation
        }
        this.resetDrag(drag);
    }

    private dragCancel = () => {
        if (!this.drag) return;
        this.stopDragListeners();
        this.resetDrag(this.drag);
    }

    private stopDragListeners() {
        window.removeEventListener("pointermove", this.dragMove);
        window.removeEventListener("pointerup", this.dragEnd);
        window.removeEventListener("pointercancel", this.dragCancel);
    }

    private resetDrag(drag: DragState) {
        drag.cards.forEach(card => {
            card.style.transition = "";
            card.style.transform = "";
            card.removeAttribute("dragging");
        });
        this.drag = undefined;
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.stopRefresh?.();
        this.dragCancel();
    }

    private async setFinished(exercise: ExerciseDto, finished: boolean) {
        const check: CheckDto = {exerciseId: exercise.exerciseId, user: this.user?.username ?? "", streak: -1};
        await store.dispatch(finished ? saveCheck(check) : deleteCheck(check));
        store.dispatch(listChecksPerExercise());
    }

}

/** The nearest scrolling ancestor, also across shadow roots and slots (the app shell's main). */
function scrollParent(el: HTMLElement): HTMLElement | undefined {
    let node: Element | null = el;
    while (node) {
        const next: Element | null = node.assignedSlot ?? node.parentElement ?? ((node.getRootNode() as ShadowRoot).host ?? null);
        if (next instanceof HTMLElement && /(auto|scroll)/.test(getComputedStyle(next).overflowY)) return next;
        node = next;
    }
    return undefined;
}
