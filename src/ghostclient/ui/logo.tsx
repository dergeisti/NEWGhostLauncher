import React from "@modules/react";
import {lucideToDiscordIcon} from "@utils/icon";
import clsx from "clsx";
import type {LucideProps} from "lucide-react";

// @ts-ignore — PNG handled by esbuild dataurl loader
import ghostLogoUrl from "./ghost-logo.png";

type Props = Omit<LucideProps, "ref"> & React.RefAttributes<HTMLImageElement> & {accent?: boolean; secondaryColor?: React.CSSProperties["color"];};
type PsuedoLucideIcon = React.ForwardRefExoticComponent<Props>;

const BDLogo = ((props: Props) => {
    const size = typeof props.size === "number" ? props.size : 24;
    return React.createElement("img", {
        src: ghostLogoUrl,
        width: size,
        height: size,
        className: clsx("lucide-ghostclient", props.className),
        style: {display: "inline-block", verticalAlign: "middle"}
    });
}) as PsuedoLucideIcon;

export const Logo = Object.assign(BDLogo, {
    Discord: lucideToDiscordIcon(BDLogo as any),
    DiscordAccented: lucideToDiscordIcon(BDLogo as any, (m) => ({...m, accent: true}))
});
