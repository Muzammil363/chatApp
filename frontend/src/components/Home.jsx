import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import styles from '../styles/Home.module.css';
import { getContacts } from '../services/User.js';
import toast from 'react-hot-toast';
import { connectSocket } from '../socket.js';
import { useSocketConnection } from '../hooks/useSocketConnection.js';
import { decryptKeyActions, privateKeyActions } from '../store/index.js';
import { deriveSharedSecret, encryptWithAES, decryptWithAES } from '../services/Encryption.js';
import { uploadImageToCloudinary } from '../services/CloudinaryUpload.js';

const Home = () => {
  const [selectedContact, setSelectedContact] = useState(null);
  const [showConversation, setShowConversation] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // const [connected,setConnected]=useState(false);
  const [socket, setSocket] = useState({});
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([]);
  const [contacts, setContacts] = useState([]);

  const currentContact = useRef();
  const sharedSecretRef = useRef();
  const fileInputRef = useRef(null);
  const dispatch = useDispatch();
  const myPrivateKey = useSelector(state => state.privateKey.key);
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

  const handleReceive = (data) => {
    console.log("data received: ", data);
    const curContactVal = currentContact.current;
    let from = data.fromMail;

    if (curContactVal && from == curContactVal.email && data.message) {
      // decrypt and add
      const decryptedMessage = JSON.parse(decryptWithAES(data.message, sharedSecretRef.current));

      let newMessage = {
        id: Date.now(),
        text: decryptedMessage.text,
        image:decryptedMessage.image,
        time: decryptedMessage.time
      }
      setMessages((prev) => [...prev, newMessage])
    }
    else {
      console.log("message belongs to : ", from);
    }
  }

  useSocketConnection(handleReceive, setSocket);

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

      // updated shared secret 
      const otherPublicKey = selectedContact.publicKey;
      const sharedSecret = deriveSharedSecret(myPrivateKey, otherPublicKey);
      sharedSecretRef.current = sharedSecret;

      return () => clearTimeout(typingTimer);
    }
  }, [selectedContact]);

  const handleContactSelect = (contact) => {
    setSelectedContact(contact);
    setMessages([]);
    console.log("handle contact select:", contact);
    currentContact.current = contact;
    if (isMobile) {
      setShowConversation(true);
    }
  };

  const handleBackToContacts = () => {
    setShowConversation(false);
    setSelectedContact(null);
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      console.log("Selected file:", file);
      try {
        console.log("trying upload");
        let url = await uploadImageToCloudinary(file);
        console.log("uploadeed");
        if (url) {
          // set message
          if (selectedContact) {
            const newMessage = {
              id: Date.now(),
              text: null,
              image: url,
              sender: 'me',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }

            const encryptedMessage = encryptWithAES(JSON.stringify(newMessage), sharedSecretRef.current);
            socket.emit("send", { message: encryptedMessage, time: newMessage.time, sendTo: selectedContact.email });

            setMessages((prev) => [...prev, newMessage]);
            setMessage('');
          }
        }
      } catch (err) {
        toast.error("Error while sending image");
      }
      // You can upload the file or show preview here
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && selectedContact) {
      const newMessage = {
        id: Date.now(),
        text: message,
        image: null,
        sender: 'me',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      const encryptedMessage = encryptWithAES(JSON.stringify(newMessage), sharedSecretRef.current);
      socket.emit("send", { message: encryptedMessage, time: newMessage.time, sendTo: selectedContact.email });

      setMessages((prev) => [...prev, newMessage]);
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
                  <span><img src={contact.profilePic} alt="" className={styles.profilePhoto} /></span>
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
                  {/* <span>{selectedContact.profilePic}</span> this is replaced*/}
                  <span> <img src={selectedContact.profilePic} alt="" className={styles.profilePhoto} /></span>
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
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`${styles.message} ${msg.sender === 'me' ? styles.myMessage : styles.otherMessage}`}
                  >
                    <div className={styles.messageContent}>
                      {msg.text && <p>{msg.text}</p>}
                      {msg.image && <img src={msg.image} alt='Cannot load image' className={styles.photo}/>}
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
                    <span className={styles.typingText}>{selectedContact.fullName} is typing...</span>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <form className={styles.messageInput} onSubmit={handleSendMessage}>
                <button
                  type="button"
                  className={styles.changePhotoBtn}
                  onClick={() => fileInputRef.current.click()}
                >
                  📎
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