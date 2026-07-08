import { Config, createConfigStore, GetConfig } from "./config";
import { createStateStore, GetState, SetState } from "./state";
import { createEmitter, Emitter } from "./emitter";
import type { Driver } from "./driver";

// Per-instance config, state and emitter, threaded through the helpers so
// nothing falls back to shared module-level state.
export type Context = {
  getConfig: GetConfig;
  setConfig: (config?: Config) => void;

  getState: GetState;
  setState: SetState;
  resetState: () => void;

  listen: Emitter["listen"];
  emit: Emitter["emit"];
  resetEmitter: () => void;

  getDriver: () => Driver;
  setDriver: (driver: Driver) => void;
};

export function createContext(options: Config = {}): Context {
  const config = createConfigStore();
  config.configure(options);

  const state = createStateStore();
  const emitter = createEmitter();

  let driver: Driver;

  return {
    getConfig: config.getConfig,
    setConfig: config.configure,

    getState: state.getState,
    setState: state.setState,
    resetState: state.resetState,

    listen: emitter.listen,
    emit: emitter.emit,
    resetEmitter: emitter.reset,

    getDriver: () => driver,
    setDriver: (value: Driver) => {
      driver = value;
    },
  };
}
