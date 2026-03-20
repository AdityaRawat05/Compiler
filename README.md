# C to C++ Source-to-Source Compiler

A mini project to convert simple C programs into equivalent C++ programs using a rule-based approach.

## 1. Project Overview
This project implements a basic source-to-source compiler (transpiler) that takes a C source file (`.c`), processes it, and generates a C++ equivalent (`.cpp`). To keep the project beginner-friendly and heavily dependent on C++, it relies purely on standard library tools (like `std::string`, `std::vector`) and evaluates tokens to manipulate code rather than building a heavy Abstract Syntax Tree (AST).

## 2. Implemented Modules
Our compiler is broken down into modular phases:
1. **Lexical Analyzer (`Lexer.h`, `Lexer.cpp`)**: Reads the input `.c` file and breaks the source code down into smaller meaningful chunks called "Tokens" (Keywords, Identifiers, Strings, Symbols).
2. **Transformation Engine (`Transformer.h`, `Transformer.cpp`)**: Applies rule-based conversions on the tokens:
   - Evaluates `printf("...", args)` converting it to `cout << args...` safely removing basic format strings like `%d` and `%s`.
   - Evaluates `scanf("...", &arg)` converting it to `cin >> arg`, removing the Address-Of operator.
   - Replaces `malloc(size)` with `new char[size]`.
   - Replaces `free` with `delete`.
   - Converts `struct` into `class` and injects `public:` access specifier so the fields remain accessible from the outside just like default C structures.
   - Cleans up standard C headers like `<stdio.h>` and `<stdlib.h>` and securely injects `<iostream>` and `using namespace std;`.
3. **Code Generator (`CodeGenerator.h`, `CodeGenerator.cpp`)**: Reconstructs the modified tokens sequentially back into continuous C++ source code while maintaining formatting through captured whitespaces and comments.
4. **Main Module (`main.cpp`)**: The entry point which handles File I/O, orchestrates the compiler flow through all the above phases sequentially, and outputs basic logging.

## 3. How to Build & Run
### Build (Requires standard GCC/g++)
Run the provided `build.bat` on Windows:
```cmd
build.bat
```
Alternatively, manually compile it using standard G++: 
```cmd
g++ main.cpp Lexer.cpp Transformer.cpp CodeGenerator.cpp -o compiler.exe
```

### Run
To convert the provided sample test code:
```cmd
compiler.exe sample.c sample.cpp
```
This executes our custom compiler, reading `sample.c` and successfully generating the equivalent C++ as `sample.cpp`.

## 4. Limitations of the Project
- **Naive Parsing**: It works extensively at the token-level rather than building a full Abstract Syntax Tree (AST). Thus, it has a simplistic view of the code and cannot parse complex recursive structures perfectly.
- **Simplistic Printf/Scanf Translation**: Complex format strings (like `printf("%04d", num)`) are difficult to map at a token level without a powerful state machine and are instead piped down using standard `<<`.
- **Simplistic Memory Conversions**: Employs `new char[size]` to replace malloc chunks naively without deeply interpreting target pointer casts unless the programmer specifies the types manually.
- **Variable Scopes and Shadows**: Due to lack of semantic analysis, variable scoping and name shadowing dependencies are not handled.

## 5. Suggestions for Future Improvements
- **Implement a fully featured Parser + AST**: Build an Abstract Syntax Tree using recursive descent parsing to understand true execution context (like safely separating expressions, recursive functional parameters, etc).
- **Format String Parsing**: Enhance the format string analyzer to identify `%d`, `%5.2f` from `printf` format strings and map them systematically to C++ `<iomanip>` equivalents (like `setw` and `setprecision`).
- **Semantic Type Checking**: Support deeper semantics directly through type checking to synthesize perfect specific C++ valid `new MyType[N]` expressions on exact array sizes.
- **Support More Specific Conversions**: Translate `typedef` behaviors, explicit C-style arrays statically typed to `std::vector`, and raw char bounds safely migrated to `std::string`.
