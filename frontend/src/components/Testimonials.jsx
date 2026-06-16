import React from 'react';
import styles from '../styles/Testimonials.module.css';

const Testimonials = () => {
  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Marketing Manager',
      content: 'CipherChat has transformed how our team communicates. The interface is intuitive and the features are exactly what we needed.',
      avatar: '👩‍💼'
    },
    {
      name: 'Mike Chen',
      role: 'Software Developer',
      content: 'The encryption and privacy features give me peace of mind. Finally, a messaging app that takes security seriously.',
      avatar: '👨‍💻'
    },
    {
      name: 'Emily Rodriguez',
      role: 'Student',
      content: 'I love how I can seamlessly switch between my phone and laptop. The cross-platform sync is flawless.',
      avatar: '👩‍🎓'
    }
  ];

  return (
    <section id="testimonials" className={styles.testimonials}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>What Our Users Say</h2>
          <p>Join thousands of satisfied users who have made CipherChat their go-to messaging platform</p>
        </div>
        <div className={styles.testimonialsGrid}>
          {testimonials.map((testimonial, index) => (
            <div key={index} className={styles.testimonialCard}>
              <div className={styles.testimonialContent}>
                <p>"{testimonial.content}"</p>
              </div>
              <div className={styles.testimonialAuthor}>
                <div className={styles.avatar}>{testimonial.avatar}</div>
                <div className={styles.authorInfo}>
                  <h4>{testimonial.name}</h4>
                  <p>{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
