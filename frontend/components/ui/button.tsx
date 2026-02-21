import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2, LucideProps } from 'lucide-react';

import { cn } from "lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "components/ui/tooltip";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,box-shadow] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 ring-ring/10 dark:ring-ring/20 dark:outline-ring/40 outline-ring/50 focus-visible:ring-4 focus-visible:outline-1 aria-invalid:focus-visible:ring-0 hover:cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        success:
          "bg-success text-success-foreground shadow-xs hover:bg-success/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-7",
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
  variant,
  size,
  Icon,
  hoverText,
  loading: loadingProp,
  disableLoading = false,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    Icon?: React.ComponentType<LucideProps>;
    hoverText?: string;
    loading?: boolean;
    disableLoading?: boolean;
    asChild?: boolean;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>; // override type of onClick to return a promise
  }) {
  const Comp = asChild ? Slot : "button"

  const [loading, setLoading] = React.useState(false);
  const isLoading = loadingProp ?? loading; // use the loading prop if it is provided, otherwise use the loading state

  const { onClick } = props;
  if (onClick) {
    props.onClick = async (e) => {
      setLoading(true);
      await onClick(e);
      setLoading(false);
    }
  }

  const loader = <Loader2 size={15} className="animate-spin" />;
  const { children } = props;
  props.children = (
    <>
      { (isLoading && !disableLoading) && loader }
      { (Icon && (!isLoading || disableLoading)) && <Icon size={15} /> }
      { children }
    </>
  );

  if (props.disabled === undefined) {
    props.disabled = isLoading && !disableLoading;
  }

  const button = (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )

  if (!hoverText) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent
        side="top"
        align="center"
      >
        {hoverText}
      </TooltipContent>
    </Tooltip>
  )
}

export { Button, buttonVariants }