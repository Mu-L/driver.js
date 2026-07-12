import { AllowedButtons, destroyPopover, Popover } from "./popover";
import { destroyOverlay } from "./overlay";
import { destroyEvents, initEvents, requireRefresh } from "./events";
import { Config, DriverHook } from "./config";
import { createContext } from "./context";
import { destroyHighlight, highlight } from "./highlight";
import "./driver.css";

// Re-export the public types so they remain part of the package's type surface.
export type { Config, DriverHook } from "./config";
export type { State } from "./state";
export type { StageDefinition } from "./overlay";
export type { Popover, PopoverDOM, Side, Alignment, AllowedButtons } from "./popover";

export type DriveStep = {
  element?: string | Element | (() => Element);
  onHighlightStarted?: DriverHook;
  onHighlighted?: DriverHook;
  onDeselected?: DriverHook;
  popover?: Popover;
  disableActiveInteraction?: boolean;
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

      const steps = ctx.getConfig("steps") || [];
      const isLastStep = ctx.getState("activeIndex") === steps.length - 1;
      const onDoneClick = activeStep?.popover?.onDoneClick || ctx.getConfig("onDoneClick");
      if (isLastStep && onDoneClick) {
        onDoneClick(activeElement, activeStep!, ctx.getHookOpts());
        return;
      }

      const onNextClick = activeStep?.popover?.onNextClick || ctx.getConfig("onNextClick");
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

    const onPrevClick = activeStep.popover?.onPrevClick || ctx.getConfig("onPrevClick");
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

    const steps = ctx.getConfig("steps") || [];
    const isLastStep = activeIndex === steps.length - 1;
    const onDoneClick = activeStep.popover?.onDoneClick || ctx.getConfig("onDoneClick");
    if (isLastStep && onDoneClick) {
      return onDoneClick(activeElement, activeStep, ctx.getHookOpts());
    }

    const onNextClick = activeStep.popover?.onNextClick || ctx.getConfig("onNextClick");
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

    ctx.setState("__activeOnDestroyed", document.activeElement as HTMLElement);
    ctx.setState("activeIndex", stepIndex);

    const currentStep = steps[stepIndex];
    const hasNextStep = steps[stepIndex + 1];
    const hasPreviousStep = steps[stepIndex - 1];

    const doneBtnText = currentStep.popover?.doneBtnText || ctx.getConfig("doneBtnText") || "Done";
    const allowsClosing = ctx.getConfig("allowClose");
    const showProgress =
      typeof currentStep.popover?.showProgress !== "undefined"
        ? currentStep.popover?.showProgress
        : ctx.getConfig("showProgress");
    const progressText =
      currentStep.popover?.progressText || ctx.getConfig("progressText") || "{{current}} of {{total}}";
    const progressTextReplaced = progressText
      .replace("{{current}}", `${stepIndex + 1}`)
      .replace("{{total}}", `${steps.length}`);

    const configuredButtons = currentStep.popover?.showButtons || ctx.getConfig("showButtons");
    const calculatedButtons: AllowedButtons[] = [
      "next",
      "previous",
      ...(allowsClosing ? ["close" as AllowedButtons] : []),
    ].filter(b => {
      return !configuredButtons?.length || configuredButtons.includes(b as AllowedButtons);
    }) as AllowedButtons[];

    const onNextClick = currentStep.popover?.onNextClick || ctx.getConfig("onNextClick");
    const onPrevClick = currentStep.popover?.onPrevClick || ctx.getConfig("onPrevClick");
    const onCloseClick = currentStep.popover?.onCloseClick || ctx.getConfig("onCloseClick");

    highlight(ctx, {
      ...currentStep,
      popover: {
        showButtons: calculatedButtons,
        nextBtnText: !hasNextStep ? doneBtnText : undefined,
        disableButtons: [...(!hasPreviousStep ? ["previous" as AllowedButtons] : [])],
        showProgress: showProgress,
        onNextClick: onNextClick
          ? onNextClick
          : () => {
              if (!hasNextStep) {
                destroy();
              } else {
                drive(stepIndex + 1);
              }
            },
        onPrevClick: onPrevClick
          ? onPrevClick
          : () => {
              drive(stepIndex - 1);
            },
        onCloseClick: onCloseClick
          ? onCloseClick
          : () => {
              destroy();
            },
        ...(currentStep?.popover || {}),
        progressText: progressTextReplaced,
      },
    });
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
    destroyPopover(ctx);
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
    isFirstStep: () => ctx.getState("activeIndex") === 0,
    isLastStep: () => {
      const steps = ctx.getConfig("steps") || [];
      const activeIndex = ctx.getState("activeIndex");

      return activeIndex !== undefined && activeIndex === steps.length - 1;
    },
    getActiveStep: () => ctx.getState("activeStep"),
    getActiveElement: () => ctx.getState("activeElement"),
    getPreviousElement: () => ctx.getState("previousElement"),
    getPreviousStep: () => ctx.getState("previousStep"),
    getNextStep: () => {
      const steps = ctx.getConfig("steps") || [];
      const activeIndex = ctx.getState("activeIndex");

      return activeIndex !== undefined ? steps[activeIndex + 1] : undefined;
    },
    moveNext,
    movePrevious,
    moveTo,
    hasNextStep: () => {
      const steps = ctx.getConfig("steps") || [];
      const activeIndex = ctx.getState("activeIndex");

      return activeIndex !== undefined && !!steps[activeIndex + 1];
    },
    hasPreviousStep: () => {
      const steps = ctx.getConfig("steps") || [];
      const activeIndex = ctx.getState("activeIndex");

      return activeIndex !== undefined && !!steps[activeIndex - 1];
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
