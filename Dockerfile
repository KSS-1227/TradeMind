FROM python:3.12-slim

RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

ENV TRANSFORMERS_CACHE=/tmp/transformers_cache
ENV HF_HOME=/tmp/hf_home
ENV TORCH_HOME=/tmp/torch_cache
ENV TF_ENABLE_ONEDNN_OPTS=0

WORKDIR /app

COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

COPY --chown=user . /app

# Train model during build so it's ready on first request
RUN python startup.py

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]