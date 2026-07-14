import axios from "axios"

function getStoredAccessToken() {
  try {
    return globalThis.localStorage?.getItem("access_token") ?? null
  } catch {
    return null
  }
}

const defaultBaseURL = import.meta.env.MODE === "test" ? "http://localhost/api" : "/api"

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultBaseURL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // Professional standard for secure cookies
})

api.interceptors.request.use((config) => {
  const token = getStoredAccessToken()
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
