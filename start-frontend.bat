@echo off
cd frontend
for /L %%i in (3000,1,3009) do (
    netstat -an | find ":%%i " >nul
    if errorlevel 1 (
        echo Starting frontend on port %%i
        set PORT=%%i
        npm start
        goto :eof
    )
)
echo No available ports in range 3000-3009
pause