const DB_NAME = "cipherchat-local";
const DB_VERSION = 1;

let dbPromise;

const requestToPromise = (request) => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const txDone = (tx) => new Promise((resolve, reject) => {
  tx.oncomplete = () => resolve();
  tx.onerror = () => reject(tx.error);
  tx.onabort = () => reject(tx.error);
});

export const openLocalDb = () => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains("messages")) {
        const messages = db.createObjectStore("messages", { keyPath: "localId" });
        messages.createIndex("chatCreatedAt", ["chatId", "createdAt"]);
        messages.createIndex("chatId", "chatId");
        messages.createIndex("serverId", "serverId", { unique: false });
        messages.createIndex("clientMessageId", "clientMessageId", { unique: false });
      }

      if (!db.objectStoreNames.contains("conversations")) {
        const conversations = db.createObjectStore("conversations", { keyPath: "chatId" });
        conversations.createIndex("updatedAt", "updatedAt");
      }

      if (!db.objectStoreNames.contains("contacts")) {
        db.createObjectStore("contacts", { keyPath: "email" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
};

const numericTime = (value) => Number(value) || Date.now();

const getStore = async (name, mode = "readonly") => {
  const db = await openLocalDb();
  const tx = db.transaction(name, mode);
  return { store: tx.objectStore(name), tx };
};

export const saveLocalContact = async (contact) => {
  if (!contact?.email) return null;
  const { store, tx } = await getStore("contacts", "readwrite");
  const existing = await requestToPromise(store.get(contact.email)).catch(() => null);
  const saved = { ...existing, ...contact };
  store.put(saved);
  await txDone(tx);
  return saved;
};

export const saveLocalContacts = async (contacts = []) => {
  const db = await openLocalDb();
  const tx = db.transaction("contacts", "readwrite");
  const store = tx.objectStore("contacts");
  contacts.filter(contact => contact?.email).forEach(contact => store.put(contact));
  await txDone(tx);
};

export const getLocalContacts = async () => {
  const { store } = await getStore("contacts");
  return requestToPromise(store.getAll());
};

export const deleteLocalContact = async (email) => {
  const { store, tx } = await getStore("contacts", "readwrite");
  store.delete(email);
  await txDone(tx);
};

export const upsertLocalConversation = async (conversation) => {
  if (!conversation?.chatId) return null;
  const { store, tx } = await getStore("conversations", "readwrite");
  const existing = await requestToPromise(store.get(conversation.chatId)).catch(() => null);
  const incomingUpdatedAt = conversation.updatedAt || conversation.createdAt;
  const existingUpdatedAt = existing?.updatedAt ? numericTime(existing.updatedAt) : 0;
  const updatedAt = incomingUpdatedAt
    ? Math.max(numericTime(incomingUpdatedAt), existingUpdatedAt)
    : existing?.updatedAt || Date.now();
  const saved = {
    unreadCount: 0,
    ...existing,
    ...conversation,
    updatedAt
  };
  store.put(saved);
  await txDone(tx);
  return saved;
};

export const upsertLocalConversations = async (conversations = []) => {
  for (const conversation of conversations) {
    await upsertLocalConversation(conversation);
  }
};

export const getLocalConversations = async () => {
  const { store } = await getStore("conversations");
  return requestToPromise(store.getAll());
};

export const saveLocalMessage = async (message) => {
  if (!message?.chatId || !message?.encryptedPayload) return null;
  const createdAt = numericTime(message.createdAt);
  const localId = String(message.localId || message.serverId || message.clientMessageId || createdAt);
  const { store, tx } = await getStore("messages", "readwrite");
  const existing = await requestToPromise(store.get(localId)).catch(() => null);
  const saved = {
    kind: "message",
    deliveredTo: [],
    seenBy: [],
    ...existing,
    ...message,
    localId,
    createdAt
  };
  store.put(saved);
  await txDone(tx);
  await upsertLocalConversation({
    chatId: saved.chatId,
    lastMessageId: saved.localId,
    updatedAt: saved.createdAt
  });
  return saved;
};

export const getLocalMessage = async (localId) => {
  if (!localId) return null;
  const { store } = await getStore("messages");
  return requestToPromise(store.get(localId)).catch(() => null);
};

const getFirstFromIndex = async (indexName, value) => {
  const { store } = await getStore("messages");
  const index = store.index(indexName);
  const results = await requestToPromise(index.getAll(value));
  return results[0] || null;
};

export const updateLocalMessageStatus = async ({ localId, clientMessageId, serverId, status, deliveredTo, seenBy }) => {
  const existing = localId
    ? await (async () => {
      const { store } = await getStore("messages");
      return requestToPromise(store.get(localId));
    })().catch(() => null)
    : clientMessageId
      ? await getFirstFromIndex("clientMessageId", clientMessageId)
      : await getFirstFromIndex("serverId", serverId);

  if (!existing) return null;
  const delivered = deliveredTo
    ? [...new Set([...(existing.deliveredTo || []), deliveredTo])]
    : existing.deliveredTo || [];
  const seen = seenBy
    ? [...new Set([...(existing.seenBy || []), ...seenBy])]
    : existing.seenBy || [];

  return saveLocalMessage({
    ...existing,
    serverId: serverId || existing.serverId,
    status: status || existing.status,
    deliveredTo: delivered,
    seenBy: seen
  });
};

export const markLocalConversationMessagesSeen = async (chatId, currentUserEmail) => {
  if (!chatId || !currentUserEmail) return [];
  const { store, tx } = await getStore("messages", "readwrite");
  const index = store.index("chatId");
  const receipts = [];

  await new Promise((resolve, reject) => {
    const request = index.openCursor(IDBKeyRange.only(chatId));
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve();
        return;
      }

      const message = cursor.value;
      const seenBy = message.seenBy || [];
      if (
        message.sender
        && message.sender !== currentUserEmail
        && !seenBy.includes(currentUserEmail)
      ) {
        const nextMessage = {
          ...message,
          seenBy: [...new Set([...seenBy, currentUserEmail])]
        };
        cursor.update(nextMessage);
        receipts.push({
          serverId: message.serverId || null,
          clientMessageId: message.clientMessageId || null,
          sender: message.sender
        });
      }

      cursor.continue();
    };
  });

  await txDone(tx);
  return receipts;
};

