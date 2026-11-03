import Link from "next/link";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = Omit<React.ComponentProps<typeof Button>, "variant"> & {
  href?: string;
  icon?: React.ReactNode;
};

/**
 * PrimaryButton — de enige primaire (gele) actie van een schermgedeelte.
 * Met `href` wordt het een link die er als knop uitziet.
 */
export function PrimaryButton({ href, icon, children, className, size = "default", ...props }: Props) {
  const content = (
    <>
      {icon}
      {children}
    </>
  );
  if (href) {
    return (
      <Button asChild size={size} className={cn(className)} {...props}>
        <Link href={href}>{content}</Link>
      </Button>
    );
  }
  return (
    <Button size={size} className={cn(className)} {...props}>
      {content}
    </Button>
  );
}
