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
    <span className={`inline-block text-[10px] px-[8px] py-[2px] rounded-full font-medium ${variantClass[variant]}`}>
      {children}
    </span>
  );
}
