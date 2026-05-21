interface ScreenFrameProps {
  breadcrumb?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export default function ScreenFrame({
  breadcrumb,
  actions,
  children,
}: ScreenFrameProps) {
  return (
    <div className="sf">
      {breadcrumb && (
        <div className="tb">
          <div className="flex items-center gap-1 text-[12px] text-tx3">
            <span>{breadcrumb}</span>
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      <div className="cnt">{children}</div>
    </div>
  );
}
