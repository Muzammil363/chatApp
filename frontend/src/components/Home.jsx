import React, { useState, useEffect } from 'react';
import styles from '../styles/Home.module.css';
import { getContacts } from '../services/User.js';
import toast from 'react-hot-toast';
import { connectSocket } from '../socket.js';
import { useSocketConnection } from '../hooks/useSocketConnection.js';

const Home = () => {
  const [selectedContact, setSelectedContact] = useState(null);
  const [showConversation, setShowConversation] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [connected,setConnected]=useState(false);
  const [socket,setSocket]=useState({});
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState({});
  const [contacts, setContacts] = useState([]);

  // socket connection

  // useEffect(() => {
  //   let token = localStorage.getItem("accessToken");
  //   let socket = connectSocket(token);
  //   if (socket.connected) {
  //     console.log("Already connected with socket id:", socket.id);
  //     setConnected(true);
  //   }

  //   const onConnect = () => {
  //     console.log("Connected with socket id:", socket.id);
  //     setConnected(true);
  //   };

  //   const onDisconnect = () => {
  //     console.log("Disconnected from socket.");
  //     setConnected(false);
  //   };

  //   socket.on("connect", onConnect);
  //   socket.on("disconnect", onDisconnect);

  //   // Cleanup
  //   return () => {
  //     socket.off("connect", onConnect);
  //     socket.off("disconnect", onDisconnect);
  //   };
  // }, []);

  useSocketConnection(setConnected,setSocket);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    async function loadContacts() {
      let res = await getContacts();
      if (res) {
        setContacts(res);
      }
      else {
        toast.error("Error while fetching contacts");
      }
    }
    loadContacts();
  }, [])

  useEffect(() => {
    if (selectedContact) {
      // Simulate typing indicator
      const typingTimer = setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 2000);
      }, 1000);

      return () => clearTimeout(typingTimer);
    }
  }, [selectedContact]);

  const handleContactSelect = (contact) => {
    setSelectedContact(contact);
    if (isMobile) {
      setShowConversation(true);
    }
  };

  const handleBackToContacts = () => {
    setShowConversation(false);
    setSelectedContact(null);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && selectedContact) {
      const newMessage = {
        id: Date.now(),
        text: message,
        sender: 'me',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => ({
        ...prev,
        [selectedContact.id]: [...(prev[selectedContact.id] || []), newMessage]
      }));

      setMessage('');
    }
  };

  return (
    <div className={styles.homeContainer}>
      {/* Navigation Bar */}

      {/* Main Chat Interface */}
      <div className={styles.chatContainer}>
        {/* Contacts Sidebar */}
        <div className={`${styles.contactsSidebar} ${isMobile && showConversation ? styles.hidden : ''}`}>
          <div className={styles.contactsHeader}>
            <h3>Messages</h3>
            <button className={styles.newChatBtn}>+</button>
          </div>

          <div className={styles.searchBar}>
            <input
              type="text"
              placeholder="Search conversations..."
              className={styles.searchInput}
            />
          </div>

          <div className={styles.contactsList}>
            {contacts.map(contact => (
              <div
                key={contact.chatId}
                className={`${styles.contactItem} ${selectedContact && selectedContact.chatId === contact.chatId ? styles.active : ''}`}
                onClick={() => handleContactSelect(contact)}
              >
                <div className={styles.contactAvatar}>
                  <span>{contact.profilePic}</span>
                  {/* to be handled with user profile image  */}
                  {contact.online && <div className={styles.onlineIndicator}></div>}
                </div>
                <div className={styles.contactInfo}>
                  <div className={styles.contactName}>{contact.fullName}</div>
                  <div className={styles.lastMessage}>{contact.lastMessage}</div>
                  {/* this will be handled  */}
                </div>
                <div className={styles.contactMeta}>
                  <div className={styles.messageTime}>{contact.time}</div>
                  {contact.unread > 0 && (
                    <div className={styles.unreadBadge}>{contact.unread}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conversation Area */}
        <div className={`${styles.conversationArea} ${isMobile && !showConversation ? styles.hidden : ''}`}>
          {selectedContact ? (
            <>
              {/* Conversation Header */}
              <div className={styles.conversationHeader}>
                {isMobile && (
                  <button
                    className={styles.backBtn}
                    onClick={handleBackToContacts}
                  >
                    ←
                  </button>
                )}
                <div className={styles.contactAvatar}>
                  <span>{selectedContact.avatar}</span>
                  {/* to be handled with img */}
                  {selectedContact.online && <div className={styles.onlineIndicator}></div>}
                </div>
                <div className={styles.contactDetails}>
                  <h4>{selectedContact.fullName}</h4>
                  <span className={styles.status}>
                    {selectedContact.status === 'online' ? 'Online' : selectedContact.lastSeen}
                  </span>
                </div>
                <div className={styles.conversationActions}>
                  <button className={styles.actionBtn}>📞</button>
                  <button className={styles.actionBtn}>📹</button>
                  <button className={styles.actionBtn}>ℹ️</button>
                </div>
              </div>

              {/* Messages Area */}
              <div className={styles.messagesArea}>
                {messages[selectedContact.id]?.map(msg => (
                  <div
                    key={msg.id}
                    className={`${styles.message} ${msg.sender === 'me' ? styles.myMessage : styles.otherMessage}`}
                  >
                    <div className={styles.messageContent}>
                      <p>{msg.text}</p>
                      <span className={styles.messageTime}>{msg.time}</span>
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
                    <span className={styles.typingText}>{selectedContact.name} is typing...</span>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <form className={styles.messageInput} onSubmit={handleSendMessage}>
                <button type="button" className={styles.attachBtn}>📎</button>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  className={styles.messageField}
                />
                <button type="button" className={styles.emojiBtn}>😊</button>
                <button type="submit" className={styles.sendBtn}>➤</button>
              </form>
            </>
          ) : (
            <div className={styles.noConversation}>
              <div className={styles.noConversationIcon}>💬</div>
              <h3>Select a conversation</h3>
              <p>Choose a contact from the sidebar to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;