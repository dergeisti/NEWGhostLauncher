import React, {useState, useCallback, useMemo} from "@modules/react";
import {t} from "@common/i18n";
import DiscordModules from "@modules/discordmodules";
import ipc from "@modules/ipc";

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

function editDistance(a: string, b: string): number {
    const prev = Array.from({length: b.length + 1}, (_, i) => i);
    for (let i = 0; i < a.length; i++) {
        const curr = new Array(b.length + 1);
        curr[0] = i + 1;
        for (let j = 0; j < b.length; j++) {
            curr[j + 1] = a[i] === b[j] ? prev[j] : 1 + Math.min(prev[j], prev[j + 1], curr[j]);
        }
        for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
    }
    return prev[b.length];
}

function fuzzyMatch(haystack: string, needle: string): boolean {
    const h = haystack.toLocaleLowerCase();
    const n = needle.toLocaleLowerCase().trim();
    if (!n) return true;

    if (h.includes(n)) return true;

    let hi = 0, ni = 0;
    while (hi < h.length && ni < n.length) {
        if (h[hi] === n[ni]) ni++;
        hi++;
    }
    if (ni === n.length) return true;

    if (n.length < 4) return false;
    const maxErrors = Math.floor(n.length / 4);
    for (let start = 0; start <= h.length - n.length + maxErrors; start++) {
        const sub = h.slice(start, start + n.length + maxErrors);
        if (sub.length >= n.length - maxErrors && editDistance(sub, n) <= maxErrors) return true;
    }
    return false;
}

function PluginSearchBar({query, onQueryChange, enabledFilter, onFilterChange}: {
    query: string;
    onQueryChange(v: string): void;
    enabledFilter: EnabledFilter;
    onFilterChange(v: EnabledFilter): void;
}) {
    const inputRef = React.useRef<HTMLInputElement>(null);

    const filterButtons: {label: string; value: EnabledFilter;}[] = [
        {label: "Alle", value: "all"},
        {label: "Aktiviert", value: "enabled"},
        {label: "Deaktiviert", value: "disabled"},
    ];

    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px 0",
            marginBottom: "4px",
        }}>
            <div style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                background: "var(--input-background, #1e1f22)",
                border: "1px solid var(--input-border, #3f4147)",
                borderRadius: "6px",
                padding: "0 10px",
                height: "36px",
                gap: "8px",
            }}>
                <SearchIcon size="16px" style={{color: "var(--text-muted)", flexShrink: 0}} />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => onQueryChange(e.currentTarget.value)}
                    placeholder={"Plugin suchen..."}
                    maxLength={50}
                    style={{
                        flex: 1,
                        background: "none",
                        border: "none",
                        outline: "none",
                        color: "var(--text-normal)",
                        fontSize: "14px",
                        fontFamily: "inherit",
                    }}
                />
                {query && (
                    <button
                        onClick={() => { onQueryChange(""); inputRef.current?.focus(); }}
                        style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--text-muted)",
                            display: "flex",
                            alignItems: "center",
                            padding: 0,
                            flexShrink: 0,
                        }}
                    >
                        <XIcon size="14px" />
                    </button>
                )}
            </div>
            <div style={{display: "flex", gap: "4px", flexShrink: 0}}>
                {filterButtons.map(btn => (
                    <button
                        key={btn.value}
                        onClick={() => onFilterChange(btn.value)}
                        style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: 600,
                            transition: "background 0.15s, color 0.15s",
                            background: enabledFilter === btn.value
                                ? "var(--brand-experiment, #5865f2)"
                                : "var(--background-modifier-hover, #3f4147)",
                            color: enabledFilter === btn.value
                                ? "#fff"
                                : "var(--text-normal)",
                        }}
                    >
                        {btn.label}
                    </button>
                ))}
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
            sorted = sorted.filter(addon =>
                fuzzyMatch(addon.name, query) ||
                fuzzyMatch(addon.author, query) ||
                fuzzyMatch(addon.description, query)
            );
        }

        return sorted.map(addon => {
            const hasSettings = (addon as Plugin).instance && typeof ((addon as Plugin).instance.getSettingsPanel) === "function";
            const getSettings = hasSettings && (addon as Plugin).instance.getSettingsPanel!.bind((addon as Plugin).instance);
            return <ErrorBoundary id={addon.id} name="AddonCard">
                <AddonCard store={store} disabled={addon.partial} type={store.prefix as "plugin" | "theme"} editAddon={() => triggerEdit(addon.id)} deleteAddon={() => triggerDelete(addon.id)} key={addon.id} addon={addon} onChange={onChange} enabled={addonState[addon.id]} hasSettings={hasSettings} getSettingsPanel={getSettings ? getSettings : undefined} />
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
        <PluginSearchBar
            query={query}
            onQueryChange={setQuery}
            enabledFilter={enabledFilter}
            onFilterChange={setEnabledFilter}
        />,
        !hasAddonsInstalled && <Blankslate type={store.prefix as "plugin" | "theme"} folder={store.addonFolder} />,
        isSearching && !hasResults && hasAddonsInstalled && <NoResults />,
        hasAddonsInstalled && <div key="addonList" className={"bd-addon-list" + (view == "grid" ? " bd-grid-view" : "")}>{renderedCards}</div>
    ];
}
