import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './Main.css';

const socket = io('http://localhost:5000/');

const Main = () => {
  const [formId, setFormId] = useState('mainForm');
  const [taskId, setTaskId] = useState(null);
  const [uploadController, setUploadController] = useState(null);
  const [videoLinks, setVideoLinks] = useState([]);
  const [videoFileNames, setVideoFileNames] = useState('');
  const [csvFileName, setCsvFileName] = useState('');
  const [topBoxColor, setTopBoxColor] = useState('#ff0000'); // Default color in HEX format
  const [textColor, setTextColor] = useState('#ffffff'); // Default text color in HEX format
  const [fontSize, setFontSize] = useState(20); // Default font size

  const videoInputRef = useRef(null);
  const csvInputRef = useRef(null);

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
        console.log('Received video link:', data.video_link); // Log the link
        setVideoLinks(prevLinks => [...prevLinks, { name: data.file_name, link: data.video_link }]);
        console.log('Name:', data.file_name); // Log the link
      }
    });

    socket.on('task_complete', (data) => {
      if (data.task_id === taskId) {
        clearInterval(logInterval);
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
      console.log('Task in progress...');
    }, 500);

    return () => {
      clearInterval(logInterval);
      socket.off('connect');
      socket.off('disconnect');
      socket.off('video_link');
      socket.off('task_complete');
      socket.off('error');
    };
  }, [taskId]);

  useEffect(() => {
    // Reset file input fields and labels whenever the formId changes
    setVideoFileNames('');
    setCsvFileName('');
    if (videoInputRef.current) {
      videoInputRef.current.value = null;
    }
    if (csvInputRef.current) {
      csvInputRef.current.value = null;
    }
  }, [formId]);

  const truncateFileName = (fileName, maxLength = 30) => {
    if (fileName.length <= maxLength) return fileName;
    return fileName.substring(0, maxLength - 3) + '...';
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const formData = new FormData(event.target);
    const taskId = `task-${Math.random().toString(36).substr(2, 9)}`;
    setTaskId(taskId);
    formData.append('task_id', taskId);

    // Append color and font customization fields to the formData
    formData.append('top_box_color', topBoxColor);
    formData.append('text_color', textColor);
    formData.append('font_size', fontSize);

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
    }
  };

  const handleDelete = () => {
    fetch('http://localhost:5000/delete_temp_files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId }),
    })
      .then((response) => response.json())
      .then((data) => {
        alert(data.message);
      })
      .catch((error) => {
        alert('An error occurred while deleting temporary files');
      });
  };

  const handleVideoFilesChange = (event) => {
    const files = Array.from(event.target.files);
    const fileNames = files.length > 1 ? `${files.length} files uploaded` : files.map(file => truncateFileName(file.name)).join(', ');
    setVideoFileNames(fileNames);
  };

  const handleCsvFileChange = (event) => {
    const file = event.target.files[0];
    setCsvFileName(file ? truncateFileName(file.name) : '');
  };

  const handleDownloadAll = () => {
    const videoPaths = videoLinks.map(link => link.link.replace('http://localhost:5000/download_output?video_path=', ''));
    fetch('http://localhost:5000/download_all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_paths: videoPaths }),
    })
      .then((response) => response.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'videos.zip';
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((error) => {
        alert('An error occurred while downloading all videos');
      });
  };

  return (
    <div className="container">
      <h1>{'{ Hooks Generation Bot }'}</h1>
      {formId === 'mainForm' && (
        <form onSubmit={handleSubmit} className="form-container">
          <div className="form-group">
            <label htmlFor="video">Video Files:</label>
            <input type="file" id="video" name="video" multiple required className="file-input" onChange={handleVideoFilesChange} ref={videoInputRef} />
            <label htmlFor="video" className="file-label">{videoFileNames || 'Choose files'}</label>
          </div>

          <div className="form-group">
            <label htmlFor="input_csv">Input CSV File:</label>
            <input type="file" id="input_csv" name="input_csv" required className="file-input" onChange={handleCsvFileChange} ref={csvInputRef} />
            <label htmlFor="input_csv" className="file-label">{csvFileName || 'Choose file'}</label>
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

          {/* New customization fields */}
          <h3>Customize Your Hook Design</h3>
          <div className="form-group">
            <label htmlFor="top_box_color">Main Box Color (Hex):</label>
            <input
              type="text"
              id="top_box_color"
              name="top_box_color"
              value={topBoxColor}
              onChange={(e) => setTopBoxColor(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="text_color">Font Color (Hex):</label>
            <input
              type="text"
              id="text_color"
              name="text_color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="font_size">Font Size (px):</label>
            <input
              type="number"
              id="font_size"
              name="font_size"
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value)}
              required
            />
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
              {videoLinks.map((video, index) => (
                <li key={index}>
                  <a href={video.link} download>{video.name}</a>
                </li>
              ))}
            </ul>
          </div>
          <button className="go-back-button" onClick={handleGoBack}>Go Back</button>
          <button className="delete-button" onClick={handleDelete}>Delete Temporary Files</button>
          <button className="download-all-button" onClick={handleDownloadAll}>Download All</button>
        </div>
      )}
    </div>
  );
};

export default Main;
