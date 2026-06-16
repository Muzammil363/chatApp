import React from 'react';
import styles from '../styles/Footer.module.css';

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.footerContent}>
          <div className={styles.footerSection}>
            <h3>CipherChat</h3>
            <p>Making communication simple, secure, and enjoyable for everyone.</p>
            <div className={styles.socialLinks}>
              <a href="#" aria-label="Twitter">X</a>
              <a href="#" aria-label="Facebook">FB</a>
              <a href="#" aria-label="Instagram">IG</a>
              <a href="#" aria-label="LinkedIn">IN</a>
            </div>
          </div>

          <div className={styles.footerSection}>
            <h4>Product</h4>
            <ul>
              <li><a href="#features">Features</a></li>
              <li><a href="#">Pricing</a></li>
              <li><a href="#">Security</a></li>
              <li><a href="#">Updates</a></li>
            </ul>
          </div>

          <div className={styles.footerSection}>
            <h4>Company</h4>
            <ul>
              <li><a href="#about">About</a></li>
              <li><a href="#">Blog</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="#">Contact</a></li>
            </ul>
          </div>

          <div className={styles.footerSection}>
            <h4>Support</h4>
            <ul>
              <li><a href="#">Help Center</a></li>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Terms of Service</a></li>
              <li><a href="#">Status</a></li>
            </ul>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>&copy; 2026 CipherChat. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
