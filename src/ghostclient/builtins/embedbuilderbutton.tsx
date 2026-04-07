import React from "@modules/react";
import Builtin from "@structs/builtin";
import FloatingWindows from "@ui/floatingwindows";
import {getLazy, getLazyByStrings} from "@webpack";
import {findInTree} from "@common/utils";
import DiscordModules from "@modules/discordmodules";
import {LayoutTemplateIcon} from "lucide-react";
import EmbedBuilderUI from "@ui/embedbuilder/index";


function ToolbarButton({onClick, tooltip}: {onClick: () => void; tooltip: string;}) {
    const Tooltip = DiscordModules.Tooltip;
    return React.createElement(Tooltip, {text: tooltip, position: "bottom"},
        (props: any) => React.createElement("div", {
            ...props,
            className: "bd-toolbar-icon gc-embed-builder-btn",
            role: "button",
            "aria-label": tooltip,
            style: {
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--interactive-normal)",
                borderRadius: "4px",
                width: "32px",
                height: "32px",
                flexShrink: 0,
            },
            onClick,
        }, React.createElement(LayoutTemplateIcon, {size: "20px"}))
    );
}

function ChatInputButton({onClick}: {onClick: () => void;}) {
    const Tooltip = DiscordModules.Tooltip;
    return React.createElement(Tooltip, {text: "Embed Builder", position: "top"},
        (props: any) => React.createElement("button", {
            ...props,
            className: "gc-embed-chat-btn",
            "aria-label": "Embed Builder",
            style: {
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0 4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--interactive-normal)",
                width: "28px",
                height: "28px",
                borderRadius: "4px",
                flexShrink: 0,
            },
            onClick,
        }, React.createElement(LayoutTemplateIcon, {size: "20px"}))
    );
}


export default new class EmbedBuilderBuiltin extends Builtin {
    get name() {return "EmbedBuilderButton";}
    get category() {return "ghostclient";}
    get id() {return "embedBuilderButton";}

    async initialize() {
        this.patchChannelToolbar();
        this.patchChatInputButtons();
        this.initialized = true;
    }

    // ── 1. Channel header toolbar (neben Threads) ──────────────────────────
    async patchChannelToolbar() {
        const headerComp = await getLazy(m => {
            try {
                const str = (m?.type ?? m)?.toString?.() ?? "";
                return str.length > 100 &&
                    (str.includes("themedHeader") || str.includes("channelTextArea")) &&
                    str.includes("toolbar");
            }
            catch {return false;}
        }, {cacheId: "gc-embedbuilder-header"});

        if (!headerComp) {
            this.warn("Channel header toolbar nicht gefunden, versuche Fallback...");
            this.patchToolbarFallback();
            return;
        }

        const target = headerComp.type ?? headerComp;
        this.after(target, "type", (_, __, ret) => this.injectHeaderButton(ret));
    }

    async patchToolbarFallback() {
        const toolbarComp = await getLazy(m => {
            try {
                const str = (m?.type ?? m)?.toString?.() ?? "";
                return str.includes("toolbar") && str.includes("icons") && str.length > 80;
            }
            catch {return false;}
        }, {cacheId: "gc-embedbuilder-toolbar-fallback"});

        if (!toolbarComp) return;
        this.after(toolbarComp.type ?? toolbarComp, "type", (_, __, ret) => this.injectHeaderButton(ret));
    }

    injectHeaderButton(ret: any) {
        if (!ret) return;

        const toolbar = findInTree(ret, n =>
            typeof n?.className === "string" &&
            n.className.includes("toolbar") &&
            (Array.isArray(n.children) || n.children),
        {walkable: ["props", "children"]});

        if (!toolbar) return;
        if (!Array.isArray(toolbar.children)) {
            toolbar.children = toolbar.children ? [toolbar.children] : [];
        }
        if (toolbar.children.some?.((c: any) => c?.key === "gc-embed-header-btn")) return;

        toolbar.children.unshift(React.createElement(ToolbarButton, {
            key: "gc-embed-header-btn",
            tooltip: "GhostClient Embed Builder",
            onClick: () => this.openEmbedBuilder(),
        }));
    }

    // ── 2. Chat input buttons (neben GIF / Emoji / Sticker) ───────────────
    async patchChatInputButtons() {
        const chatButtons =
            await getLazyByStrings(
                ["gifFavoriteButton", "stickerButton"],
                {cacheId: "gc-embedbuilder-chatbtns", defaultExport: false}
            ) ??
            await getLazyByStrings(
                ["expressionPickerButton", "emojiButton"],
                {cacheId: "gc-embedbuilder-chatbtns2", defaultExport: false}
            ) ??
            await getLazy(m => {
                try {
                    const str = Object.values(m as Record<string, any>)
                        .find((v: any) => typeof v === "function")?.toString?.() ?? "";
                    return str.includes("gifFavorit") || str.includes("expressionPicker");
                }
                catch {return false;}
            }, {cacheId: "gc-embedbuilder-chatbtns3"});

        if (!chatButtons) {
            this.warn("Chat-Input-Buttons nicht gefunden — Chat-Button wird nicht angezeigt.");
            return;
        }

        const fn = typeof chatButtons === "function"
            ? chatButtons
            : Object.values(chatButtons as Record<string, any>).find(v => typeof v === "function");

        if (!fn) return;

        const key = Object.keys(chatButtons as Record<string, any>)
            .find(k => (chatButtons as any)[k] === fn) ?? "default";

        this.after(chatButtons, key, (_, __, ret) => this.injectChatButton(ret));
    }

    injectChatButton(ret: any) {
        if (!ret) return;

        const buttonsContainer = findInTree(ret, n =>
            Array.isArray(n?.children) &&
            n.children.some?.((c: any) =>
                typeof c?.props?.className === "string" &&
                (c.props.className.includes("gif") ||
                    c.props.className.includes("expression") ||
                    c.props.className.includes("emoji"))
            ),
        {walkable: ["props", "children"]});

        const target = buttonsContainer ?? findInTree(ret, n =>
            Array.isArray(n?.children) && n.children.length >= 2,
        {walkable: ["props", "children"]});

        if (!target?.children) return;
        if (!Array.isArray(target.children)) target.children = [target.children];
        if (target.children.some?.((c: any) => c?.key === "gc-embed-chat-btn")) return;

        target.children.unshift(React.createElement(ChatInputButton, {
            key: "gc-embed-chat-btn",
            onClick: () => this.openEmbedBuilder(),
        }));
    }

    // ── Floating Window ───────────────────────────────────────────────────
    openEmbedBuilder() {
        FloatingWindows.open({
            id: "gc-embed-builder-window",
            title: "GhostClient · Embed Builder",
            resizable: true,
            center: true,
            width: 1050,
            height: 700,
            children: React.createElement(EmbedBuilderUI),
        });
    }
};
