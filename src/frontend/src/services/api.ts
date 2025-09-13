import axios from 'axios';

// Use relative URLs when running in Docker (nginx proxies to backend)
// Use absolute URLs when running locally for development
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

console.log('API_BASE_URL:', API_BASE_URL);

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache', // Add this to prevent caching
    },
});

// Simple interface that matches your backend response
interface Customer {
    id: number;
    company_name: string;
    contact_email: string;
    contact_name: string;
    segment: string;
    plan_type: string;
    monthly_revenue: number;
    signup_date: string;
    last_login_date?: string;
    overall_score: number;
    healthLevel: string;
    calculated_at: string;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
    pagination?: {
        page: number;
        limit: number;
        total: number;
    };
}

export const fetchCustomers = async (limit: number = 100): Promise<Customer[]> => {
    try {
        // Add timestamp to prevent caching
        const timestamp = new Date().getTime();
        const url = `/api/customers?limit=${limit}&_t=${timestamp}`;
        console.log('Fetching customers from:', `${API_BASE_URL}${url}`);
        console.log('Request parameters:', { limit, timestamp });

        const response = await api.get<ApiResponse<Customer[]>>(url);
        console.log('API Response:', response.data);
        console.log('Pagination info:', response.data.pagination);
        console.log('Number of customers received:', response.data.data?.length);

        return response.data.data || [];
    } catch (error) {
        console.error('Error fetching customers:', error);
        throw error;
    }
};

export const fetchCustomerHealth = async (customerId: number): Promise<any> => {
    try {
        const response = await api.get(`/api/customers/${customerId}/health`);
        return response.data.data.healthScore;
    } catch (error) {
        console.error('Error fetching customer health:', error);
        throw error;
    }
};

export const recordEvent = async (customerId: number, eventData: any): Promise<any> => {
    try {
        const response = await api.post(`/api/customers/${customerId}/events`, eventData);
        return response.data;
    } catch (error) {
        console.error('Error recording event:', error);
        throw error;
    }
};

export const fetchDashboardStats = async (): Promise<any> => {
    try {
        const response = await api.get('/api/dashboard/stats');
        return response.data.data;
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        throw error;
    }
};

export const fetchHealthTrends = async (months: number = 6): Promise<any[]> => {
    try {
        const response = await api.get(`/api/dashboard/trends?months=${months}`);
        return response.data.data;
    } catch (error) {
        console.error('Error fetching health trends:', error);
        throw error;
    }
};

export const fetchUsageTrends = async (months: number = 6): Promise<any[]> => {
    try {
        const response = await api.get(`/api/dashboard/usage-trends?months=${months}`);
        return response.data.data;
    } catch (error) {
        console.error('Error fetching usage trends:', error);
        throw error;
    }
};

export const fetchHealthComponentData = async (customerId: number, component: string): Promise<any> => {
    try {
        console.log(`Making API call: /api/customers/${customerId}/health-data/${component}`);
        const response = await api.get(`/api/customers/${customerId}/health-data/${component}`);
        console.log('Raw API response:', response.data);
        return response.data; // Return the full response, let the component handle the structure
    } catch (error) {
        console.error('Error fetching health component data:', error);
        throw error;
    }
};