export const deleteLocalMessage = async (localId) => {
  if (!localId) return;
  const existing = await getLocalMessage(localId);
  if (!existing) return;

  const { store, tx } = await getStore("messages", "readwrite");
  store.delete(localId);
  await txDone(tx);

  const latest = await getLocalMessages(existing.chatId, null, 1);
  const { store: conversationStore, tx: conversationTx } = await getStore("conversations", "readwrite");
  const conversation = await requestToPromise(conversationStore.get(existing.chatId)).catch(() => null);
  if (conversation?.lastMessageId === localId) {
    conversationStore.put({
      ...conversation,
      lastMessageId: latest.messages[0]?.localId || null,
      updatedAt: latest.messages[0]?.createdAt || conversation.updatedAt
    });
  }
  await txDone(conversationTx);
};

export const getLocalMessages = async (chatId, cursorCreatedAt = null, limit = 20) => {
  const { store } = await getStore("messages");
  const index = store.index("chatCreatedAt");
  const upperTime = cursorCreatedAt == null ? Number.MAX_SAFE_INTEGER : numericTime(cursorCreatedAt) - 1;
  const range = IDBKeyRange.bound([chatId, 0], [chatId, upperTime]);

  return new Promise((resolve, reject) => {
    const messages = [];
    const request = index.openCursor(range, "prev");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor || messages.length >= limit) {
        resolve({
          messages,
          nextCursor: messages.length === limit ? messages[messages.length - 1].createdAt : null
        });
        return;
      }
      messages.push(cursor.value);
      cursor.continue();
    };
  });
};

export const incrementLocalUnread = async (chatId) => {
  const { store, tx } = await getStore("conversations", "readwrite");
  const existing = await requestToPromise(store.get(chatId)).catch(() => null);
  store.put({
    chatId,
    ...existing,
    unreadCount: (existing?.unreadCount || 0) + 1,
    updatedAt: Date.now()
  });
  await txDone(tx);
};

export const clearLocalUnread = async (chatId) => {
  const { store, tx } = await getStore("conversations", "readwrite");
  const existing = await requestToPromise(store.get(chatId)).catch(() => null);
  if (existing) store.put({ ...existing, unreadCount: 0 });
  await txDone(tx);
};

export const deleteLocalConversation = async (chatId) => {
  const db = await openLocalDb();
  const tx = db.transaction(["messages", "conversations"], "readwrite");
  const messages = tx.objectStore("messages");
  const conversations = tx.objectStore("conversations");
  const index = messages.index("chatId");

  await new Promise((resolve, reject) => {
    const request = index.openCursor(IDBKeyRange.only(chatId));
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve();
        return;
      }
      cursor.delete();
      cursor.continue();
    };
  });

  conversations.delete(chatId);
  await txDone(tx);
};

const getAllFromStore = async (name) => {
  const { store } = await getStore(name);
  return requestToPromise(store.getAll());
};

const approximateBytes = (records = []) => {
  return records.reduce((total, record) => total + JSON.stringify(record).length, 0);
};

export const getLocalStorageStats = async () => {
  const [messages, conversations, contacts] = await Promise.all([
    getAllFromStore("messages"),
    getAllFromStore("conversations"),
    getAllFromStore("contacts")
  ]);

  const indexedDbBytes = approximateBytes(messages)
    + approximateBytes(conversations)
    + approximateBytes(contacts);

  return {
    messages: messages.length,
    conversations: conversations.length,
    contacts: contacts.length,
    indexedDbBytes
  };
};

export const clearAllLocalMessages = async () => {
  const allConversations = await getAllFromStore("conversations");
  const db = await openLocalDb();
  const tx = db.transaction(["messages", "conversations"], "readwrite");
  const messages = tx.objectStore("messages");
  const conversations = tx.objectStore("conversations");

  messages.clear();

  allConversations.forEach(conversation => {
    conversations.put({
      ...conversation,
      lastMessageId: null,
      unreadCount: 0
    });
  });

  await txDone(tx);
};

export const resetLocalChatData = async () => {
  const db = await openLocalDb();
  const tx = db.transaction(["messages", "conversations", "contacts"], "readwrite");
  tx.objectStore("messages").clear();
  tx.objectStore("conversations").clear();
  tx.objectStore("contacts").clear();
  await txDone(tx);
};
