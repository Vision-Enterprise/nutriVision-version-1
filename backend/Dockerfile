FROM python:3.11-slim

# System libraries required by OpenCV (cv2) and ONNX Runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face Spaces runs containers as non-root user (uid 1000)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1

WORKDIR $HOME/app

# Install Python dependencies + pre-warm RapidOCR & RapidTable models
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt onnxruntime && \
    python -c "from rapidocr import RapidOCR; from rapid_table import RapidTable; RapidOCR(); RapidTable()"

# Copy backend code
COPY --chown=user . .

# Create writable temp and assets directories
RUN mkdir -p temp src/assets/libs

EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]

