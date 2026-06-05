"use client";

import { useState, useCallback, useMemo } from "react";

interface UseAdminPaginationOptions {
  itemsPerPage: number;
  initialPage?: number;
}

interface UseAdminPaginationReturn {
  page: number;
  totalPages: number;
  total: number;
  itemsPerPage: number;
  setPage: (page: number) => void;
  setTotal: (total: number) => void;
  updateFromResponse: (total: number, limit?: number) => void;
  paginationProps: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
  };
  reset: () => void;
}

export function useAdminPagination({
  itemsPerPage,
  initialPage = 1,
}: UseAdminPaginationOptions): UseAdminPaginationReturn {
  const [page, setPage] = useState(initialPage);
  const [total, setTotal] = useState(0);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / itemsPerPage)),
    [total, itemsPerPage]
  );

  const updateFromResponse = useCallback((responseTotal: number, limit?: number) => {
    setTotal(responseTotal);
    const effectiveLimit = limit ?? itemsPerPage;
    const newTotalPages = Math.max(1, Math.ceil(responseTotal / effectiveLimit));
    // If current page is beyond new total, reset to page 1
    setPage((prev) => (prev > newTotalPages ? 1 : prev));
  }, [itemsPerPage]);

  const reset = useCallback(() => {
    setPage(1);
    setTotal(0);
  }, []);

  const paginationProps = useMemo(
    () => ({
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage,
      onPageChange: setPage,
    }),
    [page, totalPages, total, itemsPerPage]
  );

  return {
    page,
    totalPages,
    total,
    itemsPerPage,
    setPage,
    setTotal,
    updateFromResponse,
    paginationProps,
    reset,
  };
}
