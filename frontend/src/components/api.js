import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:5010";

const API = axios.create({
  baseURL: `${API_URL}/api`,
});

export const signup = (formData) => API.post("/signup", formData);
export const login = (formData) => API.post("/login", formData);
