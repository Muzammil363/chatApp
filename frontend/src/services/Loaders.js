import { decryptWithAES } from "./Encryption";
import { apiRequest } from "./api";

export const loadConversation = async (conversationId, cursor = null, limit = 20) => {
  const params = new URLSearchParams();
  params.append("limit", limit);
  if (cursor) params.append("cursor", cursor);

  return apiRequest(`/api/conversations/${encodeURIComponent(conversationId)}/messages?${params.toString()}`);
};

export const decryptAll = (messages, getSecretForMessage) => {
  const decrypted = [];
  for (let i = 0; i < messages.length; i++) {
    try {
      const sharedSecret = typeof getSecretForMessage === "function"
        ? getSecretForMessage(messages[i])
        : getSecretForMessage;
      const decryptedText = decryptWithAES(messages[i].message, sharedSecret);
      if (!decryptedText) continue;
      const parsedMessage = JSON.parse(decryptedText);
      decrypted.push({ _id: messages[i]._id, message: parsedMessage, sender: messages[i].sender });
    } catch (error) {
      continue;
    }
  }
  return decrypted;
};
