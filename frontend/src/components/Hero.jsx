import React from 'react';
import styles from '../styles/Hero.module.css';
import { Link } from 'react-router-dom';

const Hero = () => {
  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <nav className={styles.nav}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>💬</div>
            <h2 className={styles.brandName}>
              <span className={styles.gradientText}>ChatApp</span>
            </h2>
          </div>
          <div className={styles.navLinks}>
            <a href="#features">Features</a>
            <a href="#about">About</a>
            <a href="#testimonials">Testimonials</a>
            <Link to={'/auth'}>
            <button className={styles.loginBtn}>Login</button>
            </Link>
          </div>
        </nav>
        
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <h1>
              Connect, Chat, and{' '}
              <span className={styles.gradientText}>Collaborate</span>
            </h1>
            <p>Experience seamless messaging with our modern chat platform. Send messages, share files, and stay connected with your loved ones instantly.</p>
            <div className={styles.heroButtons}>
              <Link to={'/auth'}>
              <button className={styles.primaryBtn}>Get Started Free</button>
              </Link>
              <button className={styles.secondaryBtn}>Watch Demo</button>
            </div>
          </div>
          <div className={styles.heroImage}>
            <div className={styles.mockup}>
              <div className={styles.phone}>
                <div className={styles.screen}>
                  <div className={styles.chatPreview}>
                    <div className={styles.message}>
                      <span>Hey! How are you doing?</span>
                    </div>
                    <div className={styles.messageReply}>
                      <span>Great! Just got your message 😊</span>
                    </div>
                    <div className={styles.message}>
                      <span>Awesome! Want to grab coffee later?</span>
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