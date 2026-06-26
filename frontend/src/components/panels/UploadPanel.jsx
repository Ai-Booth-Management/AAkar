import React, { useState, useRef } from 'react';

const PDF_API = 'http://localhost:8000/api/v1/upload/pdf';
const CSV_API = 'http://localhost:8000/api/v1/upload';

const UploadPanel = () => {
  const [mode, setMode] = useState('voters');   // 'voters' | 'complaints'
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const accept = mode === 'voters' ? '.pdf' : '.csv';

  const validateFile = (f) =>
    mode === 'voters'
      ? f.name.toLowerCase().endsWith('.pdf')
      : f.name.toLowerCase().endsWith('.csv');

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    // For CSV keep single file, for PDF allow multiple
    const droppedFiles = Array.from(e.dataTransfer.files).filter(validateFile);
    if (droppedFiles.length > 0) {
      if (mode === 'voters') {
        setFiles(prev => [...prev, ...droppedFiles]);
      } else {
        setFiles([droppedFiles[0]]);
      }
      setResult(null);
      setError(null);
    } else {
      setError(mode === 'voters' ? 'Please upload a PDF file.' : 'Please upload a CSV file.');
    }
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files).filter(validateFile);
    if (selectedFiles.length > 0) {
      if (mode === 'voters') {
        setFiles(prev => [...prev, ...selectedFiles]);
      } else {
        setFiles([selectedFiles[0]]);
      }
      setResult(null);
      setError(null);
    }
  };

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    setFiles([]);
    setResult(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    setResult(null);
    setProgress(10);

    try {
      const formData = new FormData();
      if (mode === 'voters') {
        files.forEach(f => formData.append('files', f));
      } else {
        formData.append('file', files[0]);
      }

      const url =
        mode === 'voters'
          ? PDF_API
          : `${CSV_API}/?file_type=complaints`;

      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 85) { clearInterval(progressInterval); return 85; }
          return prev + (mode === 'voters' ? Math.random() * 8 : Math.random() * 25);
        });
      }, mode === 'voters' ? 1500 : 400);

      const res = await fetch(url, { method: 'POST', body: formData });
      clearInterval(progressInterval);
      setProgress(100);

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.detail || `Error ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
      setFiles([]);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="fade-in">
      {/* ── Header ── */}
      <div className="upload-header">
        <h2>Upload Data</h2>
        <p>Upload voter list PDFs or complaints CSV files to process into the database.</p>
      </div>

      {/* ── Mode Toggle ── */}
      <div className="upload-toggle">
        <button
          className={`toggle-btn ${mode === 'voters' ? 'active' : ''}`}
          onClick={() => handleModeSwitch('voters')}
          id="toggle-voters"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          Voter PDF
        </button>
        <button
          className={`toggle-btn ${mode === 'complaints' ? 'active' : ''}`}
          onClick={() => handleModeSwitch('complaints')}
          id="toggle-complaints"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          Complaints CSV
        </button>
      </div>

      {/* ── Drop Zone ── */}
      <div
        className={`drop-zone ${dragActive ? 'active' : ''} ${files.length > 0 ? 'has-file' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => files.length === 0 && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={mode === 'voters'}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          id="file-input"
          key={mode}
        />

        {files.length > 0 ? (
          <div className="file-preview-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            {files.map((f, i) => (
              <div key={i} className="file-preview">
                <div className="file-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
                <div className="file-info">
                  <span className="file-name">{f.name}</span>
                  <span className="file-size">{formatSize(f.size)}</span>
                </div>
                <button
                  className="file-remove"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setFiles(prev => prev.filter((_, idx) => idx !== i));
                  }}
                  title="Remove file"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
            {mode === 'voters' && (
              <button 
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                style={{ marginTop: '8px', padding: '8px', background: 'none', border: '1px dashed var(--gray-300)', color: 'var(--gray-500)', cursor: 'pointer', borderRadius: '4px' }}
              >
                + Add more PDFs
              </button>
            )}
          </div>
        ) : (
          <div className="drop-prompt">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p>
              <strong>Drop your {mode === 'voters' ? 'PDF' : 'CSV'} here</strong> or click to browse
            </p>
            <span>
              {mode === 'voters'
                ? 'Supports voter list PDF files'
                : 'CSV format: complaint_id, epic, issue_type, timestamp, status'}
            </span>
          </div>
        )}
      </div>

      {/* ── Upload Progress ── */}
      {uploading && (
        <div className="upload-progress">
          <div className="progress-info">
            <div className="spinner" />
            <span>
              {mode === 'voters'
                ? 'Processing PDF with OCR… This may take a few minutes.'
                : 'Processing complaints CSV…'}
            </span>
          </div>
          <div className="progress-bar">
            <div className="fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* ── Upload Button ── */}
      {files.length > 0 && !uploading && (
        <button
          className="btn btn-primary upload-btn"
          onClick={handleUpload}
          id="upload-btn"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Upload &amp; Process {files.length > 1 ? `(${files.length} files)` : ''}
        </button>
      )}

      {/* ── Error ── */}
      {error && <div className="error-msg">{error}</div>}

      {/* ── Success ── */}
      {result && (
        <div className="upload-result">
          <div className="result-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="result-info">
            <h4>Upload Successful</h4>
            <p>
              {result.message ||
                `${mode === 'voters' ? 'Voters' : 'Complaints'} data processed successfully.`}
            </p>
            <div className="result-stats">
              {result.records_extracted != null && (
                <div className="result-stat">
                  <span className="stat-value">{result.records_extracted}</span>
                  <span className="stat-label">Records Extracted</span>
                </div>
              )}
              {result.processing_result?.voters_processed != null && (
                <div className="result-stat">
                  <span className="stat-value">{result.processing_result.voters_processed}</span>
                  <span className="stat-label">Voters Processed</span>
                </div>
              )}
              {result.details?.complaints_processed != null && (
                <div className="result-stat">
                  <span className="stat-value">{result.details.complaints_processed}</span>
                  <span className="stat-label">Complaints Processed</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadPanel;
