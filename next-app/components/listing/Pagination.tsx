interface PaginationProps {
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

const getVisiblePages = (current: number, total: number): number[] => {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const pages = new Set<number>([1, total, current - 1, current, current + 1]);
  return Array.from(pages)
    .filter((value) => value >= 1 && value <= total)
    .sort((a, b) => a - b);
};

export default function Pagination({
  page,
  pages,
  onPageChange,
  disabled = false,
}: PaginationProps) {
  if (pages <= 1) return null;

  const visiblePages = getVisiblePages(page, pages);

  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={disabled || page <= 1}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Previous
      </button>

      {visiblePages.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onPageChange(value)}
          disabled={disabled}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
            value === page
              ? "bg-emerald-600 text-white"
              : "border border-slate-300 text-slate-700 hover:bg-slate-50"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {value}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onPageChange(Math.min(pages, page + 1))}
        disabled={disabled || page >= pages}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </nav>
  );
}
