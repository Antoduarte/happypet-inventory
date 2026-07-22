import React, { useEffect } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DataTable, type ColumnDef } from '../../components/ui/DataTable';
import { useNavigate } from 'react-router-dom';
import { useUsers, type User } from './useUsers';

export const UserList: React.FC = () => {
    const { users, fetchUsers } = useUsers();
    const navigate = useNavigate();

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleOpenForm = (user?: User) => {
        if (user) {
            navigate(`/users/edit/${user.id}`);
        } else {
            navigate('/users/new');
        }
    };

    const roleStyles: Record<string, string> = {
        admin: 'bg-purple-100 text-purple-700',
        manager: 'bg-amber-100 text-amber-700',
        cashier: 'bg-blue-100 text-blue-700',
    };

    const roleLabels: Record<string, string> = {
        admin: 'Administrador',
        manager: 'Gerente',
        cashier: 'Cajero',
    };

    const columns: ColumnDef<User>[] = [
        {
            header: 'Nombre',
            accessorKey: 'name',
            sortable: true,
            cell: (item) => <span className="font-medium text-slate-800">{item.name || '—'}</span>,
        },
        {
            header: 'Correo',
            accessorKey: 'email',
            sortable: true,
            cell: (item) => <span className="text-slate-600">{item.email}</span>,
        },
        {
            header: 'Rol',
            accessorKey: 'role',
            sortable: true,
            cell: (item) => (
                <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${roleStyles[item.role] || 'bg-slate-100 text-slate-700'}`}
                >
                    {roleLabels[item.role] || item.role}
                </span>
            ),
        },
        {
            header: 'Estado',
            accessorKey: 'is_active',
            sortable: true,
            cell: (item) => (
                <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${item.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
                >
                    {item.is_active ? 'Activo' : 'Inactivo'}
                </span>
            ),
        },
    ];

    return (
        <div>
            <PageHeader
                title="Usuarios"
                breadcrumbs={[{ label: 'Panel', path: '/' }, { label: 'Usuarios' }]}
                action={
                    <Button onClick={() => handleOpenForm()} className="gap-2">
                        <Plus size={18} />
                        Agregar Usuario
                    </Button>
                }
            />

            <Card>
                <DataTable
                    data={users}
                    columns={columns}
                    searchKey="name"
                    searchPlaceholder="Buscar usuarios por nombre..."
                    onRowClick={handleOpenForm}
                />
            </Card>
        </div>
    );
};
