import { describe, expect, it } from "vitest";
import { createDriver, popoverTitle, useDriverHarness } from "./utils";

useDriverHarness();

// #intro and #card-1 exist in DEMO_HTML; #missing never does.
const STEPS = [
  { element: "#intro", popover: { title: "Step 1" } },
  { element: "#missing", popover: { title: "Step 2" } },
  { element: "#card-1", popover: { title: "Step 3" } },
];

describe("skipMissingElement", () => {
  it("skips a step whose element is missing when moving forward", () => {
    const d = createDriver({ animate: false, skipMissingElement: true, steps: STEPS });
    d.drive();
    expect(popoverTitle()).toBe("Step 1");

    d.moveNext();
    expect(popoverTitle()).toBe("Step 3");
    expect(d.getActiveIndex()).toBe(2);
  });

  it("skips a step whose element is missing when moving backward", () => {
    const d = createDriver({ animate: false, skipMissingElement: true, steps: STEPS });
    d.drive(2);
    expect(popoverTitle()).toBe("Step 3");

    d.movePrevious();
    expect(popoverTitle()).toBe("Step 1");
    expect(d.getActiveIndex()).toBe(0);
  });

  it("skips a missing first step on initial drive", () => {
    const d = createDriver({
      animate: false,
      skipMissingElement: true,
      steps: [{ element: "#missing", popover: { title: "Step 1" } }, ...STEPS.slice(2)],
    });
    d.drive();
    expect(d.getActiveIndex()).toBe(1);
    expect(popoverTitle()).toBe("Step 3");
  });

  it("does not skip when the option is off (shows the centered popover)", () => {
    const d = createDriver({ animate: false, steps: STEPS });
    d.drive();
    d.moveNext();

    expect(d.getActiveIndex()).toBe(1);
    expect(popoverTitle()).toBe("Step 2");
  });

  it("never skips an intentional element-less step", () => {
    const d = createDriver({
      animate: false,
      skipMissingElement: true,
      steps: [
        { element: "#intro", popover: { title: "Step 1" } },
        { popover: { title: "Centered" } },
        { element: "#card-1", popover: { title: "Step 3" } },
      ],
    });
    d.drive();
    d.moveNext();

    expect(d.getActiveIndex()).toBe(1);
    expect(popoverTitle()).toBe("Centered");
  });

  it("honours a step-level skipMissingElement over the driver default", () => {
    const d = createDriver({
      animate: false,
      steps: [
        { element: "#intro", popover: { title: "Step 1" } },
        { element: "#missing", skipMissingElement: true, popover: { title: "Step 2" } },
        { element: "#card-1", popover: { title: "Step 3" } },
      ],
    });
    d.drive();
    d.moveNext();

    expect(d.getActiveIndex()).toBe(2);
    expect(popoverTitle()).toBe("Step 3");
  });

  it("ends the tour when the remaining forward steps are all missing", () => {
    const d = createDriver({
      animate: false,
      skipMissingElement: true,
      steps: [
        { element: "#intro", popover: { title: "Step 1" } },
        { element: "#missing", popover: { title: "Step 2" } },
        { element: "#missing-too", popover: { title: "Step 3" } },
      ],
    });
    d.drive();
    d.moveNext();

    expect(d.isActive()).toBe(false);
  });

  it("stays put when moving backward finds no earlier present step", () => {
    const d = createDriver({
      animate: false,
      skipMissingElement: true,
      steps: [
        { element: "#missing", popover: { title: "Step 1" } },
        { element: "#missing-too", popover: { title: "Step 2" } },
        { element: "#card-1", popover: { title: "Step 3" } },
      ],
    });
    d.drive(2);
    expect(d.getActiveIndex()).toBe(2);

    d.movePrevious();
    expect(d.isActive()).toBe(true);
    expect(d.getActiveIndex()).toBe(2);
    expect(popoverTitle()).toBe("Step 3");
  });
});
