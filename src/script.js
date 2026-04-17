document
  .getElementById("scraperForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    // UI Elements
    const loader = document.getElementById("loader");
    const form = document.getElementById("scraperForm");
    const messageArea = document.getElementById("messageArea");
    const submitBtn = form.querySelector('button[type="submit"]');
    const urlInput = document.getElementById("url");
    const fileNameInput = document.getElementById("file_name");
    const formatSelect = document.getElementById("file_format");
    const progressBar = document.createElement("div");
    progressBar.className = "progress mt-3";
    progressBar.innerHTML = `
        <div class="progress-bar progress-bar-striped progress-bar-animated" 
             role="progressbar" style="width: 0%"></div>
    `;

    // Show loading state with animations
    loader.style.display = "block";
    submitBtn.disabled = true;
    submitBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin-pulse me-2"></i> Processing...';
    messageArea.innerHTML = "";
    messageArea.appendChild(progressBar);

    // Clear previous validation states
    [urlInput, fileNameInput, formatSelect].forEach((el) => {
      el.classList.remove("is-invalid");
      el.classList.add("is-valid");
    });

    try {
      // Get form values
      const url = urlInput.value.trim();
      const fileName = fileNameInput.value.trim();
      const fileFormat = formatSelect.value;

      // Validate inputs with visual feedback
      let isValid = true;
      if (!url || !isValidYouTubeUrl(url)) {
        urlInput.classList.remove("is-valid");
        urlInput.classList.add("is-invalid");
        isValid = false;
      }
      if (!fileName || !validateFileName(fileName)) {
        fileNameInput.classList.remove("is-valid");
        fileNameInput.classList.add("is-invalid");
        isValid = false;
      }
      if (!fileFormat) {
        formatSelect.classList.remove("is-valid");
        formatSelect.classList.add("is-invalid");
        isValid = false;
      }
      if (!isValid) {
        throw new Error("Please correct the highlighted fields");
      }

      // Animate progress bar
      const progressBarInner = progressBar.querySelector(".progress-bar");
      const progressInterval = setInterval(() => {
        const currentWidth = parseInt(progressBarInner.style.width) || 0;
        const newWidth = Math.min(currentWidth + 5, 90);
        progressBarInner.style.width = `${newWidth}%`;
        progressBarInner.setAttribute("aria-valuenow", newWidth);
      }, 500);

      // Prepare and send request
      const formData = new FormData(form);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 min timeout

      const response = await fetch("/", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearInterval(progressInterval);
      clearTimeout(timeoutId);
      progressBarInner.style.width = "100%";
      progressBarInner.classList.remove(
        "progress-bar-animated",
        "progress-bar-striped"
      );

      // Handle response
      const contentType = response.headers.get("content-type") || "";
      const videoCount = response.headers.get("X-Video-Count") || "N/A";
      const fileSize = response.headers.get("Content-Length")
        ? formatFileSize(response.headers.get("Content-Length"))
        : "unknown";

      if (contentType.includes("application/octet-stream")) {
        // Process file download
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = downloadUrl;
        anchor.download = `${fileName}.${fileFormat}`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(downloadUrl);

        // Show beautiful success message
        showSuccessCard(fileName, fileFormat, videoCount, fileSize);
        return;
      }

      // Handle JSON errors
      const result = await response.json().catch(() => ({}));
      throw new Error(result.message || `Server error: ${response.status}`);
    } catch (error) {
      showErrorCard(error);
    } finally {
      resetUI();
    }

    // Helper functions
    function isValidYouTubeUrl(url) {
      const patterns = [
        /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/,
        /^https?:\/\/youtube\.com\/watch\?v=[\w-]+(&list=[\w-]+)?/,
        /^https?:\/\/youtube\.com\/playlist\?list=[\w-]+/,
        /^https?:\/\/youtu\.be\/[\w-]+(\?list=[\w-]+)?/,
      ];
      return patterns.some((pattern) => pattern.test(url));
    }

    function validateFileName(name) {
      return /^[\w\-. ]+$/.test(name);
    }

    function formatFileSize(bytes) {
      if (!bytes) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    }

    function showSuccessCard(fileName, fileFormat, videoCount, fileSize) {
      const fileIcon =
      fileFormat === "xlsx" ? "fas fa-file-excel text-success" :
      fileFormat === "pdf" ? "fas fa-file-pdf text-danger" :
      "fas fa-file-code text-warning";

      const card = document.createElement("div");
      card.className = "card border-success mb-4";
      card.innerHTML = `
            <div class="card-header bg-success text-white d-flex justify-content-between align-items-center">
                <div>
                    <i class="fas fa-check-circle me-2"></i>
                    <span class="fw-bold">Successfully Processed!</span>
                </div>
                <span class="badge bg-light text-success">${videoCount} videos</span>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6 mb-3 mb-md-0">
                        <div class="d-flex align-items-center mb-3">
                            <i class="${fileIcon} fa-2x me-3"></i>
                            <div>
                                <h5 class="mb-0">${fileName}.${fileFormat}</h5>
                                <small class="text-muted">${fileSize}</small>
                            </div>
                        </div>
                        <div class="d-grid">
                            <button class="btn btn-outline-success" onclick="document.getElementById('scraperForm').reset()">
                                <i class="fas fa-redo me-2"></i>Process Another
                            </button>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="p-3 bg-light rounded">
                            <h6 class="text-success mb-3"><i class="fas fa-info-circle me-2"></i>Processing Details</h6>
                            <ul class="list-unstyled">
                                <li class="mb-2"><i class="fas fa-film me-2"></i><strong>Videos:</strong> ${videoCount}</li>
                                <li class="mb-2"><i class="fas fa-database me-2"></i><strong>File Size:</strong> ${fileSize}</li>
                                <li><i class="fas fa-clock me-2"></i><strong>Format:</strong> ${fileFormat.toUpperCase()}</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;

      // Add animation
      card.style.opacity = "0";
      card.style.transform = "translateY(20px)";
      card.style.transition = "all 0.3s ease-out";

      messageArea.innerHTML = "";
      messageArea.appendChild(card);

      // Trigger animation
      setTimeout(() => {
        card.style.opacity = "1";
        card.style.transform = "translateY(0)";
      }, 50);
    }

    function showErrorCard(error) {
      console.error("Error:", error);

      let errorMessage = error.message;
      if (error.name === "AbortError") {
        errorMessage =
          "Processing took too long. Large playlists may require more time.";
      } else if (error.message.includes("Failed to fetch")) {
        errorMessage = "Network error. Please check your internet connection.";
      }

      const card = document.createElement("div");
      card.className = "card border-danger mb-4";
      card.innerHTML = `
            <div class="card-header bg-danger text-white">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <span class="fw-bold">Processing Error</span>
            </div>
            <div class="card-body">
                <div class="alert alert-danger mb-4">
                    <p class="mb-0">${errorMessage}</p>
                </div>
                <div class="d-flex justify-content-between">
                    <button class="btn btn-outline-danger" onclick="window.location.reload()">
                        <i class="fas fa-sync-alt me-2"></i>Try Again
                    </button>
                    <button class="btn btn-outline-secondary" data-bs-toggle="collapse" data-bs-target="#errorDetails">
                        <i class="fas fa-bug me-2"></i>Technical Details
                    </button>
                </div>
                <div class="collapse mt-3" id="errorDetails">
                    <div class="card card-body bg-light">
                        <small class="text-muted">${
                          error.stack || error.toString()
                        }</small>
                    </div>
                </div>
            </div>
        `;

      // Add animation
      card.style.opacity = "0";
      card.style.transform = "translateY(20px)";
      card.style.transition = "all 0.3s ease-out";

      messageArea.innerHTML = "";
      messageArea.appendChild(card);

      // Trigger animation
      setTimeout(() => {
        card.style.opacity = "1";
        card.style.transform = "translateY(0)";
      }, 50);
    }

    function resetUI() {
      loader.style.display = "none";
      submitBtn.disabled = false;
      submitBtn.innerHTML =
        '<i class="fas fa-cloud-download-alt me-2"></i> Scrape & Download';
    }
  });
