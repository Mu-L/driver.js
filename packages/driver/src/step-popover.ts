import type { Context } from "./context";
import type { DriveStep } from "./driver";
import { destroyPopover, PopoverRenderOptions, renderPopover } from "./popover";
import { PositionOptions, repositionPopover } from "./position";

// Bridges the tour and the popover primitive: resolves a step's popover
// against the instance config (step value first, then the global default, then
// the built-in fallback) and adapts the tour's hooks onto the primitive's
// plain callbacks. The primitive itself never reads config or state.

function resolveStepPosition(ctx: Context, element: Element, step: DriveStep): PositionOptions {
  const stagePadding = ctx.getConfig("stagePadding") || 0;

  return {
    side: step.popover?.side || "bottom",
    align: step.popover?.align || "start",
    // The popover clears the highlight cutout (stagePadding) plus the
    // configured gap between the two.
    offset: stagePadding + (ctx.getConfig("popoverOffset") || 0),
    padding: stagePadding,
    // Without a real element the tour highlights a dummy element at the center
    // of the screen, and the popover is centered over it like a modal.
    centered: element.id === "driver-dummy-element",
  };
}

function resolveStepPopover(ctx: Context, element: Element, step: DriveStep): PopoverRenderOptions {
  const popover = step.popover || {};

  const steps = ctx.getConfig("steps") || [];
  const activeIndex = ctx.getState("activeIndex");
  const isDoneStep = activeIndex !== undefined && activeIndex === steps.length - 1;

  return {
    title: popover.title,
    description: popover.description,

    showButtons: popover.showButtons || ctx.getConfig("showButtons")!,
    disableButtons: popover.disableButtons || ctx.getConfig("disableButtons")! || [],
    showProgress: popover.showProgress || ctx.getConfig("showProgress") || false,

    progressText: popover.progressText ?? (ctx.getConfig("progressText") || "{current} of {total}"),
    nextBtnText: popover.nextBtnText ?? (ctx.getConfig("nextBtnText") || "Next"),
    prevBtnText: popover.prevBtnText ?? (ctx.getConfig("prevBtnText") || "Previous"),

    doneButton: isDoneStep,

    popoverClass: popover.popoverClass || ctx.getConfig("popoverClass") || "",
    smoothScroll: ctx.getConfig("smoothScroll"),

    // The hooks are resolved when the button is clicked rather than up front,
    // so a setConfig() between render and click is still picked up.
    onNextClick: () => {
      // On the final step the next button acts as the done button, so a
      // dedicated onDoneClick takes precedence over onNextClick when provided.
      const onDoneClick = popover.onDoneClick || ctx.getConfig("onDoneClick");
      if (isDoneStep && onDoneClick) {
        return onDoneClick(element, step, ctx.getHookOpts());
      }

      // If the user has provided a custom callback, call it
      // otherwise, emit the event.
      const onNextClick = popover.onNextClick || ctx.getConfig("onNextClick");
      if (onNextClick) {
        return onNextClick(element, step, ctx.getHookOpts());
      }

      return ctx.emit("nextClick");
    },

    onPrevClick: () => {
      const onPrevClick = popover.onPrevClick || ctx.getConfig("onPrevClick");
      if (onPrevClick) {
        return onPrevClick(element, step, ctx.getHookOpts());
      }

      return ctx.emit("prevClick");
    },

    onCloseClick: () => {
      const onCloseClick = popover.onCloseClick || ctx.getConfig("onCloseClick");
      if (onCloseClick) {
        return onCloseClick(element, step, ctx.getHookOpts());
      }

      return ctx.emit("closeClick");
    },

    onRender: popoverDom => {
      // Commit the popover to state before the user hook runs; the hook's
      // opts.state.popover has always pointed at the freshly rendered popover.
      ctx.setState("popover", popoverDom);

      const onPopoverRender = popover.onPopoverRender || ctx.getConfig("onPopoverRender");
      onPopoverRender?.(popoverDom, ctx.getHookOpts());
    },

    position: resolveStepPosition(ctx, element, step),
  };
}

export function renderStepPopover(ctx: Context, element: Element, step: DriveStep) {
  destroyPopover(ctx.getState("popover"));

  renderPopover(element, resolveStepPopover(ctx, element, step));
}

export function repositionStepPopover(ctx: Context, element: Element, step: DriveStep) {
  const popover = ctx.getState("popover");
  if (!popover) {
    return;
  }

  repositionPopover(popover, element, resolveStepPosition(ctx, element, step));
}
