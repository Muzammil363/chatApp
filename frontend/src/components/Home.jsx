import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styles from '../styles/Home.module.css';
import toast from 'react-hot-toast';
import { useSocketConnection } from '../hooks/useSocketConnection.js';
import { deriveSharedSecret, encryptWithAES, decryptWithAES, getECDHKeyPairFromPIN } from '../services/Encryption.js';
import { uploadImageToCloudinary } from '../services/CloudinaryUpload.js';
import {
  createGroup,
  getContacts,
  getConversations,
  getGroupMembers,
  leaveGroup
} from '../services/User.js';
import { deleteContact } from '../services/Delete.js';
import { privateKeyActions } from '../store/index.js';
import {
  clearAllLocalMessages,
  clearLocalUnread,
  deleteLocalContact,
  deleteLocalConversation,
  deleteLocalMessage,
  getLocalConversations,
  getLocalMessage,
  getLocalMessages,
  getLocalStorageStats,
  incrementLocalUnread,
  markLocalConversationMessagesSeen,
  resetLocalChatData,
  saveLocalContacts,
  saveLocalMessage,
  updateLocalMessageStatus,
  upsertLocalConversation,
  upsertLocalConversations
} from '../services/localDb.js';

const messageTime = () => new Date().toLocaleString('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

const Home = () => {
  const dispatch = useDispatch();
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showConversation, setShowConversation] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [searched, setSearched] = useState('');
  const [socket, setSocket] = useState(null);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedGroupEmails, setSelectedGroupEmails] = useState([]);
  const [unlockPin, setUnlockPin] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [activeMessageMenu, setActiveMessageMenu] = useState(null);
  const [showStorageSettings, setShowStorageSettings] = useState(false);
  const [storageStats, setStorageStats] = useState(null);
  const [isLoadingStorage, setIsLoadingStorage] = useState(false);

  const messageBoxRef = useRef();
  const currentConversation = useRef();
  const typingTimer = useRef();
  const fileInputRef = useRef(null);

  const myPrivateKey = useSelector(state => state.privateKey.key);
  const currentUser = useSelector(state => state.auth.user);

  const refreshConversations = async () => {
    try {
      const [conversationData, contactData] = await Promise.all([getConversations(), getContacts()]);
      await saveLocalContacts(contactData);
      await upsertLocalConversations(conversationData.map(conversation => ({
        chatId: conversation.chatId,
        type: conversation.type,
        name: conversation.name || conversation.fullName,
        members: conversation.members,
        memberCount: conversation.memberCount,
        updatedAt: conversation.createdAt
      })));
      const localConversations = await getLocalConversations();
      const localByChatId = new Map(localConversations.map(conversation => [conversation.chatId, conversation]));
      const mergedConversations = await Promise.all(conversationData.map(async conversation => {
        const localConversation = localByChatId.get(conversation.chatId);
        const localLastMessage = await getLocalMessage(localConversation?.lastMessageId);
        return {
          ...conversation,
          unread: localConversation?.unreadCount || 0,
          localUpdatedAt: localConversation?.updatedAt || conversation.createdAt || 0,
          localLastMessage
        };
      }));
      setConversations(mergedConversations.sort((a, b) => Number(b.localUpdatedAt || 0) - Number(a.localUpdatedAt || 0)));
      setContacts(contactData);
    } catch (error) {
      toast.error(error.message || 'Error while fetching conversations');
    }
  };

  const senderPublicKey = (senderEmail, membersOverride = groupMembers, conversationOverride) => {
    const activeConversation = conversationOverride || currentConversation.current || selectedConversation;
    if (senderEmail === currentUser?.email) return currentUser.publicKey;
    if (activeConversation?.type === 'direct') return activeConversation.publicKey;
    return membersOverride.find(member => member.email === senderEmail)?.publicKey
      || contacts.find(contact => contact.email === senderEmail)?.publicKey;
  };

  const decryptMessage = (serverMessage, membersOverride, conversationOverride) => {
    try {
      const publicKey = serverMessage?.senderPublicKey || senderPublicKey(serverMessage.sender, membersOverride, conversationOverride);
      const encryptedPayload = serverMessage?.encryptedPayload || serverMessage?.message;
      if (!encryptedPayload || !publicKey || !myPrivateKey) return null;
      const sharedSecret = deriveSharedSecret(myPrivateKey, publicKey);
      const decryptedText = decryptWithAES(encryptedPayload, sharedSecret);
      if (!decryptedText) return null;
      const decryptedMessage = JSON.parse(decryptedText);
      return {
        _id: serverMessage._id || serverMessage.localId || serverMessage.serverId || serverMessage.clientMessageId,
        localId: serverMessage.localId || serverMessage._id || serverMessage.serverId || serverMessage.clientMessageId,
        serverId: serverMessage.serverId,
        clientMessageId: serverMessage.clientMessageId,
        status: serverMessage.status,
        deliveredTo: serverMessage.deliveredTo || [],
        seenBy: serverMessage.seenBy || [],
        message: decryptedMessage,
        sender: serverMessage.sender
      };
    } catch (error) {
      return null;
    }
  };

  const encryptForMembers = (plainMessage, members) => {
    return members.map(member => {
      const sharedSecret = deriveSharedSecret(myPrivateKey, member.publicKey);
      return {
        userEmail: member.email,
        ciphertext: encryptWithAES(JSON.stringify(plainMessage), sharedSecret)
      };
    });
  };

  const activeMembersForSelected = async () => {
    if (!selectedConversation) return [];
    if (selectedConversation.type === 'direct') {
      return [
        {
          email: currentUser.email,
          publicKey: currentUser.publicKey
        },
        {
          email: selectedConversation.email,
          publicKey: selectedConversation.publicKey
        }
      ];
    }

    if (groupMembers.length > 0) return groupMembers;
    const members = await getGroupMembers(selectedConversation.chatId);
    setGroupMembers(members);
    return members;
  };

  const loadMessages = async (reset = false, membersOverride = groupMembers, conversationOverride = currentConversation.current) => {
    if (!conversationOverride || isLoading || (!hasMore && !reset)) return;
    setIsLoading(true);
    try {
      const data = await getLocalMessages(conversationOverride.chatId, reset ? null : cursor, 20);
      const decrypted = data.messages
        .map(messageItem => decryptMessage(messageItem, membersOverride, conversationOverride))
        .filter(Boolean)
        .reverse();
      setMessages(prev => reset ? decrypted : [...decrypted, ...prev]);
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
    } catch (error) {
      toast.error(error.message || 'Could not load messages');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReceive = async (data) => {
    const activeConversation = currentConversation.current;
    const receivedChatId = data.chatId || data.conversationId;
    const incoming = data.message || {};
    const encryptedPayload = incoming.encryptedPayload || incoming.message;

    if (!receivedChatId || !encryptedPayload) {
      return;
    }

    try {
      const saved = await saveLocalMessage({
        localId: incoming.serverId || incoming._id,
        serverId: incoming.serverId || incoming._id,
        clientMessageId: incoming.clientMessageId,
        chatId: receivedChatId,
        sender: incoming.sender || data.fromMail,
        senderPublicKey: incoming.senderPublicKey,
        encryptedPayload,
        createdAt: incoming.createdAt || Date.now(),
        status: 'delivered'
      });

      if (saved?.serverId) {
        socket?.emit('message:saved', { serverId: saved.serverId, chatId: receivedChatId });
      }

      const isActiveUnlocked = activeConversation?.chatId === receivedChatId && myPrivateKey;
      if (isActiveUnlocked) {
        const decrypted = decryptMessage(saved);
        if (decrypted) {
          setMessages(prev => {
            if (prev.some(messageItem => String(messageItem.localId) === String(decrypted.localId))) return prev;
            return [...prev, decrypted];
          });
          await clearLocalUnread(receivedChatId);
          await emitSeenReceipts(receivedChatId);
        }
      } else {
        await incrementLocalUnread(receivedChatId);
      }

      await refreshConversations();
    } catch (error) {
      toast.error(error.message || 'Could not save incoming message');
    }
  };

  const handleTypingReceive = ({ from, chatId } = {}) => {
    if (!currentConversation.current || currentConversation.current.chatId !== chatId) return;
    clearTimeout(typingTimer.current);
    setIsTyping(true);
    typingTimer.current = setTimeout(() => setIsTyping(false), 2000);
  };

  const handleStopTyping = () => setIsTyping(false);

  const handleDeletedMessage = (_id) => {
    setMessages(prev => prev.filter(msg => String(msg.message?.id || msg._id) !== String(_id)));
    toast('Message deleted by sender');
  };

  const formatBytes = (bytes = 0) => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / (1024 ** index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
  };

  const loadStorageStats = async () => {
    setIsLoadingStorage(true);
    try {
      const [localStats, browserStats] = await Promise.all([
        getLocalStorageStats(),
        navigator.storage?.estimate ? navigator.storage.estimate() : Promise.resolve(null)
      ]);
      setStorageStats({
        ...localStats,
        browserUsage: browserStats?.usage || null,
        browserQuota: browserStats?.quota || null
      });
    } catch (error) {
      toast.error(error.message || 'Could not load storage details');
    } finally {
      setIsLoadingStorage(false);
    }
  };

  const openStorageSettings = async () => {
    setShowStorageSettings(true);
    await loadStorageStats();
  };

  const emitSeenReceipts = async (chatId) => {
    if (!socket || !chatId || !currentUser?.email) return;
    const seenMessages = await markLocalConversationMessagesSeen(chatId, currentUser.email);
    const messagesToSend = seenMessages.filter(item => item.sender && (item.serverId || item.clientMessageId));
    if (messagesToSend.length > 0) {
      socket.emit('message:seen', { chatId, messages: messagesToSend });
    }
  };

  const handleMessageAccepted = async ({ clientMessageId, serverId } = {}) => {
    const updated = await updateLocalMessageStatus({
      clientMessageId,
      serverId,
      status: 'accepted'
    });
    if (updated) {
      setMessages(prev => prev.map(item => (
        String(item.clientMessageId || item.message?.id) === String(clientMessageId)
          ? { ...item, serverId, status: 'accepted' }
          : item
      )));
      await refreshConversations();
    }
  };

  const handleMessageDelivered = async ({ serverId, clientMessageId, deliveredTo, allDelivered } = {}) => {
    const updated = await updateLocalMessageStatus({
      serverId,
      clientMessageId,
      status: allDelivered ? 'delivered' : 'partial',
      deliveredTo
    });
    if (updated) {
      setMessages(prev => prev.map(item => (
        String(item.serverId || item.clientMessageId || item.message?.id) === String(serverId || clientMessageId)
          ? {
            ...item,
            serverId: serverId || item.serverId,
            status: allDelivered ? 'delivered' : 'partial',
            deliveredTo: [...new Set([...(item.deliveredTo || []), deliveredTo].filter(Boolean))]
          }
          : item
      )));
      await refreshConversations();
    }
  };

  const shouldMarkMessageSeen = (messageItem, seenBy = [], allSeen = false) => {
    if (allSeen) return true;
    const deliveredTo = messageItem.deliveredTo || [];
    if (deliveredTo.length === 0) return false;
    return deliveredTo.every(email => seenBy.includes(email));
  };

  const handleMessageSeen = async ({ serverId, clientMessageId, seenBy = [], allSeen = false } = {}) => {
    const updated = await updateLocalMessageStatus({
      serverId,
      clientMessageId,
      seenBy
    });
    if (!updated) return;

    const nextStatus = shouldMarkMessageSeen(updated, updated.seenBy || [], allSeen)
      ? 'seen'
      : updated.status;

    const finalMessage = nextStatus === updated.status
      ? updated
      : await updateLocalMessageStatus({
        localId: updated.localId,
        status: nextStatus
      });

    setMessages(prev => prev.map(item => {
      const sameMessage = String(item.serverId || item.clientMessageId || item.message?.id)
        === String(serverId || clientMessageId);
      if (!sameMessage) return item;

      const mergedSeenBy = [...new Set([...(item.seenBy || []), ...(seenBy || [])])];
      const status = shouldMarkMessageSeen(
        { ...item, deliveredTo: item.deliveredTo || finalMessage?.deliveredTo || [] },
        mergedSeenBy,
        allSeen
      )
        ? 'seen'
        : item.status;

      return {
        ...item,
        seenBy: mergedSeenBy,
        status
      };
    }));
    await refreshConversations();
  };

  useSocketConnection(
    handleStopTyping,
    handleTypingReceive,
    handleReceive,
    setSocket,
    handleDeletedMessage,
    handleMessageAccepted,
    handleMessageDelivered,
    handleMessageSeen
  );

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    document.title = 'Messages | CipherChat';
    refreshConversations();
  }, []);

  useEffect(() => {
    if (!socket || !selectedConversation?.chatId || !myPrivateKey) return;
    emitSeenReceipts(selectedConversation.chatId);
  }, [socket, selectedConversation?.chatId, myPrivateKey]);

  useEffect(() => {
    if (!mediaPreview) return;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setMediaPreview(null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mediaPreview]);

  useEffect(() => {
    if (!myPrivateKey || !currentConversation.current || messages.length > 0) return;

    const openLockedConversation = async () => {
      try {
        const conversation = currentConversation.current;
        let membersForDecrypt = groupMembers;
        if (conversation.type === 'group') {
          const members = await getGroupMembers(conversation.chatId);
          setGroupMembers(members);
          membersForDecrypt = members;
        }
        await clearLocalUnread(conversation.chatId);
        await loadMessages(true, membersForDecrypt, conversation);
        await emitSeenReceipts(conversation.chatId);
        await refreshConversations();
      } catch (error) {
        toast.error(error.message || 'Could not open conversation');
      }
    };

    openLockedConversation();
  }, [myPrivateKey]);

  useEffect(() => {
    const msgArea = messageBoxRef.current;
    if (!msgArea) return;
    const handleScroll = async () => {
      if (msgArea.scrollTop === 0) await loadMessages();
    };
    msgArea.addEventListener('scroll', handleScroll);
    return () => msgArea.removeEventListener('scroll', handleScroll);
  }, [cursor, hasMore, isLoading]);

  const unlockMessages = async (e) => {
    e.preventDefault();
    if (!currentUser?.publicKey) {
      toast.error('Profile is still loading. Try again in a moment.');
      return;
    }
    if (!unlockPin || unlockPin.length < 2) {
      toast.error('Enter your secret PIN');
      return;
    }

    setIsUnlocking(true);
    try {
      const keys = getECDHKeyPairFromPIN(unlockPin);
      if (keys.publicKeyHex !== currentUser.publicKey) {
        toast.error('Invalid PIN for this account');
        return;
      }
      dispatch(privateKeyActions.setPrivateKey({ privateKey: keys.privateKey }));
      setUnlockPin('');
      toast.success('Messages unlocked');
    } catch (error) {
      toast.error('Could not unlock messages');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleConversationSelect = async (conversation) => {
    if (!myPrivateKey) {
      setSelectedConversation(conversation);
      currentConversation.current = conversation;
      setMessages([]);
      setCursor(null);
      setHasMore(true);
      setGroupMembers([]);
      if (isMobile) setShowConversation(true);
      toast.error('Unlock messages with your PIN first');
      return;
    }

    setSelectedConversation(conversation);
    currentConversation.current = conversation;
    setMessages([]);
    setCursor(null);
    setHasMore(true);
    setGroupMembers([]);
    if (isMobile) setShowConversation(true);

    try {
      let membersForDecrypt = groupMembers;
      if (conversation.type === 'group') {
        const members = await getGroupMembers(conversation.chatId);
        setGroupMembers(members);
        membersForDecrypt = members;
      }
      await clearLocalUnread(conversation.chatId);
      await loadMessages(true, membersForDecrypt, conversation);
      await emitSeenReceipts(conversation.chatId);
      await refreshConversations();
    } catch (error) {
      toast.error(error.message || 'Could not open conversation');
    }
  };

  const handleBackToConversations = () => {
    setShowConversation(false);
    setSelectedConversation(null);
    currentConversation.current = null;
  };

  const sendPreparedMessage = async (plainMessage) => {
    if (!selectedConversation || !socket) return;
    const members = await activeMembersForSelected();
    const encryptedFor = encryptForMembers(plainMessage, members);
    const clientMessageId = String(plainMessage.id);
    const selfPayload = encryptedFor.find(entry => entry.userEmail === currentUser.email);
    if (!selfPayload?.ciphertext) {
      throw new Error('Could not encrypt message for this device');
    }
    const saved = await saveLocalMessage({
      localId: clientMessageId,
      clientMessageId,
      chatId: selectedConversation.chatId,
      sender: currentUser.email,
      senderPublicKey: currentUser.publicKey,
      encryptedPayload: selfPayload?.ciphertext,
      createdAt: plainMessage.id,
      status: 'sending',
      seenBy: []
    });

    socket.emit('message:send', {
      conversationId: selectedConversation.chatId,
      chatId: selectedConversation.chatId,
      encryptedFor,
      clientMessageId,
      time: plainMessage.id
    });

    setMessages(prev => [...prev, {
      _id: saved?.localId || clientMessageId,
      localId: saved?.localId || clientMessageId,
      clientMessageId,
      message: plainMessage,
      sender: currentUser.email,
      status: 'sending',
      deliveredTo: [],
      seenBy: []
    }]);
    setMessage('');
    await refreshConversations();
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    try {
      await sendPreparedMessage({
        id: Date.now(),
        text: message,
        image: null,
        time: messageTime()
      });
    } catch (error) {
      toast.error(error.message || 'Unable to send message');
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const url = await uploadImageToCloudinary(file);
      await sendPreparedMessage({
        id: Date.now(),
        text: null,
        image: url,
        time: messageTime()
      });
    } catch (error) {
      toast.error('Error while sending image');
    }
  };

  const handleIsTyping = () => {
    if (!socket || !selectedConversation) return;
    socket.emit('typing:start', { conversationId: selectedConversation.chatId, chatId: selectedConversation.chatId });
  };

  const handleContactDelete = async () => {
    if (!selectedConversation || selectedConversation.type !== 'direct') return;
    if (!confirm('Delete this contact? This also removes this chat history from this browser.')) return;
    try {
      await deleteContact(selectedConversation.email);
      await deleteLocalContact(selectedConversation.email);
      await deleteLocalConversation(selectedConversation.chatId);
      setSelectedConversation(null);
      currentConversation.current = null;
      setMessages([]);
      await refreshConversations();
      toast.success('Deleted contact successfully');
    } catch (error) {
      toast.error(error.message || 'Cannot delete contact');
    }
  };

  const handleClearChat = async () => {
    if (!selectedConversation) return;
    if (!confirm('Clear this chat from this browser?')) return;
    try {
      await deleteLocalConversation(selectedConversation.chatId);
      await upsertLocalConversation({
        chatId: selectedConversation.chatId,
        type: selectedConversation.type,
        name: selectedConversation.name || selectedConversation.fullName,
        members: selectedConversation.members,
        memberCount: selectedConversation.memberCount,
        updatedAt: Date.now()
      });
      setMessages([]);
      await refreshConversations();
      toast.success('Chat cleared from this browser');
    } catch (error) {
      toast.error(error.message || 'Cannot clear chat');
    }
  };

  const handleClearAllLocalMessages = async () => {
    if (!confirm('Clear all local messages from this browser? Contacts will stay available.')) return;
    try {
      await clearAllLocalMessages();
      setMessages([]);
      setCursor(null);
      setHasMore(false);
      await refreshConversations();
      await loadStorageStats();
      toast.success('All local messages cleared');
    } catch (error) {
      toast.error(error.message || 'Cannot clear local messages');
    }
  };

  const handleResetLocalChatData = async () => {
    if (!confirm('Reset all local chat data in this browser? Server-backed contacts will be restored after refresh.')) return;
    try {
      await resetLocalChatData();
      setMessages([]);
      setSelectedConversation(null);
      currentConversation.current = null;
      setCursor(null);
      setHasMore(true);
      setGroupMembers([]);
      await refreshConversations();
      await loadStorageStats();
      toast.success('Local chat data reset');
    } catch (error) {
      toast.error(error.message || 'Cannot reset local data');
    }
  };

  const handleClearCurrentChatFromSettings = async () => {
    if (!selectedConversation) return;
    await handleClearChat();
    await loadStorageStats();
  };

  const handleLeaveGroup = async () => {
    if (!selectedConversation || selectedConversation.type !== 'group') return;
    if (!confirm('Leave this group?')) return;
    try {
      await leaveGroup(selectedConversation.chatId);
      setSelectedConversation(null);
      currentConversation.current = null;
      setMessages([]);
      await refreshConversations();
      toast.success('Left group');
    } catch (error) {
      toast.error(error.message || 'Cannot leave group');
    }
  };

  const handleDeleteMessage = async (id) => {
    if (!confirm('Delete this message from this browser?')) return;
    try {
      await deleteLocalMessage(String(id));
      setMessages(prev => prev.filter(msg => String(msg.localId || msg.message.id) !== String(id)));
      await refreshConversations();
      toast.success('Message deleted from this browser');
    } catch (error) {
      toast.error(error.message || 'Cannot delete message');
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      await createGroup({ name: groupName, memberEmails: selectedGroupEmails });
      setGroupName('');
      setSelectedGroupEmails([]);
      setShowGroupForm(false);
      await refreshConversations();
      toast.success('Group created');
    } catch (error) {
      toast.error(error.message || 'Cannot create group');
    }
  };

  const toggleGroupMember = (email) => {
    setSelectedGroupEmails(prev => (
      prev.includes(email) ? prev.filter(item => item !== email) : [...prev, email]
    ));
  };

  const displayedConversations = conversations.filter(conversation =>
    (conversation.name || conversation.fullName || '')
      .toLowerCase()
      .startsWith(searched.toLowerCase())
  );

  const displaySenderName = (email) => {
    if (email === currentUser?.email) return 'Me';
    if (selectedConversation?.type === 'direct') return selectedConversation.fullName;
    return groupMembers.find(member => member.email === email)?.fullName || email;
  };

  const deliveryLabel = (status) => {
    if (status === 'delivered') return '✓✓';
    if (status === 'accepted' || status === 'partial') return '✓';
    if (status === 'sending') return 'Sending';
    return '';
  };

  const formatContactStatus = (conversation) => {
    if (!conversation) return '';
    if (conversation.type === 'group') {
      return `${groupMembers.length || conversation.memberCount || 0} members`;
    }
    if (conversation.online) return 'Online';

    const date = new Date(conversation.lastSeen);
    if (Number.isNaN(date.getTime())) return 'Offline';

    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startYesterday = startToday - 24 * 60 * 60 * 1000;
    const time = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    if (date.getTime() >= startToday) return `Last seen today, ${time}`;
    if (date.getTime() >= startYesterday) return `Last seen yesterday, ${time}`;

    const day = date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit'
    });
    return `Last seen ${day}, ${time}`;
  };

  const deliveryText = (status) => {
    if (status === 'seen') return 'seen';
    if (status === 'delivered') return 'delivered';
    if (status === 'accepted' || status === 'partial') return 'sent';
    if (status === 'sending') return 'Sending';
    return '';
  };

  const getConversationPreview = (conversation) => {
    const preview = conversation.localLastMessage;
    if (!preview?.encryptedPayload) {
      return conversation.type === 'group'
        ? `${conversation.memberCount || 0} members`
        : 'No messages yet';
    }

    const publicKey = preview.senderPublicKey || senderPublicKey(preview.sender, groupMembers, conversation);
    if (!myPrivateKey || !publicKey) {
      return 'Encrypted message';
    }

    try {
      const sharedSecret = deriveSharedSecret(myPrivateKey, publicKey);
      const decryptedText = decryptWithAES(preview.encryptedPayload, sharedSecret);
      if (!decryptedText) return 'Encrypted message';

      const decryptedMessage = JSON.parse(decryptedText);
      if (decryptedMessage.image) return 'Image';
      if (decryptedMessage.text) return decryptedMessage.text;
      return 'Message';
    } catch (error) {
      return 'Encrypted message';
    }
  };

  return (
    <div className={styles.homeContainer}>
      <div className={styles.chatContainer}>
        <div className={`${styles.contactsSidebar} ${isMobile && showConversation ? styles.hidden : ''}`}>
          <div className={styles.contactsHeader}>
            <h3>Messages</h3>
            <button className={styles.newChatBtn} onClick={() => setShowGroupForm(prev => !prev)}>+</button>
          </div>

          {showGroupForm && (
            <form className={styles.groupForm} onSubmit={handleCreateGroup}>
              <input
                type="text"
                placeholder="Group name"
                className={styles.searchInput}
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
              <div className={styles.groupMemberList}>
                {contacts.map(contact => (
                  <label key={contact.email} className={styles.groupMemberItem}>
                    <input
                      type="checkbox"
                      checked={selectedGroupEmails.includes(contact.email)}
                      onChange={() => toggleGroupMember(contact.email)}
                    />
                    <span>{contact.fullName}</span>
                  </label>
                ))}
              </div>
              <button type="submit" className={styles.actionBtn}>Create group</button>
            </form>
          )}

          <div className={styles.searchBar}>
            <input
              type="text"
              placeholder="Search conversations..."
              className={styles.searchInput}
              value={searched}
              onChange={(e) => setSearched(e.target.value)}
            />
          </div>

          <div className={styles.contactsList}>
            {displayedConversations.map(conversation => (
              <div
                key={conversation.chatId}
                className={`${styles.contactItem} ${selectedConversation?.chatId === conversation.chatId ? styles.active : ''}`}
                onClick={() => handleConversationSelect(conversation)}
              >
                <div className={styles.contactAvatar}>
                  {conversation.profilePic
                    ? <span><img src={conversation.profilePic} alt="" className={styles.profilePhoto} /></span>
                    : <span>{conversation.type === 'group' ? 'G' : 'U'}</span>}
                  {conversation.online && <div className={styles.onlineIndicator}></div>}
                </div>
                <div className={styles.contactInfo}>
                  <div className={styles.contactName}>{conversation.name || conversation.fullName}</div>
                  <div className={styles.lastMessage}>{getConversationPreview(conversation)}</div>
                </div>
                <div className={styles.contactMeta}>
                  {conversation.unread > 0 && <div className={styles.unreadBadge}>{conversation.unread}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`${styles.conversationArea} ${isMobile && !showConversation ? styles.hidden : ''}`}>
          {!myPrivateKey ? (
            <div className={styles.unlockState}>
              <div className={styles.unlockCard}>
                <div className={styles.unlockBadge}>PIN</div>
                <h3>Unlock messages</h3>
                <p>Your session is active. Enter your secret PIN to rebuild the encryption key for this browser tab.</p>
                <form className={styles.unlockForm} onSubmit={unlockMessages}>
                  <input
                    type="password"
                    value={unlockPin}
                    onChange={(e) => setUnlockPin(e.target.value)}
                    placeholder="Secret PIN"
                    className={styles.unlockInput}
                  />
                  <button type="submit" className={styles.sendBtn} disabled={isUnlocking}>
                    {isUnlocking ? 'Unlocking...' : 'Unlock'}
                  </button>
                </form>
                <button type="button" className={styles.storageLinkBtn} onClick={openStorageSettings}>
                  Storage settings
                </button>
              </div>
            </div>
          ) : selectedConversation ? (
            <>
              <div className={styles.conversationHeader}>
                {isMobile && (
                  <button className={styles.backBtn} onClick={handleBackToConversations}>Back</button>
                )}
                <div className={styles.contactAvatar}>
                  {selectedConversation.profilePic
                    ? <span><img src={selectedConversation.profilePic} alt="" className={styles.profilePhoto} /></span>
                    : <span>{selectedConversation.type === 'group' ? 'G' : 'U'}</span>}
                  {selectedConversation.online && <div className={styles.onlineIndicator}></div>}
                </div>
                <div className={styles.contactDetails}>
                  <h4>{selectedConversation.name || selectedConversation.fullName}</h4>
                  <span className={styles.status}>{formatContactStatus(selectedConversation)}</span>
                </div>
                <div className={styles.conversationActions}>
                  <button className={styles.actionBtn} onClick={openStorageSettings}>Settings</button>
                  {selectedConversation.type === 'direct' ? (
                    <>
                      <button className={styles.actionBtn} onClick={handleContactDelete}>Delete Contact</button>
                      <button className={styles.actionBtn} onClick={handleClearChat}>Clear Chat</button>
                    </>
                  ) : (
                    <button className={styles.actionBtn} onClick={handleLeaveGroup}>Leave Group</button>
                  )}
                </div>
              </div>

              <div ref={messageBoxRef} className={styles.messagesArea}>
                {isLoading && <p className={styles.loader}>Loading...</p>}
                {messages.map(msg => (
                  <div
                    key={msg._id || msg.message.id}
                    className={`${styles.message} ${msg.sender === currentUser?.email ? styles.myMessage : styles.otherMessage}`}
                  >
                    <div className={styles.messageContent}>
                      {selectedConversation.type === 'group' && (
                        <strong className={styles.senderName}>{displaySenderName(msg.sender)}</strong>
                      )}
                      {msg.message.text && <p>{msg.message.text}</p>}
                      {msg.message.image && (
                        <button
                          type="button"
                          className={styles.imagePreviewBtn}
                          onClick={() => setMediaPreview({
                            url: msg.message.image,
                            sender: displaySenderName(msg.sender),
                            time: msg.message.time
                          })}
                          aria-label="Open image preview"
                        >
                          <img src={msg.message.image} alt="Attachment" className={styles.photo} />
                        </button>
                      )}
                      <div className={styles.messageActions}>
                        <button
                          type="button"
                          className={styles.messageMenuBtn}
                          onClick={() => setActiveMessageMenu(prev => (
                            prev === (msg.localId || msg.message.id) ? null : (msg.localId || msg.message.id)
                          ))}
                          aria-label="Message actions"
                        >
                          ...
                        </button>
                        {activeMessageMenu === (msg.localId || msg.message.id) && (
                          <div className={styles.messageMenu}>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMessageMenu(null);
                                handleDeleteMessage(msg.localId || msg.message.id);
                              }}
                            >
                              Delete from this browser
                            </button>
                          </div>
                        )}
                      </div>
                      <span className={styles.messageTime}>
                        {msg.message.time}
                        {msg.sender === currentUser?.email && deliveryText(msg.status) && ` - ${deliveryText(msg.status)}`}
                      </span>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className={styles.typingIndicator}>
                    <div className={styles.typingDots}>
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <span className={styles.typingText}>Typing...</span>
                  </div>
                )}
              </div>

              <form className={styles.messageInput} onSubmit={handleSendMessage}>
                <button
                  type="button"
                  className={styles.changePhotoBtn}
                  onClick={() => fileInputRef.current.click()}
                >
                  Attach
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyUp={handleIsTyping}
                  placeholder="Type a message..."
                  className={styles.messageField}
                />
                <button type="submit" className={styles.sendBtn}>Send</button>
              </form>
            </>
          ) : (
            <div className={styles.noConversation}>
              <div className={styles.noConversationIcon}>Chat</div>
              <h3>Select a conversation</h3>
              <p>Choose a contact or group from the sidebar to start chatting</p>
            </div>
          )}
        </div>
      </div>

      {mediaPreview && (
        <div className={styles.mediaOverlay} onClick={() => setMediaPreview(null)}>
          <div className={styles.mediaDialog} onClick={(event) => event.stopPropagation()}>
            <div className={styles.mediaHeader}>
              <div>
                <h3>{mediaPreview.sender}</h3>
                <p>{mediaPreview.time}</p>
              </div>
              <button
                type="button"
                className={styles.mediaCloseBtn}
                onClick={() => setMediaPreview(null)}
                aria-label="Close image preview"
              >
                X
              </button>
            </div>
            <div className={styles.mediaBody}>
              <img src={mediaPreview.url} alt="Full size attachment" className={styles.mediaImage} />
            </div>
          </div>
        </div>
      )}

      {showStorageSettings && (
        <div className={styles.storageOverlay} onClick={() => setShowStorageSettings(false)}>
          <div className={styles.storageDialog} onClick={(event) => event.stopPropagation()}>
            <div className={styles.storageHeader}>
              <div>
                <h3>Storage settings</h3>
                <p>Manage encrypted chat data stored in this browser.</p>
              </div>
              <button
                type="button"
                className={styles.storageCloseBtn}
                onClick={() => setShowStorageSettings(false)}
                aria-label="Close storage settings"
              >
                X
              </button>
            </div>

            {isLoadingStorage ? (
              <div className={styles.storageLoading}>Loading storage details...</div>
            ) : (
              <>
                <div className={styles.storageUsage}>
                  <div>
                    <span>Browser usage</span>
                    <strong>{formatBytes(storageStats?.browserUsage)}</strong>
                    <p>Quota: {storageStats?.browserQuota ? formatBytes(storageStats.browserQuota) : 'Unavailable'}</p>
                  </div>
                  <div>
                    <span>CipherChat data</span>
                    <strong>{formatBytes(storageStats?.indexedDbBytes)}</strong>
                    <p>Encrypted local records only</p>
                  </div>
                </div>

                <div className={styles.storageStatsGrid}>
                  <div><span>Messages</span><strong>{storageStats?.messages || 0}</strong></div>
                  <div><span>Conversations</span><strong>{storageStats?.conversations || 0}</strong></div>
                  <div><span>Contacts</span><strong>{storageStats?.contacts || 0}</strong></div>
                </div>

                <div className={styles.storageActions}>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={handleClearCurrentChatFromSettings}
                    disabled={!selectedConversation}
                  >
                    Clear current chat
                  </button>
                  <button type="button" className={styles.actionBtn} onClick={handleClearAllLocalMessages}>
                    Clear all local messages
                  </button>
                  <button type="button" className={styles.dangerBtn} onClick={handleResetLocalChatData}>
                    Reset local chat data
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
