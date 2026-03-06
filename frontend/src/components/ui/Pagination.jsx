import { MdChevronLeft, MdChevronRight } from 'react-icons/md';

const Pagination = ({ currentPage, lastPage, total, from, to, onPageChange }) => {
  if (lastPage <= 1) return null;

  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(lastPage, start + maxVisible - 1);

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div className="flex flex-col items-center justify-between gap-3 px-4 py-3 sm:flex-row">
      <p className="text-sm text-gray-600">
        Showing <span className="font-medium">{from}</span> to{' '}
        <span className="font-medium">{to}</span> of{' '}
        <span className="font-medium">{total}</span> results
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <MdChevronLeft className="w-5 h-5" />
        </button>
        {start > 1 && (
          <>
            <button onClick={() => onPageChange(1)} className="px-3 py-1 text-sm rounded-lg hover:bg-gray-100">
              1
            </button>
            {start > 2 && <span className="px-1 text-gray-400">...</span>}
          </>
        )}
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3 py-1 text-sm rounded-lg ${
              page === currentPage
                ? 'bg-blue-600 text-white font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {page}
          </button>
        ))}
        {end < lastPage && (
          <>
            {end < lastPage - 1 && <span className="px-1 text-gray-400">...</span>}
            <button onClick={() => onPageChange(lastPage)} className="px-3 py-1 text-sm rounded-lg hover:bg-gray-100">
              {lastPage}
            </button>
          </>
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === lastPage}
          className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <MdChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
