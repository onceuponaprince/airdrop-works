import {
  Press_Start_2P,
  Space_Grotesk,
  DM_Sans,
  JetBrains_Mono,
} from "next/font/google"

export const displayFont = Press_Start_2P({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
})

export const headingFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-heading",
  display: "swap",
})

export const bodyFont = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
})

export const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
})

export const fontVariables = [
  displayFont.variable,
  headingFont.variable,
  bodyFont.variable,
  monoFont.variable,
].join(" ")
