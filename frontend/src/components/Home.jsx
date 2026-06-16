import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styles from '../styles/Home.module.css';
import toast from 'react-hot-toast';
import { useSocketConnection } from '../hooks/useSocketConnection.js';
import { deriveSharedSecret, encryptWithAES, decryptWithAES, getECDHKeyPairFromPIN } from '../services/Encryption.js';
import { uploadImageToCloudinary } from '../services/CloudinaryUpload.js';
import {
  clearConversationUnread,
  createGroup,
  getContacts,
  getConversations,
  getGroupMembers,
  leaveGroup
} from '../services/User.js';
import { clearChat, deleteContact, deleteMessage } from '../services/Delete.js';
import { loadConversation } from '../services/Loaders.js';
import { privateKeyActions } from '../store/index.js';

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

  const messageBoxRef = useRef();
  const currentConversation = useRef();
  const typingTimer = useRef();
  const fileInputRef = useRef(null);

  const myPrivateKey = useSelector(state => state.privateKey.key);
  const currentUser = useSelector(state => state.auth.user);

  const refreshConversations = async () => {
    try {
      const [conversationData, contactData] = await Promise.all([getConversations(), getContacts()]);
      setConversations(conversationData);
      setContacts(contactData);
    } catch (error) {
      toast.error(error.message || 'Error while fetching conversations');
    }
  };

  const senderPublicKey = (senderEmail, membersOverride = groupMembers, conversationOverride) => {
    const activeConversation = conversationOverride || currentConversation.current || selectedConversation;
    if (senderEmail === currentUser?.email) return currentUser.publicKey;
    if (activeConversation?.type === 'direct') return activeConversation.publicKey;
    return membersOverride.find(member => member.email === senderEmail)?.publicKey;
  };

  const decryptMessage = (serverMessage, membersOverride, conversationOverride) => {
    try {
      const publicKey = senderPublicKey(serverMessage.sender, membersOverride, conversationOverride);
      if (!serverMessage?.message || !publicKey || !myPrivateKey) return null;
      const sharedSecret = deriveSharedSecret(myPrivateKey, publicKey);
      const decryptedText = decryptWithAES(serverMessage.message, sharedSecret);
      if (!decryptedText) return null;
      const decryptedMessage = JSON.parse(decryptedText);
      return {
        _id: serverMessage._id,
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
      const data = await loadConversation(conversationOverride.chatId, reset ? null : cursor);
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

  const handleReceive = (data) => {
    const activeConversation = currentConversation.current;
    const receivedChatId = data.chatId || data.conversationId;
    if (!activeConversation || activeConversation.chatId !== receivedChatId) {
      refreshConversations();
      return;
    }

    const decrypted = decryptMessage(data.message);
    if (decrypted) {
      setMessages(prev => [...prev, decrypted]);
    } else if (!myPrivateKey) {
      toast.error('Unlock messages with your PIN to view new messages');
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

  useSocketConnection(handleStopTyping, handleTypingReceive, handleReceive, setSocket, handleDeletedMessage);

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
        await clearConversationUnread(conversation.chatId);
        await loadMessages(true, membersForDecrypt, conversation);
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
      await clearConversationUnread(conversation.chatId);
      await loadMessages(true, membersForDecrypt, conversation);
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

    socket.emit('message:send', {
      conversationId: selectedConversation.chatId,
      chatId: selectedConversation.chatId,
      encryptedFor,
      time: plainMessage.id
    });

    setMessages(prev => [...prev, { message: plainMessage, sender: currentUser.email }]);
    setMessage('');
    refreshConversations();
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
    if (!confirm('Delete this contact and chat permanently?')) return;
    try {
      await deleteContact(selectedConversation.email);
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
    if (!selectedConversation || selectedConversation.type !== 'direct') return;
    if (!confirm('Clear this chat permanently for both users?')) return;
    try {
      await clearChat(selectedConversation.email);
      setMessages([]);
      toast.success('Chat cleared');
    } catch (error) {
      toast.error(error.message || 'Cannot clear chat');
    }
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
    if (!confirm('Delete message for everyone permanently?')) return;
    try {
      await deleteMessage(id);
      setMessages(prev => prev.filter(msg => msg.message.id !== id));
      if (selectedConversation?.type === 'direct') {
        socket?.emit('deleted', { id, to: selectedConversation.email });
      }
      toast.success('Message deleted');
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

  const getConversationPreview = (conversation) => {
    const preview = conversation.lastMessage;
    if (!preview?.message) {
      return conversation.type === 'group'
        ? `${conversation.memberCount || 0} members`
        : 'No messages yet';
    }

    if (!myPrivateKey || !preview.senderPublicKey) {
      return 'Encrypted message';
    }

    try {
      const sharedSecret = deriveSharedSecret(myPrivateKey, preview.senderPublicKey);
      const decryptedText = decryptWithAES(preview.message, sharedSecret);
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
                  <span className={styles.status}>
                    {selectedConversation.type === 'group'
                      ? `${groupMembers.length || selectedConversation.memberCount} members`
                      : selectedConversation.online ? 'Online' : selectedConversation.lastSeen}
                  </span>
                </div>
                <div className={styles.conversationActions}>
                  {selectedConversation.type === 'direct' ? (
                    <>
                      <button className={styles.actionBtn} onClick={handleContactDelete}>Delete Contact</button>
                      <button className={styles.actionBtn} onClick={handleClearChat}>Delete Chat</button>
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
                      <span className={styles.messageTime}>{msg.message.time}</span>
                      {msg.sender === currentUser?.email && (
                        <div
                          style={{ cursor: 'pointer', color: 'red' }}
                          onClick={() => handleDeleteMessage(msg.message.id)}
                        >
                          Delete
                        </div>
                      )}
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
    </div>
  );
};

export default Home;
