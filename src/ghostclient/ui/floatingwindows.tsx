import React from "@modules/react";
import ReactDOM from "@modules/reactdom";
import Events from "@modules/emitter";
import DOMManager from "@modules/dommanager";

import FloatingWindowContainer from "./floating/container";
import type {FloatingWindowProps} from "./floating/window";


let hasInitialized = false;
export default class FloatingWindows {
    static initialize() {
        const div = DOMManager.parseHTML(`<div id="floating-windows-layer">`) as HTMLDivElement;
        DOMManager.bdBody.append(div);
        const root = ReactDOM.createRoot(div);
        root.render(<FloatingWindowContainer />);
        hasInitialized = true;
    }

    static open(window: FloatingWindowProps) {
        if (!hasInitialized) this.initialize();
        return Events.emit("open-window", window);
    }
}