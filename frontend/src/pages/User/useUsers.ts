import { useState, useCallback } from 'react';
import {
    userService,
    type User,
    type CreateUserPayload,
    type UpdateUserPayload,
} from '../../services/user';

export const useUsers = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await userService.getUsers();
            setUsers(data);
        } catch {
            setError('Error al cargar los usuarios');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const addUser = async (userData: CreateUserPayload): Promise<User> => {
        setIsLoading(true);
        setError(null);
        try {
            const newUser = await userService.createUser(userData);
            setUsers((prev) => [...prev, newUser]);
            return newUser;
        } catch (err) {
            setError('Error al crear el usuario');
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const updateUser = async (id: string, updates: UpdateUserPayload): Promise<User> => {
        setIsLoading(true);
        setError(null);
        try {
            const updated = await userService.updateUser(parseInt(id, 10), updates);
            setUsers((prev) => prev.map((u) => (u.id === parseInt(id, 10) ? updated : u)));
            return updated;
        } catch (err) {
            setError('Error al actualizar el usuario');
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const deleteUser = async (id: string): Promise<void> => {
        setIsLoading(true);
        setError(null);
        try {
            await userService.deleteUser(parseInt(id, 10));
            setUsers((prev) => prev.filter((u) => u.id !== parseInt(id, 10)));
        } catch (err) {
            setError('Error al eliminar el usuario');
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const getUser = (id: string): User | undefined => {
        return users.find((u) => u.id === parseInt(id, 10));
    };

    return {
        users,
        isLoading,
        error,
        fetchUsers,
        addUser,
        updateUser,
        deleteUser,
        getUser,
    };
};

export type { User };
