#ifndef CODEGENERATOR_H
#define CODEGENERATOR_H

#include "compiler.h"
#include <vector>
#include <string>

class CodeGenerator {
public:
    CodeGenerator(const std::vector<Token>& tokens);
    bool generate(const std::string& outputFile);

private:
    std::vector<Token> tokens;
};

#endif // CODEGENERATOR_H
