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
    }
];
