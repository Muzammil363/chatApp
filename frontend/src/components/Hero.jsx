import React, { useEffect } from 'react';
import styles from '../styles/Hero.module.css';
import { Link } from 'react-router-dom';

const Hero = () => {
  useEffect(() => {
    document.title = 'CipherChat';
  }, []);

  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <nav className={styles.nav}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>C</div>
            <h2 className={styles.brandName}>CipherChat</h2>
          </div>
          <div className={styles.navLinks}>
            <a href="#features">Features</a>
            <a href="#about">About</a>
            <a href="#testimonials">Testimonials</a>
            <Link to="/auth">
              <button className={styles.loginBtn}>Login</button>
            </Link>
          </div>
        </nav>

        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <span className={styles.kicker}>Secure real-time messaging</span>
            <h1>
              Connect, Chat, and <span className={styles.gradientText}>Collaborate</span>
            </h1>
            <p>Modern encrypted conversations for contacts and groups, with clean messaging workflows that feel fast on every screen.</p>
            <div className={styles.heroButtons}>
              <Link to="/auth">
                <button className={styles.primaryBtn}>Get Started Free</button>
              </Link>
              <a href="#features" className={styles.secondaryBtn}>Explore Features</a>
            </div>
          </div>

          <div className={styles.heroImage}>
            <div className={styles.mockup}>
              <div className={styles.phone}>
                <div className={styles.screen}>
                  <div className={styles.screenHeader}>
                    <span>CipherChat</span>
                    <span className={styles.liveDot}></span>
                  </div>
                  <div className={styles.chatPreview}>
                    <div className={styles.message}>
                      <span>Hey! How are you doing?</span>
                    </div>
                    <div className={styles.messageReply}>
                      <span>Great. Your message arrived securely.</span>
                    </div>
                    <div className={styles.message}>
                      <span>Group standup at 6?</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
