import {LitElement} from 'lit';
import {RootState, store} from './store';
import {connect} from "pwa-helpers";

export abstract class ConnectedLitElement extends connect(store)(LitElement) {
    abstract stateChanged(state: RootState): void;
}