import { describe, expect, it, vi } from "vitest";
import { createContext } from "../src/context";
import type { Driver } from "../src/driver";

// Covers the per-instance context directly: the config store with its
// defaults, the state store, and the single-listener emitter. The public
// driver API built on top of it is covered in backward-compat.test.ts.

describe("config store", () => {
  it("seeds the documented defaults", () => {
    const ctx = createContext();

    expect(ctx.getConfig("animate")).toBe(true);
    expect(ctx.getConfig("duration")).toBe(400);
    expect(ctx.getConfig("allowClose")).toBe(true);
    expect(ctx.getConfig("overlayClickBehavior")).toBe("close");
    expect(ctx.getConfig("overlayOpacity")).toBe(0.7);
    expect(ctx.getConfig("stagePadding")).toBe(10);
    expect(ctx.getConfig("stageRadius")).toBe(5);
    expect(ctx.getConfig("popoverOffset")).toBe(10);
    expect(ctx.getConfig("showButtons")).toEqual(["next", "previous", "close"]);
    expect(ctx.getConfig("overlayColor")).toBe("#000");
  });

  it("layers the instance options over the defaults", () => {
    const ctx = createContext({ animate: false, stagePadding: 4 });

    expect(ctx.getConfig("animate")).toBe(false);
    expect(ctx.getConfig("stagePadding")).toBe(4);
    expect(ctx.getConfig("duration")).toBe(400);
  });

  it("returns the whole config when called without a key", () => {
    const ctx = createContext({ animate: false });

    expect(ctx.getConfig()).toMatchObject({ animate: false, duration: 400 });
  });

  it("replaces the config wholesale on setConfig, re-applying defaults", () => {
    const ctx = createContext({ animate: false });

    ctx.setConfig({ duration: 100 });

    expect(ctx.getConfig("duration")).toBe(100);
    expect(ctx.getConfig("animate")).toBe(true);
  });
});

describe("state store", () => {
  it("reads back what was set, by key or wholesale", () => {
    const ctx = createContext();

    ctx.setState("activeIndex", 2);

    expect(ctx.getState("activeIndex")).toBe(2);
    expect(ctx.getState()).toEqual({ activeIndex: 2 });
  });

  it("clears everything on resetState", () => {
    const ctx = createContext();

    ctx.setState("activeIndex", 2);
    ctx.resetState();

    expect(ctx.getState()).toEqual({});
  });
});

describe("emitter", () => {
  it("fires the registered listener on emit", () => {
    const ctx = createContext();
    const listener = vi.fn();

    ctx.listen("nextClick", listener);
    ctx.emit("nextClick");

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("keeps a single listener per event, the last one registered", () => {
    const ctx = createContext();
    const first = vi.fn();
    const second = vi.fn();

    ctx.listen("nextClick", first);
    ctx.listen("nextClick", second);
    ctx.emit("nextClick");

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("does nothing when emitting an event nobody listens to", () => {
    const ctx = createContext();

    expect(() => ctx.emit("prevClick")).not.toThrow();
  });

  it("drops all listeners on resetEmitter", () => {
    const ctx = createContext();
    const listener = vi.fn();

    ctx.listen("nextClick", listener);
    ctx.resetEmitter();
    ctx.emit("nextClick");

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("hook opts", () => {
  it("bundles the config, state, driver and active index", () => {
    const ctx = createContext({ animate: false });
    const fakeDriver = { isActive: () => true } as Driver;

    ctx.setDriver(fakeDriver);
    ctx.setState("activeIndex", 1);

    const opts = ctx.getHookOpts();

    expect(opts.config.animate).toBe(false);
    expect(opts.state.activeIndex).toBe(1);
    expect(opts.driver).toBe(fakeDriver);
    expect(opts.index).toBe(1);
  });

  it("uses the state override when one is passed", () => {
    const ctx = createContext();

    ctx.setState("activeIndex", 1);

    const opts = ctx.getHookOpts({ activeIndex: 5 });

    expect(opts.state.activeIndex).toBe(5);
    expect(opts.index).toBe(5);
  });
});
