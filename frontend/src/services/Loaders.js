import { decryptWithAES } from "./Encryption";

export const loadConversation = async (email, cursor = null, limit = 20) => {
  const params = new URLSearchParams();
  params.append('limit', limit);
  if (cursor) params.append('cursor', cursor);

  const res = await fetch(`http://localhost:3000/api/chat/inbox/${email}/messages?${params.toString()}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    }
  });

  const data = await res.json();
  if (res.status === 200) {
    return data;
  }

  return null;
};


export const decryptAll = (messages, sharedSecret) => {
  let decrypted=[];
  for(let i=0;i<messages.length;i++) {
    let message=JSON.parse(decryptWithAES(messages[i].message,sharedSecret));
    decrypted.push({_id:messages[i]._id,message:message,sender:messages[i].sender});
  };
  return decrypted;
};
