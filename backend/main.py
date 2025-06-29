from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="TurboFCL API", version="1.0.0")

# Configure CORS
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "TurboFCL API is running"}


if __name__ == "__main__":
    import socket

    import uvicorn

    # Find available port in range 8000-8009
    def find_free_port(start_port=8000, end_port=8009):
        for port in range(start_port, end_port + 1):
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.bind(("localhost", port))
                    return port
            except OSError:
                continue
        return start_port  # fallback

    port = find_free_port()
    print(f"Starting server on port {port}")
    uvicorn.run(app, host="127.0.0.1", port=port)
