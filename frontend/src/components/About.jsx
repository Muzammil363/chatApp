import React from 'react';
import styles from '../styles/About.module.css';

const About = () => {
  return (
    <section id="about" className={styles.about}>
      <div className={styles.container}>
        <div className={styles.aboutContent}>
          <div className={styles.aboutText}>
            <h2>Built for Modern Communication</h2>
            <p>CipherChat was created with the vision of making communication simple, secure, and enjoyable. Our team of experienced developers and designers have crafted every detail to provide you with the best messaging experience possible.</p>
            <div className={styles.stats}>
              <div className={styles.stat}>
                <h3>10M+</h3>
                <p>Active Users</p>
              </div>
              <div className={styles.stat}>
                <h3>50M+</h3>
                <p>Messages Daily</p>
              </div>
              <div className={styles.stat}>
                <h3>99.9%</h3>
                <p>Uptime</p>
              </div>
            </div>
          </div>
          <div className={styles.aboutImage}>
            <div className={styles.imageContainer}>
              <div className={styles.placeholder}>
                <span>📊</span>
                <p>Real-time Analytics</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
