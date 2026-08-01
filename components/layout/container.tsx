import * as React from "react"

import { cn } from "@/lib/utils"

const CONTAINER_SIZES = {
  "7xl": "max-w-7xl",
  "5xl": "max-w-5xl",
  "3xl": "max-w-3xl",
} as const

function Container({
  className,
  size = "7xl",
  as: Tag = "div",
  ...props
}: React.ComponentProps<"div"> & {
  size?: keyof typeof CONTAINER_SIZES
  as?: React.ElementType
}) {
  return (
    <Tag
      data-slot="container"
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        CONTAINER_SIZES[size],
        className
      )}
      {...props}
    />
  )
}

export { Container }
