interface BadgeProps {
  variant: "gr" | "am" | "bl" | "rd" | "gy";
  children: React.ReactNode;
}

const variantClass: Record<BadgeProps["variant"], string> = {
  gr: "bdg-gr",
  am: "bdg-am",
  bl: "bdg-bl",
  rd: "bdg-rd",
  gy: "bdg-gy",
};

export default function Badge({ variant, children }: BadgeProps) {
  return (
    <span className={`badge ${variantClass[variant]}`}>
      {children}
    </span>
  );
}
