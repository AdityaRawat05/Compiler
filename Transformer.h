#ifndef TRANSFORMER_H
#define TRANSFORMER_H

#include "compiler.h"
#include <vector>

class Transformer {
public:
    Transformer(const std::vector<Token>& tokens);
    std::vector<Token> transform();

private:
    std::vector<Token> tokens;
    size_t pos;

    Token peek(int offset = 0) const;
    Token advance();
    bool isAtEnd() const;
    
    bool match(TokenType type, const std::string& value);
    void skipWhitespace();

    void transformPrintf(std::vector<Token>& output);
    void transformScanf(std::vector<Token>& output);
    void transformMalloc(std::vector<Token>& output);
    void transformFree(std::vector<Token>& output);
    void transformStruct(std::vector<Token>& output);
};

#endif // TRANSFORMER_H
