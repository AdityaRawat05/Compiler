@echo off
rem build.bat
echo Compiling the C to C++ Source-to-Source Compiler...
g++ main.cpp Lexer.cpp Transformer.cpp CodeGenerator.cpp -o compiler.exe
if %ERRORLEVEL% equ 0 (
    echo [SUCCESS] Build Successful!
    echo Run using: compiler.exe sample.c sample.cpp
) else (
    echo [ERROR] Build Failed.
)
