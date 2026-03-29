"use client"

import { motion, type Variants } from "framer-motion"
import { cn } from "@/lib/utils"
import { staggerContainer, staggerItem, scrollReveal } from "@/styles/theme"

interface AnimatedSectionProps {
  children: React.ReactNode
  className?: string
  /** Use stagger container behaviour (children stagger in) */
  stagger?: boolean
  /** Delay before animation starts (seconds) */
  delay?: number
}

export function AnimatedSection({
  children,
  className,
  stagger = false,
  delay = 0,
}: AnimatedSectionProps) {
  const variants: Variants = stagger
    ? (staggerContainer as Variants)
    : ({
        initial: scrollReveal.initial,
        animate: {
          ...scrollReveal.whileInView,
          transition: { ...scrollReveal.transition, delay },
        },
      } as Variants)

  return (
    <motion.section
      className={cn(className)}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, margin: "-80px" }}
      variants={variants}
    >
      {children}
    </motion.section>
  )
}

/** Stagger child — use inside AnimatedSection with stagger=true */
export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div variants={staggerItem as Variants} className={className}>
      {children}
    </motion.div>
  )
}
