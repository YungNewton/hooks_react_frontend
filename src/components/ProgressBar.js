import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import './ProgressBar.css';
import { io } from 'socket.io-client';

const ProgressBar = ({ taskId, progress, step, stepVisible }) => {
  useEffect(() => {
    const socket = io('http://localhost:5000/');

    socket.on('progress', (data) => {
      if (data.task_id === taskId) {
        updateProgress(data.progress, data.step);
      }
    });

    socket.on('task_complete', (data) => {
      if (data.task_id === taskId) {
        handleTaskComplete();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [taskId]);

  const updateProgress = (progress, step) => {
    // Update the progress bar here
    console.log(`Progress: ${progress}, Step: ${step}`);
  };

  const handleTaskComplete = () => {
    // Handle task completion here
    console.log('Task complete');
  };

  return (
    <div className="progress-container">
      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: `${progress}%`, color: progress > 0 ? '#000000' : '#00ff00' }}>
          {`${progress.toFixed(2)}%`}
        </div>
      </div>
      {stepVisible && <div className="progress-bar-step">{step}</div>}
    </div>
  );
};

ProgressBar.propTypes = {
  taskId: PropTypes.string.isRequired,
  progress: PropTypes.number.isRequired,
  step: PropTypes.string.isRequired,
  stepVisible: PropTypes.bool.isRequired,
};

export default ProgressBar;
