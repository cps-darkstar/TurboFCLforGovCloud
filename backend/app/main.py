from fastapi import FastAPI

app = FastAPI(title="TurboFCL API")

@app.get("/")
def read_root():
    return {"message": "TurboFCL API is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)