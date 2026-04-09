import React, {useState, useCallback, useMemo, useRef} from "@modules/react";
import {t} from "@common/i18n";
import DiscordModules from "@modules/discordmodules";
import ipc from "@modules/ipc";
import fs from "fs";
import path from "path";

import Button from "../base/button";
import AddonCard from "./addoncard";
import Dropdown from "./components/dropdown";

import Modals from "@ui/modals";
import ErrorBoundary from "@ui/errorboundary";

import NoResults from "@ui/blankslates/noresults";
import EmptySlate from "@ui/blankslates/empty";
import {buildDirectionOptions, makeBasicButton, getState, saveState, AddonHeader} from "./addonshared";
import {CheckIcon, FolderIcon, LayoutGridIcon, SearchIcon, StretchHorizontalIcon, XIcon} from "lucide-react";
import {useStateFromStores} from "@ui/hooks";
import {type Addon} from "@modules/addonmanager";
import type AddonManager from "@modules/addonmanager"; // eslint-disable-line no-duplicate-imports
import type {Plugin} from "@modules/pluginmanager";
import type {Theme} from "@modules/thememanager";
import type {MouseEvent, ReactNode} from "react";


type ViewTypes = "grid" | "list";
type SortTypes = "name" | "author" | "version" | "added" | "modified" | "isEnabled";
type EnabledFilter = "all" | "enabled" | "disabled";

const buildSortOptions = () => ([
    {label: t("Addons.name"), value: "name"},
    {label: t("Addons.author"), value: "author"},
    {label: t("Addons.version"), value: "version"},
    {label: t("Addons.added"), value: "added"},
    {label: t("Addons.modified"), value: "modified"},
    {label: t("Addons.isEnabled"), value: "isEnabled"}
] as Array<{label: string; value: SortTypes;}>);


function openFolder(folder: string) {
    ipc.openPath(folder);
}

function Blankslate({type, folder}: {type: "plugin" | "theme"; folder: string;}) {
    return <EmptySlate title={t("Addons.blankSlateHeader", {context: type})} message={""}>
        <Button size={Button.Sizes.LARGE} onClick={() => openFolder(folder)}>
            {t("Addons.openFolder", {context: type})}
        </Button>
    </EmptySlate>;
}

function makeControlButton(title: string, children: ReactNode, action: () => void, selected = false) {
    return <DiscordModules.Tooltip color="primary" position="top" text={title.toString()}>
        {(props) => {
            return <Button {...props} size={Button.Sizes.NONE} aria-label={title.toString()} look={Button.Looks.BLANK} className={"bd-button bd-view-button" + (selected ? " selected" : "")} onClick={action}>{children}</Button>;
        }}
    </DiscordModules.Tooltip>;
}

function confirmDelete(addon: Addon) {
    return new Promise(resolve => {
        Modals.showConfirmationModal(t("Modals.confirmAction"), t("Addons.confirmDelete", {name: addon.name}), {
            danger: true,
            confirmText: t("Addons.deleteAddon"),
            onConfirm: () => {resolve(true);},
            onCancel: () => {resolve(false);}
        });
    });
}

function confirmEnable(action: () => void, type: string) {
    return function (event: MouseEvent) {
        if (event.shiftKey) return action();
        Modals.showConfirmationModal(t("Modals.confirmAction"), t("Addons.enableAllWarning", {context: type.toLocaleLowerCase()}), {
            confirmText: t("Modals.okay"),
            cancelText: t("Modals.cancel"),
            danger: true,
            onConfirm: action,
        });
    };
}

function matchesName(name: string, needle: string): boolean {
    const h = name.toLocaleLowerCase();
    const n = needle.toLocaleLowerCase().trim();
    if (!n) return true;

    if (h.includes(n)) return true;

    if (n.length < 4) return false;
    const maxErrors = Math.max(1, Math.floor(n.length / 5));
    const prev = Array.from({length: n.length + 1}, (_, i) => i);
    for (let i = 0; i < h.length; i++) {
        const curr = new Array(n.length + 1);
        curr[0] = 0;
        for (let j = 0; j < n.length; j++) {
            curr[j + 1] = h[i] === n[j] ? prev[j] : 1 + Math.min(prev[j], prev[j + 1], curr[j]);
        }
        if (curr[n.length] <= maxErrors) return true;
        for (let j = 0; j <= n.length; j++) prev[j] = curr[j];
    }
    return false;
}

