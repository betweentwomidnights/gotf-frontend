// SocialMediaButtonGroup.tsx
import {useEffect} from 'react';
import { attachTwindStyle } from '@src/shared/style/twind';
import { FaDiscord, FaYoutube, FaTwitter } from 'react-icons/fa';
import './SocialMediaButtonGroup.css';

const SocialMediaButtonGroup = ({ theme }) => {
  const iconColor = theme === 'light' ? '#000' : '#fff';

  useEffect(() => {
    const appContainer = document.getElementById('app');
    if (appContainer) {
        attachTwindStyle(appContainer, document);
    }
}, []);


return (
    <div className="social-media-group absolute top-0 right-0 m-4 flex gap-2">
      <a href="https://discord.gg/uT7FYVzY" target="_blank" rel="noopener noreferrer" className="social-media-icon">
        <FaDiscord style={{ color: '#7289DA' }} /> {/* Discord's brand color */}
      </a>
      <a href="https://www.youtube.com/channel/UCmDU9oCSFwbNokxM1Wi_FWA" target="_blank" rel="noopener noreferrer" className="social-media-icon">
        <FaYoutube style={{ color: '#FF0000' }} /> {/* Keep the YouTube icon always red */}
      </a>
      <a href="https://twitter.com/@thepatch_kev" target="_blank" rel="noopener noreferrer" className="social-media-icon">
        <FaTwitter style={{ color: '#1DA1F2' }} /> {/* Twitter's brand color */}
      </a>
    </div>
  );
};

export default SocialMediaButtonGroup;