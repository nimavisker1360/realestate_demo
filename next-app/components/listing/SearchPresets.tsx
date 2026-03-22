import type { ComponentProps } from "react";
import AdvancedSearchBar from "./AdvancedSearchBar";

type BaseProps = Omit<ComponentProps<typeof AdvancedSearchBar>, "variant">;

export function MainPropertySearch(props: BaseProps) {
  return <AdvancedSearchBar {...props} variant="default" />;
}

export function HeroPropertySearch(props: BaseProps) {
  return <AdvancedSearchBar {...props} variant="hero" />;
}

export function InternationalPropertySearch(props: BaseProps) {
  return <AdvancedSearchBar {...props} variant="international" />;
}
