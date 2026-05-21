interface SectionHeaderProps {
  title: React.ReactNode;
  description?: string;
}

export default function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div className="section-header">
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
  );
}
