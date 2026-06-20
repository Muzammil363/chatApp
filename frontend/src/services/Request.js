import { apiRequest } from "./api";

export const sendRequest = async (email) => {
    const data = await apiRequest("/user/sendRequest", {
        method: "POST",
        body: JSON.stringify({ email })
    });
    return data.message;
};

export const findRequests = async () => {
    return apiRequest("/user/fetchRequests");
};

export const findUser = async (query) => {
    if (!query) return [];
    const data = await apiRequest(`/user/find/${encodeURIComponent(query)}`);
    return data.result;
};

export const suggestUsers = async (limit = 10) => {
    const data = await apiRequest(`/user/suggestions?limit=${encodeURIComponent(limit)}`);
    return data.users;
};

export const acceptUser = async (email) => {
    const data = await apiRequest(`/user/acceptRequest/${encodeURIComponent(email)}`, {
        method: "POST"
    });
    return data.contact;
};

export const declineRequest = async (email) => {
    await apiRequest(`/user/declineRequest/${encodeURIComponent(email)}`, {
        method: "DELETE"
    });
    return true;
};

export const cancelRequest = async (email) => {
    await apiRequest(`/user/cancelRequest/${encodeURIComponent(email)}`, {
        method: "DELETE"
    });
    return true;
};
