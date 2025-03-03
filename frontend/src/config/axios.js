// import axios from 'axios';

// const axiosInstance = axios.create({
//     baseURL: import.meta.env.VITE_API_URL
// });

// // Add a request interceptor
// axiosInstance.interceptors.request.use(
//     (config) => {
//         const token = localStorage.getItem("Token");
//         if (token) {
//             config.headers.Authorization = `Bearer ${token}`;
//         }
//         return config;
//     },
//     (error) => {
//         return Promise.reject(error);
//     }
// );

// export default axiosInstance;

// axiosInstance.interceptors.request.use(
//     config => {
//         console.log('Request Headers:', config.headers);
//         return config;
//     },
//     error => {
//         return Promise.reject(error);
//     }
// );




import axios from 'axios';

// Create an instance of axios
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // Replace with your API URL
});

// Add a request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Get the token from localStorage
    const token = localStorage.getItem('Token');
    
    // If token exists, add it to the headers
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token expiration
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // If 401 Unauthorized response, redirect to login
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('Token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;