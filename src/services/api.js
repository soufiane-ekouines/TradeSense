import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login?expired=true';
            }
        }
        return Promise.reject(error);
    }
);

export const auth = {
    login: (email, password) => api.post('/auth/login', { email, password }),
    register: (name, email, password) => api.post('/auth/register', { name, email, password }),
};

export const challenges = {
    getActive: () => api.get('/challenges/active'),
    create: (plan_slug) => api.post('/challenges/create', { plan_slug }),
    getPlans: () => api.get('/challenges/plans'),
};

export const market = {
    getQuote: (symbol) => api.get('/market/quote', { params: { symbol } }),
    getSeries: (symbol) => api.get('/market/series', { params: { symbol } }),
    getTick: (symbol) => api.get('/market/tick', { params: { symbol } }),
    getAllPrices: () => api.get('/market/prices'),
};

export const trades = {
    place: (data) => api.post('/trades', data),
    getHistory: (challenge_id) => api.get('/trades', { params: { challenge_id } }),
    panicClose: (challenge_id) => api.post('/trades/close-all', { challenge_id }),
    getRisk: (challenge_id) => api.get(`/trades/risk/${challenge_id}`),
    // Account validation - checks prop firm rules
    validateAccount: (challenge_id, live_prices = {}) => 
        api.post('/trades/validate-account', { challenge_id, live_prices }),
    // New optimized endpoints
    getEquity: (challenge_id) => api.get(`/trades/equity/${challenge_id}`),
    getPositions: (challenge_id) => api.get(`/trades/positions/${challenge_id}`),
    getWatchdog: (challenge_id) => api.get(`/trades/watchdog/${challenge_id}`),
};

export const news_api = {
    getLatest: () => api.get('/news/latest')
};

export const leaderboard = {
    getTop10: () => api.get('/leaderboard/monthly-top10'),
};

export const strategy = {
    getConsensus: (symbol) => api.get('/strategy/consensus', { params: { symbol } }),
};

export const checkout = {
    payCMI: (plan) => api.post('/checkout/cmi', { plan }),
    payCrypto: (plan) => api.post('/checkout/crypto', { plan }),
    payPayPal: (plan) => api.post('/checkout/paypal', { plan }),
};

export const community = {
    getFeed: (tenant = 'default', page = 1) => api.get(`/v1/${tenant}/community/nexus`, { params: { page } }),
    createPost: (tenant = 'default', formData) => api.post(`/v1/${tenant}/community/posts`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    getTopStrategies: (tenant = 'default') => api.get(`/v1/${tenant}/community/strategies/top`),
    shareStrategy: (tenant = 'default', formData) => api.post(`/v1/${tenant}/community/strategies`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    getComments: (tenant = 'default', postId) => api.get(`/v1/${tenant}/community/posts/${postId}/comments`),
    addComment: (tenant = 'default', postId, formData) => api.post(`/v1/${tenant}/community/posts/${postId}/comments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
};

export default api;
