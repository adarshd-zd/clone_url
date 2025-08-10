"use client";

import { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        "http://localhost:3001/api/extract-website",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to extract website");
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadProjectZip = async () => {
    if (!result) return;

    try {
      const response = await fetch(
        `http://localhost:3001/api/download-project/${result.projectId}`
      );
      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `${result.siteName || "website"}-extracted.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const downloadIndividualFile = (fileContent, fileName, fileType) => {
    const blob = new Blob([fileContent], { type: `text/${fileType}` });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div
      className="min-vh-100"
      style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    >
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-10">
            {/* Header */}
            <div className="text-center mb-5">
              <h1 className="display-4 fw-bold text-white mb-3">
                <i className="bi bi-download me-3"></i>
                Website Code Extractor
              </h1>
              <p className="lead text-white-50">
                Extract complete websites with all assets - ready to open in
                browser!
              </p>
            </div>

            {/* Main Form Card */}
            <div className="card shadow-lg mb-4 border-0">
              <div className="card-header bg-primary text-white">
                <h5 className="card-title mb-0">
                  <i className="bi bi-code-slash me-2"></i>
                  Extract Complete Website
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="alert alert-success border-0 mb-4">
                  <i className="bi bi-check-circle me-2"></i>
                  <strong>Complete Extraction:</strong> Downloads HTML, CSS,
                  JavaScript, and images. The extracted index.html file will
                  open perfectly in your browser!
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label htmlFor="url" className="form-label fw-semibold">
                      Website URL
                    </label>
                    <input
                      type="url"
                      className="form-control form-control-lg"
                      id="url"
                      placeholder="https://example.com"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-lg w-100 py-3"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        ></span>
                        Extracting Complete Website...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-download me-2"></i>
                        Extract Complete Website
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <div
                className="alert alert-danger alert-dismissible fade show border-0"
                role="alert"
              >
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {error}
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setError("")}
                  aria-label="Close"
                ></button>
              </div>
            )}

            {/* Results */}
            {result && (
              <div className="card shadow-lg mb-4 border-0">
                <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0">
                    <i className="bi bi-check-circle-fill me-2"></i>
                    Website Extracted Successfully - Ready to Open!
                  </h5>
                  <button
                    className="btn btn-light btn-sm"
                    onClick={downloadProjectZip}
                  >
                    <i className="bi bi-download me-1"></i>
                    Download Complete Project
                  </button>
                </div>
                <div className="card-body p-4">
                  {/* Success Message */}
                  <div className="alert alert-success border-0 mb-4">
                    <i className="bi bi-check-circle me-2"></i>
                    <strong>Ready to Use!</strong> Your website has been
                    completely extracted with all assets. Simply double-click{" "}
                    <code>index.html</code> to open it in your browser - it will
                    work perfectly offline!
                  </div>

                  {/* Project Stats */}
                  <div className="row mb-4">
                    <div className="col-md-3">
                      <div className="card bg-primary text-white h-100 border-0">
                        <div className="card-body text-center p-3">
                          <i className="bi bi-file-earmark-code display-6 mb-2"></i>
                          <h6 className="card-title small mb-1">HTML Files</h6>
                          <p className="card-text h4 mb-0">
                            {result.stats?.htmlFiles || 1}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="card bg-success text-white h-100 border-0">
                        <div className="card-body text-center p-3">
                          <i className="bi bi-file-earmark-text display-6 mb-2"></i>
                          <h6 className="card-title small mb-1">CSS Files</h6>
                          <p className="card-text h4 mb-0">
                            {result.stats?.cssFiles || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="card bg-warning text-dark h-100 border-0">
                        <div className="card-body text-center p-3">
                          <i className="bi bi-file-earmark-code display-6 mb-2"></i>
                          <h6 className="card-title small mb-1">JS Files</h6>
                          <p className="card-text h4 mb-0">
                            {result.stats?.jsFiles || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="card bg-info text-white h-100 border-0">
                        <div className="card-body text-center p-3">
                          <i className="bi bi-images display-6 mb-2"></i>
                          <h6 className="card-title small mb-1">Images</h6>
                          <p className="card-text h4 mb-0">
                            {result.stats?.images || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* File Structure */}
                  <div className="mb-4">
                    <h6 className="fw-bold mb-3">
                      <i className="bi bi-folder-open me-2"></i>
                      Complete Project Structure (Ready to Use!)
                    </h6>
                    <div
                      className="bg-dark text-light p-4 rounded"
                      style={{ fontFamily: "monospace", fontSize: "0.85rem" }}
                    >
                      {result.fileStructure &&
                        result.fileStructure.split("\n").map((line, index) => (
                          <div
                            key={index}
                            className={
                              line.includes("📁")
                                ? "text-warning fw-bold"
                                : line.includes(".html")
                                ? "text-info"
                                : line.includes(".css")
                                ? "text-success"
                                : line.includes(".js")
                                ? "text-primary"
                                : line.includes("images")
                                ? "text-danger"
                                : "text-light"
                            }
                          >
                            {line}
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Key Files Preview */}
                  {result.keyFiles && (
                    <div className="row">
                      {Object.entries(result.keyFiles).map(
                        ([fileName, fileContent]) => (
                          <div key={fileName} className="col-lg-6 mb-4">
                            <div
                              className={`card border-0 shadow-sm h-100 border-start border-4 border-${
                                fileName.includes(".html")
                                  ? "info"
                                  : fileName.includes(".css")
                                  ? "success"
                                  : fileName.includes(".js")
                                  ? "warning"
                                  : "secondary"
                              }`}
                            >
                              <div
                                className={`card-header bg-light d-flex justify-content-between align-items-center`}
                              >
                                <span className="fw-semibold">
                                  <i
                                    className={`bi ${
                                      fileName.includes(".html")
                                        ? "bi-file-earmark-code text-info"
                                        : fileName.includes(".css")
                                        ? "bi-file-earmark-text text-success"
                                        : fileName.includes(".js")
                                        ? "bi-file-earmark-code text-warning"
                                        : "bi-file-earmark text-secondary"
                                    } me-2`}
                                  ></i>
                                  {fileName.split("/").pop()}
                                </span>
                                <button
                                  className="btn btn-outline-primary btn-sm"
                                  onClick={() =>
                                    downloadIndividualFile(
                                      fileContent,
                                      fileName.split("/").pop(),
                                      fileName.split(".").pop()
                                    )
                                  }
                                >
                                  <i className="bi bi-download"></i>
                                </button>
                              </div>
                              <div className="card-body">
                                <div className="mb-2">
                                  <small className="text-muted">
                                    <i className="bi bi-info-circle me-1"></i>
                                    Size:{" "}
                                    {(fileContent.length / 1024).toFixed(2)} KB
                                    | Lines: {fileContent.split("\n").length}
                                  </small>
                                </div>
                                <div className="position-relative">
                                  <textarea
                                    className="form-control border-0 bg-dark text-light"
                                    rows="8"
                                    value={
                                      fileContent.substring(0, 500) +
                                      (fileContent.length > 500
                                        ? "\n\n// ... more code ..."
                                        : "")
                                    }
                                    readOnly
                                    style={{
                                      fontFamily: "monospace",
                                      fontSize: "0.75rem",
                                      resize: "none",
                                    }}
                                  />
                                  <div className="position-absolute top-0 end-0 p-2">
                                    <span className="badge bg-secondary">
                                      Preview
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {/* Getting Started Instructions */}
                  <div className="alert alert-primary border-0 mt-4">
                    <h6 className="alert-heading">
                      <i className="bi bi-rocket me-2"></i>
                      Ready to Use - Works Perfectly!
                    </h6>
                    <p className="mb-2">
                      Your extracted website is complete and ready:
                    </p>
                    <ol className="mb-0">
                      <li>Download and extract the project ZIP file</li>
                      <li>
                        <strong>
                          Double-click <code>index.html</code>
                        </strong>{" "}
                        - it will open perfectly in your browser!
                      </li>
                      <li>All images, CSS, and JavaScript work offline</li>
                      <li>
                        Edit any files as needed - everything is organized and
                        clean
                      </li>
                      <li>
                        Upload the entire folder to any web server for online
                        hosting
                      </li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {/* Features Card */}
            <div className="card border-0 shadow-sm">
              <div
                className="card-header bg-gradient"
                style={{
                  background: "linear-gradient(45deg, #667eea, #764ba2)",
                }}
              >
                <h6 className="card-title mb-0 text-white">
                  <i className="bi bi-stars me-2"></i>
                  Complete Website Extraction Features
                </h6>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-4">
                    <h6 className="text-primary">
                      <i className="bi bi-check-circle-fill me-2"></i>
                      Complete Asset Download
                    </h6>
                    <ul className="small list-unstyled">
                      <li>
                        <i className="bi bi-arrow-right text-muted me-2"></i>
                        Downloads all CSS files
                      </li>
                      <li>
                        <i className="bi bi-arrow-right text-muted me-2"></i>
                        Downloads all JavaScript files
                      </li>
                      <li>
                        <i className="bi bi-arrow-right text-muted me-2"></i>
                        Downloads all images
                      </li>
                      <li>
                        <i className="bi bi-arrow-right text-muted me-2"></i>
                        Updates all links to local files
                      </li>
                      <li>
                        <i className="bi bi-arrow-right text-muted me-2"></i>
                        Works completely offline
                      </li>
                    </ul>
                  </div>
                  <div className="col-md-4">
                    <h6 className="text-success">
                      <i className="bi bi-folder-fill me-2"></i>
                      Perfect Organization
                    </h6>
                    <ul className="small list-unstyled">
                      <li>
                        <i className="bi bi-arrow-right text-muted me-2"></i>
                        Clean directory structure
                      </li>
                      <li>
                        <i className="bi bi-arrow-right text-muted me-2"></i>All
                        assets properly organized
                      </li>
                      <li>
                        <i className="bi bi-arrow-right text-muted me-2"></i>
                        Formatted and readable code
                      </li>
                      <li>
                        <i className="bi bi-arrow-right text-muted me-2"></i>
                        Automatic documentation
                      </li>
                      <li>
                        <i className="bi bi-arrow-right text-muted me-2"></i>
                        Ready-to-use project
                      </li>
                    </ul>
                  </div>
                  <div className="col-md-4">
                    <h6 className="text-warning">
                      <i className="bi bi-lightning-charge-fill me-2"></i>
                      Instant Results
                    </h6>
                    <ul className="small list-unstyled">
                      <li>
                        <i className="bi bi-arrow-right text-muted me-2"></i>
                        Double-click to open
                      </li>
                      <li>
                        <i className="bi bi-arrow-right text-muted me-2"></i>No
                        setup required
                      </li>
                      <li>
                        <i className="bi bi-arrow-right text-muted me-2"></i>
                        Works in any browser
                      </li>
                      <li>
                        <i className="bi bi-arrow-right text-muted me-2"></i>
                        Easy to modify
                      </li>
                      <li>
                        <i className="bi bi-arrow-right text-muted me-2"></i>
                        Host anywhere
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
