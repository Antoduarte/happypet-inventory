import { useState } from 'react';

export interface Service {
    id: string;
    name: string;
    description: string;
    durationMinutes: number;
    price: number;
    status: 'active' | 'inactive';
}

let DUMMY_SERVICES: Service[] = [
    {
        id: 'SRV-001',
        name: 'Basic Dog Wash',
        description: 'Bath, brush, and blow dry for small/medium dogs.',
        durationMinutes: 45,
        price: 35.0,
        status: 'active',
    },
    {
        id: 'SRV-002',
        name: 'Full Grooming (Large)',
        description: 'Bath, haircut, nail trim, and ear cleaning for large breeds.',
        durationMinutes: 120,
        price: 85.0,
        status: 'active',
    },
    {
        id: 'SRV-003',
        name: 'Nail Trimming',
        description: 'Quick nail clip and file.',
        durationMinutes: 15,
        price: 15.0,
        status: 'active',
    },
    {
        id: 'SRV-004',
        name: 'Flea & Tick Treatment',
        description: 'Topical application and medicated bath.',
        durationMinutes: 60,
        price: 55.0,
        status: 'active',
    },
];

export const useServices = () => {
    const [services, setServices] = useState<Service[]>(DUMMY_SERVICES);

    const addService = (service: Omit<Service, 'id'>) => {
        const newService: Service = {
            ...service,
            id: `SRV-${Math.floor(Math.random() * 1000)
                .toString()
                .padStart(3, '0')}`,
        };
        DUMMY_SERVICES = [...DUMMY_SERVICES, newService];
        setServices(DUMMY_SERVICES);
        return newService;
    };

    const updateService = (id: string, updates: Partial<Omit<Service, 'id'>>) => {
        DUMMY_SERVICES = DUMMY_SERVICES.map((s) => (s.id === id ? { ...s, ...updates } : s));
        setServices(DUMMY_SERVICES);
    };

    const deleteService = (id: string) => {
        DUMMY_SERVICES = DUMMY_SERVICES.filter((s) => s.id !== id);
        setServices(DUMMY_SERVICES);
    };

    return {
        services,
        addService,
        updateService,
        deleteService,
    };
};
