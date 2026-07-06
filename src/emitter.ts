type allowedEvents =
  | "overlayClick"
  | "escapePress"
  | "nextClick"
  | "prevClick"
  | "closeClick"
  | "arrowRightPress"
  | "arrowLeftPress";

export type Emitter = {
  listen: (hook: allowedEvents, callback: () => void) => void;
  emit: (hook: allowedEvents) => void;
  reset: () => void;
};

// Each driver instance owns its own emitter so events raised by one tour never
// trigger listeners registered by another.
export function createEmitter(): Emitter {
  let registeredListeners: Partial<{ [key in allowedEvents]: () => void }> = {};

  function listen(hook: allowedEvents, callback: () => void) {
    registeredListeners[hook] = callback;
  }

  function emit(hook: allowedEvents) {
    registeredListeners[hook]?.();
  }

  function reset() {
    registeredListeners = {};
  }

  return { listen, emit, reset };
}
