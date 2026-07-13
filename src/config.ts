import { Driver, DriveStep } from "./driver";
import { AllowedButtons, PopoverDOM } from "./popover";
import { State } from "./state";

export type HookOpts = {
  config: Config;
  state: State;
  driver: Driver;
  index: number | undefined;
};

export type DriverHook = (element: Element | undefined, step: DriveStep, opts: HookOpts) => void;

export type Config = {
  steps?: DriveStep[];

  animate?: boolean;
  duration?: number;
  overlayColor?: string;
  overlayOpacity?: number;
  smoothScroll?: boolean;
  allowClose?: boolean;
  allowScroll?: boolean;
  overlayClickBehavior?: "close" | "nextStep" | DriverHook;
  stagePadding?: number;
  stageRadius?: number;

  disableActiveInteraction?: boolean;

  // Skip a step whose target element is specified but missing from the DOM.
  // Element-less steps are intentional centered steps and never skipped. (default: false)
  skipMissingElement?: boolean;

  allowKeyboardControl?: boolean;

  // Popover specific configuration
  popoverClass?: string;
  popoverOffset?: number;
  showButtons?: AllowedButtons[];
  disableButtons?: AllowedButtons[];
  showProgress?: boolean;

  // Button texts
  progressText?: string;
  nextBtnText?: string;
  prevBtnText?: string;
  doneBtnText?: string;

  // Called after the popover is rendered
  onPopoverRender?: (popover: PopoverDOM, opts: HookOpts) => void;

  // State based callbacks, called upon state changes
  onHighlightStarted?: DriverHook;
  onHighlighted?: DriverHook;
  onDeselected?: DriverHook;
  onDestroyStarted?: DriverHook;
  onDestroyed?: DriverHook;

  // Event based callbacks, called upon events
  onNextClick?: DriverHook;
  onPrevClick?: DriverHook;
  onCloseClick?: DriverHook;
  onDoneClick?: DriverHook;
};

export interface GetConfig {
  (): Config;
  <K extends keyof Config>(key: K): Config[K];
}

export type ConfigStore = {
  getConfig: GetConfig;
  configure: (config?: Config) => void;
};

export function createConfigStore(): ConfigStore {
  let currentConfig: Config = {};

  function configure(config: Config = {}) {
    currentConfig = {
      animate: true,
      duration: 400,
      allowClose: true,
      allowScroll: true,
      overlayClickBehavior: "close",
      overlayOpacity: 0.7,
      smoothScroll: false,
      disableActiveInteraction: false,
      skipMissingElement: false,
      showProgress: false,
      stagePadding: 10,
      stageRadius: 5,
      popoverOffset: 10,
      showButtons: ["next", "previous", "close"],
      disableButtons: [],
      overlayColor: "#000",
      ...config,
    };
  }

  const getConfig: GetConfig = (<K extends keyof Config>(key?: K) => {
    return key ? currentConfig[key] : currentConfig;
  }) as GetConfig;

  configure();

  return { getConfig, configure };
}
