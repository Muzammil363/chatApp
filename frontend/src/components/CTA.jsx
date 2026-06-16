import React from 'react';
import styles from '../styles/CTA.module.css';

const CTA = () => {
  return (
    <section className={styles.cta}>
      <div className={styles.container}>
        <div className={styles.ctaContent}>
          <h2>Ready to Start Chatting?</h2>
          <p>Join millions of users who trust CipherChat for their daily communication needs. Get started today and experience the future of messaging.</p>
          <div className={styles.ctaButtons}>
            <button className={styles.primaryBtn}>Sign Up Free</button>
            <button className={styles.secondaryBtn}>Download App</button>
          </div>
          <p className={styles.ctaNote}>No credit card required • Free forever plan available</p>
        </div>
      </div>
    </section>
  );
};

export default CTA;
