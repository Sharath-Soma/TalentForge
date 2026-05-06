import AOS from 'aos';
import 'aos/dist/aos.css';

import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

const initialTheme = localStorage.getItem('talentforge_theme') || localStorage.getItem('theme') || 'light';
document.documentElement.classList.toggle('dark', initialTheme === 'dark');

function Root() {
  useEffect(() => {
    AOS.init({
      duration: 700,
      once: true,
      easing: 'ease-out-cubic',
    });
  }, []);

  return <App />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
