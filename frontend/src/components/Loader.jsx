import React from 'react';
import './Loader.css';

const Loader = ({ className = '', text = '' }) => {
  return (
    <div className={`loader-stack ${className}`}>
      <div className="loader-orbit" aria-hidden="true">
        <span className="loader-orbit__ring loader-orbit__ring--outer" />
        <span className="loader-orbit__ring loader-orbit__ring--inner" />
        <span className="loader-orbit__core" />
      </div>
      {text ? <p className="loader-copy">{text}</p> : null}
    </div>
  );
};

export default Loader;
