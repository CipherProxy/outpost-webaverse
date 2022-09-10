import React from 'react';
import styles from './Banner.module.css';

const Banner = () => {
  return (
    <div
      className={styles.menu}
      width={600}
      height={400}
    >
      <h1>Duck</h1>
      <p>I am a duck. I mint NFTs of myself.</p>
      <p>Would you like one?</p>
    </div>
  );
};
export default Banner;
