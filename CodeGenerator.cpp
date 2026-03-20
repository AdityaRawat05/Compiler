#include "CodeGenerator.h"
#include <fstream>
#include <iostream>

CodeGenerator::CodeGenerator(const std::vector<Token>& tokens) : tokens(tokens) {}

bool CodeGenerator::generate(const std::string& outputFile) {
    std::ofstream outFile(outputFile);
    if (!outFile.is_open()) {
        std::cerr << "Error: Could not open output file: " << outputFile << std::endl;
        return false;
    }

    for (const auto& token : tokens) {
        if (token.type != TokenType::END_OF_FILE && token.type != TokenType::UNKNOWN) {
            outFile << token.value;
        }
    }

    outFile.close();
    return true;
}
