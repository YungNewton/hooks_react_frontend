import React from 'react';
import PropTypes from 'prop-types';
import './ProgressBar.css';

const ProgressBar = ({ progress, step, stepVisible }) => {
  return (
    <div className="progress-container">
      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }}>
          {`${progress.toFixed(2)}%`}
        </div>
      </div>
      {stepVisible && <div className="progress-bar-step">{step}</div>}
    </div>
  );
};

ProgressBar.propTypes = {
  progress: PropTypes.number.isRequired,
  step: PropTypes.string.isRequired,
  stepVisible: PropTypes.bool.isRequired,
};

export default ProgressBar;
