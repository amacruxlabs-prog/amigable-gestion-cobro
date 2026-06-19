import { useState, useCallback } from 'react';
import { api } from '../lib/axios';

export interface UserMember {
  id: string;
  email: string;
  name: string;
  roles: { name: string }[];
  status: string;
  created_at: string;
  avatarColor?: string;
}

export const useUsers = () => {
  const [users, setUsers] = useState<UserMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/tenant/users');
      const colors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
      const data = response.data.data.map((u: any, idx: number) => ({
        ...u,
        id: u.id.toString(),
        avatarColor: colors[idx % colors.length]
      }));
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Error loading users');
    } finally {
      setLoading(false);
    }
  }, []);

  const createUser = async (payload: { name: string, email: string, password: string, role: string }) => {
    const response = await api.post('/tenant/users', payload);
    await fetchUsers();
    return response.data;
  };

  const updateUser = async (id: string, payload: { name?: string, role?: string }) => {
    const response = await api.put(`/tenant/users/${id}`, payload);
    await fetchUsers();
    return response.data;
  };

  const toggleStatus = async (id: string) => {
    const response = await api.put(`/tenant/users/${id}/status`);
    await fetchUsers();
    return response.data;
  };

  const updatePassword = async (id: string, password: string) => {
    const response = await api.put(`/tenant/users/${id}/password`, { password });
    return response.data;
  };

  const deleteUser = async (id: string) => {
    const response = await api.delete(`/tenant/users/${id}`);
    await fetchUsers();
    return response.data;
  };

  return {
    users,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    toggleStatus,
    updatePassword,
    deleteUser
  };
};
