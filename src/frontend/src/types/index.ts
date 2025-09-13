// Simplified types that match your backend
export interface Customer {
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

export interface HealthScore {
    customerId: number;
    overallScore: number;
    healthLevel: string;
    breakdown: {
        loginFrequency: { score: number; weight: number };
        featureAdoption: { score: number; weight: number };
        supportTickets: { score: number; weight: number };
        paymentTimeliness: { score: number; weight: number };
        apiUsage: { score: number; weight: number };
    };
    calculatedAt: string;
}

export interface HealthFactor {
    score: number;
    weight: number;
}

export interface HealthMetrics {
    totalEvents: number;
    recentEvents: number;
    totalTickets: number;
    openTickets: number;
    totalPayments: number;
    overduePayments: number;
    featuresUsed: number;
    apiRequests: number;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
