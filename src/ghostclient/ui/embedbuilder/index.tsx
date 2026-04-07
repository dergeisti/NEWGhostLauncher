import React from "@modules/react";
import {ClipboardCopyIcon, PlusIcon, Trash2Icon, ChevronDownIcon, ChevronUpIcon} from "lucide-react";

const {useState, useCallback, useRef} = React;

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmbedField {
    _id: number;
    name: string;
    value: string;
    inline: boolean;
}

interface EmbedData {
    color: string;
    author: {name: string; url: string; icon_url: string;};
    title: string;
    url: string;
    description: string;
    thumbnail: {url: string;};
    image: {url: string;};
    footer: {text: string; icon_url: string;};
    timestamp: boolean;
    fields: EmbedField[];
}

const DEFAULT: EmbedData = {
    color: "#5865f2",
    author: {name: "", url: "", icon_url: ""},
    title: "Mein Embed",
    url: "",
    description: "Das ist die Beschreibung des Embeds.",
    thumbnail: {url: ""},
    image: {url: ""},
    footer: {text: "", icon_url: ""},
    timestamp: false,
    fields: [],
};

// ─── Shared input styles ──────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--input-background, #1e1f22)",
    border: "1px solid var(--input-border, #3f4147)",
    borderRadius: "4px",
    color: "var(--text-normal, #dcddde)",
    fontSize: "14px",
    padding: "8px 10px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
};

const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    resize: "vertical",
    minHeight: "80px",
};

const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    color: "var(--header-secondary, #b9bbbe)",
    marginBottom: "6px",
};

const sectionStyle: React.CSSProperties = {
    background: "var(--background-secondary, #2b2d31)",
    borderRadius: "8px",
    padding: "14px",
    marginBottom: "10px",
};

const sectionTitleStyle: React.CSSProperties = {
    fontSize: "13px",
    fontWeight: 700,
    color: "var(--header-primary, #f2f3f5)",
    marginBottom: "12px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
};

// ─── Collapsible Section ──────────────────────────────────────────────────────

function Section({title, children, defaultOpen = true}: {title: string; children: React.ReactNode; defaultOpen?: boolean;}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div style={sectionStyle}>
            <div
                style={{...sectionTitleStyle, cursor: "pointer", userSelect: "none"}}
                onClick={() => setOpen(o => !o)}
            >
                <span style={{flex: 1}}>{title}</span>
                {open
                    ? React.createElement(ChevronUpIcon, {size: "14px", style: {color: "var(--text-muted)"}})
                    : React.createElement(ChevronDownIcon, {size: "14px", style: {color: "var(--text-muted)"}})}
            </div>
            {open && children}
        </div>
    );
}

// ─── Field Row (Name + Value + Inline) ────────────────────────────────────────

function FieldRow({field, onChange, onRemove}: {
    field: EmbedField;
    onChange: (patch: Partial<EmbedField>) => void;
    onRemove: () => void;
}) {
    return (
        <div style={{
            background: "var(--background-tertiary, #1e1f22)",
            borderRadius: "6px",
            padding: "10px",
            marginBottom: "8px",
            position: "relative",
        }}>
            <button
                onClick={onRemove}
                title="Feld entfernen"
                style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    padding: "2px",
                }}
            >
                {React.createElement(Trash2Icon, {size: "14px"})}
            </button>

            <div style={{marginBottom: "8px"}}>
                <label style={labelStyle}>Feldname</label>
                <input
                    style={inputStyle}
                    value={field.name}
                    placeholder="Feldname..."
                    onChange={e => onChange({name: (e.target as HTMLInputElement).value})}
                />
            </div>
            <div style={{marginBottom: "8px"}}>
                <label style={labelStyle}>Feldwert</label>
                <textarea
                    style={{...textareaStyle, minHeight: "50px"}}
                    value={field.value}
                    placeholder="Feldwert..."
                    onChange={e => onChange({value: (e.target as HTMLTextAreaElement).value})}
                />
            </div>
            <label style={{display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "var(--text-normal)"}}>
                <input
                    type="checkbox"
                    checked={field.inline}
                    onChange={e => onChange({inline: (e.target as HTMLInputElement).checked})}
                />
                Inline
            </label>
        </div>
    );
}

