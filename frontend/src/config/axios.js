import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL
});

// Add a request interceptor
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("Token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default axiosInstance;

// axiosInstance.interceptors.request.use(
//     config => {
//         console.log('Request Headers:', config.headers);
//         return config;
//     },
//     error => {
//         return Promise.reject(error);
//     }
// );