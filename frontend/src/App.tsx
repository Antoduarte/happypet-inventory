import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRoutes } from './routes/Routes';
import { AuthProvider } from './context/AuthProvider';
import { ToastProvider } from './context/ToastProvider';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            staleTime: 1000 * 60 * 5, // 5 minutes
        },
    },
});

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <ToastProvider>
                    <AuthProvider>
                        <AppRoutes />
                    </AuthProvider>
                </ToastProvider>
            </BrowserRouter>
        </QueryClientProvider>
    );
}

export default App;