// ─── Embed Preview ────────────────────────────────────────────────────────────

function EmbedPreview({embed}: {embed: EmbedData;}) {
    const hasAuthor = embed.author.name.trim();
    const hasTitle = embed.title.trim();
    const hasDesc = embed.description.trim();
    const hasThumbnail = embed.thumbnail.url.trim();
    const hasImage = embed.image.url.trim();
    const hasFooter = embed.footer.text.trim() || embed.timestamp;
    const hasFields = embed.fields.length > 0;
    const hasContent = hasAuthor || hasTitle || hasDesc || hasThumbnail || hasImage || hasFooter || hasFields;

    if (!hasContent) {
        return (
            <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "var(--text-muted)",
                gap: "10px",
                fontSize: "14px",
            }}>
                <span style={{fontSize: "32px"}}>📋</span>
                <span>Vorschau erscheint hier</span>
            </div>
        );
    }

    const borderColor = embed.color || "#5865f2";

    const inlineGroups: EmbedField[][] = [];
    let current: EmbedField[] = [];
    for (const f of embed.fields) {
        if (!f.inline) {
            if (current.length) {inlineGroups.push(current); current = [];}
            inlineGroups.push([f]);
        }
        else {
            current.push(f);
            if (current.length === 3) {inlineGroups.push(current); current = [];}
        }
    }
    if (current.length) inlineGroups.push(current);

    const timestamp = embed.timestamp ? new Date().toLocaleDateString("de-DE", {day: "2-digit", month: "2-digit", year: "numeric"}) : null;

    return (
        <div style={{
            borderLeft: `4px solid ${borderColor}`,
            background: "var(--background-secondary-alt, #2b2d31)",
            borderRadius: "4px",
            padding: "12px 16px",
            maxWidth: "520px",
            wordBreak: "break-word" as const,
            position: "relative",
        }}>
            {hasThumbnail && (
                <img
                    src={embed.thumbnail.url}
                    style={{
                        position: "absolute",
                        top: "12px",
                        right: "16px",
                        width: "72px",
                        height: "72px",
                        borderRadius: "4px",
                        objectFit: "cover" as const,
                    }}
                    onError={e => {(e.target as HTMLImageElement).style.display = "none";}}
                />
            )}

            {hasAuthor && (
                <div style={{display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px"}}>
                    {embed.author.icon_url && (
                        <img
                            src={embed.author.icon_url}
                            style={{width: "20px", height: "20px", borderRadius: "50%", objectFit: "cover" as const}}
                            onError={e => {(e.target as HTMLImageElement).style.display = "none";}}
                        />
                    )}
                    <span style={{fontSize: "13px", fontWeight: 600, color: "var(--header-primary, #f2f3f5)"}}>
                        {embed.author.url
                            ? <a href={embed.author.url} target="_blank" rel="noreferrer" style={{color: "inherit", textDecoration: "none"}}>{embed.author.name}</a>
                            : embed.author.name}
                    </span>
                </div>
            )}

            {hasTitle && (
                <div style={{fontSize: "15px", fontWeight: 700, color: embed.url ? "#00b0f4" : "var(--header-primary, #f2f3f5)", marginBottom: "6px"}}>
                    {embed.url
                        ? <a href={embed.url} target="_blank" rel="noreferrer" style={{color: "#00b0f4", textDecoration: "none"}}>{embed.title}</a>
                        : embed.title}
                </div>
            )}

            {hasDesc && (
                <div style={{fontSize: "13px", color: "var(--text-normal, #dcddde)", lineHeight: "1.5", marginBottom: "8px", whiteSpace: "pre-wrap" as const, paddingRight: hasThumbnail ? "88px" : "0"}}>
                    {embed.description}
                </div>
            )}

            {hasFields && inlineGroups.map((group, gi) => (
                <div
                    key={gi}
                    style={{
                        display: "grid",
                        gridTemplateColumns: group[0].inline ? `repeat(${group.length}, 1fr)` : "1fr",
                        gap: "8px",
                        marginBottom: "8px",
                    }}
                >
                    {group.map(f => (
                        <div key={f._id}>
                            <div style={{fontSize: "12px", fontWeight: 700, color: "var(--header-primary, #f2f3f5)", marginBottom: "2px"}}>{f.name || "\u200b"}</div>
                            <div style={{fontSize: "13px", color: "var(--text-normal, #dcddde)", whiteSpace: "pre-wrap" as const}}>{f.value || "\u200b"}</div>
                        </div>
                    ))}
                </div>
            ))}

            {hasImage && (
                <img
                    src={embed.image.url}
                    style={{width: "100%", borderRadius: "4px", marginBottom: "8px", display: "block", maxHeight: "300px", objectFit: "contain" as const}}
                    onError={e => {(e.target as HTMLImageElement).style.display = "none";}}
                />
            )}

            {hasFooter && (
                <div style={{display: "flex", alignItems: "center", gap: "6px", marginTop: "6px"}}>
                    {embed.footer.icon_url && (
                        <img
                            src={embed.footer.icon_url}
                            style={{width: "16px", height: "16px", borderRadius: "50%", objectFit: "cover" as const}}
                            onError={e => {(e.target as HTMLImageElement).style.display = "none";}}
                        />
                    )}
                    <span style={{fontSize: "11px", color: "var(--text-muted, #72767d)"}}>
                        {embed.footer.text}{embed.footer.text && timestamp ? " • " : ""}{timestamp}
                    </span>
                </div>
            )}
        </div>
    );
}

// ─── Main Embed Builder ───────────────────────────────────────────────────────

export default function EmbedBuilderUI() {
    const [embed, setEmbed] = useState<EmbedData>({...DEFAULT, fields: []});
    const [webhookUrl, setWebhookUrl] = useState("");
    const [copied, setCopied] = useState(false);
    const [cleared, setCleared] = useState(false);
    const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
    const [sendError, setSendError] = useState("");
    const fieldCounter = useRef(0);

    const set = useCallback(<K extends keyof EmbedData>(key: K, value: EmbedData[K]) => {
        setEmbed(prev => ({...prev, [key]: value}));
    }, []);

    const setNested = useCallback(<K extends keyof EmbedData>(key: K, patch: Partial<EmbedData[K]>) => {
        setEmbed(prev => ({...prev, [key]: {...(prev[key] as object), ...patch}}));
    }, []);

    const addField = useCallback(() => {
        const id = ++fieldCounter.current;
        setEmbed(prev => ({
            ...prev,
            fields: [...prev.fields, {_id: id, name: "", value: "", inline: false}],
        }));
    }, []);

    const updateField = useCallback((id: number, patch: Partial<EmbedField>) => {
        setEmbed(prev => ({
            ...prev,
            fields: prev.fields.map(f => f._id === id ? {...f, ...patch} : f),
        }));
    }, []);

    const removeField = useCallback((id: number) => {
        setEmbed(prev => ({...prev, fields: prev.fields.filter(f => f._id !== id)}));
    }, []);

    const buildPayload = useCallback(() => ({
        embeds: [{
            color: parseInt(embed.color.replace("#", ""), 16),
            ...(embed.author.name && {author: {
                name: embed.author.name,
                ...(embed.author.url && {url: embed.author.url}),
                ...(embed.author.icon_url && {icon_url: embed.author.icon_url}),
            }}),
            ...(embed.title && {title: embed.title}),
            ...(embed.url && {url: embed.url}),
            ...(embed.description && {description: embed.description}),
            ...(embed.thumbnail.url && {thumbnail: {url: embed.thumbnail.url}}),
            ...(embed.fields.length && {fields: embed.fields.map(f => ({name: f.name || "\u200b", value: f.value || "\u200b", inline: f.inline}))}),
            ...(embed.image.url && {image: {url: embed.image.url}}),
            ...((embed.footer.text || embed.footer.icon_url) && {footer: {
                text: embed.footer.text,
                ...(embed.footer.icon_url && {icon_url: embed.footer.icon_url}),
            }}),
            ...(embed.timestamp && {timestamp: new Date().toISOString()}),
        }],
    }), [embed]);

    const copyJSON = useCallback(() => {
        navigator.clipboard?.writeText(JSON.stringify(buildPayload(), null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [buildPayload]);

    const clearAll = useCallback(() => {
        setEmbed({...DEFAULT, fields: []});
        setCleared(true);
        setTimeout(() => setCleared(false), 1500);
    }, []);

    const sendWebhook = useCallback(async () => {
        const url = webhookUrl.trim();
        if (!url) return;
        if (!url.startsWith("https://discord.com/api/webhooks/") && !url.startsWith("https://discordapp.com/api/webhooks/")) {
            setSendStatus("error");
            setSendError("Ungültige Webhook-URL. Muss mit https://discord.com/api/webhooks/ beginnen.");
            setTimeout(() => setSendStatus("idle"), 4000);
            return;
        }
        setSendStatus("sending");
        setSendError("");
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(buildPayload()),
            });
            if (res.ok) {
                setSendStatus("ok");
                setTimeout(() => setSendStatus("idle"), 3000);
            }
            else {
                const text = await res.text();
                setSendStatus("error");
                setSendError(`Fehler ${res.status}: ${text}`);
                setTimeout(() => setSendStatus("idle"), 5000);
            }
        }
        catch (err: any) {
            setSendStatus("error");
            setSendError(err?.message ?? "Netzwerkfehler");
            setTimeout(() => setSendStatus("idle"), 4000);
        }
    }, [webhookUrl, buildPayload]);

    return (
        <div style={{display: "flex", height: "100%", overflow: "hidden", gap: "0", background: "var(--background-primary, #313338)"}}>

            {/* ── LEFT: Form ── */}
            <div style={{
                width: "380px",
                minWidth: "320px",
                flexShrink: 0,
                overflowY: "auto",
                padding: "14px",
                borderRight: "1px solid var(--background-modifier-accent, #3f4147)",
            }}>
                <div style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "var(--header-primary)",
                    marginBottom: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                }}>
                    <span style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                        flexShrink: 0,
                        display: "inline-block",
                    }} />
                    Embed Builder
                </div>

                {/* Content */}
                <Section title="Inhalt">
                    <div style={{display: "flex", gap: "10px", marginBottom: "10px", alignItems: "flex-end"}}>
                        <div style={{flex: 1}}>
                            <label style={labelStyle}>Farbe</label>
                            <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
                                <input
                                    type="color"
                                    value={embed.color}
                                    onChange={e => set("color", (e.target as HTMLInputElement).value)}
                                    style={{
                                        width: "36px", height: "36px", border: "none", background: "none",
                                        cursor: "pointer", padding: "0", borderRadius: "4px",
                                    }}
                                />
                                <input
                                    style={{...inputStyle, flex: 1}}
                                    value={embed.color}
                                    placeholder="#5865f2"
                                    onChange={e => {
                                        const v = (e.target as HTMLInputElement).value;
                                        if (/^#[0-9a-fA-F]{0,6}$/.test(v)) set("color", v);
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <label style={labelStyle}>Titel</label>
                    <input
                        style={{...inputStyle, marginBottom: "10px"}}
                        value={embed.title}
                        placeholder="Embed-Titel..."
                        onChange={e => set("title", (e.target as HTMLInputElement).value)}
                    />

                    <label style={labelStyle}>Titel-URL</label>
                    <input
                        style={{...inputStyle, marginBottom: "10px"}}
                        value={embed.url}
                        placeholder="https://..."
                        onChange={e => set("url", (e.target as HTMLInputElement).value)}
                    />

                    <label style={labelStyle}>Beschreibung</label>
                    <textarea
                        style={{...textareaStyle}}
                        value={embed.description}
                        placeholder="Beschreibungstext..."
                        onChange={e => set("description", (e.target as HTMLTextAreaElement).value)}
                    />
                </Section>

                {/* Author */}
                <Section title="Autor" defaultOpen={false}>
                    <label style={labelStyle}>Name</label>
                    <input
                        style={{...inputStyle, marginBottom: "10px"}}
                        value={embed.author.name}
                        placeholder="Autorname..."
                        onChange={e => setNested("author", {name: (e.target as HTMLInputElement).value})}
                    />
                    <label style={labelStyle}>URL</label>
                    <input
                        style={{...inputStyle, marginBottom: "10px"}}
                        value={embed.author.url}
                        placeholder="https://..."
                        onChange={e => setNested("author", {url: (e.target as HTMLInputElement).value})}
                    />
                    <label style={labelStyle}>Icon-URL</label>
                    <input
                        style={{...inputStyle}}
                        value={embed.author.icon_url}
                        placeholder="https://..."
                        onChange={e => setNested("author", {icon_url: (e.target as HTMLInputElement).value})}
                    />
                </Section>

                {/* Images */}
                <Section title="Bilder" defaultOpen={false}>
                    <label style={labelStyle}>Thumbnail-URL (oben rechts)</label>
                    <input
                        style={{...inputStyle, marginBottom: "10px"}}
                        value={embed.thumbnail.url}
                        placeholder="https://..."
                        onChange={e => setNested("thumbnail", {url: (e.target as HTMLInputElement).value})}
                    />
                    <label style={labelStyle}>Bild-URL (groß, unten)</label>
                    <input
                        style={{...inputStyle}}
                        value={embed.image.url}
                        placeholder="https://..."
                        onChange={e => setNested("image", {url: (e.target as HTMLInputElement).value})}
                    />
                </Section>

                {/* Footer */}
                <Section title="Footer" defaultOpen={false}>
                    <label style={labelStyle}>Footer-Text</label>
                    <input
                        style={{...inputStyle, marginBottom: "10px"}}
                        value={embed.footer.text}
                        placeholder="Footer-Text..."
                        onChange={e => setNested("footer", {text: (e.target as HTMLInputElement).value})}
                    />
                    <label style={labelStyle}>Footer-Icon-URL</label>
                    <input
                        style={{...inputStyle, marginBottom: "10px"}}
                        value={embed.footer.icon_url}
                        placeholder="https://..."
                        onChange={e => setNested("footer", {icon_url: (e.target as HTMLInputElement).value})}
                    />
                    <label style={{display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "var(--text-normal)"}}>
                        <input
                            type="checkbox"
                            checked={embed.timestamp}
                            onChange={e => set("timestamp", (e.target as HTMLInputElement).checked)}
                        />
                        Zeitstempel anzeigen
                    </label>
                </Section>

                {/* Fields */}
                <Section title={`Felder (${embed.fields.length}/25)`} defaultOpen={true}>
                    {embed.fields.map(f => (
                        <FieldRow
                            key={f._id}
                            field={f}
                            onChange={patch => updateField(f._id, patch)}
                            onRemove={() => removeField(f._id)}
                        />
                    ))}
                    {embed.fields.length < 25 && (
                        <button
                            onClick={addField}
                            style={{
                                width: "100%",
                                padding: "8px",
                                background: "var(--background-modifier-hover, #3f4147)",
                                border: "1px dashed var(--background-modifier-accent, #4f545c)",
                                borderRadius: "6px",
                                cursor: "pointer",
                                color: "var(--text-muted)",
                                fontSize: "13px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px",
                            }}
                        >
                            {React.createElement(PlusIcon, {size: "14px"})}
                            Feld hinzufügen
                        </button>
                    )}
                </Section>

                {/* Webhook */}
                <div style={{
                    background: "var(--background-secondary, #2b2d31)",
                    borderRadius: "8px",
                    padding: "14px",
                    marginBottom: "10px",
                }}>
                    <div style={{fontSize: "13px", fontWeight: 700, color: "var(--header-primary)", marginBottom: "10px"}}>
                        Webhook senden
                    </div>
                    <label style={labelStyle}>Webhook-URL</label>
                    <input
                        style={{...inputStyle, marginBottom: "10px"}}
                        value={webhookUrl}
                        placeholder="https://discord.com/api/webhooks/..."
                        onChange={ev => setWebhookUrl(ev.target.value)}
                    />
                    <button
                        onClick={sendWebhook}
                        disabled={sendStatus === "sending" || !webhookUrl.trim()}
                        style={{
                            width: "100%",
                            padding: "10px",
                            background: sendStatus === "ok" ? "#3ba55d" : sendStatus === "error" ? "#ed4245" : sendStatus === "sending" ? "#4752c4" : "#5865f2",
                            border: "none",
                            borderRadius: "6px",
                            cursor: sendStatus === "sending" || !webhookUrl.trim() ? "not-allowed" : "pointer",
                            color: "#fff",
                            fontSize: "13px",
                            fontWeight: 600,
                            opacity: !webhookUrl.trim() ? 0.5 : 1,
                            transition: "background 0.2s",
                        }}
                    >
                        {sendStatus === "sending" ? "⏳ Wird gesendet..." : sendStatus === "ok" ? "✓ Erfolgreich gesendet!" : sendStatus === "error" ? "✗ Fehler!" : "➤ Embed senden"}
                    </button>
                    {sendStatus === "error" && sendError && (
                        <div style={{marginTop: "8px", fontSize: "12px", color: "#ed4245", wordBreak: "break-word" as const}}>
                            {sendError}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div style={{display: "flex", gap: "8px", marginTop: "4px"}}>
                    <button
                        onClick={copyJSON}
                        style={{
                            flex: 1,
                            padding: "10px",
                            background: copied ? "#3ba55d" : "var(--background-modifier-hover, #3f4147)",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            color: copied ? "#fff" : "var(--text-muted)",
                            fontSize: "13px",
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                            transition: "background 0.2s",
                        }}
                    >
                        {React.createElement(ClipboardCopyIcon, {size: "14px"})}
                        {copied ? "Kopiert!" : "JSON kopieren"}
                    </button>
                    <button
                        onClick={clearAll}
                        style={{
                            padding: "10px 14px",
                            background: cleared ? "#3ba55d" : "var(--background-modifier-hover, #3f4147)",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            color: cleared ? "#fff" : "var(--text-muted)",
                            fontSize: "13px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            transition: "background 0.2s",
                        }}
                    >
                        {React.createElement(Trash2Icon, {size: "14px"})}
                        {cleared ? "Geleert!" : "Leeren"}
                    </button>
                </div>
            </div>

            {/* ── RIGHT: Preview ── */}
            <div style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px",
                background: "var(--background-primary, #313338)",
            }}>
                <div style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.5px",
                    color: "var(--text-muted)",
                    marginBottom: "12px",
                }}>
                    Vorschau
                </div>

                {/* Simulated Discord message */}
                <div style={{
                    display: "flex",
                    gap: "14px",
                    padding: "8px 0",
                }}>
                    <div style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                        fontWeight: 700,
                        color: "#fff",
                    }}>
                        G
                    </div>
                    <div style={{flex: 1}}>
                        <div style={{display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "6px"}}>
                            <span style={{fontSize: "14px", fontWeight: 700, color: "var(--header-primary)"}}>GhostClient Bot</span>
                            <span style={{fontSize: "11px", color: "var(--text-muted)"}}>Heute um {new Date().toLocaleTimeString("de-DE", {hour: "2-digit", minute: "2-digit"})}</span>
                        </div>
                        <EmbedPreview embed={embed} />
                    </div>
                </div>

                {/* JSON hint */}
                <div style={{
                    marginTop: "24px",
                    padding: "12px",
                    background: "var(--background-secondary)",
                    borderRadius: "6px",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    lineHeight: "1.5",
                }}>
                    <b style={{color: "var(--text-normal)"}}>Tipp:</b> Klicke auf <b>"JSON kopieren"</b> um den Embed-Code zu kopieren.
                    Diesen kannst du mit einem Discord-Bot oder via Webhook senden.
                </div>
            </div>
        </div>
    );
}
