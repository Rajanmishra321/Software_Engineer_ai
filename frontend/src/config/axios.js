import axios from 'axios';

 const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers:{
        "Authorization": `Bearer ${localStorage.getItem("Token")}`
    }
});

// axiosInstance.interceptors.request.use(
//     config => {
//         console.log('Request Headers:', config.headers);
//         return config;
//     },
//     error => {
//         return Promise.reject(error);
//     }
// );


export default axiosInstance;