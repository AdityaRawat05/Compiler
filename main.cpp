#include <iostream>
#include <fstream>
#include <sstream>
#include "Lexer.h"
#include "Transformer.h"
#include "CodeGenerator.h"

int main(int argc, char* argv[]) {
    if (argc < 3) {
        std::cerr << "Usage: " << argv[0] << " <input_c_file> <output_cpp_file>\n";
        return 1;
    }

    std::string inputFile = argv[1];
    std::string outputFile = argv[2];

    std::ifstream inFile(inputFile);
    if (!inFile.is_open()) {
        std::cerr << "Error: Could not open input file: " << inputFile << std::endl;
        return 1;
    }

    std::stringstream buffer;
    buffer << inFile.rdbuf();
    std::string sourceCode = buffer.str();
    inFile.close();

    std::cout << "Compiling " << inputFile << " -> " << outputFile << "...\n";

    // 1. Lexical Analysis
    Lexer lexer(sourceCode);
    std::vector<Token> tokens = lexer.tokenize();
    std::cout << "[*] Tokenization complete. Found " << tokens.size() << " tokens.\n";

    // 2. Transformation
    Transformer transformer(tokens);
    std::vector<Token> transformedTokens = transformer.transform();
    std::cout << "[*] Transformation complete.\n";

    // 3. Code Generation
    CodeGenerator generator(transformedTokens);
    if (generator.generate(outputFile)) {
        std::cout << "[✓] Code generation complete. Saved to " << outputFile << ".\n";
    } else {
        std::cerr << "[✗] Failed to generate output code.\n";
        return 1;
    }

    // Done
    std::cout << "\nSuccess! Your program is converted to C++." << std::endl;

    return 0;
}
