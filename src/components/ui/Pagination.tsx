"use client";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  page,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}: PaginationProps) {
  if (totalItems === 0) {
    return (
      <div className="flex justify-between items-center text-[11px] text-tx3" style={{ paddingTop: "24px" }}>
        <span>0 results</span>
      </div>
    );
  }

  const start = (page - 1) * itemsPerPage + 1;
  const end = Math.min(page * itemsPerPage, totalItems);

  // Build page number list with ellipsis
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex justify-between items-center text-[11px] text-tx3" style={{ paddingTop: "24px" }}>
      <span>{start}–{end} of {totalItems}</span>
      <div className="flex gap-1">
        <button
          className="btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          ‹ Prev
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="btn" style={{ cursor: "default", opacity: 0.4 }}>…</span>
          ) : (
            <button
              key={p}
              className={`btn ${page === p ? "btn-primary" : ""}`}
              style={{ padding: "5px 10px" }}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          )
        )}
        <button
          className="btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next ›
        </button>
      </div>
    </div>
  );
}
