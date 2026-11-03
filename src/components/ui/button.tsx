import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent font-semibold whitespace-nowrap transition-colors outline-none select-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-km-green disabled:pointer-events-none disabled:opacity-60 aria-disabled:pointer-events-none aria-disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        // Primaire actie: warm geel met donkergroene tekst (contrast 5.7:1)
        default: "bg-km-yellow text-km-green hover:bg-km-yellow-hover",
        // Secundaire actie: donkergroene rand
        outline: "border-km-green bg-white text-km-green hover:bg-km-softgreen",
        secondary: "bg-km-softgreen text-km-green hover:bg-[#d7e0d1]",
        ghost: "text-km-green hover:bg-km-softgreen",
        destructive: "bg-km-danger text-white hover:bg-[#931f18]",
        link: "h-auto min-h-0 px-0 text-km-green underline underline-offset-4 hover:no-underline",
      },
      size: {
        default: "min-h-11 px-5 py-2 text-base",
        sm: "min-h-11 px-3 py-1.5 text-sm",
        lg: "min-h-12 px-6 py-3 text-lg",
        icon: "size-11",
        "icon-sm": "size-11 [&_svg:not([class*='size-'])]:size-4",
        xs: "min-h-11 px-2 text-sm",
        "icon-xs": "size-11",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
