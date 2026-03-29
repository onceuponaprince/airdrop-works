import {
  GraduationCap,
  Code2,
  Palette,
  Search,
  Users,
  type LucideProps,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Branch } from "@/lib/constants"

interface BranchIconProps extends LucideProps {
  branch: Branch
  showLabel?: boolean
  labelClassName?: string
}

const branchConfig: Record<
  Branch,
  { Icon: React.FC<LucideProps>; label: string; colorClass: string }
> = {
  educator: { Icon: GraduationCap, label: "Educator", colorClass: "text-[#10B981]" },
  builder:  { Icon: Code2,         label: "Builder",  colorClass: "text-[#3B82F6]" },
  creator:  { Icon: Palette,       label: "Creator",  colorClass: "text-[#EC4899]" },
  scout:    { Icon: Search,         label: "Scout",    colorClass: "text-[#06B6D4]" },
  diplomat: { Icon: Users,         label: "Diplomat", colorClass: "text-[#F59E0B]" },
}

export function BranchIcon({
  branch,
  showLabel = false,
  labelClassName,
  className,
  size = 20,
  ...props
}: BranchIconProps) {
  const { Icon, label, colorClass } = branchConfig[branch]

  if (showLabel) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Icon
          size={size}
          className={cn(colorClass, className)}
          {...props}
        />
        <span className={cn("font-mono text-xs uppercase tracking-wider", colorClass, labelClassName)}>
          {label}
        </span>
      </span>
    )
  }

  return (
    <Icon
      size={size}
      className={cn(colorClass, className)}
      {...props}
    />
  )
}
