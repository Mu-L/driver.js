import { destroyPopover, Popover } from "./popover";
import { destroyOverlay } from "./overlay";
import { destroyEvents, initEvents, requireRefresh } from "./events";
import { Config, createContext, DriverHook } from "./context";
import { destroyHighlight, highlight } from "./highlight";
import { findReachableIndex, resolveNextHook, resolvePrevHook, resolveTourStep, shouldSkipStep } from "./step";
import "./driver.css";

// Re-export the public types so they remain part of the package's type surface.
export type { Config, DriverHook, State } from "./context";
export type { StageDefinition } from "./stage";
export type { Popover, PopoverDOM, Side, Alignment, AllowedButtons } from "./popover";

export type DriveStep = {
  element?: string | Element | (() => Element);
  onHighlightStarted?: DriverHook;
  onHighlighted?: DriverHook;
  onDeselected?: DriverHook;
  popover?: Popover;
  disableActiveInteraction?: boolean;
  skipMissingElement?: boolean;
  data?: Record<string, any>;
};

export interface Driver {
  isActive: () => boolean;
  refresh: () => void;
  drive: (stepIndex?: number) => void;
  setConfig: (config: Config) => void;
  setSteps: (steps: DriveStep[]) => void;
  getConfig: () => Config;
  getState: (key?: string) => any;
  getActiveIndex: () => number | undefined;
  isFirstStep: () => boolean;
  isLastStep: () => boolean;
  getActiveStep: () => DriveStep | undefined;
  getActiveElement: () => Element | undefined;
  getPreviousElement: () => Element | undefined;
  getPreviousStep: () => DriveStep | undefined;
  getNextStep: () => DriveStep | undefined;
  moveNext: () => void;
  movePrevious: () => void;
  moveTo: (index: number) => void;
  hasNextStep: () => boolean;
  hasPreviousStep: () => boolean;
  highlight: (step: DriveStep) => void;
  destroy: () => void;
}

