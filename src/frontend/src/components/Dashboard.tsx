import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Paper,
    Chip,
    LinearProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Alert,
    CircularProgress,
    Button,
    Divider,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    ListItemIcon,
    Avatar,
    Modal,
    IconButton,
    TablePagination,
    TableSortLabel
} from '@mui/material';
import {
    Warning,
    CheckCircle,
    Cancel,
    TrendingDown,
    TrendingUp,
    Person,
    Business,
    Star,
    Close
} from '@mui/icons-material';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    BarChart,
    Bar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar
} from 'recharts';
import { Customer, HealthScore } from '../types';
import { fetchCustomers, fetchCustomerHealth, fetchDashboardStats, fetchHealthTrends, fetchUsageTrends, fetchHealthComponentData } from '../services/api';

const Dashboard: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [segmentFilter, setSegmentFilter] = useState<string>('all');
    const [healthFilter, setHealthFilter] = useState<string>('all');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerHealth, setCustomerHealth] = useState<HealthScore | null>(null);
    const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');
    const [dashboardStats, setDashboardStats] = useState<any>(null);
    const [healthTrends, setHealthTrends] = useState<any[]>([]);
    const [usageTrends, setUsageTrends] = useState<any[]>([]);

    // Modal state for health component data
    const [modalOpen, setModalOpen] = useState(false);
    const [modalData, setModalData] = useState<any[]>([]);
    const [modalTitle, setModalTitle] = useState('');
    const [modalLoading, setModalLoading] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    const [modalPage, setModalPage] = useState(0);
    const [modalRowsPerPage, setModalRowsPerPage] = useState(10);

    // Sorting state for main customer table
    const [sortField, setSortField] = useState<'company_name' | 'overall_score' | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Load all data in parallel
            const [customersData, statsData, trendsData, usageTrendsData] = await Promise.all([
                fetchCustomers(100),
                fetchDashboardStats(),
                fetchHealthTrends(6),
                fetchUsageTrends(6)
            ]);

            console.log('Loaded customers:', customersData);
            console.log('Loaded dashboard stats:', statsData);
            console.log('Loaded health trends:', trendsData);
            console.log('Loaded usage trends:', usageTrendsData);

            setCustomers(customersData || []);
            setDashboardStats(statsData);
            setHealthTrends(trendsData || []);
            setUsageTrends(usageTrendsData || []);
        } catch (err) {
            console.error('Error loading dashboard data:', err);
            setError('Failed to load dashboard data. Please check if the backend is running.');
        } finally {
            setLoading(false);
        }
    };


    const handleCustomerClick = async (customer: Customer) => {
        try {
            setSelectedCustomer(customer);
            setViewMode('detailed');
            const healthData = await fetchCustomerHealth(customer.id);
            setCustomerHealth(healthData);
        } catch (err) {
            setError('Failed to load customer health details');
            console.error('Error loading customer health:', err);
        }
    };

    const handleHealthComponentClick = async (component: string, componentName: string) => {
        console.log('Health component clicked:', component, componentName);
        console.log('Selected customer:', selectedCustomer);

        if (!selectedCustomer) {
            console.error('No selected customer found');
            return;
        }

        try {
            console.log('Opening modal for component:', component);
            setModalLoading(true);
            setModalError(null);
            setModalOpen(true);
            console.log('Modal state set to open:', true);
            setModalTitle(`${componentName} Data for ${selectedCustomer.company_name}`);
            setModalPage(0);

            console.log('Fetching data for customer:', selectedCustomer.id, 'component:', component);
            const response = await fetchHealthComponentData(selectedCustomer.id, component);
            console.log('Received response:', response);
            console.log('Full response.data structure:', JSON.stringify(response.data, null, 2));

            // Handle the nested API response structure: {success: true, data: {...}}
            let data = [];
            if (response && response.success && response.data) {
                // Check if response.data has a nested data array
                if (response.data.data && Array.isArray(response.data.data)) {
                    data = response.data.data;
                } else if (Array.isArray(response.data)) {
                    data = response.data;
                } else if (typeof response.data === 'object') {
                    // If it's an object, convert it to an array for table display
                    console.log('Converting object to array format for display');
                    data = [response.data];
                }
            } else if (Array.isArray(response)) {
                data = response;
            }

            console.log('Processed data:', data);
            console.log('Data type:', typeof data, 'Data length:', Array.isArray(data) ? data.length : 'not array');
            setModalData(data);
        } catch (err) {
            console.error('Error loading health component data:', err);
            setModalError('Failed to load health component data');
        } finally {
            setModalLoading(false);
        }
    };
    const handleModalClose = () => {
        setModalOpen(false);
        setModalData([]);
        setModalTitle('');
        setModalError(null);
        setModalPage(0);
    };

    const handleModalPageChange = (event: unknown, newPage: number) => {
        setModalPage(newPage);
    };

    const handleModalRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setModalRowsPerPage(parseInt(event.target.value, 10));
        setModalPage(0);
    };

    const handleSort = (field: 'company_name' | 'overall_score') => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const filteredCustomers = customers
        .filter(customer => {
            if (!customer || !customer.company_name) return false;

            const matchesSearch = customer.company_name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesSegment = segmentFilter === 'all' || customer.segment === segmentFilter;
            const matchesHealth = healthFilter === 'all' || customer.healthLevel === healthFilter;
            return matchesSearch && matchesSegment && matchesHealth;
        })
        .sort((a, b) => {
            if (!sortField) return 0;

            let aValue, bValue;
            if (sortField === 'company_name') {
                aValue = a.company_name.toLowerCase();
                bValue = b.company_name.toLowerCase();
            } else {
                aValue = a.overall_score || 0;
                bValue = b.overall_score || 0;
            }

            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

    const getHealthColor = (level: string) => {
        switch (level) {
            case 'healthy': return '#4caf50';
            case 'at-risk': return '#ff9800';
            case 'critical': return '#f44336';
            case 'churned': return '#9e9e9e';
            default: return '#9e9e9e';
        }
    };

    const getHealthIcon = (level: string) => {
        switch (level) {
            case 'healthy': return <CheckCircle />;
            case 'at-risk': return <Warning />;
            case 'critical': return <Cancel />;
            default: return <Warning />;
        }
    };

    // Use real statistics from API or calculate from customers data
    const stats = dashboardStats?.stats || {
        total: customers.length,
        healthy: customers.filter(c => c && c.healthLevel === 'healthy').length,
        atRisk: customers.filter(c => c && c.healthLevel === 'at-risk').length,
        critical: customers.filter(c => c && c.healthLevel === 'critical').length,
        churned: customers.filter(c => c && c.healthLevel === 'churned').length
    };

    const averageHealthScore = dashboardStats?.averageHealthScore ||
        (customers.length > 0
            ? customers.reduce((sum, c) => sum + (c.overall_score || 0), 0) / customers.length
            : 0);

    // Recently at-risk customers (customers with declining health scores)
    const recentlyAtRisk = customers
        .filter(c => c.healthLevel === 'at-risk' || c.healthLevel === 'critical')
        .sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))
        .slice(0, 10);

    // Health distribution data with modern colors
    const healthDistribution = [
        { name: 'Healthy', value: stats.healthy, color: '#56ab2f' },
        { name: 'At Risk', value: stats.atRisk, color: '#ff9a56' },
        { name: 'Critical', value: stats.critical, color: '#ff6b6b' },
        { name: 'Churned', value: stats.churned, color: '#6c757d' }
    ];

    // Use real health score trends from API
    const healthScoreOverTime = healthTrends.length > 0 ? healthTrends.map(trend => ({
        month: trend.month,
        score: trend.score
    })) : [
        { month: 'No Data', score: 0 }
    ];

    // Usage trends would need to be implemented with real data from API
    // const usageTrends = [
    //     { month: 'No Data', logins: 0, apiCalls: 0 }
    // ];

    // Radar chart data for health breakdown
    const radarData = selectedCustomer && customerHealth ? [
        { factor: 'Login Frequency', score: customerHealth.breakdown.loginFrequency.score, fullMark: 100 },
        { factor: 'Feature Adoption', score: customerHealth.breakdown.featureAdoption.score, fullMark: 100 },
        { factor: 'Support Tickets', score: customerHealth.breakdown.supportTickets.score, fullMark: 100 },
        { factor: 'Payment Timeliness', score: customerHealth.breakdown.paymentTimeliness.score, fullMark: 100 },
        { factor: 'API Usage', score: customerHealth.breakdown.apiUsage.score, fullMark: 100 }
    ] : [];

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
                <Typography variant="h6" sx={{ ml: 2 }}>Loading Dashboard...</Typography>
            </Box>
        );
    }

    if (viewMode === 'detailed' && selectedCustomer) {
        return (
            <>
                <Box sx={{ p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
                    {/* Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h4">
                            {selectedCustomer.company_name} - Detailed Health Analysis
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button variant="outlined" onClick={() => setViewMode('overview')}>
                                Back to Overview
                            </Button>
                        </Box>
                    </Box>

                    {/* Customer Info Card */}
                    <Card
                        elevation={0}
                        sx={{
                            mb: 3,
                            borderRadius: 3,
                            background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
                            border: '1px solid #e9ecef',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
                            }
                        }}
                    >
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Avatar
                                    sx={{
                                        bgcolor: getHealthColor(selectedCustomer.healthLevel),
                                        width: 70,
                                        height: 70,
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                    }}
                                >
                                    <Business fontSize="large" />
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                    <Typography
                                        variant="h5"
                                        sx={{
                                            fontWeight: 600,
                                            color: '#2c3e50',
                                            mb: 1
                                        }}
                                    >
                                        {selectedCustomer.company_name}
                                    </Typography>
                                    <Typography
                                        sx={{
                                            color: '#6c757d',
                                            fontWeight: 500,
                                            mb: 0.5
                                        }}
                                    >
                                        {selectedCustomer.segment} • {selectedCustomer.plan_type}
                                    </Typography>
                                    <Typography
                                        sx={{
                                            color: '#6c757d',
                                            fontWeight: 500
                                        }}
                                    >
                                        Monthly Revenue: ${selectedCustomer.monthly_revenue.toLocaleString()}
                                    </Typography>
                                </Box>
                                <Box sx={{ textAlign: 'center' }}>
                                    <Typography
                                        variant="h2"
                                        sx={{
                                            color: getHealthColor(selectedCustomer.healthLevel),
                                            fontWeight: 700,
                                            mb: 1
                                        }}
                                    >
                                        {selectedCustomer.overall_score.toFixed(0)}
                                    </Typography>
                                    <Chip
                                        icon={getHealthIcon(selectedCustomer.healthLevel)}
                                        label={selectedCustomer.healthLevel}
                                        sx={{
                                            backgroundColor: getHealthColor(selectedCustomer.healthLevel),
                                            color: 'white',
                                            fontSize: '1rem',
                                            height: 36,
                                            fontWeight: 600
                                        }}
                                    />
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                            {/* Health Component Scores */}
                            <Box sx={{ flex: '1 1 100%', minWidth: 300 }}>
                                <Typography
                                    variant="h5"
                                    sx={{
                                        fontWeight: 600,
                                        color: '#2c3e50',
                                        mb: 3,
                                        textAlign: 'center'
                                    }}
                                >
                                    Health Component Analysis
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
                                    {/* Login Frequency */}
                                    <Box sx={{ flex: '1 1 250px', minWidth: 250, maxWidth: 300 }}>
                                        <Card
                                            elevation={0}
                                            sx={{
                                                borderRadius: 3,
                                                background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
                                                border: '1px solid #e9ecef',
                                                transition: 'all 0.3s ease',
                                                cursor: 'pointer',
                                                '&:hover': {
                                                    transform: 'translateY(-4px)',
                                                    boxShadow: '0 12px 30px rgba(0,0,0,0.15)'
                                                }
                                            }}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleHealthComponentClick('login-events', 'Login Events');
                                            }}
                                        >
                                            <CardContent sx={{ p: 3, textAlign: 'center' }}>
                                                <Box sx={{ mb: 2 }}>
                                                    <Person sx={{ fontSize: 40, color: '#667eea', mb: 1 }} />
                                                    <Typography
                                                        variant="h6"
                                                        sx={{
                                                            fontWeight: 600,
                                                            color: '#2c3e50',
                                                            mb: 1
                                                        }}
                                                    >
                                                        Login Frequency
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ mb: 2 }}>
                                                    <Typography
                                                        variant="h3"
                                                        sx={{
                                                            fontWeight: 700,
                                                            color: '#667eea',
                                                            mb: 1
                                                        }}
                                                    >
                                                        {customerHealth?.breakdown.loginFrequency.score.toFixed(0) || 0}
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            color: '#6c757d',
                                                            fontWeight: 500
                                                        }}
                                                    >
                                                        Score out of 100
                                                    </Typography>
                                                </Box>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={customerHealth?.breakdown.loginFrequency.score || 0}
                                                    sx={{
                                                        height: 8,
                                                        borderRadius: 4,
                                                        backgroundColor: '#e0e0e0',
                                                        mb: 2,
                                                        '& .MuiLinearProgress-bar': {
                                                            backgroundColor: '#667eea',
                                                            borderRadius: 4
                                                        }
                                                    }}
                                                />
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: '#6c757d',
                                                        fontWeight: 500
                                                    }}
                                                >
                                                    Weight: {((customerHealth?.breakdown.loginFrequency.weight || 0) * 100).toFixed(0)}%
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Box>

                                    {/* Feature Adoption */}
                                    <Box sx={{ flex: '1 1 250px', minWidth: 250, maxWidth: 300 }}>
                                        <Card
                                            elevation={0}
                                            sx={{
                                                borderRadius: 3,
                                                background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
                                                border: '1px solid #e9ecef',
                                                transition: 'all 0.3s ease',
                                                cursor: 'pointer',
                                                '&:hover': {
                                                    transform: 'translateY(-4px)',
                                                    boxShadow: '0 12px 30px rgba(0,0,0,0.15)'
                                                }
                                            }}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleHealthComponentClick('feature-usage', 'Feature Usage');
                                            }}
                                        >
                                            <CardContent sx={{ p: 3, textAlign: 'center' }}>
                                                <Box sx={{ mb: 2 }}>
                                                    <Star sx={{ fontSize: 40, color: '#56ab2f', mb: 1 }} />
                                                    <Typography
                                                        variant="h6"
                                                        sx={{
                                                            fontWeight: 600,
                                                            color: '#2c3e50',
                                                            mb: 1
                                                        }}
                                                    >
                                                        Feature Adoption
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ mb: 2 }}>
                                                    <Typography
                                                        variant="h3"
                                                        sx={{
                                                            fontWeight: 700,
                                                            color: '#56ab2f',
                                                            mb: 1
                                                        }}
                                                    >
                                                        {customerHealth?.breakdown.featureAdoption.score.toFixed(0) || 0}
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            color: '#6c757d',
                                                            fontWeight: 500
                                                        }}
                                                    >
                                                        Score out of 100
                                                    </Typography>
                                                </Box>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={customerHealth?.breakdown.featureAdoption.score || 0}
                                                    sx={{
                                                        height: 8,
                                                        borderRadius: 4,
                                                        backgroundColor: '#e0e0e0',
                                                        mb: 2,
                                                        '& .MuiLinearProgress-bar': {
                                                            backgroundColor: '#56ab2f',
                                                            borderRadius: 4
                                                        }
                                                    }}
                                                />
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: '#6c757d',
                                                        fontWeight: 500
                                                    }}
                                                >
                                                    Weight: {((customerHealth?.breakdown.featureAdoption.weight || 0) * 100).toFixed(0)}%
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Box>

                                    {/* Support Tickets */}
                                    <Box sx={{ flex: '1 1 250px', minWidth: 250, maxWidth: 300 }}>
                                        <Card
                                            elevation={0}
                                            sx={{
                                                borderRadius: 3,
                                                background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
                                                border: '1px solid #e9ecef',
                                                transition: 'all 0.3s ease',
                                                cursor: 'pointer',
                                                '&:hover': {
                                                    transform: 'translateY(-4px)',
                                                    boxShadow: '0 12px 30px rgba(0,0,0,0.15)'
                                                }
                                            }}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleHealthComponentClick('support-tickets', 'Support Tickets');
                                            }}
                                        >
                                            <CardContent sx={{ p: 3, textAlign: 'center' }}>
                                                <Box sx={{ mb: 2 }}>
                                                    <Warning sx={{ fontSize: 40, color: '#ff9a56', mb: 1 }} />
                                                    <Typography
                                                        variant="h6"
                                                        sx={{
                                                            fontWeight: 600,
                                                            color: '#2c3e50',
                                                            mb: 1
                                                        }}
                                                    >
                                                        Support Tickets
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ mb: 2 }}>
                                                    <Typography
                                                        variant="h3"
                                                        sx={{
                                                            fontWeight: 700,
                                                            color: '#ff9a56',
                                                            mb: 1
                                                        }}
                                                    >
                                                        {customerHealth?.breakdown.supportTickets.score.toFixed(0) || 0}
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            color: '#6c757d',
                                                            fontWeight: 500
                                                        }}
                                                    >
                                                        Score out of 100
                                                    </Typography>
                                                </Box>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={customerHealth?.breakdown.supportTickets.score || 0}
                                                    sx={{
                                                        height: 8,
                                                        borderRadius: 4,
                                                        backgroundColor: '#e0e0e0',
                                                        mb: 2,
                                                        '& .MuiLinearProgress-bar': {
                                                            backgroundColor: '#ff9a56',
                                                            borderRadius: 4
                                                        }
                                                    }}
                                                />
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: '#6c757d',
                                                        fontWeight: 500
                                                    }}
                                                >
                                                    Weight: {((customerHealth?.breakdown.supportTickets.weight || 0) * 100).toFixed(0)}%
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Box>

                                    {/* Payment Timeliness */}
                                    <Box sx={{ flex: '1 1 250px', minWidth: 250, maxWidth: 300 }}>
                                        <Card
                                            elevation={0}
                                            sx={{
                                                borderRadius: 3,
                                                background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
                                                border: '1px solid #e9ecef',
                                                transition: 'all 0.3s ease',
                                                cursor: 'pointer',
                                                '&:hover': {
                                                    transform: 'translateY(-4px)',
                                                    boxShadow: '0 12px 30px rgba(0,0,0,0.15)'
                                                }
                                            }}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleHealthComponentClick('payments', 'Payment History');
                                            }}
                                        >
                                            <CardContent sx={{ p: 3, textAlign: 'center' }}>
                                                <Box sx={{ mb: 2 }}>
                                                    <CheckCircle sx={{ fontSize: 40, color: '#4caf50', mb: 1 }} />
                                                    <Typography
                                                        variant="h6"
                                                        sx={{
                                                            fontWeight: 600,
                                                            color: '#2c3e50',
                                                            mb: 1
                                                        }}
                                                    >
                                                        Payment Timeliness
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ mb: 2 }}>
                                                    <Typography
                                                        variant="h3"
                                                        sx={{
                                                            fontWeight: 700,
                                                            color: '#4caf50',
                                                            mb: 1
                                                        }}
                                                    >
                                                        {customerHealth?.breakdown.paymentTimeliness.score.toFixed(0) || 0}
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            color: '#6c757d',
                                                            fontWeight: 500
                                                        }}
                                                    >
                                                        Score out of 100
                                                    </Typography>
                                                </Box>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={customerHealth?.breakdown.paymentTimeliness.score || 0}
                                                    sx={{
                                                        height: 8,
                                                        borderRadius: 4,
                                                        backgroundColor: '#e0e0e0',
                                                        mb: 2,
                                                        '& .MuiLinearProgress-bar': {
                                                            backgroundColor: '#4caf50',
                                                            borderRadius: 4
                                                        }
                                                    }}
                                                />
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: '#6c757d',
                                                        fontWeight: 500
                                                    }}
                                                >
                                                    Weight: {((customerHealth?.breakdown.paymentTimeliness.weight || 0) * 100).toFixed(0)}%
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Box>

                                    {/* API Usage */}
                                    <Box sx={{ flex: '1 1 250px', minWidth: 250, maxWidth: 300 }}>
                                        <Card
                                            elevation={0}
                                            sx={{
                                                borderRadius: 3,
                                                background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
                                                border: '1px solid #e9ecef',
                                                transition: 'all 0.3s ease',
                                                cursor: 'pointer',
                                                '&:hover': {
                                                    transform: 'translateY(-4px)',
                                                    boxShadow: '0 12px 30px rgba(0,0,0,0.15)'
                                                }
                                            }}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleHealthComponentClick('api-usage', 'API Usage');
                                            }}
                                        >
                                            <CardContent sx={{ p: 3, textAlign: 'center' }}>
                                                <Box sx={{ mb: 2 }}>
                                                    <TrendingUp sx={{ fontSize: 40, color: '#9c27b0', mb: 1 }} />
                                                    <Typography
                                                        variant="h6"
                                                        sx={{
                                                            fontWeight: 600,
                                                            color: '#2c3e50',
                                                            mb: 1
                                                        }}
                                                    >
                                                        API Usage
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ mb: 2 }}>
                                                    <Typography
                                                        variant="h3"
                                                        sx={{
                                                            fontWeight: 700,
                                                            color: '#9c27b0',
                                                            mb: 1
                                                        }}
                                                    >
                                                        {customerHealth?.breakdown.apiUsage.score.toFixed(0) || 0}
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            color: '#6c757d',
                                                            fontWeight: 500
                                                        }}
                                                    >
                                                        Score out of 100
                                                    </Typography>
                                                </Box>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={customerHealth?.breakdown.apiUsage.score || 0}
                                                    sx={{
                                                        height: 8,
                                                        borderRadius: 4,
                                                        backgroundColor: '#e0e0e0',
                                                        mb: 2,
                                                        '& .MuiLinearProgress-bar': {
                                                            backgroundColor: '#9c27b0',
                                                            borderRadius: 4
                                                        }
                                                    }}
                                                />
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: '#6c757d',
                                                        fontWeight: 500
                                                    }}
                                                >
                                                    Weight: {((customerHealth?.breakdown.apiUsage.weight || 0) * 100).toFixed(0)}%
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Box>
                                </Box>
                            </Box>
                        </Box>

                        {/* Health Score Contribution Distribution */}
                        <Box>
                            <Card
                                elevation={0}
                                sx={{
                                    borderRadius: 3,
                                    background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
                                    border: '1px solid #e9ecef',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
                                    }
                                }}
                            >
                                <CardContent sx={{ p: 3 }}>
                                    <Typography
                                        variant="h6"
                                        gutterBottom
                                        sx={{
                                            fontWeight: 600,
                                            color: '#2c3e50',
                                            mb: 3,
                                            textAlign: 'center'
                                        }}
                                    >
                                        Health Score Contribution Breakdown
                                    </Typography>
                                    <ResponsiveContainer width="100%" height={400}>
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    {
                                                        name: 'Login Frequency',
                                                        value: (customerHealth?.breakdown.loginFrequency.score || 0) * (customerHealth?.breakdown.loginFrequency.weight || 0),
                                                        color: '#667eea',
                                                        fullScore: customerHealth?.breakdown.loginFrequency.score || 0,
                                                        weight: (customerHealth?.breakdown.loginFrequency.weight || 0) * 100
                                                    },
                                                    {
                                                        name: 'Feature Adoption',
                                                        value: (customerHealth?.breakdown.featureAdoption.score || 0) * (customerHealth?.breakdown.featureAdoption.weight || 0),
                                                        color: '#56ab2f',
                                                        fullScore: customerHealth?.breakdown.featureAdoption.score || 0,
                                                        weight: (customerHealth?.breakdown.featureAdoption.weight || 0) * 100
                                                    },
                                                    {
                                                        name: 'Support Tickets',
                                                        value: (customerHealth?.breakdown.supportTickets.score || 0) * (customerHealth?.breakdown.supportTickets.weight || 0),
                                                        color: '#ff9a56',
                                                        fullScore: customerHealth?.breakdown.supportTickets.score || 0,
                                                        weight: (customerHealth?.breakdown.supportTickets.weight || 0) * 100
                                                    },
                                                    {
                                                        name: 'Payment Timeliness',
                                                        value: (customerHealth?.breakdown.paymentTimeliness.score || 0) * (customerHealth?.breakdown.paymentTimeliness.weight || 0),
                                                        color: '#4caf50',
                                                        fullScore: customerHealth?.breakdown.paymentTimeliness.score || 0,
                                                        weight: (customerHealth?.breakdown.paymentTimeliness.weight || 0) * 100
                                                    },
                                                    {
                                                        name: 'API Usage',
                                                        value: (customerHealth?.breakdown.apiUsage.score || 0) * (customerHealth?.breakdown.apiUsage.weight || 0),
                                                        color: '#9c27b0',
                                                        fullScore: customerHealth?.breakdown.apiUsage.score || 0,
                                                        weight: (customerHealth?.breakdown.apiUsage.weight || 0) * 100
                                                    }
                                                ]}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={80}
                                                outerRadius={140}
                                                dataKey="value"
                                                label={({ name, fullScore, weight }: any) => `${name}\n${fullScore.toFixed(0)} (${weight.toFixed(0)}%)`}
                                                labelLine={false}
                                                animationBegin={0}
                                                animationDuration={1000}
                                                style={{
                                                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
                                                }}
                                            >
                                                {[
                                                    { name: 'Login Frequency', color: '#667eea' },
                                                    { name: 'Feature Adoption', color: '#56ab2f' },
                                                    { name: 'Support Tickets', color: '#ff9a56' },
                                                    { name: 'Payment Timeliness', color: '#4caf50' },
                                                    { name: 'API Usage', color: '#9c27b0' }
                                                ].map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={entry.color}
                                                        stroke="#ffffff"
                                                        strokeWidth={3}
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value: any, name: any, props: any) => [
                                                    `${Number(value).toFixed(1)} points`,
                                                    `${name} (Score: ${props.payload.fullScore.toFixed(0)}, Weight: ${props.payload.weight.toFixed(0)}%)`
                                                ]}
                                                labelStyle={{ color: '#2c3e50', fontWeight: 500 }}
                                                contentStyle={{
                                                    backgroundColor: '#ffffff',
                                                    border: '1px solid #e9ecef',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                                }}
                                            />
                                            <Legend
                                                verticalAlign="bottom"
                                                height={36}
                                                formatter={(value, entry) => (
                                                    <span style={{ color: '#2c3e50', fontWeight: 500 }}>
                                                        {value}
                                                    </span>
                                                )}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: '#6c757d',
                                                fontWeight: 500,
                                                fontStyle: 'italic'
                                            }}
                                        >
                                            Each segment shows the weighted contribution to the overall health score
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Box>
                    </Box>
                </Box>

                {/* Health Component Data Modal */}
                {(() => {
                    console.log('Rendering modal - Open:', modalOpen, 'Data length:', modalData.length, 'Loading:', modalLoading);
                    return null;
                })()}
                <Modal
                    open={modalOpen}
                    onClose={handleModalClose}
                    aria-labelledby="health-data-modal"
                    BackdropProps={{
                        sx: { backgroundColor: 'rgba(0, 0, 0, 0.5)' }
                    }}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 2,
                        zIndex: 9999
                    }}
                >
                    <Box
                        sx={{
                            width: '90%',
                            maxWidth: 1200,
                            maxHeight: '90vh',
                            backgroundColor: '#ffffff',
                            borderRadius: 3,
                            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Modal Header */}
                        <Box
                            sx={{
                                p: 3,
                                borderBottom: '1px solid #e9ecef',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                backgroundColor: '#f8f9fa'
                            }}
                        >
                            <Typography
                                variant="h5"
                                sx={{
                                    fontWeight: 600,
                                    color: '#2c3e50'
                                }}
                            >
                                {modalTitle}
                            </Typography>
                            <IconButton
                                onClick={handleModalClose}
                                sx={{
                                    color: '#6c757d',
                                    '&:hover': {
                                        backgroundColor: '#e9ecef'
                                    }
                                }}
                            >
                                <Close />
                            </IconButton>
                        </Box>

                        {/* Modal Content */}
                        <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            {modalLoading ? (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        p: 4
                                    }}
                                >
                                    <CircularProgress />
                                    <Typography sx={{ ml: 2 }}>Loading data...</Typography>
                                </Box>
                            ) : modalError ? (
                                <Box sx={{ p: 3 }}>
                                    <Alert severity="error">{modalError}</Alert>
                                </Box>
                            ) : (
                                <>
                                    <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
                                        <Table stickyHeader>
                                            <TableHead>
                                                <TableRow>
                                                    {modalData.length > 0 && Object.keys(modalData[0]).map((key) => (
                                                        <TableCell
                                                            key={key}
                                                            sx={{
                                                                backgroundColor: '#f8f9fa',
                                                                fontWeight: 600,
                                                                color: '#2c3e50',
                                                                borderBottom: '2px solid #e9ecef',
                                                                textTransform: 'capitalize'
                                                            }}
                                                        >
                                                            {key.replace(/_/g, ' ')}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {modalData
                                                    .slice(modalPage * modalRowsPerPage, modalPage * modalRowsPerPage + modalRowsPerPage)
                                                    .map((row, index) => (
                                                        <TableRow
                                                            key={index}
                                                            hover
                                                            sx={{
                                                                '&:hover': {
                                                                    backgroundColor: '#f8f9fa'
                                                                }
                                                            }}
                                                        >
                                                            {Object.values(row).map((value, cellIndex) => (
                                                                <TableCell
                                                                    key={cellIndex}
                                                                    sx={{
                                                                        py: 1.5,
                                                                        color: '#2c3e50',
                                                                        fontSize: '0.875rem'
                                                                    }}
                                                                >
                                                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                                </TableCell>
                                                            ))}
                                                        </TableRow>
                                                    ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>

                                    {/* Pagination */}
                                    <TablePagination
                                        rowsPerPageOptions={[5, 10, 25, 50]}
                                        component="div"
                                        count={modalData.length}
                                        rowsPerPage={modalRowsPerPage}
                                        page={modalPage}
                                        onPageChange={handleModalPageChange}
                                        onRowsPerPageChange={handleModalRowsPerPageChange}
                                        sx={{
                                            borderTop: '1px solid #e9ecef',
                                            backgroundColor: '#f8f9fa'
                                        }}
                                    />
                                </>
                            )}
                        </Box>
                    </Box>
                </Modal>
            </>
        );
    }


    return (
        <Box sx={{ p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">
                    Customer Health Dashboard
                </Typography>
                <Button variant="outlined" onClick={loadDashboardData} disabled={loading}>
                    {loading ? 'Loading...' : 'Refresh Data'}
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {/* High-Level Summary Widgets */}
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 4 }}>
                {/* Total Customers */}
                <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
                    <Card
                        elevation={0}
                        sx={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            borderRadius: 3,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
                            }
                        }}
                    >
                        <CardContent sx={{ textAlign: 'center', p: 3 }}>
                            <Person sx={{ fontSize: 48, mb: 2, opacity: 0.9 }} />
                            <Typography variant="h6" sx={{ opacity: 0.9, mb: 1, fontWeight: 500 }}>
                                Total Customers
                            </Typography>
                            <Typography variant="h3" component="div" sx={{ fontWeight: 700 }}>
                                {stats.total}
                            </Typography>
                        </CardContent>
                    </Card>
                </Box>

                {/* Average Health Score */}
                <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
                    <Card
                        elevation={0}
                        sx={{
                            background: averageHealthScore >= 70
                                ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
                                : averageHealthScore >= 50
                                    ? 'linear-gradient(135deg, #ff9a56 0%, #ffad56 100%)'
                                    : 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
                            color: 'white',
                            borderRadius: 3,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: averageHealthScore >= 70
                                    ? '0 8px 25px rgba(79, 172, 254, 0.3)'
                                    : averageHealthScore >= 50
                                        ? '0 8px 25px rgba(255, 154, 86, 0.3)'
                                        : '0 8px 25px rgba(255, 107, 107, 0.3)'
                            }
                        }}
                    >
                        <CardContent sx={{ textAlign: 'center', p: 3 }}>
                            <Star sx={{ fontSize: 48, mb: 2, opacity: 0.9 }} />
                            <Typography variant="h6" sx={{ opacity: 0.9, mb: 1, fontWeight: 500 }}>
                                Average Health Score
                            </Typography>
                            <Typography variant="h3" component="div" sx={{ fontWeight: 700, mb: 2 }}>
                                {averageHealthScore.toFixed(1)}
                            </Typography>
                            <LinearProgress
                                variant="determinate"
                                value={averageHealthScore}
                                sx={{
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: 'rgba(255,255,255,0.3)',
                                    '& .MuiLinearProgress-bar': {
                                        backgroundColor: 'rgba(255,255,255,0.8)',
                                        borderRadius: 4
                                    }
                                }}
                            />
                        </CardContent>
                    </Card>
                </Box>

                {/* At-Risk Count */}
                <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
                    <Card
                        elevation={0}
                        sx={{
                            background: 'linear-gradient(135deg, #ff9a56 0%, #ffad56 100%)',
                            color: 'white',
                            borderRadius: 3,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: '0 8px 25px rgba(255, 154, 86, 0.3)'
                            }
                        }}
                    >
                        <CardContent sx={{ textAlign: 'center', p: 3 }}>
                            <Warning sx={{ fontSize: 48, mb: 2, opacity: 0.9 }} />
                            <Typography variant="h6" sx={{ opacity: 0.9, mb: 1, fontWeight: 500 }}>
                                At-Risk Customers
                            </Typography>
                            <Typography variant="h3" component="div" sx={{ fontWeight: 700 }}>
                                {stats.atRisk + stats.critical}
                            </Typography>
                        </CardContent>
                    </Card>
                </Box>

                {/* Healthy Count */}
                <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
                    <Card
                        elevation={0}
                        sx={{
                            background: 'linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%)',
                            color: 'white',
                            borderRadius: 3,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: '0 8px 25px rgba(86, 171, 47, 0.3)'
                            }
                        }}
                    >
                        <CardContent sx={{ textAlign: 'center', p: 3 }}>
                            <CheckCircle sx={{ fontSize: 48, mb: 2, opacity: 0.9 }} />
                            <Typography variant="h6" sx={{ opacity: 0.9, mb: 1, fontWeight: 500 }}>
                                Healthy Customers
                            </Typography>
                            <Typography variant="h3" component="div" sx={{ fontWeight: 700 }}>
                                {stats.healthy}
                            </Typography>
                        </CardContent>
                    </Card>
                </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {/* Customers by Health Tier - Pie Chart */}
                <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
                            border: '1px solid #e9ecef',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
                            }
                        }}
                    >
                        <CardContent sx={{ p: 3 }}>
                            <Typography
                                variant="h6"
                                gutterBottom
                                sx={{
                                    fontWeight: 600,
                                    color: '#2c3e50',
                                    mb: 3,
                                    textAlign: 'center'
                                }}
                            >
                                Health Distribution
                            </Typography>
                            <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                    <Pie
                                        data={healthDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={120}
                                        dataKey="value"
                                        label={({ name, value }) => `${name}\n${value}`}
                                        labelLine={false}
                                        animationBegin={0}
                                        animationDuration={1000}
                                        style={{
                                            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
                                        }}
                                    >
                                        {healthDistribution.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.color}
                                                stroke="#ffffff"
                                                strokeWidth={2}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value, name) => [value, name]}
                                        labelStyle={{ color: '#2c3e50', fontWeight: 500 }}
                                        contentStyle={{
                                            backgroundColor: '#ffffff',
                                            border: '1px solid #e9ecef',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Box>

                {/* Recently At-Risk Customers */}
                <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
                            border: '1px solid #e9ecef',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
                            }
                        }}
                    >
                        <CardContent sx={{ p: 3 }}>
                            <Typography
                                variant="h6"
                                gutterBottom
                                sx={{
                                    fontWeight: 600,
                                    color: '#2c3e50',
                                    mb: 3,
                                    textAlign: 'center'
                                }}
                            >
                                Recently At-Risk Customers
                            </Typography>
                            <List sx={{ p: 0 }}>
                                {recentlyAtRisk.slice(0, 5).map((customer, index) => (
                                    <ListItem
                                        key={customer.id}
                                        disablePadding
                                        sx={{
                                            mb: 1,
                                            borderRadius: 2,
                                            overflow: 'hidden',
                                            '&:hover': {
                                                backgroundColor: '#f8f9fa'
                                            }
                                        }}
                                    >
                                        <ListItemButton
                                            onClick={() => handleCustomerClick(customer)}
                                            sx={{
                                                cursor: 'pointer',
                                                borderRadius: 2,
                                                py: 1.5,
                                                px: 2,
                                                transition: 'all 0.2s ease',
                                                '&:hover': {
                                                    backgroundColor: '#e3f2fd',
                                                    transform: 'translateX(4px)'
                                                }
                                            }}
                                        >
                                            <ListItemIcon sx={{ minWidth: 48 }}>
                                                <Avatar
                                                    sx={{
                                                        bgcolor: getHealthColor(customer.healthLevel),
                                                        width: 36,
                                                        height: 36,
                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                                    }}
                                                >
                                                    {getHealthIcon(customer.healthLevel)}
                                                </Avatar>
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={
                                                    <Typography
                                                        variant="body1"
                                                        sx={{
                                                            fontWeight: 600,
                                                            color: '#2c3e50',
                                                            fontSize: '0.95rem'
                                                        }}
                                                    >
                                                        {customer.company_name}
                                                    </Typography>
                                                }
                                                secondary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                                        <Chip
                                                            label={customer.healthLevel}
                                                            size="small"
                                                            sx={{
                                                                backgroundColor: getHealthColor(customer.healthLevel),
                                                                color: 'white',
                                                                fontSize: '0.75rem',
                                                                height: 20,
                                                                fontWeight: 500
                                                            }}
                                                        />
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                color: '#6c757d',
                                                                fontWeight: 500
                                                            }}
                                                        >
                                                            Score: {customer.overall_score.toFixed(0)}
                                                        </Typography>
                                                    </Box>
                                                }
                                            />
                                            <TrendingDown
                                                sx={{
                                                    color: '#ff6b6b',
                                                    fontSize: 20,
                                                    opacity: 0.8
                                                }}
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                ))}
                            </List>
                        </CardContent>
                    </Card>
                </Box>
            </Box>

            {/* Filters */}
            <Card
                elevation={0}
                sx={{
                    p: 3,
                    mb: 3,
                    mt: 3,
                    borderRadius: 3,
                    background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
                    border: '1px solid #e9ecef',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
                    }
                }}
            >
                <Typography
                    variant="h6"
                    gutterBottom
                    sx={{
                        fontWeight: 600,
                        color: '#2c3e50',
                        mb: 3,
                        textAlign: 'center'
                    }}
                >
                    Filter Customers
                </Typography>
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <Box sx={{ flex: '1 1 250px', minWidth: 250 }}>
                        <TextField
                            fullWidth
                            label="Search Customers"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    backgroundColor: '#ffffff',
                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                        borderColor: '#667eea',
                                        borderWidth: 2
                                    },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                        borderColor: '#667eea',
                                        borderWidth: 2
                                    }
                                },
                                '& .MuiInputLabel-root': {
                                    color: '#6c757d',
                                    fontWeight: 500
                                }
                            }}
                        />
                    </Box>
                    <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
                        <FormControl
                            fullWidth
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    backgroundColor: '#ffffff',
                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                        borderColor: '#667eea',
                                        borderWidth: 2
                                    },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                        borderColor: '#667eea',
                                        borderWidth: 2
                                    }
                                },
                                '& .MuiInputLabel-root': {
                                    color: '#6c757d',
                                    fontWeight: 500
                                }
                            }}
                        >
                            <InputLabel>Segment</InputLabel>
                            <Select
                                value={segmentFilter}
                                onChange={(e) => setSegmentFilter(e.target.value)}
                            >
                                <MenuItem value="all">All Segments</MenuItem>
                                <MenuItem value="enterprise">Enterprise</MenuItem>
                                <MenuItem value="smb">SMB</MenuItem>
                                <MenuItem value="startup">Startup</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                    <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
                        <FormControl
                            fullWidth
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    backgroundColor: '#ffffff',
                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                        borderColor: '#667eea',
                                        borderWidth: 2
                                    },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                        borderColor: '#667eea',
                                        borderWidth: 2
                                    }
                                },
                                '& .MuiInputLabel-root': {
                                    color: '#6c757d',
                                    fontWeight: 500
                                }
                            }}
                        >
                            <InputLabel>Health Level</InputLabel>
                            <Select
                                value={healthFilter}
                                onChange={(e) => setHealthFilter(e.target.value)}
                            >
                                <MenuItem value="all">All Levels</MenuItem>
                                <MenuItem value="healthy">Healthy</MenuItem>
                                <MenuItem value="at-risk">At Risk</MenuItem>
                                <MenuItem value="critical">Critical</MenuItem>
                                <MenuItem value="churned">Churned</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </Box>
            </Card>

            {/* Actionable Customers Table */}
            <Card
                elevation={0}
                sx={{
                    borderRadius: 3,
                    background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
                    border: '1px solid #e9ecef',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
                    }
                }}
            >
                <CardContent sx={{ p: 3 }}>
                    <Typography
                        variant="h6"
                        gutterBottom
                        sx={{
                            fontWeight: 600,
                            color: '#2c3e50',
                            mb: 3,
                            textAlign: 'center'
                        }}
                    >
                        All Customers
                    </Typography>
                    <TableContainer
                        sx={{
                            maxHeight: 600,
                            borderRadius: 2,
                            border: '1px solid #e9ecef',
                            backgroundColor: '#ffffff'
                        }}
                    >
                        <Table stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell
                                        sx={{
                                            backgroundColor: '#f8f9fa',
                                            fontWeight: 600,
                                            color: '#2c3e50',
                                            borderBottom: '2px solid #e9ecef'
                                        }}
                                    >
                                        <TableSortLabel
                                            active={sortField === 'company_name'}
                                            direction={sortField === 'company_name' ? sortDirection : 'asc'}
                                            onClick={() => handleSort('company_name')}
                                            sx={{
                                                color: '#2c3e50',
                                                fontWeight: 600,
                                                '&:hover': {
                                                    color: '#667eea'
                                                },
                                                '&.Mui-active': {
                                                    color: '#667eea'
                                                }
                                            }}
                                        >
                                            Customer
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            backgroundColor: '#f8f9fa',
                                            fontWeight: 600,
                                            color: '#2c3e50',
                                            borderBottom: '2px solid #e9ecef'
                                        }}
                                    >
                                        Segment
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            backgroundColor: '#f8f9fa',
                                            fontWeight: 600,
                                            color: '#2c3e50',
                                            borderBottom: '2px solid #e9ecef'
                                        }}
                                    >
                                        <TableSortLabel
                                            active={sortField === 'overall_score'}
                                            direction={sortField === 'overall_score' ? sortDirection : 'asc'}
                                            onClick={() => handleSort('overall_score')}
                                            sx={{
                                                color: '#2c3e50',
                                                fontWeight: 600,
                                                '&:hover': {
                                                    color: '#667eea'
                                                },
                                                '&.Mui-active': {
                                                    color: '#667eea'
                                                }
                                            }}
                                        >
                                            Health Score
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            backgroundColor: '#f8f9fa',
                                            fontWeight: 600,
                                            color: '#2c3e50',
                                            borderBottom: '2px solid #e9ecef'
                                        }}
                                    >
                                        Health Tier
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            backgroundColor: '#f8f9fa',
                                            fontWeight: 600,
                                            color: '#2c3e50',
                                            borderBottom: '2px solid #e9ecef'
                                        }}
                                    >
                                        Last Login
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            backgroundColor: '#f8f9fa',
                                            fontWeight: 600,
                                            color: '#2c3e50',
                                            borderBottom: '2px solid #e9ecef'
                                        }}
                                    >
                                        Revenue
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            backgroundColor: '#f8f9fa',
                                            fontWeight: 600,
                                            color: '#2c3e50',
                                            borderBottom: '2px solid #e9ecef'
                                        }}
                                    >
                                        Actions
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredCustomers.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={7}
                                            align="center"
                                            sx={{
                                                py: 4,
                                                color: '#6c757d',
                                                fontWeight: 500
                                            }}
                                        >
                                            {customers.length === 0 ? 'No customers loaded from API' : 'No customers match your filters'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredCustomers.map((customer) => (
                                        <TableRow
                                            key={customer.id}
                                            hover
                                            sx={{
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                '&:hover': {
                                                    backgroundColor: '#f8f9fa',
                                                    transform: 'scale(1.01)'
                                                }
                                            }}
                                        >
                                            <TableCell sx={{ py: 2 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <Avatar
                                                        sx={{
                                                            bgcolor: getHealthColor(customer.healthLevel),
                                                            width: 40,
                                                            height: 40,
                                                            mr: 2,
                                                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                                        }}
                                                    >
                                                        <Business fontSize="small" />
                                                    </Avatar>
                                                    <Box>
                                                        <Typography
                                                            variant="body1"
                                                            sx={{
                                                                fontWeight: 600,
                                                                color: '#2c3e50',
                                                                fontSize: '0.95rem'
                                                            }}
                                                        >
                                                            {customer.company_name}
                                                        </Typography>
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                color: '#6c757d',
                                                                fontWeight: 500
                                                            }}
                                                        >
                                                            {customer.contact_name}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ py: 2 }}>
                                                <Chip
                                                    label={customer.segment}
                                                    size="small"
                                                    sx={{
                                                        backgroundColor: '#e3f2fd',
                                                        color: '#1976d2',
                                                        fontWeight: 500,
                                                        fontSize: '0.75rem'
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ py: 2 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <Box sx={{ width: '100%', mr: 1 }}>
                                                        <LinearProgress
                                                            variant="determinate"
                                                            value={customer.overall_score || 0}
                                                            sx={{
                                                                height: 10,
                                                                borderRadius: 5,
                                                                backgroundColor: '#e0e0e0',
                                                                '& .MuiLinearProgress-bar': {
                                                                    backgroundColor: getHealthColor(customer.healthLevel),
                                                                    borderRadius: 5
                                                                }
                                                            }}
                                                        />
                                                    </Box>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            minWidth: 35,
                                                            fontWeight: 600,
                                                            color: '#2c3e50'
                                                        }}
                                                    >
                                                        {(customer.overall_score || 0).toFixed(0)}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ py: 2 }}>
                                                <Chip
                                                    icon={getHealthIcon(customer.healthLevel)}
                                                    label={customer.healthLevel}
                                                    size="small"
                                                    sx={{
                                                        backgroundColor: getHealthColor(customer.healthLevel),
                                                        color: 'white',
                                                        fontWeight: 500,
                                                        fontSize: '0.75rem'
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ py: 2 }}>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: '#6c757d',
                                                        fontWeight: 500
                                                    }}
                                                >
                                                    {customer.last_login_date ? new Date(customer.last_login_date).toLocaleDateString() : 'Never'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ py: 2 }}>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: '#2c3e50',
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    ${(customer.monthly_revenue || 0).toLocaleString()}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ py: 2 }}>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() => handleCustomerClick(customer)}
                                                    sx={{
                                                        borderRadius: 2,
                                                        textTransform: 'none',
                                                        fontWeight: 500,
                                                        borderColor: '#667eea',
                                                        color: '#667eea',
                                                        '&:hover': {
                                                            backgroundColor: '#667eea',
                                                            color: 'white',
                                                            transform: 'translateY(-1px)',
                                                            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                                                        }
                                                    }}
                                                >
                                                    View Details
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            {/* Health Component Data Modal */}
            {(() => {
                console.log('Rendering modal - Open:', modalOpen, 'Data length:', modalData.length, 'Loading:', modalLoading);
                return null;
            })()}
            <Modal
                open={modalOpen}
                onClose={handleModalClose}
                aria-labelledby="health-data-modal"
                BackdropProps={{
                    sx: { backgroundColor: 'rgba(0, 0, 0, 0.5)' }
                }}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 2,
                    zIndex: 9999
                }}
            >
                <Box
                    sx={{
                        width: '90%',
                        maxWidth: 1200,
                        maxHeight: '90vh',
                        backgroundColor: '#ffffff',
                        borderRadius: 3,
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}
                >
                    {/* Modal Header */}
                    <Box
                        sx={{
                            p: 3,
                            borderBottom: '1px solid #e9ecef',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: '#f8f9fa'
                        }}
                    >
                        <Typography
                            variant="h5"
                            sx={{
                                fontWeight: 600,
                                color: '#2c3e50'
                            }}
                        >
                            {modalTitle}
                        </Typography>
                        <IconButton
                            onClick={handleModalClose}
                            sx={{
                                color: '#6c757d',
                                '&:hover': {
                                    backgroundColor: '#e9ecef'
                                }
                            }}
                        >
                            <Close />
                        </IconButton>
                    </Box>

                    {/* Modal Content */}
                    <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        {modalLoading ? (
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    p: 4
                                }}
                            >
                                <CircularProgress />
                                <Typography sx={{ ml: 2 }}>Loading data...</Typography>
                            </Box>
                        ) : modalError ? (
                            <Box sx={{ p: 3 }}>
                                <Alert severity="error">{modalError}</Alert>
                            </Box>
                        ) : (
                            <>
                                <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
                                    <Table stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                {modalData.length > 0 && Object.keys(modalData[0]).map((key) => (
                                                    <TableCell
                                                        key={key}
                                                        sx={{
                                                            backgroundColor: '#f8f9fa',
                                                            fontWeight: 600,
                                                            color: '#2c3e50',
                                                            borderBottom: '2px solid #e9ecef',
                                                            textTransform: 'capitalize'
                                                        }}
                                                    >
                                                        {key.replace(/_/g, ' ')}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {modalData
                                                .slice(modalPage * modalRowsPerPage, modalPage * modalRowsPerPage + modalRowsPerPage)
                                                .map((row, index) => (
                                                    <TableRow
                                                        key={index}
                                                        hover
                                                        sx={{
                                                            '&:hover': {
                                                                backgroundColor: '#f8f9fa'
                                                            }
                                                        }}
                                                    >
                                                        {Object.values(row).map((value, cellIndex) => (
                                                            <TableCell
                                                                key={cellIndex}
                                                                sx={{
                                                                    py: 1.5,
                                                                    color: '#2c3e50',
                                                                    fontSize: '0.875rem'
                                                                }}
                                                            >
                                                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>

                                {/* Pagination */}
                                <TablePagination
                                    rowsPerPageOptions={[5, 10, 25, 50]}
                                    component="div"
                                    count={modalData.length}
                                    rowsPerPage={modalRowsPerPage}
                                    page={modalPage}
                                    onPageChange={handleModalPageChange}
                                    onRowsPerPageChange={handleModalRowsPerPageChange}
                                    sx={{
                                        borderTop: '1px solid #e9ecef',
                                        backgroundColor: '#f8f9fa'
                                    }}
                                />
                            </>
                        )}
                    </Box>
                </Box>
            </Modal>
        </Box>
    );
};

export default Dashboard;