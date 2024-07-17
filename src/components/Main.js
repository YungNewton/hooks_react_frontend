import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './Main.css';

const socket = io('http://localhost:5000/');

const Main = () => {
  const [formId, setFormId] = useState('mainForm');
  const [taskId, setTaskId] = useState(null);
  const [uploadController, setUploadController] = useState(null);
  const [videoLinks, setVideoLinks] = useState([]);
  const [zipLink, setZipLink] = useState('');

  useEffect(() => {
    let logInterval = null;

    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    socket.on('video_link', (data) => {
      if (data.task_id === taskId) {
        setVideoLinks((prevLinks) => [...prevLinks, { link: data.video_link, name: data.file_name }]);
      }
    });

    socket.on('zip_complete', (data) => {
      if (data.task_id === taskId) {
        setZipLink(data.zip_path);
        setFormId('completeScreen');
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
      console.log('Current video links:', videoLinks);
      if (zipLink) {
        console.log('Final zip link:', zipLink);
      }
    }, 500);

    return () => {
      clearInterval(logInterval);
      socket.off('connect');
      socket.off('disconnect');
      socket.off('video_link');
      socket.off('zip_complete');
      socket.off('error');
    };
  }, [taskId, videoLinks, zipLink]);

  const handleSubmit = (event) => {
    event.preventDefault();

    const formData = new FormData(event.target);
    const taskId = `task-${Math.random().toString(36).substr(2, 9)}`;
    setTaskId(taskId);
    formData.append('task_id', taskId);

    const controller = new AbortController();
    setUploadController(controller);

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

  const handleGoBack = () => {
    if (formId === 'progress') {
      handleCancel();
    } else {
      setFormId('mainForm');
      setVideoLinks([]);
      setZipLink('');
    }
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
          <div className="video-links-container">
            <h2>Processing Videos...</h2>
            <ul>
              {videoLinks.map((link, index) => (
                <li key={index}><a href={link.link} target="_blank" rel="noopener noreferrer">{link.name}</a></li>
              ))}
            </ul>
          </div>
          <button className="cancel-button" onClick={handleGoBack}>Cancel</button>
        </div>
      )}
      {formId === 'completeScreen' && (
        <div className="progress-container">
          <div className="video-links-container">
            <h2>Processing Complete</h2>
            <ul>
              {videoLinks.map((link, index) => (
                <li key={index}><a href={link.link} target="_blank" rel="noopener noreferrer">{link.name}</a></li>
              ))}
              {zipLink && <li><a href={`http://localhost:5000/download_output?zip_path=${zipLink}`} target="_blank" rel="noopener noreferrer">Download All Videos as Zip</a></li>}
            </ul>
          </div>
          <button className="go-back-button" onClick={handleGoBack}>Go Back</button>
        </div>
      )}
    </div>
  );
};

export default Main;
