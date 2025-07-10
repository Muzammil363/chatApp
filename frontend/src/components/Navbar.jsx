import styles from '../styles/Home.module.css'
import React, { useState, useEffect } from 'react';
import socket from '../socket.js'
import { Link } from 'react-router-dom';

function Navbar() {
    const [isMobile, setIsMobile] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [connected, setConnected] = useState(false); // move it here
    const [message, setMessage] = useState('');

  useEffect(() => {
    const onConnect = () => {
      console.log("Connected with socket id:", socket.id);
      setConnected(true);
    };

    const onDisconnect = () => {
      console.log("Disconnected from socket.");
      setConnected(false);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    // Cleanup
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);


  return (
    <nav className={styles.navbar}>
            <div className={styles.navContent}>
              <div className={styles.logo}>
                <div className={styles.logoIcon}>💬</div>
                <h2 className={styles.brandName}>ChatApp</h2>
              </div>
              
              <div className={`${styles.navLinks} ${menuOpen ? styles.navLinksOpen : ''}`}>
                <Link to={'/u/home'} className={styles.navLink}>
                  <span className={styles.navIcon}>🏠</span>
                  Home
                </Link>
                <Link to={'/u/profile'} className={styles.navLink}>
                  <span className={styles.navIcon}>👤</span>
                  Profile
                </Link>
                <Link to={'/u/requests'} className={styles.navLink}>
                  <span className={styles.navIcon}>📨</span>
                  Requests
                </Link>
              </div>
              
              <button 
                className={styles.menuToggle}
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <span></span>
                <span></span>
                <span></span>
              </button>
            </div>
          </nav>
  )
}

export default Navbar