export function driver(options: Config = {}): Driver {
  const ctx = createContext(options);

  function handleClose() {
    if (!ctx.getConfig("allowClose")) {
      return;
    }

    destroy();
  }

  function handleOverlayClick() {
    const overlayClickBehavior = ctx.getConfig("overlayClickBehavior");

    if (ctx.getConfig("allowClose") && overlayClickBehavior === "close") {
      destroy();
      return;
    }

    if (typeof overlayClickBehavior === "function") {
      const activeStep = ctx.getState("__activeStep");
      const activeElement = ctx.getState("__activeElement");

      overlayClickBehavior(activeElement, activeStep!, ctx.getHookOpts());

      return;
    }

    if (overlayClickBehavior === "nextStep") {
      const activeStep = ctx.getState("activeStep");
      const activeElement = ctx.getState("activeElement");

      const onNextClick = resolveNextHook(ctx, activeStep);
      if (onNextClick) {
        onNextClick(activeElement, activeStep!, ctx.getHookOpts());
        return;
      }

      moveNext();
    }
  }

  function moveNext() {
    const activeIndex = ctx.getState("activeIndex");
    const steps = ctx.getConfig("steps") || [];
    if (typeof activeIndex === "undefined") {
      return;
    }

    const nextStepIndex = activeIndex + 1;
    if (steps[nextStepIndex]) {
      drive(nextStepIndex);
    } else {
      destroy();
    }
  }

  function movePrevious() {
    const activeIndex = ctx.getState("activeIndex");
    const steps = ctx.getConfig("steps") || [];
    if (typeof activeIndex === "undefined") {
      return;
    }

    const previousStepIndex = activeIndex - 1;
    if (steps[previousStepIndex]) {
      drive(previousStepIndex);
    } else {
      destroy();
    }
  }

  function moveTo(index: number) {
    const steps = ctx.getConfig("steps") || [];

    if (steps[index]) {
      drive(index);
    } else {
      destroy();
    }
  }

  function handleArrowLeft() {
    const isTransitioning = ctx.getState("__transitionCallback");
    if (isTransitioning) {
      return;
    }

    const activeIndex = ctx.getState("activeIndex");
    const activeStep = ctx.getState("__activeStep");
    const activeElement = ctx.getState("__activeElement");
    if (typeof activeIndex === "undefined" || typeof activeStep === "undefined") {
      return;
    }

    const steps = ctx.getConfig("steps") || [];
    if (!steps[activeIndex - 1]) {
      return;
    }

    const onPrevClick = resolvePrevHook(ctx, activeStep);
    if (onPrevClick) {
      return onPrevClick(activeElement, activeStep, ctx.getHookOpts());
    }

    movePrevious();
  }

  function handleArrowRight() {
    const isTransitioning = ctx.getState("__transitionCallback");
    if (isTransitioning) {
      return;
    }

    const activeIndex = ctx.getState("activeIndex");
    const activeStep = ctx.getState("__activeStep");
    const activeElement = ctx.getState("__activeElement");
    if (typeof activeIndex === "undefined" || typeof activeStep === "undefined") {
      return;
    }

    const onNextClick = resolveNextHook(ctx, activeStep);
    if (onNextClick) {
      return onNextClick(activeElement, activeStep, ctx.getHookOpts());
    }

    moveNext();
  }

  function init() {
    if (ctx.getState("isInitialized")) {
      return;
    }

    ctx.setState("isInitialized", true);
    document.body.classList.add("driver-active", ctx.getConfig("animate") ? "driver-fade" : "driver-simple");
    if (!ctx.getConfig("allowScroll")) {
      document.body.classList.add("driver-no-scroll");
    }
    document.body.style.setProperty("--driver-animation-duration", `${ctx.getConfig("duration") || 400}ms`);

    initEvents(ctx);

    ctx.listen("overlayClick", handleOverlayClick);
    ctx.listen("escapePress", handleClose);
    ctx.listen("closeClick", handleClose);
    ctx.listen("arrowLeftPress", handleArrowLeft);
    ctx.listen("arrowRightPress", handleArrowRight);
  }

  function drive(stepIndex: number = 0) {
    const steps = ctx.getConfig("steps");
    if (!steps) {
      console.error("No steps to drive through");
      destroy();
      return;
    }

    if (!steps[stepIndex]) {
      destroy();

      return;
    }

    const currentStep = steps[stepIndex];

    if (shouldSkipStep(ctx, currentStep)) {
      const activeIndex = ctx.getState("activeIndex");
      const direction = typeof activeIndex === "number" && stepIndex < activeIndex ? -1 : 1;

      if (steps[stepIndex + direction]) {
        drive(stepIndex + direction);
      } else if (direction === 1) {
        destroy();
      }

      return;
    }

    ctx.setState("__activeOnDestroyed", document.activeElement as HTMLElement);
    ctx.setState("activeIndex", stepIndex);

    const hasNextStep = steps[stepIndex + 1];

    highlight(
      ctx,
      resolveTourStep(ctx, stepIndex, {
        onNextClick: () => {
          if (!hasNextStep) {
            destroy();
          } else {
            drive(stepIndex + 1);
          }
        },
        onPrevClick: () => {
          drive(stepIndex - 1);
        },
        onCloseClick: () => {
          destroy();
        },
      })
    );
  }

  function destroy(withOnDestroyStartedHook = true) {
    const activeElement = ctx.getState("__activeElement");
    const activeStep = ctx.getState("__activeStep");

    const activeOnDestroyed = ctx.getState("__activeOnDestroyed");

    const onDestroyStarted = ctx.getConfig("onDestroyStarted");
    // `onDestroyStarted` is used to confirm the exit of tour. If we trigger
    // the hook for when user calls `destroy`, driver will get into infinite loop
    // not causing tour to be destroyed.
    if (withOnDestroyStartedHook && onDestroyStarted) {
      const isActiveDummyElement = !activeElement || activeElement?.id === "driver-dummy-element";
      onDestroyStarted(isActiveDummyElement ? undefined : activeElement, activeStep!, ctx.getHookOpts());
      return;
    }

    const onDeselected = activeStep?.onDeselected || ctx.getConfig("onDeselected");
    const onDestroyed = ctx.getConfig("onDestroyed");

    document.body.classList.remove("driver-active", "driver-fade", "driver-simple", "driver-no-scroll");
    document.body.style.removeProperty("--driver-animation-duration");

    destroyEvents(ctx);
    destroyPopover(ctx.getState("popover"));
    destroyHighlight();
    destroyOverlay(ctx);
    ctx.resetEmitter();

    const stateBeforeDestroy = ctx.getState();

    ctx.resetState();

    if (activeElement && activeStep) {
      const isActiveDummyElement = activeElement.id === "driver-dummy-element";
      if (onDeselected) {
        onDeselected(isActiveDummyElement ? undefined : activeElement, activeStep, ctx.getHookOpts(stateBeforeDestroy));
      }

      if (onDestroyed) {
        onDestroyed(isActiveDummyElement ? undefined : activeElement, activeStep, ctx.getHookOpts(stateBeforeDestroy));
      }
    }

    if (activeOnDestroyed) {
      (activeOnDestroyed as HTMLElement).focus();
    }
  }

  const api: Driver = {
    isActive: () => ctx.getState("isInitialized") || false,
    refresh: () => requireRefresh(ctx),
    drive: (stepIndex: number = 0) => {
      init();
      drive(stepIndex);
    },
    setConfig: ctx.setConfig,
    setSteps: (steps: DriveStep[]) => {
      ctx.resetState();
      ctx.setConfig({
        ...ctx.getConfig(),
        steps,
      });
    },
    getConfig: ctx.getConfig,
    getState: ctx.getState,
    getActiveIndex: () => ctx.getState("activeIndex"),
    isFirstStep: () => {
      const activeIndex = ctx.getState("activeIndex");

      return activeIndex !== undefined && findReachableIndex(ctx, activeIndex - 1, -1) === undefined;
    },
    isLastStep: () => {
      const activeIndex = ctx.getState("activeIndex");

      return activeIndex !== undefined && findReachableIndex(ctx, activeIndex + 1, 1) === undefined;
    },
    getActiveStep: () => ctx.getState("activeStep"),
    getActiveElement: () => ctx.getState("activeElement"),
    getPreviousElement: () => ctx.getState("previousElement"),
    getPreviousStep: () => ctx.getState("previousStep"),
    getNextStep: () => {
      const steps = ctx.getConfig("steps") || [];
      const activeIndex = ctx.getState("activeIndex");
      if (activeIndex === undefined) {
        return undefined;
      }

      const nextIndex = findReachableIndex(ctx, activeIndex + 1, 1);

      return nextIndex !== undefined ? steps[nextIndex] : undefined;
    },
    moveNext,
    movePrevious,
    moveTo,
    hasNextStep: () => {
      const activeIndex = ctx.getState("activeIndex");

      return activeIndex !== undefined && findReachableIndex(ctx, activeIndex + 1, 1) !== undefined;
    },
    hasPreviousStep: () => {
      const activeIndex = ctx.getState("activeIndex");

      return activeIndex !== undefined && findReachableIndex(ctx, activeIndex - 1, -1) !== undefined;
    },
    highlight: (step: DriveStep) => {
      init();
      highlight(ctx, {
        ...step,
        popover: step.popover
          ? {
              showButtons: [],
              showProgress: false,
              progressText: "",
              ...step.popover!,
            }
          : undefined,
      });
    },
    destroy: () => {
      destroy(false);
    },
  };

  ctx.setDriver(api);

  return api;
}
