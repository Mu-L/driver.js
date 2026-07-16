import { useEffect, useRef, useState } from "react";
import type { DriverHint, Hints } from "driver.js/hints";
import { hints } from "driver.js/hints";
import "driver.js/dist/driver.css";
import "driver.js/dist/hints.css";

type HintsSampleProps = {
  hints: DriverHint[];
  buttonText?: string;
  onDismiss?: "persist";
};

// A small mock UI the hints attach to, so every sample on the page is
// self-contained. The hint configs passed in reference the ids rendered here.
export function HintsSample(props: HintsSampleProps) {
  const { buttonText = "Show Hints" } = props;
  const instance = useRef<Hints | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    return () => instance.current?.hide();
  }, []);

  function onToggle() {
    if (!instance.current) {
      instance.current = hints({
        popoverClass: "driverjs-theme",
        hints: props.hints,
      });
    }

    if (visible) {
      instance.current.hide();
    } else {
      instance.current.show();
    }

    setVisible(!visible);
  }

  return (
    <div className="my-6">
      <div className="rounded-lg border border-gray-200 p-5">
        <div className="mb-4 flex items-center justify-between">
          <span id="hint-demo-title" className="text-lg font-semibold">
            Quarterly Report
          </span>
          <span className="flex gap-2">
            <button
              id="hint-demo-export"
              type="button"
              className="cursor-pointer rounded-md border border-gray-300 px-3 py-1 text-sm"
            >
              Export
            </button>
            <button
              id="hint-demo-share"
              type="button"
              className="cursor-pointer rounded-md border border-gray-300 px-3 py-1 text-sm"
            >
              Share
            </button>
          </span>
        </div>
        <p id="hint-demo-summary" className="m-0 text-sm text-gray-600">
          Revenue is up 12% quarter over quarter. Click the beacons to explore what changed — the page stays fully
          interactive while they are shown.
        </p>
      </div>

      <button
        type="button"
        onClick={onToggle}
        className="mt-4 cursor-pointer rounded-md bg-black px-4 py-2 text-sm text-white"
      >
        {visible ? "Hide Hints" : buttonText}
      </button>
    </div>
  );
}