function SearchBar({query, onQueryChange, enabledFilter, onFilterChange, isTheme}: {
    query: string;
    onQueryChange(v: string): void;
    enabledFilter: EnabledFilter;
    onFilterChange(v: EnabledFilter): void;
    isTheme?: boolean;
}) {
    const inputRef = useRef<HTMLInputElement>(null);

    const filterButtons: {label: string; value: EnabledFilter;}[] = [
        {label: "Alle", value: "all"},
        {label: "Aktiviert", value: "enabled"},
        {label: "Deaktiviert", value: "disabled"},
    ];

    return (
        <div style={{display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", marginBottom: "4px"}}>
            <div style={{flex: 1, display: "flex", alignItems: "center", background: "var(--input-background, #1e1f22)", border: "1px solid var(--input-border, #3f4147)", borderRadius: "6px", padding: "0 10px", height: "36px", gap: "8px"}}>
                <SearchIcon size="16px" style={{color: "var(--text-muted)", flexShrink: 0}} />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => onQueryChange(e.currentTarget.value)}
                    placeholder={isTheme ? "Theme suchen..." : "Plugin suchen..."}
                    maxLength={50}
                    style={{flex: 1, background: "none", border: "none", outline: "none", color: "var(--text-normal)", fontSize: "14px", fontFamily: "inherit"}}
                />
                {query && (
                    <button onClick={() => { onQueryChange(""); inputRef.current?.focus(); }} style={{background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", padding: 0, flexShrink: 0}}>
                        <XIcon size="14px" />
                    </button>
                )}
            </div>
            <div style={{display: "flex", gap: "4px", flexShrink: 0}}>
                {filterButtons.map(btn => (
                    <button key={btn.value} onClick={() => onFilterChange(btn.value)} style={{padding: "6px 12px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, transition: "background 0.15s, color 0.15s", background: enabledFilter === btn.value ? "var(--brand-experiment, #5865f2)" : "var(--background-modifier-hover, #3f4147)", color: enabledFilter === btn.value ? "#fff" : "var(--text-normal)"}}>
                        {btn.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

type InputMode = "file" | "url";

function rgbToHex(r: number, g: number, b: number): string {
    return "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
}

function darken(hex: string, amount: number): string {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, (n >> 16) - amount);
    const g = Math.max(0, ((n >> 8) & 0xff) - amount);
    const b = Math.max(0, (n & 0xff) - amount);
    return rgbToHex(r, g, b);
}

function lighten(hex: string, amount: number): string {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, (n >> 16) + amount);
    const g = Math.min(255, ((n >> 8) & 0xff) + amount);
    const b = Math.min(255, (n & 0xff) + amount);
    return rgbToHex(r, g, b);
}

function luminance(hex: string): number {
    const n = parseInt(hex.slice(1), 16);
    return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 0xff) + 0.114 * (n & 0xff);
}

function extractDominantColors(imgEl: HTMLImageElement, count: number): string[] {
    const canvas = document.createElement("canvas");
    const size = 80;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return ["#313338", "#2b2d31", "#1e1f22", "#5865f2", "#ffffff"];
    ctx.drawImage(imgEl, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;
    const buckets: {[key: string]: number} = {};
    for (let i = 0; i < data.length; i += 4) {
        const r = Math.round(data[i] / 32) * 32;
        const g = Math.round(data[i + 1] / 32) * 32;
        const b = Math.round(data[i + 2] / 32) * 32;
        const key = rgbToHex(Math.min(r, 255), Math.min(g, 255), Math.min(b, 255));
        buckets[key] = (buckets[key] || 0) + 1;
    }
    return Object.entries(buckets)
        .sort((a, b) => b[1] - a[1])
        .slice(0, count)
        .map(e => e[0]);
}

function hexToRgb(hex: string): [number, number, number] {
    const n = parseInt(hex.replace("#", "").padStart(6, "0"), 16);
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function rgba(hex: string, a: number): string {
    const [r, g, b] = hexToRgb(hex);
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
}

async function compressImage(dataUrl: string, maxW = 1920, maxH = 1080, quality = 0.82): Promise<string> {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            let {width: w, height: h} = img;
            const ratio = Math.min(maxW / w, maxH / h, 1);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}

async function captureVideoFrames(videoEl: HTMLVideoElement, count = 8): Promise<string[]> {
    const frames: string[] = [];
    const duration = videoEl.duration;
    const vw = Math.min(videoEl.videoWidth || 1280, 960);
    const vh = Math.round(vw * (videoEl.videoHeight || 720) / (videoEl.videoWidth || 1280));

    const drawFrame = () => {
        try {
            const canvas = document.createElement("canvas");
            canvas.width = vw; canvas.height = vh;
            canvas.getContext("2d")!.drawImage(videoEl, 0, 0, vw, vh);
            frames.push(canvas.toDataURL("image/jpeg", 0.72));
        } catch {}
    };

    if (!duration || !isFinite(duration)) {
        drawFrame();
        return frames;
    }

    for (let i = 0; i < count; i++) {
        const seekTo = (i / count) * duration;
        await new Promise<void>(resolve => {
            const onSeeked = () => {
                videoEl.removeEventListener("seeked", onSeeked);
                drawFrame();
                resolve();
            };
            videoEl.addEventListener("seeked", onSeeked);
            videoEl.currentTime = seekTo;
        });
    }
    return frames;
}

function generateThemeCSS(name: string, description: string, colors: string[], bgFrames?: string[]): string {
    const dominant = colors[0] || "#1e1f22";
    const accent = colors.find(c => { const l = luminance(c); return l > 50 && l < 220; }) || "#5865f2";
    const textColor = "#f2f3f5";
    const mutedColor = "#b5bac1";
    const hasBg = !!(bgFrames?.length);
    const isAnimated = (bgFrames?.length ?? 0) > 1;
    const firstFrame = bgFrames?.[0] ?? "";

    const vars =
        ":root {\n" +
        "    --background-primary: " + (hasBg ? rgba(dominant, 0.75) : dominant) + ";\n" +
        "    --background-secondary: " + (hasBg ? rgba(darken(dominant, 12), 0.72) : darken(dominant, 12)) + ";\n" +
        "    --background-secondary-alt: " + (hasBg ? rgba(darken(dominant, 18), 0.70) : darken(dominant, 18)) + ";\n" +
        "    --background-tertiary: " + (hasBg ? rgba(darken(dominant, 28), 0.76) : darken(dominant, 28)) + ";\n" +
        "    --background-accent: " + (hasBg ? rgba(darken(dominant, 40), 0.80) : darken(dominant, 40)) + ";\n" +
        "    --background-floating: " + (hasBg ? rgba(darken(dominant, 22), 0.88) : darken(dominant, 22)) + ";\n" +
        "    --background-modifier-hover: " + rgba(lighten(dominant, 15), 0.18) + ";\n" +
        "    --background-modifier-active: " + rgba(lighten(dominant, 15), 0.30) + ";\n" +
        "    --background-modifier-selected: " + rgba(lighten(dominant, 15), 0.24) + ";\n" +
        "    --background-modifier-accent: " + rgba(lighten(dominant, 15), 0.12) + ";\n" +
        "    --channeltextarea-background: " + (hasBg ? rgba(darken(dominant, 18), 0.72) : darken(dominant, 18)) + ";\n" +
        "    --deprecated-card-bg: " + (hasBg ? rgba(darken(dominant, 12), 0.72) : darken(dominant, 12)) + ";\n" +
        "    --input-background: " + (hasBg ? rgba(darken(dominant, 28), 0.76) : darken(dominant, 28)) + ";\n" +
        "    --input-border: " + rgba(lighten(dominant, 20), 0.22) + ";\n" +
        "    --header-primary: " + textColor + ";\n" +
        "    --header-secondary: " + mutedColor + ";\n" +
        "    --text-normal: " + textColor + ";\n" +
        "    --text-muted: " + mutedColor + ";\n" +
        "    --text-link: " + accent + ";\n" +
        "    --interactive-normal: " + mutedColor + ";\n" +
        "    --interactive-hover: #dcddde;\n" +
        "    --interactive-active: #fff;\n" +
        "    --interactive-muted: #4e5058;\n" +
        "    --brand-experiment: " + accent + ";\n" +
        "    --brand-experiment-560: " + accent + ";\n" +
        "    --scrollbar-thin-thumb: " + rgba(lighten(dominant, 30), 0.45) + ";\n" +
        "    --scrollbar-thin-track: transparent;\n" +
        "    --scrollbar-auto-thumb: " + rgba(lighten(dominant, 30), 0.55) + ";\n" +
        "    --scrollbar-auto-track: transparent;\n" +
        "    --activity-card-background: " + (hasBg ? rgba(darken(dominant, 12), 0.72) : darken(dominant, 12)) + ";\n" +
        "    --modal-background: " + (hasBg ? rgba(darken(dominant, 12), 0.90) : darken(dominant, 12)) + ";\n" +
        "    --modal-footer-background: " + (hasBg ? rgba(darken(dominant, 28), 0.90) : darken(dominant, 28)) + ";\n" +
        "}\n";

    const s  = rgba(darken(dominant, 10), 0.72);
    const ch = rgba(darken(dominant, 4),  0.62);
    const g  = rgba(darken(dominant, 32), 0.84);
    const me = rgba(darken(dominant, 16), 0.74);
    const p  = rgba(darken(dominant, 28), 0.82);
    const tx = rgba(darken(dominant, 8),  0.76);
    const hd = rgba(darken(dominant, 6),  0.68);

    const animProp = isAnimated ? (
        "\n@property --gc-animation-state {\n" +
        "    syntax: \"<custom-ident>\";\n" +
        "    inherits: true;\n" +
        "    initial-value: running;\n" +
        "}\n"
    ) : "";

    const keyframes = isAnimated ? (() => {
        const n = bgFrames!.length;
        let kf = "\n@keyframes gc-bg-anim {\n";
        for (let i = 0; i < n; i++) {
            const pct = Math.round((i / n) * 10000) / 100;
            const nextPct = Math.round(((i + 1) / n) * 10000) / 100;
            kf += "    " + pct + "%, " + (nextPct - 0.01) + "% { background-image: url('" + bgFrames![i] + "'); }\n";
        }
        kf += "    100% { background-image: url('" + bgFrames![0] + "'); }\n";
        kf += "}\n";
        return kf;
    })() : "";

    const bgCSS = hasBg ? (
        "\n/* ============================================================\n" +
        "   GhostClient Theme Creator – Hintergrundbild\n" +
        "   ============================================================ */\n" +
        animProp +
        keyframes +

        "\n/* 1. body::before als Hintergrundcontainer */\n" +
        "body, html {\n" +
        "    background: transparent !important;\n" +
        "    margin: 0; padding: 0;\n" +
        "}\n" +
        "body::before {\n" +
        "    content: '';\n" +
        "    position: fixed;\n" +
        "    inset: 0;\n" +
        "    z-index: -1;\n" +
        "    background-image: url('" + firstFrame + "');\n" +
        "    background-size: cover;\n" +
        "    background-position: center;\n" +
        "    background-repeat: no-repeat;\n" +
        (isAnimated
            ? "    animation: gc-bg-anim " + (bgFrames!.length * 0.6) + "s steps(1) infinite;\n" +
              "    animation-play-state: var(--gc-animation-state, running);\n"
            : "") +
        "}\n\n" +

        "/* 2. Alle Haupt- und Zwischen-Container vollständig transparent */\n" +
        "#app-mount,\n" +
        "[class*='appMount'],\n" +
        "[class*='baseLayer'],\n" +
        "[class*='bg_'],\n" +
        "[class*='layers_'],\n" +
        "[class*='layer_'],\n" +
        "[class*='notAppAsidePanel'],\n" +
        "[class*='app_'],\n" +
        "[class*='app-'],\n" +
        "[class*='homeBg'],\n" +
        "[class*='pageWrapper'],\n" +
        "[class*='page_'],\n" +
        "[class*='base_'],\n" +
        "[class*='fullLayer'] {\n" +
        "    background: transparent !important;\n" +
        "}\n\n" +

        "/* 3. Server-/Guild-Liste */\n" +
        "[class*='guilds'],\n" +
        "[class*='guildList'],\n" +
        "[class*='guildsError'],\n" +
        "[class*='tree_'] {\n" +
        "    background: " + g + " !important;\n" +
        "}\n\n" +

        "/* 4. Kanal-Sidebar */\n" +
        "[class*='sidebar'],\n" +
        "[class*='sidebarRegion'],\n" +
        "[class*='sidebarList'],\n" +
        "[class*='wrapper_'],\n" +
        "[class*='privateChannels'] {\n" +
        "    background: " + s + " !important;\n" +
        "}\n\n" +

        "/* 5. Chat-Hauptbereich */\n" +
        "[class*='chat_'],\n" +
        "[class*='chatContent'],\n" +
        "[class*='messagesWrapper'],\n" +
        "[class*='scroller_'],\n" +
        "[class*='scrollerInner'] {\n" +
        "    background: " + ch + " !important;\n" +
        "}\n\n" +

        "/* 6. Mitgliederliste */\n" +
        "[class*='members_'],\n" +
        "[class*='membersWrap'],\n" +
        "[class*='member_'] {\n" +
        "    background: " + me + " !important;\n" +
        "}\n\n" +

        "/* 7. Untere Nutzer-/Panel-Leiste */\n" +
        "[class*='panels_'],\n" +
        "[class*='panel_'],\n" +
        "[class*='account_'],\n" +
        "[class*='accountProfileCard'],\n" +
        "[class*='avatarWrapper_'] { \n" +
        "    background: " + p + " !important;\n" +
        "}\n\n" +

        "/* 8. Nachrichten-Eingabefeld */\n" +
        "[class*='channelTextArea'],\n" +
        "[class*='textArea_'],\n" +
        "[class*='textAreaSlate'],\n" +
        "[class*='scrollableContainer'],\n" +
        "[class*='inner_'] {\n" +
        "    background: " + tx + " !important;\n" +
        "}\n\n" +

        "/* 9. Kanal-Header */\n" +
        "[class*='header_'],\n" +
        "[class*='headerBar'],\n" +
        "[class*='toolbar_'] {\n" +
        "    background: " + hd + " !important;\n" +
        "}\n\n" +

        "/* 10. Popouts, Modale, Kontextmenüs */\n" +
        "[class*='popout_'],\n" +
        "[class*='popup_'],\n" +
        "[class*='menu_'],\n" +
        "[class*='modal_'],\n" +
        "[class*='modalRoot'] {\n" +
        "    background: " + p + " !important;\n" +
        "    backdrop-filter: blur(14px) saturate(1.2);\n" +
        "}\n\n" +

        "/* 11. Nachrichten bleiben transparent */\n" +
        "[class*='message_'],\n" +
        "[class*='messageContent'],\n" +
        "[class*='contents_'] {\n" +
        "    background: transparent !important;\n" +
        "}\n\n" +

        "/* 12. Reactions & Embeds leicht getönt */\n" +
        "[class*='reaction_'],\n" +
        "[class*='embed_'],\n" +
        "[class*='card_'] {\n" +
        "    background: " + rgba(darken(dominant, 20), 0.55) + " !important;\n" +
        "}\n"
    ) : "";

    return "/**\n" +
        " * @name " + name + "\n" +
        " * @author GhostClient Theme Creator\n" +
        " * @description " + description + "\n" +
        " * @version 1.0.0\n" +
        " */\n\n" +
        vars +
        bgCSS;
}

const ACCEPT_IMAGE = "image/png,image/jpeg,image/jpg,image/gif,image/webp,image/bmp,image/svg+xml,image/avif";
const ACCEPT_VIDEO = "video/mp4,video/webm,video/quicktime,video/x-msvideo,video/ogg";
const ACCEPT_AUDIO = "audio/mpeg,audio/mp3,audio/ogg,audio/wav,audio/flac,audio/x-flac,audio/aac";

function isImage(t: string) { return t.startsWith("image/"); }
function isVideo(t: string) { return t.startsWith("video/"); }
function isAudio(t: string) { return t.startsWith("audio/"); }

function ThemeCreator({store}: {store: AddonManager}) {
    const [open, setOpen] = useState(false);
    const [inputMode, setInputMode] = useState<InputMode>("file");
    const [urlInput, setUrlInput] = useState("");
    const [mediaUrl, setMediaUrl] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<string>("");
    const [colors, setColors] = useState<string[]>([]);
    const [generatedCSS, setGeneratedCSS] = useState<string | null>(null);
    const [themeName, setThemeName] = useState("");
    const [themeDesc, setThemeDesc] = useState("");
    const [dragging, setDragging] = useState(false);
    const [status, setStatus] = useState<{msg: string; ok: boolean; type?: "success" | "error" | "info"} | null>(null);
    const [urlLoading, setUrlLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const extractColorsFromImage = useCallback((src: string, mimeType: string) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const extracted = extractDominantColors(img, 8);
            setColors(extracted);
        };
        img.onerror = () => setColors([]);
        img.src = src;
    }, []);

    const extractColorsFromVideo = useCallback((videoEl: HTMLVideoElement) => {
        const canvas = document.createElement("canvas");
        canvas.width = 80;
        canvas.height = 80;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        try {
            ctx.drawImage(videoEl, 0, 0, 80, 80);
            const data = ctx.getImageData(0, 0, 80, 80).data;
            const buckets: {[key: string]: number} = {};
            for (let i = 0; i < data.length; i += 4) {
                const r = Math.round(data[i] / 32) * 32;
                const g = Math.round(data[i + 1] / 32) * 32;
                const b = Math.round(data[i + 2] / 32) * 32;
                const key = rgbToHex(Math.min(r, 255), Math.min(g, 255), Math.min(b, 255));
                buckets[key] = (buckets[key] || 0) + 1;
            }
            const extracted = Object.entries(buckets).sort((a, b) => b[1] - a[1]).slice(0, 8).map(e => e[0]);
            if (extracted.length) setColors(extracted);
        } catch {}
    }, []);

    const handleFile = useCallback((file: File) => {
        const allowed = file.type && (isImage(file.type) || isVideo(file.type) || isAudio(file.type));
        if (!allowed) {
            setStatus({msg: "Nicht unterstütztes Dateiformat.", ok: false, type: "error"});
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const url = e.target?.result as string;
            setMediaUrl(url);
            setMediaType(file.type);
            setGeneratedCSS(null);
            setColors([]);
            setStatus(null);
            if (isImage(file.type)) {
                extractColorsFromImage(url, file.type);
            } else if (isVideo(file.type)) {
                setStatus({msg: "Video geladen — Farben werden beim Abspielen extrahiert.", ok: true, type: "info"});
            } else if (isAudio(file.type)) {
                setStatus({msg: "Audio geladen — du kannst das Theme trotzdem generieren.", ok: true, type: "info"});
            }
        };
        reader.readAsDataURL(file);
    }, [extractColorsFromImage]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const handleUrlLoad = useCallback(async () => {
        const raw = urlInput.trim();
        if (!raw) return;
        const url = raw.startsWith("http") ? raw : "https://" + raw;
        setUrlLoading(true);
        setStatus({msg: "Lade Seite...", ok: true, type: "info"});
        try {
            const res = await fetch(url);
            const html = await res.text();
            const match = html.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i)
                || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']theme-color["']/i);
            const siteColor = match?.[1]?.trim();
            const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
                || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
            const ogImage = ogMatch?.[1]?.trim();

            const baseColors = siteColor ? [siteColor] : [];
            if (siteColor) {
                setColors([siteColor, darken(siteColor, 15), darken(siteColor, 30), lighten(siteColor, 20), "#ffffff"]);
            }

            if (ogImage) {
                setMediaUrl(ogImage);
                setMediaType("image/jpeg");
                extractColorsFromImage(ogImage, "image/jpeg");
            } else if (siteColor) {
                setMediaUrl(null);
                setMediaType("url");
            }

            setStatus({msg: "Seite geladen" + (siteColor ? " – Theme-Farbe gefunden: " + siteColor : " – kein Theme-Farbe gefunden, Standard wird verwendet") + ".", ok: true, type: "success"});
        } catch {
            setStatus({msg: "Fehler beim Laden der URL. Prüfe die Adresse.", ok: false, type: "error"});
        }
        setUrlLoading(false);
    }, [urlInput, extractColorsFromImage]);

    const handleGenerate = useCallback(async () => {
        if (!themeName.trim()) {
            setStatus({msg: "Bitte einen Theme-Namen eingeben.", ok: false, type: "error"});
            return;
        }
        setStatus({msg: "Wird generiert...", ok: true, type: "info"});
        const fallback = ["#1e1f22", "#2b2d31", "#313338", "#5865f2"];
        const colorList = colors.length ? colors : fallback;

        let bgFrames: string[] | undefined;

        if (mediaUrl && mediaType === "image/gif") {
            bgFrames = [mediaUrl];
        } else if (mediaUrl && isImage(mediaType)) {
            try {
                bgFrames = [await compressImage(mediaUrl, 1920, 1080, 0.82)];
            } catch { bgFrames = [mediaUrl]; }
        } else if (isVideo(mediaType) && videoRef.current) {
            setStatus({msg: "Video-Frames werden erfasst...", ok: true, type: "info"});
            const frames = await captureVideoFrames(videoRef.current, 8);
            if (frames.length) {
                bgFrames = frames;
                const img = new Image();
                img.onload = () => {
                    const extracted = extractDominantColors(img, 8);
                    if (extracted.length) setColors(extracted);
                };
                img.src = frames[0];
            }
        }

        const css = generateThemeCSS(
            themeName.trim(),
            themeDesc.trim() || "Erstellt mit GhostClient Theme Creator",
            colorList,
            bgFrames
        );
        setGeneratedCSS(css);
        const isAnim = (bgFrames?.length ?? 0) > 1;
        setStatus({
            msg: isAnim
                ? "✓ Animations-Theme generiert (" + (bgFrames?.length ?? 0) + " Frames)! Jetzt veröffentlichen."
                : bgFrames?.length
                    ? "✓ Theme mit Hintergrundbild generiert! Jetzt veröffentlichen."
                    : "✓ Theme generiert (Farb-Theme ohne Bild). Jetzt veröffentlichen.",
            ok: true,
            type: "success"
        });
    }, [themeName, themeDesc, colors, mediaUrl, mediaType]);

    const handlePublish = useCallback(() => {
        if (!generatedCSS || !themeName.trim()) return;
        try {
            const safeName = themeName.trim().replace(/[^a-zA-Z0-9\u00c0-\u017e _-]/g, "").replace(/ /g, "-").trim();
            if (!safeName) { setStatus({msg: "Theme-Name enthält keine gültigen Zeichen.", ok: false, type: "error"}); return; }
            const filename = safeName + ".theme.css";
            const dest = path.join(store.addonFolder, filename);
            fs.writeFileSync(dest, generatedCSS, "utf8");
            setStatus({msg: "✓ \"" + themeName.trim() + "\" wurde veröffentlicht!", ok: true, type: "success"});
            setTimeout(() => setOpen(false), 1600);
        } catch (e: any) {
            setStatus({msg: "Fehler beim Speichern: " + (e?.message || "Unbekannter Fehler"), ok: false, type: "error"});
        }
    }, [generatedCSS, themeName, store]);

    const reset = useCallback(() => {
        setMediaUrl(null);
        setMediaType("");
        setColors([]);
        setGeneratedCSS(null);
        setThemeName("");
        setThemeDesc("");
        setStatus(null);
        setUrlInput("");
    }, []);

    const canGenerate = !!(mediaUrl || colors.length || inputMode === "url");
    const canPublish = !!(generatedCSS && themeName.trim());

    const tabStyle = (active: boolean) => ({
        padding: "6px 14px",
        borderRadius: "6px",
        border: "none",
        cursor: "pointer",
        fontSize: "12px",
        fontWeight: 700,
        fontFamily: "inherit",
        background: active ? "var(--brand-experiment, #5865f2)" : "transparent",
        color: active ? "#fff" : "var(--text-muted)",
        transition: "background 0.12s, color 0.12s",
    });

    return <>
        <button
            onClick={() => setOpen(v => !v)}
            style={{display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 700, fontFamily: "inherit", marginBottom: "12px", background: open ? "var(--brand-experiment, #5865f2)" : "var(--background-modifier-hover, #3f4147)", color: open ? "#fff" : "var(--text-normal)", transition: "background 0.15s, color 0.15s"}}
        >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            Theme Creator
        </button>

        {open && (
            <div style={{position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)"}}>
                <div style={{background: "var(--background-primary, #313338)", borderRadius: "14px", width: "min(580px, 96vw)", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.07)"}}>

                    {/* Header */}
                    <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)"}}>
                        <div>
                            <div style={{fontSize: "18px", fontWeight: 700, color: "var(--header-primary, #f2f3f5)"}}>Theme Creator</div>
                            <div style={{fontSize: "12px", color: "var(--text-muted)", marginTop: "2px"}}>Theme aus Bild, Video, Audio oder Website generieren</div>
                        </div>
                        <button onClick={() => { setOpen(false); reset(); }} style={{background: "none", border: "none", cursor: "pointer", color: "var(--interactive-normal)", display: "flex", padding: "6px", borderRadius: "6px"}}>
                            <XIcon size="18px" />
                        </button>
                    </div>

                    <div style={{padding: "20px 24px"}}>

                        {/* Mode tabs */}
                        <div style={{display: "flex", gap: "4px", marginBottom: "16px", background: "var(--background-secondary, #2b2d31)", borderRadius: "8px", padding: "4px"}}>
                            <button style={tabStyle(inputMode === "file")} onClick={() => setInputMode("file")}>Datei</button>
                            <button style={tabStyle(inputMode === "url")} onClick={() => setInputMode("url")}>Website-URL</button>
                        </div>

                        {/* FILE MODE */}
                        {inputMode === "file" && (
                            <div
                                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => !mediaUrl && fileInputRef.current?.click()}
                                style={{border: `2px dashed ${dragging ? "var(--brand-experiment, #5865f2)" : "rgba(255,255,255,0.12)"}`, borderRadius: "10px", padding: mediaUrl ? "10px" : "28px 20px", textAlign: "center", cursor: mediaUrl ? "default" : "pointer", background: dragging ? "rgba(88,101,242,0.08)" : "var(--background-secondary, #2b2d31)", transition: "border-color 0.15s, background 0.15s", marginBottom: "14px", minHeight: mediaUrl ? "auto" : "110px", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "8px"}}
                            >
                                <input ref={fileInputRef} type="file" accept={ACCEPT_IMAGE + "," + ACCEPT_VIDEO + "," + ACCEPT_AUDIO} style={{display: "none"}} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

                                {mediaUrl && isImage(mediaType) && (
                                    <div style={{width: "100%"}}>
                                        <img src={mediaUrl} style={{maxHeight: "170px", maxWidth: "100%", borderRadius: "8px", objectFit: "cover"}} alt="Vorschau" />
                                        <button onClick={e => { e.stopPropagation(); setMediaUrl(null); setMediaType(""); setColors([]); setGeneratedCSS(null); }} style={{marginTop: "8px", background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "5px", color: "var(--text-muted)", cursor: "pointer", fontSize: "11px", padding: "3px 10px", fontFamily: "inherit"}}>Anderes Bild wählen</button>
                                    </div>
                                )}

                                {mediaUrl && isVideo(mediaType) && (
                                    <div style={{width: "100%"}}>
                                        <video ref={videoRef} src={mediaUrl} controls style={{maxHeight: "170px", maxWidth: "100%", borderRadius: "8px", background: "#000"}}
                                            onSeeked={() => { if (videoRef.current) extractColorsFromVideo(videoRef.current); }}
                                            onPlay={() => { if (videoRef.current) extractColorsFromVideo(videoRef.current); }}
                                        />
                                        <button onClick={e => { e.stopPropagation(); setMediaUrl(null); setMediaType(""); setColors([]); setGeneratedCSS(null); }} style={{marginTop: "8px", background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "5px", color: "var(--text-muted)", cursor: "pointer", fontSize: "11px", padding: "3px 10px", fontFamily: "inherit"}}>Anderes Video wählen</button>
                                    </div>
                                )}

                                {mediaUrl && isAudio(mediaType) && (
                                    <div style={{width: "100%", padding: "8px 0"}}>
                                        <div style={{display: "flex", alignItems: "center", gap: "12px", background: "var(--background-tertiary, #1e1f22)", borderRadius: "8px", padding: "12px 16px"}}>
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand-experiment, #5865f2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                                            <audio src={mediaUrl} controls style={{flex: 1, height: "32px"}} />
                                        </div>
                                        <button onClick={e => { e.stopPropagation(); setMediaUrl(null); setMediaType(""); setColors([]); setGeneratedCSS(null); }} style={{marginTop: "8px", background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "5px", color: "var(--text-muted)", cursor: "pointer", fontSize: "11px", padding: "3px 10px", fontFamily: "inherit"}}>Andere Datei wählen</button>
                                    </div>
                                )}

                                {!mediaUrl && (
                                    <>
                                        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                        <div style={{fontSize: "13px", fontWeight: 600, color: "var(--text-normal)"}}>Datei hochladen</div>
                                        <div style={{fontSize: "11px", color: "var(--text-muted)"}}>PNG · JPG · GIF · WEBP · SVG · MP4 · WEBM · MP3 · WAV · FLAC</div>
                                        <div style={{fontSize: "11px", color: "var(--text-muted)"}}>Hier reinziehen oder klicken</div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* URL MODE */}
                        {inputMode === "url" && (
                            <div style={{marginBottom: "14px"}}>
                                <div style={{display: "flex", gap: "8px"}}>
                                    <input
                                        type="text"
                                        value={urlInput}
                                        onChange={e => setUrlInput(e.currentTarget.value)}
                                        onKeyDown={e => e.key === "Enter" && handleUrlLoad()}
                                        placeholder="https://example.com"
                                        style={{flex: 1, background: "var(--background-secondary, #2b2d31)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "7px", padding: "9px 12px", color: "var(--text-normal)", fontSize: "13px", outline: "none", fontFamily: "inherit"}}
                                    />
                                    <button onClick={handleUrlLoad} disabled={urlLoading || !urlInput.trim()} style={{padding: "9px 16px", borderRadius: "7px", border: "none", cursor: urlInput.trim() ? "pointer" : "not-allowed", fontWeight: 700, fontSize: "13px", fontFamily: "inherit", background: "var(--brand-experiment, #5865f2)", color: "#fff", opacity: (!urlInput.trim() || urlLoading) ? 0.5 : 1, flexShrink: 0}}>
                                        {urlLoading ? "..." : "Laden"}
                                    </button>
                                </div>
                                {mediaUrl && isImage(mediaType) && (
                                    <div style={{marginTop: "10px"}}>
                                        <img src={mediaUrl} style={{maxHeight: "120px", maxWidth: "100%", borderRadius: "7px", objectFit: "cover"}} alt="OG Vorschau" />
                                    </div>
                                )}
                                {!mediaUrl && inputMode === "url" && !status && (
                                    <div style={{marginTop: "8px", fontSize: "11px", color: "var(--text-muted)"}}>GhostClient liest die Theme-Farbe und das Vorschaubild der Seite aus.</div>
                                )}
                            </div>
                        )}

                        {/* Extracted colors */}
                        {colors.length > 0 && (
                            <div style={{marginBottom: "14px"}}>
                                <div style={{fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "7px"}}>Extrahierte Farben</div>
                                <div style={{display: "flex", gap: "6px", flexWrap: "wrap"}}>
                                    {colors.map((c, i) => (
                                        <div key={i} title={c} style={{width: "26px", height: "26px", borderRadius: "50%", background: c, border: "2px solid rgba(255,255,255,0.12)", flexShrink: 0, cursor: "default"}} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Name */}
                        <div style={{marginBottom: "10px"}}>
                            <label style={{display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "5px"}}>Theme Name *</label>
                            <input type="text" value={themeName} onChange={e => { setThemeName(e.currentTarget.value); setGeneratedCSS(null); }} placeholder="z.B. Mein Dark Theme" maxLength={60} style={{width: "100%", background: "var(--background-secondary, #2b2d31)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "7px", padding: "8px 12px", color: "var(--text-normal)", fontSize: "14px", outline: "none", fontFamily: "inherit", boxSizing: "border-box"}} />
                        </div>

                        {/* Description */}
                        <div style={{marginBottom: "16px"}}>
                            <label style={{display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "5px"}}>Beschreibung</label>
                            <input type="text" value={themeDesc} onChange={e => setThemeDesc(e.currentTarget.value)} placeholder="Kurze Beschreibung" maxLength={120} style={{width: "100%", background: "var(--background-secondary, #2b2d31)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "7px", padding: "8px 12px", color: "var(--text-normal)", fontSize: "14px", outline: "none", fontFamily: "inherit", boxSizing: "border-box"}} />
                        </div>

                        {/* Status */}
                        {status && (
                            <div style={{background: status.ok ? "rgba(87,242,135,0.1)" : "rgba(237,66,69,0.1)", border: `1px solid ${status.ok ? "rgba(87,242,135,0.3)" : "rgba(237,66,69,0.3)"}`, borderRadius: "7px", padding: "9px 13px", fontSize: "13px", color: status.ok ? "#57f287" : "#ed4245", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px"}}>
                                {status.msg}
                            </div>
                        )}

                        {/* Generated badge */}
                        {generatedCSS && (
                            <div style={{background: "rgba(88,101,242,0.15)", border: "1px solid rgba(88,101,242,0.4)", borderRadius: "7px", padding: "9px 13px", fontSize: "13px", color: "#8ea1e1", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px"}}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                CSS wurde generiert — du kannst es jetzt veröffentlichen.
                            </div>
                        )}

                        {/* Buttons */}
                        <div style={{display: "flex", gap: "10px", marginBottom: generatedCSS ? "12px" : "0"}}>
                            <button onClick={handleGenerate} style={{flex: 1, padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "14px", fontFamily: "inherit", background: "var(--background-modifier-hover, #3f4147)", color: "var(--text-normal)", transition: "background 0.15s"}}>
                                Generieren
                            </button>
                            <button onClick={handlePublish} disabled={!canPublish} style={{flex: 1, padding: "10px", borderRadius: "8px", border: "none", cursor: canPublish ? "pointer" : "not-allowed", fontWeight: 700, fontSize: "14px", fontFamily: "inherit", background: canPublish ? "var(--brand-experiment, #5865f2)" : "var(--background-secondary, #2b2d31)", color: canPublish ? "#fff" : "var(--text-muted)", transition: "background 0.15s, color 0.15s", opacity: canPublish ? 1 : 0.5}}>
                                Veröffentlichen
                            </button>
                        </div>

                        {/* CSS Preview */}
                        {generatedCSS && (
                            <details>
                                <summary style={{fontSize: "12px", color: "var(--text-muted)", cursor: "pointer", userSelect: "none", padding: "4px 0"}}>CSS-Vorschau anzeigen</summary>
                                <pre style={{marginTop: "8px", background: "var(--background-tertiary, #1e1f22)", borderRadius: "7px", padding: "12px", fontSize: "10px", color: "var(--text-muted)", overflowX: "auto", maxHeight: "180px", overflowY: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.5}}>
                                    {generatedCSS}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            </div>
        )}
    </>;
}

function ThemeAnimPanel({themeSlug}: {themeSlug: string}) {
    const overrideId = "gc-anim-override-" + themeSlug;
    const [paused, setPaused] = useState(() => !!document.getElementById(overrideId));

    const toggle = useCallback(() => {
        const existing = document.getElementById(overrideId);
        if (existing) {
            existing.remove();
            setPaused(false);
        } else {
            const style = document.createElement("style");
            style.id = overrideId;
            style.textContent = ":root { --gc-animation-state: paused !important; }";
            document.head.appendChild(style);
            setPaused(true);
        }
    }, [overrideId]);

    return (
        <div style={{padding: "20px", display: "flex", flexDirection: "column", gap: "14px", minWidth: "280px"}}>
            <div style={{fontSize: "13px", fontWeight: 700, color: "var(--header-primary)", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "10px"}}>
                Hintergrund-Animation
            </div>
            <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px"}}>
                <span style={{color: "var(--text-normal)", fontSize: "13px"}}>
                    {paused ? "Animation pausiert" : "Animation läuft"}
                </span>
                <button
                    onClick={toggle}
                    style={{
                        display: "flex", alignItems: "center", gap: "6px",
                        padding: "7px 14px", borderRadius: "6px", border: "none",
                        cursor: "pointer", fontWeight: 700, fontSize: "12px",
                        fontFamily: "inherit",
                        background: paused ? "var(--brand-experiment, #5865f2)" : "var(--background-modifier-hover, #3f4147)",
                        color: paused ? "#fff" : "var(--text-muted)",
                        transition: "background 0.15s, color 0.15s"
                    }}
                >
                    {paused ? "▶ Abspielen" : "⏸ Pausieren"}
                </button>
            </div>
            <div style={{fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.4}}>
                Steuert die Hintergrundanimation dieses Themes. Die Einstellung wird beim nächsten Discord-Start zurückgesetzt.
            </div>
        </div>
    );
}

export default function AddonList({store}: {store: AddonManager;}) {
    const [query, setQuery] = useState("");
    const [enabledFilter, setEnabledFilter] = useState<EnabledFilter>("all");
    const [sort, setSort] = useState<ReturnType<typeof buildSortOptions>[number]["value"]>(getState.bind(null, store.prefix, "sort", "name"));
    const [ascending, setAscending] = useState(getState.bind(null, store.prefix, "ascending", true));
    const [view, setView] = useState<ViewTypes>(getState.bind(null, store.prefix, "view", "list"));

    const addonList = useStateFromStores(store, () => store.addonList.concat(), [store], true);
    const addonState = useStateFromStores(store, () => Object.assign({}, store.state), [store], true);

    const isTheme = store.prefix === "theme";

    const onChange = useCallback((id: string) => {
        store.toggleAddon(id);
    }, [store]);

    const enableAll = useCallback(() => {
        store.enableAllAddons();
    }, [store]);

    const disableAll = useCallback(() => {
        store.disableAllAddons();
    }, [store]);

    const changeView = useCallback((value: ViewTypes) => {
        saveState(store.prefix, "view", value);
        setView(value);
    }, [store.prefix]);

    const listView = useCallback(() => changeView("list"), [changeView]);
    const gridView = useCallback(() => changeView("grid"), [changeView]);

    const changeDirection = useCallback((value: boolean) => {
        saveState(store.prefix, "ascending", value);
        setAscending(value);
    }, [store.prefix]);

    const changeSort = useCallback((value: SortTypes) => {
        saveState(store.prefix, "sort", value);
        setSort(value);
    }, [store.prefix]);

    const triggerEdit = useCallback((id: string) => store.editAddon?.(id), [store]);
    const triggerDelete = useCallback(async (id: string) => {
        const addon = addonList.find(a => a.id == id)!;
        const shouldDelete = await confirmDelete(addon);
        if (!shouldDelete) return;
        store?.deleteAddon?.(addon);
    }, [addonList, store]);

    const renderedCards = useMemo(() => {
        let sorted = addonList.sort((a, b) => {
            const sortByEnabled = sort === "isEnabled";
            const first = sortByEnabled ? addonState[a.id] : a[sort];
            const second = sortByEnabled ? addonState[b.id] : b[sort];
            const stringSort = (str1: string, str2: string) => str1.toLocaleLowerCase().localeCompare(str2.toLocaleLowerCase());
            if (typeof (first) === "string" && typeof (second) === "string") return stringSort(first, second);
            if (typeof (first) === "boolean" && typeof (second) === "boolean") return (first === second) ? stringSort(a.name, b.name) : first ? -1 : 1;
            if (first > second) return 1;
            if (second > first) return -1;
            return 0;
        });

        if (!ascending) sorted.reverse();

        if (enabledFilter !== "all") {
            sorted = sorted.filter(addon => {
                const isEnabled = !!addonState[addon.id];
                return enabledFilter === "enabled" ? isEnabled : !isEnabled;
            });
        }

        if (query.trim()) {
            sorted = sorted.filter(addon => matchesName(addon.name, query));
        }

        return sorted.map(addon => {
            const hasPluginSettings = !!(addon as Plugin).instance && typeof ((addon as Plugin).instance.getSettingsPanel) === "function";
            const themeProps = store.prefix === "theme" ? (addon as Theme).properties : undefined;
            const hasThemeAnim = !!(themeProps?.["gc-animation-state"]);
            const hasSettings = hasPluginSettings || hasThemeAnim;

            let getSettingsPanel: (() => ReactNode) | undefined;
            if (hasPluginSettings) {
                getSettingsPanel = (addon as Plugin).instance.getSettingsPanel!.bind((addon as Plugin).instance);
            } else if (hasThemeAnim) {
                const slug = addon.slug;
                getSettingsPanel = () => <ThemeAnimPanel themeSlug={slug} />;
            }

            return <ErrorBoundary id={addon.id} name="AddonCard">
                <AddonCard store={store} disabled={addon.partial} type={store.prefix as "plugin" | "theme"} editAddon={() => triggerEdit(addon.id)} deleteAddon={() => triggerDelete(addon.id)} key={addon.id} addon={addon} onChange={onChange} enabled={addonState[addon.id]} hasSettings={hasSettings} getSettingsPanel={getSettingsPanel} />
            </ErrorBoundary>;
        });
    }, [store, addonList, addonState, onChange, triggerDelete, triggerEdit, query, enabledFilter, ascending, sort]);

    const hasAddonsInstalled = addonList.length !== 0;
    const isSearching = !!query.trim() || enabledFilter !== "all";
    const hasResults = renderedCards.length !== 0;

    return [
        <AddonHeader count={renderedCards.length} searching={isSearching} />,
        <div className={"bd-controls bd-addon-controls"}>
            <div className="bd-controls-basic">
                {makeBasicButton(t("Addons.openFolder", {context: store.prefix}), <FolderIcon size="20px" />, openFolder.bind(null, store.addonFolder), "folder")}
                {makeBasicButton(t("Addons.enableAll"), <CheckIcon size="20px" />, confirmEnable(enableAll, store.prefix), "enable-all")}
                {makeBasicButton(t("Addons.disableAll"), <XIcon size="20px" />, disableAll, "disable-all")}
            </div>
            <div className="bd-controls-advanced">
                <div className="bd-addon-dropdowns">
                    <div className="bd-select-wrapper">
                        <label className="bd-label">{t("Sorting.sortBy")}:</label>
                        <Dropdown options={buildSortOptions()} value={sort} onChange={changeSort} style="transparent" />
                    </div>
                    <div className="bd-select-wrapper">
                        <label className="bd-label">{t("Sorting.order")}:</label>
                        <Dropdown options={buildDirectionOptions()} value={ascending} onChange={changeDirection} style="transparent" />
                    </div>
                </div>
                <div className="bd-addon-views">
                    {makeControlButton(t("Addons.listView"), <StretchHorizontalIcon size="20px" />, listView, view === "list")}
                    {makeControlButton(t("Addons.gridView"), <LayoutGridIcon />, gridView, view === "grid")}
                </div>
            </div>
        </div>,
        <SearchBar
            query={query}
            onQueryChange={setQuery}
            enabledFilter={enabledFilter}
            onFilterChange={setEnabledFilter}
            isTheme={isTheme}
        />,
        isTheme && <ThemeCreator store={store} />,
        !hasAddonsInstalled && <Blankslate type={store.prefix as "plugin" | "theme"} folder={store.addonFolder} />,
        isSearching && !hasResults && hasAddonsInstalled && <NoResults />,
        hasAddonsInstalled && <div key="addonList" className={"bd-addon-list" + (view == "grid" ? " bd-grid-view" : "")}>{renderedCards}</div>
    ];
}
