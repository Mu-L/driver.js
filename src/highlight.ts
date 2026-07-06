import { Context } from "./context";
import { DriveStep } from "./driver";
import { refreshOverlay, trackActiveElement, transitionStage } from "./overlay";
import { hidePopover, renderPopover } from "./popover";
import { repositionPopover } from "./position";
import { bringInView, isScrollable } from "./utils";

function mountDummyElement(): Element {
  const existingDummy = document.getElementById("driver-dummy-element");
  if (existingDummy) {
    return existingDummy;
  }

  let element = document.createElement("div");

  element.id = "driver-dummy-element";
  element.style.width = "0";
  element.style.height = "0";
  element.style.pointerEvents = "none";
  element.style.opacity = "0";
  element.style.position = "fixed";
  element.style.top = "50%";
  element.style.left = "50%";

  document.body.appendChild(element);

  return element;
}

export function highlight(ctx: Context, step: DriveStep) {
  const { element } = step;
  let elemObj =
    typeof element === "function" ? element() : typeof element === "string" ? document.querySelector(element) : element;

  // If the element is not found, we mount a 1px div
  // at the center of the screen to highlight and show
  // the popover on top of that. This is to show a
  // modal-like highlight.
  if (!elemObj) {
    elemObj = mountDummyElement();
  }

  transferHighlight(ctx, elemObj, step);
}

export function refreshActiveHighlight(ctx: Context) {
  const activeHighlight = ctx.getState("__activeElement");
  const activeStep = ctx.getState("__activeStep")!;

  if (!activeHighlight) {
    return;
  }

  trackActiveElement(ctx, activeHighlight);
  refreshOverlay(ctx);
  repositionPopover(ctx, activeHighlight, activeStep);
}

function transferHighlight(ctx: Context, toElement: Element, toStep: DriveStep) {
  const duration = ctx.getConfig("duration") || 400;
  const start = Date.now();

  const fromStep = ctx.getState("__activeStep");
  const fromElement = ctx.getState("__activeElement") || toElement;

  // If it's the first time we're highlighting an element, we show
  // the popover immediately. Otherwise, we wait for the animation
  // to finish before showing the popover.
  const isFirstHighlight = !fromElement || fromElement === toElement;
  const isToDummyElement = toElement.id === "driver-dummy-element";
  const isFromDummyElement = fromElement.id === "driver-dummy-element";

  const isAnimatedTour = ctx.getConfig("animate");
  const highlightStartedHook = toStep.onHighlightStarted || ctx.getConfig("onHighlightStarted");
  const highlightedHook = toStep?.onHighlighted || ctx.getConfig("onHighlighted");
  const deselectedHook = fromStep?.onDeselected || ctx.getConfig("onDeselected");

  const config = ctx.getConfig();
  const state = ctx.getState();

  if (!isFirstHighlight && deselectedHook) {
    deselectedHook(isFromDummyElement ? undefined : fromElement, fromStep!, {
      config,
      state,
      driver: ctx.getDriver(),
    });
  }

  if (highlightStartedHook) {
    highlightStartedHook(isToDummyElement ? undefined : toElement, toStep, {
      config,
      state,
      driver: ctx.getDriver(),
    });
  }

  const hasDelayedPopover = !isFirstHighlight && isAnimatedTour;
  let isPopoverRendered = false;

  hidePopover(ctx);

  ctx.setState("previousStep", fromStep);
  ctx.setState("previousElement", fromElement);
  ctx.setState("activeStep", toStep);
  ctx.setState("activeElement", toElement);

  const animate = () => {
    const transitionCallback = ctx.getState("__transitionCallback");

    // This makes sure that the repeated calls to transferHighlight
    // don't interfere with each other. Only the last call will be
    // executed.
    if (transitionCallback !== animate) {
      return;
    }

    const elapsed = Date.now() - start;
    const timeRemaining = duration - elapsed;
    const isHalfwayThrough = timeRemaining <= duration / 2;

    if (toStep.popover && isHalfwayThrough && !isPopoverRendered && hasDelayedPopover) {
      renderPopover(ctx, toElement, toStep);
      isPopoverRendered = true;
    }

    if (ctx.getConfig("animate") && elapsed < duration) {
      transitionStage(ctx, elapsed, duration, fromElement, toElement);
    } else {
      trackActiveElement(ctx, toElement);

      if (highlightedHook) {
        highlightedHook(isToDummyElement ? undefined : toElement, toStep, {
          config: ctx.getConfig(),
          state: ctx.getState(),
          driver: ctx.getDriver(),
        });
      }

      ctx.setState("__transitionCallback", undefined);
      ctx.setState("__previousStep", fromStep);
      ctx.setState("__previousElement", fromElement);
      ctx.setState("__activeStep", toStep);
      ctx.setState("__activeElement", toElement);
    }

    window.requestAnimationFrame(animate);
  };

  ctx.setState("__transitionCallback", animate);

  window.requestAnimationFrame(animate);

  bringInView(ctx, toElement);
  if (!hasDelayedPopover && toStep.popover) {
    renderPopover(ctx, toElement, toStep);
  }

  document.querySelectorAll(".driver-active-element-parent").forEach(element => {
    element.classList.remove("driver-active-element-parent", "driver-active-element-parent-no-scroll");
  });

  fromElement.classList.remove("driver-active-element", "driver-no-interaction");
  fromElement.removeAttribute("aria-haspopup");
  fromElement.removeAttribute("aria-expanded");
  fromElement.removeAttribute("aria-controls");

  const disableActiveInteraction = toStep.disableActiveInteraction ?? ctx.getConfig("disableActiveInteraction");
  if (disableActiveInteraction) {
    toElement.classList.add("driver-no-interaction");
  }

  const toParent = toElement.parentElement;
  if (toParent && toParent !== document.body) {
    toParent.classList.add("driver-active-element-parent");

    if (isScrollable(toParent)) {
      toParent.classList.add("driver-active-element-parent-no-scroll");
    }
  }

  toElement.classList.add("driver-active-element");
  toElement.setAttribute("aria-haspopup", "dialog");
  toElement.setAttribute("aria-expanded", "true");
  toElement.setAttribute("aria-controls", "driver-popover-content");
}

export function destroyHighlight() {
  document.getElementById("driver-dummy-element")?.remove();
  document.querySelectorAll(".driver-active-element").forEach(element => {
    const parent = element.parentElement;
    if (parent && parent !== document.body) {
      parent.classList.remove("driver-active-element-parent", "driver-active-element-parent-no-scroll");
    }

    element.classList.remove("driver-active-element", "driver-no-interaction");
    element.removeAttribute("aria-haspopup");
    element.removeAttribute("aria-expanded");
    element.removeAttribute("aria-controls");
  });
}
