export const BUNDLED_PLUGINS: {filename: string; content: string;}[] = [
    {
        filename: "GhostCopyRaw.plugin.js",
        content: `/**
 * @name GhostCopyRaw
 * @author GhostClient
 * @description Adds a "Copy Raw" option to message context menus to copy the unformatted markdown text of a message.
 * @version 1.0.0
 * @source https://github.com/ghostclient
 */
class GhostCopyRaw {
    start() {
        this.unpatch = BdApi.ContextMenu.patch("message", (res, props) => {
            const rawContent = props?.message?.content;
            if (!rawContent) return;
            res.props.children.push(
                BdApi.ContextMenu.buildItem({
                    type: "button",
                    label: "Copy Raw",
                    action: () => {
                        try { DiscordNative.clipboard.copy(rawContent); }
                        catch(e) {
                            const ta = document.createElement("textarea");
                            ta.value = rawContent;
                            document.body.appendChild(ta);
                            ta.select();
                            document.execCommand("copy");
                            document.body.removeChild(ta);
                        }
                    }
                })
            );
        });
    }
    stop() {
        if (this.unpatch) this.unpatch();
    }
}
module.exports = GhostCopyRaw;`
    },
    {
        filename: "GhostHideStreamUI.plugin.js",
        content: `/**
 * @name GhostHideStreamUI
 * @author GhostClient
 * @description Hides the floating streaming toolbar overlay while you are streaming so it doesn't cover your screen.
 * @version 1.0.0
 * @source https://github.com/ghostclient
 */
class GhostHideStreamUI {
    start() {
        BdApi.DOM.addStyle("GhostHideStreamUI", \`
            [class*="streamToolbar"],
            [class*="streamPreview"],
            [class*="focusRing"] { display: none !important; }
        \`);
    }
    stop() {
        BdApi.DOM.removeStyle("GhostHideStreamUI");
    }
}
module.exports = GhostHideStreamUI;`
    },
    {
        filename: "GhostImageExpander.plugin.js",
        content: `/**
 * @name GhostImageExpander
 * @author GhostClient
 * @description Enables clicking on images in chat to open them in a larger fullscreen view with zoom support.
 * @version 1.0.0
 * @source https://github.com/ghostclient
 */
class GhostImageExpander {
    start() {
        BdApi.DOM.addStyle("GhostImageExpander", \`
            .gc-image-overlay {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.85);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 99999;
                cursor: zoom-out;
            }
            .gc-image-overlay img {
                max-width: 90vw;
                max-height: 90vh;
                object-fit: contain;
                border-radius: 4px;
                box-shadow: 0 8px 40px rgba(0,0,0,0.7);
            }
        \`);
        this.handleClick = (e) => {
            const img = e.target.closest("img[class*='lazyImg'], img[class*='image']");
            if (!img || !img.src) return;
            const overlay = document.createElement("div");
            overlay.className = "gc-image-overlay";
            const clone = document.createElement("img");
            clone.src = img.src;
            overlay.appendChild(clone);
            overlay.addEventListener("click", () => overlay.remove());
            document.body.appendChild(overlay);
        };
        document.addEventListener("click", this.handleClick);
    }
    stop() {
        BdApi.DOM.removeStyle("GhostImageExpander");
        if (this.handleClick) document.removeEventListener("click", this.handleClick);
    }
}
module.exports = GhostImageExpander;`
    },
    {
        filename: "GhostMentionHighlight.plugin.js",
        content: `/**
 * @name GhostMentionHighlight
 * @author GhostClient
 * @description Highlights your own username mentions in chat with a customizable glow effect so they are easier to spot.
 * @version 1.0.0
 * @source https://github.com/ghostclient
 */
class GhostMentionHighlight {
    start() {
        BdApi.DOM.addStyle("GhostMentionHighlight", \`
            [class*="mentioned"] {
                background-color: rgba(124, 58, 237, 0.12) !important;
                border-left: 3px solid #7c3aed !important;
            }
            [class*="mentioned"] [class*="messageContent"] {
                color: #ddd6fe;
            }
        \`);
    }
    stop() {
        BdApi.DOM.removeStyle("GhostMentionHighlight");
    }
}
module.exports = GhostMentionHighlight;`
    },
    {
        filename: "GhostCustomStatus.plugin.js",
        content: `/**
 * @name GhostCustomStatus
 * @author GhostClient
 * @description Displays a subtle "GhostClient" badge next to your username in the sidebar so others know you are using GhostClient.
 * @version 1.0.0
 * @source https://github.com/ghostclient
 */
class GhostCustomStatus {
    start() {
        BdApi.DOM.addStyle("GhostCustomStatus", \`
            [class*="nameTag"]::after {
                content: "GC";
                display: inline-block;
                margin-left: 6px;
                padding: 1px 5px;
                font-size: 9px;
                font-weight: 700;
                letter-spacing: 0.5px;
                color: #fff;
                background: linear-gradient(135deg, #7c3aed, #4f46e5);
                border-radius: 4px;
                vertical-align: middle;
                line-height: 1.4;
            }
        \`);
    }
    stop() {
        BdApi.DOM.removeStyle("GhostCustomStatus");
    }
}
module.exports = GhostCustomStatus;`
    },
    {
        filename: "GhostEmbed.plugin.js",
        content: `/**
 * @name GhostEmbed
 * @author GhostClient
 * @description A full-featured Discord Embed Builder with Webhook support. Click the icon in the chat bar or server toolbar.
 * @version 1.1.0
 * @source https://github.com/ghostclient
 */

// ─── Helpers ───────────────────────────────────────────────────────────────
const R = BdApi.React;
const e = R.createElement.bind(R);
const { useState, useCallback, useRef, useEffect } = R;

const S = {
    input: {
        width: "100%", background: "var(--input-background,#1e1f22)",
        border: "1px solid var(--input-border,#3f4147)", borderRadius: "4px",
        color: "var(--text-normal,#dcddde)", fontSize: "14px",
        padding: "8px 10px", outline: "none", boxSizing: "border-box", fontFamily: "inherit"
    },
    label: {
        display: "block", fontSize: "11px", fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.5px",
        color: "var(--header-secondary,#b9bbbe)", marginBottom: "6px"
    },
    section: {
        background: "var(--background-secondary,#2b2d31)", borderRadius: "8px",
        padding: "14px", marginBottom: "10px"
    },
};

// ─── Collapsible section ───────────────────────────────────────────────────
function Section({ title, children, open: initOpen = true }) {
    const [open, setOpen] = useState(initOpen);
    return e("div", { style: S.section },
        e("div", {
            style: { fontSize: "13px", fontWeight: 700, color: "var(--header-primary,#f2f3f5)", marginBottom: open ? "12px" : "0", cursor: "pointer", userSelect: "none", display: "flex", alignItems: "center", justifyContent: "space-between" },
            onClick: () => setOpen(v => !v)
        }, title, e("span", { style: { fontSize: "11px", color: "var(--text-muted)" } }, open ? "▲" : "▼")),
        open && children
    );
}

// ─── Labeled input ─────────────────────────────────────────────────────────
function Field({ label, children }) {
    return e("div", { style: { marginBottom: "10px" } },
        e("label", { style: S.label }, label),
        children
    );
}

// ─── Markdown renderer ─────────────────────────────────────────────────────
function renderMd(text) {
    if (!text) return null;
    const BT = String.fromCharCode(96);
const rx = new RegExp(
        "([*][*][*].+?[*][*][*]" +
        "|[*][*].+?[*][*]" +
        "|__.+?__" +
        "|[~][~].+?[~][~]" +
        "|[*].+?[*]" +
        "|_.+?_" +
        "|" + BT + "[^" + BT + "]+" + BT + ")", "g");
    const lines = String(text).split("\\n");
    const out = [];
    for (let li = 0; li < lines.length; li++) {
        if (li > 0) out.push(e("br", { key: "br" + li }));
        const s = lines[li];
        rx.lastIndex = 0;
        let last = 0, m, pk = 0;
        const parts = [];
        while ((m = rx.exec(s)) !== null) {
            if (m.index > last) parts.push(s.slice(last, m.index));
            const tok = m[0];
const c2 = tok.slice(0, 2), c3 = tok.slice(0, 3);
            const inner = c3 === "***" ? tok.slice(3, -3)
                : (c2 === "**" || c2 === "__" || c2 === "~~") ? tok.slice(2, -2)
                : tok.slice(1, -1);
if (c3 === "***") parts.push(e("strong", { key: pk++ }, e("em", null, inner)));
            else if (c2 === "**") parts.push(e("strong", { key: pk++ }, inner));
            else if (c2 === "__") parts.push(e("u", { key: pk++ }, inner));
            else if (c2 === "~~") parts.push(e("s", { key: pk++ }, inner));
            else if (tok[0] === "*" || tok[0] === "_") parts.push(e("em", { key: pk++ }, inner));
            last = m.index + tok.length;
        }
        if (last < s.length) parts.push(s.slice(last));
        out.push(...parts);
    }
    return out.length ? out : null;
}

// ─── Embed Preview ─────────────────────────────────────────────────────────
function EmbedPreview({ embed }) {
    const hasAuthor = embed.author.name.trim();
    const hasTitle = embed.title.trim();
    const hasDesc = embed.description.trim();
    const hasThumbnail = embed.thumbnail.trim();
    const hasImage = embed.image.trim();
    const hasFooter = embed.footer.text.trim() || embed.timestamp;
    const hasFields = embed.fields.length > 0;
    const hasAny = hasAuthor || hasTitle || hasDesc || hasThumbnail || hasImage || hasFooter || hasFields;

    if (!hasAny) return e("div", {
        style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", gap: "10px", fontSize: "14px" }
    }, e("span", { style: { fontSize: "32px" } }, "\\u{1F4CB}"), e("span", null, "Vorschau erscheint hier"));

    // Group inline fields
    const groups = [];
    let cur = [];
    for (const f of embed.fields) {
        if (!f.inline) { if (cur.length) { groups.push(cur); cur = []; } groups.push([f]); }
        else { cur.push(f); if (cur.length === 3) { groups.push(cur); cur = []; } }
    }
    if (cur.length) groups.push(cur);

    const ts = embed.timestamp ? new Date().toLocaleDateString("de-DE") : null;

    return e("div", {
        style: {
            borderLeft: "4px solid " + (embed.color || "#5865f2"),
            background: "var(--background-secondary-alt,#2b2d31)",
            borderRadius: "4px", padding: "12px 16px", maxWidth: "520px",
            wordBreak: "break-word", position: "relative"
        }
    },
        hasThumbnail && e("img", {
            src: embed.thumbnail,
            style: { position: "absolute", top: "12px", right: "16px", width: "72px", height: "72px", borderRadius: "4px", objectFit: "cover" },
            onError: ev => { ev.target.style.display = "none"; }
        }),
        hasAuthor && e("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" } },
            embed.author.icon && e("img", { src: embed.author.icon, style: { width: "20px", height: "20px", borderRadius: "50%", objectFit: "cover" }, onError: ev => { ev.target.style.display = "none"; } }),
            e("span", { style: { fontSize: "13px", fontWeight: 600, color: "var(--header-primary,#f2f3f5)" } }, embed.author.name)
        ),
        hasTitle && e("div", { style: { fontSize: "15px", fontWeight: 700, color: embed.url ? "#00b0f4" : "var(--header-primary,#f2f3f5)", marginBottom: "6px" } }, embed.title),
        hasDesc && e("div", { style: { fontSize: "13px", color: "var(--text-normal,#dcddde)", lineHeight: "1.5", marginBottom: "8px", paddingRight: hasThumbnail ? "88px" : "0" } }, renderMd(embed.description)),
        hasFields && groups.map((grp, gi) => e("div", {
            key: gi,
            style: { display: "grid", gridTemplateColumns: grp[0].inline ? ("repeat(" + grp.length + ",1fr)") : "1fr", gap: "8px", marginBottom: "8px" }
        }, grp.map(f => e("div", { key: f.id },
            e("div", { style: { fontSize: "12px", fontWeight: 700, color: "var(--header-primary,#f2f3f5)", marginBottom: "2px" } }, renderMd(f.name) || "\\u200b"),
            e("div", { style: { fontSize: "13px", color: "var(--text-normal,#dcddde)" } }, renderMd(f.value) || "\\u200b")
        )))),
        hasImage && e("img", { src: embed.image, style: { width: "100%", borderRadius: "4px", marginBottom: "8px", display: "block", maxHeight: "300px", objectFit: "contain" }, onError: ev => { ev.target.style.display = "none"; } }),
        hasFooter && e("div", { style: { display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" } },
            embed.footer.icon && e("img", { src: embed.footer.icon, style: { width: "16px", height: "16px", borderRadius: "50%", objectFit: "cover" }, onError: ev => { ev.target.style.display = "none"; } }),
            e("span", { style: { fontSize: "11px", color: "var(--text-muted,#72767d)" } }, embed.footer.text + (embed.footer.text && ts ? " \\u2022 " : "") + (ts || ""))
        )
    );
}

// ─── Field row ─────────────────────────────────────────────────────────────
function FieldRow({ field, onChange, onRemove }) {
    return e("div", {
        style: { background: "var(--background-tertiary,#1e1f22)", borderRadius: "6px", padding: "10px", marginBottom: "8px", position: "relative" }
    },
        e("button", {
            onClick: onRemove, title: "Entfernen",
            style: { position: "absolute", top: "8px", right: "8px", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "16px", lineHeight: 1, padding: "0" }
        }, "\\u00d7"),
        e(Field, { label: "Name" }, e("input", { style: { ...S.input, marginBottom: "6px" }, value: field.name, placeholder: "Feldname", onChange: ev => onChange({ name: ev.target.value }) })),
        e(Field, { label: "Wert" }, e("textarea", { style: { ...S.input, resize: "vertical", minHeight: "50px" }, value: field.value, placeholder: "Feldwert", onChange: ev => onChange({ value: ev.target.value }) })),
        e("label", { style: { display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "var(--text-normal)" } },
            e("input", { type: "checkbox", checked: field.inline, onChange: ev => onChange({ inline: ev.target.checked }) }),
            "Inline"
        )
    );
}

// ─── Main embed builder UI ─────────────────────────────────────────────────
function GhostEmbedApp({ onClose }) {
    const [embed, setEmbed] = useState({
        color: "#5865f2",
        author: { name: "", url: "", icon: "" },
        title: "Mein Embed", url: "", description: "Das ist die Beschreibung.",
        thumbnail: "", image: "",
        footer: { text: "", icon: "" },
        timestamp: false,
        fields: []
    });
    const [webhookUrl, setWebhookUrl] = useState("");
    const [webhookInfo, setWebhookInfo] = useState(null); // { name, avatarUrl }
    const [webhookLoading, setWebhookLoading] = useState(false);
    const [webhookError, setWebhookError] = useState("");
    const [copied, setCopied] = useState(false);
    const [cleared, setCleared] = useState(false);
    const [sendStatus, setSendStatus] = useState("idle");
    const [sendError, setSendError] = useState("");
    const ctr = useRef(0);
    const debounceRef = useRef(null);

    const patch = useCallback((key, val) => setEmbed(p => ({ ...p, [key]: val })), []);
    const patchNested = useCallback((key, val) => setEmbed(p => ({ ...p, [key]: { ...p[key], ...val } })), []);

    // Fetch webhook info when URL changes (debounced)
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        const url = webhookUrl.trim();
        if (!url) { setWebhookInfo(null); setWebhookError(""); return; }
        const isValid = url.startsWith("https://discord.com/api/webhooks/") || url.startsWith("https://discordapp.com/api/webhooks/");
        if (!isValid) { setWebhookInfo(null); setWebhookError("Ung\u00fcltige Webhook-URL"); return; }
        setWebhookError("");
        debounceRef.current = setTimeout(async () => {
            setWebhookLoading(true);
            try {
                const res = await BdApi.Net.fetch(url);
                if (!res.ok) throw new Error("Status " + res.status);
                const data = await res.json();
                const avatarUrl = data.avatar
                    ? "https://cdn.discordapp.com/avatars/" + data.id + "/" + data.avatar + ".png?size=128"
                    : "https://cdn.discordapp.com/embed/avatars/0.png";
                setWebhookInfo({ name: data.name || "Webhook", avatarUrl });
                setWebhookError("");
            } catch {
                setWebhookInfo(null);
                setWebhookError("Info konnte nicht geladen werden \u2014 Senden trotzdem m\u00f6glich");
            } finally {
                setWebhookLoading(false);
            }
        }, 600);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [webhookUrl]);

    const addField = useCallback(() => {
        const id = ++ctr.current;
        setEmbed(p => ({ ...p, fields: [...p.fields, { id, name: "", value: "", inline: false }] }));
    }, []);
    const updateField = useCallback((id, val) => setEmbed(p => ({ ...p, fields: p.fields.map(f => f.id === id ? { ...f, ...val } : f) })), []);
    const removeField = useCallback((id) => setEmbed(p => ({ ...p, fields: p.fields.filter(f => f.id !== id) })), []);

    const buildPayload = useCallback(() => ({
        embeds: [{
            color: parseInt(embed.color.replace("#", ""), 16),
            ...(embed.author.name && { author: { name: embed.author.name, ...(embed.author.url && { url: embed.author.url }), ...(embed.author.icon && { icon_url: embed.author.icon }) } }),
            ...(embed.title && { title: embed.title }),
            ...(embed.url && { url: embed.url }),
            ...(embed.description && { description: embed.description }),
            ...(embed.thumbnail && { thumbnail: { url: embed.thumbnail } }),
            ...(embed.fields.length && { fields: embed.fields.map(f => ({ name: f.name || "\\u200b", value: f.value || "\\u200b", inline: f.inline })) }),
            ...(embed.image && { image: { url: embed.image } }),
            ...((embed.footer.text || embed.footer.icon) && { footer: { text: embed.footer.text, ...(embed.footer.icon && { icon_url: embed.footer.icon }) } }),
            ...(embed.timestamp && { timestamp: new Date().toISOString() })
        }]
    }), [embed]);

    const sendWebhook = useCallback(async () => {
        const url = webhookUrl.trim();
        if (!url) return;
        if (!url.startsWith("https://discord.com/api/webhooks/") && !url.startsWith("https://discordapp.com/api/webhooks/")) {
            setSendStatus("error");
            setSendError("Ung\u00fcltige Webhook-URL.");
            setTimeout(() => setSendStatus("idle"), 4000);
            return;
        }
        setSendStatus("sending"); setSendError("");
        try {
            const res = await BdApi.Net.fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(buildPayload())
            });
            if (res.ok) {
                setSendStatus("ok");
                setTimeout(() => setSendStatus("idle"), 3000);
            } else {
                const txt = await res.text();
                setSendStatus("error");
                setSendError("Fehler " + res.status + ": " + txt);
                setTimeout(() => setSendStatus("idle"), 5000);
            }
        } catch (err) {
            setSendStatus("error");
            setSendError(err?.message || "Netzwerkfehler");
            setTimeout(() => setSendStatus("idle"), 5000);
        }
    }, [webhookUrl, buildPayload]);

    const copyJSON = useCallback(() => {
        navigator.clipboard?.writeText(JSON.stringify(buildPayload(), null, 2));
        setCopied(true); setTimeout(() => setCopied(false), 2000);
    }, [buildPayload]);

    const clearAll = useCallback(() => {
        setEmbed({ color: "#5865f2", author: { name: "", url: "", icon: "" }, title: "", url: "", description: "", thumbnail: "", image: "", footer: { text: "", icon: "" }, timestamp: false, fields: [] });
        setCleared(true); setTimeout(() => setCleared(false), 1500);
    }, []);

    const btnBase = { border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 600, padding: "10px 14px", display: "flex", alignItems: "center", gap: "6px" };

    // Bot display values for preview
    const botName = webhookInfo ? webhookInfo.name : "GhostClient Bot";
    const botAvatar = webhookInfo ? webhookInfo.avatarUrl : null;

    return e("div", {
        className: "gc-embed-overlay",
        onClick: onClose,
        style: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.75)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }
    },
        e("div", {
            onClick: ev => ev.stopPropagation(),
            style: { width: "1050px", maxWidth: "95vw", height: "700px", maxHeight: "90vh", background: "var(--background-primary,#313338)", borderRadius: "12px", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }
        },
            // Title bar
            e("div", {
                style: { display: "flex", alignItems: "center", padding: "0 16px", height: "48px", background: "var(--background-secondary,#2b2d31)", borderBottom: "1px solid var(--background-modifier-accent,#3f4147)", flexShrink: 0 }
            },
                e("span", { style: { width: "10px", height: "10px", borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "inline-block", marginRight: "10px" } }),
                e("span", { style: { fontWeight: 700, fontSize: "15px", color: "var(--header-primary)", flex: 1 } }, "GhostClient \\u00b7 Embed Builder"),
                e("button", {
                    onClick: onClose,
                    style: { background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "20px", lineHeight: 1, padding: "4px 8px" }
                }, "\\u00d7")
            ),
            // Content
            e("div", { style: { display: "flex", flex: 1, overflow: "hidden" } },
                // Form
                e("div", {
                    style: { width: "370px", minWidth: "300px", flexShrink: 0, overflowY: "auto", padding: "14px", borderRight: "1px solid var(--background-modifier-accent,#3f4147)" }
                },
                    // ── Webhook section (TOP) ──
                    e("div", { style: { background: "var(--background-secondary,#2b2d31)", borderRadius: "8px", padding: "14px", marginBottom: "10px", border: "1px solid var(--background-modifier-accent,#3f4147)" } },
                        e("div", { style: { fontSize: "13px", fontWeight: 700, color: "var(--header-primary,#f2f3f5)", marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px" } },
                            e("span", { style: { fontSize: "16px" } }, "\\uD83D\\uDD17"),
                            "Webhook"
                        ),
                        e("label", { style: S.label }, "Webhook-URL"),
                        e("input", {
                            style: { ...S.input, marginBottom: "8px" },
                            value: webhookUrl,
                            placeholder: "https://discord.com/api/webhooks/...",
                            onChange: ev => setWebhookUrl(ev.target.value)
                        }),
                        // Bot info display
                        webhookLoading && e("div", { style: { fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" } },
                            e("span", null, "\\u23F3"), " Webhook wird geladen..."
                        ),
                        webhookInfo && !webhookLoading && e("div", {
                            style: { display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", background: "var(--background-tertiary,#1e1f22)", borderRadius: "6px", marginBottom: "8px" }
                        },
                            e("img", {
                                src: webhookInfo.avatarUrl,
                                style: { width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 },
                                onError: ev => { ev.target.style.display = "none"; }
                            }),
                            e("div", null,
                                e("div", { style: { fontSize: "13px", fontWeight: 700, color: "var(--header-primary,#f2f3f5)" } }, webhookInfo.name),
                                e("div", { style: { fontSize: "11px", color: "#3ba55d" } }, "\\u2713 Webhook verbunden")
                            )
                        ),
                        webhookError && !webhookLoading && e("div", { style: { fontSize: "12px", color: "#ed4245", marginBottom: "8px" } }, webhookError),
                        e("button", {
                            onClick: sendWebhook,
                            disabled: sendStatus === "sending" || !webhookUrl.trim(),
                            style: {
                                width: "100%", padding: "10px", border: "none", borderRadius: "6px",
                                cursor: (sendStatus === "sending" || !webhookUrl.trim()) ? "not-allowed" : "pointer",
                                color: "#fff", fontSize: "13px", fontWeight: 600,
                                opacity: !webhookUrl.trim() ? 0.5 : 1, transition: "background 0.2s",
                                background: sendStatus === "ok" ? "#3ba55d" : sendStatus === "error" ? "#ed4245" : sendStatus === "sending" ? "#4752c4" : "#5865f2"
                            }
                        }, sendStatus === "sending" ? "\\u23f3 Wird gesendet..." : sendStatus === "ok" ? "\\u2713 Erfolgreich gesendet!" : sendStatus === "error" ? "\\u2717 Fehler!" : "\\u27a4 Embed senden"),
                        sendStatus === "error" && sendError && e("div", { style: { marginTop: "8px", fontSize: "12px", color: "#ed4245", wordBreak: "break-word" } }, sendError)
                    ),
                    // ── Embed form sections ──
                    e(Section, { title: "Inhalt" },
                        e(Field, { label: "Farbe" },
                            e("div", { style: { display: "flex", gap: "8px", alignItems: "center" } },
                                e("input", { type: "color", value: embed.color, onChange: ev => patch("color", ev.target.value), style: { width: "36px", height: "36px", border: "none", background: "none", cursor: "pointer", padding: 0, borderRadius: "4px" } }),
                                e("input", { style: { ...S.input, flex: 1 }, value: embed.color, placeholder: "#5865f2", onChange: ev => { if (/^#[0-9a-fA-F]{0,6}$/.test(ev.target.value)) patch("color", ev.target.value); } })
                            )
                        ),
                        e(Field, { label: "Titel" }, e("input", { style: S.input, value: embed.title, placeholder: "Embed-Titel...", onChange: ev => patch("title", ev.target.value) })),
                        e(Field, { label: "Titel-URL" }, e("input", { style: S.input, value: embed.url, placeholder: "https://...", onChange: ev => patch("url", ev.target.value) })),
                        e(Field, { label: "Beschreibung" }, e("textarea", { style: { ...S.input, resize: "vertical", minHeight: "80px" }, value: embed.description, placeholder: "Beschreibungstext...", onChange: ev => patch("description", ev.target.value) }))
                    ),
                    e(Section, { title: "Autor", open: false },
                        e(Field, { label: "Name" }, e("input", { style: S.input, value: embed.author.name, placeholder: "Autorname...", onChange: ev => patchNested("author", { name: ev.target.value }) })),
                        e(Field, { label: "URL" }, e("input", { style: S.input, value: embed.author.url, placeholder: "https://...", onChange: ev => patchNested("author", { url: ev.target.value }) })),
                        e(Field, { label: "Icon-URL" }, e("input", { style: S.input, value: embed.author.icon, placeholder: "https://...", onChange: ev => patchNested("author", { icon: ev.target.value }) }))
                    ),
                    e(Section, { title: "Bilder", open: false },
                        e(Field, { label: "Thumbnail (oben rechts)" }, e("input", { style: S.input, value: embed.thumbnail, placeholder: "https://...", onChange: ev => patch("thumbnail", ev.target.value) })),
                        e(Field, { label: "Bild (gro\\u00df, unten)" }, e("input", { style: S.input, value: embed.image, placeholder: "https://...", onChange: ev => patch("image", ev.target.value) }))
                    ),
                    e(Section, { title: "Footer", open: false },
                        e(Field, { label: "Footer-Text" }, e("input", { style: S.input, value: embed.footer.text, placeholder: "Footer-Text...", onChange: ev => patchNested("footer", { text: ev.target.value }) })),
                        e(Field, { label: "Footer-Icon-URL" }, e("input", { style: S.input, value: embed.footer.icon, placeholder: "https://...", onChange: ev => patchNested("footer", { icon: ev.target.value }) })),
                        e("label", { style: { display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "var(--text-normal)" } },
                            e("input", { type: "checkbox", checked: embed.timestamp, onChange: ev => patch("timestamp", ev.target.checked) }),
                            "Zeitstempel anzeigen"
                        )
                    ),
                    e(Section, { title: "Felder (" + embed.fields.length + "/25)" },
                        embed.fields.map(f => e(FieldRow, { key: f.id, field: f, onChange: v => updateField(f.id, v), onRemove: () => removeField(f.id) })),
                        embed.fields.length < 25 && e("button", {
                            onClick: addField,
                            style: { width: "100%", padding: "8px", background: "var(--background-modifier-hover,#3f4147)", border: "1px dashed var(--background-modifier-accent,#4f545c)", borderRadius: "6px", cursor: "pointer", color: "var(--text-muted)", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }
                        }, "+ Feld hinzuf\\u00fcgen")
                    ),
                    e("div", { style: { display: "flex", gap: "8px", marginTop: "4px" } },
                        e("button", {
                            onClick: copyJSON,
                            style: { ...btnBase, flex: 1, background: copied ? "#3ba55d" : "var(--background-modifier-hover,#3f4147)", color: copied ? "#fff" : "var(--text-muted)", transition: "background 0.2s" }
                        }, copied ? "\\u2713 Kopiert!" : "JSON kopieren"),
                        e("button", {
                            onClick: clearAll,
                            style: { ...btnBase, background: cleared ? "#3ba55d" : "var(--background-modifier-hover,#3f4147)", color: cleared ? "#fff" : "var(--text-muted)", transition: "background 0.2s" }
                        }, cleared ? "\\u2713 Geleert!" : "Leeren")
                    )
                ),
                // Preview
                e("div", { style: { flex: 1, overflowY: "auto", padding: "20px", background: "var(--background-primary,#313338)" } },
                    e("div", { style: { fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", marginBottom: "12px" } }, "Vorschau"),
                    e("div", { style: { display: "flex", gap: "14px", padding: "8px 0" } },
                        // Bot avatar in preview
                        botAvatar
                            ? e("img", { src: botAvatar, style: { width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }, onError: ev => { ev.target.style.display = "none"; } })
                            : e("div", { style: { width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 700, color: "#fff" } }, "G"),
                        e("div", { style: { flex: 1 } },
                            e("div", { style: { display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "6px" } },
                                e("span", { style: { fontSize: "14px", fontWeight: 700, color: "var(--header-primary)" } }, botName),
                                e("span", { style: { fontSize: "11px", color: "var(--text-muted)" } }, "Heute um " + new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }))
                            ),
                            e(EmbedPreview, { embed: embed })
                        )
                    ),
                    e("div", { style: { marginTop: "24px", padding: "12px", background: "var(--background-secondary)", borderRadius: "6px", fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.5" } },
                        e("b", { style: { color: "var(--text-normal)" } }, "Tipp:"),
                        " Webhook-URL eingeben, Bot-Info wird automatisch geladen. Dann auf \\u27a4 Embed senden klicken."
                    )
                )
            )
        )
    );
}

// ─── Plugin class ──────────────────────────────────────────────────────────
class GhostEmbed {
    constructor() {
        this._observer = null;
        this._overlay = null;
        this._root = null;
    }

    start() {
        this._addSidebarButton();
    }

    stop() {
        if (this._observer) { this._observer.disconnect(); this._observer = null; }
        document.querySelector(".gc-embed-sidebar-wrapper")?.remove();
        this._closeBuilder();
    }

    _openBuilder() {
        if (this._overlay) return;
        const div = document.createElement("div");
        document.body.appendChild(div);
        this._overlay = div;
        const root = BdApi.ReactDOM.createRoot(div);
        this._root = root;
        root.render(e(GhostEmbedApp, { onClose: () => this._closeBuilder() }));
    }

    _closeBuilder() {
        if (this._root) { this._root.unmount(); this._root = null; }
        if (this._overlay) { this._overlay.remove(); this._overlay = null; }
    }

    _addSidebarButton() {
        const tryInsert = () => {
            try {
                const keys = BdApi.Webpack.getByKeys("unreadMentionsIndicatorBottom");
                if (!keys) return;
                const container = document.querySelector("." + keys.itemsContainer);
                if (!container || container.querySelector(".gc-embed-sidebar-btn")) return;

                const wk = BdApi.Webpack.getByKeys;
                const listItemCls = wk("tutorialContainer")?.listItem || "";
                const wrapperCls = wk("listItemWrapper")?.listItemWrapper || "";
                const btnWrapCls = wk("lowerBadge")?.wrapper || "";
                const circleBtnCls = wk("circleIcon")?.circleIconButton || "";
                const circleIconCls = wk("circleIcon")?.circleIcon || "";

                const listItem = document.createElement("div");
                listItem.className = listItemCls;

                const outerWrap = document.createElement("div");
                outerWrap.className = wrapperCls + " gc-embed-sidebar-wrapper";
                outerWrap.style.cssText = "display:flex;justify-content:center;";

                const btn = document.createElement("div");
                btn.className = btnWrapCls + " gc-embed-sidebar-btn";

                btn.innerHTML = '<svg width="48" height="48" viewBox="-4 -4 48 48" overflow="visible" style="cursor:pointer"><defs><path id="gc-embed-mask" d="M0 17.4C0 11.3 0 8.3 1.2 6 2.2 3.9 3.9 2.2 6 1.2 8.3 0 11.3 0 17.5 0h5C28.7 0 31.7 0 34 1.2 36.1 2.2 37.8 3.9 38.8 6 40 8.3 40 11.3 40 17.5v5C40 28.7 40 31.7 38.8 34 37.8 36.1 36.1 37.8 34 38.8 31.7 40 28.7 40 22.5 40h-5C11.3 40 8.3 40 6 38.8 3.9 37.8 2.2 36.1 1.2 34 0 31.7 0 28.7 0 22.5z"/></defs><mask id="gc-embed-clip" fill="black" x="0" y="0" width="40" height="40"><use href="#gc-embed-mask" fill="white"/></mask><foreignObject mask="url(#gc-embed-clip)" x="0" y="0" width="40" height="40"><div class="' + circleBtnCls + '" aria-label="Embed Builder" role="treeitem" tabindex="-1" style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;"><svg class="' + circleIconCls + '" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" stroke-width="2"/><line x1="9" y1="3" x2="9" y2="9" stroke="currentColor" stroke-width="2"/><line x1="7" y1="14" x2="17" y2="14" stroke="currentColor" stroke-width="1.5"/><line x1="7" y1="17.5" x2="14" y2="17.5" stroke="currentColor" stroke-width="1.5"/></svg></div></foreignObject></svg>';

                btn.onclick = () => this._openBuilder();

                outerWrap.appendChild(btn);
                listItem.appendChild(outerWrap);

                BdApi.UI.createTooltip(btn, "Embed Builder", { style: "primary", side: "right" });

                const separator = container.querySelector("[aria-label=\\"Servers\\"]");
                if (separator?.parentElement) separator.parentElement.insertBefore(outerWrap, separator);
                else container.appendChild(outerWrap);
            }
            catch (err) { console.warn("[GhostEmbed] Sidebar button error:", err); }
        };

        tryInsert();
        this._observer = new MutationObserver(tryInsert);
        this._observer.observe(document.body, { childList: true, subtree: true });
    }
}

module.exports = GhostEmbed;`
    },
    {
        filename: "GhostWebhDeleter.plugin.js",
        content: `/**
   * @name GhostWebhDeleter
   * @author GhostClient
   * @description Opens a draggable window to permanently delete a Discord Webhook by URL.
   * @version 1.0.0
   * @source https://github.com/ghostclient
   */

  const _R = BdApi.React;
  const _e = _R.createElement.bind(_R);
  const { useState: _useState, useEffect: _useEffect, useRef: _useRef, useCallback: _useCallback } = _R;

  function GhostWebhDeleterUI({ onClose }) {
      const [url, setUrl] = _useState("");
      const [status, setStatus] = _useState("idle");
      const [errMsg, setErrMsg] = _useState("");
      const [pos, setPos] = _useState({ x: Math.max(0, window.innerWidth / 2 - 220), y: Math.max(0, window.innerHeight / 2 - 180) });
      const dragging = _useRef(false);
      const offset = _useRef({ x: 0, y: 0 });
      const winRef = _useRef(null);

      _useEffect(() => {
          const onMove = (ev) => {
              if (!dragging.current) return;
              setPos({ x: ev.clientX - offset.current.x, y: ev.clientY - offset.current.y });
          };
          const onUp = () => { dragging.current = false; };
          document.addEventListener("mousemove", onMove, true);
          document.addEventListener("mouseup", onUp);
          return () => {
              document.removeEventListener("mousemove", onMove, true);
              document.removeEventListener("mouseup", onUp);
          };
      }, []);

      const startDrag = _useCallback((ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const rect = winRef.current.getBoundingClientRect();
          offset.current = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
          dragging.current = true;
      }, []);

      const isValid = url.trim().startsWith("https://discord.com/api/webhooks/") || url.trim().startsWith("https://discordapp.com/api/webhooks/");

      const doDelete = _useCallback(async () => {
          if (!isValid || status === "loading") return;
          setStatus("loading");
          setErrMsg("");
          try {
              const res = await BdApi.Net.fetch(url.trim(), { method: "DELETE" });
              if (res.status === 204) {
                  setStatus("success");
              } else {
                  const txt = await res.text().catch(() => "");
                  setStatus("error");
                  setErrMsg("Fehler " + res.status + (txt ? ": " + txt : ""));
              }
          } catch (err) {
              setStatus("error");
              setErrMsg(err && err.message ? err.message : "Netzwerkfehler");
          }
      }, [url, isValid, status]);

      const reset = () => { setUrl(""); setStatus("idle"); setErrMsg(""); };

      const inp = {
          width: "100%", background: "var(--input-background,#1e1f22)",
          border: "1px solid " + (url && !isValid ? "#ed4245" : "var(--input-border,#3f4147)"),
          borderRadius: "6px", color: "var(--text-normal,#dcddde)", fontSize: "14px",
          padding: "10px 12px", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
          marginBottom: "6px",
      };

      return _e("div", {
          ref: winRef,
          style: {
              position: "fixed", left: pos.x + "px", top: pos.y + "px",
              width: "440px", background: "var(--background-primary,#313338)",
              borderRadius: "10px", boxShadow: "0 8px 40px rgba(0,0,0,0.65)",
              zIndex: 9999, overflow: "hidden", pointerEvents: "all",
          }
      },
          _e("div", {
              onMouseDown: startDrag,
              style: {
                  display: "flex", alignItems: "center", padding: "0 12px",
                  height: "44px", background: "var(--background-secondary,#2b2d31)",
                  borderBottom: "1px solid var(--background-modifier-accent,#3f4147)",
                  cursor: "grab", userSelect: "none", flexShrink: 0,
              }
          },
              _e("span", { style: { width: "8px", height: "8px", borderRadius: "50%", background: "#ed4245", display: "inline-block", marginRight: "10px", flexShrink: 0 } }),
              _e("span", { style: { fontWeight: 700, fontSize: "14px", color: "var(--header-primary)", flex: 1 } }, "GhostWebhDeleter"),
              _e("div", {
                  onMouseDown: (ev) => ev.stopPropagation(),
                  onClick: onClose,
                  style: {
                      width: "28px", height: "28px", display: "flex", alignItems: "center",
                      justifyContent: "center", borderRadius: "4px", cursor: "pointer",
                      color: "var(--text-muted)", fontSize: "20px", lineHeight: 1,
                  }
              }, "\u00d7")
          ),
          _e("div", { style: { padding: "20px" } },
              status === "success"
                  ? _e("div", { style: { textAlign: "center", padding: "16px 0" } },
                      _e("div", { style: { fontSize: "42px", marginBottom: "12px" } }, "\u2705"),
                      _e("div", { style: { fontSize: "15px", fontWeight: 700, color: "#3ba55d", marginBottom: "6px" } }, "Webhook gel\u00f6scht!"),
                      _e("div", { style: { fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" } }, "Der Webhook ist permanent entfernt."),
                      _e("button", {
                          onClick: reset,
                          style: { width: "100%", padding: "10px", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: 600, background: "var(--background-modifier-hover,#3f4147)", color: "var(--text-normal)" }
                      }, "Weiteren l\u00f6schen")
                  )
                  : _e("div", null,
                      _e("div", { style: { fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--header-secondary,#b9bbbe)", marginBottom: "8px" } }, "Webhook-URL"),
                      _e("input", {
                          style: inp,
                          value: url,
                          placeholder: "https://discord.com/api/webhooks/...",
                          onChange: (ev) => { setUrl(ev.target.value); if (status === "error") setStatus("idle"); },
                          disabled: status === "loading",
                          spellCheck: false,
                      }),
                      url && !isValid
                          ? _e("div", { style: { fontSize: "12px", color: "#ed4245", marginBottom: "12px" } }, "Ung\u00fcltige Webhook-URL")
                          : _e("div", { style: { marginBottom: "12px" } }),
                      _e("button", {
                          onClick: doDelete,
                          disabled: !isValid || status === "loading",
                          style: {
                              width: "100%", padding: "11px", border: "none", borderRadius: "6px",
                              fontSize: "14px", fontWeight: 700, color: "#fff",
                              background: status === "error" ? "#a12d2f" : "#ed4245",
                              opacity: (!isValid || status === "loading") ? 0.5 : 1,
                              cursor: (!isValid || status === "loading") ? "not-allowed" : "pointer",
                              transition: "background 0.2s, opacity 0.2s",
                          }
                      },
                          status === "loading"
                              ? "\u23f3 Wird gel\u00f6scht..."
                              : status === "error"
                                  ? "\u21ba Erneut versuchen"
                                  : "\uD83D\uDDD1\uFE0F  Webhook l\u00f6schen"
                      ),
                      status === "error" && errMsg
                          ? _e("div", {
                              style: { marginTop: "10px", fontSize: "12px", color: "#ed4245", wordBreak: "break-word", padding: "8px 10px", background: "rgba(237,66,69,0.1)", borderRadius: "4px" }
                            }, errMsg)
                          : null,
                      _e("div", {
                          style: { marginTop: "16px", padding: "10px 12px", background: "var(--background-secondary,#2b2d31)", borderRadius: "6px", fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.5", display: "flex", gap: "8px", alignItems: "flex-start" }
                      },
                          _e("span", null, "\u26a0\ufe0f"),
                          _e("span", null, "Gel\u00f6schte Webhooks k\u00f6nnen nicht wiederhergestellt werden.")
                      )
                  )
          )
      );
  }

  class GhostWebhDeleter {
      constructor() {
          this._observer = null;
          this._div = null;
          this._root = null;
      }

      start() {
          this._addSidebarButton();
      }

      stop() {
          if (this._observer) { this._observer.disconnect(); this._observer = null; }
          document.querySelector(".gc-webhdeleter-sidebar-wrapper")?.remove();
          this._closeWindow();
      }

      _openWindow() {
          if (this._div) return;
          const div = document.createElement("div");
          div.id = "gc-webhdeleter-root";
          div.style.cssText = "position:fixed;inset:0;z-index:9998;pointer-events:none;";
          document.body.appendChild(div);
          this._div = div;
          const root = BdApi.ReactDOM.createRoot(div);
          this._root = root;
          root.render(_e(GhostWebhDeleterUI, { onClose: () => this._closeWindow() }));
      }

      _closeWindow() {
          if (this._root) { this._root.unmount(); this._root = null; }
          if (this._div) { this._div.remove(); this._div = null; }
      }

      _addSidebarButton() {
          const tryInsert = () => {
              try {
                  const keys = BdApi.Webpack.getByKeys("unreadMentionsIndicatorBottom");
                  if (!keys) return;
                  const container = document.querySelector("." + keys.itemsContainer);
                  if (!container || container.querySelector(".gc-webhdeleter-sidebar-btn")) return;

                  const wk = BdApi.Webpack.getByKeys;
                  const wrapperCls = wk("listItemWrapper") ? wk("listItemWrapper").listItemWrapper : "";
                  const btnWrapCls = wk("lowerBadge") ? wk("lowerBadge").wrapper : "";
                  const circleBtnCls = wk("circleIcon") ? wk("circleIcon").circleIconButton : "";

                  const outerWrap = document.createElement("div");
                  outerWrap.className = (wrapperCls ? wrapperCls + " " : "") + "gc-webhdeleter-sidebar-wrapper";
                  outerWrap.style.cssText = "display:flex;justify-content:center;";

                  const btn = document.createElement("div");
                  btn.className = (btnWrapCls ? btnWrapCls + " " : "") + "gc-webhdeleter-sidebar-btn";
                  btn.style.cssText = "cursor:pointer;";

                  const inner = document.createElement("div");
                  inner.className = circleBtnCls || "";
                  inner.setAttribute("aria-label", "GhostWebhDeleter");
                  inner.setAttribute("role", "button");
                  inner.style.cssText = "display:flex;align-items:center;justify-content:center;width:40px;height:40px;background:#ed4245;border-radius:50%;";
                  inner.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';

                  btn.appendChild(inner);
                  btn.onclick = () => this._openWindow();
                  outerWrap.appendChild(btn);

                  try { BdApi.UI.createTooltip(btn, "GhostWebhDeleter", { style: "primary", side: "right" }); } catch(e) {}

                  const separator = container.querySelector('[aria-label="Servers"]');
                  if (separator && separator.parentElement) separator.parentElement.insertBefore(outerWrap, separator);
                  else container.appendChild(outerWrap);
              } catch (err) {
                  console.warn("[GhostWebhDeleter] Sidebar-Fehler:", err);
              }
          };

          tryInsert();
          this._observer = new MutationObserver(tryInsert);
          this._observer.observe(document.body, { childList: true, subtree: true });
      }
  }

  module.exports = GhostWebhDeleter;`
    },
    {
        filename: "GhostDoubleClickToEdit.plugin.js",
        content: `/**
 * @name GhostDoubleClickToEdit
 * @author GhostClient
 * @description Double-click any of your own messages to instantly start editing them.
 * @version 1.0.0
 * @source https://github.com/ghostclient
 */

class GhostDoubleClickToEdit {
    start() {
        BdApi.DOM.addStyle("GhostDoubleClickToEdit",
            "[id^=\\"chat-messages-\\"] [class*=\\"messageContent\\"] { cursor: text; }"
        );

        this._msgStore  = BdApi.Webpack.getByKeys("getMessage", "getMessages");
        this._userStore = BdApi.Webpack.getByKeys("getCurrentUser");
        this._editMod   = BdApi.Webpack.getByKeys("startEditMessage");

        this._handler = (ev) => {
            try {
                if (!ev.target.closest("[class*=\\"messageContent\\"]")) return;

                const container = ev.target.closest("[id^=\\"chat-messages-\\"]");
                if (!container) return;

                const parts = container.id.split("-");
                if (parts.length < 4) return;
                const messageId = parts[parts.length - 1];
                const channelId = parts[parts.length - 2];

                const currentUser = this._userStore && this._userStore.getCurrentUser
                    ? this._userStore.getCurrentUser()
                    : null;
                if (!currentUser) return;

                const message = this._msgStore && this._msgStore.getMessage
                    ? this._msgStore.getMessage(channelId, messageId)
                    : null;
                if (!message) return;
                if (message.author.id !== currentUser.id) return;

                if (!this._editMod || !this._editMod.startEditMessage) return;
                this._editMod.startEditMessage(channelId, messageId, message.content);

                ev.preventDefault();
                ev.stopPropagation();
            } catch (err) {
                console.warn("[GhostDoubleClickToEdit] Fehler:", err);
            }
        };

        document.addEventListener("dblclick", this._handler, true);
    }

    stop() {
        BdApi.DOM.removeStyle("GhostDoubleClickToEdit");
        if (this._handler) {
            document.removeEventListener("dblclick", this._handler, true);
            this._handler = null;
        }
        this._msgStore = null;
        this._userStore = null;
        this._editMod = null;
    }
}

module.exports = GhostDoubleClickToEdit;`
    },
    {
        filename: "GhostClientLogo.plugin.js",
        content: `/**
 * @name GhostClientLogo
 * @author GhostClient
 * @description Ersetzt das GhostClient-Logo und Lade-Icon mit einem eigenen Bild. Gr\u00f6\u00dfe anpassbar. Update Src exportiert die Dateien als ZIP.
 * @version 1.1.0
 * @source https://github.com/ghostclient
 */

const _R = BdApi.React;
const _e = _R.createElement.bind(_R);
const { useState, useEffect, useRef, useCallback } = _R;

const PLUGIN_ID = "GhostClientLogo";
const DATA_KEY = "customLogoDataUrl";
const DATA_KEY_LOGO_SIZE = "logoSize";
const DATA_KEY_LOADING_SIZE = "loadingSize";

// Apply custom logo via CSS only — removing CSS cleanly restores original without touching img.src
function applyLogo(url, logoSize, loadingSize) {
    var ls = logoSize || 24;
    var lis = loadingSize || 20;
    BdApi.DOM.addStyle(PLUGIN_ID + "_logo",
        "img.lucide-ghostclient { content: url('" + url + "') !important; width: " + ls + "px !important; height: " + ls + "px !important; } " +
        "#bd-loading-icon { background-image: url('" + url + "') !important; width: " + lis + "px !important; height: " + lis + "px !important; }"
    );
}

function applySize(logoSize, loadingSize) {
    var ls = logoSize || 24;
    var lis = loadingSize || 20;
    BdApi.DOM.addStyle(PLUGIN_ID + "_size",
        "img.lucide-ghostclient { width: " + ls + "px !important; height: " + ls + "px !important; } " +
        "#bd-loading-icon { width: " + lis + "px !important; height: " + lis + "px !important; }"
    );
}

function removeLogo() { BdApi.DOM.removeStyle(PLUGIN_ID + "_logo"); }
function removeSize() { BdApi.DOM.removeStyle(PLUGIN_ID + "_size"); }

function processImage(dataUrl) {
    return new Promise(function(resolve) {
        var img = new Image();
        img.onload = function() {
            var size = 256;
            var canvas = document.createElement("canvas");
            canvas.width = size; canvas.height = size;
            var ctx = canvas.getContext("2d");
            var side = Math.min(img.width, img.height);
            ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
            resolve(canvas.toDataURL("image/png"));
        };
        img.src = dataUrl;
    });
}

// --- Minimal ZIP writer (store, no compression) ---
function crc32(data) {
    var crc = 0xFFFFFFFF;
    for (var i = 0; i < data.length; i++) {
        crc ^= data[i];
        for (var j = 0; j < 8; j++) crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeZip(files) {
    var enc = new TextEncoder();
    var locals = [];
    var centrals = [];
    var offset = 0;
    for (var fi = 0; fi < files.length; fi++) {
        var f = files[fi];
        var nb = enc.encode(f.name);
        var d = f.data;
        var crc = crc32(d);
        var sz = d.length;
        var local = new Uint8Array(30 + nb.length + sz);
        var lv = new DataView(local.buffer);
        lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0, true);
        lv.setUint16(8, 0, true); lv.setUint16(10, 0, true); lv.setUint16(12, 0, true);
        lv.setUint32(14, crc, true); lv.setUint32(18, sz, true); lv.setUint32(22, sz, true);
        lv.setUint16(26, nb.length, true); lv.setUint16(28, 0, true);
        local.set(nb, 30); local.set(d, 30 + nb.length);
        locals.push({ bytes: local, nb: nb, crc: crc, sz: sz, off: offset });
        offset += local.length;
    }
    var centralSize = 0;
    for (var ci = 0; ci < locals.length; ci++) {
        var h = locals[ci];
        var c = new Uint8Array(46 + h.nb.length);
        var cv = new DataView(c.buffer);
        cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
        cv.setUint16(8, 0, true); cv.setUint16(10, 0, true); cv.setUint16(12, 0, true); cv.setUint16(14, 0, true);
        cv.setUint32(16, h.crc, true); cv.setUint32(20, h.sz, true); cv.setUint32(24, h.sz, true);
        cv.setUint16(28, h.nb.length, true); cv.setUint16(30, 0, true); cv.setUint16(32, 0, true);
        cv.setUint16(34, 0, true); cv.setUint16(36, 0, true); cv.setUint32(38, 0, true); cv.setUint32(42, h.off, true);
        c.set(h.nb, 46);
        centrals.push(c);
        centralSize += c.length;
    }
    var eocd = new Uint8Array(22);
    var ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(4, 0, true); ev.setUint16(6, 0, true);
    ev.setUint16(8, locals.length, true); ev.setUint16(10, locals.length, true);
    ev.setUint32(12, centralSize, true); ev.setUint32(16, offset, true); ev.setUint16(20, 0, true);
    var result = new Uint8Array(offset + centralSize + 22);
    var pos = 0;
    for (var li = 0; li < locals.length; li++) { result.set(locals[li].bytes, pos); pos += locals[li].bytes.length; }
    for (var ri = 0; ri < centrals.length; ri++) { result.set(centrals[ri], pos); pos += centrals[ri].length; }
    result.set(eocd, pos);
    return result;
}

function dataUrlToBytes(dataUrl) {
    var b64 = dataUrl.split(",")[1];
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
}

function downloadZip(zipBytes) {
    var blob = new Blob([zipBytes], { type: "application/zip" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = "ghostclient-logos.zip";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 2000);
}

// --- UI ---
function GhostLogoUI(props) {
    var onClose = props.onClose;
    var initLoaded = BdApi.Data.load(PLUGIN_ID, DATA_KEY) || null;
    var initLogoSize = BdApi.Data.load(PLUGIN_ID, DATA_KEY_LOGO_SIZE) || 24;
    var initLoadingSize = BdApi.Data.load(PLUGIN_ID, DATA_KEY_LOADING_SIZE) || 20;

    var stateArr = useState({
        phase: initLoaded ? "applied" : "upload",
        uploaded: null,
        generated: initLoaded,
        dragging: false,
        msg: "",
        zipReady: false,
        logoSize: initLogoSize,
        loadingSize: initLoadingSize
    });
    var state = stateArr[0];
    var setState = stateArr[1];

    var posArr = useState({ x: Math.max(0, window.innerWidth / 2 - 235), y: Math.max(0, window.innerHeight / 2 - 300) });
    var pos = posArr[0]; var setPos = posArr[1];

    var isDragging = useRef(false);
    var dragOffset = useRef({ x: 0, y: 0 });
    var winRef = useRef(null);
    var fileRef = useRef(null);

    var merge = useCallback(function(obj) { setState(function(p) { return Object.assign({}, p, obj); }); }, []);

    useEffect(function() {
        function onMove(ev) {
            if (!isDragging.current) return;
            setPos({ x: ev.clientX - dragOffset.current.x, y: ev.clientY - dragOffset.current.y });
        }
        function onUp() { isDragging.current = false; }
        document.addEventListener("mousemove", onMove, true);
        document.addEventListener("mouseup", onUp);
        return function() {
            document.removeEventListener("mousemove", onMove, true);
            document.removeEventListener("mouseup", onUp);
        };
    }, []);

    function startDrag(ev) {
        ev.preventDefault(); ev.stopPropagation();
        var r = winRef.current.getBoundingClientRect();
        dragOffset.current = { x: ev.clientX - r.left, y: ev.clientY - r.top };
        isDragging.current = true;
    }

    function handleFile(file) {
        if (!file || !file.type.startsWith("image/")) return;
        var reader = new FileReader();
        reader.onload = function(ev) { merge({ phase: "preview", uploaded: ev.target.result, zipReady: false }); };
        reader.readAsDataURL(file);
    }

    function handleGenerate() {
        if (!state.uploaded) return;
        processImage(state.uploaded).then(function(url) { merge({ phase: "ready", generated: url, zipReady: false }); });
    }

    function handleApply() {
        var url = state.generated;
        BdApi.Data.save(PLUGIN_ID, DATA_KEY, url);
        BdApi.Data.save(PLUGIN_ID, DATA_KEY_LOGO_SIZE, state.logoSize);
        BdApi.Data.save(PLUGIN_ID, DATA_KEY_LOADING_SIZE, state.loadingSize);
        removeSize();
        applyLogo(url, state.logoSize, state.loadingSize);
        merge({ phase: "applied", msg: "\u2705 Logo erfolgreich aktualisiert!" });
        setTimeout(function() { merge({ msg: "" }); }, 3000);
    }

    function handleReset() {
        BdApi.Data.save(PLUGIN_ID, DATA_KEY, null);
        removeLogo();
        applySize(state.logoSize, state.loadingSize);
        merge({ phase: "upload", uploaded: null, generated: null, zipReady: false, msg: "\uD83D\uDD04 Standard-Logo wiederhergestellt!" });
        setTimeout(function() { merge({ msg: "" }); }, 3000);
    }

    function handleUpdateSrc() {
        var url = state.generated;
        if (!url) {
            merge({ msg: "\u26A0\uFE0F Kein Logo generiert oder geladen." });
            setTimeout(function() { merge({ msg: "" }); }, 3000);
            return;
        }
        try {
            var bytes = dataUrlToBytes(url);
            var zip = makeZip([{ name: "src/ghostclient/ui/ghost-logo.png", data: bytes }]);
            downloadZip(zip);
            merge({ zipReady: true, msg: "\u2705 ZIP wird heruntergeladen!" });
            setTimeout(function() { merge({ msg: "" }); }, 3000);
        } catch (err) {
            merge({ msg: "\u274C Fehler: " + (err.message || err) });
            setTimeout(function() { merge({ msg: "" }); }, 4000);
        }
    }

    function handleSizeChange(key, val) {
        var v = parseInt(val, 10);
        var upd = {};
        upd[key] = v;
        merge(upd);
        var logoSize = key === "logoSize" ? v : state.logoSize;
        var loadingSize = key === "loadingSize" ? v : state.loadingSize;
        BdApi.Data.save(PLUGIN_ID, DATA_KEY_LOGO_SIZE, logoSize);
        BdApi.Data.save(PLUGIN_ID, DATA_KEY_LOADING_SIZE, loadingSize);
        var saved = BdApi.Data.load(PLUGIN_ID, DATA_KEY);
        if (saved) {
            removeLogo();
            applyLogo(saved, logoSize, loadingSize);
        } else {
            applySize(logoSize, loadingSize);
        }
    }

    function btn(label, bg, color, onClick) {
        return _e("button", {
            onClick: onClick,
            style: { width: "100%", padding: "10px", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 700, color: color || "#fff", background: bg, cursor: "pointer", marginBottom: "8px" }
        }, label);
    }

    function sizeSlider(label, key, min, max, value) {
        return _e("div", { style: { marginBottom: "10px" } },
            _e("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: "4px" } },
                _e("span", { style: { fontSize: "12px", color: "var(--text-muted)", fontWeight: 600 } }, label),
                _e("span", { style: { fontSize: "12px", color: "var(--header-primary)", fontWeight: 700 } }, value + "px")
            ),
            _e("input", {
                type: "range", min: min, max: max, value: value,
                onChange: function(ev) { handleSizeChange(key, ev.target.value); },
                style: { width: "100%", accentColor: "#7c3aed", cursor: "pointer" }
            })
        );
    }

    function sizeSection() {
        return _e("div", { style: { background: "var(--background-secondary,#2b2d31)", borderRadius: "8px", padding: "12px", marginBottom: "10px" } },
            _e("div", { style: { fontSize: "11px", fontWeight: 700, color: "var(--header-secondary)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" } }, "Gr\u00f6\u00dfe anpassen"),
            sizeSlider("GhostClient Logo", "logoSize", 12, 64, state.logoSize),
            sizeSlider("Lade-Icon", "loadingSize", 10, 48, state.loadingSize)
        );
    }

    function uploadZone(mini) {
        return _e("div", {
            style: {
                border: "2px dashed " + (state.dragging ? "#7c3aed" : "var(--background-modifier-accent,#3f4147)"),
                borderRadius: "8px", padding: mini ? "10px" : "28px 16px",
                textAlign: "center", cursor: "pointer", marginBottom: "10px",
                background: state.dragging ? "rgba(124,58,237,0.08)" : "var(--background-secondary,#2b2d31)", transition: "all 0.2s"
            },
            onClick: function() { if (fileRef.current) fileRef.current.click(); },
            onDragOver: function(ev) { ev.preventDefault(); merge({ dragging: true }); },
            onDragLeave: function() { merge({ dragging: false }); },
            onDrop: function(ev) { ev.preventDefault(); merge({ dragging: false }); handleFile(ev.dataTransfer.files[0]); }
        },
            _e("input", { ref: fileRef, type: "file", accept: "image/*", style: { display: "none" }, onChange: function(ev) { handleFile(ev.target.files[0]); } }),
            _e("div", { style: { fontSize: mini ? "20px" : "32px", marginBottom: "4px" } }, "\u2B06\uFE0F"),
            _e("div", { style: { fontWeight: 600, fontSize: mini ? "12px" : "14px", color: "var(--text-normal)" } }, mini ? "Neues Bild hochladen" : "Bild hochladen"),
            !mini && _e("div", { style: { fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" } }, "Klicken oder hierher ziehen")
        );
    }

    function imgPreview(url, border, label) {
        return _e("div", { style: { textAlign: "center", marginBottom: "12px" } },
            _e("img", { src: url, style: { width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", border: "3px solid " + border } }),
            label && _e("div", { style: { fontSize: "12px", color: "var(--text-muted)", marginTop: "6px", fontWeight: 600 } }, label)
        );
    }

    var phase = state.phase;

    return _e("div", {
        ref: winRef,
        style: { position: "fixed", left: pos.x + "px", top: pos.y + "px", width: "460px", background: "var(--background-primary,#313338)", borderRadius: "10px", boxShadow: "0 8px 40px rgba(0,0,0,0.65)", zIndex: 10000, overflow: "hidden", pointerEvents: "all" }
    },
        _e("div", {
            onMouseDown: startDrag,
            style: { display: "flex", alignItems: "center", padding: "0 14px", height: "44px", background: "var(--background-secondary,#2b2d31)", borderBottom: "1px solid var(--background-modifier-accent,#3f4147)", cursor: "grab", userSelect: "none" }
        },
            _e("span", { style: { width: "8px", height: "8px", borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "inline-block", marginRight: "10px" } }),
            _e("span", { style: { fontWeight: 700, fontSize: "14px", color: "var(--header-primary)", flex: 1 } }, "GhostClient \u00b7 Logo Manager"),
            _e("div", { onMouseDown: function(ev) { ev.stopPropagation(); }, onClick: onClose, style: { width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "4px", cursor: "pointer", color: "var(--text-muted)", fontSize: "20px" } }, "\u00d7")
        ),
        _e("div", { style: { padding: "18px", maxHeight: "calc(90vh - 44px)", overflowY: "auto" } },

            phase === "upload" && _e("div", null,
                uploadZone(false),
                sizeSection()
            ),

            phase === "preview" && _e("div", null,
                uploadZone(true),
                state.uploaded && imgPreview(state.uploaded, "#7c3aed", "Hochgeladenes Bild"),
                sizeSection(),
                btn("\u2728 Generieren", "linear-gradient(135deg,#7c3aed,#4f46e5)", "#fff", handleGenerate)
            ),

            phase === "ready" && _e("div", null,
                imgPreview(state.generated, "#7c3aed", "Logo bereit!"),
                sizeSection(),
                btn("\u2705 Apply Logo", "#3ba55d", "#fff", handleApply),
                btn("\uD83D\uDCE6 Update Src", "#5865f2", "#fff", handleUpdateSrc),
                btn("\uD83D\uDD04 Reset auf Default", "var(--background-modifier-hover,#3f4147)", "var(--text-normal)", handleReset)
            ),

            phase === "applied" && _e("div", null,
                state.generated && imgPreview(state.generated, "#3ba55d", "\u2705 Aktives Custom-Logo"),
                uploadZone(true),
                sizeSection(),
                btn("\uD83D\uDCE6 Update Src", "#5865f2", "#fff", handleUpdateSrc),
                btn("\uD83D\uDD04 Reset auf Default", "var(--background-modifier-hover,#3f4147)", "var(--text-normal)", handleReset)
            ),

            state.msg && _e("div", { style: { marginBottom: "8px", padding: "10px", background: "var(--background-secondary)", borderRadius: "6px", fontSize: "13px", textAlign: "center", color: "var(--text-normal)" } }, state.msg),

            _e("div", { style: { padding: "10px 12px", background: "var(--background-secondary,#2b2d31)", borderRadius: "6px", fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.5" } },
                "Logo wird sofort \u00fcbernommen. Update Src erstellt eine ZIP f\u00fcr deinen Projektordner (src/ghostclient/ui/)."
            )
        )
    );
}

class GhostClientLogo {
    constructor() { this._div = null; this._root = null; }

    start() {
        var logo = BdApi.Data.load(PLUGIN_ID, DATA_KEY);
        var logoSize = BdApi.Data.load(PLUGIN_ID, DATA_KEY_LOGO_SIZE) || 24;
        var loadingSize = BdApi.Data.load(PLUGIN_ID, DATA_KEY_LOADING_SIZE) || 20;
        if (logo) {
            applyLogo(logo, logoSize, loadingSize);
        } else {
            applySize(logoSize, loadingSize);
        }
    }

    stop() {
        removeLogo();
        removeSize();
        this._closeWindow();
    }

    getSettingsPanel() {
        var div = document.createElement("div");
        div.style.cssText = "padding: 16px;";
        var gbtn = document.createElement("button");
        gbtn.textContent = "\uD83C\uDFA8 Logo Manager \u00f6ffnen";
        gbtn.style.cssText = "padding: 10px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 700; color: #fff; background: linear-gradient(135deg, #7c3aed, #4f46e5); width: 100%;";
        var self = this;
        gbtn.onclick = function() { self._openWindow(); };
        div.appendChild(gbtn);
        return div;
    }

    _openWindow() {
        if (this._div) return;
        var div = document.createElement("div");
        div.id = "gc-logo-manager-root";
        div.style.cssText = "position: fixed; inset: 0; z-index: 9999; pointer-events: none;";
        document.body.appendChild(div);
        this._div = div;
        var root = BdApi.ReactDOM.createRoot(div);
        this._root = root;
        var self = this;
        root.render(_e(GhostLogoUI, { onClose: function() { self._closeWindow(); } }));
    }

    _closeWindow() {
        if (this._root) { this._root.unmount(); this._root = null; }
        if (this._div) { this._div.remove(); this._div = null; }
    }
}

module.exports = GhostClientLogo;`
    },
    {
        filename: "GhostGameStatus.plugin.js",
        content: `/**
 * @name GhostGameStatus
 * @author GhostClient
 * @description Custom Game Activity Status with buttons for your Discord profile.
 * @version 7.0.0
 * @source https://github.com/ghostclient
 */

class GhostGameStatus {
    constructor() {
        this._interval = null;
        this._startTime = null;
        this._mods = null;
        this._log = [];
    }
    start() {
        this._startTime = Date.now();
        this._log = [];
        this._addLog('Plugin startet v7.0.0...');
        this._mods = this._findModules();
        var s = this._load();
        this._apply(s);
        var self = this;
        this._interval = setInterval(function() {
            self._apply(self._load());
        }, 15000);
    }
    stop() {
        if (this._interval) clearInterval(this._interval);
        this._interval = null;
        this._clear();
        this._mods = null;
    }
    _getLogPath() {
        try {
            var path = require('path');
            var os = require('os');
            return path.join(os.homedir(), 'Desktop', 'GhostGameStatus.log');
        } catch(e) {
            return null;
        }
    }
    _writeLogFile() {
        try {
            var fs = require('fs');
            var logPath = this._getLogPath();
            if (!logPath) return;
            var nl = String.fromCharCode(10);
            var header = '=== GhostGameStatus v7.1 Log ===' + nl;
            header += 'Zeitpunkt: ' + new Date().toLocaleString() + nl;
            header += '================================' + nl + nl;
            fs.writeFileSync(logPath, header + this._log.join(nl) + nl);
        } catch(e) {
            console.log('[GhostGameStatus] Log-Datei Fehler: ' + e.message);
        }
    }
    _addLog(msg) {
        this._log.push(msg);
        console.log('[GhostGameStatus] ' + msg);
        this._writeLogFile();
    }
    _load() {
        var d = { statusType: 0, gameName: 'GhostClient', lines: [], timeMode: 'real', customHours: 0, customMinutes: 0, streamUrl: 'https://twitch.tv/ghostclient', appId: '', buttons: [] };
        var s = BdApi.Data.load('GhostGameStatus', 'settings');
        if (s) {
            for (var k in s) d[k] = s[k];
            if (s.details && !s.lines) {
                d.lines = [];
                if (s.details) d.lines.push(s.details);
                if (s.gameState) d.lines.push(s.gameState);
            }
        }
        return d;
    }
    _save(s) {
        BdApi.Data.save('GhostGameStatus', 'settings', s);
    }
    _getTs(s) {
        if (s.timeMode === 'real') return this._startTime || Date.now();
        return Date.now() - ((s.customHours || 0) * 3600000 + (s.customMinutes || 0) * 60000);
    }
    _findModules() {
        var self = this;
        var result = { dispatcher: null, gameStore: null, presenceStore: null, gateway: null, userStore: null };

        var methods = [
            function() { return BdApi.Webpack.getByKeys('dispatch', 'subscribe', 'register', { searchExports: true }); },
            function() { return BdApi.Webpack.getModule(function(m) { return m && m.dispatch && m.subscribe && m.register; }, { searchExports: true }); },
            function() { return BdApi.Webpack.getModule(function(m) { return m && m.dispatch && m.subscribe; }, { searchExports: true }); },
            function() { return BdApi.Webpack.getModule(function(m) { return m && typeof m.dispatch === 'function' && typeof m.subscribe === 'function'; }); },
            function() { return BdApi.Webpack.getModule(BdApi.Webpack.Filters.byKeys('dispatch', 'subscribe', 'register'), { searchExports: true }); },
            function() { return BdApi.Webpack.getModule(BdApi.Webpack.Filters.byKeys('dispatch', 'subscribe'), { searchExports: true }); }
        ];

        for (var i = 0; i < methods.length; i++) {
            try {
                var found = methods[i]();
                if (found && found.dispatch) {
                    result.dispatcher = found;
                    self._addLog('Dispatcher GEFUNDEN mit Methode ' + (i + 1));
                    break;
                }
            } catch(e) {
                self._addLog('Dispatcher Methode ' + (i + 1) + ' fehlgeschlagen: ' + e.message);
            }
        }
        if (!result.dispatcher) self._addLog('Dispatcher NICHT GEFUNDEN mit allen 6 Methoden');

        try { result.gameStore = BdApi.Webpack.getStore('RunningGameStore'); } catch(e) {}
        if (!result.gameStore) try { result.gameStore = BdApi.Webpack.getModule(function(m) { return m && m.getRunningGames; }); } catch(e) {}
        self._addLog('RunningGameStore: ' + (result.gameStore ? 'GEFUNDEN' : 'NICHT GEFUNDEN'));

        try { result.presenceStore = BdApi.Webpack.getStore('SelfPresenceStore'); } catch(e) {}
        if (!result.presenceStore) try { result.presenceStore = BdApi.Webpack.getModule(function(m) { return m && m.getLocalPresence; }); } catch(e) {}
        self._addLog('SelfPresenceStore: ' + (result.presenceStore ? 'GEFUNDEN' : 'NICHT GEFUNDEN'));

        try { result.gateway = BdApi.Webpack.getStore('GatewayConnectionStore'); } catch(e) {}
        if (!result.gateway) try { result.gateway = BdApi.Webpack.getModule(function(m) { return m && m.getSocket; }); } catch(e) {}
        self._addLog('GatewayConnectionStore: ' + (result.gateway ? 'GEFUNDEN' : 'NICHT GEFUNDEN'));

        if (result.gateway) {
            try {
                var sock = result.gateway.getSocket();
                if (sock) {
                    var proto = Object.getPrototypeOf(sock);
                    var fns = Object.getOwnPropertyNames(proto).filter(function(k) { return typeof sock[k] === 'function'; });
                    self._addLog('Socket Methoden: ' + fns.join(', '));
                } else {
                    self._addLog('Socket ist NULL - keine Verbindung?');
                }
            } catch(e) { self._addLog('Socket Fehler: ' + e.message); }
        }

        try { result.userStore = BdApi.Webpack.getStore('UserStore'); } catch(e) {}
        if (!result.userStore) try { result.userStore = BdApi.Webpack.getModule(function(m) { return m && m.getCurrentUser; }); } catch(e) {}

        return result;
    }
    _buildActivity(s) {
        var ts = this._getTs(s);
        var gn = s.gameName || 'GhostClient';
        var act = { name: gn, type: s.statusType || 0, timestamps: { start: ts } };
        var lines = s.lines || [];
        if (lines.length > 0 && lines[0]) act.details = lines[0];
        if (lines.length > 1 && lines[1]) act.state = lines[1];
        if (s.statusType === 1) act.url = s.streamUrl || 'https://twitch.tv/ghostclient';
        if (s.appId) {
            act.application_id = s.appId;
            var validBtns = (s.buttons || []).filter(function(b) { return b && b.label && b.url; });
            if (validBtns.length > 0) {
                act.buttons = validBtns.slice(0, 2).map(function(b) { return b.label; });
                act.metadata = { button_urls: validBtns.slice(0, 2).map(function(b) { return b.url; }) };
            }
        }
        return act;
    }
    _apply(s) {
        if (!this._mods) this._mods = this._findModules();
        var mods = this._mods;
        var act = this._buildActivity(s);
        var ok = false;

        if (mods.dispatcher) {
            try {
                mods.dispatcher.dispatch({ type: 'LOCAL_ACTIVITY_UPDATE', activity: act, socketId: 'GhostGameStatus' });
                this._addLog('LOCAL_ACTIVITY_UPDATE dispatched');
                ok = true;
            } catch(e) { this._addLog('LOCAL_ACTIVITY_UPDATE FEHLER: ' + e.message); }

            if (s.statusType === 0) {
                try {
                    var games = [];
                    if (mods.gameStore && mods.gameStore.getRunningGames) {
                        var existing = mods.gameStore.getRunningGames();
                        if (Array.isArray(existing)) games = existing.filter(function(g) { return g && g.pid !== 31337; });
                    }
                    games.push({ id: 'ghostclient-custom', name: act.name, pid: 31337, start: act.timestamps.start });
                    mods.dispatcher.dispatch({ type: 'RUNNING_GAMES_CHANGE', games: games });
                    this._addLog('RUNNING_GAMES_CHANGE dispatched (' + games.length + ' games)');
                } catch(e) { this._addLog('RUNNING_GAMES_CHANGE FEHLER: ' + e.message); }
            }
        }

        if (mods.gateway) {
            try {
                var socket = mods.gateway.getSocket();
                if (socket) {
                    if (typeof socket.presenceUpdate === 'function') {
                        socket.presenceUpdate({ status: 'online', since: 0, activities: [act], afk: false });
                        this._addLog('Gateway presenceUpdate gesendet');
                        ok = true;
                    } else {
                        var proto = Object.getPrototypeOf(socket);
                        var allFns = Object.getOwnPropertyNames(proto).filter(function(k) { return typeof socket[k] === 'function'; });
                        var presenceFns = allFns.filter(function(k) { return k.toLowerCase().indexOf('presen') >= 0 || k.toLowerCase().indexOf('status') >= 0 || k.toLowerCase().indexOf('activit') >= 0; });
                        this._addLog('Kein presenceUpdate! Aehnliche: ' + (presenceFns.length > 0 ? presenceFns.join(', ') : 'KEINE'));

                        if (typeof socket.send === 'function') {
                            socket.send(3, { status: 'online', since: 0, activities: [act], afk: false });
                            this._addLog('Fallback: socket.send(3, ...) versucht');
                            ok = true;
                        }
                    }
                } else {
                    this._addLog('Gateway Socket ist NULL');
                }
            } catch(e) { this._addLog('Gateway FEHLER: ' + e.message); }
        }

        if (mods.presenceStore && mods.presenceStore.getLocalPresence) {
            try {
                var p = mods.presenceStore.getLocalPresence();
                this._addLog('Presence nach Update: ' + JSON.stringify(p).substring(0, 200));
            } catch(e) {}
        }

        if (!ok) this._addLog('WARNUNG: Keine Methode hat funktioniert!');
    }
    _clear() {
        if (!this._mods) this._mods = this._findModules();
        var mods = this._mods;
        if (mods.dispatcher) {
            try { mods.dispatcher.dispatch({ type: 'LOCAL_ACTIVITY_UPDATE', activity: null, socketId: 'GhostGameStatus' }); } catch(e) {}
            try { mods.dispatcher.dispatch({ type: 'RUNNING_GAMES_CHANGE', games: [] }); } catch(e) {}
        }
        if (mods.gateway) {
            try {
                var socket = mods.gateway.getSocket();
                if (socket && typeof socket.presenceUpdate === 'function') {
                    socket.presenceUpdate({ status: 'online', since: 0, activities: [], afk: false });
                } else if (socket && typeof socket.send === 'function') {
                    socket.send(3, { status: 'online', since: 0, activities: [], afk: false });
                }
            } catch(e) {}
        }
    }
    getSettingsPanel() {
        var self = this;
        var el = document.createElement('div');
        el.style.cssText = 'padding:8px;color:var(--text-normal);font-family:var(--font-primary);';
        var s = this._load();
        if (!s.lines) s.lines = [];
        var TYPES = [{t:0,l:'Playing'},{t:1,l:'Streaming'},{t:2,l:'Listening'},{t:3,l:'Watching'},{t:5,l:'Competing'}];
        function makeSec() {
            var d = document.createElement('div');
            d.style.cssText = 'background:var(--background-secondary,#2b2d31);border-radius:8px;padding:14px;margin-bottom:12px;';
            return d;
        }
        function makeLbl(text) {
            var d = document.createElement('div');
            d.style.cssText = 'font-size:11px;font-weight:700;color:var(--header-secondary,#b9bbbe);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;';
            d.textContent = text;
            return d;
        }
        function makeInput(val, ph, onChange) {
            var inp = document.createElement('input');
            inp.style.cssText = 'width:100%;background:var(--input-background,#1e1f22);border:1px solid var(--input-border,#3f4147);border-radius:4px;color:var(--text-normal);font-size:14px;padding:8px 10px;outline:none;box-sizing:border-box;margin-bottom:6px;';
            inp.value = val || '';
            inp.placeholder = ph || '';
            inp.oninput = function() { onChange(inp.value); };
            return inp;
        }
        function makeBtn(text, active, onClick) {
            var b = document.createElement('button');
            b.style.cssText = 'padding:8px 14px;border-radius:6px;border:none;cursor:pointer;font-weight:600;font-size:13px;margin-right:6px;margin-bottom:6px;';
            b.style.background = active ? '#3ba55d' : 'var(--background-modifier-hover,#3f4147)';
            b.style.color = active ? '#fff' : 'var(--text-normal)';
            b.textContent = text;
            b.onclick = onClick;
            return b;
        }

        var statusSec = makeSec();
        statusSec.style.border = '2px solid var(--background-modifier-hover)';
        statusSec.appendChild(makeLbl('MODUL-STATUS (AUTOMATISCH)'));
        var statusContent = document.createElement('div');
        statusContent.style.cssText = 'font-size:12px;line-height:1.8;font-family:Consolas,monospace;';
        function updateStatus() {
            statusContent.innerHTML = '';
            if (!self._mods) self._mods = self._findModules();
            var mods = self._mods;
            var items = [
                { name: 'FluxDispatcher', found: !!mods.dispatcher },
                { name: 'RunningGameStore', found: !!mods.gameStore },
                { name: 'SelfPresenceStore', found: !!mods.presenceStore },
                { name: 'GatewayConnection', found: !!mods.gateway },
                { name: 'Application ID', found: !!(s.appId && s.appId.length > 10) }
            ];
            items.forEach(function(item) {
                var row = document.createElement('div');
                var dot = document.createElement('span');
                dot.style.cssText = 'display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:8px;vertical-align:middle;';
                dot.style.background = item.found ? '#3ba55d' : '#ed4245';
                row.appendChild(dot);
                var txt = document.createTextNode(item.name + ': ' + (item.found ? 'OK' : 'FEHLT'));
                row.appendChild(txt);
                statusContent.appendChild(row);
            });
        }
        updateStatus();
        statusSec.appendChild(statusContent);
        el.appendChild(statusSec);

        var info = document.createElement('div');
        info.style.cssText = 'border-radius:8px;padding:14px;margin-bottom:12px;font-size:13px;line-height:1.5;';
        function updateInfoBox() {
            info.innerHTML = '';
            if (s.appId && s.appId.length > 10) {
                info.style.background = 'rgba(59,165,93,0.1)';
                info.style.border = '1px solid #3ba55d';
                var ok = document.createElement('b');
                ok.style.color = '#3ba55d';
                ok.textContent = 'BEREIT';
                info.appendChild(ok);
                info.appendChild(document.createElement('br'));
                info.appendChild(document.createTextNode('Application ID gesetzt. Status wird fuer andere sichtbar sein.'));
                info.appendChild(document.createElement('br'));
                info.appendChild(document.createTextNode('Aktivitaetsstatus muss in Discord AN sein.'));
            } else {
                info.style.background = 'rgba(237,66,69,0.1)';
                info.style.border = '1px solid #ed4245';
                var warn = document.createElement('b');
                warn.style.color = '#ed4245';
                warn.textContent = 'APPLICATION ID FEHLT';
                info.appendChild(warn);
                info.appendChild(document.createElement('br'));
                info.appendChild(document.createTextNode('Ohne ID sehen andere deinen Status nicht.'));
                info.appendChild(document.createElement('br'));
                info.appendChild(document.createTextNode('discord.com/developers/applications > New Application'));
            }
        }
        updateInfoBox();
        el.appendChild(info);

        var typeSec = makeSec();
        typeSec.appendChild(makeLbl('STATUSTYP'));
        var typeRow = document.createElement('div');
        typeRow.style.cssText = 'display:flex;flex-wrap:wrap;';
        function renderTypes() {
            typeRow.innerHTML = '';
            TYPES.forEach(function(t) {
                typeRow.appendChild(makeBtn(t.l, s.statusType === t.t, function() {
                    s.statusType = t.t;
                    renderTypes();
                    streamSec.style.display = t.t === 1 ? '' : 'none';
                }));
            });
        }
        renderTypes();
        typeSec.appendChild(typeRow);
        el.appendChild(typeSec);

        var streamSec = makeSec();
        streamSec.appendChild(makeLbl('STREAM-URL'));
        streamSec.appendChild(makeInput(s.streamUrl, 'https://twitch.tv/deinkanal', function(v) { s.streamUrl = v; }));
        streamSec.style.display = s.statusType === 1 ? '' : 'none';
        el.appendChild(streamSec);

        var nameSec = makeSec();
        nameSec.appendChild(makeLbl('SPIELNAME (ZEILE 1)'));
        nameSec.appendChild(makeInput(s.gameName, 'GhostClient', function(v) { s.gameName = v; }));
        el.appendChild(nameSec);

        var linesSec = makeSec();
        linesSec.appendChild(makeLbl('ZUSAETZLICHE ZEILEN'));
        var linesInfo = document.createElement('div');
        linesInfo.style.cssText = 'font-size:12px;color:var(--text-muted);margin-bottom:10px;';
        linesInfo.textContent = 'Discord zeigt max. 3 Zeilen: Name + 2 Zusatzzeilen.';
        linesSec.appendChild(linesInfo);
        var linesList = document.createElement('div');
        function renderLines() {
            linesList.innerHTML = '';
            s.lines.forEach(function(line, i) {
                var row = document.createElement('div');
                row.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;align-items:center;';
                var num = document.createElement('span');
                num.style.cssText = 'font-size:12px;color:var(--text-muted);min-width:50px;';
                num.textContent = 'Zeile ' + (i + 2);
                row.appendChild(num);
                var inp = makeInput(line, i === 0 ? 'z.B. Im Hauptmenue' : 'z.B. Level 42', function(v) { s.lines[i] = v; });
                inp.style.flex = '1';
                inp.style.marginBottom = '0';
                row.appendChild(inp);
                var delBtn = document.createElement('button');
                delBtn.style.cssText = 'padding:6px 10px;border-radius:6px;border:none;cursor:pointer;font-weight:600;font-size:16px;background:transparent;color:#ed4245;';
                delBtn.textContent = 'X';
                delBtn.onclick = function() { s.lines.splice(i, 1); renderLines(); };
                row.appendChild(delBtn);
                linesList.appendChild(row);
            });
            if (s.lines.length < 2) {
                var addBtn = document.createElement('button');
                addBtn.style.cssText = 'padding:8px 14px;border-radius:6px;border:none;cursor:pointer;font-weight:600;font-size:13px;background:var(--background-modifier-hover,#3f4147);color:var(--text-normal);width:100%;margin-top:4px;';
                addBtn.textContent = '+ Zeile hinzufuegen';
                addBtn.onclick = function() { s.lines.push(''); renderLines(); };
                linesList.appendChild(addBtn);
            }
        }
        renderLines();
        linesSec.appendChild(linesList);
        el.appendChild(linesSec);

        var timeSec = makeSec();
        timeSec.appendChild(makeLbl('ZEIT'));
        var timeRow = document.createElement('div');
        timeRow.style.cssText = 'display:flex;flex-wrap:wrap;margin-bottom:10px;';
        var timeCustom = document.createElement('div');
        timeCustom.style.cssText = 'display:flex;gap:10px;';
        timeCustom.style.display = s.timeMode === 'custom' ? 'flex' : 'none';
        function renderTimeMode() {
            timeRow.innerHTML = '';
            timeRow.appendChild(makeBtn('Echte Zeit', s.timeMode === 'real', function() { s.timeMode = 'real'; timeCustom.style.display = 'none'; renderTimeMode(); }));
            timeRow.appendChild(makeBtn('Benutzerdefiniert', s.timeMode === 'custom', function() { s.timeMode = 'custom'; timeCustom.style.display = 'flex'; renderTimeMode(); }));
        }
        renderTimeMode();
        timeSec.appendChild(timeRow);
        var hWrap = document.createElement('div');
        hWrap.style.cssText = 'flex:1;';
        var hLbl = document.createElement('div');
        hLbl.style.cssText = 'font-size:12px;color:var(--text-muted);margin-bottom:4px;';
        hLbl.textContent = 'Stunden';
        hWrap.appendChild(hLbl);
        var hInp = document.createElement('input');
        hInp.type = 'number'; hInp.min = '0'; hInp.max = '999'; hInp.value = s.customHours || 0;
        hInp.style.cssText = 'width:100%;background:var(--input-background,#1e1f22);border:1px solid var(--input-border,#3f4147);border-radius:4px;color:var(--text-normal);font-size:14px;padding:8px 10px;outline:none;box-sizing:border-box;';
        hInp.oninput = function() { s.customHours = parseInt(hInp.value, 10) || 0; };
        hWrap.appendChild(hInp);
        timeCustom.appendChild(hWrap);
        var mWrap = document.createElement('div');
        mWrap.style.cssText = 'flex:1;';
        var mLbl = document.createElement('div');
        mLbl.style.cssText = 'font-size:12px;color:var(--text-muted);margin-bottom:4px;';
        mLbl.textContent = 'Minuten';
        mWrap.appendChild(mLbl);
        var mInp = document.createElement('input');
        mInp.type = 'number'; mInp.min = '0'; mInp.max = '59'; mInp.value = s.customMinutes || 0;
        mInp.style.cssText = 'width:100%;background:var(--input-background,#1e1f22);border:1px solid var(--input-border,#3f4147);border-radius:4px;color:var(--text-normal);font-size:14px;padding:8px 10px;outline:none;box-sizing:border-box;';
        mInp.oninput = function() { s.customMinutes = parseInt(mInp.value, 10) || 0; };
        mWrap.appendChild(mInp);
        timeCustom.appendChild(mWrap);
        timeSec.appendChild(timeCustom);
        el.appendChild(timeSec);

        var appSec = makeSec();
        function updateAppSec() {
            appSec.style.border = (s.appId && s.appId.length > 10) ? '2px solid #3ba55d' : '2px solid #ed4245';
        }
        updateAppSec();
        appSec.appendChild(makeLbl('APPLICATION ID'));
        appSec.appendChild(makeInput(s.appId, 'Anwendungs-ID von discord.com/developers', function(v) { s.appId = v; updateInfoBox(); updateAppSec(); updateStatus(); }));
        var appHelp = document.createElement('div');
        appHelp.style.cssText = 'font-size:12px;color:var(--text-muted);line-height:1.5;margin-top:4px;';
        appHelp.appendChild(document.createTextNode('discord.com/developers/applications > New Application > Anwendungs-ID kopieren.'));
        appSec.appendChild(appHelp);
        el.appendChild(appSec);

        var btnSec = makeSec();
        btnSec.appendChild(makeLbl('BUTTONS (BIS ZU 5)'));
        var btnInfo = document.createElement('div');
        btnInfo.style.cssText = 'font-size:12px;color:var(--text-muted);margin-bottom:10px;';
        btnInfo.textContent = 'Discord zeigt max. 2 Buttons. Braucht Application ID.';
        btnSec.appendChild(btnInfo);
        var btnList = document.createElement('div');
        if (!s.buttons) s.buttons = [];
        function renderButtons() {
            btnList.innerHTML = '';
            s.buttons.forEach(function(b, i) {
                var row = document.createElement('div');
                row.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;align-items:center;';
                var num = document.createElement('span');
                num.style.cssText = 'font-size:12px;color:var(--text-muted);min-width:20px;';
                num.textContent = (i + 1) + '.';
                row.appendChild(num);
                row.appendChild(makeInput(b.label, 'Button-Name', function(v) { s.buttons[i].label = v; }));
                row.appendChild(makeInput(b.url, 'https://...', function(v) { s.buttons[i].url = v; }));
                var delBtn = document.createElement('button');
                delBtn.style.cssText = 'padding:6px 10px;border-radius:6px;border:none;cursor:pointer;font-weight:600;font-size:16px;background:transparent;color:#ed4245;';
                delBtn.textContent = 'X';
                delBtn.onclick = function() { s.buttons.splice(i, 1); renderButtons(); };
                row.appendChild(delBtn);
                btnList.appendChild(row);
            });
            if (s.buttons.length < 5) {
                var addBtn = document.createElement('button');
                addBtn.style.cssText = 'padding:8px 14px;border-radius:6px;border:none;cursor:pointer;font-weight:600;font-size:13px;background:var(--background-modifier-hover,#3f4147);color:var(--text-normal);width:100%;margin-top:4px;';
                addBtn.textContent = '+ Button hinzufuegen';
                addBtn.onclick = function() { s.buttons.push({ label: '', url: '' }); renderButtons(); };
                btnList.appendChild(addBtn);
            }
        }
        renderButtons();
        btnSec.appendChild(btnList);
        el.appendChild(btnSec);

        var actRow = document.createElement('div');
        actRow.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;';
        var saveBtn = document.createElement('button');
        saveBtn.style.cssText = 'flex:1;padding:13px;border:none;border-radius:6px;font-size:14px;font-weight:700;color:#fff;background:linear-gradient(135deg,#3ba55d,#2d8b4e);cursor:pointer;';
        saveBtn.textContent = 'Status aktivieren';
        saveBtn.onclick = function() {
            self._save(s);
            self._startTime = Date.now();
            self._log = [];
            self._mods = self._findModules();
            self._apply(s);
            updateStatus();
            updateLogOutput();
            if (!s.appId) {
                BdApi.UI.showToast('Nur lokal! Setze eine Application ID.', { type: 'warning' });
            } else {
                BdApi.UI.showToast('Status aktiviert!', { type: 'success' });
            }
        };
        actRow.appendChild(saveBtn);
        var stopBtn = document.createElement('button');
        stopBtn.style.cssText = 'padding:13px 20px;border:none;border-radius:6px;font-size:14px;font-weight:700;color:#fff;background:#ed4245;cursor:pointer;';
        stopBtn.textContent = 'Stoppen';
        stopBtn.onclick = function() {
            self._clear();
            BdApi.UI.showToast('Status gestoppt.', { type: 'info' });
        };
        actRow.appendChild(stopBtn);
        el.appendChild(actRow);

        var diagBtn = document.createElement('button');
        diagBtn.style.cssText = 'width:100%;padding:10px;border:1px solid var(--background-modifier-hover,#3f4147);border-radius:6px;font-size:13px;font-weight:600;color:var(--text-muted);background:transparent;cursor:pointer;margin-bottom:8px;';
        diagBtn.textContent = 'Diagnose ausfuehren';
        diagBtn.onclick = function() {
            self._log = [];
            self._mods = self._findModules();
            self._apply(self._load());
            updateStatus();
            updateLogOutput();
        };
        el.appendChild(diagBtn);

        var logSec = makeSec();
        logSec.appendChild(makeLbl('LOG (LETZTE AKTIONEN)'));
        var logOutput = document.createElement('pre');
        logOutput.style.cssText = 'background:var(--background-tertiary,#1e1f22);padding:10px;border-radius:6px;font-size:11px;color:var(--text-normal);white-space:pre-wrap;margin:0;font-family:Consolas,monospace;max-height:300px;overflow-y:auto;';
        function updateLogOutput() {
            var nl = String.fromCharCode(10);
            logOutput.textContent = self._log.length > 0 ? self._log.join(nl) : 'Noch keine Aktionen. Klick "Diagnose" oder "Status aktivieren".';
        }
        updateLogOutput();
        logSec.appendChild(logOutput);
        el.appendChild(logSec);

        return el;
    }
}

module.exports = GhostGameStatus;
`
    }
];
