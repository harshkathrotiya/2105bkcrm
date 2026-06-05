interface BadgeProps {
  variant: "gr" | "am" | "bl" | "rd" | "gy" | "pu";
  children: React.ReactNode;
}

const variantClass: Record<BadgeProps["variant"], string> = {
  gr: "bdg-gr",
  am: "bdg-am",
  bl: "bdg-bl",
  rd: "bdg-rd",
  gy: "bdg-gy",
  pu: "bdg-pu",
};

export default function Badge({ variant, children }: BadgeProps) {
  return (
    <span className={`badge ${variantClass[variant]}`}>
      {children}
    </span>
  );
}
