import React from 'react';
import styles from '../styles/Features.module.css';

const features = [
  {
    badge: 'RT',
    title: 'Real-time Messaging',
    description: 'Socket-powered delivery keeps direct and group conversations moving without refreshes.'
  },
  {
    badge: 'E2E',
    title: 'End-to-End Encryption',
    description: 'Messages are encrypted for recipients, while private keys are rebuilt locally from the secret PIN.'
  },
  {
    badge: 'DEV',
    title: 'Cross-Device Sessions',
    description: 'Cookie authentication keeps sessions simple while the unlock flow protects message content.'
  },
  {
    badge: 'MEDIA',
    title: 'Media Sharing',
    description: 'Send image attachments in the same conversation flow as text messages.'
  },
  {
    badge: 'GRP',
    title: 'Group Chats',
    description: 'Create encrypted group conversations, view members, and leave groups cleanly.'
  },
  {
    badge: 'UI',
    title: 'Focused Dashboard',
    description: 'A clean interface keeps conversations, requests, and profile controls easy to scan.'
  }
];

const Features = () => {
  return (
    <section id="features" className={styles.features}>
      <div className={styles.container}>
        <div className={styles.header} data-aos="fade-up">
          <span className={styles.kicker}>Why CipherChat</span>
          <h2>Built for secure daily conversations</h2>
          <p>Core messaging features presented with a calm, professional interface.</p>
        </div>
        <div className={styles.featuresGrid}>
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={styles.featureCard}
              data-aos="fade-up"
              data-aos-delay={index * 80}
            >
              <div className={styles.featureBadge}>{feature.badge}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
