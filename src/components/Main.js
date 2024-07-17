import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import ProgressBar from './ProgressBar';
import SuccessScreen from './SuccessScreen';
import './Main.css';

const socket = io('http://localhost:5000/');

const Main = () => {
  const [formId, setFormId] = useState('mainForm');
  const [progress, setProgress] = useState(0);
  const [stepVisible, setStepVisible] = useState(false);
  const [step, setStep] = useState('');
  const [taskId, setTaskId] = useState(null);
  const [uploadController, setUploadController] = useState(null);
  const [zipPath, setZipPath] = useState('');

  useEffect(() => {
    let progressData = null;
    let logInterval = null;

    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    socket.on('progress', (data) => {
      if (data.task_id === taskId) {
        progressData = data;
        setProgress(data.progress);
        setStep(data.step);
        setStepVisible(true);
        console.log('Received progress:', data);
      }
    });

    socket.on('task_complete', (data) => {
      if (data.task_id === taskId) {
        clearInterval(logInterval);
        setZipPath(data.zip_path);
        setFormId('successScreen');
        handleDownload(data.zip_path); // Automatically trigger the download
      }
    });

    socket.on('error', (data) => {
      if (data.task_id === taskId) {
        clearInterval(logInterval);
        alert(`Error: ${data.message}`);
        setFormId('mainForm');
      }
    });

    logInterval = setInterval(() => {
      if (progressData) {
        console.log('Progress:', progressData.progress, 'Step:', progressData.step);
      }
    }, 500);

    return () => {
      clearInterval(logInterval);
      socket.off('connect');
      socket.off('disconnect');
      socket.off('progress');
      socket.off('task_complete');
      socket.off('error');
    };
  }, [taskId]);

  const handleSubmit = (event) => {
    event.preventDefault();

    const formData = new FormData(event.target);
    const taskId = `task-${Math.random().toString(36).substr(2, 9)}`;
    setTaskId(taskId);
    formData.append('task_id', taskId);

    const controller = new AbortController();
    setUploadController(controller);

    setProgress(0);
    setStepVisible(false);

    fetch('http://localhost:5000/process', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          alert(data.error);
          setFormId('mainForm');
        }
      })
      .catch((error) => {
        if (error.name === 'AbortError') {
          console.log('Upload canceled by user');
        } else {
          alert('An error occurred while processing');
        }
        setFormId('mainForm');
      });

    setFormId('progress');
  };

  const handleCancel = () => {
    if (uploadController) {
      uploadController.abort();
      setUploadController(null);
    }

    if (taskId) {
      fetch('http://localhost:5000/cancel_task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId }),
      })
        .then((response) => response.json())
        .then((data) => {
          alert(data.message);
          setFormId('mainForm');
        })
        .catch((error) => {
          alert('An error occurred while canceling the task');
          setFormId('mainForm');
        });
    }
  };

  const handleDownload = (path) => {
    fetch(`http://localhost:5000/download_output?zip_path=${encodeURIComponent(path)}`, {
      method: 'GET',
    })
      .then((response) => response.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'output.zip';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch((error) => console.error('Error downloading the file:', error));
  };

  return (
    <div className="container">
      <h1>{'{ Hooks Generation Bot }'}</h1>
      {formId === 'mainForm' && (
        <form onSubmit={handleSubmit} className="form-container">
          <div className="form-group">
            <label htmlFor="script">Upload Script File:</label>
            <input type="file" id="script" name="script" required className="file-input" />
            <label htmlFor="script" className="file-label">Choose file</label>
          </div>

          <div className="form-group">
            <label htmlFor="video">Video Files:</label>
            <input type="file" id="video" name="video" multiple required className="file-input" />
            <label htmlFor="video" className="file-label">Choose files</label>
          </div>

          <div className="form-group">
            <label htmlFor="input_csv">Input CSV File:</label>
            <input type="file" id="input_csv" name="input_csv" required className="file-input" />
            <label htmlFor="input_csv" className="file-label">Choose file</label>
          </div>

          <div className="form-group">
            <label htmlFor="voice_id">Voice ID:</label>
            <input type="text" id="voice_id" name="voice_id" required />
          </div>

          <div className="form-group">
            <label htmlFor="api_key">Eleven Labs API Key:</label>
            <input type="text" id="api_key" name="api_key" required />
          </div>

          <div className="form-group">
            <label htmlFor="parallel_processing">Parallel Processing:</label>
            <input type="number" id="parallel_processing" name="parallel_processing" defaultValue="16" required />
          </div>

          <button type="submit" className="submit-button">Submit</button>
        </form>
      )}
      {formId === 'progress' && (
        <div className="progress-container">
          <ProgressBar progress={progress} step={step} stepVisible={stepVisible} />
          <button className="cancel-button" onClick={handleCancel}>Cancel</button>
        </div>
      )}
      {formId === 'successScreen' && (
        <SuccessScreen onGoBack={() => setFormId('mainForm')} />
      )}
    </div>
  );
};

export default Main;
