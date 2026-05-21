interface TimelineItem {
  title: string;
  time: string;
  color: string;
}

interface TimelineProps {
  items: TimelineItem[];
}

export default function Timeline({ items }: TimelineProps) {
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} className="flex gap-[10px] pb-[12px] last:pb-0">
          <div className="flex flex-col items-center">
            <div
              className="w-[8px] h-[8px] rounded-full shrink-0 mt-[3px]"
              style={{ background: item.color }}
            />
            {i < items.length - 1 && (
              <div className="w-[1px] flex-1 bg-b1 mt-[3px]" />
            )}
          </div>
          <div>
            <div className="text-[12px] font-medium" style={{ color: item.color || "var(--tx)" }}>
              {item.title}
            </div>
            <div className="text-[10px] text-tx3 mt-[1px]">{item.time}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
