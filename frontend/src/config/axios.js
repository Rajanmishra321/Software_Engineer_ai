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
    // A 401 on an authenticated request means the session expired: send the
    // user to login. A 401 from the login call itself is just a wrong
    // password - redirecting there would reload the page and hide the error.
    const isLoginRequest = error.config?.url?.includes('/users/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('Token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;