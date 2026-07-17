import { describe, expect, it, vi } from "vitest";
import { Config, createContext } from "../src/context";
import type { DriveStep } from "../src/driver";
import { resolveCloseHook, resolveNextHook, resolvePrevHook, resolveTourStep, TourStepDefaults } from "../src/step";

// Covers the step resolution directly: which buttons a tour step ends up
// with, the texts on them, and how click hooks resolve between the step, the
// config and the tour's default actions. The rendered result is covered in
// popover.test.ts and interactions.test.ts.

const STEPS: DriveStep[] = [
  { element: "#one", popover: { title: "First" } },
  { element: "#two", popover: { title: "Second" } },
  { element: "#three", popover: { title: "Third" } },
];

function makeContext(config: Config = {}) {
  return createContext({ steps: STEPS, ...config });
}

function makeDefaults(): TourStepDefaults {
  return { onNextClick: vi.fn(), onPrevClick: vi.fn(), onCloseClick: vi.fn() };
}

describe("resolveTourStep", () => {
  it("shows all built-in buttons and disables previous on the first step", () => {
    const resolved = resolveTourStep(makeContext(), 0, makeDefaults());

    expect(resolved.popover?.showButtons).toEqual(["next", "previous", "close"]);
    expect(resolved.popover?.disableButtons).toEqual(["previous"]);
  });

  it("leaves previous enabled on later steps", () => {
    const resolved = resolveTourStep(makeContext(), 1, makeDefaults());

    expect(resolved.popover?.disableButtons).toEqual([]);
  });

  it("drops the close button when allowClose is false", () => {
    const resolved = resolveTourStep(makeContext({ allowClose: false }), 0, makeDefaults());

    expect(resolved.popover?.showButtons).toEqual(["next", "previous"]);
  });

  it("narrows the buttons to the configured showButtons", () => {
    const resolved = resolveTourStep(makeContext({ showButtons: ["next"] }), 1, makeDefaults());

    expect(resolved.popover?.showButtons).toEqual(["next"]);
  });

  it("lets a step's own showButtons win over the config", () => {
    const ctx = makeContext({
      showButtons: ["next"],
      steps: [{ element: "#one", popover: { title: "First", showButtons: ["close"] } }, ...STEPS.slice(1)],
    });

    const resolved = resolveTourStep(ctx, 0, makeDefaults());

    expect(resolved.popover?.showButtons).toEqual(["close"]);
  });

  it("labels the next button as the done button on the last step", () => {
    const resolved = resolveTourStep(makeContext(), STEPS.length - 1, makeDefaults());

    expect(resolved.popover?.nextBtnText).toBe("Done");
  });

  it("honours a configured done button text", () => {
    const resolved = resolveTourStep(makeContext({ doneBtnText: "Finish" }), STEPS.length - 1, makeDefaults());

    expect(resolved.popover?.nextBtnText).toBe("Finish");
  });

  it("leaves the next button text unset before the last step", () => {
    const resolved = resolveTourStep(makeContext(), 0, makeDefaults());

    expect(resolved.popover?.nextBtnText).toBeUndefined();
  });

  it("replaces the progress placeholders with the step position", () => {
    const resolved = resolveTourStep(makeContext(), 1, makeDefaults());

    expect(resolved.popover?.progressText).toBe("2 of 3");
  });

  it("replaces the placeholders in a configured progress template", () => {
    const resolved = resolveTourStep(makeContext({ progressText: "Step {{current}}/{{total}}" }), 0, makeDefaults());

    expect(resolved.popover?.progressText).toBe("Step 1/3");
  });

  it("resolves showProgress from the step before the config", () => {
    const ctx = makeContext({
      showProgress: true,
      steps: [{ element: "#one", popover: { title: "First", showProgress: false } }, ...STEPS.slice(1)],
    });

    const resolved = resolveTourStep(ctx, 0, makeDefaults());

    expect(resolved.popover?.showProgress).toBe(false);
  });

  it("keeps the step's own popover fields", () => {
    const resolved = resolveTourStep(makeContext(), 1, makeDefaults());

    expect(resolved.element).toBe("#two");
    expect(resolved.popover?.title).toBe("Second");
  });

  it("falls back to the tour's default button actions", () => {
    const defaults = makeDefaults();

    const resolved = resolveTourStep(makeContext(), 0, defaults);

    expect(resolved.popover?.onNextClick).toBe(defaults.onNextClick);
    expect(resolved.popover?.onPrevClick).toBe(defaults.onPrevClick);
    expect(resolved.popover?.onCloseClick).toBe(defaults.onCloseClick);
  });

  it("prefers a config-level hook over the default action", () => {
    const onNextClick = vi.fn();

    const resolved = resolveTourStep(makeContext({ onNextClick }), 0, makeDefaults());

    expect(resolved.popover?.onNextClick).toBe(onNextClick);
  });

  it("prefers a step-level hook over the config and the default action", () => {
    const stepHook = vi.fn();
    const ctx = makeContext({
      onNextClick: vi.fn(),
      steps: [{ element: "#one", popover: { title: "First", onNextClick: stepHook } }, ...STEPS.slice(1)],
    });

    const resolved = resolveTourStep(ctx, 0, makeDefaults());

    expect(resolved.popover?.onNextClick).toBe(stepHook);
  });
});

