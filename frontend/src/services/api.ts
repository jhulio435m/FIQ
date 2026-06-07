import axios from "axios"

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // Professional standard for secure cookies
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !window.location.pathname.includes("/login")) {
      // localStorage.removeItem("access_token")
      // window.location.href = "/login"
    }
    return Promise.reject(err)
  },
)

export default api
