export const BUNDLED_THEMES: {filename: string; content: string;}[] = [
    {
        filename: "GhostDark.theme.css",
        content: `/**
 * @name GhostDark
 * @author GhostClient
 * @description A sleek, ultra-dark minimal theme for Discord. Reduces visual noise and adds a subtle purple accent.
 * @version 1.0.0
 * @source https://github.com/ghostclient
 */

:root {
    --gc-bg-primary: #0e0e10;
    --gc-bg-secondary: #131316;
    --gc-bg-tertiary: #09090b;
    --gc-bg-accent: #1a1a1f;
    --gc-accent: #7c3aed;
    --gc-accent-hover: #6d28d9;
    --gc-text-primary: #e4e4e7;
    --gc-text-muted: #71717a;
    --gc-border: rgba(255,255,255,0.06);
}

/* Main backgrounds */
[class*="bg-primary-alt"],
[class*="app-"] > [class*="bg-"],
[class*="guilds-"] {
    background-color: var(--gc-bg-tertiary) !important;
}

[class*="sidebar"],
[class*="channelTextArea"] {
    background-color: var(--gc-bg-secondary) !important;
}

[class*="chat"],
[class*="content"],
[class*="messagesWrapper"] {
    background-color: var(--gc-bg-primary) !important;
}

/* Member list, user panel */
[class*="members"],
[class*="panels"],
[class*="userPanelOuter"] {
    background-color: var(--gc-bg-secondary) !important;
}

/* Messages */
[class*="message-"]:hover,
[class*="messageListItem"]:hover {
    background-color: rgba(255,255,255,0.025) !important;
}

/* Input area */
[class*="textArea"],
[class*="scrollableContainer"] {
    background-color: var(--gc-bg-accent) !important;
}

/* Buttons */
[class*="colorBrand"] {
    background-color: var(--gc-accent) !important;
}
[class*="colorBrand"]:hover {
    background-color: var(--gc-accent-hover) !important;
}

/* Scrollbar */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
    background: var(--gc-accent);
    border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
    background: var(--gc-accent-hover);
}`
    },
    {
        filename: "GhostNeon.theme.css",
        content: `/**
 * @name GhostNeon
 * @author GhostClient
 * @description A vibrant neon-purple cyberpunk theme for Discord with glowing accents and deep dark backgrounds.
 * @version 1.0.0
 * @source https://github.com/ghostclient
 */

:root {
    --neon-purple: #b347ea;
    --neon-blue: #4d9df7;
    --neon-pink: #f04e9e;
    --dark-base: #05050a;
    --dark-mid: #0a0a12;
    --dark-light: #10101a;
    --dark-accent: #15152a;
    --glow-purple: 0 0 12px rgba(179,71,234,0.6), 0 0 24px rgba(179,71,234,0.3);
    --glow-blue: 0 0 12px rgba(77,157,247,0.4);
}

/* Background layers */
[class*="app-"],
[class*="bg-primary-alt"] {
    background-color: var(--dark-base) !important;
}

[class*="sidebar"],
[class*="guilds-"] {
    background-color: var(--dark-mid) !important;
    border-right: 1px solid rgba(179,71,234,0.15) !important;
}

[class*="chat"],
[class*="content"],
[class*="messagesWrapper"] {
    background-color: var(--dark-base) !important;
}

[class*="members"],
[class*="panels"] {
    background-color: var(--dark-mid) !important;
}

/* Neon accent buttons */
[class*="colorBrand"] {
    background: linear-gradient(135deg, var(--neon-purple), var(--neon-blue)) !important;
    box-shadow: var(--glow-purple);
    border: none;
}

/* Channel hover glow */
[class*="channel"]:hover [class*="name"],
[class*="channel-"]:hover {
    color: var(--neon-purple) !important;
}

/* Active channel */
[class*="modeSelected"] {
    background: rgba(179,71,234,0.15) !important;
    border-left: 3px solid var(--neon-purple) !important;
}

/* Message hover */
[class*="message-"]:hover,
[class*="messageListItem"]:hover {
    background: rgba(179,71,234,0.04) !important;
}

/* Input */
[class*="textArea"],
[class*="scrollableContainer"] {
    background-color: var(--dark-accent) !important;
    border: 1px solid rgba(179,71,234,0.2) !important;
}

/* Mentions */
[class*="mentioned"] {
    background: rgba(179,71,234,0.08) !important;
    border-left: 3px solid var(--neon-purple) !important;
    box-shadow: inset 0 0 20px rgba(179,71,234,0.05);
}

/* Scrollbar */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
    background: var(--neon-purple);
    border-radius: 4px;
    box-shadow: var(--glow-purple);
}

/* Server icon glow on hover */
[class*="listItem"]:hover [class*="wrapper"] {
    box-shadow: var(--glow-purple) !important;
    border-radius: 16px;
}`
    },
    {
        filename: "GhostMidnight.theme.css",
        content: `/**
 * @name GhostMidnight
 * @author GhostClient
 * @description A calm, midnight-blue dark theme with subtle blue accents. Easy on the eyes for long sessions.
 * @version 1.0.0
 * @source https://github.com/ghostclient
 */

:root {
    --midnight-bg: #0a0d14;
    --midnight-mid: #0d1018;
    --midnight-light: #111520;
    --midnight-accent: #161b28;
    --midnight-blue: #3b82f6;
    --midnight-blue-dark: #2563eb;
    --midnight-blue-muted: rgba(59,130,246,0.15);
    --midnight-border: rgba(59,130,246,0.1);
    --midnight-text: #cbd5e1;
}

[class*="app-"],
[class*="bg-primary-alt"] {
    background-color: var(--midnight-bg) !important;
}

[class*="sidebar"],
[class*="guilds-"],
[class*="panels"],
[class*="members"] {
    background-color: var(--midnight-mid) !important;
}

[class*="chat"],
[class*="content"],
[class*="messagesWrapper"] {
    background-color: var(--midnight-bg) !important;
}

/* Accent button */
[class*="colorBrand"] {
    background-color: var(--midnight-blue) !important;
}
[class*="colorBrand"]:hover {
    background-color: var(--midnight-blue-dark) !important;
}

/* Active channel */
[class*="modeSelected"],
[class*="selected"] {
    background: var(--midnight-blue-muted) !important;
}

/* Input */
[class*="textArea"],
[class*="scrollableContainer"] {
    background: var(--midnight-accent) !important;
    border: 1px solid var(--midnight-border) !important;
}

/* Message hover */
[class*="message-"]:hover {
    background: rgba(59,130,246,0.04) !important;
}

/* Mentions */
[class*="mentioned"] {
    background: rgba(59,130,246,0.1) !important;
    border-left: 3px solid var(--midnight-blue) !important;
}

/* Scrollbar */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
    background: var(--midnight-blue);
    border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
    background: var(--midnight-blue-dark);
}`
    }
];
