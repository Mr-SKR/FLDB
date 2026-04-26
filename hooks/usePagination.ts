import { useState, useCallback, useMemo } from "react";

export const usePagination = <T>(items: T[], pageSize: number) => {
  const [currentPage, setCurrentPage] = useState(0);

  const totalPages = useMemo(() => Math.ceil(items.length / pageSize), [items.length, pageSize]);

  const currentPageItems = useMemo(() => {
    const start = currentPage * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  const hasNextPage = (currentPage + 1) * pageSize < items.length;
  const hasPrevPage = currentPage > 0;

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage((prev) => prev + 1);
      window.scrollTo(0, 0);
    }
  }, [hasNextPage]);

  const prevPage = useCallback(() => {
    if (hasPrevPage) {
      setCurrentPage((prev) => prev - 1);
      window.scrollTo(0, 0);
    }
  }, [hasPrevPage]);

  const resetPagination = useCallback(() => {
    setCurrentPage(0);
  }, []);

  return {
    currentPage,
    currentPageItems,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
    resetPagination,
  };
};
