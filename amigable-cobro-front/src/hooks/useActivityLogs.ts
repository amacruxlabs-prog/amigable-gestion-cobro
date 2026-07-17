import { useState, useCallback } from 'react';
import { api } from '../lib/axios';
import { ActivityLog, ActivityLogFilters } from '../types';

export const useActivityLogs = (endpoint: '/tenant/activity-logs' | '/superadmin/activity-logs' = '/tenant/activity-logs') => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<ActivityLogFilters>({});

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, per_page: 50 };
      if (filters.action_type) params.action_type = filters.action_type;
      if (filters.user_id) params.user_id = filters.user_id;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      if (filters.auditable_type) params.auditable_type = filters.auditable_type;

      const response = await api.get(endpoint, { params });
      const data = response.data.data;

      setLogs(data.data || []);
      setCurrentPage(data.current_page || 1);
      setTotalPages(data.last_page || 1);
      setTotal(data.total || 0);
    } catch (err: any) {
      console.error('Error loading activity logs:', err);
    } finally {
      setLoading(false);
    }
  }, [endpoint, filters]);

  const applyFilters = useCallback((newFilters: ActivityLogFilters) => {
    setFilters(newFilters);
    fetchLogs(1);
  }, [fetchLogs]);

  return {
    logs,
    loading,
    currentPage,
    totalPages,
    total,
    filters,
    setFilters: applyFilters,
    fetchLogs,
    setCurrentPage: (page: number) => fetchLogs(page),
  };
};
