import { StageDefinition } from "./overlay";
import { PopoverDOM } from "./popover";
import { DriveStep } from "./driver";

export type State = {
  isInitialized?: boolean;

  activeIndex?: number;
  activeElement?: Element;
  activeStep?: DriveStep;
  previousElement?: Element;
  previousStep?: DriveStep;

  popover?: PopoverDOM;

  // actual values considering the animation
  // and delays. These are used to determine
  // the positions etc.
  __previousElement?: Element;
  __activeElement?: Element;
  __previousStep?: DriveStep;
  __activeStep?: DriveStep;

  __activeOnDestroyed?: Element;
  __resizeTimeout?: number;
  __transitionCallback?: () => void;
  __activeStagePosition?: StageDefinition;
  __overlaySvg?: SVGSVGElement;

  // Per-instance window listeners, stashed so they can be detached on destroy.
  __events?: {
    onKeyup: (e: KeyboardEvent) => void;
    onKeydown: (e: KeyboardEvent) => void;
    onResize: () => void;
    onScroll: () => void;
  };
};

export interface GetState {
  (): State;
  <K extends keyof State>(key: K): State[K];
}

export type SetState = <K extends keyof State>(key: K, value: State[K]) => void;

export type StateStore = {
  getState: GetState;
  setState: SetState;
  resetState: () => void;
};

// Each driver instance owns its own state store, so two drivers on the same
// page never read or clobber each other's active step, popover or overlay.
export function createStateStore(): StateStore {
  let currentState: State = {};

  const getState: GetState = (<K extends keyof State>(key?: K) => {
    return key ? currentState[key] : currentState;
  }) as GetState;

  const setState: SetState = (key, value) => {
    currentState[key] = value;
  };

  function resetState() {
    currentState = {};
  }

  return { getState, setState, resetState };
}