describe("resolveNextHook", () => {
  it("returns nothing when no hook is configured", () => {
    expect(resolveNextHook(makeContext(), STEPS[0])).toBeUndefined();
  });

  it("prefers the step hook over the config hook", () => {
    const stepHook = vi.fn();
    const ctx = makeContext({ onNextClick: vi.fn() });
    const step: DriveStep = { element: "#one", popover: { onNextClick: stepHook } };

    expect(resolveNextHook(ctx, step)).toBe(stepHook);
  });

  it("falls back to the config hook", () => {
    const configHook = vi.fn();
    const ctx = makeContext({ onNextClick: configHook });

    expect(resolveNextHook(ctx, STEPS[0])).toBe(configHook);
  });

  it("prefers onDoneClick on the last step", () => {
    const onDoneClick = vi.fn();
    const onNextClick = vi.fn();
    const ctx = makeContext({ onDoneClick, onNextClick });

    ctx.setState("activeIndex", STEPS.length - 1);

    expect(resolveNextHook(ctx, STEPS[STEPS.length - 1])).toBe(onDoneClick);
  });

  it("ignores onDoneClick before the last step", () => {
    const onDoneClick = vi.fn();
    const onNextClick = vi.fn();
    const ctx = makeContext({ onDoneClick, onNextClick });

    ctx.setState("activeIndex", 0);

    expect(resolveNextHook(ctx, STEPS[0])).toBe(onNextClick);
  });

  it("ignores onDoneClick while no step is active", () => {
    const onDoneClick = vi.fn();
    const ctx = makeContext({ onDoneClick });

    expect(resolveNextHook(ctx, STEPS[0])).toBeUndefined();
  });
});

describe("resolvePrevHook and resolveCloseHook", () => {
  it("prefer the step hook over the config hook", () => {
    const stepPrev = vi.fn();
    const stepClose = vi.fn();
    const ctx = makeContext({ onPrevClick: vi.fn(), onCloseClick: vi.fn() });
    const step: DriveStep = { element: "#one", popover: { onPrevClick: stepPrev, onCloseClick: stepClose } };

    expect(resolvePrevHook(ctx, step)).toBe(stepPrev);
    expect(resolveCloseHook(ctx, step)).toBe(stepClose);
  });

  it("fall back to the config hook and then to nothing", () => {
    const configPrev = vi.fn();
    const ctx = makeContext({ onPrevClick: configPrev });

    expect(resolvePrevHook(ctx, STEPS[0])).toBe(configPrev);
    expect(resolveCloseHook(ctx, STEPS[0])).toBeUndefined();
  });
});
